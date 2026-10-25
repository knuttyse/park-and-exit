/**
 * Park & Exit — main game loop, physics, render, UI
 */
(function () {
  "use strict";

  // Logical canvas size in CSS pixels (updated on resize to fill play area)
  let CANVAS_W = 960;
  let CANVAS_H = 640;

  // ——— State ———
  const state = {
    screen: "menu",
    vehicleId: (window.getDefaultVehicle && window.getDefaultVehicle().id) || "wagon",
    levelIndex: 0,
    car: null,
    keys: Object.create(null),
    bumps: 0,
    bumpCooldown: 0,
    time: 0,
    running: false,
    successHold: 0,
    won: false,
    failed: false,
    camera: { x: 0, y: 0 },
    lastTs: 0,
    tutorialFlash: 0,
    activeLevel: null,
    hintsOn: false,
    hintType: null,
    hintSteps: [],
    hintStepIndex: 0,
    hintHold: 0,
  };

  const canvas = document.getElementById("game");
  const ctx = canvas.getContext("2d");
  const canvasWrap = document.querySelector(".canvas-wrap");

  /** Size the drawing buffer to the play area (full width/height of .canvas-wrap). */
  function resizeCanvas() {
    if (!canvasWrap) return;
    const rect = canvasWrap.getBoundingClientRect();
    const cssW = Math.max(1, Math.floor(rect.width));
    const cssH = Math.max(1, Math.floor(rect.height));
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    CANVAS_W = cssW;
    CANVAS_H = cssH;

    const bufW = Math.max(1, Math.floor(cssW * dpr));
    const bufH = Math.max(1, Math.floor(cssH * dpr));
    if (canvas.width !== bufW || canvas.height !== bufH) {
      canvas.width = bufW;
      canvas.height = bufH;
    }
    // Draw in CSS-pixel coordinates; buffer is DPR-scaled
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  // ——— Helpers ———
  function vehicleById(id) {
    return window.PARK_VEHICLES.find((v) => v.id === id) || window.getDefaultVehicle();
  }

  function level() {
    return state.activeLevel || window.PARK_LEVELS[state.levelIndex];
  }

  function baseLevel() {
    return window.PARK_LEVELS[state.levelIndex];
  }

  /**
   * Near-minimum parallel bay for the selected vehicle.
   * Length clearance ~20%, width ~6% — tight but completable.
   */
  function minParallelBay(vehicle) {
    return {
      length: vehicle.length * 1.2,
      width: vehicle.width * 1.06,
      angleTol: 0.12,
      coverFrac: 0.9,
      speedMax: 0.42,
      endGap: 0.12,
      curbThick: 0.4,
      neighbourLength: Math.max(4.3, Math.min(5.2, vehicle.length * 0.95)),
      neighbourWidth: Math.max(1.7, Math.min(2.05, vehicle.width * 0.98)),
    };
  }

  function cloneLevel(lvl) {
    return JSON.parse(JSON.stringify(lvl));
  }

  /**
   * Rebuild parallel bay/target/curb/end-cars from the selected vehicle.
   * Curb is flush with the sidewalk-side long edge (no free swing space).
   */
  function applyParallelLayout(lvl, vehicle) {
    const meta = lvl.parallel;
    if (!meta) return lvl;
    const bay = minParallelBay(vehicle);
    const ang = meta.angle || 0;
    const cx = meta.center.x;
    const cy = meta.center.y;
    const curbSide = meta.curbSide == null ? -1 : meta.curbSide;
    const bw = bay.length;
    const bh = bay.width;
    const c = Math.cos(ang);
    const s = Math.sin(ang);

    function localToWorld(lx, ly) {
      return { x: cx + lx * c - ly * s, y: cy + lx * s + ly * c };
    }

    // Painted bay + success box (park-in only)
    const bayMark = { x: cx, y: cy, w: bw, h: bh, angle: ang };
    if (!lvl.markings) lvl.markings = {};
    // Keep non-parallel decorative bays out; parallel spots use the tight bay only
    const otherBays = (lvl.markings.bays || []).filter(function (b) {
      return Math.hypot(b.x - cx, b.y - cy) > 0.5;
    });
    lvl.markings.bays = otherBays.concat([bayMark]);

    if (!lvl.target.exit) {
      lvl.target.x = cx;
      lvl.target.y = cy;
      lvl.target.w = bw;
      lvl.target.h = bh;
      lvl.target.angle = ang;
      lvl.target.angleTol = bay.angleTol;
      lvl.target.speedMax = bay.speedMax;
      lvl.target.coverFrac = bay.coverFrac;
    }

    // Remove old long thin curb strips (horizontal sidewalk curbs)
    lvl.walls = (lvl.walls || []).filter(function (w) {
      return !(w.h < 0.6 && w.w > lvl.worldW * 0.4);
    });
    // Curb flush with sidewalk long edge. Street-face = bay outer long edge.
    // Wheels stay street-side of the street-face line; curb contact never counts as a bump.
    const curbLy = curbSide * (bh / 2 + bay.curbThick / 2);
    const curbPos = localToWorld(0, curbLy);
    const face = localToWorld(0, curbSide * (bh / 2));
    const street = -curbSide;
    // Local (0, street) → world normal pointing toward street / roadway
    const snx = -street * s;
    const sny = street * c;
    lvl.walls.push({
      x: lvl.worldW / 2,
      y: curbPos.y,
      w: lvl.worldW,
      h: bay.curbThick,
      curb: true,
    });
    lvl.curbLine = {
      ox: face.x,
      oy: face.y,
      nx: snx,
      ny: sny,
      ang: ang,
      curbSide: curbSide,
    };

    // Drop previous framing cars on the same curb row; place tight neighbours
    lvl.obstacles = (lvl.obstacles || []).filter(function (o) {
      if (o.kind !== "car") return true;
      const dAng = Math.abs(wrapAngle(o.angle - ang));
      const along = Math.abs((o.x - cx) * c + (o.y - cy) * s);
      const lat = Math.abs(-(o.x - cx) * s + (o.y - cy) * c);
      const sameRow = lat < 1.6 && (dAng < 0.35 || Math.abs(dAng - Math.PI) < 0.35);
      const nearEnds = along < bw / 2 + o.length + 1.5;
      return !(sameRow && nearEnds);
    });

    const nLen = bay.neighbourLength;
    const nW = bay.neighbourWidth;
    const left = localToWorld(-(bw / 2 + bay.endGap + nLen / 2), 0);
    const right = localToWorld(bw / 2 + bay.endGap + nLen / 2, 0);
    lvl.obstacles.push({
      kind: "car",
      x: left.x,
      y: left.y,
      angle: ang,
      length: nLen,
      width: nW,
      color: "#64748b",
    });
    lvl.obstacles.push({
      kind: "car",
      x: right.x,
      y: right.y,
      angle: ang,
      length: nLen,
      width: nW,
      color: "#475569",
    });

    return lvl;
  }

  /**
   * Nose-in: keep authored difficulty, but never smaller than the selected car.
   * If the bay must grow, push the immediate flanking cars apart so the physical
   * opening still matches the green zone (+ authored flankMargin).
   */
  function applyNoseInLayout(lvl, vehicle) {
    if (!lvl.noseIn || !lvl.target || lvl.target.exit) return lvl;
    const meta = typeof lvl.noseIn === "object" ? lvl.noseIn : {};
    const minH = vehicle.width * 1.08;
    const minW = vehicle.length * 1.06;
    const oldH = lvl.target.h;
    lvl.target.h = Math.max(lvl.target.h, minH);
    lvl.target.w = Math.max(lvl.target.w, minW);
    lvl.target.coverFrac = lvl.target.coverFrac || 0.82;
    lvl.target.angleTol = Math.min(lvl.target.angleTol || 0.18, 0.16);

    if (lvl.markings && lvl.markings.bays) {
      for (let i = 0; i < lvl.markings.bays.length; i++) {
        const b = lvl.markings.bays[i];
        if (Math.hypot(b.x - lvl.target.x, b.y - lvl.target.y) < 0.2) {
          b.h = Math.max(b.h, lvl.target.h);
          b.w = Math.max(b.w, lvl.target.w);
        }
      }
    }

    const grown = lvl.target.h - oldH;
    if (grown > 0.01) {
      const ang = lvl.target.angle || 0;
      // Lateral axis in world (vehicle-width direction for a nose-in bay)
      const latX = -Math.sin(ang);
      const latY = Math.cos(ang);
      const cx = lvl.target.x;
      const cy = lvl.target.y;
      const flankMargin = meta.flankMargin != null ? meta.flankMargin : 0.22;
      const halfOpen = (lvl.target.h + flankMargin) / 2;
      (lvl.obstacles || []).forEach(function (o) {
        if (o.kind !== "car") return;
        const dx = o.x - cx;
        const dy = o.y - cy;
        const along = dx * Math.cos(ang) + dy * Math.sin(ang);
        const lat = dx * latX + dy * latY;
        const sameRow = Math.abs(along) < 1.2;
        if (!sameRow) return;
        // Re-seat cars that were immediate flanks (closest on each side)
        if (Math.abs(Math.abs(lat) - (oldH + flankMargin) / 2 - o.width / 2) < 0.55) {
          const sign = lat >= 0 ? 1 : -1;
          const newLat = sign * (halfOpen + o.width / 2);
          o.x = cx + along * Math.cos(ang) + newLat * latX;
          o.y = cy + along * Math.sin(ang) + newLat * latY;
        }
      });
    }
    return lvl;
  }

  function prepareLevel(index, vehicle) {
    const lvl = cloneLevel(window.PARK_LEVELS[index]);
    applyParallelLayout(lvl, vehicle);
    applyNoseInLayout(lvl, vehicle);
    return lvl;
  }

  // ——— Hint mode ———
  function syncHintToggleUi() {
    const label = state.hintsOn ? "Hints: On" : "Hints: Off";
    const pressed = state.hintsOn ? "true" : "false";
    ["btn-hints-menu", "btn-hints-hud"].forEach(function (id) {
      const el = document.getElementById(id);
      if (!el) return;
      el.textContent = label;
      el.setAttribute("aria-pressed", pressed);
    });
    const stepEl = document.getElementById("hud-hint-step");
    const nextBtn = document.getElementById("btn-hint-next");
    if (stepEl) stepEl.classList.toggle("hidden", !state.hintsOn);
    if (nextBtn) nextBtn.classList.toggle("hidden", !state.hintsOn);
  }

  function setHintsOn(on) {
    state.hintsOn = !!on;
    if (state.hintsOn && state.activeLevel && state.car) {
      rebuildHintSteps();
    }
    syncHintToggleUi();
    updateHintHud();
  }

  function rebuildHintSteps() {
    const api = window.ParkHints;
    if (!api || !state.activeLevel) {
      state.hintSteps = [];
      state.hintType = null;
      state.hintStepIndex = 0;
      return;
    }
    const v = vehicleById(state.vehicleId);
    const built = api.buildHintSteps(state.activeLevel, v);
    state.hintType = built.type;
    state.hintSteps = built.steps || [];
    state.hintStepIndex = 0;
    state.hintHold = 0;
  }

  function updateHintHud() {
    const stepEl = document.getElementById("hud-hint-step");
    if (!stepEl) return;
    if (!state.hintsOn || !state.hintSteps.length) {
      stepEl.textContent = "";
      return;
    }
    const i = state.hintStepIndex;
    const step = state.hintSteps[i];
    const label = step ? step.label : "—";
    stepEl.textContent =
      "Hint " + (i + 1) + "/" + state.hintSteps.length + " · " + label.replace(/^\d+\s*·\s*/, "");
  }

  function advanceHintStep(manual) {
    if (!state.hintsOn || !state.hintSteps.length) return;
    if (state.hintStepIndex < state.hintSteps.length - 1) {
      state.hintStepIndex += 1;
      state.hintHold = 0;
      updateHintHud();
    } else if (manual) {
      // Stay on last step
      state.hintHold = 0;
    }
  }

  function updateHintProgress(dt) {
    if (!state.hintsOn || !state.running || !state.car || !state.hintSteps.length) return;
    const api = window.ParkHints;
    if (!api) return;
    const step = state.hintSteps[state.hintStepIndex];
    if (!step) return;
    const isLast = state.hintStepIndex >= state.hintSteps.length - 1;
    if (api.carMatchesHintStep(state.car, step, { allowFlip: isLast })) {
      state.hintHold += dt;
      if (!isLast && state.hintHold > 0.4) {
        advanceHintStep(false);
      }
    } else {
      state.hintHold = Math.max(0, state.hintHold - dt * 0.5);
    }
  }

  function drawHintSteps(c, fit) {
    if (!state.hintsOn || !state.hintSteps.length) return;
    const steps = state.hintSteps;
    const active = state.hintStepIndex;
    for (let i = 0; i < steps.length; i++) {
      const s = steps[i];
      const isActive = i === active;
      const done = i < active;
      if (!isActive && !done) {
        // Future steps: very faint outline only
        c.save();
        c.translate(s.x * fit, s.y * fit);
        c.rotate(s.angle || 0);
        const w = s.w * fit;
        const h = s.h * fit;
        c.strokeStyle = "rgba(147, 197, 253, 0.22)";
        c.lineWidth = 1.2;
        c.setLineDash([5, 5]);
        c.strokeRect(-w / 2, -h / 2, w, h);
        c.setLineDash([]);
        c.restore();
        continue;
      }
      c.save();
      c.translate(s.x * fit, s.y * fit);
      c.rotate(s.angle || 0);
      const w = s.w * fit;
      const h = s.h * fit;
      if (done) {
        c.strokeStyle = "rgba(148, 163, 184, 0.4)";
        c.fillStyle = "rgba(148, 163, 184, 0.08)";
        c.lineWidth = 1.5;
      } else {
        c.strokeStyle = "rgba(56, 189, 248, 0.95)";
        c.fillStyle = "rgba(56, 189, 248, 0.16)";
        c.lineWidth = 2.5;
      }
      c.setLineDash(isActive ? [10, 6] : []);
      c.fillRect(-w / 2, -h / 2, w, h);
      c.strokeRect(-w / 2, -h / 2, w, h);
      c.setLineDash([]);
      // Nose tick
      c.strokeStyle = isActive ? "rgba(125, 211, 252, 0.95)" : "rgba(148, 163, 184, 0.5)";
      c.beginPath();
      c.moveTo(w / 2 - 2, 0);
      c.lineTo(w / 2 + fit * 0.35, 0);
      c.stroke();
      // Label upright in world (counter-rotate)
      c.rotate(-(s.angle || 0));
      c.fillStyle = isActive ? "#7dd3fc" : "rgba(203, 213, 225, 0.7)";
      c.font = `bold ${Math.max(10, fit * 0.38)}px Segoe UI, sans-serif`;
      c.textAlign = "center";
      c.textBaseline = "middle";
      c.fillText(s.label || "", 0, 0);
      c.restore();
    }
  }


  function clamp(v, a, b) {
    return Math.max(a, Math.min(b, v));
  }

  function wrapAngle(a) {
    while (a > Math.PI) a -= Math.PI * 2;
    while (a < -Math.PI) a += Math.PI * 2;
    return a;
  }

  function angleDiff(a, b) {
    return Math.abs(wrapAngle(a - b));
  }

  function lerp(a, b, t) {
    return a + (b - a) * t;
  }

  // Oriented bounding box corners (center x,y, length along heading, width, angle)
  function obbCorners(x, y, length, width, angle) {
    const hx = length / 2;
    const hy = width / 2;
    const c = Math.cos(angle);
    const s = Math.sin(angle);
    const pts = [
      [-hx, -hy],
      [hx, -hy],
      [hx, hy],
      [-hx, hy],
    ];
    return pts.map(([px, py]) => ({
      x: x + px * c - py * s,
      y: y + px * s + py * c,
    }));
  }

  function projectAxis(corners, ax, ay) {
    let min = Infinity;
    let max = -Infinity;
    for (const p of corners) {
      const d = p.x * ax + p.y * ay;
      if (d < min) min = d;
      if (d > max) max = d;
    }
    return { min, max };
  }

  function satOverlap(a, b) {
    // a,b: {x,y,length,width,angle}
    const ca = obbCorners(a.x, a.y, a.length, a.width, a.angle);
    const cb = obbCorners(b.x, b.y, b.length, b.width, b.angle);
    const axes = [];
    for (const [corners, ang] of [
      [ca, a.angle],
      [cb, b.angle],
    ]) {
      axes.push({ x: Math.cos(ang), y: Math.sin(ang) });
      axes.push({ x: -Math.sin(ang), y: Math.cos(ang) });
    }
    let minOverlap = Infinity;
    let sepX = 0;
    let sepY = 0;
    for (const axis of axes) {
      const pa = projectAxis(ca, axis.x, axis.y);
      const pb = projectAxis(cb, axis.x, axis.y);
      const overlap = Math.min(pa.max, pb.max) - Math.max(pa.min, pb.min);
      if (overlap <= 0) return null;
      if (overlap < minOverlap) {
        minOverlap = overlap;
        // Push A out of B: direction from B center to A center along axis
        const midA = (pa.min + pa.max) / 2;
        const midB = (pb.min + pb.max) / 2;
        const sign = midA > midB ? 1 : -1;
        sepX = axis.x * overlap * sign;
        sepY = axis.y * overlap * sign;
      }
    }
    return { overlap: minOverlap, nx: sepX / minOverlap, ny: sepY / minOverlap, pushX: sepX, pushY: sepY };
  }

  function pointInOrientedRect(px, py, rect) {
    // rect: center x,y,w,h,angle (w along angle)
    const dx = px - rect.x;
    const dy = py - rect.y;
    const c = Math.cos(-rect.angle);
    const s = Math.sin(-rect.angle);
    const lx = dx * c - dy * s;
    const ly = dx * s + dy * c;
    return Math.abs(lx) <= rect.w / 2 && Math.abs(ly) <= rect.h / 2;
  }

  function carCornersInTarget(car, target, fraction) {
    const corners = obbCorners(car.x, car.y, car.length, car.width, car.angle);
    let inside = 0;
    for (const p of corners) {
      if (pointInOrientedRect(p.x, p.y, target)) inside++;
    }
    // Also check center
    if (pointInOrientedRect(car.x, car.y, target)) inside++;
    return inside / 5 >= fraction;
  }

  // ——— Car ———
  function createCar(vehicle, spawn) {
    return {
      ...vehicle,
      x: spawn.x,
      y: spawn.y,
      angle: spawn.angle,
      speed: 0,
      steer: 0,
      flashing: 0,
    };
  }

  function updateCar(car, dt) {
    const throttle = (state.keys.ArrowUp || state.keys.w || state.keys.W) ? 1 : 0;
    const brake = (state.keys.ArrowDown || state.keys.s || state.keys.S) ? 1 : 0;
    const left = (state.keys.ArrowLeft || state.keys.a || state.keys.A) ? 1 : 0;
    const right = (state.keys.ArrowRight || state.keys.d || state.keys.D) ? 1 : 0;
    const handbrake = !!(state.keys[" "] || state.keys.Space);

    // Steering — slows at high speed
    const steerInput = right - left;
    const speedFactor = 1 / (1 + Math.abs(car.speed) * 0.18);
    const targetSteer = steerInput * car.steerAngle * speedFactor;
    car.steer = lerp(car.steer, targetSteer, 1 - Math.pow(0.001, dt));

    // Longitudinal
    if (throttle) {
      if (car.speed >= 0) {
        car.speed += car.accel * dt;
      } else {
        // braking out of reverse into forward
        car.speed += car.brake * dt;
      }
    }
    if (brake) {
      if (car.speed > 0.15) {
        car.speed -= car.brake * dt;
      } else {
        car.speed -= car.accel * 0.7 * dt; // reverse
      }
    }

    // Friction / handbrake
    const fric = handbrake ? car.handbrakeFriction : car.friction;
    if (!throttle && !brake) {
      if (car.speed > 0) car.speed = Math.max(0, car.speed - fric * dt);
      else if (car.speed < 0) car.speed = Math.min(0, car.speed + fric * dt);
    } else if (handbrake) {
      if (car.speed > 0) car.speed = Math.max(0, car.speed - fric * 0.6 * dt);
      else if (car.speed < 0) car.speed = Math.min(0, car.speed + fric * 0.6 * dt);
    }

    car.speed = clamp(car.speed, -car.reverseMax, car.maxSpeed);

    // Bicycle model
    const rolling = Math.abs(car.speed) > 0.05;
    if (rolling && Math.abs(car.steer) > 0.001) {
      const turnRadius = car.wheelbase / Math.tan(car.steer);
      const angular = car.speed / turnRadius;
      car.angle += angular * dt;
    }

    car.x += Math.cos(car.angle) * car.speed * dt;
    car.y += Math.sin(car.angle) * car.speed * dt;

    if (car.flashing > 0) car.flashing -= dt;
  }

  // ——— Collisions ———
  /** Four wheel contact points from bicycle geometry (front/rear × left/right). */
  function carWheelPositions(car) {
    const c = Math.cos(car.angle);
    const s = Math.sin(car.angle);
    const halfWb = (car.wheelbase || car.length * 0.62) * 0.5;
    const halfTrack = car.width * 0.42;
    const pts = [
      [halfWb, halfTrack],
      [halfWb, -halfTrack],
      [-halfWb, halfTrack],
      [-halfWb, -halfTrack],
    ];
    return pts.map(function (p) {
      return {
        x: car.x + p[0] * c - p[1] * s,
        y: car.y + p[0] * s + p[1] * c,
      };
    });
  }

  /**
   * Wheel-only curb: keep all four wheels street-side of curbLine.
   * Does not count as a bump — body/bumper may visually approach the curb.
   */
  function constrainWheelsToCurb(car, curbLine) {
    if (!curbLine) return;
    const wheels = carWheelPositions(car);
    let worst = 0; // most negative = deepest into sidewalk
    for (let i = 0; i < wheels.length; i++) {
      const w = wheels[i];
      const d = (w.x - curbLine.ox) * curbLine.nx + (w.y - curbLine.oy) * curbLine.ny;
      if (d < worst) worst = d;
    }
    if (worst >= -0.002) return;
    const push = -worst;
    car.x += curbLine.nx * push;
    car.y += curbLine.ny * push;
    const into =
      Math.cos(car.angle) * -curbLine.nx + Math.sin(car.angle) * -curbLine.ny;
    if (car.speed * into > 0.05) {
      // Slide along curb — kill into-sidewalk component, no bump
      car.speed *= 0.35;
      if (Math.abs(car.speed) < 0.35) car.speed = 0;
    }
  }

  function resolveCollisions(car, lvl) {
    let hit = false;
    const body = { x: car.x, y: car.y, length: car.length, width: car.width, angle: car.angle };

    const solids = [];
    for (const w of lvl.walls || []) {
      if (w.curb) continue; // curb never bumps — wheels handled separately
      solids.push({ x: w.x, y: w.y, length: w.w, width: w.h, angle: 0, kind: "wall" });
    }
    for (const o of lvl.obstacles || []) {
      if (o.kind === "car") {
        solids.push({ x: o.x, y: o.y, length: o.length, width: o.width, angle: o.angle, kind: "car" });
      } else if (o.kind === "cone") {
        solids.push({ x: o.x, y: o.y, length: o.r * 2, width: o.r * 2, angle: 0, kind: "cone" });
      }
    }

    for (const s of solids) {
      const hitInfo = satOverlap(body, s);
      if (!hitInfo) continue;
      hit = true;
      car.x += hitInfo.pushX * 1.05;
      car.y += hitInfo.pushY * 1.05;
      car.speed *= -0.25;
      if (Math.abs(car.speed) < 0.4) car.speed = 0;
      body.x = car.x;
      body.y = car.y;
    }

    // Wheels stop at curb; never counts as a collision bump
    constrainWheelsToCurb(car, lvl.curbLine);

    // Keep in soft world bounds
    car.x = clamp(car.x, 0.5, lvl.worldW - 0.5);
    car.y = clamp(car.y, 0.5, lvl.worldH - 0.5);

    return hit;
  }

  // ——— Success ———
  function checkSuccess(car, lvl) {
    const t = lvl.target;
    if (!t) return false;
    if (Math.abs(car.speed) > t.speedMax) return false;

    const need = t.coverFrac != null ? t.coverFrac : t.exit ? 0.55 : 0.72;
    const coverOk = carCornersInTarget(car, t, need);
    if (!coverOk) return false;

    if (t.angle != null && t.angleTol < Math.PI) {
      // Accept facing either direction for park-in (parallel often ends facing either way)
      const d1 = angleDiff(car.angle, t.angle);
      const d2 = angleDiff(car.angle, t.angle + Math.PI);
      if (Math.min(d1, d2) > t.angleTol) return false;
    }
    return true;
  }

  // ——— Render (chase camera) ———
  // World angle 0 = facing +X. Camera rotates so car forward points to screen top (-Y).
  const CAMERA_UP_OFFSET = -Math.PI / 2;

  function getFit() {
    // Pixels per world unit — keep a comfortable chase framing around the car
    const viewSpan = 20; // world units across the shorter canvas axis
    return Math.min(CANVAS_W, CANVAS_H) / viewSpan;
  }

  /** Apply chase transform: car at origin of subsequent draws, nose toward screen top. */
  function beginChaseCamera(c, car, fit) {
    c.translate(CANVAS_W / 2, CANVAS_H / 2);
    c.rotate(-(car.angle) + CAMERA_UP_OFFSET);
    c.translate(-car.x * fit, -car.y * fit);
  }

  function drawRoundedRect(c, x, y, w, h, r) {
    const rr = Math.min(r, w / 2, h / 2);
    c.beginPath();
    c.moveTo(x + rr, y);
    c.arcTo(x + w, y, x + w, y + h, rr);
    c.arcTo(x + w, y + h, x, y + h, rr);
    c.arcTo(x, y + h, x, y, rr);
    c.arcTo(x, y, x + w, y, rr);
    c.closePath();
  }

  function drawVehicleShape(c, car, fit, ghost) {
    c.save();
    c.translate(car.x * fit, car.y * fit);
    c.rotate(car.angle);
    const L = car.length * fit;
    const W = car.width * fit;
    const x = -L / 2;
    const y = -W / 2;

    // Shadow
    if (!ghost) {
      c.fillStyle = "rgba(0,0,0,0.35)";
      drawRoundedRect(c, x + 2, y + 3, L, W, 6);
      c.fill();
    }

    // Body
    c.fillStyle = car.flashing > 0 ? "#fca5a5" : car.color;
    drawRoundedRect(c, x, y, L, W, Math.max(4, W * 0.18));
    c.fill();

    // Roof / cabin
    c.fillStyle = car.roof || "#cbd5e1";
    const cabinX = x + L * 0.22;
    const cabinW = L * 0.48;
    drawRoundedRect(c, cabinX, y + W * 0.12, cabinW, W * 0.76, 4);
    c.fill();

    // Windows
    c.fillStyle = car.window || "#0f172a";
    drawRoundedRect(c, cabinX + 3, y + W * 0.2, cabinW * 0.38, W * 0.6, 2);
    c.fill();
    drawRoundedRect(c, cabinX + cabinW * 0.48, y + W * 0.2, cabinW * 0.38, W * 0.6, 2);
    c.fill();

    // Lights
    c.fillStyle = "#fef3c7";
    c.fillRect(x + L - 5, y + 3, 5, W * 0.28);
    c.fillRect(x + L - 5, y + W - 3 - W * 0.28, 5, W * 0.28);
    c.fillStyle = "#ef4444";
    c.fillRect(x, y + 3, 4, W * 0.28);
    c.fillRect(x, y + W - 3 - W * 0.28, 4, W * 0.28);

    // Wheels
    c.fillStyle = "#0f172a";
    const wheelLen = L * 0.14;
    const wheelW = Math.max(3, W * 0.14);
    const inset = 2;
    c.fillRect(x + L * 0.18, y - wheelW + inset, wheelLen, wheelW);
    c.fillRect(x + L * 0.18, y + W - inset, wheelLen, wheelW);
    c.fillRect(x + L * 0.68, y - wheelW + inset, wheelLen, wheelW);
    c.fillRect(x + L * 0.68, y + W - inset, wheelLen, wheelW);

    // Direction notch
    c.fillStyle = "rgba(255,255,255,0.35)";
    c.beginPath();
    c.moveTo(x + L * 0.92, 0);
    c.lineTo(x + L * 0.78, -W * 0.12);
    c.lineTo(x + L * 0.78, W * 0.12);
    c.closePath();
    c.fill();

    c.restore();
  }

  function drawBay(c, bay, fit, isTarget, label) {
    c.save();
    c.translate(bay.x * fit, bay.y * fit);
    c.rotate(bay.angle || 0);
    const w = bay.w * fit;
    const h = bay.h * fit;
    c.strokeStyle = isTarget ? "#4ade80" : "rgba(226,232,240,0.55)";
    c.lineWidth = isTarget ? 2.5 : 1.5;
    c.setLineDash(isTarget ? [8, 6] : []);
    c.strokeRect(-w / 2, -h / 2, w, h);
    c.setLineDash([]);
    if (isTarget) {
      c.fillStyle = "rgba(74, 222, 128, 0.12)";
      c.fillRect(-w / 2, -h / 2, w, h);
      c.fillStyle = "rgba(74, 222, 128, 0.85)";
      c.font = `bold ${Math.max(11, fit * 0.45)}px Segoe UI, sans-serif`;
      c.textAlign = "center";
      c.textBaseline = "middle";
      c.rotate(-(bay.angle || 0));
      c.fillText(label || "TARGET", 0, 0);
    }
    c.restore();
  }

  function drawCone(c, o, fit) {
    const x = o.x * fit;
    const y = o.y * fit;
    const r = o.r * fit;
    c.fillStyle = "#f97316";
    c.beginPath();
    c.moveTo(x, y - r * 1.4);
    c.lineTo(x + r, y + r * 0.8);
    c.lineTo(x - r, y + r * 0.8);
    c.closePath();
    c.fill();
    c.fillStyle = "#fff";
    c.fillRect(x - r * 0.35, y - r * 0.2, r * 0.7, r * 0.35);
  }

  function worldToScreen(wx, wy, car, fit) {
    const dx = (wx - car.x) * fit;
    const dy = (wy - car.y) * fit;
    const th = -car.angle + CAMERA_UP_OFFSET;
    const cos = Math.cos(th);
    const sin = Math.sin(th);
    return {
      x: CANVAS_W / 2 + dx * cos - dy * sin,
      y: CANVAS_H / 2 + dx * sin + dy * cos,
    };
  }

  function drawOffscreenTargetArrow(c, car, fit, lvl) {
    const t = lvl.target;
    if (!t) return;
    const scr = worldToScreen(t.x, t.y, car, fit);
    const margin = 28;
    const onScreen =
      scr.x >= margin &&
      scr.x <= CANVAS_W - margin &&
      scr.y >= margin &&
      scr.y <= CANVAS_H - margin;
    if (onScreen) return;

    const cx = CANVAS_W / 2;
    const cy = CANVAS_H / 2;
    let dx = scr.x - cx;
    let dy = scr.y - cy;
    const len = Math.hypot(dx, dy) || 1;
    dx /= len;
    dy /= len;

    // Intersect with inset rectangle
    const inset = 36;
    const maxX = CANVAS_W / 2 - inset;
    const maxY = CANVAS_H / 2 - inset;
    const sx = dx === 0 ? Infinity : maxX / Math.abs(dx);
    const sy = dy === 0 ? Infinity : maxY / Math.abs(dy);
    const tScale = Math.min(sx, sy);
    const ax = cx + dx * tScale;
    const ay = cy + dy * tScale;
    const ang = Math.atan2(dy, dx);

    c.save();
    c.translate(ax, ay);
    c.rotate(ang);
    // Arrow body
    c.fillStyle = "rgba(74, 222, 128, 0.95)";
    c.strokeStyle = "rgba(15, 23, 42, 0.85)";
    c.lineWidth = 2;
    c.beginPath();
    c.moveTo(18, 0);
    c.lineTo(-10, 12);
    c.lineTo(-4, 0);
    c.lineTo(-10, -12);
    c.closePath();
    c.fill();
    c.stroke();
    // Label screen-upright
    c.rotate(-ang);
    c.fillStyle = "#4ade80";
    c.font = "bold 11px Segoe UI, sans-serif";
    c.textAlign = "center";
    c.textBaseline = "middle";
    const label = t.exit ? "EXIT" : "TARGET";
    c.fillText(label, 0, dy > 0.2 ? -22 : 22);
    c.restore();
  }

  function drawPlayerCarScreenFixed(c, car, fit) {
    // Car drawn at canvas center, nose toward top (local +X after -90°).
    c.save();
    c.translate(CANVAS_W / 2, CANVAS_H / 2);
    c.rotate(CAMERA_UP_OFFSET);
    const ghostCar = {
      x: 0,
      y: 0,
      angle: 0,
      length: car.length,
      width: car.width,
      color: car.color,
      roof: car.roof,
      window: car.window,
      flashing: car.flashing,
    };
    drawVehicleShape(c, ghostCar, fit, false);
    c.restore();
  }

  function render() {
    const lvl = level();
    const fit = getFit();
    const car = state.car;

    ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);

    // Outer void (screen-fixed)
    ctx.fillStyle = "#070d18";
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

    if (!car) return;

    // ——— World layer (chase camera: centered on car, rotated so nose = up) ———
    ctx.save();
    beginChaseCamera(ctx, car, fit);

    // Asphalt lot
    ctx.fillStyle = "#1e2530";
    ctx.fillRect(0, 0, lvl.worldW * fit, lvl.worldH * fit);

    // Subtle asphalt stripes
    ctx.strokeStyle = "rgba(255,255,255,0.03)";
    ctx.lineWidth = 1;
    for (let i = 0; i < lvl.worldW; i += 2) {
      ctx.beginPath();
      ctx.moveTo(i * fit, 0);
      ctx.lineTo(i * fit, lvl.worldH * fit);
      ctx.stroke();
    }

    // Soft vignette edge beyond lot
    ctx.strokeStyle = "#0f172a";
    ctx.lineWidth = 8;
    ctx.strokeRect(-4, -4, lvl.worldW * fit + 8, lvl.worldH * fit + 8);

    // Walls / curbs
    for (const w of lvl.walls || []) {
      if (w.curb) ctx.fillStyle = "#a8b4c4";
      else ctx.fillStyle = w.h < 1 && w.w > 5 ? "#94a3b8" : "#334155";
      ctx.fillRect((w.x - w.w / 2) * fit, (w.y - w.h / 2) * fit, w.w * fit, w.h * fit);
    }

    // Markings
    const markings = lvl.markings || {};
    const target = lvl.target;
    for (const bay of markings.bays || []) {
      const isTarget =
        !markings.exitZone &&
        Math.abs(bay.x - target.x) < 0.01 &&
        Math.abs(bay.y - target.y) < 0.01;
      drawBay(ctx, bay, fit, isTarget);
    }
    if (markings.exitZone) {
      drawBay(ctx, { ...markings.exitZone, angle: 0 }, fit, true, "EXIT ZONE");
    }

    if (target && !markings.exitZone) {
      const matched = (markings.bays || []).some(
        (b) => Math.abs(b.x - target.x) < 0.01 && Math.abs(b.y - target.y) < 0.01
      );
      if (!matched) drawBay(ctx, target, fit, true);
    }

    // Lane dashed line for aisle feel
    ctx.strokeStyle = "rgba(250, 204, 21, 0.35)";
    ctx.setLineDash([10, 12]);
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(fit * 2, (lvl.worldH * 0.55) * fit);
    ctx.lineTo((lvl.worldW - 2) * fit, (lvl.worldH * 0.55) * fit);
    ctx.stroke();
    ctx.setLineDash([]);

    // Obstacles (world-rotated with the lot)
    for (const o of lvl.obstacles || []) {
      if (o.kind === "car") {
        drawVehicleShape(ctx, o, fit, true);
      } else if (o.kind === "cone") {
        drawCone(ctx, o, fit);
      }
    }

    // Hint ghost boxes (world space, under chase camera)
    drawHintSteps(ctx, fit);

    ctx.restore();

    // ——— Player car: screen-centered, always nose-up (not double-rotated) ———
    drawPlayerCarScreenFixed(ctx, car, fit);

    // Off-screen target / exit direction indicator
    if (state.running && !state.won && !state.failed) {
      drawOffscreenTargetArrow(ctx, car, fit, lvl);
    }

    // ——— Screen-fixed overlays (HUD tips on canvas; DOM HUD stays fixed too) ———
    if (state.running && state.levelIndex === 0 && state.time < 10) {
      ctx.fillStyle = "rgba(15, 23, 42, 0.82)";
      ctx.fillRect(CANVAS_W * 0.12, 14, CANVAS_W * 0.76, 52);
      ctx.fillStyle = "#e2e8f0";
      ctx.font = "600 14px Segoe UI, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("Left / Right (A D) = steering wheel · Up = gas · Down = brake / reverse", CANVAS_W / 2, 34);
      ctx.fillStyle = "#94a3b8";
      ctx.font = "12px Segoe UI, sans-serif";
      ctx.fillText("Camera follows you — car front stays at the top. Pull past the gap, reverse in, straighten.", CANVAS_W / 2, 52);
    }

    // Compact control strip (always visible while playing)
    if (state.running && !state.won && !state.failed) {
      ctx.fillStyle = "rgba(15, 23, 42, 0.55)";
      ctx.fillRect(12, CANVAS_H - 36, 340, 24);
      ctx.fillStyle = "#cbd5e1";
      ctx.font = "11px Segoe UI, sans-serif";
      ctx.textAlign = "left";
      ctx.fillText("←→ steer   ↑ gas   ↓ brake/rev   Space handbrake   R restart", 20, CANVAS_H - 20);
    }
  }

  // ——— HUD / UI ———
  function updateHud() {
    const lvl = level();
    const v = vehicleById(state.vehicleId);
    document.getElementById("hud-level").textContent = lvl.name;
    document.getElementById("hud-tip").textContent = lvl.tip;
    document.getElementById("hud-time").textContent = state.time.toFixed(1) + "s";
    document.getElementById("hud-bumps").textContent = String(state.bumps);
    document.getElementById("hud-car").textContent = v.name;
    updateHintHud();
  }

  function showScreen(name) {
    document.getElementById("screen-menu").classList.toggle("active", name === "menu");
    document.getElementById("screen-game").classList.toggle("active", name === "game");
    state.screen = name;
    if (name === "game") {
      // Layout is visible now — measure play area and fill it
      requestAnimationFrame(resizeCanvas);
    }
  }

  function hideOverlays() {
    document.getElementById("overlay-success").classList.add("hidden");
    document.getElementById("overlay-fail").classList.add("hidden");
  }

  function showSuccess() {
    state.won = true;
    state.running = false;
    const lvl = level();
    const stats = document.getElementById("success-stats");
    const score = Math.max(0, Math.round(1000 - state.time * 12 - state.bumps * 80));
    document.getElementById("success-title").textContent = lvl.mode === "Drive out" ? "Clean exit!" : "Parked!";
    stats.innerHTML = `
      <li><span>Time</span><strong>${state.time.toFixed(1)}s</strong></li>
      <li><span>Bumps</span><strong>${state.bumps}</strong></li>
      <li><span>Score</span><strong>${score}</strong></li>
      <li><span>Vehicle</span><strong>${vehicleById(state.vehicleId).name}</strong></li>
    `;
    document.getElementById("btn-next").style.display =
      state.levelIndex < window.PARK_LEVELS.length - 1 ? "" : "none";
    document.getElementById("overlay-success").classList.remove("hidden");
  }

  function showFail() {
    state.failed = true;
    state.running = false;
    document.getElementById("overlay-fail").classList.remove("hidden");
  }

  // ——— Lifecycle ———
  function startLevel() {
    const v = vehicleById(state.vehicleId);
    state.activeLevel = prepareLevel(state.levelIndex, v);
    const lvl = state.activeLevel;
    state.car = createCar(v, lvl.spawn);
    state.bumps = 0;
    state.bumpCooldown = 0;
    state.time = 0;
    state.running = true;
    state.won = false;
    state.failed = false;
    state.successHold = 0;
    state.lastTs = 0;
    rebuildHintSteps();
    hideOverlays();
    showScreen("game");
    resizeCanvas();
    syncHintToggleUi();
    updateHud();
    // Show touch controls on coarse pointers
    const tc = document.getElementById("touch-controls");
    if (window.matchMedia("(pointer: coarse)").matches || window.innerWidth < 720) {
      tc.classList.add("show");
    } else {
      tc.classList.remove("show");
    }
  }

  function tick(ts) {
    requestAnimationFrame(tick);
    if (state.screen !== "game") return;

    if (!state.lastTs) state.lastTs = ts;
    let dt = (ts - state.lastTs) / 1000;
    state.lastTs = ts;
    dt = Math.min(0.05, dt);

    if (state.running && state.car) {
      state.time += dt;
      if (state.bumpCooldown > 0) state.bumpCooldown -= dt;

      updateCar(state.car, dt);
      const hit = resolveCollisions(state.car, level());
      if (hit && state.bumpCooldown <= 0) {
        state.bumps += 1;
        state.bumpCooldown = 0.55;
        state.car.flashing = 0.35;
        if (state.bumps >= (level().maxBumps || 8)) {
          showFail();
        }
      }

      if (checkSuccess(state.car, level())) {
        state.successHold += dt;
        if (state.successHold > 0.55) showSuccess();
      } else {
        state.successHold = 0;
      }

      updateHintProgress(dt);
      updateHud();
    }

    render();
  }

  // ——— Menu builders ———
  function drawPickerSilhouette(canvasEl, vehicle) {
    const c = canvasEl.getContext("2d");
    const W = canvasEl.width;
    const H = canvasEl.height;
    c.clearRect(0, 0, W, H);
    const fit = Math.min((W * 0.85) / vehicle.length, (H * 0.7) / vehicle.width);
    c.save();
    c.translate(W / 2, H / 2);
    drawVehicleShape(
      c,
      {
        x: 0,
        y: 0,
        angle: 0,
        length: vehicle.length,
        width: vehicle.width,
        color: vehicle.color,
        roof: vehicle.roof,
        window: vehicle.window,
        flashing: 0,
      },
      fit,
      false
    );
    // drawVehicleShape expects world*fit translation — we passed x=0,y=0 so OK
    c.restore();
  }

  function buildVehiclePicker() {
    const root = document.getElementById("vehicle-picker");
    root.innerHTML = "";
    for (const v of window.PARK_VEHICLES) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "vehicle-card" + (v.featured ? " featured" : "") + (v.id === state.vehicleId ? " selected" : "");
      btn.setAttribute("role", "option");
      btn.setAttribute("aria-selected", v.id === state.vehicleId ? "true" : "false");
      btn.innerHTML = `
        <span class="badge">Default · your car</span>
        <canvas width="120" height="64" aria-hidden="true"></canvas>
        <p class="name">${v.name}</p>
        <p class="desc">${v.description}</p>
        <p class="diff ${v.difficulty}">${v.difficulty}</p>
      `;
      const cv = btn.querySelector("canvas");
      // Draw after layout
      requestAnimationFrame(() => drawPickerSilhouette(cv, v));
      btn.addEventListener("click", () => {
        state.vehicleId = v.id;
        buildVehiclePicker();
      });
      root.appendChild(btn);
    }
  }

  function buildLevelPicker() {
    const root = document.getElementById("level-picker");
    root.innerHTML = "";
    window.PARK_LEVELS.forEach((lvl, i) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "level-card" + (i === state.levelIndex ? " selected" : "");
      btn.setAttribute("role", "option");
      btn.innerHTML = `
        <span class="level-num">${i + 1}</span>
        <span>
          <p class="level-title">${lvl.name.replace(/^\d+\s·\s/, "")}</p>
          <p class="level-desc">${lvl.short}</p>
        </span>
        <span class="level-mode">${lvl.mode}</span>
      `;
      btn.addEventListener("click", () => {
        state.levelIndex = i;
        buildLevelPicker();
      });
      root.appendChild(btn);
    });
  }

  // ——— Input ———
  function setKey(code, key, down) {
    if (code === "Space" || key === " ") state.keys[" "] = down;
    state.keys[key] = down;
    if (code.startsWith("Arrow")) state.keys[code] = down;
    // normalize letters
    if (key && key.length === 1) {
      state.keys[key.toLowerCase()] = down;
      state.keys[key.toUpperCase()] = down;
    }
  }

  window.addEventListener("keydown", (e) => {
    if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", " "].includes(e.key)) {
      e.preventDefault();
    }
    setKey(e.code, e.key, true);
    if ((e.key === "r" || e.key === "R") && state.screen === "game") {
      startLevel();
    }
  });
  window.addEventListener("keyup", (e) => {
    setKey(e.code, e.key, false);
  });

  // Touch controls
  function bindTouch() {
    const root = document.getElementById("touch-controls");
    root.querySelectorAll(".touch-btn").forEach((btn) => {
      const key = btn.getAttribute("data-key");
      const on = (e) => {
        e.preventDefault();
        setKey(key === " " ? "Space" : key, key, true);
        btn.classList.add("active");
      };
      const off = (e) => {
        e.preventDefault();
        setKey(key === " " ? "Space" : key, key, false);
        btn.classList.remove("active");
      };
      btn.addEventListener("touchstart", on, { passive: false });
      btn.addEventListener("touchend", off);
      btn.addEventListener("touchcancel", off);
      btn.addEventListener("mousedown", on);
      btn.addEventListener("mouseup", off);
      btn.addEventListener("mouseleave", off);
    });
  }

  // Buttons
  document.getElementById("btn-start").addEventListener("click", () => startLevel());
  document.getElementById("btn-menu").addEventListener("click", () => {
    state.running = false;
    showScreen("menu");
  });
  document.getElementById("btn-restart").addEventListener("click", () => startLevel());
  document.getElementById("btn-again").addEventListener("click", () => startLevel());
  document.getElementById("btn-fail-retry").addEventListener("click", () => startLevel());
  document.getElementById("btn-success-menu").addEventListener("click", () => {
    showScreen("menu");
    hideOverlays();
  });
  document.getElementById("btn-fail-menu").addEventListener("click", () => {
    showScreen("menu");
    hideOverlays();
  });
  document.getElementById("btn-next").addEventListener("click", () => {
    if (state.levelIndex < window.PARK_LEVELS.length - 1) {
      state.levelIndex += 1;
      buildLevelPicker();
      startLevel();
    }
  });

  function toggleHints() {
    setHintsOn(!state.hintsOn);
  }
  const btnHintsMenu = document.getElementById("btn-hints-menu");
  const btnHintsHud = document.getElementById("btn-hints-hud");
  const btnHintNext = document.getElementById("btn-hint-next");
  if (btnHintsMenu) btnHintsMenu.addEventListener("click", toggleHints);
  if (btnHintsHud) btnHintsHud.addEventListener("click", toggleHints);
  if (btnHintNext) {
    btnHintNext.addEventListener("click", function () {
      advanceHintStep(true);
    });
  }
  syncHintToggleUi();

  // Boot
  buildVehiclePicker();
  buildLevelPicker();
  bindTouch();
  resizeCanvas();
  window.addEventListener("resize", resizeCanvas);
  window.addEventListener("orientationchange", () => setTimeout(resizeCanvas, 100));
  if (typeof ResizeObserver !== "undefined" && canvasWrap) {
    new ResizeObserver(() => resizeCanvas()).observe(canvasWrap);
  }
  requestAnimationFrame(tick);
})();

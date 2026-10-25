/**
 * Park & Exit — main game loop, physics, render, UI
 */
(function () {
  "use strict";

  const SCALE = 24; // pixels per world unit at native canvas size
  const CANVAS_W = 960;
  const CANVAS_H = 640;

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
  };

  const canvas = document.getElementById("game");
  const ctx = canvas.getContext("2d");

  // ——— Helpers ———
  function vehicleById(id) {
    return window.PARK_VEHICLES.find((v) => v.id === id) || window.getDefaultVehicle();
  }

  function level() {
    return window.PARK_LEVELS[state.levelIndex];
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
  function resolveCollisions(car, lvl) {
    let hit = false;
    const body = { x: car.x, y: car.y, length: car.length, width: car.width, angle: car.angle };

    const solids = [];
    for (const w of lvl.walls || []) {
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
      // Bounce velocity
      const vn = car.speed * (Math.cos(car.angle) * hitInfo.nx + Math.sin(car.angle) * hitInfo.ny);
      if (vn > 0) {
        // moving into the surface along push? push points out of B for A
      }
      car.speed *= -0.25;
      if (Math.abs(car.speed) < 0.4) car.speed = 0;
      body.x = car.x;
      body.y = car.y;
    }

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

    const coverOk = carCornersInTarget(car, t, t.exit ? 0.55 : 0.72);
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
      ctx.fillStyle = w.h < 1 && w.w > 5 ? "#94a3b8" : "#334155";
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

    ctx.restore();

    // ——— Player car: screen-centered, always nose-up (not double-rotated) ———
    drawPlayerCarScreenFixed(ctx, car, fit);

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
  }

  function showScreen(name) {
    document.getElementById("screen-menu").classList.toggle("active", name === "menu");
    document.getElementById("screen-game").classList.toggle("active", name === "game");
    state.screen = name;
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
    const lvl = level();
    const v = vehicleById(state.vehicleId);
    state.car = createCar(v, lvl.spawn);
    state.bumps = 0;
    state.bumpCooldown = 0;
    state.time = 0;
    state.running = true;
    state.won = false;
    state.failed = false;
    state.successHold = 0;
    state.lastTs = 0;
    hideOverlays();
    showScreen("game");
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

  // Boot
  buildVehiclePicker();
  buildLevelPicker();
  bindTouch();
  requestAnimationFrame(tick);
})();

/**
 * Hint mode — step boxes per parking type (parallel, bay, nose-in, angle, exit).
 * Consumed by game.js; does not change physics or success checks.
 */
(function () {
  "use strict";

  function wrapAngle(a) {
    while (a > Math.PI) a -= Math.PI * 2;
    while (a < -Math.PI) a += Math.PI * 2;
    return a;
  }

  function localToWorld(cx, cy, ang, lx, ly) {
    const c = Math.cos(ang);
    const s = Math.sin(ang);
    return { x: cx + lx * c - ly * s, y: cy + lx * s + ly * c };
  }

  function obbCorners(x, y, length, width, angle) {
    const hx = length / 2;
    const hy = width / 2;
    const c = Math.cos(angle);
    const s = Math.sin(angle);
    return [
      { x: x + (-hx) * c - (-hy) * s, y: y + (-hx) * s + (-hy) * c },
      { x: x + hx * c - (-hy) * s, y: y + hx * s + (-hy) * c },
      { x: x + hx * c - hy * s, y: y + hx * s + hy * c },
      { x: x + (-hx) * c - hy * s, y: y + (-hx) * s + hy * c },
    ];
  }

  /**
   * Push a car-sized hint box toward the street until the full footprint
   * stays on the street side of the curb line (no sidewalk swing).
   */
  function clampBoxToCurb(box, curbLine, pad) {
    if (!curbLine) return box;
    pad = pad != null ? pad : 0.04;
    let guard = 0;
    while (guard++ < 12) {
      const corners = obbCorners(box.x, box.y, box.w, box.h, box.angle);
      let worst = Infinity;
      for (let i = 0; i < corners.length; i++) {
        const p = corners[i];
        const d =
          (p.x - curbLine.ox) * curbLine.nx + (p.y - curbLine.oy) * curbLine.ny;
        if (d < worst) worst = d;
      }
      if (worst >= pad) break;
      const push = pad - worst;
      box.x += curbLine.nx * push;
      box.y += curbLine.ny * push;
    }
    return box;
  }

  function getCurbLine(lvl) {
    if (lvl.curbLine) return lvl.curbLine;
    // Derive from tagged curb wall + parallel meta if prepareLevel already ran
    const meta = lvl.parallel;
    if (!meta || !lvl.target) return null;
    const ang = meta.angle || 0;
    const curbSide = meta.curbSide == null ? -1 : meta.curbSide;
    const street = -curbSide;
    const c = Math.cos(ang);
    const s = Math.sin(ang);
    const bh = lvl.target.h || 2;
    const face = localToWorld(
      meta.center.x,
      meta.center.y,
      ang,
      0,
      curbSide * (bh / 2)
    );
    return {
      ox: face.x,
      oy: face.y,
      nx: -street * s,
      ny: street * c,
      ang: ang,
      curbSide: curbSide,
    };
  }

  /** Classify prepared (or base) level into a hint script family. */
  function classifyHintType(lvl) {
    if (!lvl || !lvl.target) return "bay";
    if (lvl.target.exit || lvl.mode === "Drive out") {
      if (lvl.parallel) return "exit-parallel";
      return "exit";
    }
    if (lvl.parallel) return "parallel";
    if (lvl.noseIn) return "noseIn";
    const a = lvl.target.angle;
    if (a != null && Math.abs(Math.abs(a) - Math.PI / 4) < 0.2) return "angle";
    if (a != null && Math.abs(Math.abs(wrapAngle(a)) - Math.PI / 4) < 0.25) return "angle";
    // Perpendicular bay: target roughly ±90°
    if (a != null && Math.abs(Math.abs(wrapAngle(a)) - Math.PI / 2) < 0.35) {
      const spawn = lvl.spawn || { x: lvl.target.x, y: lvl.target.y + 10, angle: 0 };
      const d = Math.abs(wrapAngle(spawn.angle - a));
      const aligned = d < 0.55 || Math.abs(d - Math.PI) < 0.55;
      const toBayX = lvl.target.x - spawn.x;
      const toBayY = lvl.target.y - spawn.y;
      const forwardDot =
        Math.cos(spawn.angle) * toBayX + Math.sin(spawn.angle) * toBayY;
      // Bay ahead + facing bay axis → nose-in; bay behind → reverse-in; else side approach
      if (aligned && forwardDot > 1.5) return "bay-nose";
      if (aligned && forwardDot < -1.5) return "bay-reverse";
      return "bay-reverse";
    }
    return "bay";
  }

  function carBox(x, y, angle, vehicle, label) {
    return {
      x: x,
      y: y,
      w: vehicle.length,
      h: vehicle.width,
      angle: angle,
      label: label,
    };
  }

  function findRowNeighbours(lvl, cx, cy, ang) {
    const c = Math.cos(ang);
    const s = Math.sin(ang);
    const cars = (lvl.obstacles || []).filter(function (o) {
      return o.kind === "car";
    });
    const row = [];
    for (let i = 0; i < cars.length; i++) {
      const o = cars[i];
      const dx = o.x - cx;
      const dy = o.y - cy;
      const along = dx * c + dy * s;
      const lat = -dx * s + dy * c;
      const dAng = Math.abs(wrapAngle(o.angle - ang));
      const aligned = dAng < 0.4 || Math.abs(dAng - Math.PI) < 0.4;
      if (aligned && Math.abs(lat) < 1.8) {
        row.push({ o: o, along: along, lat: lat });
      }
    }
    row.sort(function (a, b) {
      return a.along - b.along;
    });
    const left = row.filter(function (r) {
      return r.along < -0.4;
    }).pop();
    const right = row.filter(function (r) {
      return r.along > 0.4;
    })[0];
    return { left: left && left.o, right: right && right.o, row: row };
  }

  function buildParallelSteps(lvl, vehicle) {
    const meta = lvl.parallel || {};
    const ang = meta.angle != null ? meta.angle : lvl.target.angle || 0;
    const cx = lvl.target.x;
    const cy = lvl.target.y;
    const bw = lvl.target.w;
    const bh = lvl.target.h;
    const curbSide = meta.curbSide == null ? -1 : meta.curbSide;
    const street = -curbSide;
    const curbLine = getCurbLine(lvl);
    const spawn = lvl.spawn || { angle: ang + Math.PI };
    const travelAlong = Math.cos(spawn.angle - ang) >= 0 ? 1 : -1;
    const neigh = findRowNeighbours(lvl, cx, cy, ang);
    const lead =
      travelAlong > 0 ? neigh.right || neigh.left : neigh.left || neigh.right;
    const leadAlong = lead
      ? (lead.x - cx) * Math.cos(ang) + (lead.y - cy) * Math.sin(ang)
      : travelAlong * (bw / 2 + 0.12 + vehicle.length * 0.5);

    // Pull-up stays fully on the street — lateral gap from bay, never over curb
    const latGap = 0.45 + vehicle.width * 0.1;
    const pullLy = street * (bh / 2 + latGap + vehicle.width / 2);
    const pull = localToWorld(cx, cy, ang, leadAlong, pullLy);
    const pullAng = travelAlong > 0 ? ang : ang + Math.PI;

    // Shallower angles so the footprint can stay street-side of a flush curb
    const turnSign = -curbSide * (travelAlong > 0 ? 1 : -1);
    const angleIn = pullAng + turnSign * 0.55; // ~31°
    const angleMid = pullAng + turnSign * 0.28;

    // Keep reverse/straighten centers toward street of bay center
    const a2 = localToWorld(
      cx,
      cy,
      ang,
      travelAlong * (bw * 0.12),
      street * (vehicle.width * 0.22)
    );
    const a3 = localToWorld(
      cx,
      cy,
      ang,
      -travelAlong * (vehicle.length * 0.02),
      street * (vehicle.width * 0.08)
    );

    const steps = [
      carBox(pull.x, pull.y, pullAng, vehicle, "1 · Pull up"),
      carBox(a2.x, a2.y, angleIn, vehicle, "2 · Reverse in"),
      carBox(a3.x, a3.y, angleMid, vehicle, "3 · Straighten"),
      carBox(cx, cy, ang, vehicle, "4 · Finish"),
    ];
    for (let i = 0; i < steps.length; i++) {
      clampBoxToCurb(steps[i], curbLine, 0.05);
    }
    return steps;
  }

  function buildBayReverseSteps(lvl, vehicle) {
    const t = lvl.target;
    const ang = t.angle || -Math.PI / 2;
    const cx = t.x;
    const cy = t.y;
    // Aisle in front of bay mouth (opposite of parked forward)
    const mouth = localToWorld(cx, cy, ang, -(t.w / 2 + vehicle.length * 0.55), 0);
    const align = localToWorld(cx, cy, ang, -(t.w / 2 + vehicle.length * 0.9), vehicle.width * 0.15);
    const swing = localToWorld(cx, cy, ang, -(t.w / 2 + vehicle.length * 0.2), 0);
    const aisleAng = ang + Math.PI; // facing away from bay for reverse-in setup, or ang+PI/2
    // Prefer spawn-like aisle heading
    const spawnAng = (lvl.spawn && lvl.spawn.angle) || ang + Math.PI;
    return [
      carBox(align.x, align.y, spawnAng, vehicle, "1 · Align"),
      carBox(mouth.x, mouth.y, spawnAng, vehicle, "2 · Bay mouth"),
      carBox(swing.x, swing.y, ang + wrapAngle(spawnAng - ang) * 0.35, vehicle, "3 · Reverse in"),
      carBox(cx, cy, ang, vehicle, "4 · Finish"),
    ];
  }

  function buildBayNoseSteps(lvl, vehicle) {
    const t = lvl.target;
    const ang = t.angle || -Math.PI / 2;
    const cx = t.x;
    const cy = t.y;
    const approach = localToWorld(cx, cy, ang, -(t.w / 2 + vehicle.length * 0.85), 0);
    const mouth = localToWorld(cx, cy, ang, -(t.w / 2 + vehicle.length * 0.15), 0);
    return [
      carBox(approach.x, approach.y, ang, vehicle, "1 · Line up"),
      carBox(mouth.x, mouth.y, ang, vehicle, "2 · Enter"),
      carBox(cx, cy, ang, vehicle, "3 · Finish"),
    ];
  }

  function buildNoseInSteps(lvl, vehicle) {
    const t = lvl.target;
    const ang = t.angle || -Math.PI / 2;
    const cx = t.x;
    const cy = t.y;
    const spawn = lvl.spawn || { x: cx + 8, y: cy + 6, angle: Math.PI };
    const aisleAng = spawn.angle;
    // Along aisle before the turn
    const before = {
      x: spawn.x * 0.35 + (cx + Math.cos(aisleAng) * 2) * 0.65,
      y: spawn.y,
    };
    // Turn point near bay mouth in aisle
    const mouth = localToWorld(cx, cy, ang, -(t.w / 2 + 0.4), 0);
    const turning = {
      x: mouth.x + Math.cos(aisleAng) * vehicle.length * 0.2,
      y: (mouth.y + spawn.y) * 0.5,
    };
    const entry = localToWorld(cx, cy, ang, -(t.w / 2 - vehicle.length * 0.15), 0);
    return [
      carBox(before.x, before.y, aisleAng, vehicle, "1 · Aisle"),
      carBox(turning.x, turning.y, aisleAng + wrapAngle(ang - aisleAng) * 0.45, vehicle, "2 · Turn in"),
      carBox(entry.x, entry.y, ang, vehicle, "3 · Nose in"),
      carBox(cx, cy, ang, vehicle, "4 · Finish"),
    ];
  }

  function buildAngleSteps(lvl, vehicle) {
    const t = lvl.target;
    const ang = t.angle || -Math.PI / 4;
    const cx = t.x;
    const cy = t.y;
    const spawnAng = (lvl.spawn && lvl.spawn.angle) || ang + Math.PI;
    const approach = localToWorld(cx, cy, ang, -(t.w / 2 + vehicle.length * 0.9), vehicle.width * 0.4);
    const mouth = localToWorld(cx, cy, ang, -(t.w / 2 + vehicle.length * 0.2), 0);
    return [
      carBox(approach.x, approach.y, spawnAng, vehicle, "1 · Approach"),
      carBox(mouth.x, mouth.y, ang + wrapAngle(spawnAng - ang) * 0.4, vehicle, "2 · Angle in"),
      carBox(cx, cy, ang, vehicle, "3 · Finish"),
    ];
  }

  function buildExitSteps(lvl, vehicle) {
    const spawn = lvl.spawn || { x: 0, y: 0, angle: 0 };
    const t = lvl.target;
    const exit = t.exit
      ? t
      : (lvl.markings && lvl.markings.exitZone) || t;
    const mid = {
      x: (spawn.x + exit.x) / 2,
      y: (spawn.y + exit.y) / 2,
    };
    const leaveAng = Math.atan2(exit.y - spawn.y, exit.x - spawn.x);
    const clear = localToWorld(spawn.x, spawn.y, spawn.angle, vehicle.length * 0.35, 0);
    const swing = {
      x: spawn.x + Math.cos(leaveAng) * vehicle.length * 0.9,
      y: spawn.y + Math.sin(leaveAng) * vehicle.length * 0.9,
    };
    return [
      carBox(clear.x, clear.y, spawn.angle + 0.35, vehicle, "1 · Angle out"),
      carBox(swing.x, swing.y, leaveAng, vehicle, "2 · Clear bay"),
      carBox(exit.x, exit.y, leaveAng, vehicle, "3 · Exit zone"),
    ];
  }

  function buildExitParallelSteps(lvl, vehicle) {
    const meta = lvl.parallel || {};
    const ang = meta.angle != null ? meta.angle : (lvl.spawn && lvl.spawn.angle) || 0;
    const cx = (lvl.spawn && lvl.spawn.x) || lvl.target.x;
    const cy = (lvl.spawn && lvl.spawn.y) || lvl.target.y;
    const curbSide = meta.curbSide == null ? -1 : meta.curbSide;
    const street = -curbSide;
    const curbLine = getCurbLine(lvl);
    const bh =
      (lvl.target && !lvl.target.exit ? lvl.target.h : null) ||
      vehicle.width * 1.1;
    // Ease back in-bay (street of curb), then angle out toward street, then exit
    const back = localToWorld(cx, cy, ang, -vehicle.length * 0.15, street * 0.05);
    const swing = localToWorld(
      cx,
      cy,
      ang,
      vehicle.length * 0.2,
      street * (bh / 2 + vehicle.width * 0.55)
    );
    const t = lvl.target;
    const leaveAng = Math.atan2(t.y - cy, t.x - cx);
    const steps = [
      carBox(back.x, back.y, ang, vehicle, "1 · Ease back"),
      carBox(swing.x, swing.y, ang + street * 0.55, vehicle, "2 · Angle out"),
      carBox(t.x, t.y, leaveAng, vehicle, "3 · Exit zone"),
    ];
    // Only clamp in-bay steps; exit zone is away from curb
    clampBoxToCurb(steps[0], curbLine, 0.05);
    clampBoxToCurb(steps[1], curbLine, 0.05);
    return steps;
  }

  /**
   * Build ordered hint steps for a prepared level + vehicle.
   * Each step: { x, y, w, h, angle, label }
   */
  function buildHintSteps(lvl, vehicle) {
    const type = classifyHintType(lvl);
    let steps;
    switch (type) {
      case "parallel":
        steps = buildParallelSteps(lvl, vehicle);
        break;
      case "noseIn":
        steps = buildNoseInSteps(lvl, vehicle);
        break;
      case "angle":
        steps = buildAngleSteps(lvl, vehicle);
        break;
      case "bay-nose":
        steps = buildBayNoseSteps(lvl, vehicle);
        break;
      case "bay-reverse":
      case "bay":
        steps = buildBayReverseSteps(lvl, vehicle);
        break;
      case "exit-parallel":
        steps = buildExitParallelSteps(lvl, vehicle);
        break;
      case "exit":
      default:
        steps = buildExitSteps(lvl, vehicle);
        break;
    }
    return { type: type, steps: steps };
  }

  /** True if car roughly matches a step box (center + heading). */
  function carMatchesHintStep(car, step, opts) {
    opts = opts || {};
    const posTol = opts.posTol != null ? opts.posTol : Math.max(1.1, car.length * 0.28);
    const angTol = opts.angTol != null ? opts.angTol : 0.45;
    const dx = car.x - step.x;
    const dy = car.y - step.y;
    if (Math.hypot(dx, dy) > posTol) return false;
    const d = Math.abs(wrapAngle(car.angle - step.angle));
    const dFlip = Math.abs(wrapAngle(car.angle - step.angle - Math.PI));
    // Final / finish steps: allow either facing for parallel-style
    const allowFlip = opts.allowFlip || /finish|exit zone/i.test(step.label || "");
    if (allowFlip) return Math.min(d, dFlip) <= angTol;
    return d <= angTol;
  }

  window.ParkHints = {
    classifyHintType: classifyHintType,
    buildHintSteps: buildHintSteps,
    carMatchesHintStep: carMatchesHintStep,
    clampBoxToCurb: clampBoxToCurb,
    getCurbLine: getCurbLine,
  };
})();

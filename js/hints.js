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

  function isGuidedParallel(lvl) {
    return !!(lvl && lvl.id === "parallel-in");
  }

  function buildParallelSteps(lvl, vehicle) {
    const guided = isGuidedParallel(lvl);
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
    const latGap = guided ? 0.55 + vehicle.width * 0.12 : 0.45 + vehicle.width * 0.1;
    const pullLy = street * (bh / 2 + latGap + vehicle.width / 2);
    // Guided: stop a bit past the lead car so reverse-in has a clear swing
    const pullAlong = guided
      ? leadAlong + travelAlong * vehicle.length * 0.08
      : leadAlong;
    const pull = localToWorld(cx, cy, ang, pullAlong, pullLy);
    const pullAng = travelAlong > 0 ? ang : ang + Math.PI;

    const turnSign = -curbSide * (travelAlong > 0 ? 1 : -1);
    const angleIn = pullAng + turnSign * (guided ? 0.62 : 0.55);
    const angleMid = pullAng + turnSign * (guided ? 0.32 : 0.28);

    const a2 = localToWorld(
      cx,
      cy,
      ang,
      travelAlong * (bw * (guided ? 0.08 : 0.12)),
      street * (vehicle.width * (guided ? 0.28 : 0.22))
    );
    const a3 = localToWorld(
      cx,
      cy,
      ang,
      -travelAlong * (vehicle.length * 0.02),
      street * (vehicle.width * 0.08)
    );

    const curbSteer = turnSign > 0 ? "right" : "left";
    const unwindSteer = turnSign > 0 ? "left" : "right";

    const steps = [
      carBox(pull.x, pull.y, pullAng, vehicle, "1 · Pull up"),
      carBox(a2.x, a2.y, angleIn, vehicle, "2 · Reverse in"),
      carBox(a3.x, a3.y, angleMid, vehicle, "3 · Straighten"),
      carBox(cx, cy, ang, vehicle, "4 · Finish"),
    ];
    steps[0].drive = "forward";
    steps[0].steerPref = "center";
    steps[0].coach = "Drive forward and stop next to the gap (blue box).";
    steps[1].drive = "reverse";
    steps[1].steerPref = curbSteer;
    steps[1].coach =
      "Reverse slowly · steer " + curbSteer.toUpperCase() + " into the bay.";
    steps[2].drive = "reverse";
    steps[2].steerPref = unwindSteer;
    steps[2].coach =
      "Keep reversing · straighten (steer " + unwindSteer.toUpperCase() + ").";
    steps[3].drive = "creep";
    steps[3].steerPref = "center";
    steps[3].coach = "Creep into the bay · stop when aligned with the curb.";
    steps[0].turnSign = turnSign;
    steps[1].turnSign = turnSign;
    steps[2].turnSign = turnSign;
    steps[3].turnSign = turnSign;
    for (let i = 0; i < steps.length; i++) {
      clampBoxToCurb(steps[i], curbLine, 0.05);
      steps[i].guided = guided;
    }
    return steps;
  }

  /** Match tolerances — forgiving early, tighter late (guided level 1). */
  function stepMatchOpts(step, index, total) {
    const guided = step && step.guided;
    if (!guided) {
      return {
        posTol: null,
        angTol: null,
        hold: 0.4,
        allowFlip: index >= total - 1,
      };
    }
    if (index === 0) {
      return { posTol: 2.1, angTol: 0.75, hold: 0.22, allowFlip: false };
    }
    if (index === 1) {
      return { posTol: 1.7, angTol: 0.6, hold: 0.28, allowFlip: false };
    }
    if (index === 2) {
      return { posTol: 1.35, angTol: 0.42, hold: 0.32, allowFlip: false };
    }
    return { posTol: 1.15, angTol: 0.38, hold: 0.5, allowFlip: true };
  }

  /**
   * Live coaching for guided parallel (level 1).
   * Returns { text, status: 'ok'|'do'|'fix', steer, drive } or null.
   */
  function liveCoach(car, lvl, steps, index) {
    if (!isGuidedParallel(lvl) || !car || !steps || !steps.length) return null;
    const step = steps[Math.min(index, steps.length - 1)];
    if (!step) return null;
    const dx = step.x - car.x;
    const dy = step.y - car.y;
    const dist = Math.hypot(dx, dy);
    const along =
      dx * Math.cos(car.angle) + dy * Math.sin(car.angle);
    const angErr = wrapAngle(step.angle - car.angle);
    const absErr = Math.abs(angErr);
    const reversing = car.speed < -0.08;
    const goingFwd = car.speed > 0.08;
    const stopped = Math.abs(car.speed) < 0.08;

    // Steer advice: forward → positive angErr needs RIGHT; reverse flips
    function steerForAng(err, inReverse) {
      if (Math.abs(err) < 0.12) return "center";
      const wantCcw = err > 0;
      if (inReverse) return wantCcw ? "left" : "right";
      return wantCcw ? "right" : "left";
    }

    const pref = step.steerPref || "center";
    const wantRev =
      step.drive === "reverse" || (step.drive === "creep" && along < -0.15);
    const wantFwd = step.drive === "forward" || (step.drive === "creep" && along > 0.25);
    const inReverseIntent = wantRev || reversing;
    let steer = steerForAng(angErr, inReverseIntent);
    if (absErr < 0.14 && pref !== "center") {
      // Prefer scripted curb/unwind when nearly on heading
      steer = pref;
    } else if (absErr < 0.14) {
      steer = "center";
    }

    const matched = carMatchesHintStep(car, step, stepMatchOpts(step, index, steps.length));

    let text;
    let status = "do";
    let drive = wantRev ? "reverse" : wantFwd ? "forward" : "stop";

    if (index === 0) {
      if (matched && (stopped || Math.abs(car.speed) < 0.45)) {
        text = "On track — stop here, then reverse into the bay.";
        status = "ok";
        drive = "stop";
        steer = "center";
      } else if (dist > 3.2) {
        text =
          "Drive forward toward the blue pull-up box" +
          (steer === "left"
            ? " · nudge LEFT"
            : steer === "right"
              ? " · nudge RIGHT"
              : "") +
          ".";
        drive = "forward";
      } else if (!stopped && goingFwd && dist < 1.8) {
        text = "Close enough — brake and stop alongside the gap.";
        drive = "stop";
        status = "ok";
      } else if (along < -1.2) {
        text = "You passed it — reverse a little, then stop at the box.";
        drive = "reverse";
        status = "fix";
      } else {
        text = "Line up with the blue box and stop.";
        drive = Math.abs(along) < 0.4 ? "stop" : along > 0 ? "forward" : "reverse";
      }
    } else if (index === 1) {
      if (matched) {
        text = "Good angle — keep reversing slowly into the bay.";
        status = "ok";
        drive = "reverse";
      } else if (goingFwd) {
        text = "Stop and reverse · steer " + (pref || steer).toUpperCase() + " toward the curb.";
        drive = "reverse";
        status = "fix";
        steer = pref || steer;
      } else {
        const s = pref || steer;
        text =
          (reversing ? "Keep reversing" : "Reverse now") +
          " · steer " +
          s.toUpperCase() +
          " into the blue box.";
        drive = "reverse";
        steer = s;
        if (dist < 1.6 && absErr < 0.55) status = "ok";
      }
    } else if (index === 2) {
      if (matched) {
        text = "On track — almost straight. Ease back to the finish box.";
        status = "ok";
        drive = "reverse";
        steer = "center";
      } else if (goingFwd && dist > 1.2) {
        text = "Too far forward — reverse and straighten the wheel.";
        drive = "reverse";
        status = "fix";
        steer = pref || steer;
      } else {
        const s = absErr > 0.18 ? steer : pref || "center";
        text =
          (reversing || wantRev ? "Keep reversing" : "Reverse") +
          (s === "center"
            ? " · wheels straight."
            : " · steer " + s.toUpperCase() + " to straighten.");
        drive = "reverse";
        steer = s;
        if (absErr < 0.25 && dist < 1.8) status = "ok";
      }
    } else {
      // Finish
      if (matched && stopped) {
        text = "On track — hold still to finish.";
        status = "ok";
        drive = "stop";
        steer = "center";
      } else if (dist < 0.85 && absErr < 0.35) {
        text = "Close enough — stop when the car is in the bay.";
        status = "ok";
        drive = "stop";
      } else if (along > 0.35) {
        text = "Creep FORWARD a little · center in the bay.";
        drive = "forward";
      } else if (along < -0.35) {
        text = "Creep REVERSE a little · center in the bay.";
        drive = "reverse";
      } else if (absErr > 0.22) {
        text =
          "Straighten · steer " +
          steer.toUpperCase() +
          " while creeping.";
        drive = "creep";
      } else {
        text = "Center on the finish box and stop.";
        drive = "stop";
        status = "ok";
      }
    }

    return {
      text: text,
      status: status,
      steer: steer,
      drive: drive,
      dist: dist,
      matched: matched,
    };
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
    const guided = type === "parallel" && isGuidedParallel(lvl);
    return { type: type, steps: steps, guided: guided };
  }


  function lerpAngle(a, b, t) {
    return a + wrapAngle(b - a) * t;
  }

  function poseClearsCurb(x, y, angle, vehicle, curbLine, pad) {
    if (!curbLine) return true;
    pad = pad != null ? pad : 0.05;
    const corners = obbCorners(x, y, vehicle.length, vehicle.width, angle);
    for (let i = 0; i < corners.length; i++) {
      const p = corners[i];
      const d =
        (p.x - curbLine.ox) * curbLine.nx + (p.y - curbLine.oy) * curbLine.ny;
      if (d < pad) return false;
    }
    return true;
  }

  function projectObbAxis(corners, ax, ay) {
    let min = Infinity;
    let max = -Infinity;
    for (let i = 0; i < corners.length; i++) {
      const v = corners[i].x * ax + corners[i].y * ay;
      if (v < min) min = v;
      if (v > max) max = v;
    }
    return { min: min, max: max };
  }

  /** True if two OBBs overlap (SAT). margin inflates the obstacle. */
  function obbOverlap(ax, ay, aLen, aW, aAng, bx, by, bLen, bW, bAng, margin) {
    margin = margin || 0;
    const ca = obbCorners(ax, ay, aLen, aW, aAng);
    const cb = obbCorners(bx, by, bLen + margin * 2, bW + margin * 2, bAng);
    const axes = [];
    for (let pair = 0; pair < 2; pair++) {
      const corners = pair === 0 ? ca : cb;
      for (let i = 0; i < 4; i++) {
        const p = corners[i];
        const q = corners[(i + 1) % 4];
        const ex = q.x - p.x;
        const ey = q.y - p.y;
        const len = Math.hypot(ex, ey) || 1;
        axes.push({ x: -ey / len, y: ex / len });
      }
    }
    for (let i = 0; i < axes.length; i++) {
      const axis = axes[i];
      const pa = projectObbAxis(ca, axis.x, axis.y);
      const pb = projectObbAxis(cb, axis.x, axis.y);
      if (Math.min(pa.max, pb.max) - Math.max(pa.min, pb.min) <= 0) return false;
    }
    return true;
  }

  /** Collect parked cars from level obstacles. */
  function levelParkedCars(lvl) {
    return (lvl.obstacles || []).filter(function (o) {
      return o && o.kind === "car";
    });
  }

  /**
   * Ghost footprint must not overlap parked cars (with clearance margin).
   * Used by the L1 demo path so reverse-in clears the trailing neighbour.
   */
  function poseClearsCars(x, y, angle, vehicle, cars, margin) {
    if (!cars || !cars.length) return true;
    margin = margin != null ? margin : 0.12;
    for (let i = 0; i < cars.length; i++) {
      const o = cars[i];
      const oLen = o.length != null ? o.length : o.w;
      const oW = o.width != null ? o.width : o.h;
      if (
        obbOverlap(
          x,
          y,
          vehicle.length,
          vehicle.width,
          angle,
          o.x,
          o.y,
          oLen,
          oW,
          o.angle || 0,
          margin
        )
      ) {
        return false;
      }
    }
    return true;
  }

  function poseClearsDemo(x, y, angle, vehicle, curbLine, cars, carMargin) {
    return (
      poseClearsCurb(x, y, angle, vehicle, curbLine, 0.05) &&
      poseClearsCars(x, y, angle, vehicle, cars, carMargin)
    );
  }

  /**
   * Bicycle-model integration: velocity only along heading (no sideways slide).
   * Rejects steps that hit the curb or (when cars given) parked-car OBBs.
   */
  function integrateBicycle(state, speed, steer, dt, vehicle, curbLine, cars, carMargin) {
    const wb = vehicle.wheelbase || vehicle.length * 0.62;
    const maxSteer = vehicle.steerAngle != null ? vehicle.steerAngle : 0.6;
    if (steer > maxSteer) steer = maxSteer;
    if (steer < -maxSteer) steer = -maxSteer;
    function tryPose(nx, ny, nAngle) {
      return poseClearsDemo(nx, ny, nAngle, vehicle, curbLine, cars, carMargin);
    }
    let angle = state.angle;
    if (Math.abs(speed) > 0.001 && Math.abs(steer) > 0.0005) {
      angle += ((speed * Math.tan(steer)) / wb) * dt;
    }
    const nx = state.x + Math.cos(angle) * speed * dt;
    const ny = state.y + Math.sin(angle) * speed * dt;
    if (!tryPose(nx, ny, angle)) {
      // Try same motion with less steer (stay street-side / clear neighbours)
      const steer2 = steer * 0.35;
      let angle2 = state.angle;
      if (Math.abs(speed) > 0.001 && Math.abs(steer2) > 0.0005) {
        angle2 += ((speed * Math.tan(steer2)) / wb) * dt;
      }
      const nx2 = state.x + Math.cos(angle2) * speed * dt;
      const ny2 = state.y + Math.sin(angle2) * speed * dt;
      if (tryPose(nx2, ny2, angle2)) {
        state.x = nx2;
        state.y = ny2;
        state.angle = angle2;
        return true;
      }
      // Roll straight along heading only
      const nx3 = state.x + Math.cos(state.angle) * speed * dt;
      const ny3 = state.y + Math.sin(state.angle) * speed * dt;
      if (tryPose(nx3, ny3, state.angle)) {
        state.x = nx3;
        state.y = ny3;
        return true;
      }
      return false;
    }
    state.x = nx;
    state.y = ny;
    state.angle = angle;
    return true;
  }

  /** Steer toward a world heading; flips for reverse (bicycle). */
  function steerTowardHeading(angle, targetAngle, reversing, maxSteer) {
    const err = wrapAngle(targetAngle - angle);
    // Forward: +steer → +dAngle; reverse: +steer → -dAngle
    const raw = reversing ? -err * 2.2 : err * 2.2;
    if (raw > maxSteer) return maxSteer;
    if (raw < -maxSteer) return -maxSteer;
    return raw;
  }

  /** Pure-pursuit-ish steer toward a point while driving forward or reverse. */
  function steerTowardPoint(state, tx, ty, reversing, maxSteer) {
    const desired = Math.atan2(ty - state.y, tx - state.x);
    // When reversing, the rear aims at the point → face opposite of travel-to-point
    const face = reversing ? desired + Math.PI : desired;
    return steerTowardHeading(state.angle, face, reversing, maxSteer);
  }

  /**
   * Level-1 parallel-in demo via bicycle-model poses (no sideways lerp/slide).
   * OBB+margin vs parked cars (esp. trailing neighbour); curb street-side; real S-curve.
   */
  function buildParallelInDemoPath(lvl, vehicle) {
    const steps = buildParallelSteps(lvl, vehicle);
    const spawn =
      lvl.spawn || { x: steps[0].x, y: steps[0].y, angle: steps[0].angle };
    const curbLine = getCurbLine(lvl);
    const parked = levelParkedCars(lvl);
    const carMargin = 0.12;
    const pull = {
      x: steps[0].x,
      y: steps[0].y,
      angle: steps[0].angle,
    };
    // Long / low-steer: start S a bit closer to the bay so reverse can finish deeper
    // without needing a wide swing that clips the trailing neighbour.
    if ((vehicle.length || 4.6) >= 6.2 && curbLine) {
      const nudge = 0.95;
      const ny = pull.y - curbLine.ny * nudge;
      const nx = pull.x - curbLine.nx * nudge;
      if (
        poseClearsDemo(
          nx,
          ny,
          pull.angle,
          vehicle,
          curbLine,
          parked,
          carMargin
        )
      ) {
        pull.x = nx;
        pull.y = ny;
      }
    }
    const fin = { x: lvl.target.x, y: lvl.target.y };
    const maxSteer = vehicle.steerAngle != null ? vehicle.steerAngle : 0.6;
    const dt = 1 / 30;
    const poses = [];
    const state = { x: spawn.x, y: spawn.y, angle: spawn.angle };
    const turnSign = steps[0].turnSign != null ? steps[0].turnSign : -1;
    const len = vehicle.length || 4.6;
    // Deeper swing for short cars; long/low-steer stay shallower to clear trailer
    const angMag = Math.max(0.48, Math.min(0.65, 0.82 - 0.04 * len));
    const clearN = Math.max(22, Math.min(40, Math.round(14 + len * 2.2)));
    const holdN = Math.max(6, Math.min(16, Math.round(20 - len)));
    const strN = Math.max(36, Math.min(80, Math.round(28 + len * 4)));
    const angleIn = pull.angle + turnSign * angMag;
    const finishAng = pull.angle;
    const angleInSteer = turnSign > 0 ? -maxSteer : maxSteer;
    const straightenSteer = -angleInSteer;
    const revX = -Math.cos(pull.angle);
    const revY = -Math.sin(pull.angle);
    // Street-side unit (away from curb along curb normal)
    const streetNx = curbLine ? curbLine.nx : 0;
    const streetNy = curbLine ? curbLine.ny : 1;

    function pastBayCenter(s) {
      return (s.x - fin.x) * revX + (s.y - fin.y) * revY;
    }
    function latToFin(s) {
      // positive = more street-side than finish
      return (s.x - fin.x) * streetNx + (s.y - fin.y) * streetNy;
    }

    let recordSkip = 0;
    function record(force) {
      if (!force && recordSkip++ % 2 === 1 && poses.length > 0) return;
      poses.push({ x: state.x, y: state.y, angle: state.angle });
    }
    function hold(n) {
      for (let i = 0; i < n; i++) record(true);
    }
    function drive(speed, steerFn, stepsMax, doneFn) {
      let stalled = 0;
      for (let i = 0; i < stepsMax; i++) {
        const before = { x: state.x, y: state.y, angle: state.angle };
        const steer = typeof steerFn === "number" ? steerFn : steerFn(state, i);
        const ok = integrateBicycle(
          state,
          speed,
          steer,
          dt,
          vehicle,
          curbLine,
          parked,
          carMargin
        );
        if (!ok) {
          if (
            !integrateBicycle(
              state,
              speed * 0.45,
              steer,
              dt,
              vehicle,
              curbLine,
              parked,
              carMargin
            )
          ) {
            stalled++;
            if (stalled > 5) break;
            continue;
          }
        } else {
          stalled = 0;
        }
        if (
          Math.hypot(state.x - before.x, state.y - before.y) > 1e-6 ||
          Math.abs(wrapAngle(state.angle - before.angle)) > 1e-5
        ) {
          record(false);
        }
        if (doneFn && doneFn(state, i)) break;
      }
      return stalled > 5;
    }

    record(true);

    // 1) Forward to pull-up
    drive(
      3.8,
      function (s) {
        return steerTowardPoint(s, pull.x, pull.y, false, maxSteer);
      },
      260,
      function (s) {
        return Math.hypot(s.x - pull.x, s.y - pull.y) < 1.05;
      }
    );
    drive(
      1.15,
      function (s) {
        return steerTowardHeading(s.angle, pull.angle, false, maxSteer * 0.8);
      },
      90,
      function (s) {
        return Math.hypot(s.x - pull.x, s.y - pull.y) < 0.32;
      }
    );
    drive(
      0.7,
      function (s) {
        return steerTowardHeading(s.angle, pull.angle, false, maxSteer * 0.9);
      },
      40,
      function (s) {
        return Math.abs(wrapAngle(s.angle - pull.angle)) < 0.05;
      }
    );
    hold(8);

    // 2) Reverse clear of the lead (front) car
    drive(-1.65, 0, clearN, null);

    // 3) Angle-in toward curb — OBB rejects any pose that clips the trailing car
    drive(
      -2.0,
      angleInSteer,
      110,
      function (s) {
        return Math.abs(wrapAngle(s.angle - angleIn)) < 0.07;
      }
    );

    // 4) Brief hold while still reverse
    drive(-1.7, 0, holdN, function (s) {
      return pastBayCenter(s) > -0.5;
    });

    // 5) Counter-steer straighten; hard-stop before bay center so rear stays off trailer
    let blocked = drive(
      -1.45,
      straightenSteer,
      strN,
      function (s) {
        if (Math.abs(wrapAngle(s.angle - finishAng)) < 0.1) return true;
        if (pastBayCenter(s) > 0.28) return true;
        return false;
      }
    );

    // 6–7) Multi-point: if still angled/high, forward with angle-in steer
    // (straightens toward finish without diving into trailer), then shallow reverse bite.
    // Repeat up to 3 times for long / low-steer vehicles.
    const cycles = len >= 5.5 ? 3 : len >= 4.8 ? 2 : 1;
    for (let cyc = 0; cyc < cycles; cyc++) {
      const dist = Math.hypot(state.x - fin.x, state.y - fin.y);
      const angErr = Math.abs(wrapAngle(state.angle - finishAng));
      const lat = latToFin(state);
      if (dist < 0.85 && angErr < 0.14 && lat < 1.05) break;

      // Forward: angle-in steer while going forward turns nose back toward street/finish
      // and slides the rear away from the trailing neighbour.
      if (angErr > 0.1 || blocked || lat > 1.1) {
        blocked = drive(
          1.25,
          angleInSteer,
          48,
          function (s) {
            return Math.abs(wrapAngle(s.angle - finishAng)) < 0.1;
          }
        );
        // Nudge a little street-side if still overlapping the reverse corridor
        if (pastBayCenter(state) > 0.15) {
          drive(
            1.0,
            function (s) {
              return steerTowardHeading(s.angle, finishAng, false, maxSteer * 0.7);
            },
            18,
            function (s) {
              return pastBayCenter(s) < 0.05;
            }
          );
        }
      }

      // Shallow reverse bite toward curb, then straighten — stop before trailer
      const biteAng = finishAng + turnSign * Math.max(0.22, angMag * 0.55);
      drive(
        -1.55,
        function (s) {
          return steerTowardHeading(s.angle, biteAng, true, maxSteer);
        },
        42,
        function (s) {
          return (
            Math.abs(wrapAngle(s.angle - biteAng)) < 0.08 ||
            pastBayCenter(s) > 0.2
          );
        }
      );
      blocked = drive(
        -1.3,
        straightenSteer,
        50,
        function (s) {
          if (Math.abs(wrapAngle(s.angle - finishAng)) < 0.1) return true;
          if (pastBayCenter(s) > 0.3) return true;
          return false;
        }
      );
    }

    // Final forward straighten if still cocked
    if (Math.abs(wrapAngle(state.angle - finishAng)) > 0.12) {
      drive(
        1.15,
        function (s) {
          return steerTowardHeading(s.angle, finishAng, false, maxSteer);
        },
        40,
        function (s) {
          return Math.abs(wrapAngle(s.angle - finishAng)) < 0.1;
        }
      );
    }

    // 8) Creep along bay axis; never reverse past center into trailing car
    for (let k = 0; k < 180; k++) {
      const dx = fin.x - state.x;
      const dy = fin.y - state.y;
      const dist = Math.hypot(dx, dy);
      const angErr = Math.abs(wrapAngle(state.angle - finishAng));
      if (dist < 0.3 && angErr < 0.12) break;
      const along = dx * Math.cos(state.angle) + dy * Math.sin(state.angle);
      const past = pastBayCenter(state);
      const lat = latToFin(state);
      let speed = 0;
      // Prefer reverse only while still short of bay center
      if (along < -0.05 && past < 0.28) speed = -1.05;
      else if (along > 0.05 && past > -0.5) speed = 0.95;
      else if (lat > 0.9 && past < 0.15) {
        // still street-high: tiny reverse with slight curb bite
        speed = -0.7;
      } else if (angErr > 0.12 && past < 0.15) speed = -0.35;
      if (speed === 0) {
        if (angErr < 0.12 || dist < 1.0) break;
        speed = past > 0.25 ? 0.4 : -0.25;
      }
      if (speed < 0 && past > 0.32) {
        if (dist < 1.15) break;
        speed = 0.45;
      }
      let steer = steerTowardHeading(
        state.angle,
        finishAng,
        speed < 0,
        maxSteer * 0.4
      );
      // Soft curb-ward bias while reversing if still high (bicycle only — small steer)
      if (speed < 0 && lat > 0.85 && angErr < 0.35) {
        steer = angleInSteer * 0.35 + steer * 0.65;
      }
      const before = { x: state.x, y: state.y };
      const moved = integrateBicycle(
        state,
        speed,
        steer,
        dt,
        vehicle,
        curbLine,
        parked,
        carMargin
      );
      if (moved && Math.hypot(state.x - before.x, state.y - before.y) > 1e-6) {
        record(false);
      } else {
        // If reverse blocked by trailer OBB, try a short forward instead of stalling
        if (speed < 0) {
          const fwd = integrateBicycle(
            state,
            0.55,
            steerTowardHeading(state.angle, finishAng, false, maxSteer * 0.5),
            dt,
            vehicle,
            curbLine,
            parked,
            carMargin
          );
          if (fwd) record(false);
          else break;
        } else {
          break;
        }
      }
    }
    hold(12);

    const duration = Math.max(7, Math.min(12, poses.length / 30));
    return {
      id: lvl.id,
      poses: poses,
      duration: duration,
      label: "Parallel park demo",
    };
  }

  /** Demo path for a level — L1 only; others return empty placeholder. */
  function buildDemoPath(lvl, vehicle) {
    if (!lvl || !vehicle) {
      return { id: null, poses: [], duration: 0, label: "" };
    }
    if (lvl.id === "parallel-in") {
      return buildParallelInDemoPath(lvl, vehicle);
    }
    // Placeholders / no-ops for every other level
    return {
      id: lvl.id || null,
      poses: [],
      duration: 0,
      label: "",
    };
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
    isGuidedParallel: isGuidedParallel,
    stepMatchOpts: stepMatchOpts,
    liveCoach: liveCoach,
    buildDemoPath: buildDemoPath,
  };
})();

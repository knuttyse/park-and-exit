/**
 * Level layouts in world units. Origin is top-left of the lot.
 * Cars face +X when angle = 0 (radians, CCW from +X).
 * Target bay: { x, y, w, h, angle } — center + size + desired heading.
 */
window.PARK_LEVELS = [
  {
    id: "parallel-in",
    name: "1 · Parallel park",
    mode: "Park in",
    short: "Slide into the curb-side parallel bay between two cars.",
    tip: "Pull past the gap, reverse, then straighten. Use small steering corrections.",
    worldW: 42,
    worldH: 26,
    walls: [
      // Outer curb / lot boundary (thick rectangles as obstacles)
      { x: 21, y: -0.4, w: 42, h: 0.8 },
      { x: 21, y: 26.4, w: 42, h: 0.8 },
      { x: -0.4, y: 13, w: 0.8, h: 26 },
      { x: 42.4, y: 13, w: 0.8, h: 26 },
      // Curb along parking row
      { x: 21, y: 4.2, w: 42, h: 0.35 },
    ],
    markings: {
      // Parallel bay painted box
      bays: [{ x: 18, y: 6.6, w: 6.2, h: 2.4, angle: 0 }],
      lines: [
        // Road center dashed feel — drawn as segments in renderer via bay guides
      ],
      arrows: [{ x: 30, y: 14, angle: Math.PI, label: false }],
    },
    obstacles: [
      // Parked cars framing the gap
      { kind: "car", x: 11.2, y: 6.6, angle: 0, length: 4.5, width: 1.8, color: "#64748b" },
      { kind: "car", x: 24.8, y: 6.6, angle: 0, length: 4.5, width: 1.8, color: "#475569" },
      { kind: "car", x: 8, y: 20, angle: 0, length: 4.4, width: 1.75, color: "#334155" },
      { kind: "car", x: 14, y: 20, angle: 0, length: 4.3, width: 1.75, color: "#3f4f63" },
      { kind: "car", x: 28, y: 20, angle: 0, length: 4.6, width: 1.8, color: "#526077" },
    ],
    spawn: { x: 34, y: 14, angle: Math.PI }, // facing left, approaching the spot
    target: { x: 18, y: 6.6, w: 6.0, h: 2.35, angle: 0, angleTol: 0.22, speedMax: 0.55 },
    maxBumps: 8,
  },
  {
    id: "bay-reverse",
    name: "2 · Reverse into bay",
    mode: "Park in",
    short: "Back into a perpendicular bay between two parked cars.",
    tip: "Line up, reverse slowly, and straighten once the rear is in the bay.",
    worldW: 36,
    worldH: 28,
    walls: [
      { x: 18, y: -0.4, w: 36, h: 0.8 },
      { x: 18, y: 28.4, w: 36, h: 0.8 },
      { x: -0.4, y: 14, w: 0.8, h: 28 },
      { x: 36.4, y: 14, w: 0.8, h: 28 },
      // Back wall of bays
      { x: 18, y: 1.2, w: 22, h: 0.4 },
    ],
    markings: {
      bays: [
        { x: 10, y: 5.5, w: 5.2, h: 2.6, angle: -Math.PI / 2 },
        { x: 14, y: 5.5, w: 5.2, h: 2.6, angle: -Math.PI / 2 },
        { x: 18, y: 5.5, w: 5.2, h: 2.6, angle: -Math.PI / 2 }, // target visual
        { x: 22, y: 5.5, w: 5.2, h: 2.6, angle: -Math.PI / 2 },
        { x: 26, y: 5.5, w: 5.2, h: 2.6, angle: -Math.PI / 2 },
      ],
    },
    obstacles: [
      { kind: "car", x: 14, y: 5.4, angle: -Math.PI / 2, length: 4.5, width: 1.8, color: "#64748b" },
      { kind: "car", x: 22, y: 5.4, angle: -Math.PI / 2, length: 4.5, width: 1.8, color: "#475569" },
      { kind: "car", x: 10, y: 5.4, angle: -Math.PI / 2, length: 4.4, width: 1.75, color: "#334155" },
      { kind: "car", x: 26, y: 5.4, angle: -Math.PI / 2, length: 4.4, width: 1.75, color: "#3f4f63" },
      { kind: "car", x: 6, y: 20, angle: 0, length: 4.5, width: 1.8, color: "#526077" },
      { kind: "car", x: 30, y: 22, angle: Math.PI, length: 4.5, width: 1.8, color: "#5b6b80" },
    ],
    spawn: { x: 18, y: 20, angle: -Math.PI / 2 }, // facing up toward bays? Wait - angle 0 = +X. Facing toward bays (up = -Y) means angle = -PI/2
    target: { x: 18, y: 5.5, w: 5.0, h: 2.5, angle: -Math.PI / 2, angleTol: 0.2, speedMax: 0.55 },
    maxBumps: 8,
  },
  {
    id: "parallel-out",
    name: "3 · Exit parallel spot",
    mode: "Drive out",
    short: "Leave a tight parallel bay without clipping neighbours.",
    tip: "Reverse a little with right steer, then pull forward clear of the cars.",
    worldW: 42,
    worldH: 26,
    walls: [
      { x: 21, y: -0.4, w: 42, h: 0.8 },
      { x: 21, y: 26.4, w: 42, h: 0.8 },
      { x: -0.4, y: 13, w: 0.8, h: 26 },
      { x: 42.4, y: 13, w: 0.8, h: 26 },
      { x: 21, y: 4.2, w: 42, h: 0.35 },
    ],
    markings: {
      bays: [{ x: 18, y: 6.6, w: 6.2, h: 2.4, angle: 0 }],
      exitZone: { x: 30, y: 15, w: 10, h: 6, angle: 0 },
    },
    obstacles: [
      { kind: "car", x: 11.2, y: 6.6, angle: 0, length: 4.5, width: 1.8, color: "#64748b" },
      { kind: "car", x: 24.8, y: 6.6, angle: 0, length: 4.5, width: 1.8, color: "#475569" },
      { kind: "car", x: 8, y: 20, angle: 0, length: 4.4, width: 1.75, color: "#334155" },
      { kind: "car", x: 28, y: 20, angle: 0, length: 4.6, width: 1.8, color: "#526077" },
    ],
    spawn: { x: 18, y: 6.6, angle: 0 },
    // Success: reach exit zone nearly stopped-ish OR just mostly inside and slow
    target: { x: 30, y: 15, w: 10, h: 6, angle: null, angleTol: Math.PI, speedMax: 2.5, exit: true },
    maxBumps: 8,
  },
  {
    id: "bay-out",
    name: "4 · Exit bay",
    mode: "Drive out",
    short: "Drive out of a bay squeezed between two cars.",
    tip: "Creep forward, straighten in the aisle, then clear the exit zone.",
    worldW: 36,
    worldH: 28,
    walls: [
      { x: 18, y: -0.4, w: 36, h: 0.8 },
      { x: 18, y: 28.4, w: 36, h: 0.8 },
      { x: -0.4, y: 14, w: 0.8, h: 28 },
      { x: 36.4, y: 14, w: 0.8, h: 28 },
      { x: 18, y: 1.2, w: 22, h: 0.4 },
    ],
    markings: {
      bays: [
        { x: 14, y: 5.5, w: 5.2, h: 2.6, angle: -Math.PI / 2 },
        { x: 18, y: 5.5, w: 5.2, h: 2.6, angle: -Math.PI / 2 },
        { x: 22, y: 5.5, w: 5.2, h: 2.6, angle: -Math.PI / 2 },
      ],
      exitZone: { x: 18, y: 22, w: 14, h: 5, angle: 0 },
    },
    obstacles: [
      { kind: "car", x: 14, y: 5.4, angle: -Math.PI / 2, length: 4.5, width: 1.8, color: "#64748b" },
      { kind: "car", x: 22, y: 5.4, angle: -Math.PI / 2, length: 4.5, width: 1.8, color: "#475569" },
    ],
    spawn: { x: 18, y: 5.5, angle: -Math.PI / 2 },
    target: { x: 18, y: 22, w: 14, h: 5, angle: null, angleTol: Math.PI, speedMax: 2.8, exit: true },
    maxBumps: 8,
  },
  {
    id: "challenge",
    name: "5 · Tight challenge",
    mode: "Challenge",
    short: "Parallel park into a shorter gap — wagon or lorry recommended.",
    tip: "Patience beats power. Multi-point the reverse and keep speed low.",
    worldW: 40,
    worldH: 26,
    walls: [
      { x: 20, y: -0.4, w: 40, h: 0.8 },
      { x: 20, y: 26.4, w: 40, h: 0.8 },
      { x: -0.4, y: 13, w: 0.8, h: 26 },
      { x: 40.4, y: 13, w: 0.8, h: 26 },
      { x: 20, y: 4.0, w: 40, h: 0.35 },
    ],
    markings: {
      bays: [{ x: 18, y: 6.5, w: 5.4, h: 2.35, angle: 0 }],
    },
    obstacles: [
      { kind: "car", x: 12.0, y: 6.5, angle: 0, length: 4.6, width: 1.85, color: "#64748b" },
      { kind: "car", x: 24.0, y: 6.5, angle: 0, length: 4.6, width: 1.85, color: "#475569" },
      { kind: "car", x: 7, y: 18, angle: 0.1, length: 4.5, width: 1.8, color: "#334155" },
      { kind: "car", x: 32, y: 19, angle: -0.05, length: 5.2, width: 2.0, color: "#526077" },
      { kind: "cone", x: 18, y: 12, r: 0.35 },
      { kind: "cone", x: 20, y: 12, r: 0.35 },
    ],
    spawn: { x: 32, y: 14, angle: Math.PI },
    target: { x: 18, y: 6.5, w: 5.2, h: 2.25, angle: 0, angleTol: 0.18, speedMax: 0.5 },
    maxBumps: 6,
  },
];

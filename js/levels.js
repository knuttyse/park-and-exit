/**
 * Level layouts in world units. Origin is top-left of the lot.
 * Cars face +X when angle = 0 (radians, CCW from +X).
 * Target bay: { x, y, w, h, angle } — center + size + desired heading.
 * Exit missions: target.exit = true, markings.exitZone optional.
 * Parallel park levels set `parallel: { center, angle, curbSide }` so the game
 * can rebuild a vehicle-scaled minimal bay with curb flush (no sidewalk swing).
 */
(function () {
  "use strict";
  var PI = Math.PI;
  window.PARK_LEVELS = [
    {
      id: "parallel-in",
      name: "1 · Parallel park",
      mode: "Park in",
      short: "Slide into the curb-side parallel bay between two cars.",
      tip: "←→ / A D = steer. Pull past the gap, reverse in, then straighten.",
      worldW: 42,
      worldH: 26,
      walls: [
        {
          x: 21,
          y: -0.4,
          w: 42,
          h: 0.8
        },
        {
          x: 21,
          y: 26.4,
          w: 42,
          h: 0.8
        },
        {
          x: -0.4,
          y: 13,
          w: 0.8,
          h: 26
        },
        {
          x: 42.4,
          y: 13,
          w: 0.8,
          h: 26
        },
        {
          x: 21,
          y: 4.2,
          w: 42,
          h: 0.35
        }
      ],
      markings: {
        bays: [
          {
            x: 18,
            y: 6.6,
            w: 6.2,
            h: 2.4,
            angle: 0
          }
        ]
      },
      obstacles: [
        {
          kind: "car",
          x: 11.2,
          y: 6.6,
          angle: 0,
          length: 4.5,
          width: 1.8,
          color: "#64748b"
        },
        {
          kind: "car",
          x: 24.8,
          y: 6.6,
          angle: 0,
          length: 4.5,
          width: 1.8,
          color: "#475569"
        },
        {
          kind: "car",
          x: 8,
          y: 20,
          angle: 0,
          length: 4.4,
          width: 1.75,
          color: "#334155"
        },
        {
          kind: "car",
          x: 14,
          y: 20,
          angle: 0,
          length: 4.3,
          width: 1.75,
          color: "#3f4f63"
        },
        {
          kind: "car",
          x: 28,
          y: 20,
          angle: 0,
          length: 4.6,
          width: 1.8,
          color: "#526077"
        }
      ],
      spawn: {
        x: 34,
        y: 14,
        angle: PI
      },
      target: {
        x: 18,
        y: 6.6,
        w: 6,
        h: 2.35,
        angle: 0,
        angleTol: 0.22,
        speedMax: 0.55
      },
      maxBumps: 8,
      parallel: {
        center: {
          x: 18,
          y: 6.6
        },
        angle: 0,
        curbSide: -1
      }
    },
    {
      id: "bay-reverse",
      name: "2 · Reverse into bay",
      mode: "Park in",
      short: "Back into a perpendicular bay between two parked cars.",
      tip: "←→ steer to line up, reverse slowly, straighten once the rear is in.",
      worldW: 36,
      worldH: 28,
      walls: [
        {
          x: 18,
          y: -0.4,
          w: 36,
          h: 0.8
        },
        {
          x: 18,
          y: 28.4,
          w: 36,
          h: 0.8
        },
        {
          x: -0.4,
          y: 14,
          w: 0.8,
          h: 28
        },
        {
          x: 36.4,
          y: 14,
          w: 0.8,
          h: 28
        },
        {
          x: 18,
          y: 1.2,
          w: 22,
          h: 0.4
        }
      ],
      markings: {
        bays: [
          {
            x: 10,
            y: 5.5,
            w: 5.2,
            h: 2.6,
            angle: -PI / 2
          },
          {
            x: 14,
            y: 5.5,
            w: 5.2,
            h: 2.6,
            angle: -PI / 2
          },
          {
            x: 18,
            y: 5.5,
            w: 5.2,
            h: 2.6,
            angle: -PI / 2
          },
          {
            x: 22,
            y: 5.5,
            w: 5.2,
            h: 2.6,
            angle: -PI / 2
          },
          {
            x: 26,
            y: 5.5,
            w: 5.2,
            h: 2.6,
            angle: -PI / 2
          }
        ]
      },
      obstacles: [
        {
          kind: "car",
          x: 14,
          y: 5.4,
          angle: -PI / 2,
          length: 4.5,
          width: 1.8,
          color: "#64748b"
        },
        {
          kind: "car",
          x: 22,
          y: 5.4,
          angle: -PI / 2,
          length: 4.5,
          width: 1.8,
          color: "#475569"
        },
        {
          kind: "car",
          x: 10,
          y: 5.4,
          angle: -PI / 2,
          length: 4.4,
          width: 1.75,
          color: "#334155"
        },
        {
          kind: "car",
          x: 26,
          y: 5.4,
          angle: -PI / 2,
          length: 4.4,
          width: 1.75,
          color: "#3f4f63"
        },
        {
          kind: "car",
          x: 6,
          y: 20,
          angle: 0,
          length: 4.5,
          width: 1.8,
          color: "#526077"
        },
        {
          kind: "car",
          x: 30,
          y: 22,
          angle: PI,
          length: 4.5,
          width: 1.8,
          color: "#5b6b80"
        }
      ],
      spawn: {
        x: 18,
        y: 20,
        angle: -PI / 2
      },
      target: {
        x: 18,
        y: 5.5,
        w: 5,
        h: 2.5,
        angle: -PI / 2,
        angleTol: 0.2,
        speedMax: 0.55
      },
      maxBumps: 8
    },
    {
      id: "parallel-out",
      name: "3 · Exit parallel spot",
      mode: "Drive out",
      short: "Leave a tight parallel bay without clipping neighbours.",
      tip: "←→ steer: reverse a little while turning, then pull forward to clear.",
      worldW: 42,
      worldH: 26,
      walls: [
        {
          x: 21,
          y: -0.4,
          w: 42,
          h: 0.8
        },
        {
          x: 21,
          y: 26.4,
          w: 42,
          h: 0.8
        },
        {
          x: -0.4,
          y: 13,
          w: 0.8,
          h: 26
        },
        {
          x: 42.4,
          y: 13,
          w: 0.8,
          h: 26
        },
        {
          x: 21,
          y: 4.2,
          w: 42,
          h: 0.35
        }
      ],
      markings: {
        bays: [
          {
            x: 18,
            y: 6.6,
            w: 6.2,
            h: 2.4,
            angle: 0
          }
        ],
        exitZone: {
          x: 30,
          y: 15,
          w: 10,
          h: 6,
          angle: 0
        }
      },
      obstacles: [
        {
          kind: "car",
          x: 11.2,
          y: 6.6,
          angle: 0,
          length: 4.5,
          width: 1.8,
          color: "#64748b"
        },
        {
          kind: "car",
          x: 24.8,
          y: 6.6,
          angle: 0,
          length: 4.5,
          width: 1.8,
          color: "#475569"
        },
        {
          kind: "car",
          x: 8,
          y: 20,
          angle: 0,
          length: 4.4,
          width: 1.75,
          color: "#334155"
        },
        {
          kind: "car",
          x: 28,
          y: 20,
          angle: 0,
          length: 4.6,
          width: 1.8,
          color: "#526077"
        }
      ],
      spawn: {
        x: 18,
        y: 6.6,
        angle: 0
      },
      target: {
        x: 30,
        y: 15,
        w: 10,
        h: 6,
        angle: null,
        angleTol: PI,
        speedMax: 2.5,
        exit: true
      },
      maxBumps: 8,
      parallel: {
        center: {
          x: 18,
          y: 6.6
        },
        angle: 0,
        curbSide: -1
      }
    },
    {
      id: "bay-out",
      name: "4 · Exit bay",
      mode: "Drive out",
      short: "Drive out of a bay squeezed between two cars.",
      tip: "↑ creep out, ←→ straighten in the aisle, then reach the exit zone.",
      worldW: 36,
      worldH: 28,
      walls: [
        {
          x: 18,
          y: -0.4,
          w: 36,
          h: 0.8
        },
        {
          x: 18,
          y: 28.4,
          w: 36,
          h: 0.8
        },
        {
          x: -0.4,
          y: 14,
          w: 0.8,
          h: 28
        },
        {
          x: 36.4,
          y: 14,
          w: 0.8,
          h: 28
        },
        {
          x: 18,
          y: 1.2,
          w: 22,
          h: 0.4
        }
      ],
      markings: {
        bays: [
          {
            x: 14,
            y: 5.5,
            w: 5.2,
            h: 2.6,
            angle: -PI / 2
          },
          {
            x: 18,
            y: 5.5,
            w: 5.2,
            h: 2.6,
            angle: -PI / 2
          },
          {
            x: 22,
            y: 5.5,
            w: 5.2,
            h: 2.6,
            angle: -PI / 2
          }
        ],
        exitZone: {
          x: 18,
          y: 22,
          w: 14,
          h: 5,
          angle: 0
        }
      },
      obstacles: [
        {
          kind: "car",
          x: 14,
          y: 5.4,
          angle: -PI / 2,
          length: 4.5,
          width: 1.8,
          color: "#64748b"
        },
        {
          kind: "car",
          x: 22,
          y: 5.4,
          angle: -PI / 2,
          length: 4.5,
          width: 1.8,
          color: "#475569"
        }
      ],
      spawn: {
        x: 18,
        y: 5.5,
        angle: -PI / 2
      },
      target: {
        x: 18,
        y: 22,
        w: 14,
        h: 5,
        angle: null,
        angleTol: PI,
        speedMax: 2.8,
        exit: true
      },
      maxBumps: 8
    },
    {
      id: "parallel-tight",
      name: "5 · Tight parallel",
      mode: "Park in",
      short: "Shorter curb gap with cones marking the aisle.",
      tip: "←→ for small corrections. Multi-point reverse; keep speed low.",
      worldW: 40,
      worldH: 26,
      walls: [
        {
          x: 20,
          y: -0.4,
          w: 40,
          h: 0.8
        },
        {
          x: 20,
          y: 26.4,
          w: 40,
          h: 0.8
        },
        {
          x: -0.4,
          y: 13,
          w: 0.8,
          h: 26
        },
        {
          x: 40.4,
          y: 13,
          w: 0.8,
          h: 26
        },
        {
          x: 20,
          y: 4,
          w: 40,
          h: 0.35
        }
      ],
      markings: {
        bays: [
          {
            x: 18,
            y: 6.5,
            w: 5.4,
            h: 2.35,
            angle: 0
          }
        ]
      },
      obstacles: [
        {
          kind: "car",
          x: 12,
          y: 6.5,
          angle: 0,
          length: 4.6,
          width: 1.85,
          color: "#64748b"
        },
        {
          kind: "car",
          x: 24,
          y: 6.5,
          angle: 0,
          length: 4.6,
          width: 1.85,
          color: "#475569"
        },
        {
          kind: "car",
          x: 7,
          y: 18,
          angle: 0.1,
          length: 4.5,
          width: 1.8,
          color: "#334155"
        },
        {
          kind: "car",
          x: 32,
          y: 19,
          angle: -0.05,
          length: 5.2,
          width: 2,
          color: "#526077"
        },
        {
          kind: "cone",
          x: 18,
          y: 12,
          r: 0.35
        },
        {
          kind: "cone",
          x: 20,
          y: 12,
          r: 0.35
        }
      ],
      spawn: {
        x: 32,
        y: 14,
        angle: PI
      },
      target: {
        x: 18,
        y: 6.5,
        w: 5.2,
        h: 2.25,
        angle: 0,
        angleTol: 0.18,
        speedMax: 0.5
      },
      maxBumps: 6,
      parallel: {
        center: {
          x: 18,
          y: 6.5
        },
        angle: 0,
        curbSide: -1
      }
    },
    {
      id: "parallel-from-left",
      name: "6 · Parallel from the left",
      mode: "Park in",
      short: "Approach the curb bay from the opposite direction.",
      tip: "Same idea, mirrored: pass the gap, reverse, straighten with ←→.",
      worldW: 42,
      worldH: 26,
      walls: [
        {
          x: 21,
          y: -0.4,
          w: 42,
          h: 0.8
        },
        {
          x: 21,
          y: 26.4,
          w: 42,
          h: 0.8
        },
        {
          x: -0.4,
          y: 13,
          w: 0.8,
          h: 26
        },
        {
          x: 42.4,
          y: 13,
          w: 0.8,
          h: 26
        },
        {
          x: 21,
          y: 4.2,
          w: 42,
          h: 0.35
        }
      ],
      markings: {
        bays: [
          {
            x: 22,
            y: 6.6,
            w: 6,
            h: 2.4,
            angle: 0
          }
        ]
      },
      obstacles: [
        {
          kind: "car",
          x: 15.2,
          y: 6.6,
          angle: 0,
          length: 4.5,
          width: 1.8,
          color: "#64748b"
        },
        {
          kind: "car",
          x: 28.8,
          y: 6.6,
          angle: 0,
          length: 4.5,
          width: 1.8,
          color: "#475569"
        },
        {
          kind: "car",
          x: 10,
          y: 19,
          angle: PI,
          length: 4.4,
          width: 1.75,
          color: "#334155"
        },
        {
          kind: "car",
          x: 34,
          y: 20,
          angle: 0,
          length: 4.5,
          width: 1.8,
          color: "#526077"
        }
      ],
      spawn: {
        x: 8,
        y: 14,
        angle: 0
      },
      target: {
        x: 22,
        y: 6.6,
        w: 5.8,
        h: 2.3,
        angle: 0,
        angleTol: 0.22,
        speedMax: 0.55
      },
      maxBumps: 8,
      parallel: {
        center: {
          x: 22,
          y: 6.6
        },
        angle: 0,
        curbSide: -1
      }
    },
    {
      id: "parallel-long-neighbours",
      name: "7 · Between long vans",
      mode: "Park in",
      short: "Parallel park with longer delivery vans on both sides.",
      tip: "Vans stick out — leave more room on the reverse swing.",
      worldW: 44,
      worldH: 26,
      walls: [
        {
          x: 22,
          y: -0.4,
          w: 44,
          h: 0.8
        },
        {
          x: 22,
          y: 26.4,
          w: 44,
          h: 0.8
        },
        {
          x: -0.4,
          y: 13,
          w: 0.8,
          h: 26
        },
        {
          x: 44.4,
          y: 13,
          w: 0.8,
          h: 26
        },
        {
          x: 22,
          y: 4,
          w: 44,
          h: 0.35
        }
      ],
      markings: {
        bays: [
          {
            x: 20,
            y: 6.7,
            w: 6,
            h: 2.4,
            angle: 0
          }
        ]
      },
      obstacles: [
        {
          kind: "car",
          x: 12.5,
          y: 6.7,
          angle: 0,
          length: 5.6,
          width: 2.05,
          color: "#64748b"
        },
        {
          kind: "car",
          x: 27.5,
          y: 6.7,
          angle: 0,
          length: 5.6,
          width: 2.05,
          color: "#475569"
        },
        {
          kind: "car",
          x: 8,
          y: 18,
          angle: 0,
          length: 4.5,
          width: 1.8,
          color: "#334155"
        },
        {
          kind: "car",
          x: 36,
          y: 19,
          angle: PI,
          length: 5,
          width: 2,
          color: "#526077"
        },
        {
          kind: "cone",
          x: 20,
          y: 11.5,
          r: 0.35
        }
      ],
      spawn: {
        x: 36,
        y: 14,
        angle: PI
      },
      target: {
        x: 20,
        y: 6.7,
        w: 5.7,
        h: 2.3,
        angle: 0,
        angleTol: 0.2,
        speedMax: 0.5
      },
      maxBumps: 7,
      parallel: {
        center: {
          x: 20,
          y: 6.7
        },
        angle: 0,
        curbSide: -1
      }
    },
    {
      id: "parallel-exit-tight",
      name: "8 · Squeeze out parallel",
      mode: "Drive out",
      short: "Exit a short parallel gap with a van close behind.",
      tip: "Tiny reverse with steer, then forward clear of the van bumper.",
      worldW: 40,
      worldH: 26,
      walls: [
        {
          x: 20,
          y: -0.4,
          w: 40,
          h: 0.8
        },
        {
          x: 20,
          y: 26.4,
          w: 40,
          h: 0.8
        },
        {
          x: -0.4,
          y: 13,
          w: 0.8,
          h: 26
        },
        {
          x: 40.4,
          y: 13,
          w: 0.8,
          h: 26
        },
        {
          x: 20,
          y: 4,
          w: 40,
          h: 0.35
        }
      ],
      markings: {
        bays: [
          {
            x: 18,
            y: 6.5,
            w: 5.5,
            h: 2.35,
            angle: 0
          }
        ],
        exitZone: {
          x: 28,
          y: 16,
          w: 10,
          h: 6,
          angle: 0
        }
      },
      obstacles: [
        {
          kind: "car",
          x: 12.2,
          y: 6.5,
          angle: 0,
          length: 4.6,
          width: 1.85,
          color: "#64748b"
        },
        {
          kind: "car",
          x: 24,
          y: 6.5,
          angle: 0,
          length: 5.4,
          width: 2,
          color: "#475569"
        },
        {
          kind: "car",
          x: 6,
          y: 19,
          angle: 0,
          length: 4.4,
          width: 1.75,
          color: "#334155"
        },
        {
          kind: "cone",
          x: 22,
          y: 11,
          r: 0.35
        }
      ],
      spawn: {
        x: 18,
        y: 6.5,
        angle: 0
      },
      target: {
        x: 28,
        y: 16,
        w: 10,
        h: 6,
        angle: null,
        angleTol: PI,
        speedMax: 2.4,
        exit: true
      },
      maxBumps: 7,
      parallel: {
        center: {
          x: 18,
          y: 6.5
        },
        angle: 0,
        curbSide: -1
      }
    },
    {
      id: "bay-nose-in",
      name: "9 · Nose into bay",
      mode: "Park in",
      short: "Drive forward into a perpendicular bay (nose first).",
      tip: "Line the bay up early; ease in with light ←→ corrections.",
      worldW: 36,
      worldH: 28,
      walls: [
        {
          x: 18,
          y: -0.4,
          w: 36,
          h: 0.8
        },
        {
          x: 18,
          y: 28.4,
          w: 36,
          h: 0.8
        },
        {
          x: -0.4,
          y: 14,
          w: 0.8,
          h: 28
        },
        {
          x: 36.4,
          y: 14,
          w: 0.8,
          h: 28
        },
        {
          x: 18,
          y: 1.2,
          w: 22,
          h: 0.4
        }
      ],
      markings: {
        bays: [
          {
            x: 12,
            y: 5.5,
            w: 5.2,
            h: 2.6,
            angle: -PI / 2
          },
          {
            x: 16,
            y: 5.5,
            w: 5.2,
            h: 2.6,
            angle: -PI / 2
          },
          {
            x: 20,
            y: 5.5,
            w: 5.2,
            h: 2.6,
            angle: -PI / 2
          },
          {
            x: 24,
            y: 5.5,
            w: 5.2,
            h: 2.6,
            angle: -PI / 2
          }
        ]
      },
      obstacles: [
        {
          kind: "car",
          x: 12,
          y: 5.4,
          angle: -PI / 2,
          length: 4.5,
          width: 1.8,
          color: "#64748b"
        },
        {
          kind: "car",
          x: 24,
          y: 5.4,
          angle: -PI / 2,
          length: 4.5,
          width: 1.8,
          color: "#475569"
        },
        {
          kind: "car",
          x: 16,
          y: 5.4,
          angle: -PI / 2,
          length: 4.4,
          width: 1.75,
          color: "#334155"
        },
        {
          kind: "car",
          x: 8,
          y: 18,
          angle: 0.15,
          length: 4.5,
          width: 1.8,
          color: "#526077"
        }
      ],
      spawn: {
        x: 30,
        y: 18,
        angle: PI
      },
      target: {
        x: 20,
        y: 5.5,
        w: 5,
        h: 2.5,
        angle: -PI / 2,
        angleTol: 0.22,
        speedMax: 0.55
      },
      maxBumps: 8
    },
    {
      id: "bay-reverse-narrow",
      name: "10 · Narrow reverse bay",
      mode: "Park in",
      short: "Reverse into a tighter bay with cars parked slightly crooked.",
      tip: "Crooked neighbours shrink the gap — creep and re-align often.",
      worldW: 36,
      worldH: 28,
      walls: [
        {
          x: 18,
          y: -0.4,
          w: 36,
          h: 0.8
        },
        {
          x: 18,
          y: 28.4,
          w: 36,
          h: 0.8
        },
        {
          x: -0.4,
          y: 14,
          w: 0.8,
          h: 28
        },
        {
          x: 36.4,
          y: 14,
          w: 0.8,
          h: 28
        },
        {
          x: 18,
          y: 1.2,
          w: 20,
          h: 0.4
        }
      ],
      markings: {
        bays: [
          {
            x: 14,
            y: 5.6,
            w: 5.1,
            h: 2.45,
            angle: -PI / 2
          },
          {
            x: 18,
            y: 5.5,
            w: 5.1,
            h: 2.4,
            angle: -PI / 2
          },
          {
            x: 22,
            y: 5.6,
            w: 5.1,
            h: 2.45,
            angle: -PI / 2
          }
        ]
      },
      obstacles: [
        {
          kind: "car",
          x: 14,
          y: 5.5,
          angle: -1.490796,
          length: 4.5,
          width: 1.85,
          color: "#64748b"
        },
        {
          kind: "car",
          x: 22,
          y: 5.5,
          angle: -1.650796,
          length: 4.5,
          width: 1.85,
          color: "#475569"
        },
        {
          kind: "car",
          x: 8,
          y: 16,
          angle: 0,
          length: 4.4,
          width: 1.75,
          color: "#334155"
        },
        {
          kind: "car",
          x: 30,
          y: 20,
          angle: PI,
          length: 4.6,
          width: 1.8,
          color: "#526077"
        },
        {
          kind: "cone",
          x: 18,
          y: 10,
          r: 0.35
        }
      ],
      spawn: {
        x: 18,
        y: 21,
        angle: -PI / 2
      },
      target: {
        x: 18,
        y: 5.5,
        w: 4.9,
        h: 2.3,
        angle: -PI / 2,
        angleTol: 0.18,
        speedMax: 0.5
      },
      maxBumps: 6
    },
    {
      id: "angle-park",
      name: "11 · Angle park",
      mode: "Park in",
      short: "Nose into a 45° angled bay off the aisle.",
      tip: "Turn earlier than you think; finish with the nose square in the bay.",
      worldW: 40,
      worldH: 28,
      walls: [
        {
          x: 20,
          y: -0.4,
          w: 40,
          h: 0.8
        },
        {
          x: 20,
          y: 28.4,
          w: 40,
          h: 0.8
        },
        {
          x: -0.4,
          y: 14,
          w: 0.8,
          h: 28
        },
        {
          x: 40.4,
          y: 14,
          w: 0.8,
          h: 28
        },
        {
          x: 12,
          y: 2,
          w: 18,
          h: 0.4
        }
      ],
      markings: {
        bays: [
          {
            x: 10,
            y: 7.5,
            w: 5.2,
            h: 2.5,
            angle: -PI / 4
          },
          {
            x: 14,
            y: 7.5,
            w: 5.2,
            h: 2.5,
            angle: -PI / 4
          },
          {
            x: 18,
            y: 7.5,
            w: 5.2,
            h: 2.5,
            angle: -PI / 4
          },
          {
            x: 22,
            y: 7.5,
            w: 5.2,
            h: 2.5,
            angle: -PI / 4
          }
        ]
      },
      obstacles: [
        {
          kind: "car",
          x: 10,
          y: 7.5,
          angle: -PI / 4,
          length: 4.4,
          width: 1.8,
          color: "#64748b"
        },
        {
          kind: "car",
          x: 14,
          y: 7.5,
          angle: -PI / 4,
          length: 4.4,
          width: 1.8,
          color: "#475569"
        },
        {
          kind: "car",
          x: 22,
          y: 7.5,
          angle: -PI / 4,
          length: 4.4,
          width: 1.8,
          color: "#334155"
        },
        {
          kind: "car",
          x: 32,
          y: 18,
          angle: PI,
          length: 4.5,
          width: 1.8,
          color: "#526077"
        }
      ],
      spawn: {
        x: 32,
        y: 20,
        angle: PI
      },
      target: {
        x: 18,
        y: 7.5,
        w: 5,
        h: 2.4,
        angle: -PI / 4,
        angleTol: 0.2,
        speedMax: 0.55
      },
      maxBumps: 7
    },
    {
      id: "angle-reverse",
      name: "12 · Reverse angle bay",
      mode: "Park in",
      short: "Back into an angled bay — watch the rear swing.",
      tip: "Pass the bay, reverse while steering into the angle, then straighten.",
      worldW: 40,
      worldH: 28,
      walls: [
        {
          x: 20,
          y: -0.4,
          w: 40,
          h: 0.8
        },
        {
          x: 20,
          y: 28.4,
          w: 40,
          h: 0.8
        },
        {
          x: -0.4,
          y: 14,
          w: 0.8,
          h: 28
        },
        {
          x: 40.4,
          y: 14,
          w: 0.8,
          h: 28
        },
        {
          x: 28,
          y: 2,
          w: 18,
          h: 0.4
        }
      ],
      markings: {
        bays: [
          {
            x: 22,
            y: 7.2,
            w: 5.2,
            h: 2.5,
            angle: PI / 4
          },
          {
            x: 26,
            y: 7.2,
            w: 5.2,
            h: 2.5,
            angle: PI / 4
          },
          {
            x: 30,
            y: 7.2,
            w: 5.2,
            h: 2.5,
            angle: PI / 4
          }
        ]
      },
      obstacles: [
        {
          kind: "car",
          x: 22,
          y: 7.2,
          angle: PI / 4,
          length: 4.4,
          width: 1.8,
          color: "#64748b"
        },
        {
          kind: "car",
          x: 30,
          y: 7.2,
          angle: PI / 4,
          length: 4.4,
          width: 1.8,
          color: "#475569"
        },
        {
          kind: "car",
          x: 8,
          y: 18,
          angle: 0,
          length: 4.5,
          width: 1.8,
          color: "#334155"
        },
        {
          kind: "cone",
          x: 26,
          y: 12,
          r: 0.35
        }
      ],
      spawn: {
        x: 10,
        y: 20,
        angle: 0
      },
      target: {
        x: 26,
        y: 7.2,
        w: 5,
        h: 2.4,
        angle: PI / 4,
        angleTol: 0.2,
        speedMax: 0.5
      },
      maxBumps: 7
    },
    {
      id: "angle-exit",
      name: "13 · Exit angled bay",
      mode: "Drive out",
      short: "Leave a 45° bay into a busy aisle.",
      tip: "Creep out until you clear neighbours, then steer into the exit zone.",
      worldW: 40,
      worldH: 28,
      walls: [
        {
          x: 20,
          y: -0.4,
          w: 40,
          h: 0.8
        },
        {
          x: 20,
          y: 28.4,
          w: 40,
          h: 0.8
        },
        {
          x: -0.4,
          y: 14,
          w: 0.8,
          h: 28
        },
        {
          x: 40.4,
          y: 14,
          w: 0.8,
          h: 28
        }
      ],
      markings: {
        bays: [
          {
            x: 14,
            y: 7.5,
            w: 5.2,
            h: 2.5,
            angle: -PI / 4
          },
          {
            x: 18,
            y: 7.5,
            w: 5.2,
            h: 2.5,
            angle: -PI / 4
          },
          {
            x: 22,
            y: 7.5,
            w: 5.2,
            h: 2.5,
            angle: -PI / 4
          }
        ],
        exitZone: {
          x: 30,
          y: 20,
          w: 10,
          h: 6,
          angle: 0
        }
      },
      obstacles: [
        {
          kind: "car",
          x: 14,
          y: 7.5,
          angle: -PI / 4,
          length: 4.4,
          width: 1.8,
          color: "#64748b"
        },
        {
          kind: "car",
          x: 22,
          y: 7.5,
          angle: -PI / 4,
          length: 4.4,
          width: 1.8,
          color: "#475569"
        },
        {
          kind: "car",
          x: 8,
          y: 18,
          angle: 0.1,
          length: 4.5,
          width: 1.8,
          color: "#334155"
        }
      ],
      spawn: {
        x: 18,
        y: 7.5,
        angle: -PI / 4
      },
      target: {
        x: 30,
        y: 20,
        w: 10,
        h: 6,
        angle: null,
        angleTol: PI,
        speedMax: 2.5,
        exit: true
      },
      maxBumps: 7
    },
    {
      id: "narrow-lane-parallel",
      name: "14 · Narrow lane parallel",
      mode: "Park in",
      short: "Parallel park with a wall closing off half the aisle.",
      tip: "Less swing room — use more reverse points and less speed.",
      worldW: 38,
      worldH: 22,
      walls: [
        {
          x: 19,
          y: -0.4,
          w: 38,
          h: 0.8
        },
        {
          x: 19,
          y: 22.4,
          w: 38,
          h: 0.8
        },
        {
          x: -0.4,
          y: 11,
          w: 0.8,
          h: 22
        },
        {
          x: 38.4,
          y: 11,
          w: 0.8,
          h: 22
        },
        {
          x: 19,
          y: 3.8,
          w: 38,
          h: 0.35
        },
        {
          x: 30,
          y: 14,
          w: 0.5,
          h: 12
        }
      ],
      markings: {
        bays: [
          {
            x: 16,
            y: 6.2,
            w: 5.8,
            h: 2.3,
            angle: 0
          }
        ]
      },
      obstacles: [
        {
          kind: "car",
          x: 9.5,
          y: 6.2,
          angle: 0,
          length: 4.5,
          width: 1.8,
          color: "#64748b"
        },
        {
          kind: "car",
          x: 22.5,
          y: 6.2,
          angle: 0,
          length: 4.5,
          width: 1.8,
          color: "#475569"
        },
        {
          kind: "car",
          x: 8,
          y: 16,
          angle: 0,
          length: 4.3,
          width: 1.75,
          color: "#334155"
        },
        {
          kind: "cone",
          x: 16,
          y: 10.5,
          r: 0.35
        },
        {
          kind: "cone",
          x: 18,
          y: 10.5,
          r: 0.35
        }
      ],
      spawn: {
        x: 26,
        y: 12,
        angle: PI
      },
      target: {
        x: 16,
        y: 6.2,
        w: 5.5,
        h: 2.2,
        angle: 0,
        angleTol: 0.2,
        speedMax: 0.5
      },
      maxBumps: 6,
      parallel: {
        center: {
          x: 16,
          y: 6.2
        },
        angle: 0,
        curbSide: -1
      }
    },
    {
      id: "dead-end-bay",
      name: "15 · Dead-end reverse",
      mode: "Park in",
      short: "Reverse into the last bay of a dead-end row.",
      tip: "No drive-through — commit to reverse and don't overshoot the back wall.",
      worldW: 32,
      worldH: 30,
      walls: [
        {
          x: 16,
          y: -0.4,
          w: 32,
          h: 0.8
        },
        {
          x: 16,
          y: 30.4,
          w: 32,
          h: 0.8
        },
        {
          x: -0.4,
          y: 15,
          w: 0.8,
          h: 30
        },
        {
          x: 32.4,
          y: 15,
          w: 0.8,
          h: 30
        },
        {
          x: 16,
          y: 1,
          w: 18,
          h: 0.45
        },
        {
          x: 7,
          y: 8,
          w: 0.45,
          h: 14
        },
        {
          x: 25,
          y: 8,
          w: 0.45,
          h: 14
        }
      ],
      markings: {
        bays: [
          {
            x: 12,
            y: 5.2,
            w: 5,
            h: 2.5,
            angle: -PI / 2
          },
          {
            x: 16,
            y: 5.2,
            w: 5,
            h: 2.5,
            angle: -PI / 2
          },
          {
            x: 20,
            y: 5.2,
            w: 5,
            h: 2.5,
            angle: -PI / 2
          }
        ]
      },
      obstacles: [
        {
          kind: "car",
          x: 12,
          y: 5.1,
          angle: -PI / 2,
          length: 4.4,
          width: 1.8,
          color: "#64748b"
        },
        {
          kind: "car",
          x: 20,
          y: 5.1,
          angle: -PI / 2,
          length: 4.4,
          width: 1.8,
          color: "#475569"
        },
        {
          kind: "car",
          x: 10,
          y: 20,
          angle: 0,
          length: 4.5,
          width: 1.8,
          color: "#334155"
        },
        {
          kind: "car",
          x: 22,
          y: 22,
          angle: PI,
          length: 4.5,
          width: 1.8,
          color: "#526077"
        }
      ],
      spawn: {
        x: 16,
        y: 24,
        angle: -PI / 2
      },
      target: {
        x: 16,
        y: 5.2,
        w: 4.8,
        h: 2.4,
        angle: -PI / 2,
        angleTol: 0.18,
        speedMax: 0.5
      },
      maxBumps: 6
    },
    {
      id: "crowded-aisle-bay",
      name: "16 · Crowded aisle bay",
      mode: "Park in",
      short: "Find the open bay among many parked cars and cones.",
      tip: "Ignore filled bays — aim for the green target, reverse when lined up.",
      worldW: 42,
      worldH: 30,
      walls: [
        {
          x: 21,
          y: -0.4,
          w: 42,
          h: 0.8
        },
        {
          x: 21,
          y: 30.4,
          w: 42,
          h: 0.8
        },
        {
          x: -0.4,
          y: 15,
          w: 0.8,
          h: 30
        },
        {
          x: 42.4,
          y: 15,
          w: 0.8,
          h: 30
        },
        {
          x: 21,
          y: 1.2,
          w: 28,
          h: 0.4
        }
      ],
      markings: {
        bays: [
          {
            x: 10,
            y: 5.5,
            w: 5.2,
            h: 2.55,
            angle: -PI / 2
          },
          {
            x: 14,
            y: 5.5,
            w: 5.2,
            h: 2.55,
            angle: -PI / 2
          },
          {
            x: 18,
            y: 5.5,
            w: 5.2,
            h: 2.55,
            angle: -PI / 2
          },
          {
            x: 22,
            y: 5.5,
            w: 5.2,
            h: 2.55,
            angle: -PI / 2
          },
          {
            x: 26,
            y: 5.5,
            w: 5.2,
            h: 2.55,
            angle: -PI / 2
          },
          {
            x: 30,
            y: 5.5,
            w: 5.2,
            h: 2.55,
            angle: -PI / 2
          }
        ]
      },
      obstacles: [
        {
          kind: "car",
          x: 10,
          y: 5.4,
          angle: -PI / 2,
          length: 4.5,
          width: 1.8,
          color: "#64748b"
        },
        {
          kind: "car",
          x: 14,
          y: 5.4,
          angle: -PI / 2,
          length: 4.5,
          width: 1.8,
          color: "#475569"
        },
        {
          kind: "car",
          x: 22,
          y: 5.4,
          angle: -PI / 2,
          length: 4.5,
          width: 1.8,
          color: "#334155"
        },
        {
          kind: "car",
          x: 26,
          y: 5.4,
          angle: -PI / 2,
          length: 4.5,
          width: 1.8,
          color: "#3f4f63"
        },
        {
          kind: "car",
          x: 30,
          y: 5.4,
          angle: -PI / 2,
          length: 4.5,
          width: 1.8,
          color: "#526077"
        },
        {
          kind: "car",
          x: 6,
          y: 16,
          angle: 0.05,
          length: 4.5,
          width: 1.8,
          color: "#5b6b80"
        },
        {
          kind: "car",
          x: 36,
          y: 18,
          angle: PI,
          length: 4.6,
          width: 1.8,
          color: "#6b7280"
        },
        {
          kind: "car",
          x: 8,
          y: 24,
          angle: 0,
          length: 4.4,
          width: 1.75,
          color: "#78716c"
        },
        {
          kind: "cone",
          x: 18,
          y: 11,
          r: 0.35
        },
        {
          kind: "cone",
          x: 20,
          y: 12,
          r: 0.35
        },
        {
          kind: "cone",
          x: 16,
          y: 12,
          r: 0.35
        }
      ],
      spawn: {
        x: 34,
        y: 24,
        angle: PI
      },
      target: {
        x: 18,
        y: 5.5,
        w: 5,
        h: 2.45,
        angle: -PI / 2,
        angleTol: 0.18,
        speedMax: 0.5
      },
      maxBumps: 6
    },
    {
      id: "side-exit-bay",
      name: "17 · Side-door exit",
      mode: "Drive out",
      short: "Leave a bay and weave past aisle traffic to the exit.",
      tip: "Clear the bay first, then snake past the parked aisle cars.",
      worldW: 40,
      worldH: 30,
      walls: [
        {
          x: 20,
          y: -0.4,
          w: 40,
          h: 0.8
        },
        {
          x: 20,
          y: 30.4,
          w: 40,
          h: 0.8
        },
        {
          x: -0.4,
          y: 15,
          w: 0.8,
          h: 30
        },
        {
          x: 40.4,
          y: 15,
          w: 0.8,
          h: 30
        },
        {
          x: 20,
          y: 1.2,
          w: 24,
          h: 0.4
        }
      ],
      markings: {
        bays: [
          {
            x: 16,
            y: 5.5,
            w: 5.2,
            h: 2.55,
            angle: -PI / 2
          },
          {
            x: 20,
            y: 5.5,
            w: 5.2,
            h: 2.55,
            angle: -PI / 2
          },
          {
            x: 24,
            y: 5.5,
            w: 5.2,
            h: 2.55,
            angle: -PI / 2
          }
        ],
        exitZone: {
          x: 34,
          y: 24,
          w: 8,
          h: 6,
          angle: 0
        }
      },
      obstacles: [
        {
          kind: "car",
          x: 16,
          y: 5.4,
          angle: -PI / 2,
          length: 4.5,
          width: 1.8,
          color: "#64748b"
        },
        {
          kind: "car",
          x: 24,
          y: 5.4,
          angle: -PI / 2,
          length: 4.5,
          width: 1.8,
          color: "#475569"
        },
        {
          kind: "car",
          x: 8,
          y: 14,
          angle: 0,
          length: 4.5,
          width: 1.8,
          color: "#334155"
        },
        {
          kind: "car",
          x: 12,
          y: 20,
          angle: 0.1,
          length: 4.4,
          width: 1.75,
          color: "#3f4f63"
        },
        {
          kind: "car",
          x: 28,
          y: 16,
          angle: PI,
          length: 4.6,
          width: 1.8,
          color: "#526077"
        },
        {
          kind: "cone",
          x: 20,
          y: 12,
          r: 0.35
        }
      ],
      spawn: {
        x: 20,
        y: 5.5,
        angle: -PI / 2
      },
      target: {
        x: 34,
        y: 24,
        w: 8,
        h: 6,
        angle: null,
        angleTol: PI,
        speedMax: 2.6,
        exit: true
      },
      maxBumps: 7
    },
    {
      id: "parallel-double-row",
      name: "18 · Double-row parallel",
      mode: "Park in",
      short: "Park parallel with another row of cars behind you.",
      tip: "Aisle is tight — keep reverse shallow so you don't kiss the far row.",
      worldW: 44,
      worldH: 24,
      walls: [
        {
          x: 22,
          y: -0.4,
          w: 44,
          h: 0.8
        },
        {
          x: 22,
          y: 24.4,
          w: 44,
          h: 0.8
        },
        {
          x: -0.4,
          y: 12,
          w: 0.8,
          h: 24
        },
        {
          x: 44.4,
          y: 12,
          w: 0.8,
          h: 24
        },
        {
          x: 22,
          y: 3.6,
          w: 44,
          h: 0.35
        },
        {
          x: 22,
          y: 20.5,
          w: 44,
          h: 0.35
        }
      ],
      markings: {
        bays: [
          {
            x: 20,
            y: 6,
            w: 5.8,
            h: 2.3,
            angle: 0
          }
        ]
      },
      obstacles: [
        {
          kind: "car",
          x: 13.5,
          y: 6,
          angle: 0,
          length: 4.5,
          width: 1.8,
          color: "#64748b"
        },
        {
          kind: "car",
          x: 26.5,
          y: 6,
          angle: 0,
          length: 4.5,
          width: 1.8,
          color: "#475569"
        },
        {
          kind: "car",
          x: 10,
          y: 17.5,
          angle: 0,
          length: 4.5,
          width: 1.8,
          color: "#334155"
        },
        {
          kind: "car",
          x: 16,
          y: 17.5,
          angle: 0,
          length: 4.4,
          width: 1.75,
          color: "#3f4f63"
        },
        {
          kind: "car",
          x: 22,
          y: 17.5,
          angle: 0,
          length: 4.5,
          width: 1.8,
          color: "#526077"
        },
        {
          kind: "car",
          x: 28,
          y: 17.5,
          angle: 0,
          length: 4.5,
          width: 1.8,
          color: "#5b6b80"
        },
        {
          kind: "car",
          x: 34,
          y: 17.5,
          angle: 0,
          length: 4.4,
          width: 1.75,
          color: "#6b7280"
        }
      ],
      spawn: {
        x: 36,
        y: 11.5,
        angle: PI
      },
      target: {
        x: 20,
        y: 6,
        w: 5.5,
        h: 2.2,
        angle: 0,
        angleTol: 0.18,
        speedMax: 0.5
      },
      maxBumps: 6,
      parallel: {
        center: {
          x: 20,
          y: 6
        },
        angle: 0,
        curbSide: -1
      }
    },
    {
      id: "cone-funnel-bay",
      name: "19 · Cone funnel reverse",
      mode: "Park in",
      short: "Reverse through a cone funnel into the bay.",
      tip: "Stay inside the cones — they count as bumps if you hit them.",
      worldW: 36,
      worldH: 30,
      walls: [
        {
          x: 18,
          y: -0.4,
          w: 36,
          h: 0.8
        },
        {
          x: 18,
          y: 30.4,
          w: 36,
          h: 0.8
        },
        {
          x: -0.4,
          y: 15,
          w: 0.8,
          h: 30
        },
        {
          x: 36.4,
          y: 15,
          w: 0.8,
          h: 30
        },
        {
          x: 18,
          y: 1.2,
          w: 16,
          h: 0.4
        }
      ],
      markings: {
        bays: [
          {
            x: 14,
            y: 5.4,
            w: 5.1,
            h: 2.5,
            angle: -PI / 2
          },
          {
            x: 18,
            y: 5.4,
            w: 5.1,
            h: 2.5,
            angle: -PI / 2
          },
          {
            x: 22,
            y: 5.4,
            w: 5.1,
            h: 2.5,
            angle: -PI / 2
          }
        ]
      },
      obstacles: [
        {
          kind: "car",
          x: 14,
          y: 5.3,
          angle: -PI / 2,
          length: 4.4,
          width: 1.8,
          color: "#64748b"
        },
        {
          kind: "car",
          x: 22,
          y: 5.3,
          angle: -PI / 2,
          length: 4.4,
          width: 1.8,
          color: "#475569"
        },
        {
          kind: "cone",
          x: 15,
          y: 11,
          r: 0.35
        },
        {
          kind: "cone",
          x: 21,
          y: 11,
          r: 0.35
        },
        {
          kind: "cone",
          x: 15.5,
          y: 14,
          r: 0.35
        },
        {
          kind: "cone",
          x: 20.5,
          y: 14,
          r: 0.35
        },
        {
          kind: "cone",
          x: 16,
          y: 17,
          r: 0.35
        },
        {
          kind: "cone",
          x: 20,
          y: 17,
          r: 0.35
        },
        {
          kind: "cone",
          x: 16.5,
          y: 20,
          r: 0.35
        },
        {
          kind: "cone",
          x: 19.5,
          y: 20,
          r: 0.35
        },
        {
          kind: "car",
          x: 6,
          y: 22,
          angle: 0,
          length: 4.5,
          width: 1.8,
          color: "#334155"
        },
        {
          kind: "car",
          x: 30,
          y: 24,
          angle: PI,
          length: 4.5,
          width: 1.8,
          color: "#526077"
        }
      ],
      spawn: {
        x: 18,
        y: 26,
        angle: -PI / 2
      },
      target: {
        x: 18,
        y: 5.4,
        w: 4.9,
        h: 2.4,
        angle: -PI / 2,
        angleTol: 0.18,
        speedMax: 0.5
      },
      maxBumps: 5
    },
    {
      id: "uturn-then-park",
      name: "20 · U-turn then park",
      mode: "Park in",
      short: "Turn around in a cul-de-sac, then reverse into the bay.",
      tip: "Three-point turn first if needed, then set up for the reverse park.",
      worldW: 34,
      worldH: 32,
      walls: [
        {
          x: 17,
          y: -0.4,
          w: 34,
          h: 0.8
        },
        {
          x: 17,
          y: 32.4,
          w: 34,
          h: 0.8
        },
        {
          x: -0.4,
          y: 16,
          w: 0.8,
          h: 32
        },
        {
          x: 34.4,
          y: 16,
          w: 0.8,
          h: 32
        },
        {
          x: 17,
          y: 1.2,
          w: 16,
          h: 0.4
        },
        {
          x: 6,
          y: 12,
          w: 0.45,
          h: 16
        },
        {
          x: 28,
          y: 12,
          w: 0.45,
          h: 16
        }
      ],
      markings: {
        bays: [
          {
            x: 13,
            y: 5.3,
            w: 5,
            h: 2.5,
            angle: -PI / 2
          },
          {
            x: 17,
            y: 5.3,
            w: 5,
            h: 2.5,
            angle: -PI / 2
          },
          {
            x: 21,
            y: 5.3,
            w: 5,
            h: 2.5,
            angle: -PI / 2
          }
        ]
      },
      obstacles: [
        {
          kind: "car",
          x: 13,
          y: 5.2,
          angle: -PI / 2,
          length: 4.4,
          width: 1.8,
          color: "#64748b"
        },
        {
          kind: "car",
          x: 21,
          y: 5.2,
          angle: -PI / 2,
          length: 4.4,
          width: 1.8,
          color: "#475569"
        },
        {
          kind: "car",
          x: 10,
          y: 24,
          angle: 0.2,
          length: 4.5,
          width: 1.8,
          color: "#334155"
        },
        {
          kind: "cone",
          x: 17,
          y: 14,
          r: 0.35
        }
      ],
      spawn: {
        x: 17,
        y: 28,
        angle: PI / 2
      },
      target: {
        x: 17,
        y: 5.3,
        w: 4.8,
        h: 2.4,
        angle: -PI / 2,
        angleTol: 0.18,
        speedMax: 0.5
      },
      maxBumps: 7
    },
    {
      id: "challenge-wagon-parallel",
      name: "21 · Wagon parallel challenge",
      mode: "Challenge",
      short: "Tight parallel sized for the Family wagon — patience required.",
      tip: "Family wagon length needs multi-point reverse. Tiny ←→ inputs.",
      worldW: 40,
      worldH: 24,
      walls: [
        {
          x: 20,
          y: -0.4,
          w: 40,
          h: 0.8
        },
        {
          x: 20,
          y: 24.4,
          w: 40,
          h: 0.8
        },
        {
          x: -0.4,
          y: 12,
          w: 0.8,
          h: 24
        },
        {
          x: 40.4,
          y: 12,
          w: 0.8,
          h: 24
        },
        {
          x: 20,
          y: 3.8,
          w: 40,
          h: 0.35
        }
      ],
      markings: {
        bays: [
          {
            x: 18,
            y: 6.2,
            w: 5.2,
            h: 2.25,
            angle: 0
          }
        ]
      },
      obstacles: [
        {
          kind: "car",
          x: 12.2,
          y: 6.2,
          angle: 0,
          length: 4.7,
          width: 1.9,
          color: "#64748b"
        },
        {
          kind: "car",
          x: 23.8,
          y: 6.2,
          angle: 0,
          length: 4.7,
          width: 1.9,
          color: "#475569"
        },
        {
          kind: "car",
          x: 8,
          y: 16,
          angle: 0,
          length: 4.5,
          width: 1.8,
          color: "#334155"
        },
        {
          kind: "car",
          x: 30,
          y: 17,
          angle: PI,
          length: 5.2,
          width: 2,
          color: "#526077"
        },
        {
          kind: "cone",
          x: 17,
          y: 10.5,
          r: 0.35
        },
        {
          kind: "cone",
          x: 19,
          y: 10.5,
          r: 0.35
        },
        {
          kind: "cone",
          x: 21,
          y: 10.5,
          r: 0.35
        }
      ],
      spawn: {
        x: 32,
        y: 13,
        angle: PI
      },
      target: {
        x: 18,
        y: 6.2,
        w: 5,
        h: 2.15,
        angle: 0,
        angleTol: 0.16,
        speedMax: 0.45
      },
      maxBumps: 5,
      parallel: {
        center: {
          x: 18,
          y: 6.2
        },
        angle: 0,
        curbSide: -1
      }
    },
    {
      id: "challenge-lorry-bay",
      name: "22 · Lorry bay challenge",
      mode: "Challenge",
      short: "Wide bay for the Box lorry — long wheelbase, slow steering.",
      tip: "Try Box lorry. Wide swings: start the reverse early and go slow.",
      worldW: 44,
      worldH: 32,
      walls: [
        {
          x: 22,
          y: -0.4,
          w: 44,
          h: 0.8
        },
        {
          x: 22,
          y: 32.4,
          w: 44,
          h: 0.8
        },
        {
          x: -0.4,
          y: 16,
          w: 0.8,
          h: 32
        },
        {
          x: 44.4,
          y: 16,
          w: 0.8,
          h: 32
        },
        {
          x: 22,
          y: 1.3,
          w: 24,
          h: 0.45
        }
      ],
      markings: {
        bays: [
          {
            x: 14,
            y: 6.5,
            w: 7.4,
            h: 3,
            angle: -PI / 2
          },
          {
            x: 22,
            y: 6.5,
            w: 7.4,
            h: 3,
            angle: -PI / 2
          },
          {
            x: 30,
            y: 6.5,
            w: 7.4,
            h: 3,
            angle: -PI / 2
          }
        ]
      },
      obstacles: [
        {
          kind: "car",
          x: 14,
          y: 6.4,
          angle: -PI / 2,
          length: 5.5,
          width: 2.1,
          color: "#64748b"
        },
        {
          kind: "car",
          x: 30,
          y: 6.4,
          angle: -PI / 2,
          length: 5.5,
          width: 2.1,
          color: "#475569"
        },
        {
          kind: "car",
          x: 6,
          y: 18,
          angle: 0,
          length: 4.5,
          width: 1.8,
          color: "#334155"
        },
        {
          kind: "car",
          x: 38,
          y: 20,
          angle: PI,
          length: 5,
          width: 2,
          color: "#526077"
        },
        {
          kind: "car",
          x: 8,
          y: 26,
          angle: 0.05,
          length: 4.6,
          width: 1.8,
          color: "#5b6b80"
        },
        {
          kind: "cone",
          x: 20,
          y: 13,
          r: 0.35
        },
        {
          kind: "cone",
          x: 24,
          y: 13,
          r: 0.35
        }
      ],
      spawn: {
        x: 22,
        y: 26,
        angle: -PI / 2
      },
      target: {
        x: 22,
        y: 6.5,
        w: 7,
        h: 2.9,
        angle: -PI / 2,
        angleTol: 0.16,
        speedMax: 0.45
      },
      maxBumps: 5
    },
    {
      id: "challenge-narrow-exit",
      name: "23 · Narrow maze exit",
      mode: "Challenge",
      short: "Escape a bay through a cone-lined maze to the exit zone.",
      tip: "Slow is smooth. Thread the cones, then stop in the exit zone.",
      worldW: 36,
      worldH: 34,
      walls: [
        {
          x: 18,
          y: -0.4,
          w: 36,
          h: 0.8
        },
        {
          x: 18,
          y: 34.4,
          w: 36,
          h: 0.8
        },
        {
          x: -0.4,
          y: 17,
          w: 0.8,
          h: 34
        },
        {
          x: 36.4,
          y: 17,
          w: 0.8,
          h: 34
        },
        {
          x: 18,
          y: 1.2,
          w: 14,
          h: 0.4
        },
        {
          x: 10,
          y: 16,
          w: 0.45,
          h: 10
        },
        {
          x: 26,
          y: 20,
          w: 0.45,
          h: 12
        }
      ],
      markings: {
        bays: [
          {
            x: 18,
            y: 5.4,
            w: 5.1,
            h: 2.5,
            angle: -PI / 2
          }
        ],
        exitZone: {
          x: 30,
          y: 30,
          w: 8,
          h: 5,
          angle: 0
        }
      },
      obstacles: [
        {
          kind: "car",
          x: 14,
          y: 5.3,
          angle: -PI / 2,
          length: 4.4,
          width: 1.8,
          color: "#64748b"
        },
        {
          kind: "car",
          x: 22,
          y: 5.3,
          angle: -PI / 2,
          length: 4.4,
          width: 1.8,
          color: "#475569"
        },
        {
          kind: "cone",
          x: 15,
          y: 11,
          r: 0.35
        },
        {
          kind: "cone",
          x: 21,
          y: 11,
          r: 0.35
        },
        {
          kind: "cone",
          x: 15,
          y: 14,
          r: 0.35
        },
        {
          kind: "cone",
          x: 21,
          y: 14,
          r: 0.35
        },
        {
          kind: "cone",
          x: 14,
          y: 22,
          r: 0.35
        },
        {
          kind: "cone",
          x: 18,
          y: 24,
          r: 0.35
        },
        {
          kind: "cone",
          x: 22,
          y: 26,
          r: 0.35
        },
        {
          kind: "car",
          x: 6,
          y: 28,
          angle: 0,
          length: 4.5,
          width: 1.8,
          color: "#334155"
        }
      ],
      spawn: {
        x: 18,
        y: 5.4,
        angle: -PI / 2
      },
      target: {
        x: 30,
        y: 30,
        w: 8,
        h: 5,
        angle: null,
        angleTol: PI,
        speedMax: 2.2,
        exit: true
      },
      maxBumps: 5
    },
    {
      id: "challenge-final-lot",
      name: "24 · Final crowded lot",
      mode: "Challenge",
      short: "Approach from a far corner and reverse into the last open bay.",
      tip: "Scout the path, avoid bumping the crowd, nail the final reverse.",
      worldW: 46,
      worldH: 34,
      walls: [
        {
          x: 23,
          y: -0.4,
          w: 46,
          h: 0.8
        },
        {
          x: 23,
          y: 34.4,
          w: 46,
          h: 0.8
        },
        {
          x: -0.4,
          y: 17,
          w: 0.8,
          h: 34
        },
        {
          x: 46.4,
          y: 17,
          w: 0.8,
          h: 34
        },
        {
          x: 23,
          y: 1.2,
          w: 30,
          h: 0.4
        }
      ],
      markings: {
        bays: [
          {
            x: 12,
            y: 5.6,
            w: 5.2,
            h: 2.55,
            angle: -PI / 2
          },
          {
            x: 16,
            y: 5.6,
            w: 5.2,
            h: 2.55,
            angle: -PI / 2
          },
          {
            x: 20,
            y: 5.6,
            w: 5.2,
            h: 2.55,
            angle: -PI / 2
          },
          {
            x: 24,
            y: 5.6,
            w: 5.2,
            h: 2.55,
            angle: -PI / 2
          },
          {
            x: 28,
            y: 5.6,
            w: 5.2,
            h: 2.55,
            angle: -PI / 2
          },
          {
            x: 32,
            y: 5.6,
            w: 5.2,
            h: 2.55,
            angle: -PI / 2
          }
        ]
      },
      obstacles: [
        {
          kind: "car",
          x: 12,
          y: 5.5,
          angle: -PI / 2,
          length: 4.5,
          width: 1.85,
          color: "#64748b"
        },
        {
          kind: "car",
          x: 16,
          y: 5.5,
          angle: -PI / 2,
          length: 4.5,
          width: 1.85,
          color: "#475569"
        },
        {
          kind: "car",
          x: 20,
          y: 5.5,
          angle: -PI / 2,
          length: 4.5,
          width: 1.85,
          color: "#334155"
        },
        {
          kind: "car",
          x: 28,
          y: 5.5,
          angle: -PI / 2,
          length: 4.5,
          width: 1.85,
          color: "#3f4f63"
        },
        {
          kind: "car",
          x: 32,
          y: 5.5,
          angle: -PI / 2,
          length: 4.5,
          width: 1.85,
          color: "#526077"
        },
        {
          kind: "car",
          x: 6,
          y: 14,
          angle: 0.08,
          length: 4.6,
          width: 1.8,
          color: "#5b6b80"
        },
        {
          kind: "car",
          x: 10,
          y: 18,
          angle: -0.05,
          length: 4.5,
          width: 1.8,
          color: "#6b7280"
        },
        {
          kind: "car",
          x: 38,
          y: 16,
          angle: PI,
          length: 5.2,
          width: 2,
          color: "#78716c"
        },
        {
          kind: "car",
          x: 36,
          y: 22,
          angle: PI,
          length: 4.6,
          width: 1.8,
          color: "#64748b"
        },
        {
          kind: "car",
          x: 8,
          y: 26,
          angle: 0.1,
          length: 4.5,
          width: 1.8,
          color: "#475569"
        },
        {
          kind: "car",
          x: 14,
          y: 28,
          angle: 0,
          length: 4.4,
          width: 1.75,
          color: "#334155"
        },
        {
          kind: "car",
          x: 40,
          y: 28,
          angle: PI,
          length: 4.5,
          width: 1.8,
          color: "#3f4f63"
        },
        {
          kind: "cone",
          x: 24,
          y: 12,
          r: 0.35
        },
        {
          kind: "cone",
          x: 22,
          y: 14,
          r: 0.35
        },
        {
          kind: "cone",
          x: 26,
          y: 14,
          r: 0.35
        },
        {
          kind: "cone",
          x: 24,
          y: 20,
          r: 0.35
        }
      ],
      spawn: {
        x: 42,
        y: 30,
        angle: PI
      },
      target: {
        x: 24,
        y: 5.6,
        w: 5,
        h: 2.45,
        angle: -PI / 2,
        angleTol: 0.16,
        speedMax: 0.45
      },
      maxBumps: 5
    },
  ];


  function borders(w, h) {
    return [
      { x: w / 2, y: -0.4, w: w, h: 0.8 },
      { x: w / 2, y: h + 0.4, w: w, h: 0.8 },
      { x: -0.4, y: h / 2, w: 0.8, h: h },
      { x: w + 0.4, y: h / 2, w: 0.8, h: h },
    ];
  }

  /**
   * Nose-in lot: drive along the aisle (90° to bays), then park nose-first.
   * bayLat = open-spot width (vehicle-width axis). aisleClear = rear-to-rear gap between rows.
   * Flanking cars sit only flankMargin beyond the green bay (tight physical opening).
   */
  function makeNoseInLevel(opts) {
    var worldW = opts.worldW || 40;
    var carL = 4.5;
    var carW = 1.8;
    var bayX = opts.bayX || 20;
    var bayY = opts.bayY || 6.2;
    var bayLat = opts.bayLat;
    var bayDepth = opts.bayDepth || 5.1;
    var aisleClear = opts.aisleClear;
    var flankMargin = opts.flankMargin != null ? opts.flankMargin : 0.22;
    var colors = ["#64748b", "#475569", "#334155", "#526077", "#5b6b80", "#6b7280", "#78716c"];

    // Flank centers: body edges leave (bayLat + flankMargin) clear at the open spot
    var halfOpen = (bayLat + flankMargin) / 2 + carW / 2;
    var leftFlankX = bayX - halfOpen;
    var rightFlankX = bayX + halfOpen;
    // Occupied-bay pitch elsewhere (slightly roomier than the challenge spot)
    var occupiedPitch = Math.max(carW + 0.7, bayLat + 0.45);

    var topY = bayY;
    // Rear-to-rear aisle: top rear at topY+carL/2, bottom rear at botY-carL/2
    var botY = topY + carL + aisleClear;
    var aisleY = (topY + carL / 2 + botY - carL / 2) / 2;
    var worldH = Math.max(opts.worldH || 0, botY + carL / 2 + 2.8);

    var bays = [];
    var obstacles = [];
    var xs = [leftFlankX, rightFlankX];
    var x = leftFlankX - occupiedPitch;
    while (x > 10.2) {
      xs.push(x);
      x -= occupiedPitch;
    }
    x = rightFlankX + occupiedPitch;
    while (x < worldW - 7.5) {
      xs.push(x);
      x += occupiedPitch;
    }
    xs.sort(function (a, b) {
      return a - b;
    });

    for (var i = 0; i < xs.length; i++) {
      var cx = xs[i];
      var isFlank = Math.abs(cx - leftFlankX) < 0.01 || Math.abs(cx - rightFlankX) < 0.01;
      var markH = isFlank ? bayLat : Math.max(bayLat, carW + 0.4);
      bays.push({ x: cx, y: topY, w: bayDepth, h: markH, angle: -PI / 2 });
      obstacles.push({
        kind: "car",
        x: cx,
        y: topY,
        angle: -PI / 2,
        length: carL,
        width: carW,
        color: colors[i % colors.length],
      });
    }
    bays.push({ x: bayX, y: topY, w: bayDepth, h: bayLat, angle: -PI / 2 });

    var botXs = xs.slice();
    botXs.push(bayX);
    botXs.sort(function (a, b) {
      return a - b;
    });
    for (var j = 0; j < botXs.length; j++) {
      obstacles.push({
        kind: "car",
        x: botXs[j],
        y: botY,
        angle: PI / 2,
        length: carL,
        width: carW,
        color: colors[(j + 3) % colors.length],
      });
    }

    obstacles.push({
      kind: "car",
      x: 5.2,
      y: aisleY,
      angle: 0,
      length: 4.4,
      width: 1.75,
      color: "#6b7280",
    });
    var mouthY = topY + carL / 2 + 0.5;
    obstacles.push({ kind: "cone", x: bayX - bayLat / 2 - 0.12, y: mouthY, r: 0.28 });
    obstacles.push({ kind: "cone", x: bayX + bayLat / 2 + 0.12, y: mouthY, r: 0.28 });

    var spawnX = Math.min(worldW - 5.5, rightFlankX + occupiedPitch * 0.55);
    return {
      id: opts.id,
      name: opts.name,
      mode: "Park in",
      short: opts.short,
      tip: opts.tip,
      worldW: worldW,
      worldH: worldH,
      walls: borders(worldW, worldH),
      markings: { bays: bays },
      obstacles: obstacles,
      spawn: { x: spawnX, y: aisleY, angle: PI },
      target: {
        x: bayX,
        y: topY,
        w: bayDepth,
        h: bayLat,
        angle: -PI / 2,
        angleTol: opts.angleTol || 0.16,
        speedMax: opts.speedMax || 0.48,
        coverFrac: opts.coverFrac || 0.82,
      },
      maxBumps: opts.maxBumps || 5,
      noseIn: {
        bayLat: bayLat,
        aisleClear: aisleClear,
        flankMargin: flankMargin,
      },
    };
  }

  var noseInLevels = [
    makeNoseInLevel({
      id: "nosein-aisle-easy",
      name: "25 · Nose-in from aisle",
      short: "Drive along the aisle at 90° to the bays, then nose into the open spot.",
      tip: "You start parallel to the rows. Turn into the open bay nose-first.",
      bayLat: 2.55,
      aisleClear: 7.2,
      flankMargin: 0.35,
      angleTol: 0.18,
      speedMax: 0.52,
      coverFrac: 0.78,
    }),
    makeNoseInLevel({
      id: "nosein-aisle-medium",
      name: "26 · Nose-in tighter aisle",
      short: "Same 90° nose-in, but the aisle between rows is tighter.",
      tip: "Plan the turn earlier — less room to swing between the rows.",
      bayLat: 2.4,
      aisleClear: 6.2,
      flankMargin: 0.3,
      angleTol: 0.17,
      speedMax: 0.5,
    }),
    makeNoseInLevel({
      id: "nosein-aisle-narrow-bay",
      name: "27 · Nose-in narrow bay",
      short: "Narrower bay width; keep the car centered as you nose in.",
      tip: "Straighten early so you do not clip the cars on either side.",
      bayLat: 2.22,
      aisleClear: 5.8,
      flankMargin: 0.26,
      angleTol: 0.15,
      speedMax: 0.48,
    }),
    makeNoseInLevel({
      id: "nosein-aisle-tight-rows",
      name: "28 · Nose-in tight rows",
      short: "Tight aisle between rows and a slim bay.",
      tip: "One clean arc — too wide and you hit the opposite row.",
      bayLat: 2.1,
      aisleClear: 5.2,
      flankMargin: 0.22,
      angleTol: 0.14,
      speedMax: 0.45,
      coverFrac: 0.84,
    }),
    makeNoseInLevel({
      id: "nosein-aisle-hard",
      name: "29 · Nose-in squeeze",
      short: "Very narrow bay and a squeezed aisle.",
      tip: "Feather the throttle; tiny steering corrections only.",
      bayLat: 1.98,
      aisleClear: 4.7,
      flankMargin: 0.18,
      angleTol: 0.13,
      speedMax: 0.42,
      coverFrac: 0.86,
    }),
    makeNoseInLevel({
      id: "nosein-aisle-expert",
      name: "30 · Nose-in expert lot",
      short: "Minimal bay width and the tightest aisle in the lot.",
      tip: "Commit to the line early. Almost no room to recover mid-turn.",
      bayLat: 1.9,
      aisleClear: 4.3,
      flankMargin: 0.15,
      angleTol: 0.12,
      speedMax: 0.4,
      coverFrac: 0.88,
      maxBumps: 4,
    }),
  ];

  window.PARK_LEVELS = window.PARK_LEVELS.concat(noseInLevels);
})();

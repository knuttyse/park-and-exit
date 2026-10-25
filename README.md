# Park & Exit

A top-down 2D parking practice game. Learn to **park in** and **drive out** of parallel spots and bay spaces. Built as a static site for [GitHub Pages](https://pages.github.com/) — no build step, no frameworks.

## Play locally

Open `index.html` in a modern browser, or serve the folder:

```bash
# any static server, e.g.
python3 -m http.server 8080 --directory .
# then visit http://localhost:8080
```

## Controls

| Input | Action |
|--------|--------|
| **← → / A D** | **Steer** (steering wheel only — not camera) |
| ↑ / W | Accelerate |
| ↓ / S | Brake / reverse |
| Space | Handbrake |
| R | Restart level |

The camera is chase-style: your car stays centered and the **front of the car always points to the top of the screen**. The parking lot rotates around you. HUD and menus stay fixed.

On touch devices, on-screen buttons appear for steer, throttle, and handbrake.

## Vehicles

Generic names only (no trademarks):

1. **City hatch** — small compact, easiest
2. **Family wagon** — **default / your car** — mid-size estate (2015-era touring wagon proportions)
3. **City sedan** — mid-size sedan
4. **Delivery van** — taller / longer
5. **Box lorry** — large rigid truck, hardest

## Levels

30 levels with rising difficulty: parallel in/out (vehicle-scaled minimal bay + curb flush), perpendicular / angle park & exit, nose-in aisle exercises (90° approach), narrow lanes, and wagon/lorry challenges.

Parallel park targets are sized from the selected car (~20% length and ~6% width clearance). Parallel **curbs** only stop the wheels from rolling onto the sidewalk — they never count as bumps (walls and other cars still do). An on-screen arrow points to the TARGET/EXIT when it is off-camera.


## GitHub Pages

1. Create a repository (e.g. `parking-game`) and push this folder’s contents to the default branch.
2. Settings → Pages → deploy from branch → `/` (root).
3. The empty `.nojekyll` file tells Pages not to process the site with Jekyll.

Suggested remote user: `knuttyse` (publishing is left to you).

## Files

```
index.html
css/style.css
js/vehicles.js
js/levels.js
js/hints.js
js/game.js
README.md
.nojekyll
```

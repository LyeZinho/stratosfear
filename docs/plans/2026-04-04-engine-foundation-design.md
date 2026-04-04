# Air Strike Engine — Foundation Design

**Date**: 2026-04-04  
**Phase**: 1 — Engine Foundation  
**Platform**: Rust + SDL2 (Windows / Linux)  
**Approach**: Opção A — SDL2 + std::thread tile fetching

---

## Overview

Build the foundational layer of the **Air Strike Engine (ASE)** — a Rust desktop application using SDL2 for rendering. This phase produces a navigable geolocation map with OSM tile streaming, correct Mercator projection, and a responsive camera. No gameplay logic in this phase.

The goal is a runnable window where the developer can pan and zoom a real-world map, establishing the coordinate system and rendering pipeline that all future gameplay systems will build upon.

---

## Architecture

### Crate Stack

| Crate | Version | Purpose |
|---|---|---|
| `sdl2` | `0.37` | Window, renderer, events, 2D drawing |
| `sdl2` features | `image`, `ttf` | PNG tile loading, monospace HUD font |
| `glam` | `0.24` | Vec2/Vec3 math, coordinate transforms |
| `ureq` | `2` | Synchronous HTTP for OSM tile fetching |
| `image` | `0.25` | PNG decode before SDL2 texture upload |
| `serde` + `serde_json` | `1` | Aircraft/missile specs from JSON data files |

No async runtime (no Tokio). Tile fetching runs in `std::thread` worker threads and sends loaded tiles back to the main thread via `std::sync::mpsc` channel.

---

## Module Structure

```
air_strike/
├── Cargo.toml
├── assets/
│   ├── fonts/
│   │   └── JetBrainsMono-Regular.ttf   # HUD monospace font
│   └── svgs/                            # NATO tactical symbols (future phases)
└── src/
    ├── main.rs              # SDL2 init, game loop, event dispatch
    ├── core/
    │   └── geo.rs           # Mercator projection: lat/lon ↔ world pixels
    └── ui/
        ├── camera.rs        # Camera state: pan, zoom, world↔screen transforms
        └── tile_manager.rs  # Tile coords, disk cache, HTTP fetch, SDL2 texture cache
```

---

## Core Systems

### 1. Mercator Projection (`core/geo.rs`)

Converts geographic coordinates (lat, lon) to world-space pixels at a given zoom level. Each tile is 256×256 pixels.

```
world_x = ((lon + 180) / 360) × (256 × 2^zoom)
world_y = ((1 - ln(tan(lat_rad) + sec(lat_rad)) / π) / 2) × (256 × 2^zoom)
```

Inverse (pixel → lat/lon) implemented for mouse picking. Both directions use `f64` to preserve geographic precision.

### 2. Camera (`ui/camera.rs`)

Holds `center: (f64, f64)` in world-pixel space and `zoom: u32` (3–12).

- **Pan**: mouse button held + drag → translate `center` by delta pixels
- **Zoom**: scroll wheel → increment/decrement zoom, re-center on cursor position
- **world_to_screen(world_pos) → screen_pos**: subtracts camera center, offsets by window half-size
- **screen_to_world(screen_pos) → world_pos**: inverse of above

### 3. Tile Manager (`ui/tile_manager.rs`)

**Tile addressing**: OSM slippy map standard `{zoom}/{x}/{y}.png`.

**Cache path**: `~/.cache/airstrike/tiles/{zoom}/{x}/{y}.png`

**Render loop**:
1. Compute visible tile range from camera bounds
2. For each visible tile:
   - If SDL2 texture cached in `HashMap<TileCoords, Texture>` → draw immediately
   - Else if file exists on disk → load PNG, upload texture, cache
   - Else → dispatch to thread pool (if not already in-flight)
3. Thread pool: up to 4 concurrent `std::thread` workers fetching `https://tile.openstreetmap.org/{z}/{x}/{y}.png`
4. Completed tiles arrive via `mpsc::Receiver<(TileCoords, Vec<u8>)>` → decode → upload texture → cache

**Fallback**: while a tile is loading, draw a dark `#1a1a2e` rectangle in its place (no blank white flash).

### 4. Game Loop (`main.rs`)

```
loop {
    // 1. Poll SDL2 events (quit, keyboard, mouse)
    // 2. Update camera state from input
    // 3. Drain tile receiver channel
    // 4. canvas.clear()
    // 5. Draw tiles
    // 6. Draw coordinate grid overlay
    // 7. Draw debug HUD (zoom level, center lat/lon, FPS)
    // 8. canvas.present()
    // 9. Sleep to cap at 60 FPS
}
```

---

## Coordinate Grid Overlay

A subtle radar-style grid drawn over the tile layer:
- Latitude lines every ~5° (spacing in pixels depends on zoom)
- Longitude lines every ~5°
- Color: `rgba(0, 255, 100, 40)` — dim green, military terminal aesthetic
- Labels at intersections showing "LAT°N / LON°E"

---

## Debug HUD (Phase 1 Only)

Top-left corner, monospace font, dark background:
```
ZOOM: 7   FPS: 60
LAT: 38.716° LON: -9.142°
TILES: 12 loaded / 3 pending
```

---

## Initial Camera Position

Default: **Lisbon, Portugal** (lat 38.716, lon -9.142), zoom 7. This can be overridden via a future `config.json`.

---

## Cross-Platform Considerations

- SDL2 dynamic libs bundled for Windows (`sdl2.dll`, `sdl2_image.dll`, `sdl2_ttf.dll`)
- Linux: SDL2 installed via system package manager (`libsdl2-dev`)
- OSM tile URL is same on both platforms
- Cache path uses `dirs` crate for platform-appropriate `~/.cache` equivalent

---

## Out of Scope (Phase 1)

- Aircraft entities, physics, radar
- HUD panels (resources, mission log)
- AI, missiles, ground units
- Game state / Zustand equivalent
- SVG rendering of NATO symbols
- Audio

---

## Success Criteria

- [ ] Window opens at 1280×720 without crash
- [ ] OSM tiles load and display correctly (world map visible)
- [ ] Pan: drag with left mouse button moves the map smoothly
- [ ] Zoom: scroll wheel zooms in/out (levels 3–12), centered on cursor
- [ ] Tiles cached to disk on first load, served from cache on restart
- [ ] Grid overlay visible
- [ ] Debug HUD shows correct zoom, lat/lon, tile count
- [ ] Runs on both Linux and Windows (cross-compile or native)
- [ ] 60 FPS stable with 20+ tiles on screen

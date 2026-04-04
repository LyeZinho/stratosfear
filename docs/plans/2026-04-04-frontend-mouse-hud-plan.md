# Frontend Mouse & HUD Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers/executing-plans to implement this plan task-by-task.

**Goal:** Add full mouse interaction to all menus and the in-game map, backed by a standardised HudPanel rendering system.

**Architecture:** New `ui/hud.rs` module provides a generic `HudPanel` + `render_hud_panel`. A `Selection` enum on the game loop tracks what is selected. Menus gain `hovered_index` + mouse hit-test methods. Map clicks resolve to aircraft or airport selection and render the appropriate panel.

**Tech Stack:** Rust, SDL2 (sdl2 crate), no new dependencies.

---

## Task 1: Create `ui/hud.rs` with HudPanel types

**Files:**
- Create: `stratosphere/src/ui/hud.rs`

**Step 1: Write the file**

```rust
use sdl2::pixels::Color;
use sdl2::rect::Rect;
use sdl2::render::{Canvas, TextureCreator};
use sdl2::ttf::Font;
use sdl2::video::{Window, WindowContext};

pub enum HudAction {
    Dispatch(u32),
    Close,
}

pub enum HudRow {
    KeyValue(String, String),
    Separator,
    Button { label: String, action: HudAction },
    ListItem { text: String, id: u32 },
}

pub struct HudPanel {
    pub x: i32,
    pub y: i32,
    pub width: u32,
    pub title: String,
    pub rows: Vec<HudRow>,
}

pub fn render_hud_panel(
    canvas: &mut Canvas<Window>,
    tc: &TextureCreator<WindowContext>,
    font: &Font,
    panel: &HudPanel,
) -> Result<(), String> {
    let line_h = 18i32;
    let padding = 6i32;
    let title_h = 20i32;
    let panel_h = (title_h + panel.rows.len() as i32 * line_h + padding * 2) as u32;

    canvas.set_draw_color(Color::RGBA(0, 0, 0, 200));
    canvas.fill_rect(Rect::new(panel.x, panel.y, panel.width, panel_h))?;

    canvas.set_draw_color(Color::RGB(0, 120, 180));
    canvas.fill_rect(Rect::new(panel.x, panel.y, panel.width, title_h as u32))?;

    render_text(canvas, tc, font, &panel.title, Color::RGB(255, 255, 255), panel.x + padding, panel.y + 3)?;

    for (i, row) in panel.rows.iter().enumerate() {
        let row_y = panel.y + title_h + padding + i as i32 * line_h;
        match row {
            HudRow::KeyValue(key, val) => {
                let text = format!("{:<10} {}", key, val);
                render_text(canvas, tc, font, &text, Color::RGB(0, 220, 120), panel.x + padding, row_y)?;
            }
            HudRow::Separator => {
                canvas.set_draw_color(Color::RGBA(80, 80, 80, 255));
                canvas.draw_line(
                    (panel.x + padding, row_y + line_h / 2),
                    (panel.x + panel.width as i32 - padding, row_y + line_h / 2),
                )?;
            }
            HudRow::Button { label, .. } => {
                canvas.set_draw_color(Color::RGBA(0, 80, 120, 220));
                canvas.fill_rect(Rect::new(panel.x + padding, row_y, panel.width - padding as u32 * 2, (line_h - 2) as u32))?;
                render_text(canvas, tc, font, label, Color::RGB(0, 255, 180), panel.x + padding + 4, row_y + 1)?;
            }
            HudRow::ListItem { text, .. } => {
                render_text(canvas, tc, font, &format!("> {}", text), Color::RGB(0, 180, 255), panel.x + padding, row_y)?;
            }
        }
    }

    Ok(())
}

fn render_text(
    canvas: &mut Canvas<Window>,
    tc: &TextureCreator<WindowContext>,
    font: &Font,
    text: &str,
    color: Color,
    x: i32,
    y: i32,
) -> Result<(), String> {
    if text.is_empty() {
        return Ok(());
    }
    let surf = font.render(text).blended(color).map_err(|e| e.to_string())?;
    let tex = tc.create_texture_from_surface(&surf).map_err(|e| e.to_string())?;
    let sdl2::render::TextureQuery { width, height, .. } = tex.query();
    canvas.copy(&tex, None, Some(Rect::new(x, y, width, height)))?;
    Ok(())
}
```

**Step 2: Verify it compiles**

Run: `cargo check -p stratosphere`
Expected: error about `hud` not being declared in `ui/mod.rs` (expected — module not exported yet)

---

## Task 2: Export `hud` from `ui/mod.rs`

**Files:**
- Modify: `stratosphere/src/ui/mod.rs`

**Step 1: Add the export**

Replace the file content with:

```rust
pub mod airport_layer;
pub mod hud;
pub mod hud_panels;
```

**Step 2: Verify**

Run: `cargo check -p stratosphere`
Expected: PASS (hud module now compiles)

**Step 3: Commit**

```bash
git add stratosphere/src/ui/hud.rs stratosphere/src/ui/mod.rs
git commit -m "feat: add HudPanel system to ui/hud"
```

---

## Task 3: Add `Selection` enum and field to `main.rs`

**Files:**
- Modify: `stratosphere/src/main.rs`

**Step 1: Add the `Selection` enum after the `Scene` enum (after line 54)**

Add immediately after the `Scene` enum block:

```rust
#[derive(PartialEq)]
enum Selection {
    None,
    Aircraft(u32),
    Airport(String),
}
```

**Step 2: Add `selection` and `drag_distance` fields in `main()`**

After `let mut current_mouse: (i32, i32) = (0, 0);` (line 97), add:

```rust
let mut selection = Selection::None;
let mut drag_start: (i32, i32) = (0, 0);
```

**Step 3: Verify**

Run: `cargo check -p stratosphere`
Expected: PASS

---

## Task 4: Mouse interaction for `MainMenu`

**Files:**
- Modify: `stratosphere/src/scenes/main_menu.rs`

**Step 1: Write the failing test first**

Add to the `#[cfg(test)]` block at the bottom:

```rust
#[test]
fn test_mouse_move_sets_hovered_index() {
    let mut menu = MainMenu::new();
    // item 0 is at y=300, item 1 at y=340, item 2 at y=380
    // window center at x=640
    menu.handle_mouse_move(640, 300, 1280);
    assert_eq!(menu.hovered_index, Some(0));
}

#[test]
fn test_mouse_click_returns_action() {
    let mut menu = MainMenu::new();
    let action = menu.handle_mouse_click(640, 300, 1280);
    assert!(matches!(action, Some(MenuAction::GoToModeSelect)));
}

#[test]
fn test_mouse_outside_items_clears_hover() {
    let mut menu = MainMenu::new();
    menu.handle_mouse_move(640, 10, 1280);
    assert_eq!(menu.hovered_index, None);
}
```

Run: `cargo test -p stratosphere`
Expected: FAIL (hovered_index field doesn't exist)

**Step 2: Add `hovered_index` field and methods**

Replace the struct and impl:

```rust
pub enum MenuAction {
    GoToModeSelect,
    GoToSettings,
    Quit,
    None,
}

pub struct MainMenu {
    pub selected: usize,
    pub hovered_index: Option<usize>,
    items: [&'static str; 3],
}

impl MainMenu {
    pub fn new() -> Self {
        MainMenu {
            selected: 0,
            hovered_index: None,
            items: ["PLAY", "SETTINGS", "QUIT"],
        }
    }

    pub fn move_down(&mut self) {
        self.selected = (self.selected + 1) % self.items.len();
    }

    pub fn move_up(&mut self) {
        self.selected = (self.selected + self.items.len() - 1) % self.items.len();
    }

    pub fn confirm(&self) -> MenuAction {
        match self.selected {
            0 => MenuAction::GoToModeSelect,
            1 => MenuAction::GoToSettings,
            2 => MenuAction::Quit,
            _ => MenuAction::None,
        }
    }

    pub fn items(&self) -> &[&'static str] {
        &self.items
    }

    pub fn handle_mouse_move(&mut self, mx: i32, my: i32, window_w: i32) {
        self.hovered_index = self.hit_index(mx, my, window_w);
    }

    pub fn handle_mouse_click(&mut self, mx: i32, my: i32, window_w: i32) -> Option<MenuAction> {
        if let Some(i) = self.hit_index(mx, my, window_w) {
            self.selected = i;
            Some(self.confirm())
        } else {
            None
        }
    }

    fn hit_index(&self, mx: i32, my: i32, window_w: i32) -> Option<usize> {
        for i in 0..self.items.len() {
            let item_y = 300 + i as i32 * 40;
            if (my - item_y).abs() <= 16 {
                // approximate centered text width: 8px per char
                let text_w = self.items[i].len() as i32 * 8;
                let x_start = (window_w - text_w) / 2 - 8;
                let x_end = (window_w + text_w) / 2 + 8;
                if mx >= x_start && mx <= x_end {
                    return Some(i);
                }
            }
        }
        None
    }
}
```

**Step 3: Run tests**

Run: `cargo test -p stratosphere scenes::main_menu`
Expected: PASS

**Step 4: Commit**

```bash
git add stratosphere/src/scenes/main_menu.rs
git commit -m "feat: add mouse hover/click to MainMenu"
```

---

## Task 5: Mouse interaction for `ModeSelect`

**Files:**
- Modify: `stratosphere/src/scenes/mode_select.rs`

**Step 1: Write failing tests**

Add to the file (create a `#[cfg(test)]` block):

```rust
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_hover_first_item() {
        let mut ms = ModeSelect::new();
        ms.handle_mouse_move(640, 300, 1280);
        assert_eq!(ms.hovered_index, Some(0));
    }

    #[test]
    fn test_click_sandbox_returns_action() {
        let mut ms = ModeSelect::new();
        let action = ms.handle_mouse_click(640, 300, 1280);
        assert!(matches!(action, Some(ModeSelectAction::GoToSandboxSettings)));
    }
}
```

Run: `cargo test -p stratosphere scenes::mode_select`
Expected: FAIL

**Step 2: Add hovered_index and methods**

Replace the full file:

```rust
pub enum ModeSelectAction {
    GoToSandboxSettings,
    Back,
    None,
}

pub struct ModeSelect {
    pub selected: usize,
    pub hovered_index: Option<usize>,
}

impl ModeSelect {
    pub fn new() -> Self {
        ModeSelect { selected: 0, hovered_index: None }
    }

    pub fn move_down(&mut self) {
        self.selected = (self.selected + 1) % 3;
    }

    pub fn move_up(&mut self) {
        self.selected = (self.selected + 2) % 3;
    }

    pub fn confirm(&self) -> ModeSelectAction {
        match self.selected {
            0 => ModeSelectAction::GoToSandboxSettings,
            _ => ModeSelectAction::None,
        }
    }

    pub fn items(&self) -> [&'static str; 3] {
        ["SANDBOX", "CAREER", "MULTIPLAYER"]
    }

    pub fn handle_mouse_move(&mut self, mx: i32, my: i32, window_w: i32) {
        self.hovered_index = self.hit_index(mx, my, window_w);
    }

    pub fn handle_mouse_click(&mut self, mx: i32, my: i32, window_w: i32) -> Option<ModeSelectAction> {
        if let Some(i) = self.hit_index(mx, my, window_w) {
            self.selected = i;
            Some(self.confirm())
        } else {
            None
        }
    }

    fn hit_index(&self, mx: i32, my: i32, window_w: i32) -> Option<usize> {
        let items = self.items();
        for i in 0..items.len() {
            let item_y = 300 + i as i32 * 40;
            if (my - item_y).abs() <= 16 {
                let text_w = items[i].len() as i32 * 8;
                let x_start = (window_w - text_w) / 2 - 8;
                let x_end = (window_w + text_w) / 2 + 8;
                if mx >= x_start && mx <= x_end {
                    return Some(i);
                }
            }
        }
        None
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_hover_first_item() {
        let mut ms = ModeSelect::new();
        ms.handle_mouse_move(640, 300, 1280);
        assert_eq!(ms.hovered_index, Some(0));
    }

    #[test]
    fn test_click_sandbox_returns_action() {
        let mut ms = ModeSelect::new();
        let action = ms.handle_mouse_click(640, 300, 1280);
        assert!(matches!(action, Some(ModeSelectAction::GoToSandboxSettings)));
    }
}
```

**Step 3: Run tests**

Run: `cargo test -p stratosphere scenes::mode_select`
Expected: PASS

**Step 4: Commit**

```bash
git add stratosphere/src/scenes/mode_select.rs
git commit -m "feat: add mouse hover/click to ModeSelect"
```

---

## Task 6: Mouse interaction for `SandboxSettings`

**Files:**
- Modify: `stratosphere/src/scenes/sandbox_settings.rs`

**Step 1: Write failing tests**

Add to the `#[cfg(test)]` block (create one if it doesn't exist):

```rust
#[cfg(test)]
mod tests {
    use super::*;

    fn make_settings() -> SandboxSettings {
        SandboxSettings {
            country_list: vec![
                ("PT".into(), "Portugal".into()),
                ("ES".into(), "Spain".into()),
                ("FR".into(), "France".into()),
            ],
            selected_country: 0,
            starting_credits: 100_000,
        }
    }

    #[test]
    fn test_hover_sets_index() {
        let mut ss = make_settings();
        // item 0 is at y=160, item 1 at y=182
        ss.handle_mouse_move(640, 160, 1280);
        assert_eq!(ss.hovered_index, Some(0));
    }

    #[test]
    fn test_click_selects_country() {
        let mut ss = make_settings();
        ss.handle_mouse_click(640, 182, 1280);
        // visible start = 0, list_i=1 → actual_i=1
        assert_eq!(ss.selected_country, 1);
    }
}
```

Run: `cargo test -p stratosphere scenes::sandbox_settings`
Expected: FAIL

**Step 2: Add fields and methods to SandboxSettings**

Replace the full file:

```rust
use airstrike_engine::core::airport::AirportDb;

pub enum SandboxAction {
    StartGame {
        country_iso: String,
        starting_credits: u32,
    },
    Back,
    None,
}

pub struct SandboxSettings {
    pub country_list: Vec<(String, String)>,
    pub selected_country: usize,
    pub starting_credits: u32,
    pub hovered_index: Option<usize>,
}

impl SandboxSettings {
    pub fn new(db: &AirportDb) -> Self {
        let mut country_list = db.countries();
        country_list.sort_by(|a, b| a.1.cmp(&b.1));
        SandboxSettings {
            country_list,
            selected_country: 0,
            starting_credits: 100_000,
            hovered_index: None,
        }
    }

    pub fn move_down(&mut self) {
        if !self.country_list.is_empty() {
            self.selected_country = (self.selected_country + 1) % self.country_list.len();
        }
    }

    pub fn move_up(&mut self) {
        if !self.country_list.is_empty() {
            self.selected_country =
                (self.selected_country + self.country_list.len() - 1) % self.country_list.len();
        }
    }

    pub fn confirm(&self) -> SandboxAction {
        if let Some((iso, _)) = self.country_list.get(self.selected_country) {
            SandboxAction::StartGame {
                country_iso: iso.clone(),
                starting_credits: self.starting_credits,
            }
        } else {
            SandboxAction::None
        }
    }

    pub fn selected_country_iso(&self) -> Option<&str> {
        self.country_list
            .get(self.selected_country)
            .map(|(iso, _)| iso.as_str())
    }

    pub fn handle_mouse_move(&mut self, mx: i32, my: i32, window_w: i32) {
        self.hovered_index = self.hit_index(mx, my, window_w);
    }

    pub fn handle_mouse_click(&mut self, mx: i32, my: i32, window_w: i32) {
        if let Some(list_i) = self.hit_index(mx, my, window_w) {
            let visible = 12usize;
            let start = self.selected_country.saturating_sub(visible / 2);
            let actual_i = start + list_i;
            if actual_i < self.country_list.len() {
                self.selected_country = actual_i;
            }
        }
    }

    fn hit_index(&self, mx: i32, my: i32, window_w: i32) -> Option<usize> {
        let visible = 12usize;
        let start = self.selected_country.saturating_sub(visible / 2);
        let end = (start + visible).min(self.country_list.len());
        for list_i in 0..(end - start) {
            let item_y = 160 + list_i as i32 * 22;
            if (my - item_y).abs() <= 10 {
                let iso = &self.country_list[start + list_i].0;
                let text_w = iso.len() as i32 * 8;
                let x_start = (window_w - text_w) / 2 - 8;
                let x_end = (window_w + text_w) / 2 + 8;
                if mx >= x_start && mx <= x_end {
                    return Some(list_i);
                }
            }
        }
        None
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn make_settings() -> SandboxSettings {
        SandboxSettings {
            country_list: vec![
                ("PT".into(), "Portugal".into()),
                ("ES".into(), "Spain".into()),
                ("FR".into(), "France".into()),
            ],
            selected_country: 0,
            starting_credits: 100_000,
            hovered_index: None,
        }
    }

    #[test]
    fn test_hover_sets_index() {
        let mut ss = make_settings();
        ss.handle_mouse_move(640, 160, 1280);
        assert_eq!(ss.hovered_index, Some(0));
    }

    #[test]
    fn test_click_selects_country() {
        let mut ss = make_settings();
        ss.handle_mouse_click(640, 182, 1280);
        assert_eq!(ss.selected_country, 1);
    }
}
```

**Step 3: Run tests**

Run: `cargo test -p stratosphere scenes::sandbox_settings`
Expected: PASS

**Step 4: Commit**

```bash
git add stratosphere/src/scenes/sandbox_settings.rs
git commit -m "feat: add mouse hover/click to SandboxSettings"
```

---

## Task 7: Wire mouse events for menus in `main.rs`

**Files:**
- Modify: `stratosphere/src/main.rs`

**Step 1: Add MouseMotion handler to MainMenu scene block**

In the `Scene::MainMenu(menu)` match arm (around line 119), add inside the match:

```rust
Event::MouseMotion { x, y, .. } => {
    menu.handle_mouse_move(x, y, WINDOW_W as i32);
}
Event::MouseButtonDown {
    mouse_btn: MouseButton::Left,
    x,
    y,
    ..
} => match menu.handle_mouse_click(x, y, WINDOW_W as i32) {
    Some(MenuAction::GoToModeSelect) => {
        scene = Scene::ModeSelect(ModeSelect::new());
    }
    Some(MenuAction::Quit) => break 'running,
    _ => {}
},
```

**Step 2: Add MouseMotion handler to ModeSelect scene block**

In the `Scene::ModeSelect(ms)` match arm (around line 145):

```rust
Event::MouseMotion { x, y, .. } => {
    ms.handle_mouse_move(x, y, WINDOW_W as i32);
}
Event::MouseButtonDown {
    mouse_btn: MouseButton::Left,
    x,
    y,
    ..
} => {
    if let Some(ModeSelectAction::GoToSandboxSettings) = ms.handle_mouse_click(x, y, WINDOW_W as i32) {
        let settings = SandboxSettings::new(&airport_db);
        scene = Scene::SandboxSettings(settings);
    }
}
```

**Step 3: Add MouseMotion and MouseButtonDown to SandboxSettings scene block**

In the `Scene::SandboxSettings(ss)` match arm (around line 172):

```rust
Event::MouseMotion { x, y, .. } => {
    ss.handle_mouse_move(x, y, WINDOW_W as i32);
}
Event::MouseButtonDown {
    mouse_btn: MouseButton::Left,
    x,
    y,
    ..
} => {
    ss.handle_mouse_click(x, y, WINDOW_W as i32);
}
```

**Step 4: Update render functions to use hovered_index**

In `render_main_menu` (around line 487), change the color selection to:

```rust
let color = if menu.selected == i || menu.hovered_index == Some(i) {
    Color::RGB(0, 255, 100)
} else {
    Color::RGB(0, 100, 50)
};
```

Apply the same pattern to `render_mode_select` (around line 514):

```rust
let color = if ms.selected == i || ms.hovered_index == Some(i) {
    Color::RGB(0, 255, 100)
} else {
    Color::RGB(0, 100, 50)
};
```

And `render_sandbox_settings` (around line 546):

```rust
let color = if ss.selected_country == actual_i || ss.hovered_index == Some(list_i) {
    Color::RGB(0, 255, 100)
} else {
    Color::RGB(0, 100, 50)
};
```

**Step 5: Verify**

Run: `cargo check -p stratosphere`
Expected: PASS

**Step 6: Commit**

```bash
git add stratosphere/src/main.rs
git commit -m "feat: wire mouse events for all menu scenes"
```

---

## Task 8: Map click → Selection (aircraft + airport hit-testing)

**Files:**
- Modify: `stratosphere/src/main.rs`

**Step 1: Add drag detection to MouseButtonDown in InGame**

The existing `MouseButtonDown` handler sets `mouse_down = true` and `last_mouse`. Update it to also save `drag_start`:

```rust
Event::MouseButtonDown {
    mouse_btn: MouseButton::Left,
    x,
    y,
    ..
} => {
    mouse_down = true;
    last_mouse = (x, y);
    current_mouse = (x, y);
    drag_start = (x, y);
}
```

**Step 2: Add click-to-select in MouseButtonUp in InGame**

Replace the existing `MouseButtonUp` handler:

```rust
Event::MouseButtonUp {
    mouse_btn: MouseButton::Left,
    x,
    y,
    ..
} => {
    mouse_down = false;
    let drag_dist = (((x - drag_start.0).pow(2) + (y - drag_start.1).pow(2)) as f32).sqrt();
    if drag_dist < 5.0 {
        selection = hit_test_map(x, y, &world, &camera);
    }
}
```

**Step 3: Add the `hit_test_map` free function at the bottom of `main.rs`**

```rust
fn hit_test_map(
    sx: i32,
    sy: i32,
    world: &simulation::world::World,
    camera: &airstrike_engine::ui::camera::Camera,
) -> Selection {
    use airstrike_engine::core::geo;

    for ac in &world.aircraft {
        if matches!(ac.phase, airstrike_engine::core::aircraft::FlightPhase::Destroyed) {
            continue;
        }
        if ac.side == airstrike_engine::core::aircraft::Side::Hostile && !ac.is_visible() {
            continue;
        }
        let (wx, wy) = geo::lat_lon_to_world(ac.lat, ac.lon, camera.zoom);
        let (asx, asy) = camera.world_to_screen(wx, wy);
        let dist = (((sx as f32 - asx).powi(2) + (sy as f32 - asy).powi(2)) as f32).sqrt();
        if dist < 12.0 {
            return Selection::Aircraft(ac.id);
        }
    }

    for airport in &world.airports {
        if !ui::airport_layer::should_render(airport, camera) {
            continue;
        }
        let (wx, wy) = geo::lat_lon_to_world(airport.lat, airport.lon, camera.zoom);
        let (asx, asy) = camera.world_to_screen(wx, wy);
        let radius = (ui::airport_layer::dot_size(airport) + 6) as f32;
        let dist = (((sx as f32 - asx).powi(2) + (sy as f32 - asy).powi(2)) as f32).sqrt();
        if dist < radius {
            return Selection::Airport(airport.icao.clone());
        }
    }

    Selection::None
}
```

**Step 4: Escape clears selection in InGame**

In the `Escape` handler inside `Scene::InGame`:

```rust
Event::KeyDown {
    keycode: Some(Keycode::Escape),
    ..
} => {
    if selection != Selection::None {
        selection = Selection::None;
    } else {
        scene = Scene::MainMenu(MainMenu::new());
    }
}
```

**Step 5: Verify**

Run: `cargo check -p stratosphere`
Expected: PASS

**Step 6: Commit**

```bash
git add stratosphere/src/main.rs
git commit -m "feat: map click hit-testing for aircraft and airports"
```

---

## Task 9: Render aircraft info panel

**Files:**
- Modify: `stratosphere/src/main.rs`

**Step 1: Add a helper to build the aircraft HudPanel**

Add this free function at the bottom of `main.rs`:

```rust
fn build_aircraft_panel(
    ac: &airstrike_engine::core::aircraft::Aircraft,
) -> ui::hud::HudPanel {
    use airstrike_engine::core::aircraft::FlightPhase;
    use ui::hud::{HudPanel, HudRow};

    let phase_str = match &ac.phase {
        FlightPhase::ColdDark => "Cold & Dark".into(),
        FlightPhase::Preflight { elapsed_s, required_s } => {
            format!("Preflight {:.0}/{:.0}s", elapsed_s, required_s)
        }
        FlightPhase::Taxiing { .. } => "Taxiing".into(),
        FlightPhase::TakeoffRoll { .. } => "Takeoff Roll".into(),
        FlightPhase::Climbing { target_alt_ft } => format!("Climbing → {:.0}ft", target_alt_ft),
        FlightPhase::EnRoute => "En Route".into(),
        FlightPhase::Landing { .. } => "Landing".into(),
        FlightPhase::Landed => "Landed".into(),
        FlightPhase::Destroyed => "Destroyed".into(),
        _ => "Unknown".into(),
    };

    HudPanel {
        x: WINDOW_W as i32 - 230,
        y: 10,
        width: 220,
        title: ac.callsign.clone(),
        rows: vec![
            HudRow::KeyValue("Model".into(), ac.model.clone()),
            HudRow::KeyValue("Phase".into(), phase_str),
            HudRow::KeyValue("Altitude".into(), format!("{:.0} ft", ac.altitude_ft)),
            HudRow::KeyValue("Speed".into(), format!("{:.0} kts", ac.speed_knots)),
            HudRow::KeyValue("Heading".into(), format!("{:.0}°", ac.heading_deg)),
        ],
    }
}
```

**Step 2: Render the panel in the InGame render block**

Inside the `Scene::InGame` render block (after `render_brevity_log` call, around line 374), add:

```rust
if let Selection::Aircraft(id) = &selection {
    if let Some(ac) = world.aircraft.iter().find(|a| &a.id == id) {
        let panel = build_aircraft_panel(ac);
        ui::hud::render_hud_panel(&mut canvas, texture_creator, &font, &panel)?;
    }
}
```

**Step 3: Verify**

Run: `cargo check -p stratosphere`
Expected: PASS

**Step 4: Commit**

```bash
git add stratosphere/src/main.rs
git commit -m "feat: render aircraft info panel on selection"
```

---

## Task 10: Render airport info + dispatch panel

**Files:**
- Modify: `stratosphere/src/main.rs`

**Step 1: Add the airport panel builder function**

```rust
fn build_airport_panel(
    airport: &airstrike_engine::core::airport::Airport,
    aircraft: &[airstrike_engine::core::aircraft::Aircraft],
) -> ui::hud::HudPanel {
    use airstrike_engine::core::aircraft::FlightPhase;
    use airstrike_engine::core::airport::AirportType;
    use ui::hud::{HudAction, HudPanel, HudRow};

    let type_str = match airport.airport_type {
        AirportType::Large => "Large",
        AirportType::Medium => "Medium",
        AirportType::Small => "Small",
        AirportType::Other => "Other",
    };

    let mut rows = vec![
        HudRow::KeyValue("ICAO".into(), airport.icao.clone()),
        HudRow::KeyValue("Type".into(), type_str.into()),
        HudRow::KeyValue("Elevation".into(), format!("{:.0} ft", airport.elevation_ft)),
        HudRow::Separator,
    ];

    let cold_dark: Vec<_> = aircraft
        .iter()
        .filter(|ac| {
            ac.home_airport_icao == airport.icao
                && matches!(ac.phase, FlightPhase::ColdDark)
        })
        .collect();

    if cold_dark.is_empty() {
        rows.push(HudRow::KeyValue("Dispatch".into(), "None available".into()));
    } else {
        for ac in cold_dark {
            rows.push(HudRow::Button {
                label: format!("{} — {}", ac.callsign, ac.model),
                action: HudAction::Dispatch(ac.id),
            });
        }
    }

    HudPanel {
        x: WINDOW_W as i32 - 230,
        y: 10,
        width: 220,
        title: format!("{} — {}", airport.icao, airport.name),
        rows,
    }
}
```

**Step 2: Render the airport panel and handle dispatch clicks**

In the InGame render block, add after the aircraft panel block:

```rust
if let Selection::Airport(icao) = &selection {
    if let Some(airport) = world.airports.iter().find(|a| &a.icao == icao) {
        let panel = build_airport_panel(airport, &world.aircraft);
        ui::hud::render_hud_panel(&mut canvas, texture_creator, &font, &panel)?;
    }
}
```

**Step 3: Handle dispatch clicks on the airport panel**

In the `MouseButtonDown` handler for `InGame` (the one that sets `drag_start`), BEFORE setting `drag_start`, check if the click lands on a dispatch button. Add just before the drag-related lines:

```rust
if let Selection::Airport(icao) = &selection.clone() {
    if let Some(airport) = world.airports.iter().find(|a| &a.icao == icao) {
        let panel = build_airport_panel(airport, &world.aircraft);
        if let Some(dispatch_id) = hit_test_panel_dispatch(&panel, x, y) {
            world.dispatch_aircraft(dispatch_id);
        }
    }
}
```

**Step 4: Add `hit_test_panel_dispatch` helper**

```rust
fn hit_test_panel_dispatch(panel: &ui::hud::HudPanel, mx: i32, my: i32) -> Option<u32> {
    use ui::hud::{HudAction, HudRow};

    let line_h = 18i32;
    let padding = 6i32;
    let title_h = 20i32;

    for (i, row) in panel.rows.iter().enumerate() {
        if let HudRow::Button { action: HudAction::Dispatch(id), .. } = row {
            let row_y = panel.y + title_h + padding + i as i32 * line_h;
            let btn_rect = sdl2::rect::Rect::new(
                panel.x + padding,
                row_y,
                panel.width - padding as u32 * 2,
                (line_h - 2) as u32,
            );
            if btn_rect.contains_point(sdl2::rect::Point::new(mx, my)) {
                return Some(*id);
            }
        }
    }
    None
}
```

**Step 5: Verify**

Run: `cargo check -p stratosphere`
Expected: PASS

**Step 6: Commit**

```bash
git add stratosphere/src/main.rs
git commit -m "feat: render airport dispatch panel and handle dispatch clicks"
```

---

## Task 11: Airport labels at zoom >= 9

**Files:**
- Modify: `stratosphere/src/ui/airport_layer.rs`

**Step 1: Update `draw_airports` to render labels**

The `show_label` function already exists. Add label rendering inside `draw_airports`:

After the dot rendering block (after `canvas.fill_rect`), add:

```rust
// Render label when zoomed in enough (zoom >= 9)
// Note: label rendering requires canvas + tc + font — signature must be extended
```

Actually, `draw_airports` does not currently accept `tc` or `font`. To keep things minimal, add an optional label string to the dot rendering rather than restructuring the function signature.

**Updated approach:** Add a separate `draw_airport_labels` function that accepts the full render context:

Add to `airport_layer.rs`:

```rust
pub fn draw_airport_labels(
    canvas: &mut Canvas<Window>,
    tc: &sdl2::render::TextureCreator<sdl2::video::WindowContext>,
    font: &sdl2::ttf::Font,
    airports: &[Airport],
    camera: &Camera,
) -> Result<(), String> {
    for airport in airports {
        if !show_label(airport, camera) {
            continue;
        }
        let (wx, wy) = geo::lat_lon_to_world(airport.lat, airport.lon, camera.zoom);
        let (sx, sy) = camera.world_to_screen(wx, wy);
        let surf = font
            .render(&airport.icao)
            .blended(sdl2::pixels::Color::RGB(0, 220, 220))
            .map_err(|e| e.to_string())?;
        let tex = tc
            .create_texture_from_surface(&surf)
            .map_err(|e| e.to_string())?;
        let sdl2::render::TextureQuery { width, height, .. } = tex.query();
        canvas.copy(
            &tex,
            None,
            Some(sdl2::rect::Rect::new(
                sx as i32 + dot_size(airport) as i32 + 2,
                sy as i32 - height as i32 / 2,
                width,
                height,
            )),
        )?;
    }
    Ok(())
}
```

**Step 2: Add the `TextureCreator` + `Font` imports to the file**

At the top of `airport_layer.rs`, the imports already have `Canvas` and `Window`. Add:

```rust
use sdl2::render::TextureCreator;
use sdl2::ttf::Font;
use sdl2::video::WindowContext;
```

**Step 3: Call `draw_airport_labels` in `main.rs`**

After the `draw_airports` call (around line 317 in main.rs), add:

```rust
ui::airport_layer::draw_airport_labels(
    &mut canvas,
    texture_creator,
    &font,
    &world.airports,
    &camera,
)?;
```

**Step 4: Verify**

Run: `cargo check -p stratosphere`
Expected: PASS

Run: `cargo test -p stratosphere`
Expected: PASS (all tests)

**Step 5: Commit**

```bash
git add stratosphere/src/ui/airport_layer.rs stratosphere/src/main.rs
git commit -m "feat: render ICAO labels on airports at zoom >= 9"
```

---

## Task 12: Final verification

**Step 1: Run all tests**

Run: `cargo test --workspace`
Expected: PASS

**Step 2: Run cargo check on all crates**

Run: `cargo check --workspace`
Expected: PASS (zero errors, warnings acceptable)

**Step 3: Commit if any loose changes**

```bash
git status
# if clean: done
# if dirty: git add -A && git commit -m "chore: cleanup after frontend mouse/hud implementation"
```

---

## Summary of Commits (expected)

1. `feat: add HudPanel system to ui/hud`
2. `feat: add mouse hover/click to MainMenu`
3. `feat: add mouse hover/click to ModeSelect`
4. `feat: add mouse hover/click to SandboxSettings`
5. `feat: wire mouse events for all menu scenes`
6. `feat: map click hit-testing for aircraft and airports`
7. `feat: render aircraft info panel on selection`
8. `feat: render airport dispatch panel and handle dispatch clicks`
9. `feat: render ICAO labels on airports at zoom >= 9`

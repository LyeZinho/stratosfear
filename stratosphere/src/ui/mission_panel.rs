use sdl2::pixels::Color;
use sdl2::rect::Rect;
use sdl2::render::{Canvas, TextureCreator, BlendMode};
use sdl2::video::{Window, WindowContext};
use airstrike_engine::core::aircraft::Aircraft;
use airstrike_engine::core::mission::{MissionPlan, MissionType, Roe};
use airstrike_engine::ui::tactical::AircraftRenderState;

pub struct MissionBriefingState {
    pub active_tab: usize, // 0: Route, 1: Loadout, 2: Fuel, 3: Airport
    pub current_plan: MissionPlan,
}

impl MissionBriefingState {
    pub fn new() -> Self {
        MissionBriefingState {
            active_tab: 0,
            current_plan: MissionPlan {
                mission_type: MissionType::CAP,
                waypoints: Vec::new(),
                loadout: Vec::new(),
                formation_ids: Vec::new(),
                roe: Roe::ReturnFireOnly,
                fuel_reserve_pct: 0.15,
            },
        }
    }
}

pub fn render_mission_briefing<'tc>(
    canvas: &mut Canvas<Window>,
    tc: &TextureCreator<WindowContext>,
    font: &sdl2::ttf::Font,
    ac: &Aircraft,
    state: &MissionBriefingState,
    _render_state: &AircraftRenderState,
    world: &crate::simulation::world::World,
) -> Result<(), String> {
    let (win_w, win_h) = canvas.window().size();
    let panel_w = 700;
    let panel_h = win_h - 100;
    let panel_x = win_w as i32 - panel_w - 20;
    let panel_y = 20;

    // Background Gradient (Simulated with multiple rects for premium feel)
    canvas.set_blend_mode(BlendMode::Blend);
    for i in 0..20 {
        let alpha = 200 + (i * 2);
        canvas.set_draw_color(Color::RGBA(0, 15 + i as u8, 30 + i as u8, alpha as u8));
        let step_h = panel_h / 20;
        let _ = canvas.fill_rect(Rect::new(panel_x, panel_y + (i * step_h as i32), panel_w as u32, step_h as u32));
    }
    
    let bg = Rect::new(panel_x, panel_y, panel_w as u32, panel_h as u32);
    // Border
    canvas.set_draw_color(Color::RGB(0, 200, 255));
    canvas.draw_rect(bg)?;
    
    // Close Button (X)
    let close_rect = Rect::new(panel_x + panel_w - 40, panel_y + 10, 30, 30);
    canvas.set_draw_color(Color::RGB(255, 50, 50));
    canvas.fill_rect(close_rect)?;
    draw_text(canvas, tc, font, "X", panel_x + panel_w - 30, panel_y + 12, Color::RGB(255, 255, 255))?;

    // Title
    let title = format!("MISSION BRIEFING: {}", ac.callsign);
    draw_text(canvas, tc, font, &title, panel_x + 20, panel_y + 20, Color::RGB(255, 255, 255))?;

    // Tabs
    let tabs = ["ROUTE", "LOADOUT", "FUEL", "AIRPORT"];
    for (i, &name) in tabs.iter().enumerate() {
        let tx = panel_x + 20 + i as i32 * 100;
        let ty = panel_y + 60;
        let color = if state.active_tab == i { Color::RGB(255, 255, 0) } else { Color::RGB(150, 150, 150) };
        draw_text(canvas, tc, font, name, tx, ty, color)?;
        if state.active_tab == i {
            canvas.draw_line((tx, ty + 25), (tx + 80, ty + 25))?;
        }
    }

    match state.active_tab {
        0 => render_route_tab(canvas, tc, font, panel_x, panel_y, &state.current_plan)?,
        1 => render_loadout_tab(canvas, tc, font, panel_x, panel_y, &state.current_plan)?,
        2 => render_fuel_tab(canvas, tc, font, panel_x, panel_y, ac, &state.current_plan)?,
        3 => render_airport_tab(canvas, tc, font, panel_x, panel_y, ac, world)?,
        _ => {}
    }

    // Dispatch Button
    let btn_y = panel_y + panel_h as i32 - 60;
    let is_valid = !state.current_plan.waypoints.is_empty();
    let btn_color = if is_valid { Color::RGB(0, 255, 100) } else { Color::RGB(100, 100, 100) };
    
    canvas.set_draw_color(btn_color);
    let btn_rect = Rect::new(panel_x + 100, btn_y, 200, 40);
    canvas.fill_rect(btn_rect)?;
    draw_text(canvas, tc, font, "DISPATCH", panel_x + 155, btn_y + 10, Color::RGB(0, 0, 0))?;

    Ok(())
}

fn render_route_tab(canvas: &mut Canvas<Window>, tc: &TextureCreator<WindowContext>, font: &sdl2::ttf::Font, px: i32, py: i32, plan: &MissionPlan) -> Result<(), String> {
    draw_text(canvas, tc, font, "WAYPOINTS:", px + 20, py + 110, Color::RGB(0, 200, 255))?;
    
    // Mini-Map Area
    let map_x = px + 350;
    let map_y = py + 120;
    let map_size = 320;
    let map_rect = Rect::new(map_x, map_y, map_size, map_size);
    
    canvas.set_draw_color(Color::RGB(10, 30, 50));
    canvas.fill_rect(map_rect)?;
    canvas.set_draw_color(Color::RGB(0, 100, 150));
    canvas.draw_rect(map_rect)?;
    
    // Grid in Mini-Map
    canvas.set_draw_color(Color::RGBA(0, 200, 255, 40));
    for i in 1..4 {
        let pos = i * (map_size as i32 / 4);
        canvas.draw_line((map_x + pos, map_y), (map_x + pos, map_y + map_size as i32))?;
        canvas.draw_line((map_x, map_y + pos), (map_x + map_size as i32, map_y + pos))?;
    }
    
    // Waypoints List
    if plan.waypoints.is_empty() {
        draw_text(canvas, tc, font, "(RIGHT-CLICK ON MAP TO ADD)", px + 20, py + 140, Color::RGB(150, 150, 150))?;
    } else {
        for (i, wp) in plan.waypoints.iter().enumerate() {
            if i > 15 { break; } // Limit list
            let text = format!("WP{} - {:.2},{:.2}", i+1, wp.lat, wp.lon);
            let row_y = py + 140 + i as i32 * 25;
            draw_text(canvas, tc, font, &text, px + 20, row_y, Color::RGB(220, 220, 220))?;
            
            // Delete Button (X)
            canvas.set_draw_color(Color::RGB(150, 50, 50));
            let del_rect = Rect::new(px + 280, row_y, 20, 20);
            canvas.fill_rect(del_rect)?;
            draw_text(canvas, tc, font, "x", px + 286, row_y, Color::RGB(255, 255, 255))?;

            // Draw on Mini-Map (Normalized relative to airport or first WP)
            // Simplified: show relative to map center
            let map_cx = map_x + map_size as i32 / 2;
            let map_cy = map_y + map_size as i32 / 2;
            
            if let Some(first) = plan.waypoints.first() {
                let dx = (wp.lon - first.lon) as f32 * 100.0;
                let dy = (wp.lat - first.lat) as f32 * 100.0;
                let wx = map_cx + dx as i32;
                let wy = map_cy - dy as i32;
                
                if map_rect.contains_point((wx, wy)) {
                    canvas.set_draw_color(Color::RGB(255, 255, 0));
                    canvas.fill_rect(Rect::new(wx - 3, wy - 3, 6, 6))?;
                    if i > 0 {
                         // Line to previous
                         let prev = &plan.waypoints[i-1];
                         let pdx = (prev.lon - first.lon) as f32 * 100.0;
                         let pdy = (prev.lat - first.lat) as f32 * 100.0;
                         let pwx = map_cx + pdx as i32;
                         let pwy = map_cy - pdy as i32;
                         if map_rect.contains_point((pwx, pwy)) {
                             canvas.set_draw_color(Color::RGBA(255, 255, 0, 100));
                             canvas.draw_line((pwx, pwy), (wx, wy))?;
                         }
                    }
                }
            }
        }
    }
    Ok(())
}

fn render_loadout_tab(canvas: &mut Canvas<Window>, tc: &TextureCreator<WindowContext>, font: &sdl2::ttf::Font, px: i32, py: i32, plan: &MissionPlan) -> Result<(), String> {
    draw_text(canvas, tc, font, "REARARM/REFUEL:", px + 20, py + 110, Color::RGB(0, 200, 255))?;
    draw_text(canvas, tc, font, "Current Loadout:", px + 20, py + 140, Color::RGB(255, 255, 255))?;
    if plan.loadout.is_empty() {
        draw_text(canvas, tc, font, "CLEAN", px + 40, py + 170, Color::RGB(150, 150, 150))?;
    }
    Ok(())
}

fn render_fuel_tab(canvas: &mut Canvas<Window>, tc: &TextureCreator<WindowContext>, font: &sdl2::ttf::Font, px: i32, py: i32, ac: &Aircraft, plan: &MissionPlan) -> Result<(), String> {
    let fuel_needed = plan.fuel_needed_kg(ac.speed_knots, ac.fuel_burn_kg_per_s);
    let fuel_pct = (fuel_needed / ac.fuel_kg).min(1.0);
    
    draw_text(canvas, tc, font, "FUEL ANALYSIS:", px + 20, py + 110, Color::RGB(0, 200, 255))?;
    draw_text(canvas, tc, font, &format!("Est. Required: {:.0} kg", fuel_needed), px + 20, py + 140, Color::RGB(255, 255, 255))?;
    draw_text(canvas, tc, font, &format!("On-board: {:.0} kg", ac.fuel_kg), px + 20, py + 170, Color::RGB(255, 255, 255))?;
    
    // Bar
    canvas.set_draw_color(Color::RGB(50, 50, 50));
    canvas.fill_rect(Rect::new(px + 20, py + 210, 660, 20))?;
    
    let bar_color = if fuel_pct > 0.9 { Color::RGB(255, 50, 50) } else { Color::RGB(0, 255, 100) };
    canvas.set_draw_color(bar_color);
    canvas.fill_rect(Rect::new(px + 20, py + 210, (660.0 * fuel_pct) as u32, 20))?;

    Ok(())
}

fn draw_text(canvas: &mut Canvas<Window>, tc: &TextureCreator<WindowContext>, font: &sdl2::ttf::Font, text: &str, x: i32, y: i32, color: Color) -> Result<(), String> {
    let surface = font.render(text).blended(color).map_err(|e| e.to_string())?;
    let texture = tc.create_texture_from_surface(&surface).map_err(|e| e.to_string())?;
    let sdl2::render::TextureQuery { width, height, .. } = texture.query();
    canvas.copy(&texture, None, Some(Rect::new(x, y, width, height)))?;
    Ok(())
}

pub fn render_airport_tab(
    canvas: &mut Canvas<Window>,
    tc: &TextureCreator<WindowContext>,
    font: &sdl2::ttf::Font,
    px: i32,
    py: i32,
    _ac_current: &Aircraft,
    world: &crate::simulation::world::World,
) -> Result<(), String> {
    // Current aircraft's home airport info
    if let Some(airport) = world.airports.iter().find(|a| a.icao == _ac_current.home_airport_icao) {
        draw_text(canvas, tc, font, &format!("BASE: {} ({})", airport.name, airport.icao), px + 20, py + 110, Color::RGB(0, 200, 255))?;
        draw_text(canvas, tc, font, &format!("Elevation: {:.0} ft", airport.elevation_ft), px + 20, py + 140, Color::RGB(200, 200, 200))?;
        
        draw_text(canvas, tc, font, "STATIONED AIRCRAFT:", px + 20, py + 180, Color::RGB(0, 255, 100))?;
        
        let stations: Vec<_> = world.aircraft.iter().filter(|a| a.home_airport_icao == airport.icao).collect();
        for (i, ac) in stations.iter().enumerate() {
            if i > 12 { break; }
            let ac_status = match ac.phase {
                airstrike_engine::core::aircraft::FlightPhase::ColdDark => "READY",
                airstrike_engine::core::aircraft::FlightPhase::Maintenance { .. } => "MAINTENANCE",
                _ => "IN FLIGHT",
            };
            let text = format!("{:<10} {:<10} [{}]", ac.callsign, ac.model, ac_status);
            draw_text(canvas, tc, font, &text, px + 30, py + 210 + i as i32 * 25, Color::RGB(220, 220, 220))?;
        }
    }

    Ok(())
}

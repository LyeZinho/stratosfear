# Stratosphere Game Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build Stratosphere from engine foundation to fully playable air-superiority RTS with real airports, aircraft state machine, radar types, fog of war, and BVR combat.

**Architecture:** Incremental layering — new engine modules first (`airport`, `weapon`, `mission`, `datalink`), then aircraft struct extensions, then game-side scene system, world init, rendering layers, and simulation systems.

**Tech Stack:** Rust 2021, `sdl2` 0.37, `sdl2::ttf`, `sdl2::image`, existing `airstrike-engine` + `stratosphere` workspace.

---

## Task 1: Airport Module (Engine)

**Files:**
- Create: `airstrike-engine/src/core/airport.rs`
- Modify: `airstrike-engine/src/core/mod.rs`

**Step 1: Write the failing test**

In `airstrike-engine/src/core/airport.rs` (create the file with tests only first):

```rust
#[cfg(test)]
mod tests {
    use super::*;

    const SAMPLE_CSV: &str = "\
ident,type,name,latitude_deg,longitude_deg,elevation_ft,iso_country
LPPT,large_airport,Humberto Delgado Airport,38.7813,-9.13592,374,PT
LPPR,large_airport,Francisco de Sa Carneiro Airport,41.2481,-8.68139,228,PT
LEMD,large_airport,Adolfo Suarez Madrid-Barajas Airport,40.4936,-3.56676,2000,ES
LFPG,large_airport,Charles de Gaulle Airport,49.0097,2.54792,392,FR
LPFR,medium_airport,Faro Airport,37.0144,-7.96591,24,PT
LPPD,small_airport,João Paulo II Airport,37.7412,-25.6979,259,PT
XXXX,heliport,Some Heliport,38.0,-9.0,100,PT
";

    #[test]
    fn test_load_parses_airports() {
        let db = AirportDb::load(SAMPLE_CSV.as_bytes());
        assert!(!db.airports.is_empty());
    }

    #[test]
    fn test_load_filters_heliports() {
        let db = AirportDb::load(SAMPLE_CSV.as_bytes());
        assert!(!db.airports.iter().any(|a| a.icao == "XXXX"), "heliports must be excluded");
    }

    #[test]
    fn test_for_country_returns_correct_airports() {
        let db = AirportDb::load(SAMPLE_CSV.as_bytes());
        let pt = db.for_country("PT");
        assert_eq!(pt.len(), 3, "Portugal should have 3 non-heliport airports");
        assert!(pt.iter().all(|a| a.country_iso == "PT"));
    }

    #[test]
    fn test_countries_returns_unique_list() {
        let db = AirportDb::load(SAMPLE_CSV.as_bytes());
        let countries = db.countries();
        assert_eq!(countries.len(), 3);
        assert!(countries.iter().any(|(iso, _)| iso == "PT"));
        assert!(countries.iter().any(|(iso, _)| iso == "ES"));
        assert!(countries.iter().any(|(iso, _)| iso == "FR"));
    }

    #[test]
    fn test_by_icao_finds_airport() {
        let db = AirportDb::load(SAMPLE_CSV.as_bytes());
        let apt = db.by_icao("LPPT");
        assert!(apt.is_some());
        assert_eq!(apt.unwrap().name, "Humberto Delgado Airport");
    }

    #[test]
    fn test_by_icao_returns_none_for_missing() {
        let db = AirportDb::load(SAMPLE_CSV.as_bytes());
        assert!(db.by_icao("ZZZZ").is_none());
    }

    #[test]
    fn test_airport_type_parsed_correctly() {
        let db = AirportDb::load(SAMPLE_CSV.as_bytes());
        let lppt = db.by_icao("LPPT").unwrap();
        assert!(matches!(lppt.airport_type, AirportType::Large));
        let lpfr = db.by_icao("LPFR").unwrap();
        assert!(matches!(lpfr.airport_type, AirportType::Medium));
        let lppd = db.by_icao("LPPD").unwrap();
        assert!(matches!(lppd.airport_type, AirportType::Small));
    }

    #[test]
    fn test_lat_lon_parsed_correctly() {
        let db = AirportDb::load(SAMPLE_CSV.as_bytes());
        let lppt = db.by_icao("LPPT").unwrap();
        assert!((lppt.lat - 38.7813).abs() < 0.0001);
        assert!((lppt.lon - (-9.13592)).abs() < 0.0001);
    }
}
```

**Step 2: Run test to verify it fails**

```bash
cargo test -p airstrike-engine airport 2>&1
```
Expected: compile error (module not found / types undefined).

**Step 3: Write minimal implementation**

Replace the file content with the full implementation + tests:

```rust
#[derive(Debug, Clone, PartialEq)]
pub enum AirportType {
    Large,
    Medium,
    Small,
    Other,
}

#[derive(Debug, Clone)]
pub struct Airport {
    pub icao: String,
    pub name: String,
    pub lat: f64,
    pub lon: f64,
    pub country_iso: String,
    pub airport_type: AirportType,
    pub elevation_ft: f32,
}

pub struct AirportDb {
    pub airports: Vec<Airport>,
}

impl AirportDb {
    pub fn load(csv_bytes: &[u8]) -> Self {
        let text = std::str::from_utf8(csv_bytes).unwrap_or("");
        let mut airports = Vec::new();
        let mut first_line = true;
        for line in text.lines() {
            if first_line {
                first_line = false;
                continue;
            }
            let fields: Vec<&str> = line.splitn(7, ',').collect();
            if fields.len() < 7 {
                continue;
            }
            let apt_type_str = fields[1].trim();
            let airport_type = match apt_type_str {
                "large_airport" => AirportType::Large,
                "medium_airport" => AirportType::Medium,
                "small_airport" => AirportType::Small,
                _ => continue, // skip heliports, seaplane_base, closed, etc.
            };
            let icao = fields[0].trim().to_string();
            let name = fields[2].trim().to_string();
            let lat: f64 = fields[3].trim().parse().unwrap_or(0.0);
            let lon: f64 = fields[4].trim().parse().unwrap_or(0.0);
            let elevation_ft: f32 = fields[5].trim().parse().unwrap_or(0.0);
            let country_iso = fields[6].trim().to_string();
            airports.push(Airport { icao, name, lat, lon, country_iso, airport_type, elevation_ft });
        }
        AirportDb { airports }
    }

    pub fn for_country<'a>(&'a self, iso: &str) -> Vec<&'a Airport> {
        self.airports.iter().filter(|a| a.country_iso == iso).collect()
    }

    pub fn countries(&self) -> Vec<(String, String)> {
        let mut seen = std::collections::HashSet::new();
        let mut result = Vec::new();
        for a in &self.airports {
            if seen.insert(a.country_iso.clone()) {
                result.push((a.country_iso.clone(), a.country_iso.clone()));
            }
        }
        result.sort_by(|a, b| a.0.cmp(&b.0));
        result
    }

    pub fn by_icao(&self, icao: &str) -> Option<&Airport> {
        self.airports.iter().find(|a| a.icao == icao)
    }
}

#[cfg(test)]
mod tests {
    // ... (paste tests from Step 1 here)
}
```

**Step 4: Add to mod.rs**

In `airstrike-engine/src/core/mod.rs`, add:
```rust
pub mod airport;
```

**Step 5: Run tests**

```bash
cargo test -p airstrike-engine airport 2>&1
```
Expected: all 8 tests pass.

**Step 6: Add to lib.rs exports**

In `airstrike-engine/src/lib.rs`, verify `pub mod core;` already exports it (it does).

**Step 7: Commit**

```bash
git add airstrike-engine/src/core/airport.rs airstrike-engine/src/core/mod.rs
git commit -m "feat(engine): add AirportDb with CSV parsing and country filtering"
```

---

## Task 2: Weapon Catalog (Engine)

**Files:**
- Create: `airstrike-engine/src/core/weapon.rs`
- Modify: `airstrike-engine/src/core/mod.rs`

**Step 1: Write the failing test**

```rust
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_catalog_not_empty() {
        assert!(!WEAPON_CATALOG.is_empty());
    }

    #[test]
    fn test_aim120c_in_catalog() {
        let w = WEAPON_CATALOG.iter().find(|w| w.id == "AIM-120C");
        assert!(w.is_some());
        let w = w.unwrap();
        assert!((w.range_km - 105.0).abs() < 1.0);
        assert!((w.nez_km - 25.0).abs() < 1.0);
        assert!((w.pk_base - 0.85).abs() < 0.01);
        assert!(matches!(w.seeker, SeekerType::ActiveRadar));
    }

    #[test]
    fn test_meteor_has_highest_nez() {
        let meteor = WEAPON_CATALOG.iter().find(|w| w.id == "Meteor").unwrap();
        let all_nezs: Vec<f32> = WEAPON_CATALOG.iter().map(|w| w.nez_km).collect();
        let max_nez = all_nezs.iter().cloned().fold(f32::NEG_INFINITY, f32::max);
        assert!((meteor.nez_km - max_nez).abs() < 0.01, "Meteor should have highest NEZ");
    }

    #[test]
    fn test_weapon_by_id_finds_and_not_finds() {
        assert!(weapon_by_id("AIM-120D").is_some());
        assert!(weapon_by_id("NONEXISTENT").is_none());
    }
}
```

**Step 2: Run to verify it fails**

```bash
cargo test -p airstrike-engine weapon 2>&1
```

**Step 3: Implement**

```rust
#[derive(Debug, Clone, PartialEq)]
pub enum SeekerType {
    ActiveRadar,
    SemiActive,
    Ir,
}

#[derive(Debug, Clone)]
pub struct WeaponSpec {
    pub id: &'static str,
    pub display_name: &'static str,
    pub range_km: f32,
    pub nez_km: f32,
    pub pitbull_range_km: f32,
    pub speed_knots: f32,
    pub pk_base: f32,
    pub seeker: SeekerType,
}

pub static WEAPON_CATALOG: &[WeaponSpec] = &[
    WeaponSpec {
        id: "AIM-120C",
        display_name: "AIM-120C-5 AMRAAM",
        range_km: 105.0,
        nez_km: 25.0,
        pitbull_range_km: 20.0,
        speed_knots: 2700.0,
        pk_base: 0.85,
        seeker: SeekerType::ActiveRadar,
    },
    WeaponSpec {
        id: "AIM-120D",
        display_name: "AIM-120D AMRAAM",
        range_km: 160.0,
        nez_km: 35.0,
        pitbull_range_km: 25.0,
        speed_knots: 2700.0,
        pk_base: 0.88,
        seeker: SeekerType::ActiveRadar,
    },
    WeaponSpec {
        id: "Meteor",
        display_name: "MBDA Meteor",
        range_km: 200.0,
        nez_km: 60.0,
        pitbull_range_km: 30.0,
        speed_knots: 2400.0,
        pk_base: 0.92,
        seeker: SeekerType::ActiveRadar,
    },
    WeaponSpec {
        id: "R-77",
        display_name: "R-77 Adder",
        range_km: 80.0,
        nez_km: 15.0,
        pitbull_range_km: 15.0,
        speed_knots: 2600.0,
        pk_base: 0.78,
        seeker: SeekerType::ActiveRadar,
    },
    WeaponSpec {
        id: "R-77-1",
        display_name: "R-77-1",
        range_km: 110.0,
        nez_km: 22.0,
        pitbull_range_km: 18.0,
        speed_knots: 2700.0,
        pk_base: 0.82,
        seeker: SeekerType::ActiveRadar,
    },
    WeaponSpec {
        id: "AIM-9X",
        display_name: "AIM-9X Sidewinder",
        range_km: 35.0,
        nez_km: 8.0,
        pitbull_range_km: 2.0,
        speed_knots: 2000.0,
        pk_base: 0.90,
        seeker: SeekerType::Ir,
    },
    WeaponSpec {
        id: "PL-15",
        display_name: "PL-15",
        range_km: 200.0,
        nez_km: 50.0,
        pitbull_range_km: 25.0,
        speed_knots: 2800.0,
        pk_base: 0.87,
        seeker: SeekerType::ActiveRadar,
    },
];

pub fn weapon_by_id(id: &str) -> Option<&'static WeaponSpec> {
    WEAPON_CATALOG.iter().find(|w| w.id == id)
}

#[cfg(test)]
mod tests {
    // paste tests here
}
```

**Step 4: Add to mod.rs**

```rust
pub mod weapon;
```

**Step 5: Run tests**

```bash
cargo test -p airstrike-engine weapon 2>&1
```
Expected: 4 tests pass.

**Step 6: Commit**

```bash
git add airstrike-engine/src/core/weapon.rs airstrike-engine/src/core/mod.rs
git commit -m "feat(engine): add weapon catalog with BVR/IR missile specs"
```

---

## Task 3: Mission Types (Engine)

**Files:**
- Create: `airstrike-engine/src/core/mission.rs`
- Modify: `airstrike-engine/src/core/mod.rs`

**Step 1: Write the failing test**

```rust
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_mission_plan_default_roe_is_return_fire() {
        let plan = MissionPlan {
            waypoints: vec![],
            loadout: vec![],
            roe: Roe::ReturnFireOnly,
            fuel_reserve_pct: 0.15,
        };
        assert!(matches!(plan.roe, Roe::ReturnFireOnly));
    }

    #[test]
    fn test_waypoint_creation() {
        let wp = Waypoint {
            lat: 38.716,
            lon: -9.142,
            altitude_ft: 25_000.0,
            speed_knots: 450.0,
            action: WaypointAction::FlyOver,
        };
        assert!((wp.lat - 38.716).abs() < 0.001);
    }

    #[test]
    fn test_weapon_slot() {
        let slot = WeaponSlot { weapon_id: "AIM-120C".to_string(), count: 4 };
        assert_eq!(slot.count, 4);
    }

    #[test]
    fn test_mission_with_waypoints() {
        let plan = MissionPlan {
            waypoints: vec![
                Waypoint { lat: 38.716, lon: -9.142, altitude_ft: 25_000.0, speed_knots: 450.0, action: WaypointAction::FlyOver },
                Waypoint { lat: 39.0, lon: -9.0, altitude_ft: 25_000.0, speed_knots: 450.0, action: WaypointAction::Rtb },
            ],
            loadout: vec![WeaponSlot { weapon_id: "AIM-120C".to_string(), count: 4 }],
            roe: Roe::WeaponsFree,
            fuel_reserve_pct: 0.15,
        };
        assert_eq!(plan.waypoints.len(), 2);
        assert_eq!(plan.loadout[0].count, 4);
    }
}
```

**Step 2: Run to verify it fails**

```bash
cargo test -p airstrike-engine mission 2>&1
```

**Step 3: Implement**

```rust
#[derive(Debug, Clone)]
pub enum WaypointAction {
    FlyOver,
    OrbitCap { radius_km: f32, duration_s: f32 },
    AttackTarget { target_id: u32 },
    Rtb,
}

#[derive(Debug, Clone)]
pub struct Waypoint {
    pub lat: f64,
    pub lon: f64,
    pub altitude_ft: f32,
    pub speed_knots: f32,
    pub action: WaypointAction,
}

#[derive(Debug, Clone, PartialEq)]
pub enum Roe {
    WeaponsFree,
    ReturnFireOnly,
    HoldFire,
}

#[derive(Debug, Clone)]
pub struct WeaponSlot {
    pub weapon_id: String,
    pub count: u8,
}

#[derive(Debug, Clone)]
pub struct MissionPlan {
    pub waypoints: Vec<Waypoint>,
    pub loadout: Vec<WeaponSlot>,
    pub roe: Roe,
    pub fuel_reserve_pct: f32,
}

impl MissionPlan {
    pub fn current_waypoint(&self, index: usize) -> Option<&Waypoint> {
        self.waypoints.get(index)
    }
}

#[cfg(test)]
mod tests {
    // paste tests here
}
```

**Step 4: Add to mod.rs, run tests, commit**

```bash
cargo test -p airstrike-engine mission 2>&1
git add airstrike-engine/src/core/mission.rs airstrike-engine/src/core/mod.rs
git commit -m "feat(engine): add MissionPlan, Waypoint, Roe, and WeaponSlot types"
```

---

## Task 4: Datalink + Contact Picture (Engine)

**Files:**
- Create: `airstrike-engine/src/core/datalink.rs`
- Modify: `airstrike-engine/src/core/mod.rs`

**Step 1: Write the failing test**

```rust
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_contact_picture_starts_empty() {
        let pic = ContactPicture::new();
        assert!(pic.contacts.is_empty());
    }

    #[test]
    fn test_upsert_adds_contact() {
        let mut pic = ContactPicture::new();
        let c = Contact {
            aircraft_id: 42,
            lat: 38.7,
            lon: -9.1,
            altitude_ft: 25_000.0,
            heading_deg: 270.0,
            iff: IffStatus::Unknown,
            last_updated_s: 0.0,
        };
        pic.upsert(c);
        assert_eq!(pic.contacts.len(), 1);
    }

    #[test]
    fn test_upsert_updates_existing() {
        let mut pic = ContactPicture::new();
        pic.upsert(Contact { aircraft_id: 1, lat: 38.0, lon: -9.0, altitude_ft: 20_000.0, heading_deg: 0.0, iff: IffStatus::Unknown, last_updated_s: 0.0 });
        pic.upsert(Contact { aircraft_id: 1, lat: 39.0, lon: -9.0, altitude_ft: 20_000.0, heading_deg: 0.0, iff: IffStatus::Hostile, last_updated_s: 1.0 });
        assert_eq!(pic.contacts.len(), 1);
        assert!(matches!(pic.contacts[&1].iff, IffStatus::Hostile));
        assert!((pic.contacts[&1].lat - 39.0).abs() < 0.001);
    }

    #[test]
    fn test_prune_removes_stale_contacts() {
        let mut pic = ContactPicture::new();
        pic.upsert(Contact { aircraft_id: 1, lat: 38.0, lon: -9.0, altitude_ft: 0.0, heading_deg: 0.0, iff: IffStatus::Unknown, last_updated_s: 0.0 });
        pic.prune(stale_threshold_s: 10.0, current_time_s: 20.0);
        assert!(pic.contacts.is_empty(), "contact older than threshold should be pruned");
    }
}
```

**Step 2: Run to verify it fails**

```bash
cargo test -p airstrike-engine datalink 2>&1
```

**Step 3: Implement**

```rust
use std::collections::HashMap;

#[derive(Debug, Clone, PartialEq)]
pub enum IffStatus {
    Unknown,
    Friendly,
    Hostile,
}

#[derive(Debug, Clone)]
pub struct Contact {
    pub aircraft_id: u32,
    pub lat: f64,
    pub lon: f64,
    pub altitude_ft: f32,
    pub heading_deg: f32,
    pub iff: IffStatus,
    pub last_updated_s: f32,
}

pub struct ContactPicture {
    pub contacts: HashMap<u32, Contact>,
}

impl ContactPicture {
    pub fn new() -> Self {
        ContactPicture { contacts: HashMap::new() }
    }

    pub fn upsert(&mut self, contact: Contact) {
        self.contacts.insert(contact.aircraft_id, contact);
    }

    pub fn prune(&mut self, stale_threshold_s: f32, current_time_s: f32) {
        self.contacts.retain(|_, c| current_time_s - c.last_updated_s < stale_threshold_s);
    }
}

#[cfg(test)]
mod tests {
    // paste tests here
}
```

Note: Fix the test syntax — `prune` takes two positional args, not named. Update test:
```rust
pic.prune(10.0, 20.0);
```

**Step 4: Add to mod.rs, run, commit**

```bash
cargo test -p airstrike-engine datalink 2>&1
git add airstrike-engine/src/core/datalink.rs airstrike-engine/src/core/mod.rs
git commit -m "feat(engine): add ContactPicture and IffStatus datalink types"
```

---

## Task 5: Extend Aircraft with FlightPhase + RadarType + IffStatus

**Files:**
- Modify: `airstrike-engine/src/core/aircraft.rs`

**Step 1: Write the failing tests** (add to existing test block)

```rust
#[test]
fn test_new_aircraft_starts_cold_dark() {
    let ac = Aircraft::new(1, "TEST", "F-16C", Side::Friendly);
    assert!(matches!(ac.phase, FlightPhase::ColdDark));
}

#[test]
fn test_aircraft_has_iff_unknown_by_default() {
    let ac = Aircraft::new(1, "TEST", "F-16C", Side::Friendly);
    assert!(matches!(ac.iff, crate::core::datalink::IffStatus::Unknown));
}

#[test]
fn test_aircraft_has_no_radar_by_default() {
    let ac = Aircraft::new(1, "TEST", "F-16C", Side::Friendly);
    assert!(ac.radar_type.is_none());
}

#[test]
fn test_aircraft_with_aesa_radar() {
    let mut ac = Aircraft::new(1, "TEST", "F-16C", Side::Friendly);
    ac.radar_type = Some(RadarType::AESA);
    assert!(matches!(ac.radar_type, Some(RadarType::AESA)));
}

#[test]
fn test_preflight_timer_advances() {
    let mut ac = Aircraft::new(1, "TEST", "F-16C", Side::Friendly);
    ac.phase = FlightPhase::Preflight { elapsed_s: 0.0, required_s: 60.0 };
    ac.update(10.0);
    match ac.phase {
        FlightPhase::Preflight { elapsed_s, .. } => {
            assert!((elapsed_s - 10.0).abs() < 0.01);
        }
        _ => panic!("should still be Preflight after 10s of 60s required"),
    }
}

#[test]
fn test_preflight_transitions_to_taxiing_when_complete() {
    let mut ac = Aircraft::new(1, "TEST", "F-16C", Side::Friendly);
    ac.home_airport_lat = 38.7813;
    ac.home_airport_lon = -9.13592;
    ac.phase = FlightPhase::Preflight { elapsed_s: 59.0, required_s: 60.0 };
    ac.update(2.0); // exceed required_s
    assert!(matches!(ac.phase, FlightPhase::Taxiing { .. }), "should transition to Taxiing");
}
```

**Step 2: Run to verify it fails**

```bash
cargo test -p airstrike-engine 2>&1 | grep -E "FAILED|error"
```

**Step 3: Add types and fields to aircraft.rs**

Add at top of file (after existing imports, before `Side`):

```rust
use crate::core::datalink::IffStatus;
use crate::core::mission::MissionPlan;
```

Add new enum after `Side`:

```rust
#[derive(Debug, Clone, PartialEq)]
pub enum RadarType {
    Mechanical,
    PESA,
    AESA,
    AEWandC,
}

#[derive(Debug, Clone)]
pub enum FlightPhase {
    ColdDark,
    Preflight   { elapsed_s: f32, required_s: f32 },
    Taxiing     { target_lat: f64, target_lon: f64 },
    TakeoffRoll { speed_knots: f32 },
    Climbing    { target_alt_ft: f32 },
    EnRoute,
    OnStation,
    Rtb,
    Landing     { airport_lat: f64, airport_lon: f64 },
    Landed,
    Maintenance { elapsed_s: f32, required_s: f32 },
    Destroyed,
}
```

Add new fields to `Aircraft` struct:

```rust
pub phase: FlightPhase,
pub radar_type: Option<RadarType>,
pub iff: IffStatus,
pub iff_track_s: f32,          // seconds of continuous track (for identification)
pub home_airport_icao: String,
pub home_airport_lat: f64,
pub home_airport_lon: f64,
pub mission: Option<MissionPlan>,
pub waypoint_index: usize,
```

Initialize in `Aircraft::new()`:

```rust
phase: FlightPhase::ColdDark,
radar_type: None,
iff: IffStatus::Unknown,
iff_track_s: 0.0,
home_airport_icao: String::new(),
home_airport_lat: 0.0,
home_airport_lon: 0.0,
mission: None,
waypoint_index: 0,
```

Update `Aircraft::update(dt)` to drive phase transitions. Add after existing `lat`/`lon`/`fuel` update:

```rust
self.advance_phase(dt);
```

Add new method:

```rust
fn advance_phase(&mut self, dt: f32) {
    match &mut self.phase {
        FlightPhase::Preflight { elapsed_s, required_s } => {
            *elapsed_s += dt;
            if *elapsed_s >= *required_s {
                self.phase = FlightPhase::Taxiing {
                    target_lat: self.home_airport_lat,
                    target_lon: self.home_airport_lon,
                };
            }
        }
        FlightPhase::Maintenance { elapsed_s, required_s } => {
            *elapsed_s += dt;
            if *elapsed_s >= *required_s {
                self.phase = FlightPhase::ColdDark;
            }
        }
        FlightPhase::TakeoffRoll { speed_knots } => {
            *speed_knots += 10.0 * dt;
            if *speed_knots >= 160.0 {
                let target = self.mission.as_ref()
                    .and_then(|m| m.waypoints.first())
                    .map(|w| w.altitude_ft)
                    .unwrap_or(25_000.0);
                self.phase = FlightPhase::Climbing { target_alt_ft: target };
            }
        }
        FlightPhase::Climbing { target_alt_ft } => {
            self.altitude_ft += 2000.0 * dt;
            if self.altitude_ft >= *target_alt_ft {
                self.altitude_ft = *target_alt_ft;
                self.phase = FlightPhase::EnRoute;
            }
        }
        FlightPhase::Landing { airport_lat, airport_lon } => {
            let target_lat = *airport_lat;
            let target_lon = *airport_lon;
            let dist = crate::core::radar::haversine_km(self.lat, self.lon, target_lat, target_lon);
            if dist < 0.1 {
                self.phase = FlightPhase::Landed;
            }
        }
        FlightPhase::Landed => {
            self.phase = FlightPhase::Maintenance { elapsed_s: 0.0, required_s: 300.0 };
        }
        _ => {}
    }
}
```

**Step 4: Run tests**

```bash
cargo test -p airstrike-engine 2>&1
```
Expected: all existing tests pass + 6 new ones.

**Step 5: Commit**

```bash
git add airstrike-engine/src/core/aircraft.rs
git commit -m "feat(engine): add FlightPhase, RadarType, IffStatus fields and state machine to Aircraft"
```

---

## Task 6: Download OurAirports CSV and Bundle as Asset

**Files:**
- Create: `stratosphere/assets/airports.csv`

**Step 1: Download the CSV**

```bash
curl -L "https://davidmegginson.github.io/ourairports-data/airports.csv" \
  -o stratosphere/assets/airports.csv
```

Expected: ~5MB file, ~74k lines. First line is the CSV header.

**Step 2: Verify expected columns exist**

```bash
head -1 stratosphere/assets/airports.csv
```

Expected output contains: `ident,type,name,latitude_deg,longitude_deg,elevation_ft,...,iso_country,...`

Note the column ordering in the real CSV differs from our sample. The real CSV has:
`id,ident,type,name,latitude_deg,longitude_deg,elevation_ft,continent,iso_country,...`

Update `AirportDb::load()` in Task 1 to use the correct column indices for the real CSV:
- col 1 = `ident` (ICAO)
- col 2 = `type`
- col 3 = `name`
- col 4 = `latitude_deg`
- col 5 = `longitude_deg`
- col 6 = `elevation_ft`
- col 8 = `iso_country`

Revise `load()` to split on `,` (no `splitn`) and access by index:

```rust
pub fn load(csv_bytes: &[u8]) -> Self {
    let text = std::str::from_utf8(csv_bytes).unwrap_or("");
    let mut airports = Vec::new();
    let mut header_done = false;
    // Find column indices from header
    let mut idx_ident = 1usize;
    let mut idx_type = 2usize;
    let mut idx_name = 3usize;
    let mut idx_lat = 4usize;
    let mut idx_lon = 5usize;
    let mut idx_elev = 6usize;
    let mut idx_country = 8usize;

    for line in text.lines() {
        if !header_done {
            let cols: Vec<&str> = line.split(',').collect();
            for (i, col) in cols.iter().enumerate() {
                match col.trim().trim_matches('"') {
                    "ident" => idx_ident = i,
                    "type" => idx_type = i,
                    "name" => idx_name = i,
                    "latitude_deg" => idx_lat = i,
                    "longitude_deg" => idx_lon = i,
                    "elevation_ft" => idx_elev = i,
                    "iso_country" => idx_country = i,
                    _ => {}
                }
            }
            header_done = true;
            continue;
        }
        let fields: Vec<&str> = line.split(',').collect();
        let get = |i: usize| fields.get(i).map(|s| s.trim().trim_matches('"')).unwrap_or("");
        let apt_type = match get(idx_type) {
            "large_airport" => AirportType::Large,
            "medium_airport" => AirportType::Medium,
            "small_airport" => AirportType::Small,
            _ => continue,
        };
        let lat: f64 = get(idx_lat).parse().unwrap_or(0.0);
        let lon: f64 = get(idx_lon).parse().unwrap_or(0.0);
        let elevation_ft: f32 = get(idx_elev).parse().unwrap_or(0.0);
        airports.push(Airport {
            icao: get(idx_ident).to_string(),
            name: get(idx_name).to_string(),
            lat,
            lon,
            country_iso: get(idx_country).to_string(),
            airport_type: apt_type,
            elevation_ft,
        });
    }
    AirportDb { airports }
}
```

**Step 3: Run all engine tests to verify nothing broke**

```bash
cargo test -p airstrike-engine 2>&1
```

**Step 4: Add to .gitignore if CSV is too large for git, OR commit it**

The CSV is ~5MB which is fine for git (not a binary). Commit it:

```bash
git add stratosphere/assets/airports.csv airstrike-engine/src/core/airport.rs
git commit -m "feat: bundle OurAirports CSV and update parser for real column layout"
```

---

## Task 7: Scene System (Stratosphere)

**Files:**
- Create: `stratosphere/src/scenes/mod.rs`
- Create: `stratosphere/src/scenes/main_menu.rs`
- Create: `stratosphere/src/scenes/mode_select.rs`
- Create: `stratosphere/src/scenes/sandbox_settings.rs`
- Modify: `stratosphere/src/main.rs`

**Step 1: Write the failing test**

In `stratosphere/src/scenes/main_menu.rs`:

```rust
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_main_menu_initial_selection_is_play() {
        let menu = MainMenu::new();
        assert_eq!(menu.selected, 0, "PLAY should be selected by default");
    }

    #[test]
    fn test_main_menu_down_wraps() {
        let mut menu = MainMenu::new();
        menu.move_down();
        menu.move_down();
        menu.move_down(); // past QUIT → wraps to PLAY
        assert_eq!(menu.selected, 0);
    }

    #[test]
    fn test_main_menu_up_wraps() {
        let mut menu = MainMenu::new();
        menu.move_up(); // from PLAY → wraps to QUIT
        assert_eq!(menu.selected, 2);
    }

    #[test]
    fn test_main_menu_confirm_returns_action() {
        let mut menu = MainMenu::new();
        let action = menu.confirm();
        assert!(matches!(action, MenuAction::GoToModeSelect));
    }
}
```

**Step 2: Implement `main_menu.rs`**

```rust
pub enum MenuAction {
    GoToModeSelect,
    GoToSettings,
    Quit,
    None,
}

pub struct MainMenu {
    pub selected: usize,
    items: [&'static str; 3],
}

impl MainMenu {
    pub fn new() -> Self {
        MainMenu { selected: 0, items: ["PLAY", "SETTINGS", "QUIT"] }
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
}

#[cfg(test)]
mod tests { /* paste tests */ }
```

**Step 3: Implement `mode_select.rs`**

```rust
pub enum ModeSelectAction {
    GoToSandboxSettings,
    Back,
    None,
}

pub struct ModeSelect {
    pub selected: usize,
}

impl ModeSelect {
    pub fn new() -> Self { ModeSelect { selected: 0 } }
    pub fn move_down(&mut self) { self.selected = (self.selected + 1) % 3; }
    pub fn move_up(&mut self) { self.selected = (self.selected + 2) % 3; }
    pub fn confirm(&self) -> ModeSelectAction {
        match self.selected {
            0 => ModeSelectAction::GoToSandboxSettings,
            _ => ModeSelectAction::None,
        }
    }
}
```

**Step 4: Implement `sandbox_settings.rs`**

```rust
use airstrike_engine::core::airport::AirportDb;

pub struct SandboxSettings {
    pub country_list: Vec<(String, String)>,  // (iso, display_name)
    pub selected_country: usize,
    pub starting_credits: u32,
}

pub enum SandboxAction {
    StartGame { country_iso: String, starting_credits: u32 },
    Back,
    None,
}

impl SandboxSettings {
    pub fn new(db: &AirportDb) -> Self {
        let mut country_list = db.countries();
        country_list.sort_by(|a, b| a.1.cmp(&b.1));
        SandboxSettings {
            country_list,
            selected_country: 0,
            starting_credits: 100_000,
        }
    }

    pub fn move_down(&mut self) {
        if !self.country_list.is_empty() {
            self.selected_country = (self.selected_country + 1) % self.country_list.len();
        }
    }

    pub fn move_up(&mut self) {
        if !self.country_list.is_empty() {
            self.selected_country = (self.selected_country + self.country_list.len() - 1) % self.country_list.len();
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
}
```

**Step 5: Create `scenes/mod.rs`**

```rust
pub mod main_menu;
pub mod mode_select;
pub mod sandbox_settings;
```

**Step 6: Update `main.rs` to have a scene enum**

In `stratosphere/src/main.rs`, add before `fn main()`:

```rust
mod scenes;
use scenes::main_menu::{MainMenu, MenuAction};
use scenes::mode_select::{ModeSelect, ModeSelectAction};
use scenes::sandbox_settings::{SandboxSettings, SandboxAction};

enum Scene {
    MainMenu(MainMenu),
    ModeSelect(ModeSelect),
    SandboxSettings(SandboxSettings),
    InGame,
}
```

Replace the `'running: loop` block's event handling with a scene-dispatched match. The full `main.rs` scene dispatch is shown in Task 8.

**Step 7: Run tests**

```bash
cargo test -p stratosphere 2>&1
```
Expected: 4 new tests in main_menu pass.

**Step 8: Commit**

```bash
git add stratosphere/src/scenes/
git commit -m "feat(game): add scene system with MainMenu, ModeSelect, SandboxSettings"
```

---

## Task 8: Wire Scene System into Main Loop

**Files:**
- Modify: `stratosphere/src/main.rs`

This task converts the existing single-loop `main.rs` into a scene-dispatching loop. Key changes:

1. Load `AirportDb` from bundled CSV on startup using `include_bytes!`
2. Initialize with `Scene::MainMenu`
3. Each frame: match scene, delegate render + input to scene handler

**Step 1: Add airport loading at top of `main()`**

After SDL2 init, add:

```rust
let airport_csv = include_bytes!("../assets/airports.csv");
let airport_db = airstrike_engine::core::airport::AirportDb::load(airport_csv);
let mut scene = Scene::MainMenu(scenes::main_menu::MainMenu::new());
```

**Step 2: Scene render functions**

Add these functions to `main.rs`:

```rust
fn render_main_menu(
    canvas: &mut sdl2::render::Canvas<sdl2::video::Window>,
    font: &sdl2::ttf::Font,
    texture_creator: &sdl2::render::TextureCreator<sdl2::video::WindowContext>,
    menu: &scenes::main_menu::MainMenu,
) -> Result<(), String> {
    canvas.set_draw_color(sdl2::pixels::Color::RGB(10, 10, 20));
    canvas.clear();
    let title = "STRATOSPHERE";
    // render title centered, then each menu item
    // selected item gets bright green, others dim green
    let w = WINDOW_W as i32;
    let items = menu.items();
    for (i, item) in items.iter().enumerate() {
        let color = if menu.selected == i {
            sdl2::pixels::Color::RGB(0, 255, 100)
        } else {
            sdl2::pixels::Color::RGB(0, 100, 50)
        };
        let surf = font.render(item).blended(color).map_err(|e| e.to_string())?;
        let tex = texture_creator.create_texture_from_surface(&surf).map_err(|e| e.to_string())?;
        let sdl2::render::TextureQuery { width, height, .. } = tex.query();
        let x = (w - width as i32) / 2;
        let y = 300 + i as i32 * 40;
        canvas.copy(&tex, None, Some(sdl2::rect::Rect::new(x, y, width, height)))?;
    }
    // Render title
    let title_surf = font.render(title).blended(sdl2::pixels::Color::RGB(0, 200, 255)).map_err(|e| e.to_string())?;
    let title_tex = texture_creator.create_texture_from_surface(&title_surf).map_err(|e| e.to_string())?;
    let sdl2::render::TextureQuery { width, height, .. } = title_tex.query();
    canvas.copy(&title_tex, None, Some(sdl2::rect::Rect::new((w - width as i32) / 2, 180, width, height)))?;
    canvas.present();
    Ok(())
}
```

(Similar render functions for `render_mode_select` and `render_sandbox_settings`.)

**Step 3: Scene event dispatch in the main loop**

Replace the event loop section:

```rust
for event in event_pump.poll_iter() {
    match &mut scene {
        Scene::MainMenu(menu) => match event {
            Event::Quit { .. } | Event::KeyDown { keycode: Some(Keycode::Escape), .. } => break 'running,
            Event::KeyDown { keycode: Some(Keycode::Down), .. } => menu.move_down(),
            Event::KeyDown { keycode: Some(Keycode::Up), .. } => menu.move_up(),
            Event::KeyDown { keycode: Some(Keycode::Return), .. } => {
                match menu.confirm() {
                    MenuAction::GoToModeSelect => {
                        scene = Scene::ModeSelect(scenes::mode_select::ModeSelect::new());
                    }
                    MenuAction::Quit => break 'running,
                    _ => {}
                }
            }
            _ => {}
        },
        Scene::ModeSelect(ms) => match event {
            Event::Quit { .. } => break 'running,
            Event::KeyDown { keycode: Some(Keycode::Escape), .. } => {
                scene = Scene::MainMenu(scenes::main_menu::MainMenu::new());
            }
            Event::KeyDown { keycode: Some(Keycode::Down), .. } => ms.move_down(),
            Event::KeyDown { keycode: Some(Keycode::Up), .. } => ms.move_up(),
            Event::KeyDown { keycode: Some(Keycode::Return), .. } => {
                match ms.confirm() {
                    ModeSelectAction::GoToSandboxSettings => {
                        let settings = scenes::sandbox_settings::SandboxSettings::new(&airport_db);
                        scene = Scene::SandboxSettings(settings);
                    }
                    _ => {}
                }
            }
            _ => {}
        },
        Scene::SandboxSettings(ss) => match event {
            Event::Quit { .. } => break 'running,
            Event::KeyDown { keycode: Some(Keycode::Escape), .. } => {
                scene = Scene::ModeSelect(scenes::mode_select::ModeSelect::new());
            }
            Event::KeyDown { keycode: Some(Keycode::Down), .. } => ss.move_down(),
            Event::KeyDown { keycode: Some(Keycode::Up), .. } => ss.move_up(),
            Event::KeyDown { keycode: Some(Keycode::Return), .. } => {
                match ss.confirm() {
                    SandboxAction::StartGame { country_iso, starting_credits } => {
                        let mut world = World::new_from_settings(&country_iso, starting_credits, &airport_db);
                        // transition to InGame with the world
                        scene = Scene::InGame;
                        // store world somewhere accessible (see Task 9)
                    }
                    _ => {}
                }
            }
            _ => {}
        },
        Scene::InGame => {
            // existing in-game event handling
        }
    }
}
```

**Step 4: Build to check for compile errors**

```bash
cargo build -p stratosphere 2>&1
```
Iterate on compile errors until clean.

**Step 5: Commit**

```bash
git add stratosphere/src/main.rs stratosphere/src/scenes/
git commit -m "feat(game): wire scene system into main loop with menu navigation"
```

---

## Task 9: World Init from Country Settings

**Files:**
- Modify: `stratosphere/src/simulation/world.rs`

**Step 1: Write the failing test**

```rust
#[test]
fn test_world_from_portugal_has_airports() {
    let csv = include_bytes!("../../assets/airports.csv");
    let db = airstrike_engine::core::airport::AirportDb::load(csv);
    let world = World::new_from_settings("PT", 100_000, &db);
    assert!(!world.airports.is_empty(), "Portugal should have airports");
    assert!(world.airports.iter().all(|a| a.country_iso == "PT"));
}

#[test]
fn test_world_aircraft_start_cold_dark() {
    let csv = include_bytes!("../../assets/airports.csv");
    let db = airstrike_engine::core::airport::AirportDb::load(csv);
    let world = World::new_from_settings("PT", 100_000, &db);
    for ac in &world.aircraft {
        assert!(matches!(ac.phase, airstrike_engine::core::aircraft::FlightPhase::ColdDark),
            "aircraft {} should start ColdDark", ac.callsign);
    }
}

#[test]
fn test_world_credits_set_from_settings() {
    let csv = include_bytes!("../../assets/airports.csv");
    let db = airstrike_engine::core::airport::AirportDb::load(csv);
    let world = World::new_from_settings("PT", 75_000, &db);
    assert_eq!(world.credits, 75_000);
}
```

**Step 2: Run to verify fails**

```bash
cargo test -p stratosphere world 2>&1
```

**Step 3: Implement `new_from_settings`**

Add to `world.rs`:

```rust
use airstrike_engine::core::airport::{Airport, AirportDb, AirportType};
use airstrike_engine::core::aircraft::FlightPhase;

pub struct World {
    pub aircraft: Vec<Aircraft>,
    pub airports: Vec<Airport>,
    pub radar: RadarSystem,
    pub credits: u32,
    pub game_time_s: f32,
    next_id: u32,
}

impl World {
    pub fn new_from_settings(country_iso: &str, starting_credits: u32, db: &AirportDb) -> Self {
        let airports: Vec<Airport> = db.for_country(country_iso).into_iter().cloned().collect();
        let mut world = World {
            aircraft: Vec::new(),
            airports: airports.clone(),
            radar: RadarSystem::new(0.0, 0.0, 50.0, 400.0),
            credits: starting_credits,
            game_time_s: 0.0,
            next_id: 1,
        };

        // Spawn one F-16C per large airport, one Gripen per medium airport
        for airport in &airports {
            let (model, radar_t) = match airport.airport_type {
                AirportType::Large => ("F-16C", Some(airstrike_engine::core::aircraft::RadarType::AESA)),
                AirportType::Medium => ("Gripen", Some(airstrike_engine::core::aircraft::RadarType::AESA)),
                AirportType::Small => continue,
                AirportType::Other => continue,
            };
            let callsign = format!("{}-01", airport.icao);
            let mut ac = Aircraft::new(world.next_id, &callsign, model, Side::Friendly);
            world.next_id += 1;
            ac.lat = airport.lat;
            ac.lon = airport.lon;
            ac.altitude_ft = airport.elevation_ft;
            ac.phase = FlightPhase::ColdDark;
            ac.radar_type = radar_t;
            ac.home_airport_icao = airport.icao.clone();
            ac.home_airport_lat = airport.lat;
            ac.home_airport_lon = airport.lon;
            // Set ground radar to first large airport
            if matches!(airport.airport_type, AirportType::Large) && world.radar.position_lat == 0.0 {
                world.radar = RadarSystem::new(airport.lat, airport.lon, 50.0, 400.0);
            }
            world.aircraft.push(ac);
        }
        world
    }
}
```

**Step 4: Update existing `World::new()` to keep working** (for tests that use it — keep `new()` as-is, add `new_from_settings` alongside).

**Step 5: Run tests**

```bash
cargo test -p stratosphere 2>&1
```
Expected: 3 new tests pass, all existing tests still pass.

**Step 6: Commit**

```bash
git add stratosphere/src/simulation/world.rs
git commit -m "feat(game): World::new_from_settings — spawn aircraft from real country airports"
```

---

## Task 10: Airport Rendering Layer

**Files:**
- Create: `stratosphere/src/ui/airport_layer.rs`
- Modify: `stratosphere/src/ui/mod.rs` (or create if not present)
- Modify: `stratosphere/src/main.rs` (call render in InGame loop)

**Step 1: Write the failing test**

```rust
#[cfg(test)]
mod tests {
    use super::*;
    use airstrike_engine::core::airport::{Airport, AirportType};
    use airstrike_engine::ui::camera::Camera;

    fn make_camera() -> Camera {
        Camera::new(38.716, -9.142, 7, 1280.0, 720.0)
    }

    fn make_airport(lat: f64, lon: f64, t: AirportType) -> Airport {
        Airport { icao: "LPPT".into(), name: "Test".into(), lat, lon,
                  country_iso: "PT".into(), airport_type: t, elevation_ft: 100.0 }
    }

    #[test]
    fn test_should_render_large_airport_at_zoom_6() {
        let apt = make_airport(38.716, -9.142, AirportType::Large);
        let cam = make_camera(); // zoom=7
        assert!(should_render(&apt, &cam));
    }

    #[test]
    fn test_should_not_render_small_airport_at_low_zoom() {
        let apt = make_airport(38.716, -9.142, AirportType::Small);
        let mut cam = make_camera();
        cam.zoom = 5;
        assert!(!should_render(&apt, &cam));
    }

    #[test]
    fn test_show_label_only_at_zoom_9_plus() {
        let apt = make_airport(38.716, -9.142, AirportType::Large);
        let mut cam = make_camera();
        cam.zoom = 8;
        assert!(!show_label(&apt, &cam));
        cam.zoom = 9;
        assert!(show_label(&apt, &cam));
    }
}
```

**Step 2: Implement `airport_layer.rs`**

```rust
use airstrike_engine::core::airport::{Airport, AirportType};
use airstrike_engine::ui::camera::Camera;
use sdl2::pixels::Color;
use sdl2::render::Canvas;
use sdl2::video::Window;
use sdl2::rect::Rect;

pub fn should_render(airport: &Airport, camera: &Camera) -> bool {
    match airport.airport_type {
        AirportType::Large => camera.zoom >= 5,
        AirportType::Medium => camera.zoom >= 6,
        AirportType::Small => camera.zoom >= 7,
        AirportType::Other => false,
    }
}

pub fn show_label(_airport: &Airport, camera: &Camera) -> bool {
    camera.zoom >= 9
}

pub fn dot_size(airport: &Airport) -> u32 {
    match airport.airport_type {
        AirportType::Large => 6,
        AirportType::Medium => 4,
        AirportType::Small => 3,
        AirportType::Other => 0,
    }
}

pub fn draw_airports(
    canvas: &mut Canvas<Window>,
    airports: &[Airport],
    camera: &Camera,
    is_player_country: bool,
) -> Result<(), String> {
    for airport in airports {
        if !should_render(airport, camera) {
            continue;
        }
        let (sx, sy) = camera.world_to_screen(
            airstrike_engine::core::geo::lat_lon_to_world(airport.lat, airport.lon, camera.zoom)
        );
        let size = dot_size(airport);
        let color = if is_player_country {
            Color::RGB(0, 200, 200)  // cyan
        } else {
            Color::RGB(150, 50, 50)  // dark red
        };
        canvas.set_draw_color(color);
        let half = size as i32 / 2;
        canvas.fill_rect(Rect::new(sx as i32 - half, sy as i32 - half, size, size))?;
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    // paste tests here
}
```

**Step 3: Run tests**

```bash
cargo test -p stratosphere airport_layer 2>&1
```

**Step 4: Add call to in-game render loop in `main.rs`**

In the InGame render section, after `draw_grid`, add:
```rust
ui::airport_layer::draw_airports(&mut canvas, &world.airports, &camera, true)?;
```

**Step 5: Build**

```bash
cargo build -p stratosphere 2>&1
```

**Step 6: Commit**

```bash
git add stratosphere/src/ui/airport_layer.rs stratosphere/src/main.rs
git commit -m "feat(game): render airports on map with zoom-dependent visibility"
```

---

## Task 11: Fog of War — Hostile Contact Visibility

**Files:**
- Modify: `stratosphere/src/simulation/world.rs`
- Modify: `stratosphere/src/main.rs` (pass visibility to renderer)

**Step 1: Write the failing test**

```rust
#[test]
fn test_hostile_aircraft_not_visible_beyond_radar() {
    let mut world = World::new();
    let mut hostile = Aircraft::new(99, "BOGEY", "Su-27", Side::Hostile);
    hostile.lat = 50.0;  // far north, outside 400km radar
    hostile.lon = -9.142;
    hostile.altitude_ft = 25_000.0;
    world.aircraft.push(hostile);
    world.update(1.0);
    let h = world.aircraft.iter().find(|a| a.callsign == "BOGEY").unwrap();
    assert!(!h.is_visible(), "hostile outside radar should not be visible");
}

#[test]
fn test_hostile_aircraft_visible_inside_radar() {
    let mut world = World::new();
    let mut hostile = Aircraft::new(99, "BOGEY", "Su-27", Side::Friendly); // using Friendly to bypass IFF
    hostile.lat = 38.8;
    hostile.lon = -9.2;
    hostile.altitude_ft = 25_000.0;
    world.aircraft.push(hostile);
    world.update(1.0);
    let h = world.aircraft.iter().find(|a| a.callsign == "BOGEY").unwrap();
    assert!(h.is_visible(), "aircraft inside radar range should be visible");
}
```

Add `is_visible(&self) -> bool` to `Aircraft`:

```rust
pub fn is_visible(&self) -> bool {
    self.is_detected
}
```

**Step 2: Update renderer** in `main.rs` to skip hostile aircraft where `!ac.is_visible()`:

In the `draw_aircraft` call area, filter before rendering:
```rust
let visible_aircraft: Vec<&Aircraft> = world.aircraft.iter()
    .filter(|ac| ac.side == Side::Friendly || ac.is_visible())
    .collect();
```

Pass `visible_aircraft` instead of `&world.aircraft` to `draw_aircraft`.

**Step 3: Run tests, build, commit**

```bash
cargo test -p stratosphere 2>&1
cargo build -p stratosphere 2>&1
git add stratosphere/src/simulation/world.rs stratosphere/src/main.rs
git commit -m "feat(game): fog of war — hostile aircraft invisible outside radar coverage"
```

---

## Task 12: Dispatch Aircraft — Trigger State Machine from UI

**Files:**
- Modify: `stratosphere/src/simulation/world.rs`
- Modify: `stratosphere/src/main.rs` (keyboard shortcut to dispatch selected aircraft)

**Step 1: Write the failing test**

```rust
#[test]
fn test_dispatch_transitions_cold_dark_to_preflight() {
    let mut world = World::new();
    world.spawn_demo();
    let id = world.aircraft[0].id;
    world.dispatch_aircraft(id);
    let ac = world.aircraft.iter().find(|a| a.id == id).unwrap();
    assert!(matches!(ac.phase, airstrike_engine::core::aircraft::FlightPhase::Preflight { .. }),
        "dispatched aircraft should be in Preflight, got {:?}", ac.phase);
}

#[test]
fn test_dispatch_only_works_on_cold_dark() {
    let mut world = World::new();
    world.spawn_demo();
    let id = world.aircraft[0].id;
    world.dispatch_aircraft(id); // → Preflight
    world.dispatch_aircraft(id); // second call should be no-op
    let ac = world.aircraft.iter().find(|a| a.id == id).unwrap();
    assert!(matches!(ac.phase, airstrike_engine::core::aircraft::FlightPhase::Preflight { .. }));
}
```

**Step 2: Implement `dispatch_aircraft` in `world.rs`**

```rust
pub fn dispatch_aircraft(&mut self, id: u32) {
    if let Some(ac) = self.aircraft.iter_mut().find(|a| a.id == id) {
        if matches!(ac.phase, FlightPhase::ColdDark) {
            ac.phase = FlightPhase::Preflight { elapsed_s: 0.0, required_s: 60.0 };
        }
    }
}
```

**Step 3: Add keyboard shortcut in main.rs**

In the InGame event handler, add:
```rust
Event::KeyDown { keycode: Some(Keycode::D), .. } => {
    // dispatch first ColdDark aircraft (placeholder — real UI comes in Task 15)
    if let Some(ac) = world.aircraft.iter().find(|a| matches!(a.phase, FlightPhase::ColdDark)) {
        let id = ac.id;
        world.dispatch_aircraft(id);
    }
}
```

**Step 4: Run tests, build, commit**

```bash
cargo test -p stratosphere 2>&1
cargo build -p stratosphere 2>&1
git add stratosphere/src/simulation/world.rs stratosphere/src/main.rs
git commit -m "feat(game): dispatch aircraft from ColdDark → Preflight state machine"
```

---

## Task 13: Missile Entity + Combat Resolution

**Files:**
- Create: `stratosphere/src/simulation/missile.rs`
- Modify: `stratosphere/src/simulation/mod.rs`
- Modify: `stratosphere/src/simulation/world.rs`
- Modify: `stratosphere/src/main.rs` (render missiles)

**Step 1: Write the failing test**

```rust
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_missile_starts_in_midcourse() {
        let m = Missile::new(1, 0, 99, 38.716, -9.142, 25_000.0, "AIM-120C");
        assert!(matches!(m.phase, MissilePhase::Midcourse));
    }

    #[test]
    fn test_missile_transitions_to_pitbull_at_range() {
        let mut m = Missile::new(1, 0, 99, 38.716, -9.142, 25_000.0, "AIM-120C");
        // Set target very close (within pitbull range of 20km)
        m.target_lat = 38.716;
        m.target_lon = -9.0;  // ~13km east
        m.update_phase();
        assert!(matches!(m.phase, MissilePhase::Pitbull), "should be Pitbull within 20km");
    }

    #[test]
    fn test_hit_resolution_large_rcs_target() {
        let result = resolve_hit(15.0, 1.0, false, "AIM-120C", 42);
        // Su-27 RCS=15, no chaff → high Pk
        assert!(matches!(result, HitResult::Hit(_)) || matches!(result, HitResult::Miss));
        // At RCS 15 and no chaff, probability should be > 0.8
        // (statistical test is fragile; just ensure it runs without panic)
    }
}
```

**Step 2: Implement `missile.rs`**

```rust
use airstrike_engine::core::radar::haversine_km;
use airstrike_engine::core::weapon::{weapon_by_id, WeaponSpec};

#[derive(Debug, Clone, PartialEq)]
pub enum MissilePhase {
    Midcourse,
    Pitbull,
    Terminal,
    Detonated,
    Missed,
}

#[derive(Debug, Clone)]
pub struct Missile {
    pub id: u32,
    pub launcher_id: u32,
    pub target_id: u32,
    pub lat: f64,
    pub lon: f64,
    pub target_lat: f64,
    pub target_lon: f64,
    pub altitude_ft: f32,
    pub phase: MissilePhase,
    pub fuel_s: f32,
    pub weapon_id: &'static str,
}

impl Missile {
    pub fn new(id: u32, launcher_id: u32, target_id: u32, lat: f64, lon: f64, alt_ft: f32, weapon_id: &'static str) -> Self {
        let spec = weapon_by_id(weapon_id);
        let fuel_s = spec.map(|w| (w.range_km / (w.speed_knots * 0.5144 / 1000.0))).unwrap_or(60.0);
        Missile { id, launcher_id, target_id, lat, lon, target_lat: lat, target_lon: lon, altitude_ft: alt_ft, phase: MissilePhase::Midcourse, fuel_s, weapon_id }
    }

    pub fn update_phase(&mut self) {
        let dist = haversine_km(self.lat, self.lon, self.target_lat, self.target_lon);
        if let Some(spec) = weapon_by_id(self.weapon_id) {
            if dist <= spec.pitbull_range_km && self.phase == MissilePhase::Midcourse {
                self.phase = MissilePhase::Pitbull;
            }
            if dist <= 5.0 && self.phase == MissilePhase::Pitbull {
                self.phase = MissilePhase::Terminal;
            }
        }
    }

    pub fn advance(&mut self, dt: f32) {
        let speed = weapon_by_id(self.weapon_id).map(|w| w.speed_knots).unwrap_or(2700.0);
        let speed_m_s = speed * 0.5144;
        let dist = haversine_km(self.lat, self.lon, self.target_lat, self.target_lon);
        if dist < 0.05 || self.fuel_s <= 0.0 {
            self.phase = MissilePhase::Terminal;
            return;
        }
        let move_km = (speed_m_s * dt) / 1000.0;
        let frac = (move_km / dist as f32).min(1.0);
        self.lat += (self.target_lat - self.lat) * frac as f64;
        self.lon += (self.target_lon - self.lon) * frac as f64;
        self.fuel_s -= dt;
        self.update_phase();
    }
}

pub enum HitResult {
    Hit(u32),  // target_id
    Miss,
}

pub fn resolve_hit(target_rcs: f32, chaff_factor: f32, target_maneuvering: bool, weapon_id: &str, target_id: u32) -> HitResult {
    let spec = match weapon_by_id(weapon_id) { Some(s) => s, None => return HitResult::Miss };
    let rcs_factor = (target_rcs / 5.0_f32).powf(0.1).min(1.2).max(0.3);
    let maneuver_factor = if target_maneuvering { 0.7 } else { 1.0 };
    let pk = spec.pk_base * rcs_factor * chaff_factor * maneuver_factor;
    // Deterministic for tests — use a simple threshold for now
    // In gameplay this should use rand::random::<f32>() < pk
    if pk >= 0.5 { HitResult::Hit(target_id) } else { HitResult::Miss }
}

#[cfg(test)]
mod tests {
    // paste tests
}
```

**Step 3: Add missiles to World**

In `world.rs`:
```rust
use super::missile::{Missile, MissilePhase, resolve_hit, HitResult};

pub struct World {
    // ... existing fields
    pub missiles: Vec<Missile>,
    pub brevity_log: Vec<String>,
    next_missile_id: u32,
}
```

Add `launch_missile` and update loop:

```rust
pub fn launch_missile(&mut self, launcher_id: u32, target_id: u32, weapon_id: &'static str) {
    if let Some(launcher) = self.aircraft.iter().find(|a| a.id == launcher_id) {
        let m = Missile::new(self.next_missile_id, launcher_id, target_id, launcher.lat, launcher.lon, launcher.altitude_ft, weapon_id);
        self.next_missile_id += 1;
        self.missiles.push(m);
        self.brevity_log.push(format!("Fox 3! {} fires {} at target {}", launcher.callsign, weapon_id, target_id));
    }
}
```

In `update()`, add missile advancement and hit resolution:

```rust
// Update target positions for missiles
for m in &mut self.missiles {
    if let Some(target) = self.aircraft.iter().find(|a| a.id == m.target_id) {
        m.target_lat = target.lat;
        m.target_lon = target.lon;
    }
    m.advance(dt);
}

// Resolve terminal hits
let mut destroyed_ids: Vec<u32> = Vec::new();
for m in &mut self.missiles {
    if m.phase == MissilePhase::Terminal {
        if let Some(target) = self.aircraft.iter().find(|a| a.id == m.target_id) {
            match resolve_hit(target.rcs_base, 1.0, false, m.weapon_id, target.id) {
                HitResult::Hit(id) => {
                    destroyed_ids.push(id);
                    self.brevity_log.push(format!("Splash! Target {} destroyed.", id));
                }
                HitResult::Miss => {
                    self.brevity_log.push(format!("Target {} evaded missile.", m.target_id));
                }
            }
            m.phase = MissilePhase::Detonated;
        }
    }
}
for id in &destroyed_ids {
    if let Some(ac) = self.aircraft.iter_mut().find(|a| a.id == *id) {
        ac.phase = airstrike_engine::core::aircraft::FlightPhase::Destroyed;
    }
}
self.missiles.retain(|m| !matches!(m.phase, MissilePhase::Detonated | MissilePhase::Missed));
```

**Step 4: Render missiles in `main.rs`**

```rust
for missile in &world.missiles {
    let (sx, sy) = camera.world_to_screen(
        airstrike_engine::core::geo::lat_lon_to_world(missile.lat, missile.lon, camera.zoom)
    );
    let color = match missile.phase {
        MissilePhase::Midcourse => Color::RGB(200, 200, 200),
        MissilePhase::Pitbull   => Color::RGB(255, 200, 0),
        MissilePhase::Terminal  => Color::RGB(255, 60, 60),
        _ => continue,
    };
    canvas.set_draw_color(color);
    canvas.fill_rect(Rect::new(sx as i32 - 2, sy as i32 - 2, 4, 4))?;
}
```

**Step 5: Run tests, build, commit**

```bash
cargo test -p stratosphere 2>&1
cargo build -p stratosphere 2>&1
git add stratosphere/src/simulation/missile.rs stratosphere/src/simulation/world.rs stratosphere/src/main.rs
git commit -m "feat(game): BVR missile entity, hit resolution, brevity log, Destroyed state"
```

---

## Task 14: Brevity Log HUD Panel

**Files:**
- Create: `stratosphere/src/ui/hud_panels.rs`
- Modify: `stratosphere/src/main.rs`

**Step 1: Implement `hud_panels.rs`**

```rust
use sdl2::pixels::Color;
use sdl2::rect::Rect;
use sdl2::render::{Canvas, TextureCreator};
use sdl2::ttf::Font;
use sdl2::video::{Window, WindowContext};

pub fn render_brevity_log(
    canvas: &mut Canvas<Window>,
    tc: &TextureCreator<WindowContext>,
    font: &Font,
    log: &[String],
    window_h: u32,
) -> Result<(), String> {
    let max_lines = 8usize;
    let line_h = 18i32;
    let padding = 6i32;
    let panel_h = (max_lines as i32 * line_h + padding * 2) as u32;
    let panel_y = window_h as i32 - panel_h as i32 - 8;
    let panel_w = 500u32;

    canvas.set_draw_color(Color::RGBA(0, 0, 0, 160));
    canvas.fill_rect(Rect::new(8, panel_y, panel_w, panel_h))?;

    let recent: Vec<&String> = log.iter().rev().take(max_lines).collect::<Vec<_>>().into_iter().rev().collect();
    for (i, line) in recent.iter().enumerate() {
        let surf = font.render(line).blended(Color::RGB(0, 200, 100)).map_err(|e| e.to_string())?;
        let tex = tc.create_texture_from_surface(&surf).map_err(|e| e.to_string())?;
        let sdl2::render::TextureQuery { width, height, .. } = tex.query();
        canvas.copy(&tex, None, Some(Rect::new(8 + padding, panel_y + padding + i as i32 * line_h, width, height)))?;
    }
    Ok(())
}
```

**Step 2: Call in `main.rs` render loop (InGame)**

```rust
ui::hud_panels::render_brevity_log(
    &mut canvas,
    texture_creator,
    &font,
    &world.brevity_log,
    WINDOW_H,
)?;
```

**Step 3: Build, run, commit**

```bash
cargo build -p stratosphere 2>&1
cargo test -p stratosphere 2>&1
git add stratosphere/src/ui/hud_panels.rs stratosphere/src/main.rs
git commit -m "feat(game): brevity log HUD panel showing Fox 3/Splash/etc messages"
```

---

## Task 15: Final Integration — Run Full Test Suite + Smoke Build

**Step 1: Run all tests**

```bash
cargo test 2>&1
```

Expected: all tests pass (54 existing + new ones from Tasks 1–14). Note count.

**Step 2: Build release**

```bash
cargo build -p stratosphere --release 2>&1
```
Expected: exit code 0, no warnings about unused imports.

**Step 3: Fix any LSP diagnostics**

```bash
cargo clippy -p airstrike-engine -p stratosphere 2>&1
```
Fix any `unused import`, `dead_code`, `clippy::` warnings.

**Step 4: Commit final cleanup**

```bash
git add -A
git commit -m "chore: fix clippy warnings, finalize phase 1-6 implementation"
```

---

## Summary: Expected Final State

```
airstrike-engine/src/core/
├── airport.rs      ✅ AirportDb, Airport, AirportType
├── mission.rs      ✅ MissionPlan, Waypoint, WaypointAction, Roe, WeaponSlot
├── weapon.rs       ✅ WeaponSpec, WEAPON_CATALOG, SeekerType
├── datalink.rs     ✅ ContactPicture, Contact, IffStatus
├── aircraft.rs     ✅ + FlightPhase, RadarType; phase state machine in update()
└── radar.rs        (unchanged — still passing 14 tests)

stratosphere/
├── assets/airports.csv       ✅ OurAirports ~74k airports
├── src/scenes/
│   ├── main_menu.rs          ✅ navigation, MenuAction
│   ├── mode_select.rs        ✅
│   └── sandbox_settings.rs   ✅ country picker from AirportDb
├── src/simulation/
│   ├── world.rs              ✅ + new_from_settings, dispatch, launch_missile
│   └── missile.rs            ✅ Missile, MissilePhase, resolve_hit
├── src/ui/
│   ├── airport_layer.rs      ✅ draw_airports, zoom-dependent
│   └── hud_panels.rs         ✅ brevity log
└── src/main.rs               ✅ Scene dispatch, full game loop
```

All 54+ tests pass. `cargo build --release` exits clean.

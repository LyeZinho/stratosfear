use airstrike_engine::core::aircraft::{Aircraft, FlightPhase, Side};
use airstrike_engine::core::airport::{Airport, AirportDb, AirportType};
use airstrike_engine::core::radar::{RadarSystem, bearing_deg};
use airstrike_engine::core::datalink::{ContactPicture, Contact, IffStatus};
use airstrike_engine::core::mission::MissionPlan;

use super::missile::{resolve_hit, HitResult, Missile, MissilePhase};

pub struct World {
    pub aircraft: Vec<Aircraft>,
    pub airports: Vec<Airport>,
    pub radars: Vec<RadarSystem>,
    pub credits: u32,
    pub game_time_s: f32,
    pub missiles: Vec<Missile>,
    pub contact_picture: ContactPicture,
    pub brevity_log: Vec<String>,
    next_id: u32,
    next_missile_id: u32,
}

impl World {
    pub fn new() -> Self {
        World {
            aircraft: Vec::new(),
            airports: Vec::new(),
            radars: vec![RadarSystem::new(38.716, -9.142, 50.0, 400.0)],
            credits: 0,
            game_time_s: 0.0,
            missiles: Vec::new(),
            contact_picture: ContactPicture::new(),
            brevity_log: Vec::new(),
            next_id: 1,
            next_missile_id: 1,
        }
    }

    pub fn new_from_settings(country_iso: &str, starting_credits: u32, db: &AirportDb) -> Self {
        let airports: Vec<Airport> = db.for_country(country_iso).into_iter().cloned().collect();
        // One radar per Large or Medium airport
        use rand::Rng;
        let mut rng = rand::thread_rng();

        let radars: Vec<RadarSystem> = airports
            .iter()
            .filter_map(|a| {
                let mut r = match a.airport_type {
                    AirportType::Large => Some(RadarSystem::new(a.lat, a.lon, 50.0, 400.0)),
                    AirportType::Medium => Some(RadarSystem::new(a.lat, a.lon, 30.0, 250.0)),
                    _ => None,
                };
                if let Some(ref mut radar) = r {
                    radar.sweep_angle = rng.gen_range(0.0..360.0);
                    radar.sweep_dir = if rng.gen_bool(0.5) { 1.0 } else { -1.0 };
                }
                r
            })
            .collect();
        // Fallback: if no airports, put a default radar
        let mut radars = if radars.is_empty() {
            vec![RadarSystem::new(0.0, 0.0, 50.0, 400.0)]
        } else {
            radars
        };
        // Randomize fallback too
        if radars.len() == 1 && radars[0].position_lat == 0.0 {
            radars[0].sweep_angle = rng.gen_range(0.0..360.0);
            radars[0].sweep_dir = if rng.gen_bool(0.5) { 1.0 } else { -1.0 };
        }
        let mut world = World {
            aircraft: Vec::new(),
            airports: airports.clone(),
            radars,
            credits: starting_credits,
            game_time_s: 0.0,
            missiles: Vec::new(),
            contact_picture: ContactPicture::new(),
            brevity_log: Vec::new(),
            next_id: 1,
            next_missile_id: 1,
        };
        for airport in &airports {
            let model = match airport.airport_type {
                AirportType::Large => "F-16C",
                AirportType::Medium => "Gripen",
                AirportType::Small | AirportType::Other => continue,
            };
            let callsign = format!("{}-01", airport.icao);
            let mut ac = Aircraft::new(world.next_id, &callsign, model, Side::Friendly);
            world.next_id += 1;
            ac.lat = airport.lat;
            ac.lon = airport.lon;
            ac.altitude_ft = airport.elevation_ft;
            ac.phase = FlightPhase::ColdDark;
            ac.home_airport_icao = airport.icao.clone();
            ac.home_airport_lat = airport.lat;
            ac.home_airport_lon = airport.lon;
            ac.home_runway_heading_deg = airport.runway_heading_deg;
            world.aircraft.push(ac);
        }
        world
    }

    pub fn launch_missile(&mut self, launcher_id: u32, target_id: u32, weapon_id: &'static str) {
        if let Some(launcher) = self.aircraft.iter().find(|a| a.id == launcher_id) {
            let m = Missile::new(
                self.next_missile_id,
                launcher_id,
                target_id,
                launcher.lat,
                launcher.lon,
                launcher.altitude_ft,
                weapon_id,
            );
            self.next_missile_id += 1;
            self.brevity_log.push(format!(
                "Fox 3! {} fires {} at target {}",
                launcher.callsign, weapon_id, target_id
            ));
            self.missiles.push(m);
        }
    }

    pub fn dispatch_with_mission(&mut self, id: u32, plan: MissionPlan) -> bool {
        if let Some(ac) = self.aircraft.iter_mut().find(|a| a.id == id) {
            if matches!(ac.phase, FlightPhase::ColdDark) {
                ac.mission = Some(plan);
                ac.waypoint_index = 0;
                ac.phase = FlightPhase::Preflight {
                    elapsed_s: 0.0,
                    required_s: 30.0,
                };
                return true;
            }
        }
        false
    }

    pub fn spawn_demo(&mut self) {
        let mut f1 = Aircraft::new(self.next_id, "EAGLE1", "F-16C", Side::Friendly);
        self.next_id += 1;
        f1.lat = 39.5;
        f1.lon = -9.5;
        f1.heading_deg = 120.0;
        f1.speed_knots = 450.0;
        f1.altitude_ft = 25_000.0;
        f1.rcs_base = 1.2;
        f1.phase = FlightPhase::EnRoute;
        self.aircraft.push(f1);

        let mut f2 = Aircraft::new(self.next_id, "EAGLE2", "F-16C", Side::Friendly);
        self.next_id += 1;
        f2.lat = 39.3;
        f2.lon = -8.8;
        f2.heading_deg = 300.0;
        f2.speed_knots = 450.0;
        f2.altitude_ft = 24_000.0;
        f2.rcs_base = 1.2;
        f2.phase = FlightPhase::EnRoute;
        self.aircraft.push(f2);

        let mut h1 = Aircraft::new(self.next_id, "BOGEY1", "Su-27", Side::Hostile);
        self.next_id += 1;
        h1.lat = 38.9;
        h1.lon = -7.5;
        h1.heading_deg = 270.0;
        h1.speed_knots = 520.0;
        h1.altitude_ft = 500.0;
        h1.rcs_base = 4.0;
        h1.phase = FlightPhase::EnRoute;
        self.aircraft.push(h1);

        let mut h2 = Aircraft::new(self.next_id, "BOGEY2", "Su-27", Side::Hostile);
        self.next_id += 1;
        h2.lat = 39.1;
        h2.lon = -7.2;
        h2.heading_deg = 250.0;
        h2.speed_knots = 500.0;
        h2.altitude_ft = 18_000.0;
        h2.rcs_base = 3.5;
        h2.phase = FlightPhase::EnRoute;
        self.aircraft.push(h2);
    }

    pub fn update(&mut self, dt: f32) {
        self.game_time_s += dt;

        // Rotate radars
        let sweep_speed = 45.0; // deg/s
        for radar in &mut self.radars {
            radar.sweep_angle = (radar.sweep_angle + radar.sweep_dir * sweep_speed * dt).rem_euclid(360.0);
        }
        for ac in &mut self.aircraft {
            if let Some(ref mut radar) = ac.own_radar {
                radar.sweep_angle = (radar.sweep_angle + radar.sweep_dir * sweep_speed * dt).rem_euclid(360.0);
            }
            ac.update(dt);
        }

        use airstrike_engine::core::radar::rcs_for_model;
        // Detected if ANY radar can see this aircraft
        let detections: Vec<bool> = self
            .aircraft
            .iter()
            .map(|ac| {
                let (rf, rl) = rcs_for_model(&ac.model);
                self.radars.iter().any(|radar| {
                    radar.is_detected(ac.lat, ac.lon, ac.altitude_ft, ac.heading_deg, rf, rl)
                })
            })
            .collect();

        for (ac, detected) in self.aircraft.iter_mut().zip(detections.iter()) {
            ac.is_detected = *detected;
            ac.detection_confidence = if *detected { 1.0 } else { 0.0 };
        }

        // Per-aircraft radar scanning and datalink update
        self.contact_picture.prune(10.0, self.game_time_s);
        
        let mut new_contacts = Vec::new();
        // 1. Ground radars update picture
        for (i, ac) in self.aircraft.iter().enumerate() {
            if detections[i] {
                new_contacts.push(Contact {
                    aircraft_id: ac.id,
                    lat: ac.lat,
                    lon: ac.lon,
                    altitude_ft: ac.altitude_ft,
                    heading_deg: ac.heading_deg,
                    iff: match ac.side {
                        Side::Friendly => IffStatus::Friendly,
                        Side::Hostile => IffStatus::Hostile,
                        Side::Unknown => IffStatus::Unknown,
                    },
                    last_updated_s: self.game_time_s,
                });
            }
        }

        // 2. Airborne radars scan and update picture
        for i in 0..self.aircraft.len() {
            let (radar_lat, radar_lon, _radar_alt, radar_heading, _side, radar_opt) = {
                let ac = &self.aircraft[i];
                if ac.phase == FlightPhase::Destroyed || ac.side != Side::Friendly {
                    continue;
                }
                (ac.lat, ac.lon, ac.altitude_ft, ac.heading_deg, ac.side, ac.own_radar.clone())
            };

            if let Some(radar) = radar_opt {
                use airstrike_engine::core::radar::rcs_for_model;
                for j in 0..self.aircraft.len() {
                    if i == j { continue; }
                    let (target_lat, target_lon, target_alt, target_heading, target_model, target_id, target_side) = {
                        let target = &self.aircraft[j];
                        if target.phase == FlightPhase::Destroyed { continue; }
                        (target.lat, target.lon, target.altitude_ft, target.heading_deg, target.model.clone(), target.id, target.side)
                    };

                    let (_rf, _rl) = rcs_for_model(&target_model);
                    // Ground radar logic reused for airborne (RadarSystem is omni, but we can wrap it)
                    // For now, let's just use a simple distance + FOV check
                    let dist = airstrike_engine::core::radar::haversine_km(radar_lat, radar_lon, target_lat, target_lon);
                    if dist <= radar.range_km {
                        // Check FOV
                        let b = bearing_deg(radar_lat, radar_lon, target_lat, target_lon);
                        let diff = (b - radar_heading).abs();
                        let diff = if diff > 180.0 { 360.0 - diff } else { diff };
                        
                        if radar.arc_deg >= 360.0 || diff <= radar.arc_deg / 2.0 {
                            // Target is in radar volume
                            new_contacts.push(Contact {
                                aircraft_id: target_id,
                                lat: target_lat,
                                lon: target_lon,
                                altitude_ft: target_alt,
                                heading_deg: target_heading,
                                iff: match target_side {
                                    Side::Friendly => IffStatus::Friendly,
                                    Side::Hostile => IffStatus::Hostile,
                                    Side::Unknown => IffStatus::Unknown,
                                },
                                last_updated_s: self.game_time_s,
                            });
                        }
                    }
                }
            }
        }

        for c in new_contacts {
            self.contact_picture.upsert(c);
        }

        // 3. Update aircraft detection state from ContactPicture
        for ac in &mut self.aircraft {
            if ac.side == Side::Friendly {
                ac.is_detected = true; // Friendlies always seen by "center"
                ac.detection_confidence = 1.0;
            } else {
                let detected = self.contact_picture.contacts.contains_key(&ac.id);
                ac.is_detected = detected;
                ac.detection_confidence = if detected { 1.0 } else { 0.0 };
            }
        }

        // 4. Formation coordination
        let mut formation_status = std::collections::HashMap::new();
        for ac in &self.aircraft {
            if let Some(m) = &ac.mission {
                if !m.formation_ids.is_empty() {
                    let all_airborne = m.formation_ids.iter().all(|&id| {
                        if let Some(member) = self.aircraft.iter().find(|a| a.id == id) {
                            !matches!(member.phase, FlightPhase::ColdDark | FlightPhase::Preflight { .. } | FlightPhase::Taxiing { .. } | FlightPhase::TakeoffRoll { .. })
                        } else { true }
                    });
                    formation_status.insert(ac.id, all_airborne);
                }
            }
        }

        for ac in &mut self.aircraft {
            if let Some(&all_airborne) = formation_status.get(&ac.id) {
                if !all_airborne {
                    if matches!(ac.phase, FlightPhase::Climbing { .. } | FlightPhase::EnRoute) {
                        ac.phase = FlightPhase::FormationHold {
                            orbit_lat: ac.home_airport_lat,
                            orbit_lon: ac.home_airport_lon,
                            orbit_radius_km: 5.0,
                        };
                    }
                } else if matches!(ac.phase, FlightPhase::FormationHold { .. }) {
                    ac.phase = FlightPhase::EnRoute;
                }
            }
        }

        for m in &mut self.missiles {
            if let Some(target) = self.aircraft.iter().find(|a| a.id == m.target_id) {
                m.target_lat = target.lat;
                m.target_lon = target.lon;
            }
            m.advance(dt);
        }

        let mut destroyed_ids: Vec<u32> = Vec::new();
        for m in &mut self.missiles {
            if m.phase == MissilePhase::Terminal {
                let (target_rcs, target_id) = self
                    .aircraft
                    .iter()
                    .find(|a| a.id == m.target_id)
                    .map(|a| (a.rcs_base, a.id))
                    .unwrap_or((1.0, m.target_id));
                match resolve_hit(target_rcs, 1.0, false, m.weapon_id, target_id) {
                    HitResult::Hit(id) => {
                        destroyed_ids.push(id);
                        self.brevity_log
                            .push(format!("Splash! Target {} destroyed.", id));
                    }
                    HitResult::Miss => {
                        self.brevity_log
                            .push(format!("Target {} evaded missile.", m.target_id));
                    }
                }
                m.phase = MissilePhase::Detonated;
            }
        }
        for id in &destroyed_ids {
            if let Some(ac) = self.aircraft.iter_mut().find(|a| a.id == *id) {
                ac.phase = FlightPhase::Destroyed;
            }
        }
        self.missiles
            .retain(|m| !matches!(m.phase, MissilePhase::Detonated | MissilePhase::Missed));
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_spawn_demo_creates_four_aircraft() {
        let mut world = World::new();
        world.spawn_demo();
        assert_eq!(world.aircraft.len(), 4);
    }

    #[test]
    fn test_update_moves_aircraft() {
        let mut world = World::new();
        world.spawn_demo();
        let lat_before = world.aircraft[0].lat;
        world.update(60.0);
        assert_ne!(
            world.aircraft[0].lat, lat_before,
            "aircraft should have moved"
        );
    }

    #[test]
    fn test_ids_are_unique() {
        let mut world = World::new();
        world.spawn_demo();
        let ids: Vec<u32> = world.aircraft.iter().map(|a| a.id).collect();
        let unique: std::collections::HashSet<u32> = ids.iter().cloned().collect();
        assert_eq!(ids.len(), unique.len(), "all aircraft IDs must be unique");
    }

    #[test]
    fn test_detection_state_initialised_false() {
        let mut world = World::new();
        world.spawn_demo();
        for ac in &world.aircraft {
            assert!(
                !ac.is_detected,
                "aircraft {} should start not detected",
                ac.id
            );
            assert_eq!(
                ac.detection_confidence, 0.0,
                "aircraft {} should have 0.0 confidence",
                ac.id
            );
        }
    }

    #[test]
    fn test_detected_aircraft_within_radar_range() {
        let mut world = World::new();
        let mut ac = Aircraft::new(1, "TEST1", "F-16C", Side::Friendly);
        ac.lat = 38.8;
        ac.lon = -9.2;
        ac.altitude_ft = 25_000.0;
        ac.heading_deg = 90.0;
        world.aircraft.push(ac);

        world.update(1.0);

        assert!(
            world.aircraft[0].is_detected,
            "aircraft within radar range should be detected"
        );
        assert_eq!(world.aircraft[0].detection_confidence, 1.0);
    }

    #[test]
    fn test_undetected_aircraft_beyond_radar_range() {
        let mut world = World::new();
        let mut ac = Aircraft::new(1, "FAR1", "F-16C", Side::Hostile);
        ac.lat = 42.0;
        ac.lon = -5.0;
        ac.altitude_ft = 25_000.0;
        ac.heading_deg = 90.0;
        world.aircraft.push(ac);

        world.update(1.0);

        assert!(
            !world.aircraft[0].is_detected,
            "aircraft beyond radar range should not be detected"
        );
        assert_eq!(world.aircraft[0].detection_confidence, 0.0);
    }

    #[test]
    fn test_world_from_portugal_has_airports() {
        let csv = include_bytes!("../../assets/airports.csv");
        let db = airstrike_engine::core::airport::AirportDb::load(csv);
        let world = World::new_from_settings("PT", 100_000, &db);
        assert!(!world.aircraft.is_empty(), "Portugal should spawn aircraft");
    }

    #[test]
    fn test_world_aircraft_start_cold_dark() {
        let csv = include_bytes!("../../assets/airports.csv");
        let db = airstrike_engine::core::airport::AirportDb::load(csv);
        let world = World::new_from_settings("PT", 100_000, &db);
        for ac in &world.aircraft {
            assert!(
                matches!(ac.phase, FlightPhase::ColdDark),
                "aircraft {} should start ColdDark",
                ac.callsign
            );
        }
    }

    #[test]
    fn test_world_credits_set_from_settings() {
        let csv = include_bytes!("../../assets/airports.csv");
        let db = airstrike_engine::core::airport::AirportDb::load(csv);
        let world = World::new_from_settings("PT", 75_000, &db);
        assert_eq!(world.credits, 75_000);
    }

    #[test]
    fn test_hostile_aircraft_not_visible_beyond_radar() {
        let mut world = World::new();
        let mut hostile = Aircraft::new(99, "BOGEY", "Su-27", Side::Hostile);
        hostile.lat = 50.0;
        hostile.lon = -9.142;
        hostile.altitude_ft = 25_000.0;
        world.aircraft.push(hostile);
        world.update(1.0);
        let h = world
            .aircraft
            .iter()
            .find(|a| a.callsign == "BOGEY")
            .unwrap();
        assert!(
            !h.is_visible(),
            "hostile outside radar should not be visible"
        );
    }

    #[test]
    fn test_aircraft_visible_inside_radar_range() {
        let mut world = World::new();
        let mut ac = Aircraft::new(99, "NEARPLANE", "F-16C", Side::Friendly);
        ac.lat = 38.8;
        ac.lon = -9.2;
        ac.altitude_ft = 25_000.0;
        world.aircraft.push(ac);
        world.update(1.0);
        let found = world
            .aircraft
            .iter()
            .find(|a| a.callsign == "NEARPLANE")
            .unwrap();
        assert!(
            found.is_visible(),
            "aircraft inside radar range should be visible"
        );
    }

    #[test]
    fn test_dispatch_transitions_cold_dark_to_preflight() {
        let mut world = World::new();
        let mut ac = Aircraft::new(10, "DISPATCH1", "F-16C", Side::Friendly);
        ac.phase = FlightPhase::ColdDark;
        world.aircraft.push(ac);
        let plan = MissionPlan {
            mission_type: MissionType::CAP,
            waypoints: vec![],
            loadout: vec![],
            formation_ids: vec![],
            roe: Roe::ReturnFireOnly,
            fuel_reserve_pct: 0.15,
        };
        world.dispatch_with_mission(10, plan);
        let found = world.aircraft.iter().find(|a| a.id == 10).unwrap();
        assert!(
            matches!(found.phase, FlightPhase::Preflight { .. }),
            "dispatched aircraft should be in Preflight, got {:?}",
            found.phase
        );
    }

    #[test]
    fn test_dispatch_only_works_on_cold_dark() {
        let mut world = World::new();
        let mut ac = Aircraft::new(11, "DISPATCH2", "F-16C", Side::Friendly);
        ac.phase = FlightPhase::ColdDark;
        world.aircraft.push(ac);
        let plan = MissionPlan {
            mission_type: MissionType::CAP,
            waypoints: vec![],
            loadout: vec![],
            formation_ids: vec![],
            roe: Roe::ReturnFireOnly,
            fuel_reserve_pct: 0.15,
        };
        world.dispatch_with_mission(11, plan.clone());
        world.dispatch_with_mission(11, plan);
        let found = world.aircraft.iter().find(|a| a.id == 11).unwrap();
        assert!(matches!(found.phase, FlightPhase::Preflight { .. }));
    }
}

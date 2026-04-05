use airstrike_engine::core::aircraft::{Aircraft, FlightPhase, Side};
use airstrike_engine::core::airport::{Airport, AirportDb, AirportType};
use airstrike_engine::core::airbase::Airbase;
use airstrike_engine::core::radar::{RadarSystem, bearing_deg};
use airstrike_engine::core::datalink::{ContactPicture, Contact, IffStatus};
use airstrike_engine::core::mission::MissionPlan;
use crate::ui::mission_panel::MissionBriefingState; // Correct path

use super::missile::{resolve_hit, HitResult, Missile, MissilePhase};

pub struct World {
    pub aircraft: Vec<Aircraft>,
    pub airports: Vec<Airport>,
    pub airbases: Vec<Airbase>, // NEW: Managed airbases
    pub radars: Vec<RadarSystem>,
    pub credits: u32,
    pub game_time_s: f32,
    pub missiles: Vec<Missile>,
    pub contact_picture: ContactPicture,
    pub brevity_log: Vec<String>,
    pub objectives: Vec<airstrike_engine::core::mission::MissionObjective>,
    next_id: u32,
}

impl World {
    pub fn new() -> Self {
        World {
            aircraft: Vec::new(),
            airports: Vec::new(),
            airbases: Vec::new(),
            radars: vec![RadarSystem::new(38.716, -9.142, 50.0, 400.0, Side::Friendly)],
            credits: 0,
            game_time_s: 0.0,
            missiles: Vec::new(),
            contact_picture: ContactPicture::new(),
            brevity_log: Vec::new(),
            objectives: Vec::new(),
            next_id: 1,
        }
    }

    pub fn new_from_settings(country_iso: &str, starting_credits: u32, db: &AirportDb) -> Self {
        // Load airports for the player country and neighbors
        let mut airports = Vec::new();
        // Load ALL Large and Medium airports globally (5k total)
        // With frustum culling, this is fine for rendering.
        for a in &db.airports {
            if matches!(a.airport_type, AirportType::Large | AirportType::Medium) {
                let mut apt = a.clone();
                apt.side = if apt.country_iso == country_iso { Side::Friendly } else { Side::Hostile };
                airports.push(apt);
            }
        }

        use rand::Rng;
        let mut rng = rand::thread_rng();

        // Find the "Theater of Operations" center (player's first friendly airport)
        let first_friendly = airports.iter().find(|a| a.side == Side::Friendly);
        let theater_center = first_friendly.map(|a| (a.lat, a.lon)).unwrap_or((0.0, 0.0));
        let theater_radius_km = 2500.0; // Theater of operations size

        // National Defense Network Spawning (Limited to Theater)
        let mut radars: Vec<RadarSystem> = airports
            .iter()
            .filter(|a| {
                // Friendly radars are always spawned globally
                if a.side == Side::Friendly { return true; }
                // Hostile/Neutral radars only spawned within Theater range
                airstrike_engine::core::radar::haversine_km(theater_center.0, theater_center.1, a.lat, a.lon) < theater_radius_km
            })
            .filter_map(|a| {
                let mut r = match a.airport_type {
                    // Command Center (Large) gets Tier 3 AESA
                    AirportType::Large => {
                        let mut rs = RadarSystem::new(a.lat, a.lon, a.elevation_ft * 0.3048, 480.0, a.side);
                        rs.tier = airstrike_engine::core::radar::RadarTier::Tier3;
                        Some(rs)
                    },
                    // Medium gets Tier 2
                    AirportType::Medium if rng.gen_bool(0.4) => {
                        let mut rs = RadarSystem::new(a.lat, a.lon, a.elevation_ft * 0.3048, 320.0, a.side);
                        rs.tier = airstrike_engine::core::radar::RadarTier::Tier2;
                        Some(rs)
                    },
                    _ => None,
                };
                if let Some(ref mut radar) = r {
                    radar.sweep_angle = rng.gen_range(0.0..360.0);
                    radar.sweep_dir = if rng.gen_bool(0.5) { 1.0 } else { -1.0 };
                }
                r
            })
            .collect();

        // Add 2-3 isolated GCI "Sítios de Radar" in high-ground areas for the player
        if let Some(first) = airports.iter().find(|a| a.side == Side::Friendly) {
             for _ in 0..3 {
                 let mut gci = RadarSystem::new(
                     first.lat + rng.gen_range(-2.0..2.0),
                     first.lon + rng.gen_range(-2.0..2.0),
                     1500.0, // High mountain
                     550.0,  // Massive range
                     Side::Friendly
                 );
                 gci.tier = airstrike_engine::core::radar::RadarTier::Tier3;
                 radars.push(gci);
             }
        }

        let mut airbases = Vec::new();
        for airport in &airports {
            if airport.side == Side::Friendly || airport.airport_type == AirportType::Large {
                airbases.push(Airbase::new(&airport.icao, &airport.name, airport.lat, airport.lon, airport.side));
            }
        }

        let mut world = World {
            aircraft: Vec::new(),
            airports: airports.clone(),
            airbases,
            radars,
            credits: starting_credits,
            game_time_s: 0.0,
            missiles: Vec::new(),
            contact_picture: ContactPicture::new(),
            brevity_log: Vec::new(),
            objectives: Vec::new(),
            next_id: 1,
        };

        for airport in &airports {
            // Theater range check for hostile aircraft spawning
            if airport.side == Side::Hostile && airstrike_engine::core::radar::haversine_km(theater_center.0, theater_center.1, airport.lat, airport.lon) > theater_radius_km {
                continue;
            }

            // Spawn 2-4 aircraft per large airport, 1-2 per medium
            let count = match airport.airport_type {
                AirportType::Large => rng.gen_range(2..4),
                AirportType::Medium => rng.gen_range(1..2),
                _ => 0,
            };

            for i in 0..count {
                let spec = airstrike_engine::core::aircraft_specs::get_random_spec(airport.side);
                let callsign = format!("{}-{:02}", airport.icao, i + 1);
                let mut ac = Aircraft::new(world.next_id, &callsign, spec.model, airport.side);
                world.next_id += 1;
                ac.apply_spec(&spec);
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
        }

        // Initial Objectives
        world.objectives.push(airstrike_engine::core::mission::MissionObjective {
            id: 1,
            title: "Border Patrol".to_string(),
            description: "Patrol the border to deter hostile incursions.".to_string(),
            objective_type: airstrike_engine::core::mission::ObjectiveType::PatrolArea { lat: 39.0, lon: -7.0, radius_km: 100.0 },
            is_completed: false,
            reward_credits: 5000,
        });

        world
    }
    pub fn dispatch_with_mission(&mut self, id: u32, plan: MissionPlan) -> bool {
        if let Some(ac) = self.aircraft.iter_mut().find(|a| a.id == id) {
            if matches!(ac.phase, FlightPhase::ColdDark) {
                ac.mission = Some(plan);
                ac.waypoint_index = 0;
                ac.phase = FlightPhase::Preflight {
                    elapsed_s: 0.0,
                    required_s: 10.0, // Reduced from 30.0 for faster gameplay
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

        for base in &mut self.airbases {
            base.update(dt);
        }

        use airstrike_engine::core::radar::rcs_for_model;
        // Detected if ANY radar can see this aircraft
        let detections: Vec<bool> = self
            .aircraft
            .iter()
            .map(|ac| {
                let (rf, rl) = rcs_for_model(&ac.model);
                if ac.side == Side::Friendly {
                    return true;
                }
                self.radars.iter()
                    .filter(|r| r.side == Side::Friendly) // Only friendly radars track for player
                    .filter(|r| {
                        // Culling: Only check radars within 1000km to save trig calls
                        let dx = (r.position_lat - ac.lat).abs();
                        let dy = (r.position_lon - ac.lon).abs();
                        dx < 10.0 && dy < 15.0 // Rough bounding box (~1100km)
                    })
                    .any(|radar| {
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

        // 5. Strategic AI: Intercept hosts
        let hostile_bases: Vec<String> = self.airports.iter()
            .filter(|a| a.side == Side::Hostile)
            .map(|a| a.icao.clone())
            .collect();

        let threats: Vec<(f64, f64)> = self.aircraft.iter()
            .filter(|a| a.side == Side::Friendly && a.is_detected && a.phase != FlightPhase::Destroyed)
            .map(|a| (a.lat, a.lon))
            .collect();

        if !threats.is_empty() {
            for base_icao in hostile_bases {
                let airport = self.airports.iter().find(|a| a.icao == base_icao).unwrap();
                // Check if any threat is near this base
                let has_threat = threats.iter().any(|(t_lat, t_lon)| {
                    airstrike_engine::core::radar::haversine_km(airport.lat, airport.lon, *t_lat, *t_lon) < 300.0
                });

                if has_threat {
                    // Try to find a ready aircraft at this base
                    let ready_ac_id = self.aircraft.iter()
                        .find(|a| a.home_airport_icao == base_icao && a.phase == FlightPhase::ColdDark)
                        .map(|a| a.id);

                    if let Some(id) = ready_ac_id {
                        // Launch it!
                        let threat_pos = threats[0]; // Intercept first threat
                        let plan = MissionPlan {
                            mission_type: airstrike_engine::core::mission::MissionType::CAP,
                            waypoints: vec![
                                airstrike_engine::core::mission::Waypoint {
                                    lat: threat_pos.0,
                                    lon: threat_pos.1,
                                    altitude_ft: 25_000.0,
                                    speed_knots: 450.0,
                                    action: airstrike_engine::core::mission::WaypointAction::FlyOver,
                                }
                            ],
                            loadout: vec![],
                            formation_ids: vec![],
                            roe: airstrike_engine::core::mission::Roe::EngageHostiles,
                            fuel_reserve_pct: 0.1,
                        };
                        self.dispatch_with_mission(id, plan);
                    }
                }
            }
        }

        // Check Objectives
        for obj in &mut self.objectives {
            if obj.is_completed { continue; }
            match &obj.objective_type {
                airstrike_engine::core::mission::ObjectiveType::InterceptAsset { target_id } => {
                    if let Some(target) = self.aircraft.iter().find(|a| a.id == *target_id) {
                        if target.phase == FlightPhase::Destroyed {
                            obj.is_completed = true;
                            self.credits += obj.reward_credits;
                            self.brevity_log.push(format!("Objective Complete: {}. Credits: +{}", obj.title, obj.reward_credits));
                        }
                    }
                }
                airstrike_engine::core::mission::ObjectiveType::PatrolArea { lat, lon, radius_km } => {
                    let has_friendly_near = self.aircraft.iter().any(|a| {
                        a.side == Side::Friendly && a.phase != FlightPhase::Destroyed &&
                        airstrike_engine::core::radar::haversine_km(a.lat, a.lon, *lat, *lon) < *radius_km
                    });
                    if has_friendly_near {
                        obj.is_completed = true;
                        self.credits += obj.reward_credits;
                        self.brevity_log.push(format!("Objective Complete: {}. Credits: +{}", obj.title, obj.reward_credits));
                    }
                }
                _ => {}
            }
        }
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

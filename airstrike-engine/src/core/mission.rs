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

#[derive(Debug, Clone, Copy, PartialEq)]
pub enum MissionType {
    CAP,
    Strike,
    Escort,
    Intercept,
    Recon,
}

#[derive(Debug, Clone, PartialEq)]
pub enum Roe {
    WeaponsFree,
    ReturnFireOnly,
    HoldFire,
    EngageHostiles,
}

#[derive(Debug, Clone)]
pub struct WeaponSlot {
    pub weapon_id: String,
    pub count: u8,
}

#[derive(Debug, Clone)]
pub enum ObjectiveType {
    InterceptAsset { target_id: u32 },
    PatrolArea { lat: f64, lon: f64, radius_km: f32 },
    DefendBase { icao: String },
}

#[derive(Debug, Clone)]
pub struct MissionObjective {
    pub id: u32,
    pub title: String,
    pub description: String,
    pub objective_type: ObjectiveType,
    pub is_completed: bool,
    pub reward_credits: u32,
}

#[derive(Debug, Clone)]
pub struct MissionPlan {
    pub mission_type: MissionType,
    pub waypoints: Vec<Waypoint>,
    pub loadout: Vec<WeaponSlot>,
    pub formation_ids: Vec<u32>,
    pub roe: Roe,
    pub fuel_reserve_pct: f32,
}

impl MissionPlan {
    pub fn current_waypoint(&self, index: usize) -> Option<&Waypoint> {
        self.waypoints.get(index)
    }

    pub fn fuel_needed_kg(&self, speed_knots: f32, burn_rate_per_s: f32) -> f32 {
        let mut total_dist_km = 0.0;
        let mut prev_lat = 0.0;
        let mut prev_lon = 0.0;
        let mut first = true;

        for wp in &self.waypoints {
            if !first {
                total_dist_km += crate::core::radar::haversine_km(prev_lat, prev_lon, wp.lat, wp.lon);
            }
            prev_lat = wp.lat;
            prev_lon = wp.lon;
            first = false;
        }

        let speed_km_s = (speed_knots * 1.852) / 3600.0;
        let time_s = total_dist_km / speed_km_s;
        let fuel_flight = time_s * burn_rate_per_s;
        
        fuel_flight * (1.0 + self.fuel_reserve_pct)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_mission_plan_default_roe_is_return_fire() {
        let plan = MissionPlan {
            mission_type: MissionType::CAP,
            waypoints: vec![],
            loadout: vec![],
            formation_ids: vec![],
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
        let slot = WeaponSlot {
            weapon_id: "AIM-120C".to_string(),
            count: 4,
        };
        assert_eq!(slot.count, 4);
    }

    #[test]
    fn test_mission_with_waypoints() {
        let plan = MissionPlan {
            mission_type: MissionType::Strike,
            waypoints: vec![
                Waypoint {
                    lat: 38.716,
                    lon: -9.142,
                    altitude_ft: 25_000.0,
                    speed_knots: 450.0,
                    action: WaypointAction::FlyOver,
                },
                Waypoint {
                    lat: 39.0,
                    lon: -9.0,
                    altitude_ft: 25_000.0,
                    speed_knots: 450.0,
                    action: WaypointAction::Rtb,
                },
            ],
            loadout: vec![WeaponSlot {
                weapon_id: "AIM-120C".to_string(),
                count: 4,
            }],
            formation_ids: vec![],
            roe: Roe::WeaponsFree,
            fuel_reserve_pct: 0.15,
        };
        assert_eq!(plan.waypoints.len(), 2);
        assert_eq!(plan.loadout[0].count, 4);
    }
}

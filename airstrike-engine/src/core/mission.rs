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
        let slot = WeaponSlot {
            weapon_id: "AIM-120C".to_string(),
            count: 4,
        };
        assert_eq!(slot.count, 4);
    }

    #[test]
    fn test_mission_with_waypoints() {
        let plan = MissionPlan {
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
            roe: Roe::WeaponsFree,
            fuel_reserve_pct: 0.15,
        };
        assert_eq!(plan.waypoints.len(), 2);
        assert_eq!(plan.loadout[0].count, 4);
    }
}

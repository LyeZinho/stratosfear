use crate::core::aircraft::Side;

#[derive(Debug, Clone, Copy, PartialEq)]
pub struct AircraftSpec {
    pub model: &'static str,
    pub max_speed_knots: f32,
    pub cruise_speed_knots: f32,
    pub fuel_capacity_kg: f32,
    pub fuel_burn_kg_per_s: f32,
    pub radar_range_km: f32,
    pub radar_fov_deg: f32,
    pub empty_weight_kg: f32,
}

pub const SPECS: &[AircraftSpec] = &[
    AircraftSpec {
        model: "F-15C Eagle",
        max_speed_knots: 1450.0,
        cruise_speed_knots: 560.0,
        fuel_capacity_kg: 6100.0,
        fuel_burn_kg_per_s: 0.15,
        radar_range_km: 160.0,
        radar_fov_deg: 120.0,
        empty_weight_kg: 12700.0,
    },
    AircraftSpec {
        model: "Su-27 Flanker",
        max_speed_knots: 1350.0,
        cruise_speed_knots: 540.0,
        fuel_capacity_kg: 9400.0,
        fuel_burn_kg_per_s: 0.18,
        radar_range_km: 150.0,
        radar_fov_deg: 130.0,
        empty_weight_kg: 16380.0,
    },
    AircraftSpec {
        model: "F-16C Viper",
        max_speed_knots: 1150.0,
        cruise_speed_knots: 520.0,
        fuel_capacity_kg: 3200.0,
        fuel_burn_kg_per_s: 0.12,
        radar_range_km: 110.0,
        radar_fov_deg: 120.0,
        empty_weight_kg: 8570.0,
    },
    AircraftSpec {
        model: "MiG-29 Fulcrum",
        max_speed_knots: 1320.0,
        cruise_speed_knots: 540.0,
        fuel_capacity_kg: 3500.0,
        fuel_burn_kg_per_s: 0.16,
        radar_range_km: 80.0,
        radar_fov_deg: 140.0,
        empty_weight_kg: 11000.0,
    },
    AircraftSpec {
        model: "J-11B",
        max_speed_knots: 1350.0,
        cruise_speed_knots: 540.0,
        fuel_capacity_kg: 9400.0,
        fuel_burn_kg_per_s: 0.18,
        radar_range_km: 150.0,
        radar_fov_deg: 130.0,
        empty_weight_kg: 16380.0,
    },
];

pub fn get_random_spec(_side: Side) -> AircraftSpec {
    use rand::seq::SliceRandom;
    let mut rng = rand::thread_rng();
    
    // For now, simple random selection. Later can filter by side-specific inventory.
    *SPECS.choose(&mut rng).unwrap()
}

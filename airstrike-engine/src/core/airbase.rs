use std::collections::HashMap;
use crate::core::aircraft::Side;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
pub enum ComponentType {
    Runway,
    FuelDepot,
    Hangar,
    CommandCenter,
}

#[derive(Debug, Clone)]
pub struct BaseComponent {
    pub health: f32, // 0.0 to 1.0
    pub max_health: f32,
    pub repair_rate: f32, // health per second
}

impl BaseComponent {
    pub fn new(max_health: f32) -> Self {
        BaseComponent {
            health: max_health,
            max_health,
            repair_rate: 0.0,
        }
    }

    pub fn is_operational(&self) -> bool {
        self.health > 0.3 // 30% threshold for basic functionality
    }
}

#[derive(Debug, Clone)]
pub struct Airbase {
    pub icao: String,
    pub name: String,
    pub lat: f64,
    pub lon: f64,
    pub side: Side,
    pub components: HashMap<ComponentType, BaseComponent>,
    pub fuel_kg: f32,
    pub max_fuel_kg: f32,
    pub ammo_slots: u32,
    pub hangar_capacity: u32,
    pub current_aircraft_ids: Vec<u32>,
}

impl Airbase {
    pub fn new(icao: &str, name: &str, lat: f64, lon: f64, side: Side) -> Self {
        let mut components = HashMap::new();
        components.insert(ComponentType::Runway, BaseComponent::new(100.0));
        components.insert(ComponentType::FuelDepot, BaseComponent::new(150.0));
        components.insert(ComponentType::Hangar, BaseComponent::new(200.0));
        components.insert(ComponentType::CommandCenter, BaseComponent::new(80.0));

        Airbase {
            icao: icao.to_string(),
            name: name.to_string(),
            lat,
            lon,
            side,
            components,
            fuel_kg: 50_000.0,
            max_fuel_kg: 100_000.0,
            ammo_slots: 500,
            hangar_capacity: 12,
            current_aircraft_ids: Vec::new(),
        }
    }

    pub fn can_takeoff(&self) -> bool {
        self.components.get(&ComponentType::Runway)
            .map(|c| c.health > 0.6) // Need 60% runway health to takeoff
            .unwrap_or(false)
    }

    pub fn has_datalink(&self) -> bool {
        self.components.get(&ComponentType::CommandCenter)
            .map(|c| c.is_operational())
            .unwrap_or(false)
    }

    pub fn refuel_speed_multiplier(&self) -> f32 {
        let fuel_health = self.components.get(&ComponentType::FuelDepot)
            .map(|c| c.health)
            .unwrap_or(0.0);
        
        if fuel_health > 0.8 { 1.0 }
        else if fuel_health > 0.4 { 3.0 } // 3x slower
        else { 10.0 } // 10x slower (manual buckets!)
    }

    pub fn update(&mut self, dt: f32) {
        for component in self.components.values_mut() {
            if component.health < component.max_health && component.repair_rate > 0.0 {
                component.health = (component.health + component.repair_rate * dt).min(component.max_health);
            }
        }
    }
}

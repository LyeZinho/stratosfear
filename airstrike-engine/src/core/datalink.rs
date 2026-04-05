use std::collections::HashMap;

#[derive(Debug, Clone, PartialEq)]
pub enum IffStatus {
    Unknown,
    Friendly,
    Hostile,
}

#[derive(Debug, Clone, PartialEq)]
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
        ContactPicture {
            contacts: HashMap::new(),
        }
    }

    pub fn upsert(&mut self, contact: Contact) {
        self.contacts.insert(contact.aircraft_id, contact);
    }

    pub fn prune(&mut self, stale_threshold_s: f32, current_time_s: f32) {
        self.contacts
            .retain(|_, c| current_time_s - c.last_updated_s < stale_threshold_s);
    }
}

impl Default for ContactPicture {
    fn default() -> Self {
        Self::new()
    }
}

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
        pic.upsert(Contact {
            aircraft_id: 1,
            lat: 38.0,
            lon: -9.0,
            altitude_ft: 20_000.0,
            heading_deg: 0.0,
            iff: IffStatus::Unknown,
            last_updated_s: 0.0,
        });
        pic.upsert(Contact {
            aircraft_id: 1,
            lat: 39.0,
            lon: -9.0,
            altitude_ft: 20_000.0,
            heading_deg: 0.0,
            iff: IffStatus::Hostile,
            last_updated_s: 1.0,
        });
        assert_eq!(pic.contacts.len(), 1);
        assert!(matches!(pic.contacts[&1].iff, IffStatus::Hostile));
        assert!((pic.contacts[&1].lat - 39.0).abs() < 0.001);
    }

    #[test]
    fn test_prune_removes_stale_contacts() {
        let mut pic = ContactPicture::new();
        pic.upsert(Contact {
            aircraft_id: 1,
            lat: 38.0,
            lon: -9.0,
            altitude_ft: 0.0,
            heading_deg: 0.0,
            iff: IffStatus::Unknown,
            last_updated_s: 0.0,
        });
        pic.prune(10.0, 20.0);
        assert!(
            pic.contacts.is_empty(),
            "contact older than threshold should be pruned"
        );
    }
}

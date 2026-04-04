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
}

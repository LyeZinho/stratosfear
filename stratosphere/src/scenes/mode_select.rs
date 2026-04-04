pub enum ModeSelectAction {
    GoToSandboxSettings,
    Back,
    None,
}

pub struct ModeSelect {
    pub selected: usize,
}

impl ModeSelect {
    pub fn new() -> Self {
        ModeSelect { selected: 0 }
    }

    pub fn move_down(&mut self) {
        self.selected = (self.selected + 1) % 3;
    }

    pub fn move_up(&mut self) {
        self.selected = (self.selected + 2) % 3;
    }

    pub fn confirm(&self) -> ModeSelectAction {
        match self.selected {
            0 => ModeSelectAction::GoToSandboxSettings,
            _ => ModeSelectAction::None,
        }
    }

    pub fn items(&self) -> [&'static str; 3] {
        ["SANDBOX", "CAREER", "MULTIPLAYER"]
    }
}

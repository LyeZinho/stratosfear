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
        MainMenu {
            selected: 0,
            items: ["PLAY", "SETTINGS", "QUIT"],
        }
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
        menu.move_down();
        assert_eq!(menu.selected, 0);
    }

    #[test]
    fn test_main_menu_up_wraps() {
        let mut menu = MainMenu::new();
        menu.move_up();
        assert_eq!(menu.selected, 2);
    }

    #[test]
    fn test_main_menu_confirm_returns_action() {
        let menu = MainMenu::new();
        let action = menu.confirm();
        assert!(matches!(action, MenuAction::GoToModeSelect));
    }
}

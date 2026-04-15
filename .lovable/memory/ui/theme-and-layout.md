---
name: Theme & Layout
description: Dark mode toggle via ThemeContext, desktop sidebar (≥768px) + mobile bottom nav
type: design
---
- ThemeContext in src/contexts/ThemeContext.tsx manages light/dark mode
- Persisted in localStorage key 'savium-theme', default is 'light'
- Toggle button (Sun/Moon icon) in Layout header/sidebar
- Desktop (≥768px): fixed left sidebar 256px wide with nav + user info + theme toggle + logout
- Mobile: compact header + fixed bottom nav bar (5 items)
- Dark theme CSS variables defined in index.css `.dark` class

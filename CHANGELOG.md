# Changelog

## 0.5.1 (security)

- Links from widgets (like a news feed's "Open article") only open web pages, never files or other programs. App windows stay on FrameDeck's own pages.
- Web pages shown in widgets can't use the camera, microphone, location or notifications.
- Importing a layout or preset that points at devices on your own network (a router, a NAS) now asks first.
- The data folder and settings file are readable only by you.
- Other devices on your network can make at most 60 fetch requests a minute through FrameDeck.
- **Check for updates** (Settings): FrameDeck tells you when a newer version is out.
- **Advanced protection** (Settings): turn individual protections off when you need to, with a warning.
- **Code check** in Widget Studio: points out risky code (text from data not escaped, eval, secrets in the code) and better ways to do common things, with line numbers.
- Release builds use pinned versions of GitHub's build tools; Dependabot proposes dependency updates.

## 0.5.0

- **Health widgets you can tap**: a **Pomodoro timer** (focus sessions, short and long breaks, optional chime), a **Water tracker** (tap ＋ for each glass, daily goal and reminders), a **Habit tracker** (tick off habits, 7-day view and streaks) and **Move breaks** (a countdown to your next stretch).
- Their progress is saved on the computer running FrameDeck and shared by every screen, so a glass logged on a tablet shows everywhere.

## 0.4.0

- **Rainmeter skins**: import a `.rmskin` or `.zip` and show Rainmeter skins on any screen, on Mac, Windows and Linux. Supports the common meters and measures, variables, styles, formulas and conditions; plugins and Lua scripts aren't supported. Built as an add-on (`addons/rainmeter/`).
- **Add-ons**: FrameDeck can load optional features from `addons/<name>/` without the core knowing about them.

## 0.3.2

- Supporter keys work on up to 3 computers. Unlocking checks in with FrameDeck's server once; after that the key works offline. **Remove key from this computer** frees its place. Keys unlocked before this version keep working.

## 0.3.1

- **Easier downloads**: one Mac app for Apple silicon and Intel, one Windows installer that picks x64 or ARM by itself, and a one-line install command for Linux and Raspberry Pi that detects the machine.
- A single [Download FrameDeck](https://framedeck-relay.kagura8790.workers.dev/download) link sends each visitor the right file.

## 0.3.0

- **Chinese interface**: FrameDeck now speaks 简体中文 and 繁體中文 as well as English, including the guides, the Widget Studio reference, the display page and the app menu.
- On first start, FrameDeck asks which language to use. Change it any time in **Settings → Language**.

## 0.2.1

- **News feed** now has 19 ready-made feeds (world news, tech, science, sports, BBC 中文). Choose **Custom link…** to use any RSS or Atom feed.
- **Sports scores** adds esports: Dota 2, League of Legends, Counter-Strike 2, Valorant, Overwatch, Rainbow Six Siege and Rocket League, with no account needed. You can paste your own free PandaScore token to skip FrameDeck's shared esports feed.
- Security: calendar links, feed links and esports tokens are no longer sent to other devices on your network; the server fetches them instead.
- Security: addresses are checked at the moment of connecting, so DNS tricks can't reach your local network through a shared display.
- Security: custom widgets can only load public internet addresses, and web pages can no longer call FrameDeck's API directly.

## 0.2.0 (first public release)

- Design dashboard screens on a grid and show them on monitors, tablets and phones (as a home-screen web app), NZXT Kraken LCDs (through NZXT CAM's Web Integration) and Raspberry Pi kiosks.
- 20+ widgets: clocks, date, calendar, weather, countdown, progress, system stats, text, images and video, Hacker News, RSS, world clocks, iCal events, sports scores, crypto, air quality, sun and moon, now playing, rotating text, Kraken stats and web pages.
- Widget Studio for writing your own widgets, page presets, themes, and export/import of screens.
- Displays reopen at login, so a spare monitor works like a picture frame.

# Changelog

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

# FrameDeck

[![Release](https://img.shields.io/github/v/release/Asmo7791/framedeck?include_prereleases)](https://github.com/Asmo7791/framedeck/releases/latest) ![Platforms](https://img.shields.io/badge/platforms-macOS%20%7C%20Windows%20%7C%20Linux%20%7C%20Raspberry%20Pi-ff8a3d) ![License: MIT](https://img.shields.io/badge/license-MIT-blue)

Design your own dashboard screens and show them on any display: a spare monitor, your laptop screen, a tablet or old phone on your Wi-Fi, a round cooler-style screen, or an e-ink panel.

Instead of fixed pages, every screen is a grid you lay out yourself. Widgets pick their own layout from the space they get, so the same weather widget works as a tiny icon on a 240 px round screen and as a full forecast on a 4K monitor.

📖 **Guides:** step-by-step setup for monitors, tablets, NZXT Kraken LCDs and Raspberry Pi, plus the widget reference, are in the **[Wiki](https://github.com/Asmo7791/framedeck/wiki)**.

## Credit

FrameDeck is inspired by [EpaperSystem](https://github.com/Feeengyuuu/EpaperSystem) by Feeengyuuu, a Raspberry Pi colour e-paper dashboard, which builds on [InkyPi](https://github.com/fatihak/InkyPi). FrameDeck doesn't copy their code; it borrows the idea of a rotating information screen and takes it to more kinds of displays. If you have a Raspberry Pi and an e-ink panel, use EpaperSystem: it's excellent.

Weather data comes from [Open-Meteo](https://open-meteo.com) (free for non-commercial use, no API key). News comes from the public Hacker News API.

## Download

Get the latest version from the **[Releases page](https://github.com/Asmo7791/framedeck/releases/latest)**.

| System | File to download |
|---|---|
| Mac with Apple silicon (M1 and newer) | `FrameDeck-<version>-mac-arm64.dmg` |
| Mac with Intel | `FrameDeck-<version>-mac-x64.dmg` |
| Windows 10/11 (most PCs) | `FrameDeck-<version>-windows-x64-setup.exe` |
| Windows on ARM (Surface Pro X, Snapdragon laptops) | `FrameDeck-<version>-windows-arm64-setup.exe` |
| Linux (most PCs) | `FrameDeck-<version>-linux-x64.AppImage`, or the `.deb` for Ubuntu/Debian |
| Raspberry Pi, 64-bit OS (Pi 4/5) | the `linux-arm64` `.deb` or `.AppImage` |
| Raspberry Pi, 32-bit OS | the `linux-armv7l` `.deb` |
| iPhone, iPad, Android | No download: open a screen's link and **Add to Home Screen** (see Guides in the app) |

Mac versions need macOS 12 or newer. Portable `.zip` / `.tar.gz` versions are on the Releases page too.

**Mac:** open the `.dmg` and drag FrameDeck into Applications. The app isn't notarized by Apple yet, so the first time, macOS says it can't check it for malware. Click **Done**, then go to **System Settings → Privacy & Security**, scroll down and click **Open Anyway**. Or run this once in Terminal, then open it normally:

```
xattr -cr /Applications/FrameDeck.app
```

**Windows:** run the setup `.exe`. The app isn't signed yet, so if Windows says it protected your PC, click **More info → Run anyway**.

**Linux / Raspberry Pi:** install the `.deb` with `sudo apt install ./FrameDeck-….deb`, or make the `.AppImage` executable (`chmod +x`) and run it.

## Using it

- **Screens** (left): one per physical display. Add one with **+ Add** and pick a size, or "Match a connected display".
- **Pages**: each screen can rotate through several pages. Set how long each page shows.
- **Widgets**: click to add, or drag onto the screen. Drag to move, drag the handles to resize, arrow keys nudge, Shift+arrows resize, ⌫ deletes, ⌘D duplicates, ⌘Z undoes.
- **Look**: themes, colors, font, card style, corner roundness, spacing. E-ink screens only offer the colors the panel can show.
- **Show on a display**: fullscreen on any connected monitor, in a window, or as a link for a browser.
- **Settings → Share displays on my network** lets phones, tablets and other computers on your Wi-Fi open display links. The editor itself only opens on your Mac.
- **Settings → Open FrameDeck when I log in**: displays that were showing when you quit reopen automatically, so a spare monitor works like a picture frame.
- **Export / Import layout** saves a screen as a `.framedeck.json` file you can back up or share.

In a display window: ← → change page, Esc closes it, double-click toggles fullscreen.

Your layouts are stored in FrameDeck's data folder (Help → Open Data Folder).

## Widgets

Clock (digital/analog, any time zone), Date (English, 中文 and more), Month calendar, Weather, Countdown, Progress (year/month/week/day), This computer (CPU/memory), Text, Image & video (photos, GIFs, looping videos up to 60 s), Hacker News and News feed (19 ready-made feeds such as BBC, NPR, The Verge and BBC 中文, or any RSS/Atom link; tap a headline to read it), World clocks, Calendar events (any iCal link, e.g. Google Calendar), Sports scores (NBA, NFL, MLB, NHL, soccer, and esports: Dota 2, League of Legends, CS2, Valorant, Overwatch, Rainbow Six and Rocket League), Crypto prices, Air quality, Sun & moon, Now playing (Spotify / Music), Rotating text, Kraken stats (liquid/CPU/GPU temperatures from NZXT CAM), Web page (any embeddable page, including StreamElements overlays).

## Your own widgets (Widget Studio)

Under Widgets → My widgets, click **+ New**, or hover any widget and click **✎** to open its code. Widgets are plain HTML, CSS and JavaScript with a live preview at several screen sizes and a console. **Save** updates the widget everywhere; **Save as…** makes a new one and leaves the original alone. Built-in widgets you've edited can be reset to the original. Export a widget to share it; others add it with Import. Custom widget code runs in a sandbox.

## Pages and presets

Pages → **+ Add** offers **Preset** pages (laid out for the screen you're on, including round and e-ink) or a **Custom** blank page / copy. Edit a page made from a preset and use **Save to preset** or **Save as new preset…**. Presets and whole screens export to files you can share; your custom widgets go with them.

## Guides

The **Guides** button walks through: monitors, tablets and phones, **NZXT Kraken LCDs** (via NZXT CAM's Web Integration on a Windows PC), Raspberry Pi / kiosk computers, writing widgets, and presets.

## Support

FrameDeck is free. If you find it useful, the **♥ Support** button in the app has ways to donate. Supporters get a key that unlocks extra themes as a thank-you.

## Roadmap

- Kraken LCD support on Linux through liquidctl
- Pushing images to e-ink panels (Raspberry Pi / Waveshare)
- More widgets: stocks, smart home

## Develop

```
npm install
npm start              # run from source
npm run check          # syntax check + quick server test (also runs on every push)
npm run dist           # build installers for this computer's system into release/
```

Pushing a version tag (`git tag v0.2.1 && git push --tags`) builds every platform on GitHub Actions. See [PUBLISHING.md](PUBLISHING.md).

`src/` is the Electron app and local server, `app/` is the editor and display pages, `app/shared/widgets.js` is the widget library.

Bug reports and ideas are welcome in [Issues](https://github.com/Asmo7791/framedeck/issues); see [CONTRIBUTING.md](CONTRIBUTING.md). For security problems, see [SECURITY.md](SECURITY.md).

## License

[MIT](LICENSE) © 2026 Kai-Tung Yu

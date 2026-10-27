# FrameDeck

Desktop app (Electron) for designing dashboard "screens" and showing them on any display: monitors, tablets/phones (as a home-screen web app), round cooler LCDs like the NZXT Kraken (through NZXT CAM's Web Integration mode), Raspberry Pi kiosks. Inspired by github.com/Feeengyuuu/EpaperSystem (credit it; no code was copied). Owner: Kai-Tung Yu. License: MIT.

## Run and build

- `npm install`, then `npm start` to run from source.
- `npm run dist` builds installers for the current OS into `release/` (electron-builder; config in `package.json` → `build`).
- `.github/workflows/release.yml` builds Mac/Windows/Linux(+Pi) installers when a `v*` tag is pushed. Raspberry Pi 32-bit (armv7l) is pinned to Electron 43.8.3 because Electron 44+ dropped armv7l.
- Windows exe icon without Wine: `node build/set-win-icon.mjs <exe> build/icon.ico <version>` (used with electron-packager builds).

## Layout

- `src/main.js`: Electron main process. Editor window, fullscreen display windows per monitor, reopening displays at login, real display resolution (`size × scaleFactor`).
- `src/server.js`: local HTTP server (port 47820, falls back to next free). Serves `app/`, stores config in the user data folder, data endpoints (`/api/weather`, `/api/hn`, `/api/rss`, `/api/ics`, `/api/scores`, `/api/crypto`, `/api/air`, `/api/nowplaying`, `/api/fetch`, `/api/system`). Editing endpoints are loopback-only and need the `x-framedeck: 1` header. Network sharing binds 0.0.0.0 so other devices can open display links.
- `src/sources.js`: RSS/ICS parsing, ESPN scores, macOS now-playing (osascript), `safeFetch` (remote devices can only reach public addresses).
- `src/license.js`: supporter keys = Ed25519-signed payloads (`FD1-<payload>.<sig>`), verified offline with the embedded public key. Keys are made with `node tools/make-supporter-key.mjs "Name"` using `keys/framedeck-supporter-PRIVATE.pem` (gitignored; never commit it).
- `app/editor.*`: the layout editor (screens, pages, widget palette, inspector, Widget Studio, page presets dialog, Guides, Support/donate dialog).
- `app/display.*`: the player page (also what tablets and NZXT CAM load; detects `?kraken=1` and NZXT CAM's `window.nzxt.v1.onMonitoringDataUpdate`).
- `app/shared/`: `profiles.js` (screen profiles, themes incl. supporter themes, grid sizing), `widgets.js` + `widgets-extra.js` (built-in widgets: each has `settings`, `render(el, s, ctx)`, optional `data()`, `tick`, `css`), `widget-css.js` (CSS for the original built-ins), `render.js` (lays a page out at native pixel size; positions are grid cells), `userwidgets.js` + `runtime.js` (custom/edited widgets run in sandboxed iframes and talk to the parent over postMessage), `presets.js` (page presets in 0–1 fractions), `project.js` (GitHub and PayPal/Venmo/Zelle links; blank = hidden).

## Conventions

- Widgets size everything from their own box with container query units (`cqw`, `cqh`) and `ctx.cls` (`xs/s/m/l`) so they work from a 240 px round screen to 4K. Use theme variables (`--fg`, `--muted`, `--accent`, `--bg`, `--radius`, `--font`). E-ink screens (`data-color="eink6" | "mono"`) get no animation and palette-limited colors.
- Round screens: keep content inside the inscribed square; presets map into 0.16–0.84 of the grid.
- User-facing text is plain, friendly English; the app is also meant for Chinese-speaking users (date/calendar widgets support zh-CN/zh-TW).
- `npm run check` (`tools/check.mjs`) syntax-checks every script and smoke-tests the server without Electron; CI runs it on every push.
- The server rejects requests whose Host header isn't localhost, an IP, or this computer's name (DNS rebinding guard), and rejects API calls marked cross-site by `sec-fetch-site` / `Origin`.
- Secret widget settings (`SECRET_SETTINGS` in `src/server.js`: agenda/rss `url`, scores `token`) are replaced with `fd-ref:<widget id>` for non-local clients; endpoints resolve the reference server-side via `feedUrl()`.
- Custom-widget bridge requests carry `x-framedeck-sandbox: 1` and are treated as non-local (public addresses only). `safeFetch` checks addresses in the connect-time DNS lookup.
- Downloads: release files have version-free names (`FrameDeck-mac.dmg` universal, `FrameDeck-windows-setup.exe` holding x64+ARM, `FrameDeck-linux-<arch>.deb/.AppImage`), so `releases/latest/download/<name>` links stay valid. `install.sh` picks the Linux/Pi package; the relay's `/download` route redirects by user agent.
- Esports: Dota 2 from OpenDota; other games from PandaScore, either with the widget's own token or through the shared relay in `relay/` (a Cloudflare Worker holding one token, caching answers). The relay address is `DEFAULT_RELAY` in `src/relay.js` (`FRAMEDECK_RELAY` overrides; `FRAMEDECK_ESPORTS_RELAY=off` requires a token).
- Supporter keys: unlocking calls the relay's `/activate` with a random per-computer ID (`device.json` in the data folder); the relay's `Activations` Durable Object allows 3 computers per key. Removing calls `/release`. `tools/supporter-key-admin.mjs` checks/resets a key with the `ADMIN_TOKEN` secret (local copy in gitignored `keys/relay-admin-token.txt`).
- Add-ons: `src/addons.js` loads `addons/<name>/` (server routes under `/api/addons/<name>/`, browser files at `/addons/<name>/`, `client/index.js` loaded by `app/shared/addons.js` before first render). The core must stay unaware of specific add-ons. `addons/rainmeter/` is the Rainmeter skin reader (interpreter in `client/engine.js`, canvas drawing in `client/draw.js`, importer and system stats in `server.js`); see its README.
- Interface languages: `app/shared/i18n.js` translates the editor and display page by exact English text (MutationObserver), skipping the stage and `[data-i18n-skip]` (user names). Packs in `app/i18n/` hold `strings` (keys may use `{0}` / `{t0}` placeholders), plus whole translated `guide(id, helpers)` pages and the Widget Studio `help`. `zh-Hant.js` is generated from `zh-Hans.js` with `npm run i18n` (OpenCC, Taiwan phrasing). `config.language` is unset until the first-start picker; `src/main.js` has its own menu translations.
- Widget settings can use `showIf: { key, is }` or `{ key, in: [...] }` to show a field only for some choices.
- Testing so far was done headless (Electron under Xvfb, with mocked network data, screenshotting the editor and display pages). Check visual changes the same way or by running the app.

## Open items

- Links are filled in: GitHub `Asmo7791/framedeck`, Venmo `asmo7791`, public email is the GitHub noreply address. The supporter-key pair was regenerated on 2026-10-26 (private key in gitignored `keys/`).
- Create the GitHub repo and push; first release `v0.2.0`. See `PUBLISHING.md`.
- Windows and Intel-Mac builds haven't run on real hardware yet.
- Roadmap: Kraken LCD on Linux via liquidctl, pushing images to e-ink panels, native iOS/Android viewer apps, more widgets (stocks, smart home).

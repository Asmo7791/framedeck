# Rainmeter add-on

Shows [Rainmeter](https://www.rainmeter.net) skins in FrameDeck, on any system. Import a `.rmskin` (or a `.zip` of a skin folder), add a **Rainmeter skin** widget, and pick the skin.

FrameDeck doesn't run Rainmeter. This add-on reads a skin's `.ini` files and draws them itself, so it supports the parts of Rainmeter that make sense on a display:

| Works | Doesn't |
|---|---|
| Meters: String, Image, Bar, Line, Histogram, Roundline, Rotator, Shape (rectangles, ellipses, lines), Button and Bitmap (drawn, not clickable) | Plugins (`.dll`): AudioLevel, HWiNFO, UsageMonitor… (NowPlaying, SysInfo and WebParser are built in) |
| Measures: Time, CPU (total and per core), PhysicalMemory, SwapMemory, FreeDiskSpace, NetIn/NetOut/NetTotal, Uptime, Calc, String, Loop, WebParser, NowPlaying (Spotify/Music on a Mac), SysInfo | Lua scripts (`Measure=Script`), Registry, Process, RecycleManager |
| `@Include`, `[Variables]`, `#Variables#`, `[MeasureName]` section variables, `MeterStyle`, relative `r`/`R` positions, formulas | Mouse actions, text input, dragging, tooltips |
| `IfCondition`, `IfMatch`, `IfAbove/Below/Equal`, `OnUpdateAction`, `OnChangeAction`, and the bangs `!SetOption`, `!SetVariable`, `!Show/Hide/ToggleMeter(Group)`, `!Enable/DisableMeasure` | `!CommandMeasure`, running programs, opening links |
| Backgrounds (including `BackgroundMode=3` with margins), fonts in `@Resources/Fonts` | `InlineSetting`, `TransformationMatrix`, `Shape` paths and curves (drawn as lines) |

In the editor, a skin that uses something unsupported shows a small note listing it.

On a Mac or Linux, `Drive=C:` means the main disk.

## Safety

Skins are downloads from strangers, so:

- Only skin files are imported: `.ini`, `.inc`, `.txt`, images and fonts inside `Skins/`. Plugins, programs and scripts are skipped, and paths that try to leave the package are refused.
- Formulas are evaluated by a small parser (`client/formula.js`), never `eval`.
- Everything is drawn on a canvas, so text from a skin can't become HTML.
- WebParser requests go through FrameDeck's fetch proxy marked like custom widgets', so they can only reach public addresses.
- Importing and removing skins only works on the computer running FrameDeck.

Skins keep their authors' licenses. Most allow personal use, which is what importing your own download is.

## How it's built

This folder is a FrameDeck add-on (see `src/addons.js`). FrameDeck's core doesn't know anything about Rainmeter; deleting this folder removes the feature.

- `server.js`: imports packages into the add-on's data folder, lists them, serves their files (decoding UTF-16 and Windows-1252 `.ini` files), and measures the system (`/api/addons/rainmeter/system`).
- `lib/zip.js`, `lib/fontname.js`: reading `.rmskin`/`.zip` files and font family names.
- `client/engine.js`: the interpreter: `.ini` parsing, variables, measures, conditions, bangs and layout. No DOM, so it runs in Node too.
- `client/formula.js`: Rainmeter formulas.
- `client/draw.js`: drawing on a canvas.
- `client/index.js`: the widget. `client/i18n.js`: Chinese text.
- `test/run.mjs`: tests, with two sample skins in `test/skins/` (run by `npm run check`). Set `RM_FIXTURES` to a folder holding Rainmeter's own illustro skins to test those too.

Reference: the [Rainmeter manual](https://docs.rainmeter.net/manual/).

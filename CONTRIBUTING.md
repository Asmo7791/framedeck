# Contributing

Thanks for helping! Bug reports, widget ideas and pull requests are all welcome.

## Running from source

You need [Node.js](https://nodejs.org) 22.12 or newer.

```
npm install
npm start
```

Before opening a pull request, run `npm run check` (it also runs on GitHub for every push).

## Where things are

- `src/`: the Electron app (`main.js`) and the local server (`server.js`, `sources.js`).
- `app/`: the editor and display pages. `app/shared/widgets.js` and `widgets-extra.js` hold the built-in widgets.

## Writing a widget

Each widget has `settings`, a `render(el, settings, ctx)` function, and optionally `data()` and `tick`. Size everything from the widget's own box with container query units (`cqw`, `cqh`) and `ctx.cls` (`xs`/`s`/`m`/`l`), and use the theme variables (`--fg`, `--muted`, `--accent`, `--bg`, `--radius`, `--font`), so the widget works on everything from a 240 px round cooler screen to a 4K monitor. E-ink screens get no animation and a limited palette.

You can also build widgets inside the app with **Widget Studio** and share them as files, no pull request needed.

## Translations

The interface text is English in the code. Other languages live in `app/i18n/`: each key is the English text exactly as shown, and `{0}` stands for a name or number inside it. To change Chinese, edit `app/i18n/zh-Hans.js`, then run `npm run i18n` to regenerate `zh-Hant.js` (Traditional Chinese, via OpenCC). `npm run check` reports missing placeholders or an out-of-date `zh-Hant.js`.

## Style

Keep user-facing text plain and friendly. The date and calendar widgets support Chinese (zh-CN / zh-TW). Please keep that working.

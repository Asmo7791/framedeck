# FrameDeck relay

It also serves **`/download`**: one link that sends Mac visitors to `FrameDeck-mac.dmg`, Windows visitors to `FrameDeck-windows-setup.exe`, and shows Linux, Raspberry Pi and phone visitors what to do instead. Add `?os=mac`, `?os=windows` or `?os=linux` to choose.

## Esports relay

A tiny [Cloudflare Worker](https://workers.cloudflare.com) that lets every FrameDeck user see esports scores (League of Legends, CS2, Valorant, Overwatch, Rainbow Six, Rocket League) without their own PandaScore token.

- It holds **one** PandaScore token as a secret. The token never reaches the app or this repo.
- It only answers match lists: `/pandascore/<game>/matches/<running|upcoming|past>`.
- It caches answers (live games for 1 minute, others for 5), so any number of FrameDeck users cost at most about 85 PandaScore requests an hour per game, inside the free plan's 1,000.

The cache is per Cloudflare data center, so users spread over many regions cost a little more.

## Deploy (about 5 minutes)

You need a free [Cloudflare account](https://dash.cloudflare.com/sign-up) and a free [PandaScore token](https://app.pandascore.co/signup).

### In the Cloudflare dashboard (no installs)

1. Go to **Workers & Pages → Create → Create Worker**, name it `framedeck-relay`, and click **Deploy**.
2. Click **Edit code**, replace everything with the contents of `worker.js`, and click **Deploy**.
3. Go to the worker's **Settings → Variables and Secrets → Add**: type **Secret**, name `PANDASCORE_TOKEN`, value: your PandaScore token. Save.
4. Open the worker's address (like `https://framedeck-relay.<your-name>.workers.dev`). It should say `"service": "FrameDeck esports relay"`.

### Or build it from GitHub

If you connect the worker to this GitHub repository (**Workers & Pages → Create → Import a repository**), open the worker's **Settings → Build** and set **Root directory** to `relay`. The deploy command stays `npx wrangler deploy`. Then add the `PANDASCORE_TOKEN` secret as in step 3 above. The worker's name must be `framedeck-relay` (the name in `wrangler.toml`).

### Or from Terminal

```
cd relay
npx wrangler login
npx wrangler deploy
npx wrangler secret put PANDASCORE_TOKEN
```

## Point FrameDeck at it

Put the worker's address in `DEFAULT_ESPORTS_RELAY` in `src/sources.js` and release a new version. People running FrameDeck from source can set `FRAMEDECK_ESPORTS_RELAY` to another relay, or to `off` to always use their own token.

A token pasted into a widget's settings always goes straight to PandaScore and skips the relay.

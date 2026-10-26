'use strict';
// FrameDeck's relay (relay/worker.js, a Cloudflare Worker): esports scores without a token,
// and supporter key activations. FRAMEDECK_RELAY points the app at a different one.
const DEFAULT_RELAY = 'https://framedeck-relay.kagura8790.workers.dev';
const relayUrl = () => String(process.env.FRAMEDECK_RELAY || DEFAULT_RELAY).replace(/\/$/, '');

module.exports = { DEFAULT_RELAY, relayUrl };

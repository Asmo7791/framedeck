# Security

FrameDeck runs a small web server on your computer (port 47820 by default) so display windows, tablets and phones can load your screens.

- By default it only listens on this computer. **Settings → Share displays on my network** opens it to your local network so other devices can show screens.
- Even with sharing on, the editor and everything that changes settings only works from the computer FrameDeck runs on. Other devices can view screens, not edit them.
- Requests from other devices can only fetch public internet addresses, so a shared display can't be used to probe your network. The address is checked when connecting, so DNS tricks can't swap in a private one.
- FrameDeck only answers to its own addresses (localhost, IP addresses, or this computer's name), and rejects API calls from other websites.
- Calendar and news-feed links are hidden from other devices; the server fetches them on their behalf.
- Anyone on your network can still see the rest of your screens' layouts and settings while sharing is on, including the code and settings of your own widgets. Use it on networks you trust.
- Unlocking a supporter key sends the key and a random ID made for this computer to FrameDeck's relay, which counts how many computers use each key. Nothing else about your computer is sent.
- Rainmeter skins are imported without their plugins or programs, their formulas are evaluated without running code, they are drawn on a canvas, and their web requests can only reach public addresses.
- Custom widgets run in a sandbox, can't reach FrameDeck's settings, and can only load public internet addresses.

## Reporting a problem

Please don't open a public issue for security problems. Use GitHub's **[private vulnerability reporting](https://github.com/Asmo7791/framedeck/security/advisories/new)** instead, with steps to reproduce. I'll reply as soon as I can.

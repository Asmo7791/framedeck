# Security

FrameDeck runs a small web server on your computer (port 47820 by default) so display windows, tablets and phones can load your screens.

- By default it only listens on this computer. **Settings → Share displays on my network** opens it to your local network so other devices can show screens.
- Even with sharing on, the editor and everything that changes settings only works from the computer FrameDeck runs on. Other devices can view screens, not edit them.
- Requests from other devices can only fetch public internet addresses, so a shared display can't be used to probe your network.
- Anyone on your network can see your screens' layouts and settings (for example a calendar link you added) while sharing is on. Use it on networks you trust.
- Custom widgets run in a sandbox and can't reach FrameDeck's settings.

## Reporting a problem

Please don't open a public issue for security problems. Use GitHub's **[private vulnerability reporting](https://github.com/Asmo7791/framedeck/security/advisories/new)** instead, with steps to reproduce. I'll reply as soon as I can.

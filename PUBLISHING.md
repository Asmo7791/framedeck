# Publishing FrameDeck

A checklist to go from "works on my Mac" to "anyone can download it". Steps marked **(optional)** can wait.

## 1. Before you publish

Already done: your GitHub name, public (noreply) email and Venmo link are filled in (`package.json`, `app/shared/project.js`, `.github/FUNDING.yml`), and a new supporter-key pair was made.

- [ ] **Check the name.** Search "FrameDeck" on GitHub, the Mac App Store, the Microsoft Store and Google. If another app uses it, pick a new name now (search the project for `FrameDeck`).
- [ ] **Back up your supporter-key private key** (`keys/framedeck-supporter-PRIVATE.pem`) somewhere safe, like a password manager. Git ignores the `keys/` folder so it never goes to GitHub. If you lose it you can't make new keys; if someone else gets it, they can.
- [ ] **Accept the Xcode license** once, so `git` works on this Mac: `sudo xcodebuild -license accept`.

## 2. Put it on GitHub

1. On github.com, click **New repository**, name it `framedeck`, set it to **Public**, and don't add a README, license or .gitignore (the project has them).
2. In Terminal, from the project folder:

   ```
   git remote add origin https://github.com/Asmo7791/framedeck.git
   git push -u origin main
   ```
3. On the repo page, click the gear next to **About**, add a description and the topics `dashboard`, `electron`, `nzxt`, `kraken`, `e-ink`, `widgets`.
4. In **Settings → General → Features**, tick **Sponsorships** to show the Sponsor button (it uses `.github/FUNDING.yml`).
5. In **Settings → Code security**, turn on **Private vulnerability reporting** (SECURITY.md points people there).

## 3. Release the downloads

The project includes `.github/workflows/release.yml`. Push a version tag:

```
git tag v0.2.0
git push --tags
```

GitHub builds the installers on real Mac, Windows and Linux machines (about 15 minutes; watch the **Actions** tab): one `.dmg` for all Macs, one setup `.exe` for all Windows PCs, `.AppImage` and `.deb` for Linux and Raspberry Pi, plus portable zips. File names have no version number, so the README's download links always point at the newest published release. They're attached to a **draft** release. Open **Releases**, check the files, paste the notes from `CHANGELOG.md`, and click **Publish release**.

Every push also runs `.github/workflows/check.yml` (the same as `npm run check`).

## 4. Get rid of the "unidentified developer" warnings (optional, costs money)

Unsigned apps work, but people see warnings and have to click through them.

- **Mac:** join the [Apple Developer Program](https://developer.apple.com/programs/) (yearly fee). Then create a **Developer ID Application** certificate, export it as a `.p12`, and add these as repository secrets on GitHub (Settings → Secrets and variables → Actions): `MAC_CERT_P12_BASE64` (the .p12 file, base64-encoded), `MAC_CERT_PASSWORD`, `APPLE_ID`, `APPLE_APP_SPECIFIC_PASSWORD` (made at appleid.apple.com), `APPLE_TEAM_ID`. The release workflow then signs and notarizes the Mac app automatically, and the Terminal step in the install notes goes away.
- **Windows:** without signing, Windows shows "Windows protected your PC" and people click **More info → Run anyway**. Microsoft's Trusted/Artifact Signing service or a code-signing certificate removes that. Check current prices; many small open-source apps simply ship unsigned at first.

## 5. Phones, tablets and other devices

- **iPhone, iPad, Android:** these already work as displays. Turn on network sharing, open the screen's link, and **Add to Home Screen**. It opens fullscreen like an app, with its own icon.
- **Native store apps (optional, later):** a store app would mainly wrap that same display page. You'd need an Apple Developer account for the App Store (the same yearly fee as Mac signing) and a Google Play developer account (one-time fee) for Android. Apple sometimes rejects apps that are mostly a web page, so the app should add something real, such as finding FrameDeck on the network automatically.
- **Raspberry Pi:** use the `arm64` download on 64-bit Raspberry Pi OS (Pi 4 or 5 recommended), the `armv7l` one on 32-bit Raspberry Pi OS. A Pi can also just open a display link in kiosk mode (see Guides in the app).
- **Older Macs:** the Mac versions need macOS 12 Monterey or newer, on Apple silicon or Intel. Older Macs can still show screens through the browser link.

## 6. Donations and supporter keys

- People donate through the links in the **♥ Support** window (and GitHub's Sponsor button).
- When someone donates, make their key in Terminal from the project folder:

  ```
  node tools/make-supporter-key.mjs "Their Name"
  ```
  and send them the `FD1-…` text it prints. They paste it into **♥ Support → Have a supporter key?**
- What's unlocked lives in two places: themes marked `supporter: true` in `app/shared/profiles.js`, and the `isSupporter()` checks in `app/editor.js`. Add or remove perks there.
- Because the code is open source, someone could remove the check. Supporter perks work best as thank-you extras, not as locks on core features.
- **About Venmo, Zelle and PayPal:** personal accounts are meant for payments between people you know. If you're effectively selling unlocks, or donations grow, consider a PayPal or Venmo business profile, and keep records for taxes.

## 7. Esports relay

Esports scores for LoL, CS2, Valorant and others come through a small Cloudflare Worker that holds your PandaScore token. See [relay/README.md](relay/README.md) to deploy or update it.

## 8. Each new version

1. Change `"version"` in `package.json` (e.g. `0.2.1`) and add a section to `CHANGELOG.md`.
2. Commit, then `git tag v0.2.1 && git push && git push --tags`.
3. Review the draft release on GitHub and click **Publish**.

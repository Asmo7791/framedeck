#!/bin/sh
# Installs or updates FrameDeck on Linux and Raspberry Pi, picking the right download for this machine.
#   curl -fsSL https://raw.githubusercontent.com/Asmo7791/framedeck/main/install.sh | sh
set -e

base="https://github.com/Asmo7791/framedeck/releases/latest/download"

case "$(uname -m)" in
  x86_64 | amd64) deb=amd64; appimage=x86_64 ;;
  aarch64 | arm64) deb=arm64; appimage=arm64 ;;
  armv7l | armv6l | armhf) deb=armv7l; appimage= ;;
  *) echo "Sorry, there's no FrameDeck build for this processor ($(uname -m)) yet." >&2; exit 1 ;;
esac

# Raspberry Pi OS can run a 32-bit system on a 64-bit Pi; the package has to match the system.
if [ "$deb" = arm64 ] && command -v dpkg >/dev/null 2>&1 && [ "$(dpkg --print-architecture)" = armhf ]; then
  deb=armv7l; appimage=
fi

tmp=$(mktemp -d)
trap 'rm -rf "$tmp"' EXIT

if command -v apt-get >/dev/null 2>&1; then
  file="FrameDeck-linux-$deb.deb"
  echo "Downloading $file…"
  curl -fL --progress-bar -o "$tmp/$file" "$base/$file"
  echo "Installing (your password may be needed)…"
  sudo apt-get install -y "$tmp/$file"
  echo "FrameDeck is installed. Open it from your apps menu, or run: framedeck"
elif [ -n "$appimage" ]; then
  file="FrameDeck-linux-$appimage.AppImage"
  echo "Downloading $file…"
  mkdir -p "$HOME/.local/bin"
  curl -fL --progress-bar -o "$HOME/.local/bin/FrameDeck.AppImage" "$base/$file"
  chmod +x "$HOME/.local/bin/FrameDeck.AppImage"
  echo "FrameDeck is installed at ~/.local/bin/FrameDeck.AppImage. Run it to start FrameDeck."
else
  echo "On 32-bit ARM, FrameDeck needs a Debian-based system such as Raspberry Pi OS." >&2
  exit 1
fi

# dartdart

A minimal mobile-friendly top-down shooter prototype for iOS Safari and Android Chrome. Touch/drag anywhere to reveal a virtual joystick to move the player. The player auto-fires a dart every 1 second at the nearest enemy. Darts deal 25 damage. Enemies have 25 HP, respawn on death, fire slower than the player, then chase for 1 second, and repeat.

## Run locally

Open `index.html` in a browser, or serve the folder with a simple static server.

On Windows PowerShell:

```powershell
# Option 1: Using Python
python -m http.server 8000 ; Start-Process http://localhost:8000

# Option 2: Using Node (if installed)
npx serve . -l 8000 ; Start-Process http://localhost:8000
```

Then open on your phone by navigating to your computer's LAN IP, e.g. `http://192.168.1.23:8000`.

## Controls

- Touch and drag anywhere: show joystick and move the player in that direction.
- Release: joystick hides, player stops.

## Notes / Next steps

- Turn this into a PWA (manifest + service worker) for home screen install.
- Add player health and game over.
- Add enemy variety and spawn pacing.
- Add better art/animations; expand the sprite sheet.
- Add audio (user gesture unlock for iOS).
- Split logic into systems for ECS-like architecture if the project grows.

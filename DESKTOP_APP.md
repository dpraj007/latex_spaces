# LaTeX Resume Editor - Windows ARM Desktop App

A native Windows desktop application for editing and compiling LaTeX resumes, built with Electron + Flask. Designed for Windows ARM64 (e.g., Surface Pro X, Snapdragon laptops) with one-click launch from the Start Menu.

## Quick Start

### Option A: One-Click Build & Install (Recommended)

1. **Double-click `setup-desktop.bat`** in the project root
2. Wait for the build to complete
3. Run the installer from the `dist/` folder
4. Launch **"LaTeX Resume Editor"** from Start Menu or Desktop shortcut

### Option B: Development Mode

1. Double-click **`LaTeX Resume Editor.bat`** in the project root
2. The app launches directly (requires Python + Node.js)

## Prerequisites

### For Building the Desktop App
- **Python 3.8+** - [python.org/downloads](https://www.python.org/downloads/)
  - Check "Add Python to PATH" during installation
- **Node.js 18+** - [nodejs.org](https://nodejs.org/)
- **MiKTeX** (for LaTeX compilation) - [miktex.org/download](https://miktex.org/download)

### For Running the Installed App
- **MiKTeX** or **TeX Live** for LaTeX PDF compilation
- Everything else is bundled in the installer

## Architecture

```
Project Structure:
├── desktop/                    # Electron desktop app
│   ├── package.json            # Electron config + build settings
│   ├── main.js                 # Main process (spawns Flask, creates window)
│   ├── preload.js              # Secure IPC bridge
│   ├── build-backend.bat       # Standalone backend build script
│   ├── run-dev.bat             # Run in development mode
│   ├── generate-icon.html      # Open in browser to generate app icon
│   └── assets/
│       └── icon.svg            # App icon source
├── code/                       # Application source
│   ├── backend/app.py          # Flask server (supports Electron mode)
│   └── frontend/               # Web frontend (HTML/CSS/JS)
├── setup-desktop.bat           # ONE-CLICK build script
├── LaTeX Resume Editor.bat     # Quick launcher for dev mode
└── DESKTOP_APP.md              # This file
```

### How It Works

1. **Electron** creates a native window and manages the app lifecycle
2. **Flask backend** runs as a child process (bundled as `.exe` via PyInstaller in production, or via Python directly in dev mode)
3. The Electron window loads the Flask-served frontend at `http://127.0.0.1:<port>`
4. Port is auto-detected (finds a free port starting from 5000)
5. On quit, Electron gracefully shuts down the Flask process

## Build Targets

The default build creates a **Windows ARM64** installer. To build for other architectures:

```bash
cd desktop

# Windows ARM64 (default for this project)
npm run build:win-arm64

# Windows x64 (Intel/AMD)
npm run build:win-x64
```

## App Features

- Native Windows window with proper title bar and menu
- System tray icon (minimize to tray)
- Single instance lock (prevents duplicate windows)
- Auto-detects installed LaTeX compilers
- Full menu bar (File, Edit, View, Help)
- Keyboard shortcuts work natively (Ctrl+S, Ctrl+Enter, etc.)
- Remembers window size and position
- One-click install with Start Menu + Desktop shortcuts

## Custom Icon

To create a custom app icon:

1. Open `desktop/generate-icon.html` in a browser
2. Right-click the canvas and save as `desktop/assets/icon.png` (256x256)
3. Convert to `.ico` format:
   ```
   magick icon.png -define icon:auto-resize=256,128,64,48,32,16 icon.ico
   ```
   Or use an online converter like [convertio.co](https://convertio.co/png-ico/)
4. Place both `icon.png` and `icon.ico` in `desktop/assets/`

## Troubleshooting

### "Python not found"
- Install Python 3.8+ and ensure "Add to PATH" is checked
- Restart your terminal/command prompt after installing

### "Node.js not found"
- Install Node.js 18+ from nodejs.org
- Restart your terminal after installing

### "LaTeX not found" (in the app)
- Install MiKTeX from miktex.org/download
- During MiKTeX install, choose "Install missing packages on-the-fly"
- Restart the app after installing MiKTeX

### Build fails on ARM64
- If electron-builder can't find ARM64 Electron binaries, try:
  ```
  set npm_config_arch=arm64
  npm install
  npm run build:win-arm64
  ```

### App window is blank
- The Flask backend may not have started. Check logs at:
  `%APPDATA%\latex-resume-editor\logs\`

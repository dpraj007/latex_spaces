# Professional Resume & LaTeX Editor Environment

This repository contains a professional resume and a dedicated LaTeX editing environment designed for viewing, editing, and compiling LaTeX-based resumes with ease. Available as both a **web app** and a **native Windows desktop app** (Electron + Flask).

## 📁 Repository Structure

```
├── README.md
├── Dhairyasheel_Patil_Resume.pdf   # Current version of the professional resume
├── latex/                           # All LaTeX files
│   ├── resumes/                     # Saved resume .tex files
│   ├── cover_letters/               # Saved cover letter .tex files
│   └── templates/                   # LaTeX templates
├── code/                            # Application source code
│   ├── backend/                     # Flask backend
│   │   └── app.py
│   ├── frontend/                    # Frontend (HTML, CSS, JS)
│   │   ├── index.html
│   │   ├── styles.css
│   │   └── app.js
│   └── config/                      # Configuration
│       ├── requirements.txt
│       └── ENVIRONMENT_SETUP.md
├── desktop/                         # Electron desktop app
│   ├── main.js                      # Electron main process
│   ├── preload.js                   # Secure IPC bridge
│   ├── package.json                 # Electron config + build settings
│   ├── build-backend.bat            # Standalone backend build script
│   ├── run-dev.bat                  # Run in development mode
│   ├── generate-icon.html           # Open in browser to generate app icon
│   └── assets/
│       └── icon.svg                 # App icon source
├── setup-desktop.bat                # One-click build & install script
├── LaTeX Resume Editor.bat          # Quick launcher (dev mode)
├── output/                          # Compiled PDF output
└── venv/                            # Python virtual environment
```

---

## 🛠️ Prerequisites

### Required for all setups

A **LaTeX distribution** must be installed on your system to compile PDFs:

- **Windows**: [MiKTeX](https://miktex.org/download) (Recommended) or [TeX Live](https://tug.org/texlive/)
  - During MiKTeX install, choose **"Install missing packages on-the-fly"**
- **MacOS**: [MacTeX](https://tug.org/mactex/)
- **Linux**: `texlive-full` package

### Required for development / web app

- **Python 3.8+** — [python.org/downloads](https://www.python.org/downloads/)
  - Check **"Add Python to PATH"** during installation
- Python packages: `flask`, `flask-cors`, `watchdog`, `python-dotenv` (installed via `requirements.txt`)

### Additional for desktop app

- **Node.js 18+** — [nodejs.org](https://nodejs.org/)
- **npm** (comes with Node.js)

The editor will automatically detect available LaTeX compilers on your system.

---

## 🚀 Quick Start — Web App

The `code/` folder contains a modern, web-based interface to manage your LaTeX resumes.

1. **Create and activate a virtual environment:**
    ```bash
    python -m venv venv

    # Windows
    .\venv\Scripts\Activate

    # macOS / Linux
    source venv/bin/activate
    ```

2. **Install Python dependencies:**
    ```bash
    pip install -r code/config/requirements.txt
    ```

3. **Run the Flask server:**
    ```bash
    python code/backend/app.py
    ```

4. **Open the editor:**
    Navigate to [http://localhost:5000](http://localhost:5000) in your browser.

---

## 🖥️ Quick Start — Windows Desktop App

The desktop app wraps the same editor in a native Electron window with Start Menu shortcuts, system tray support, and a bundled backend.

### Option A: One-Click Build & Install (Recommended)

1. **Double-click `setup-desktop.bat`** in the project root.
2. The script automatically:
   - Checks that Python, Node.js, and npm are installed
   - Creates a virtual environment and installs Python dependencies
   - Bundles the Flask backend into a standalone `.exe` via PyInstaller
   - Installs Electron dependencies
   - Builds the Windows ARM64 installer (falls back to x64 if needed)
3. Run the generated installer from the `dist/` folder.
4. Launch **"LaTeX Resume Editor"** from the Start Menu or Desktop shortcut.

### Option B: Development Mode (no build required)

1. **Install dependencies manually:**
    ```bash
    # Python deps
    python -m venv venv
    .\venv\Scripts\Activate
    pip install -r code/config/requirements.txt

    # Electron deps
    cd desktop
    npm install
    ```

2. **Launch the app:**
    - Double-click **`LaTeX Resume Editor.bat`** in the project root, **or**
    - Run from the terminal:
      ```bash
      cd desktop
      npm start
      ```

### Building for other architectures

```bash
cd desktop

# Windows ARM64 (default)
npm run build:win-arm64

# Windows x64 (Intel/AMD)
npm run build:win-x64
```

### Desktop App Features

- Native Windows window with title bar and full menu (File, Edit, View, Help)
- System tray icon — minimize to tray
- Single instance lock — prevents duplicate windows
- Remembers window size and position
- Auto-detects installed LaTeX compilers
- One-click NSIS installer with Start Menu + Desktop shortcuts

---

## 📑 Included Templates

1. **Professional Modern**: Clean, ATS-friendly with icons.
2. **Minimal Elegant**: Focused on beautiful typography.
3. **Academic CV**: Multi-page format for research and teaching.
4. **Tech Startup**: Bold design emphasizing metrics and skills.

---

## ⌨️ Keyboard Shortcuts

| Shortcut | Action |
|---|---|
| `Ctrl + Enter` | Compile PDF |
| `Ctrl + S` | Save Resume |
| `Ctrl + M` | Toggle Editor Visibility (Minimize/Restore) |
| `Tab` / `Shift + Tab` | Indent / Outdent |

---

## ❓ Troubleshooting

| Problem | Solution |
|---|---|
| **"Python not found"** | Install Python 3.8+ and ensure "Add to PATH" is checked. Restart your terminal. |
| **"Node.js not found"** | Install Node.js 18+ from nodejs.org. Restart your terminal. |
| **"LaTeX not found" in app** | Install MiKTeX, enable "Install missing packages on-the-fly", and restart the app. |
| **ARM64 build fails** | Run `set npm_config_arch=arm64 && npm install && npm run build:win-arm64` |
| **App window is blank** | Flask backend may not have started. Check logs at `%APPDATA%\latex-resume-editor\logs\` |

For detailed environment setup and troubleshooting, see [code/config/ENVIRONMENT_SETUP.md](code/config/ENVIRONMENT_SETUP.md) and [DESKTOP_APP.md](DESKTOP_APP.md).

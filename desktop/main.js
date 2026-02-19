/**
 * LaTeX Resume Editor - Electron Main Process
 *
 * Spawns the Flask backend server and opens the editor in a native window.
 * Designed for Windows ARM64 desktop deployment.
 */

const { app, BrowserWindow, shell, dialog, Menu, Tray } = require('electron');
const { spawn, execFile } = require('child_process');
const path = require('path');
const fs = require('fs');
const net = require('net');
const log = require('electron-log');

// Configure logging
log.transports.file.level = 'info';
log.transports.console.level = 'debug';

let mainWindow = null;
let backendProcess = null;
let tray = null;
let serverPort = 5000;
let isQuitting = false;

// Determine if we're running in development or packaged mode
const isDev = !app.isPackaged;

function getResourcePath(...segments) {
    if (isDev) {
        return path.join(__dirname, '..', ...segments);
    }
    return path.join(process.resourcesPath, ...segments);
}

/**
 * Find a free TCP port starting from the preferred port
 */
function findFreePort(startPort = 5000) {
    return new Promise((resolve, reject) => {
        const server = net.createServer();
        server.listen(startPort, '127.0.0.1', () => {
            const port = server.address().port;
            server.close(() => resolve(port));
        });
        server.on('error', () => {
            // Port in use, try next
            if (startPort < 65535) {
                resolve(findFreePort(startPort + 1));
            } else {
                reject(new Error('No free port found'));
            }
        });
    });
}

/**
 * Start the Flask backend server
 */
async function startBackend() {
    serverPort = await findFreePort(5000);
    log.info(`Starting backend on port ${serverPort}`);

    const backendDistPath = getResourcePath('backend-dist');
    const backendExe = path.join(backendDistPath, 'latex_editor_backend.exe');
    const backendPy = getResourcePath('code', 'backend', 'app.py');

    // Set environment variables for the backend
    const env = {
        ...process.env,
        FLASK_PORT: String(serverPort),
        FLASK_HOST: '127.0.0.1',
        LATEX_EDITOR_ROOT: isDev ? path.join(__dirname, '..') : process.resourcesPath,
        ELECTRON_MODE: '1'
    };

    if (!isDev && fs.existsSync(backendExe)) {
        // Production: use PyInstaller-bundled executable
        log.info(`Launching bundled backend: ${backendExe}`);
        backendProcess = execFile(backendExe, [], {
            env,
            cwd: backendDistPath,
            windowsHide: true
        });
    } else {
        // Development: run Python directly
        const pythonCmd = findPython();
        if (!pythonCmd) {
            dialog.showErrorBox(
                'Python Not Found',
                'Python 3 is required to run the LaTeX Resume Editor backend.\n\n' +
                'Please install Python 3.8+ from https://www.python.org/downloads/'
            );
            app.quit();
            return;
        }

        log.info(`Launching Python backend: ${pythonCmd} ${backendPy}`);
        backendProcess = spawn(pythonCmd, [backendPy], {
            env,
            cwd: path.join(__dirname, '..'),
            windowsHide: true
        });
    }

    backendProcess.stdout?.on('data', (data) => {
        log.info(`[Backend] ${data.toString().trim()}`);
    });

    backendProcess.stderr?.on('data', (data) => {
        log.warn(`[Backend] ${data.toString().trim()}`);
    });

    backendProcess.on('error', (err) => {
        log.error(`Backend process error: ${err.message}`);
        if (!isQuitting) {
            dialog.showErrorBox(
                'Backend Error',
                `Failed to start the backend server:\n${err.message}`
            );
        }
    });

    backendProcess.on('exit', (code) => {
        log.info(`Backend process exited with code ${code}`);
        if (!isQuitting && code !== 0) {
            dialog.showErrorBox(
                'Backend Crashed',
                `The backend server stopped unexpectedly (code ${code}).\nThe app will now close.`
            );
            app.quit();
        }
    });

    // Wait for the server to become ready
    await waitForServer(serverPort);
}

/**
 * Find Python executable on the system
 */
function findPython() {
    const candidates = process.platform === 'win32'
        ? ['python', 'python3', 'py']
        : ['python3', 'python'];

    for (const cmd of candidates) {
        try {
            const result = require('child_process').execSync(
                `${cmd} --version`,
                { timeout: 5000, windowsHide: true, stdio: 'pipe' }
            );
            const version = result.toString().trim();
            log.info(`Found ${cmd}: ${version}`);
            return cmd;
        } catch {
            continue;
        }
    }
    return null;
}

/**
 * Wait for the HTTP server to respond
 */
function waitForServer(port, maxRetries = 30, interval = 500) {
    return new Promise((resolve, reject) => {
        let retries = 0;

        function check() {
            const req = require('http').get(
                `http://127.0.0.1:${port}/api/check-latex`,
                (res) => {
                    log.info('Backend server is ready');
                    resolve();
                }
            );

            req.on('error', () => {
                retries++;
                if (retries >= maxRetries) {
                    reject(new Error('Backend server failed to start'));
                } else {
                    setTimeout(check, interval);
                }
            });

            req.setTimeout(2000, () => {
                req.destroy();
                retries++;
                if (retries < maxRetries) {
                    setTimeout(check, interval);
                }
            });
        }

        check();
    });
}

/**
 * Create the main application window
 */
function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1400,
        height: 900,
        minWidth: 800,
        minHeight: 600,
        title: 'LaTeX Resume Editor',
        icon: path.join(__dirname, 'assets', 'icon.png'),
        backgroundColor: '#0f0a1a',
        show: false,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false,
            webSecurity: true
        }
    });

    // Load the Flask-served frontend
    mainWindow.loadURL(`http://127.0.0.1:${serverPort}`);

    // Show window when ready (avoids white flash)
    mainWindow.once('ready-to-show', () => {
        mainWindow.show();
        mainWindow.focus();
    });

    // Handle external links - open in default browser
    mainWindow.webContents.setWindowOpenHandler(({ url }) => {
        if (url.startsWith('http')) {
            shell.openExternal(url);
        }
        return { action: 'deny' };
    });

    // Handle window close
    mainWindow.on('close', (e) => {
        if (!isQuitting) {
            e.preventDefault();
            mainWindow.hide();
        }
    });

    mainWindow.on('closed', () => {
        mainWindow = null;
    });

    // Build application menu
    const menuTemplate = [
        {
            label: 'File',
            submenu: [
                {
                    label: 'New Resume',
                    accelerator: 'CmdOrCtrl+N',
                    click: () => mainWindow?.webContents.executeJavaScript('newResume()')
                },
                {
                    label: 'Save',
                    accelerator: 'CmdOrCtrl+S',
                    click: () => mainWindow?.webContents.executeJavaScript('saveResume()')
                },
                {
                    label: 'Open in Cursor',
                    accelerator: 'CmdOrCtrl+Shift+C',
                    click: () => mainWindow?.webContents.executeJavaScript('openInCursor()')
                },
                { type: 'separator' },
                {
                    label: 'Compile PDF',
                    accelerator: 'CmdOrCtrl+Enter',
                    click: () => mainWindow?.webContents.executeJavaScript('compileResume()')
                },
                { type: 'separator' },
                {
                    label: 'Quit',
                    accelerator: 'CmdOrCtrl+Q',
                    click: () => {
                        isQuitting = true;
                        app.quit();
                    }
                }
            ]
        },
        {
            label: 'Edit',
            submenu: [
                { role: 'undo' },
                { role: 'redo' },
                { type: 'separator' },
                { role: 'cut' },
                { role: 'copy' },
                { role: 'paste' },
                { role: 'selectAll' }
            ]
        },
        {
            label: 'View',
            submenu: [
                {
                    label: 'Toggle Editor',
                    accelerator: 'CmdOrCtrl+M',
                    click: () => mainWindow?.webContents.executeJavaScript('toggleEditor()')
                },
                { type: 'separator' },
                { role: 'zoomIn' },
                { role: 'zoomOut' },
                { role: 'resetZoom' },
                { type: 'separator' },
                { role: 'togglefullscreen' }
            ]
        },
        {
            label: 'Help',
            submenu: [
                {
                    label: 'About',
                    click: () => {
                        dialog.showMessageBox(mainWindow, {
                            type: 'info',
                            title: 'About LaTeX Resume Editor',
                            message: 'LaTeX Resume Editor v1.0.0',
                            detail: 'A professional desktop LaTeX editor for crafting resumes and cover letters.\n\nRequires a LaTeX distribution (MiKTeX or TeX Live) for PDF compilation.'
                        });
                    }
                },
                {
                    label: 'Install MiKTeX (LaTeX)',
                    click: () => shell.openExternal('https://miktex.org/download')
                }
            ]
        }
    ];

    if (isDev) {
        menuTemplate.push({
            label: 'Developer',
            submenu: [
                { role: 'reload' },
                { role: 'forceReload' },
                { role: 'toggleDevTools' }
            ]
        });
    }

    Menu.setApplicationMenu(Menu.buildFromTemplate(menuTemplate));
}

/**
 * Create system tray icon
 */
function createTray() {
    const iconPath = path.join(__dirname, 'assets', 'icon.png');
    if (!fs.existsSync(iconPath)) return;

    tray = new Tray(iconPath);
    tray.setToolTip('LaTeX Resume Editor');

    const contextMenu = Menu.buildFromTemplate([
        {
            label: 'Show Window',
            click: () => {
                if (mainWindow) {
                    mainWindow.show();
                    mainWindow.focus();
                }
            }
        },
        { type: 'separator' },
        {
            label: 'Quit',
            click: () => {
                isQuitting = true;
                app.quit();
            }
        }
    ]);

    tray.setContextMenu(contextMenu);
    tray.on('double-click', () => {
        if (mainWindow) {
            mainWindow.show();
            mainWindow.focus();
        }
    });
}

/**
 * Stop the backend server gracefully
 */
function stopBackend() {
    if (backendProcess) {
        log.info('Stopping backend server...');
        try {
            if (process.platform === 'win32') {
                // On Windows, use taskkill to kill the process tree
                spawn('taskkill', ['/pid', String(backendProcess.pid), '/f', '/t'], {
                    windowsHide: true
                });
            } else {
                backendProcess.kill('SIGTERM');
            }
        } catch (err) {
            log.error(`Error stopping backend: ${err.message}`);
        }
        backendProcess = null;
    }
}

// App lifecycle
app.whenReady().then(async () => {
    log.info('App starting...');
    log.info(`Platform: ${process.platform}, Arch: ${process.arch}`);
    log.info(`Packaged: ${app.isPackaged}`);

    try {
        await startBackend();
        createWindow();
        createTray();
    } catch (err) {
        log.error(`Startup failed: ${err.message}`);
        dialog.showErrorBox(
            'Startup Error',
            `Failed to start LaTeX Resume Editor:\n\n${err.message}\n\nPlease check the logs for details.`
        );
        app.quit();
    }
});

app.on('window-all-closed', () => {
    // On macOS, keep the app running. On Windows/Linux, quit.
    if (process.platform !== 'darwin') {
        isQuitting = true;
        app.quit();
    }
});

app.on('activate', () => {
    if (mainWindow === null) {
        createWindow();
    } else {
        mainWindow.show();
    }
});

app.on('before-quit', () => {
    isQuitting = true;
    stopBackend();
});

app.on('will-quit', () => {
    stopBackend();
});

// Prevent multiple instances
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
    app.quit();
} else {
    app.on('second-instance', () => {
        if (mainWindow) {
            if (mainWindow.isMinimized()) mainWindow.restore();
            mainWindow.show();
            mainWindow.focus();
        }
    });
}

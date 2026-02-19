/**
 * LaTeX Resume Editor - Preload Script
 *
 * Provides a secure bridge between the renderer process and Node.js APIs.
 * Uses contextBridge for safe IPC communication.
 */

const { contextBridge, ipcRenderer } = require('electron');

// Expose a minimal, safe API to the renderer
contextBridge.exposeInMainWorld('desktopApp', {
    // Identify that we're running in Electron
    isDesktop: true,
    platform: process.platform,
    arch: process.arch,

    // App version
    getVersion: () => {
        try {
            const pkg = require('./package.json');
            return pkg.version;
        } catch {
            return '1.0.0';
        }
    }
});

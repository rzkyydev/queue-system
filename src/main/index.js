const { app, BrowserWindow, ipcMain, Menu } = require('electron');
const path = require('path');
const fs = require('fs');

const SettingsManager = require('./services/settings.service');
const QueueManager = require('./services/queue.service');
const CommandParser = require('./services/command.service');
const OverlayServer = require('./server/overlay.server');
const ActivityManager = require('./services/activity.service');
const TikTokService = require('./services/tiktok.service');

// Set local user data path to avoid Windows cache permission errors
const userDataPath = app.isPackaged
    ? path.join(app.getPath('appData'), 'QueueSystem')
    : path.join(__dirname, '../../.user_data');

app.setPath('userData', userDataPath);
app.setPath('sessionData', path.join(userDataPath, 'session'));
app.commandLine.appendSwitch('disable-http-cache');

const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
    app.quit();
    return;
}

app.on('second-instance', () => {
    // Someone tried to run a second instance, we should focus our window.
    if (mainWindow) {
        if (mainWindow.isMinimized()) mainWindow.restore();
        mainWindow.focus();
    }
});

let mainWindow;
let overlayServer;
let settingsManager;
let queueManager;
let commandParser;
let activityManager;
let tiktokService;

function createMainWindow() {
    mainWindow = new BrowserWindow({
        width: 1200,
        height: 720,
        minWidth: 1150,
        minHeight: 720,
        icon: path.join(__dirname, '../renderer/assets/build', 'icon.png'),
        webPreferences: {
            preload: path.join(__dirname, 'preload', 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false
        },
        backgroundColor: '#0b0b0b', // Pure black background
        show: false,
        titleBarStyle: 'hidden',
        titleBarOverlay: {
            color: '#0b0b0b',
            symbolColor: '#a1a1aa',
            height: 40
        }
    });

    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
    mainWindow.once('ready-to-show', () => {
        mainWindow.show();
    });
}

function sendToWindows(channel, data) {
    if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send(channel, data);
    }
}

function updateOverlay() {
    if (overlayServer) {
        overlayServer.broadcast({
            type: 'state-update',
            settings: settingsManager.settings,
            queueData: queueManager.getQueueData()
        });
    }
}

app.whenReady().then(async () => {
    // Dynamic patch for piratetok-live-js ttwid failure
    try {
        const ttwidPath = path.join(__dirname, 'node_modules', 'piratetok-live-js', 'dist', 'auth', 'ttwid.js');
        if (fs.existsSync(ttwidPath)) {
            let ttwidCode = fs.readFileSync(ttwidPath, 'utf8');
            let modified = false;

            // Revert the previous empty string hack if it exists
            if (ttwidCode.includes('return ""; // Patched by QueueSystem')) {
                ttwidCode = ttwidCode.replace(
                    'return ""; // Patched by QueueSystem: Fallback to empty ttwid instead of throwing',
                    'throw new Error(`ttwid: no ttwid cookie in response (status ${resp.status})`);'
                );
                modified = true;
            }

            // Apply the real fix: change the fetch URL to /live
            if (ttwidCode.includes('"https://www.tiktok.com/"')) {
                ttwidCode = ttwidCode.replace('"https://www.tiktok.com/"', '"https://www.tiktok.com/live"');
                modified = true;
            }

            if (modified) {
                fs.writeFileSync(ttwidPath, ttwidCode, 'utf8');
                console.log("Applied correct ttwid URL patch to piratetok-live-js");
            }
        }
    } catch (e) {
        console.error('Failed to patch ttwid.js dynamically:', e);
    }

    // Initialize managers
    settingsManager = new SettingsManager();
    queueManager = new QueueManager(settingsManager);
    commandParser = new CommandParser(queueManager, settingsManager);
    activityManager = new ActivityManager();
    
    // Initialize TikTok Service
    tiktokService = new TikTokService();
    
    tiktokService.on('status', (data) => {
        sendToWindows('tiktok-status', data);
    });

    tiktokService.on('chat', (data) => {
        const uniqueId = data?.user?.uniqueId || "unknown";
        const comment = data?.content || "";
        const isMod = (uniqueId === tiktokService.username) || !!data?.user?.badgeList?.some(badge => {
            if (!badge.textBadge) return false;
            const key = badge.textBadge.key?.toLowerCase() || '';
            const pattern = badge.textBadge.defaultPattern?.toLowerCase() || '';
            return key.includes('moderator') || key.includes('host') || key.includes('admin') ||
                   pattern.includes('moderator') || pattern.includes('host') || pattern.includes('admin');
        });

        const result = commandParser.parse(comment, uniqueId, isMod);

        if (result && result.success) {
            sendToWindows('command-result', { message: result.message, type: 'success' });
        } else if (result && !result.ignored && comment.trim().startsWith('!')) {
            sendToWindows('command-result', { message: result.message, type: 'error' });
        }
    });

    tiktokService.on('gift', data => sendToWindows('tiktok-event', { type: 'gift', data }));
    tiktokService.on('like', data => sendToWindows('tiktok-event', { type: 'like', data }));

    createMainWindow();

    // Start local HTTP server for overlay
    overlayServer = new OverlayServer(3333);
    overlayServer.start();

    // Remove default menu bar
    Menu.setApplicationMenu(null);

    // Initial broadcast to overlay
    updateOverlay();

    queueManager.on('queue-updated', (data) => {
        sendToWindows('queue-updated', data);
        updateOverlay();
    });

    // Auto-connect if username is saved
    const savedUsername = settingsManager.settings.connection.username;
    if (savedUsername) {
        tiktokService.connect(savedUsername);
    }

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createMainWindow();
        }
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

// connectTikTok is now handled by TikTokService

// --- IPC HANDLERS ---

ipcMain.on('connect-tiktok', (event, username) => {
    settingsManager.updateSettings({ connection: { username } });
    tiktokService.connect(username);
});

ipcMain.on('disconnect-tiktok', () => {
    tiktokService.disconnect();
});

// Window Controls
ipcMain.on('window-min', () => {
    if (mainWindow) mainWindow.minimize();
});
ipcMain.on('window-max', () => {
    if (mainWindow) {
        if (mainWindow.isMaximized()) mainWindow.unmaximize();
        else mainWindow.maximize();
    }
});
ipcMain.on('window-close', () => {
    if (mainWindow) mainWindow.close();
});

// Settings Handlers
ipcMain.handle('get-settings', () => settingsManager.settings);
ipcMain.handle('get-commands', () => settingsManager.commands);

ipcMain.on('update-settings', (event, newSettings) => {
    settingsManager.updateSettings(newSettings);
    sendToWindows('settings-updated', settingsManager.settings);
    updateOverlay();
});

ipcMain.on('update-commands', (event, newCommands) => {
    settingsManager.updateCommands(newCommands);
});

// Queue Handlers
ipcMain.handle('get-queue', () => queueManager.getQueueData());

ipcMain.on('queue-add', (event, { songTitle, requester, fastTrack }) => {
    queueManager.addSong(songTitle, requester, fastTrack);
});

ipcMain.on('queue-remove', (event, target) => {
    queueManager.removeSong(target);
});

ipcMain.on('queue-play', (event, target) => {
    queueManager.playSong(target);
});

ipcMain.on('queue-done', (event, target) => {
    queueManager.done(target);
});

ipcMain.on('queue-skip', () => {
    queueManager.skip();
});

ipcMain.on('queue-clear', () => {
    queueManager.clearQueue();
});

// Activity Handlers
ipcMain.handle('get-activity', () => activityManager.get());
ipcMain.on('add-activity', (event, text, type) => {
    const act = activityManager.add(text, type);
    sendToWindows('activity-updated', activityManager.get());
});
ipcMain.on('clear-activity', () => {
    activityManager.clear();
    sendToWindows('activity-updated', activityManager.get());
});

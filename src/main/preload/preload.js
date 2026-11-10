const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
    // Connect to TikTok
    connectTikTok: (username) => ipcRenderer.send('connect-tiktok', username),
    disconnectTikTok: () => ipcRenderer.send('disconnect-tiktok'),
    
    // Listen for general status/events
    onTikTokStatus: (callback) => ipcRenderer.on('tiktok-status', (event, data) => callback(data)),
    onCommandResult: (callback) => ipcRenderer.on('command-result', (event, data) => callback(data)),

    // Settings
    getSettings: () => ipcRenderer.invoke('get-settings'),
    getCommands: () => ipcRenderer.invoke('get-commands'),
    updateSettings: (settings) => ipcRenderer.send('update-settings', settings),
    updateCommands: (commands) => ipcRenderer.send('update-commands', commands),
    onSettingsUpdated: (callback) => ipcRenderer.on('settings-updated', (event, data) => callback(data)),

    // Queue actions
    getQueue: () => ipcRenderer.invoke('get-queue'),
    addSong: (songTitle, requester, fastTrack) => ipcRenderer.send('queue-add', { songTitle, requester, fastTrack }),
    removeSong: (target) => ipcRenderer.send('queue-remove', target),
    playSong: (target) => ipcRenderer.send('queue-play', target),
    doneSong: (target) => ipcRenderer.send('queue-done', target),
    skipSong: () => ipcRenderer.send('queue-skip'),
    clearQueue: () => ipcRenderer.send('queue-clear'),
    
    // Queue events
    onQueueUpdated: (callback) => ipcRenderer.on('queue-updated', (event, data) => callback(data)),

    // Activity
    getActivity: () => ipcRenderer.invoke('get-activity'),
    addActivity: (text, type) => ipcRenderer.send('add-activity', text, type),
    clearActivity: () => ipcRenderer.send('clear-activity'),
    onActivityUpdated: (callback) => ipcRenderer.on('activity-updated', (event, data) => callback(data)),

    // Window controls
    minimizeWindow: () => ipcRenderer.send('window-min'),
    maximizeWindow: () => ipcRenderer.send('window-max'),
    closeWindow: () => ipcRenderer.send('window-close')
});

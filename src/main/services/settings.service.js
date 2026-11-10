const fs = require('fs');
const path = require('path');
const { app } = require('electron');

class SettingsManager {
    constructor() {
        this.userDataPath = app.getPath('userData');
        this.settingsFile = path.join(this.userDataPath, 'settings.json');
        this.commandsFile = path.join(this.userDataPath, 'commands.json');
        
        this.defaultSettings = {
            general: {
                autoPlayNextSong: false,
                saveQueueAutomatically: true,
                restoreQueueOnStartup: true,
                hideWelcome: false
            },
            overlay: {
                showNowPlaying: true,
                showQueue: true,
                showRequester: true,
                showFastTrackBadge: true,
                rotateCassette: true,
                hideOverlayWhenQueueIsEmpty: false,
                queueDisplayCount: 5,
                animationSpeed: 'Normal' // 'Slow', 'Normal', 'Fast'
            },
            connection: {
                username: ''
            },
            permissions: {
                mode: 'mod_only',
                whitelist: ''
            }
        };

        this.defaultCommands = {
            song: ['!song', '!s'],
            fastsong: ['!fastsong', '!fs'],
            play: ['!play', '!p'],
            done: ['!done', '!d'],
            remove: ['!remove', '!r'],
            skip: ['!skip', '!sk'],
            queue: ['!queue', '!q'],
            now: ['!now', '!np'],
            clear: ['!clear', '!c']
        };

        this.settings = this.loadSettings();
        this.commands = this.loadCommands();
    }

    loadSettings() {
        try {
            if (fs.existsSync(this.settingsFile)) {
                const data = fs.readFileSync(this.settingsFile, 'utf8');
                const parsed = JSON.parse(data);
                // Merge with defaults
                return { ...this.defaultSettings, ...parsed, overlay: { ...this.defaultSettings.overlay, ...(parsed.overlay || {}) }, general: { ...this.defaultSettings.general, ...(parsed.general || {}) }, permissions: { ...this.defaultSettings.permissions, ...(parsed.permissions || {}) } };
            }
        } catch (error) {
            console.error('Failed to load settings:', error);
        }
        return JSON.parse(JSON.stringify(this.defaultSettings));
    }

    saveSettings() {
        try {
            fs.writeFileSync(this.settingsFile, JSON.stringify(this.settings, null, 2));
        } catch (error) {
            console.error('Failed to save settings:', error);
        }
    }

    updateSettings(newSettings) {
        this.settings = { ...this.settings, ...newSettings };
        this.saveSettings();
    }

    loadCommands() {
        try {
            if (fs.existsSync(this.commandsFile)) {
                const data = fs.readFileSync(this.commandsFile, 'utf8');
                return JSON.parse(data);
            }
        } catch (error) {
            console.error('Failed to load commands:', error);
        }
        return JSON.parse(JSON.stringify(this.defaultCommands));
    }

    saveCommands() {
        try {
            fs.writeFileSync(this.commandsFile, JSON.stringify(this.commands, null, 2));
        } catch (error) {
            console.error('Failed to save commands:', error);
        }
    }

    updateCommands(newCommands) {
        this.commands = { ...this.commands, ...newCommands };
        this.saveCommands();
    }

    resetCommands() {
        this.commands = JSON.parse(JSON.stringify(this.defaultCommands));
        this.saveCommands();
    }
}

module.exports = SettingsManager;

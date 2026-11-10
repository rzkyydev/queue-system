class CommandParser {
    constructor(queueManager, settingsManager) {
        this.queueManager = queueManager;
        this.settingsManager = settingsManager;
    }

    parse(chatString, username, isModerator) {
        const str = chatString.trim().replace(/\s+/g, ' ');
        if (!str.startsWith('!')) return { success: false, message: 'Not a command' };

        const perms = this.settingsManager.settings.permissions || { mode: 'mod_only', whitelist: '' };
        const mode = perms.mode;
        
        // Parse whitelist
        let whitelistRaw = perms.whitelist || [];
        if (typeof whitelistRaw === 'string') {
            whitelistRaw = whitelistRaw.split('\n');
        }
        if (!Array.isArray(whitelistRaw)) {
            whitelistRaw = [];
        }
        const whitelist = whitelistRaw
            .filter(s => typeof s === 'string')
            .map(s => s.trim().replace(/^@/, '').toLowerCase())
            .filter(s => s.length > 0);
        
        const usernameLower = username.toLowerCase();
        let isAllowed = false;

        if (mode === 'disabled' || mode === 'everyone') {
            isAllowed = true;
        } else if (mode === 'mod_only') {
            isAllowed = isModerator;
        } else if (mode === 'whitelist') {
            isAllowed = whitelist.includes(usernameLower);
        } else if (mode === 'mod_or_whitelist') {
            isAllowed = isModerator || whitelist.includes(usernameLower);
        } else {
            // Default fallback
            isAllowed = isModerator;
        }

        if (!isAllowed) {
            console.log(`[CHAT] ${username} (ignored, unauthorized based on mode: ${mode})`);
            return { success: false, ignored: true };
        }
        
        console.log(`[CHAT] ${username} (command accepted via ${mode})`);

        const parts = str.split(' ');
        const cmdStr = parts[0].toLowerCase();
        const argsStr = parts.slice(1).join(' ');

        const commands = this.settingsManager.commands || {};
        let commandKey = null;

        // Find which command matches the alias
        for (const [key, aliases] of Object.entries(commands)) {
            if (Array.isArray(aliases) && aliases.includes(cmdStr)) {
                commandKey = key;
                break;
            }
        }

        if (!commandKey) {
            return { success: false, message: 'Unknown command.' };
        }

        try {
            switch (commandKey) {
                case 'song':
                case 'fastsong':
                    return this._handleAddSong(commandKey, argsStr, username);
                case 'play':
                    return this._handlePlay(argsStr);
                case 'done':
                    return this._handleDone(argsStr);
                case 'remove':
                    return this._handleRemove(argsStr);
                case 'skip':
                    return this._handleSkip();
                case 'queue':
                    return this._handleQueueCount();
                case 'now':
                    return this._handleNowPlaying();
                case 'clear':
                    this.queueManager.clearQueue();
                    return { success: true, message: 'Queue cleared.' };
                default:
                    return { success: false, message: 'Command not implemented.' };
            }
        } catch (error) {
            console.error('Error parsing command:', error);
            return { success: false, message: 'Internal error processing command.' };
        }
    }

    _extractUserAndSong(argsStr, fallbackUser) {
        let requester = `@${fallbackUser}`;
        let songTitle = argsStr;

        if (argsStr.startsWith('@')) {
            const spaceIndex = argsStr.indexOf(' ');
            if (spaceIndex !== -1) {
                let potentialUser = argsStr.substring(0, spaceIndex);
                let potentialSong = argsStr.substring(spaceIndex + 1);
                
                // Handle optional hyphen `!s @user - Song Name`
                if (potentialSong.startsWith('- ')) {
                    potentialSong = potentialSong.substring(2);
                } else if (potentialSong.startsWith('-')) {
                    potentialSong = potentialSong.substring(1);
                }

                requester = potentialUser;
                songTitle = potentialSong.trim();
            }
        }
        return { requester, songTitle };
    }

    _handleAddSong(commandKey, argsStr, username) {
        if (!argsStr) return { success: false, message: 'Please provide a song name.' };
        const { requester, songTitle } = this._extractUserAndSong(argsStr, username);
        const isFast = commandKey === 'fastsong';
        this.queueManager.addSong(songTitle, requester, isFast);
        return { success: true, message: `Added ${songTitle} to ${isFast ? 'Fast Track' : 'Queue'}.` };
    }

    _parseIndexOrQuery(argsStr) {
        if (!argsStr) return null;
        const trimmedStr = argsStr.trim();
        const num = parseInt(trimmedStr, 10);
        if (!isNaN(num) && num.toString() === trimmedStr) {
            return num - 1; // Convert to 0-based index
        }
        return trimmedStr;
    }

    _handlePlay(argsStr) {
        if (!argsStr) return { success: false, message: 'Please provide a queue number, user, or song title.' };
        const query = this._parseIndexOrQuery(argsStr);
        const played = this.queueManager.playSong(query);
        if (played) {
            return { success: true, message: `Now playing: ${played.songTitle}` };
        }
        return { success: false, message: 'Song not found in queue.' };
    }

    _handleDone(argsStr) {
        const query = this._parseIndexOrQuery(argsStr);
        const doneSong = this.queueManager.done(query);
        if (doneSong) {
            return { success: true, message: `Finished: ${doneSong.songTitle}` };
        }
        if (!argsStr) {
            return { success: false, message: 'No song is currently playing.' };
        }
        return { success: false, message: 'Song not found in queue.' };
    }

    _handleRemove(argsStr) {
        if (!argsStr) return { success: false, message: 'Please provide a queue number, user, or song title.' };
        const query = this._parseIndexOrQuery(argsStr);
        const removed = this.queueManager.removeSong(query);
        if (removed) {
            return { success: true, message: `Removed: ${removed.songTitle}` };
        }
        return { success: false, message: 'Song not found in queue.' };
    }

    _handleSkip() {
        const skipped = this.queueManager.skip();
        if (skipped) {
            return { success: true, message: `Skipped: ${skipped.songTitle}` };
        }
        return { success: false, message: 'No song to skip.' };
    }

    _handleQueueCount() {
        const count = this.queueManager.queue.length;
        return { success: true, message: `There are ${count} songs in the queue.` };
    }

    _handleNowPlaying() {
        const np = this.queueManager.nowPlaying;
        if (np) {
            return { success: true, message: `Now playing: ${np.songTitle} requested by ${np.requester}` };
        }
        return { success: true, message: 'Nothing is currently playing.' };
    }
}

module.exports = CommandParser;

const crypto = require('crypto');
const EventEmitter = require('events');
const QueueStorage = require('./queue-storage');

class QueueManager extends EventEmitter {
    constructor(settingsManager) {
        super();
        this.settingsManager = settingsManager;
        this.storage = new QueueStorage();
        this.queue = [];
        this.nowPlaying = null;

        if (this.settingsManager.settings.general.restoreQueueOnStartup) {
            this.queue = this.storage.loadQueue();
            const playingIndex = this.queue.findIndex(item => item.status === 'playing');
            if (playingIndex !== -1) {
                this.nowPlaying = this.queue[playingIndex];
            }
        }
    }

    _generateId() {
        return crypto.randomUUID();
    }

    _save() {
        if (this.settingsManager.settings.general.saveQueueAutomatically) {
            this.storage.saveQueue(this.queue);
        }
        this.emit('queue-updated', this.getQueueData());
    }

    getQueueData() {
        return {
            queue: this.queue,
            nowPlaying: this.nowPlaying
        };
    }

    addSong(songTitle, requester, fastTrack = false) {
        const item = {
            id: this._generateId(),
            songTitle: songTitle.trim(),
            requester: requester.trim(),
            fastTrack: fastTrack,
            status: 'waiting',
            requestedAt: Date.now()
        };

        if (fastTrack) {
            // Find the last fast track item
            let insertIndex = 0;
            for (let i = 0; i < this.queue.length; i++) {
                if (this.queue[i].status === 'playing') {
                    insertIndex = i + 1;
                    continue;
                }
                if (this.queue[i].fastTrack) {
                    insertIndex = i + 1;
                } else {
                    break;
                }
            }
            this.queue.splice(insertIndex, 0, item);
        } else {
            this.queue.push(item);
        }
        
        this._save();
        return item;
    }

    removeSong(idOrRequesterOrIndex) {
        let index = -1;
        if (typeof idOrRequesterOrIndex === 'number') {
            index = idOrRequesterOrIndex; // 0-based
        } else if (typeof idOrRequesterOrIndex === 'string') {
            const query = idOrRequesterOrIndex.toLowerCase();
            index = this.queue.findIndex(item => 
                item.id === query || 
                item.requester.toLowerCase() === query || 
                item.songTitle.toLowerCase() === query
            );
        }

        if (index !== -1) {
            const removed = this.queue.splice(index, 1)[0];
            if (removed === this.nowPlaying) {
                this.nowPlaying = null;
            }
            this._save();
            return removed;
        }
        return null;
    }

    playSong(idOrRequesterOrIndex) {
        let index = -1;
        if (typeof idOrRequesterOrIndex === 'number') {
            index = idOrRequesterOrIndex; // 0-based
        } else if (typeof idOrRequesterOrIndex === 'string') {
            const query = idOrRequesterOrIndex.toLowerCase();
            index = this.queue.findIndex(item => 
                item.id === query || 
                item.requester.toLowerCase() === query || 
                item.songTitle.toLowerCase() === query
            );
        }

        if (index !== -1) {
            // Revert current playing to waiting
            if (this.nowPlaying) {
                const currentPlayingIndex = this.queue.findIndex(i => i.id === this.nowPlaying.id);
                if (currentPlayingIndex !== -1) {
                    this.queue[currentPlayingIndex].status = 'waiting';
                }
            }
            this.nowPlaying = this.queue[index];
            this.nowPlaying.status = 'playing';
            this._save();
            return this.nowPlaying;
        }
        return null;
    }

    done(idOrRequesterOrIndex = null) {
        let targetId = null;

        if (idOrRequesterOrIndex === null) {
            if (this.nowPlaying) {
                targetId = this.nowPlaying.id;
            } else if (this.queue.length > 0) {
                targetId = this.queue[0].id;
            } else {
                return null;
            }
        } else {
            let index = -1;
            if (typeof idOrRequesterOrIndex === 'number') {
                index = idOrRequesterOrIndex;
            } else if (typeof idOrRequesterOrIndex === 'string') {
                const query = idOrRequesterOrIndex.toLowerCase();
                index = this.queue.findIndex(item => 
                    item.id === query || 
                    item.requester.toLowerCase() === query || 
                    item.songTitle.toLowerCase() === query
                );
            }
            if (index !== -1) {
                targetId = this.queue[index].id;
            }
        }

        if (targetId) {
            const index = this.queue.findIndex(item => item.id === targetId);
            if (index !== -1) {
                const finished = this.queue.splice(index, 1)[0];
                if (finished.id === this.nowPlaying?.id) {
                    this.nowPlaying = null;
                    if (this.settingsManager.settings.general.autoPlayNextSong && this.queue.length > 0) {
                        this.playSong(0); // Play the next one
                        return finished; // playSong calls save
                    }
                }
                this._save();
                return finished;
            }
        }
        return null;
    }

    skip() {
        return this.done();
    }

    clearQueue() {
        this.queue = [];
        this.nowPlaying = null;
        this._save();
    }
}

module.exports = QueueManager;

const fs = require('fs');
const path = require('path');
const { app } = require('electron');

class QueueStorage {
    constructor() {
        this.userDataPath = app.getPath('userData');
        this.queueFile = path.join(this.userDataPath, 'queue.json');
    }

    saveQueue(queue) {
        try {
            fs.writeFileSync(this.queueFile, JSON.stringify(queue, null, 2));
        } catch (error) {
            console.error('Failed to save queue:', error);
        }
    }

    loadQueue() {
        try {
            if (fs.existsSync(this.queueFile)) {
                const data = fs.readFileSync(this.queueFile, 'utf8');
                return JSON.parse(data);
            }
        } catch (error) {
            console.error('Failed to load queue:', error);
        }
        return [];
    }
}

module.exports = QueueStorage;

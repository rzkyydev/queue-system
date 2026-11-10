const fs = require('fs');
const path = require('path');
const { app } = require('electron');

class ActivityManager {
    constructor() {
        this.userDataPath = app.getPath('userData');
        this.activityFile = path.join(this.userDataPath, 'activity.json');
        this.maxActivities = 200; // Limit to 200 entries
        this.activities = this.load();
    }

    load() {
        try {
            if (fs.existsSync(this.activityFile)) {
                const data = fs.readFileSync(this.activityFile, 'utf8');
                return JSON.parse(data);
            }
        } catch (error) {
            console.error('Failed to load activity history:', error);
        }
        return [];
    }

    _save() {
        try {
            // Trim to max capacity before saving
            if (this.activities.length > this.maxActivities) {
                this.activities = this.activities.slice(0, this.maxActivities);
            }
            fs.writeFileSync(this.activityFile, JSON.stringify(this.activities, null, 2));
        } catch (error) {
            console.error('Failed to save activity history:', error);
        }
    }

    add(text, type = 'normal') {
        const time = new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
        const activity = { text, type, time, id: Date.now() };
        // Insert at the beginning so the newest is at index 0
        this.activities.unshift(activity);
        this._save();
        return activity;
    }

    clear() {
        this.activities = [];
        this._save();
    }

    get() {
        return this.activities;
    }
}

module.exports = ActivityManager;

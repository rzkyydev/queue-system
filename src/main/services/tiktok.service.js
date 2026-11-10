const { EventEmitter } = require('events');
const fs = require('fs');
const path = require('path');
const { app } = require('electron');

const CHROME_USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36'
];

// Install global fetch interceptor to inject UA and Cookies for piratetok-live-js API calls
if (!global.__fetchInterceptedForTikTok) {
    const originalFetch = global.fetch;
    global.fetch = async function(url, options = {}) {
        if (typeof url === 'string' && url.includes('tiktok.com')) {
            options.headers = options.headers || {};
            
            let headers = options.headers;
            let isHeadersObj = typeof headers.set === 'function';
            
            if (global.__tiktokActiveUA) {
                if (isHeadersObj) headers.set('User-Agent', global.__tiktokActiveUA);
                else headers['User-Agent'] = global.__tiktokActiveUA;
            }
            if (global.__tiktokActiveCookies) {
                if (isHeadersObj) headers.set('Cookie', global.__tiktokActiveCookies);
                else headers['Cookie'] = global.__tiktokActiveCookies;
            }
        }
        return originalFetch.apply(this, arguments);
    };
    global.__fetchInterceptedForTikTok = true;
}

class TikTokService extends EventEmitter {
    constructor() {
        super();
        this.client = null;
        this.username = null;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.intentionalDisconnect = false;
        this.isConnecting = false;

        // Path to store session internally
        const userDataPath = app.getPath('userData');
        this.sessionFilePath = path.join(userDataPath, 'tiktok_session.json');
    }

    async initClient(username) {
        if (!this.TikTokLiveClient) {
            const pkg = await import('piratetok-live-js');
            this.TikTokLiveClient = pkg.TikTokLiveClient || pkg.WebcastPushConnection;
        }

        this.client = new this.TikTokLiveClient(username);
        
        // Load stored session data
        const sessionData = this.loadSession();
        let selectedUserAgent = sessionData?.userAgent;
        
        if (!selectedUserAgent) {
            selectedUserAgent = CHROME_USER_AGENTS[Math.floor(Math.random() * CHROME_USER_AGENTS.length)];
        }
        
        // Set user agent before connecting
        if (typeof this.client.userAgent === 'function') {
            this.client.userAgent(selectedUserAgent);
        }
        
        // Store the active UA and Cookies globally for the fetch interceptor
        this.activeUserAgent = selectedUserAgent;
        global.__tiktokActiveUA = selectedUserAgent;
        
        if (sessionData && sessionData.cookies) {
            this.client.cookies(sessionData.cookies);
            global.__tiktokActiveCookies = sessionData.cookies;
        } else {
            global.__tiktokActiveCookies = null;
        }

        // Forward internal events
        this.client.on('chat', (data) => this.emit('chat', data));
        this.client.on('gift', (data) => this.emit('gift', data));
        this.client.on('like', (data) => this.emit('like', data));
        
        this.client.on('disconnected', () => {
            this.handleDisconnect();
        });

        this.client.on('error', (err) => {
            console.error('[TikTokService] Internal error:', err);
            // Don't expose technical errors directly, but we can emit a generic error
            this.emit('status', { status: 'failed', error: 'Connection error occurred.' });
        });
    }

    loadSession() {
        try {
            if (fs.existsSync(this.sessionFilePath)) {
                const data = fs.readFileSync(this.sessionFilePath, 'utf8');
                const session = JSON.parse(data);
                return session || null;
            }
        } catch (err) {
            console.error('[TikTokService] Failed to load session:', err);
        }
        return null;
    }

    saveSession() {
        if (!this.client || !this.client._cookies) return;
        try {
            const session = { 
                cookies: this.client._cookies,
                userAgent: this.activeUserAgent || CHROME_USER_AGENTS[0]
            };
            fs.writeFileSync(this.sessionFilePath, JSON.stringify(session), 'utf8');
        } catch (err) {
            console.error('[TikTokService] Failed to save session:', err);
        }
    }

    async connect(username, isReconnect = false) {
        if (this.isConnecting) return;

        this.username = username;
        this.intentionalDisconnect = false;
        this.isConnecting = true;

        if (!isReconnect) {
            this.reconnectAttempts = 0;
        }

        this.cleanupClient();
        await this.initClient(username);

        try {
            if (isReconnect) {
                this.emit('status', { status: 'reconnecting', attempt: this.reconnectAttempts, maxAttempts: this.maxReconnectAttempts });
                console.log(`[TikTokService] Reconnect attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts} for ${username}`);
            } else {
                this.emit('status', { status: 'connecting' });
                console.log(`[TikTokService] Connecting to ${username}...`);
            }

            const connectPromise = new Promise((resolve, reject) => {
                const onConnect = () => resolve();
                this.client.once('connected', onConnect);
                
                // client.connect() blocks while connected, so we just run it and catch errors
                this.client.connect().catch(err => {
                    this.client.removeListener('connected', onConnect);
                    reject(err);
                });
            });

            const timeoutPromise = new Promise((_, reject) => {
                setTimeout(() => reject(new Error('TIMEOUT')), 15000);
            });

            await Promise.race([connectPromise, timeoutPromise]);
            
            console.log(`[TikTokService] Connected successfully`);
            this.isConnecting = false;
            this.reconnectAttempts = 0;
            this.saveSession(); // Save updated session cookies
            
            this.emit('status', { status: 'connected', username });

        } catch (err) {
            this.isConnecting = false;
            this.cleanupClient();
            
            if (err.message === 'TIMEOUT') {
                console.error(`[TikTokService] Connection timeout`);
                this.emit('status', { status: 'timeout', error: 'Connection timed out' });
            } else {
                console.error(`[TikTokService] Connection failed:`, err);
                
                // Convert some technical errors to generic user errors
                let userError = 'Failed to connect. Please check the username and your internet connection.';
                const errStr = err.toString();
                if (errStr.includes('not found') || errStr.includes('does not exist') || errStr.includes('UserNotFoundError')) {
                    userError = 'User not found.';
                } else if (errStr.includes('offline') || errStr.includes('LiveEnded')) {
                    userError = 'User is offline or live has ended.';
                } else if (errStr.includes('blocked') || errStr.includes('captcha')) {
                    userError = 'Connection blocked by TikTok. Please try again later.';
                }
                
                this.emit('status', { status: 'failed', error: userError });
            }
            
            // Trigger auto-reconnect if it wasn't a fatal user error (like not found)
            const errString = err.toString().toLowerCase();
            const isFatal = errString.includes('not found') || errString.includes('does not exist') || errString.includes('usernotfound');
            
            if (!isFatal) {
                this.scheduleReconnect();
            }
        }
    }

    disconnect() {
        this.intentionalDisconnect = true;
        this.cleanupClient();
        console.log(`[TikTokService] Disconnected intentionally`);
        this.emit('status', { status: 'disconnected' });
    }

    cleanupClient() {
        if (this.client) {
            try {
                this.client.removeAllListeners();
                this.client.disconnect();
            } catch (e) {
                // Ignore cleanup errors
            }
            this.client = null;
        }
    }

    handleDisconnect() {
        console.log(`[TikTokService] Disconnected from stream`);
        if (this.intentionalDisconnect) {
            this.emit('status', { status: 'disconnected' });
            return;
        }

        this.scheduleReconnect();
    }

    scheduleReconnect() {
        if (this.intentionalDisconnect || this.isConnecting) return;

        if (this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++;
            // Exponential backoff: 3s, 6s, 12s, 24s... max 30s
            const delay = Math.min(3000 * Math.pow(2, this.reconnectAttempts - 1), 30000);
            
            console.log(`[TikTokService] Scheduling reconnect in ${delay}ms...`);
            this.emit('status', { status: 'reconnecting', attempt: this.reconnectAttempts, maxAttempts: this.maxReconnectAttempts });
            
            setTimeout(() => {
                if (!this.intentionalDisconnect) {
                    this.connect(this.username, true);
                }
            }, delay);
        } else {
            console.error(`[TikTokService] Max reconnect attempts reached`);
            this.cleanupClient();
            this.emit('status', { status: 'failed', error: 'Max reconnect attempts reached. Could not restore connection.' });
        }
    }
}

module.exports = TikTokService;

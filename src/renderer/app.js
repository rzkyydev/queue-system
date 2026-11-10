import { state, updateState } from './store.js';
import { Modal } from './components/modal.js';
import { initNavigation } from './components/navigation.js';
import { SmoothScroll } from './utils/smooth-scroll.js';

// Init Navigation
initNavigation();

// DOM Elements: Overview & Sidebar
const ovUsername = document.getElementById('ov-tiktok-username');
const ovConnectBtn = document.getElementById('ov-connect-btn');
const sideRetryBtn = document.getElementById('side-retry-btn');
const btnOvRefresh = document.getElementById('btn-ov-refresh');

const ovStatusDot = document.getElementById('ov-status-dot');
const ovStatusTitle = document.getElementById('ov-status-title');
const ovStatusSub = document.getElementById('ov-status-sub');

const ovOverlayDot = document.getElementById('ov-overlay-dot');
const ovOverlayTitle = document.getElementById('ov-overlay-title');
const ovOverlaySub = document.getElementById('ov-overlay-sub');

const ovQueueCount = document.getElementById('ov-queue-count');
const ovFastTrackCount = document.getElementById('ov-fast-track-count');

const sideStatusDot = document.getElementById('side-status-dot');
const sideStatusTitle = document.getElementById('side-status-title');
const sideStatusSub = document.getElementById('side-status-sub');

// Welcome Modal
const welcomeOverlay = document.getElementById('welcome-modal-overlay');
const btnWelcomeStart = document.getElementById('btn-welcome-start');

// Activity Modal
const activityOverlay = document.getElementById('activity-modal-overlay');
const btnViewAllActivity = document.getElementById('btn-view-all-activity');
const btnClearActivity = document.getElementById('btn-clear-activity');
const btnActivityClose = document.getElementById('btn-activity-close');

// Connect Action
function doConnect() {
    if (state.isConnected) {
        window.api.disconnectTikTok();
        return;
    }
    const username = ovUsername.value.trim();
    if (!username) return Modal.alert('Error', 'Please enter a TikTok username in the Overview page.');
    
    updateConnectionUI('connecting');
    window.api.connectTikTok(username);
}

ovConnectBtn.addEventListener('click', doConnect);
sideRetryBtn.addEventListener('click', doConnect);
btnOvRefresh.addEventListener('click', async () => {
    btnOvRefresh.disabled = true;
    const origText = btnOvRefresh.innerHTML;
    btnOvRefresh.innerHTML = 'Refreshing...';
    await initQueue();
    setTimeout(() => {
        btnOvRefresh.innerHTML = origText;
        btnOvRefresh.disabled = false;
    }, 500);
});

// Connection UI
function updateConnectionUI(state, extra = '') {
    let dotClass = 'status-dot dot-gray';
    let titleText = 'Disconnected';
    let subText = 'Not connected';
    
    if (state === 'connecting') {
        ovConnectBtn.innerHTML = 'Connecting...';
        ovConnectBtn.disabled = true;
        sideRetryBtn.innerHTML = 'Connecting...';
        sideRetryBtn.disabled = true;
        ovUsername.disabled = true;
        
        dotClass = 'status-dot dot-orange';
        titleText = 'Connecting';
        subText = 'Please wait...';
        sideRetryBtn.classList.remove('hidden');
    } else if (state === 'connected') {
        ovConnectBtn.innerHTML = 'Disconnect TikTok';
        ovConnectBtn.disabled = false;
        sideRetryBtn.innerHTML = 'Disconnect';
        sideRetryBtn.disabled = false;
        ovUsername.disabled = false;
        
        updateState('isConnected', true);
        
        dotClass = 'status-dot dot-green';
        titleText = 'Connected';
        subText = ovUsername.value || 'Active session';
        sideRetryBtn.classList.add('hidden'); // hide retry btn in sidebar if connected
        
        ovOverlayDot.className = 'status-dot dot-green';
        ovOverlayTitle.textContent = 'Online';
        ovOverlaySub.textContent = 'Ready to broadcast';
    } else if (state === 'reconnecting') {
        ovConnectBtn.innerHTML = 'Connecting...';
        ovConnectBtn.disabled = true;
        sideRetryBtn.innerHTML = 'Connecting...';
        sideRetryBtn.disabled = true;
        ovUsername.disabled = true;
        
        dotClass = 'status-dot dot-orange';
        titleText = 'Reconnecting';
        subText = `Retrying ${extra}...`;
        sideRetryBtn.classList.remove('hidden');
    } else if (state === 'failed' || state === 'disconnected') {
        const btnHtml = state === 'failed' ? 'Retry Connect' : 'Connect TikTok';
        ovConnectBtn.innerHTML = btnHtml;
        ovConnectBtn.disabled = false;
        sideRetryBtn.innerHTML = 'Retry Connect';
        sideRetryBtn.disabled = false;
        ovUsername.disabled = false;
        
        updateState('isConnected', false);
        
        if (state === 'failed') {
            dotClass = 'status-dot dot-red';
            titleText = 'Failed';
            subText = 'Connection error';
            sideRetryBtn.classList.remove('hidden');
        } else {
            dotClass = 'status-dot dot-gray';
            titleText = 'Disconnected';
            subText = 'Waiting for connection';
            sideRetryBtn.classList.remove('hidden');
        }
        
        ovOverlayDot.className = 'status-dot dot-gray';
        ovOverlayTitle.textContent = 'Offline';
        ovOverlaySub.textContent = 'Waiting for connection';
    }

    ovStatusDot.className = dotClass;
    ovStatusTitle.textContent = titleText;
    ovStatusSub.textContent = subText;
    
    sideStatusDot.className = dotClass;
    sideStatusTitle.textContent = titleText;
    sideStatusSub.textContent = subText;
}

window.api.onTikTokStatus((data) => {
    updateConnectionUI(data.status, data.extra);
});

// URL Actions
const overlayUrlText = 'http://127.0.0.1:3333/overlay';
document.querySelectorAll('.btn-copy-url').forEach(btn => {
    btn.addEventListener('click', () => {
        navigator.clipboard.writeText(overlayUrlText);
        
        const origHtml = btn.innerHTML;
        btn.innerHTML = `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#22c55e" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>`;
        
        setTimeout(() => {
            btn.innerHTML = origHtml;
        }, 1500);
    });
});
document.querySelectorAll('.btn-open-url').forEach(btn => {
    btn.addEventListener('click', () => {
        window.open(overlayUrlText, '_blank');
    });
});

// Welcome 
btnWelcomeStart.addEventListener('click', () => {
    state.settings.general.hideWelcome = true;
    window.api.updateSettings({ general: state.settings.general });
    welcomeOverlay.classList.add('hidden');
});

// Activity 
btnViewAllActivity.addEventListener('click', () => activityOverlay.classList.remove('hidden'));
btnActivityClose.addEventListener('click', () => activityOverlay.classList.add('hidden'));
btnClearActivity.addEventListener('click', () => {
    Modal.confirm('Clear History', 'Are you sure you want to clear all activity history?', () => {
        window.api.clearActivity();
    });
});

// Settings
async function initSettings() {
    updateState('settings', await window.api.getSettings());
    updateState('commands', await window.api.getCommands());
    
    if (state.settings.connection?.username) {
        ovUsername.value = state.settings.connection.username;
    }
    
    if (!state.settings.general.hideWelcome) {
        welcomeOverlay.classList.remove('hidden');
    }
    
    document.getElementById('set-autoplay').checked = state.settings.general.autoPlayNextSong;
    document.getElementById('set-savequeue').checked = state.settings.general.saveQueueAutomatically;
    document.getElementById('set-restorequeue').checked = state.settings.general.restoreQueueOnStartup;
    
    document.getElementById('set-ov-nowplaying').checked = state.settings.overlay.showNowPlaying;
    document.getElementById('set-ov-queue').checked = state.settings.overlay.showQueue;
    document.getElementById('set-ov-requester').checked = state.settings.overlay.showRequester;
    document.getElementById('set-ov-fasttrack').checked = state.settings.overlay.showFastTrackBadge;
    document.getElementById('set-ov-cassette').checked = state.settings.overlay.rotateCassette;
    document.getElementById('set-ov-autohide').checked = state.settings.overlay.hideOverlayWhenQueueIsEmpty;
    
    const countSlider = document.getElementById('set-ov-count');
    const countVal = document.getElementById('val-queue-count');
    countSlider.value = state.settings.overlay.queueDisplayCount;
    countVal.textContent = state.settings.overlay.queueDisplayCount;
    countSlider.addEventListener('input', e => countVal.textContent = e.target.value);
    
    document.getElementById('set-ov-speed').value = state.settings.overlay.animationSpeed;
    
    // Permissions
    const permMode = document.getElementById('set-perm-mode');
    const permWhitelist = document.getElementById('set-perm-whitelist');
    const rowWhitelist = document.getElementById('row-whitelist');
    
    permMode.value = state.settings.permissions.mode;
    if (state.settings.permissions.whitelist) {
        permWhitelist.value = Array.isArray(state.settings.permissions.whitelist) 
            ? state.settings.permissions.whitelist.join('\n') 
            : state.settings.permissions.whitelist;
    }
    
    const updateWhitelistVis = () => {
        if (permMode.value === 'whitelist' || permMode.value === 'mod_or_whitelist') {
            rowWhitelist.classList.remove('hidden');
        } else {
            rowWhitelist.classList.add('hidden');
        }
    };
    permMode.addEventListener('change', updateWhitelistVis);
    updateWhitelistVis();
    
    // Commands List
    const cmdContainer = document.getElementById('commands-container');
    cmdContainer.innerHTML = '';
    
    const cmdDefs = [
        { key: 'song', name: 'Song Request', example: '!song Misrlou' },
        { key: 'fastsong', name: 'Fast Track Request', example: '!fastsong Numb' },
        { key: 'skip', name: 'Skip Song', example: '!skip' },
        { key: 'done', name: 'Mark Done', example: '!done' },
        { key: 'remove', name: 'Remove by Index', example: '!remove 2' },
        { key: 'queue', name: 'Check Queue', example: '!queue' }
    ];
    
    cmdDefs.forEach(def => {
        const aliases = (state.commands[def.key] || []).join(', ');
        
        const item = document.createElement('div');
        item.className = 'cmd-item mb-3';
        item.innerHTML = `
            <div class="cmd-item-info">
                <div class="cmd-name">${def.name}</div>
                <div class="cmd-example">Example: ${def.example}</div>
            </div>
            <div class="cmd-item-input">
                <input type="text" class="input cmd-alias-input" data-key="${def.key}" value="${aliases}">
            </div>
        `;
        cmdContainer.appendChild(item);
    });
}

document.getElementById('btn-save-settings').addEventListener('click', () => {
    const newSettings = {
        general: {
            ...state.settings.general,
            autoPlayNextSong: document.getElementById('set-autoplay').checked,
            saveQueueAutomatically: document.getElementById('set-savequeue').checked,
            restoreQueueOnStartup: document.getElementById('set-restorequeue').checked
        },
        overlay: {
            ...state.settings.overlay,
            showNowPlaying: document.getElementById('set-ov-nowplaying').checked,
            showQueue: document.getElementById('set-ov-queue').checked,
            showRequester: document.getElementById('set-ov-requester').checked,
            showFastTrackBadge: document.getElementById('set-ov-fasttrack').checked,
            rotateCassette: document.getElementById('set-ov-cassette').checked,
            hideOverlayWhenQueueIsEmpty: document.getElementById('set-ov-autohide').checked,
            queueDisplayCount: parseInt(document.getElementById('set-ov-count').value),
            animationSpeed: document.getElementById('set-ov-speed').value
        },
        permissions: {
            ...state.settings.permissions,
            mode: document.getElementById('set-perm-mode').value,
            whitelist: document.getElementById('set-perm-whitelist').value.split('\n').map(s => s.trim()).filter(s => s)
        }
    };
    
    const newCommands = {};
    document.querySelectorAll('.cmd-alias-input').forEach(input => {
        const key = input.dataset.key;
        newCommands[key] = input.value.split(',').map(s => s.trim()).filter(s => s);
    });
    
    updateState('settings', { ...state.settings, ...newSettings });
    updateState('commands', newCommands);
    window.api.updateSettings(newSettings);
    window.api.updateCommands(newCommands);
    Modal.alert('Success', 'Settings saved successfully!');
});

// Queue Management
async function initQueue() {
    const qData = await window.api.getQueue();
    processQueueUpdate(qData);
}

async function initActivity() {
    updateState('sessionHistory', await window.api.getActivity());
    renderActivity();
    renderFullActivity();
}

window.api.onActivityUpdated((data) => {
    updateState('sessionHistory', data);
    renderActivity();
    renderFullActivity();
});

function addActivity(text, type = 'normal') {
    window.api.addActivity(text, type);
}

function processQueueUpdate(qData) {
    let newQueue = [];
    let playingItem = null;
    
    if (Array.isArray(qData)) {
        newQueue = qData;
    } else {
        newQueue = qData.queue || [];
        if (qData.nowPlaying) playingItem = qData.nowPlaying;
    }
    
    // Check for changes to generate activity
    if (state.previousQueueState.length > 0) {
        newQueue.forEach(nq => {
            const pq = state.previousQueueState.find(p => p.id === nq.id);
            if (!pq) {
                if (nq.fastTrack) addActivity(`${nq.songTitle || nq.title} was fast tracked by @${nq.requester || 'system'}`, 'fast');
                else addActivity(`${nq.songTitle || nq.title} was added to queue by @${nq.requester || 'system'}`);
            } else if (!pq.fastTrack && nq.fastTrack) {
                addActivity(`${nq.songTitle || nq.title} was fast tracked`, 'fast');
            }
        });
    }

    updateState('previousQueueState', [...newQueue]);
    if (playingItem && !newQueue.find(i => i.id === playingItem.id)) {
        newQueue = [playingItem, ...newQueue];
    }
    updateState('queue', newQueue);
    renderQueue();
}

window.api.onQueueUpdated(processQueueUpdate);

const qList = document.getElementById('queue-list');
const qEmpty = document.getElementById('empty-queue-msg');
const searchInput = document.getElementById('queue-search');

function renderActivity() {
    const actBox = document.getElementById('recent-activity-list');
    actBox.innerHTML = '';
    
    if (state.sessionHistory.length === 0) {
        actBox.innerHTML = '<div class="text-muted" style="text-align:center; padding: 20px;">No recent activity</div>';
        return;
    }
    
    state.sessionHistory.slice(0, 4).forEach(act => {
        const iconStr = act.type === 'fast' ? '⚡' : '🎵';
        const color = act.type === 'fast' ? 'var(--accent)' : 'var(--text-secondary)';
        actBox.innerHTML += `
            <div class="activity-item">
                <div class="act-icon" style="color: ${color}">${iconStr}</div>
                <div class="act-text">${act.text}</div>
                <div class="act-time">${act.time}</div>
            </div>
        `;
    });
}

function renderFullActivity() {
    const actBox = document.getElementById('full-activity-list');
    if (!actBox) return;
    
    actBox.innerHTML = '';
    
    if (state.sessionHistory.length === 0) {
        actBox.innerHTML = '<div class="text-muted" style="text-align:center; padding: 20px;">No activity history</div>';
        return;
    }
    
    state.sessionHistory.forEach(act => {
        const iconStr = act.type === 'fast' ? '⚡' : '🎵';
        const color = act.type === 'fast' ? 'var(--accent)' : 'var(--text-secondary)';
        actBox.innerHTML += `
            <div class="activity-item">
                <div class="act-icon" style="color: ${color}">${iconStr}</div>
                <div class="act-text">${act.text}</div>
                <div class="act-time">${act.time}</div>
            </div>
        `;
    });
}

function renderQueue() {
    const filterTxt = searchInput.value.toLowerCase().trim();
    
    const npBox = document.getElementById('now-playing-content');
    const npTitle = document.getElementById('np-title');
    const npReq = document.getElementById('np-requester');
    
    const ovNpTitle = document.getElementById('ov-np-title');
    const ovNpReq = document.getElementById('ov-np-req');
    
    const ovBtnOpenQueue = document.getElementById('ov-btn-open-queue');
    const ovBtnAddSong = document.getElementById('ov-btn-add-song');
    const ovBtnSkip = document.getElementById('ov-btn-skip');
    const ovBtnDone = document.getElementById('ov-btn-done');
    
    let playingItem = state.queue.find(i => i.status === 'playing');
    
    if (playingItem) {
        npBox.classList.remove('empty');
        npTitle.textContent = playingItem.songTitle || playingItem.title || 'Unknown';
        npReq.textContent = playingItem.requester ? `@${playingItem.requester}` : '-';
        
        ovNpTitle.textContent = playingItem.songTitle || playingItem.title || 'Unknown';
        ovNpReq.textContent = playingItem.requester ? `@${playingItem.requester}` : '-';
        
        ovBtnSkip.classList.remove('hidden');
        ovBtnDone.classList.remove('hidden');
        ovBtnOpenQueue.classList.add('hidden');
        ovBtnAddSong.classList.add('hidden');
        
        if (state.previousPlayingId !== playingItem.id) {
            addActivity(`Now playing: ${playingItem.songTitle || playingItem.title}`, 'normal');
            updateState('previousPlayingId', playingItem.id);
        }
    } else {
        npBox.classList.add('empty');
        npTitle.textContent = 'Nothing playing';
        npReq.textContent = '-';
        
        ovNpTitle.textContent = 'Nothing playing';
        ovNpReq.textContent = '-';
        
        ovBtnSkip.classList.add('hidden');
        ovBtnDone.classList.add('hidden');
        ovBtnOpenQueue.classList.remove('hidden');
        ovBtnAddSong.classList.remove('hidden');
        
        updateState('previousPlayingId', null);
    }
    
    const pendingSongs = state.queue.filter(q => q.status !== 'playing');
    const fastCount = pendingSongs.filter(q => q.fastTrack).length;
    
    ovQueueCount.textContent = pendingSongs.length;
    ovFastTrackCount.textContent = `${fastCount} Fast Track`;
    
    qList.innerHTML = '';
    
    let renderCount = 0;
    state.queue.forEach((item, index) => {
        if (item === playingItem) return;
        
        const title = item.songTitle || item.title || 'Unknown';
        
        if (filterTxt) {
            const mTitle = title.toLowerCase().includes(filterTxt);
            const mReq = (item.requester || '').toLowerCase().includes(filterTxt);
            if (!mTitle && !mReq) return;
        }
        
        const li = document.createElement('li');
        li.className = 'queue-item';
        
        li.innerHTML = `
            <div class="q-num">${index}</div>
            <div class="q-info">
                <div class="q-title">
                    ${title}
                    ${item.fastTrack ? '<span class="badge badge-subtle-red ml-2" style="font-size:10px;padding:2px 6px;">FAST</span>' : ''}
                </div>
                <div class="q-req">${item.requester ? `@${item.requester}` : 'Manual Add'}</div>
            </div>
            <div class="q-actions">
                <button class="btn btn-secondary btn-icon btn-action-play" data-id="${item.id}" title="Play Now">
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
                </button>
                <button class="btn btn-secondary btn-icon btn-action-done" data-id="${item.id}" title="Done">
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                </button>
                <button class="btn btn-secondary btn-icon btn-action-del" data-id="${item.id}" title="Remove">
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                </button>
            </div>
        `;
        qList.appendChild(li);
        renderCount++;
    });
    
    if (state.queue.length === 0 || (state.queue.length === 1 && playingItem)) {
        qList.classList.add('hidden');
        qEmpty.classList.remove('hidden');
        qEmpty.querySelector('h3').textContent = 'Queue is empty';
        qEmpty.querySelector('p').textContent = 'Waiting for requests from TikTok Live.';
    } else if (renderCount === 0 && filterTxt) {
        qList.classList.add('hidden');
        qEmpty.classList.remove('hidden');
        qEmpty.querySelector('h3').textContent = 'No matching songs';
        qEmpty.querySelector('p').textContent = 'Try another keyword.';
    } else {
        qList.classList.remove('hidden');
        qEmpty.classList.add('hidden');
    }
    
    document.querySelectorAll('.btn-action-done').forEach(b => {
        b.addEventListener('click', () => window.api.doneSong(b.dataset.id));
    });
    document.querySelectorAll('.btn-action-del').forEach(b => {
        b.addEventListener('click', () => window.api.removeSong(b.dataset.id));
    });
    document.querySelectorAll('.btn-action-play').forEach(b => {
        b.addEventListener('click', () => window.api.playSong(b.dataset.id));
    });
}

searchInput.addEventListener('input', renderQueue);

// Manual Add
document.getElementById('btn-add-song').addEventListener('click', () => {
    const title = document.getElementById('input-song').value.trim();
    const requester = document.getElementById('input-requester').value.replace('@', '').trim();
    const fastTrack = document.getElementById('input-fasttrack').checked;
    
    if (!title) return Modal.alert('Error', 'Song title cannot be empty.');
    
    window.api.addSong(title, requester, fastTrack);
    
    document.getElementById('input-song').value = '';
    document.getElementById('input-requester').value = '';
    document.getElementById('input-fasttrack').checked = false;
});

// Controls
function triggerSkip() {
    if (state.queue.length === 0) return;
    addActivity('Song skipped manually');
    window.api.skipSong();
}
function triggerDone() {
    if (state.queue.length === 0) return;
    window.api.doneSong();
}

document.getElementById('btn-skip').addEventListener('click', triggerSkip);
document.getElementById('btn-done').addEventListener('click', triggerDone);
document.getElementById('ov-btn-skip').addEventListener('click', triggerSkip);
document.getElementById('ov-btn-done').addEventListener('click', triggerDone);

document.getElementById('ov-btn-open-queue').addEventListener('click', () => {
    document.querySelector('.nav-btn[data-target="dashboard"]').click();
});
document.getElementById('ov-btn-add-song').addEventListener('click', () => {
    document.querySelector('.nav-btn[data-target="dashboard"]').click();
    setTimeout(() => document.getElementById('input-song').focus(), 100);
});

document.getElementById('btn-clear-queue').addEventListener('click', () => {
    if (state.queue.length === 0) return;
    Modal.confirm('Clear Queue', 'Are you sure you want to remove all songs?', () => {
        addActivity('Queue cleared completely');
        window.api.clearQueue();
    });
});

// Init
document.querySelectorAll('.view, .queue-list-container, .queue-main, .sidebar-nav').forEach(el => new SmoothScroll(el));

initSettings();
initQueue();
initActivity();
updateConnectionUI('disconnected');

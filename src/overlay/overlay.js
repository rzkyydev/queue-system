let currentSettings = null;
let lastSongId = null; // Track to trigger animation

function init() {
    const eventSource = new EventSource('/events');
    
    eventSource.onmessage = (event) => {
        try {
            const data = JSON.parse(event.data);
            if (data.type === 'state-update') {
                currentSettings = data.settings;
                render(data.queueData);
            }
        } catch (err) {
            console.error('Failed to parse SSE data', err);
        }
    };
    
    eventSource.onerror = (err) => {
        console.error('SSE Error:', err);
    };
}

function render(data) {
    if (!currentSettings) return;

    const { queue, nowPlaying } = data;
    const ovSettings = currentSettings.overlay;
    
    const container = document.getElementById('overlay-container');
    const contentState = document.getElementById('content-state');
    const emptyState = document.getElementById('empty-state');
    const cassette = document.querySelector('.cassette-tape');

    // Update Animation Speed Variable
    const speedMap = {
        'Slow': '4s',
        'Normal': '2s',
        'Fast': '1s'
    };
    const speed = speedMap[ovSettings.animationSpeed] || '2s';
    document.documentElement.style.setProperty('--spin-speed', speed);

    // Auto Hide Logic & Empty State
    let isOverlayHidden = false;
    if (queue.length === 0 && !nowPlaying) {
        if (ovSettings.hideOverlayWhenQueueIsEmpty) {
            container.classList.add('hidden');
            isOverlayHidden = true;
        } else {
            container.classList.remove('hidden');
            emptyState.classList.remove('hidden');
            contentState.classList.add('hidden');
        }
    } else {
        container.classList.remove('hidden');
        emptyState.classList.add('hidden');
        contentState.classList.remove('hidden');
    }

    // Now Playing Update
    const npContainer = document.getElementById('np-container');
    const npTitle = document.getElementById('np-title');
    const npReq = document.getElementById('np-req');
    const npBadge = document.getElementById('np-badge');

    if (ovSettings.showNowPlaying && nowPlaying) {
        npContainer.classList.remove('hidden');
        
        // Slide up animation trigger if song changed
        if (lastSongId !== nowPlaying.id) {
            npContainer.classList.remove('song-anim');
            void npContainer.offsetWidth; // trigger reflow
            npContainer.classList.add('song-anim');
            lastSongId = nowPlaying.id;
        }
        
        // Reset marquee state
        npTitle.classList.remove('marquee');
        npTitle.textContent = nowPlaying.songTitle;
        
        // Marquee Check
        requestAnimationFrame(() => {
            const wrapper = document.querySelector('.marquee-wrapper');
            if (wrapper && npTitle.scrollWidth > wrapper.clientWidth) {
                const text = nowPlaying.songTitle;
                // Create two identical spans separated by padding to allow seamless loop
                npTitle.innerHTML = `<span style="padding-right: 40px;">${text}</span><span>${text}</span>`;
                npTitle.classList.add('marquee');
                
                // Dynamically set animation duration based on total width (approx 60px/s)
                const duration = Math.max(5, npTitle.scrollWidth / 60);
                npTitle.style.setProperty('--marquee-duration', `${duration}s`);
            }
        });
        
        npReq.textContent = ovSettings.showRequester ? nowPlaying.requester : '';
        
        if (nowPlaying.fastTrack && ovSettings.showFastTrackBadge) {
            npBadge.classList.remove('hidden');
        } else {
            npBadge.classList.add('hidden');
        }
    } else {
        if (!ovSettings.showNowPlaying) {
            npContainer.classList.add('hidden');
        } else {
            npContainer.classList.remove('hidden');
            npTitle.textContent = 'Nothing playing';
            npReq.textContent = '-';
            npBadge.classList.add('hidden');
            npTitle.classList.remove('marquee');
        }
    }
    
    // Animation Toggle
    if (!ovSettings.rotateCassette || isOverlayHidden || (!nowPlaying && ovSettings.showNowPlaying)) {
        cassette.classList.add('stopped');
        document.querySelector('#empty-state .cassette-tape').classList.add('stopped');
    } else {
        cassette.classList.remove('stopped');
        document.querySelector('#empty-state .cassette-tape').classList.remove('stopped');
    }

    // Queue Slots Update
    const qContainer = document.getElementById('q-container');
    const qList = document.querySelector('.q-list');
    
    if (ovSettings.showQueue && queue.length > 0) {
        qContainer.classList.remove('hidden');
        qList.innerHTML = ''; // Clear previous items
        
        const maxSlots = 4;
        const displayCount = Math.min(maxSlots, ovSettings.queueDisplayCount || maxSlots);
        
        for (let i = 0; i < displayCount; i++) {
            if (queue[i]) {
                const item = queue[i];
                const slot = document.createElement('div');
                slot.className = 'q-slot';
                
                let html = `<div class="q-num">${i + (nowPlaying ? 2 : 1)}.</div>
                            <div class="q-title">${item.songTitle}</div>`;
                            
                if (ovSettings.showRequester) {
                    html += `<div class="q-req">${item.requester}</div>`;
                }
                
                if (item.fastTrack && ovSettings.showFastTrackBadge) {
                    html += `<div class="badge badge-fast">Fast</div>`;
                }
                
                slot.innerHTML = html;
                qList.appendChild(slot);
            }
        }
        
        // More Indicator
        const qMore = document.getElementById('q-more');
        if (queue.length > maxSlots) {
            qMore.textContent = `+${queue.length - maxSlots} more...`;
            qMore.classList.remove('hidden');
        } else {
            qMore.classList.add('hidden');
        }
        
    } else {
        qContainer.classList.add('hidden');
    }
}

init();

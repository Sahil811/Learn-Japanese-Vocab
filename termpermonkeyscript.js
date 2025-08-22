// ==UserScript==
// @name        Immersion Kit Example Fetcher for Anki - Mobile Responsive with Random Words
// @namespace   Violentmonkey Scripts
// @match       https://ankiuser.net/study*
// @grant       GM_xmlhttpRequest
// @version     10.0
// @description Fetches Japanese example sentences from Immersion Kit with images and audio. Mobile-responsive with touch support.
// ==/UserScript==

(function() {
'use strict';

// =================================================================================
// CONFIGURATION
// =================================================================================

const RANDOM_WORDS = [
  "鼻が高い",
  "鼻にかける",
  "鼻につく",
  "齎す"
];

// =================================================================================
// UTILITY FUNCTIONS
// =================================================================================

function debounce(func, delay) {
    let timeoutId;
    return function(...args) {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => func.apply(this, args), delay);
    };
}

function isMobile() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth <= 768;
}

function getRandomWord() {
    if (RANDOM_WORDS.length === 0) return null;
    const randomIndex = Math.floor(Math.random() * RANDOM_WORDS.length);
    return RANDOM_WORDS[randomIndex];
}

function setTextContent(element, text) {
    if (!element || text === null || text === undefined) return;
    const textStr = String(text);
    element.textContent = textStr;
    // Add a class to tell other parsers (like Yomitan) to ignore this content.
    if (textStr) {
        element.classList.add('no-parse');
    } else {
        element.classList.remove('no-parse');
    }
}

// =================================================================================
// DRAG HANDLER (For moving the UI window)
// =================================================================================

class TouchDragHandler {
    constructor(container, handle) {
        this.container = container; this.handle = handle; this.isDragging = false; this.startX = 0; this.startY = 0;
        this.initialLeft = 0; this.initialTop = 0; this.hasBeenMoved = false; this.enabled = true; this.isMobile = isMobile(); this.init();
    }
    init() {
        this.handle.style.cursor = this.isMobile ? 'default' : 'grab';
        if (!this.isMobile) {
            const dragIcon = document.createElement('span'); dragIcon.innerHTML = '⋮⋮';
            dragIcon.style.cssText = 'color: #64748b; font-size: 14px; margin-right: 8px; user-select: none; opacity: 0.7; transition: opacity 0.2s ease; flex-shrink: 0;';
            this.handle.prepend(dragIcon);
        }
        this.bindEvents();
    }
    bindEvents() {
        this.handle.addEventListener('mousedown', this.onStart.bind(this)); document.addEventListener('mouseup', this.onEnd.bind(this));
        this.handle.addEventListener('touchstart', this.onStart.bind(this), { passive: false }); document.addEventListener('touchend', this.onEnd.bind(this));
    }
    onStart(e) {
        if (!this.enabled || e.target.closest('button')) return;
        const isTouch = e.type === 'touchstart';
        if (!isTouch && e.button !== 0) return;
        e.preventDefault();
        this.isDragging = true;
        const clientX = isTouch ? e.touches[0].clientX : e.clientX; const clientY = isTouch ? e.touches[0].clientY : e.clientY;
        this.startX = clientX; this.startY = clientY;
        const rect = this.container.getBoundingClientRect();
        this.initialLeft = rect.left; this.initialTop = rect.top;
        this.container.classList.add('is-dragging'); this.handle.style.cursor = this.isMobile ? 'default' : 'grabbing'; document.body.classList.add('immersion-kit-dragging');
        if (isTouch) document.addEventListener('touchmove', this.onMove.bind(this), { passive: false });
        else document.addEventListener('mousemove', this.onMove.bind(this));
    }
    onMove(e) {
        if (!this.isDragging) return; e.preventDefault();
        const isTouch = e.type === 'touchmove';
        const clientX = isTouch ? e.touches[0].clientX : e.clientX; const clientY = isTouch ? e.touches[0].clientY : e.clientY;
        const deltaX = clientX - this.startX; const deltaY = clientY - this.startY;
        if (!this.hasBeenMoved) {
            this.container.style.left = `${this.initialLeft}px`; this.container.style.top = `${this.initialTop}px`;
            this.container.style.right = 'auto'; this.container.style.bottom = 'auto'; this.hasBeenMoved = true;
        }
        this.container.style.transform = `translate(${deltaX}px, ${deltaY}px)`;
    }
    onEnd(e) {
        if (!this.isDragging) return;
        this.isDragging = false;
        document.removeEventListener('touchmove', this.onMove.bind(this)); document.removeEventListener('mousemove', this.onMove.bind(this));
        const currentRect = this.container.getBoundingClientRect();
        this.container.style.transform = ''; this.container.style.left = `${currentRect.left}px`; this.container.style.top = `${currentRect.top}px`;
        this.container.classList.remove('is-dragging'); this.handle.style.cursor = this.isMobile ? 'default' : 'grab'; document.body.classList.remove('immersion-kit-dragging');
        this.snapToEdges();
    }
    snapToEdges() {
        const rect = this.container.getBoundingClientRect(); const snapThreshold = this.isMobile ? 20 : 30; const edgePadding = this.isMobile ? 4 : 8;
        let newLeft = rect.left, newTop = rect.top;
        if (rect.left < snapThreshold && rect.left > 0) newLeft = edgePadding;
        else if (window.innerWidth - rect.right < snapThreshold) newLeft = window.innerWidth - rect.width - edgePadding;
        if (rect.top < snapThreshold && rect.top > 0) newTop = edgePadding;
        else if (window.innerHeight - rect.bottom < snapThreshold) newTop = window.innerHeight - rect.height - edgePadding;
        if (newLeft !== rect.left || newTop !== rect.top) {
            this.container.style.transition = 'left 0.2s ease-out, top 0.2s ease-out';
            this.container.style.left = `${newLeft}px`; this.container.style.top = `${newTop}px`;
            setTimeout(() => { if (this.container) this.container.style.transition = ''; }, 200);
        }
    }
    resetPosition() {
        this.hasBeenMoved = false;
        this.container.style.transition = 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
        this.container.style.left = ''; this.container.style.top = ''; this.container.style.right = ''; this.container.style.bottom = ''; this.container.style.transform = '';
        setTimeout(() => { if (this.container) this.container.style.transition = ''; }, 300);
    }
}

// =================================================================================
// MAIN IMMERSION KIT HANDLER CLASS
// =================================================================================

class ImmersionKitHandler {
    constructor() {
        this.examples = []; this.currentIndex = 0; this.lastKeyword = null; this.isPlayingAll = false; this.isLoopingAudio = false;
        this.isLargeSize = false; this.isFullScreen = false; this.showNavControls = true; this.container = null; this.dragHandler = null;
        this.elements = {}; this.isMobile = isMobile(); this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        this.currentAudioSource = null; this.lastPlayId = 0; this.currentImageBlobUrl = null;
        this.deckTitleMap = null;
    }

    _getInitialHTML() {
        const mobileClass = this.isMobile ? 'mobile' : '';
        return `
        <div class="immersion-header ${mobileClass}" style="display: flex; justify-content: space-between; align-items: center; padding: ${this.isMobile ? '10px 12px' : '8px 12px'}; background-color: #1e293b; border-bottom: 1px solid #334155; border-radius: 8px 8px 0 0;">
            <span class="immersion-title" style="color: #e2e8f0; font-weight: 600; font-size: ${this.isMobile ? '1.2em' : '1.4em'}; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; flex-grow: 1; margin-right: 8px;">Immersion Kit</span>
            <div style="display: flex; gap: ${this.isMobile ? '8px' : '6px'}; align-items: center; flex-shrink: 0;">
                <button data-action="random-word" class="ik-btn-random" title="Random Word (Ctrl/Cmd + R)">🎲</button>
                <button data-action="reset-pos" class="ik-btn-reset" title="Reset position">📍</button>
                <button data-action="toggle-fullscreen" class="ik-btn" title="Enter Full Screen">↗️</button>
                <button data-action="toggle-size" class="ik-btn" title="Switch to large view">📏</button>
            </div>
        </div>
        <div class="immersion-content-wrapper" style="position: relative; border-radius: 0 0 8px 8px; background-color: #1e293b; overflow: hidden;">
            <div class="immersion-state-overlay" style="display: flex; justify-content: center; align-items: center; padding: ${this.isMobile ? '30px 15px' : '40px 20px'}; text-align: center;">
                <p class="immersion-state-message" style="color: #94a3b8; font-size: ${this.isMobile ? '1em' : '1.1em'};"></p>
            </div>
            <div class="immersion-example-content" style="display: none;">
                <div class="image-container" style="position: relative; margin-bottom: 12px; text-align: center;">
                    <img data-action="play-audio" class="example-image" alt="Example" style="max-width: 100%; cursor: pointer; border-radius: 6px; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2); transition: transform 0.2s ease;">
                    <button data-action="play-audio" class="ik-btn-overlay" title="Play Audio (Spacebar)">🔊</button>
                </div>
                <p class="example-sentence"></p>
                <p class="example-translation"></p>
            </div>
        </div>
        <div class="immersion-nav-wrapper">
            <div class="regular-nav" style="display: none; justify-content: space-between; align-items: center; padding: ${this.isMobile ? '15px 12px' : '12px'}; border-top: 1px solid #334155;">
                <span class="example-counter" style="color: #94a3b8; font-weight: 500; font-size: ${this.isMobile ? '0.9em' : '1em'};"></span>
                <div style="display: flex; gap: ${this.isMobile ? '10px' : '6px'}; align-items: center;">
                    <button data-action="prev-example" class="ik-btn" title="Previous (←)">←</button>
                    <button data-action="next-example" class="ik-btn" title="Next (→)">→</button>
                    <button data-action="toggle-loop" class="ik-btn" title="Loop current audio">🔁</button>
                    <button data-action="play-all" class="ik-btn" title="Play all examples">▶️</button>
                </div>
            </div>
        </div>`;
    }

    _cacheElements() {
        const selectors = { title: '.immersion-title', contentWrapper: '.immersion-content-wrapper', stateOverlay: '.immersion-state-overlay', stateMessage: '.immersion-state-message', exampleContent: '.immersion-example-content', image: '.example-image', sentence: '.example-sentence', translation: '.example-translation', navWrapper: '.immersion-nav-wrapper', regularNav: '.regular-nav', counter: '.example-counter', playAllBtn: '[data-action="play-all"]', loopBtn: '[data-action="toggle-loop"]', toggleSizeBtn: '[data-action="toggle-size"]', fullscreenBtn: '[data-action="toggle-fullscreen"]', randomWordBtn: '[data-action="random-word"]' };
        for (const key in selectors) { this.elements[key] = this.container.querySelector(selectors[key]); }
    }

    createContainer() {
        if (this.container) return;
        this.container = document.createElement('div');
        this.container.id = 'anki-immersion-container';
        this.container.innerHTML = this._getInitialHTML();
        this.container.classList.add('no-parse'); // For Yomitan etc.
        document.body.appendChild(this.container);
        this._cacheElements();
        this._addEventListeners();
        this.dragHandler = new TouchDragHandler(this.container, this.container.querySelector('.immersion-header'));
        this._updateContainerStateClasses();
    }

    _addEventListeners() {
        this.container.addEventListener('click', (e) => {
            const actionTarget = e.target.closest('[data-action]');
            if (!actionTarget) return;
            const action = actionTarget.dataset.action;
            const actionMap = {
                'toggle-size': () => this.toggleSize(),
                'toggle-fullscreen': () => this.toggleFullScreen(),
                'reset-pos': () => this.dragHandler.resetPosition(),
                'play-audio': () => this.playCurrentAudio(),
                'prev-example': () => this.navigate(-1),
                'next-example': () => this.navigate(1),
                'toggle-loop': () => this.toggleLoop(),
                'play-all': () => this.handlePlayAll(),
                'random-word': () => this.fetchRandomWord(),
            };
            if (actionMap[action]) actionMap[action]();
        });

        if (this.isMobile) {
            let startX = 0, startY = 0;
            this.container.addEventListener('touchstart', (e) => { if (e.target.closest('.immersion-header, button')) return; startX = e.touches[0].clientX; startY = e.touches[0].clientY; }, { passive: true });
            this.container.addEventListener('touchend', (e) => {
                if (e.target.closest('.immersion-header, button')) return;
                const deltaX = e.changedTouches[0].clientX - startX;
                const deltaY = e.changedTouches[0].clientY - startY;
                if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 50) {
                    if (deltaX > 0) this.navigate(-1); else this.navigate(1);
                }
            }, { passive: true });
        }

        if (!this.isMobile) {
            document.addEventListener('keydown', (e) => {
                if (!this.container?.parentNode || document.activeElement.tagName.match(/INPUT|TEXTAREA|DIV/i)) return;
                const keyActions = {
                    'ArrowLeft': () => this.showNavControls && this.elements.regularNav.style.display !== 'none' && this.navigate(-1),
                    'ArrowRight': () => this.showNavControls && this.elements.regularNav.style.display !== 'none' && this.navigate(1),
                    ' ': () => e.target === document.body && this.playCurrentAudio(),
                };
                if (keyActions[e.key]) { e.preventDefault(); keyActions[e.key](); }
                if ((e.key.toLowerCase() === 'r') && (e.ctrlKey || e.metaKey)) { e.preventDefault(); this.fetchRandomWord(); }
            });
        }
    }

    _setLoadingState(isLoading, message = '') {
        this.elements.stateMessage.textContent = message;
        this.elements.stateOverlay.style.display = isLoading ? 'flex' : 'none';
        this.elements.exampleContent.style.display = isLoading ? 'none' : 'flex';
        if (message && !isLoading) {
            this.elements.exampleContent.style.display = 'none';
            this.elements.stateOverlay.style.display = 'flex';
        }
        this._updateNavVisibility();
    }

    _updateContent() {
        if (this.examples.length === 0) return;
        const example = this.examples[this.currentIndex];
        this._loadImage(example.full_image_url);
        setTextContent(this.elements.sentence, example.sentence || '');
        setTextContent(this.elements.translation, example.translation || '');
        this._updateCounter();
    }

    _updateCounter() { this.elements.counter.textContent = `${this.currentIndex + 1}/${this.examples.length}`; }
    _updateNavVisibility() { const hasExamples = this.examples.length > 0; this.elements.regularNav.style.display = (this.showNavControls && hasExamples) ? 'flex' : 'none'; this.elements.navWrapper.style.display = (this.elements.regularNav.style.display !== 'none') ? 'block' : 'none'; }
    _updateContainerStateClasses() {
        this.container.classList.toggle('is-large', this.isLargeSize && !this.isFullScreen);
        this.container.classList.toggle('is-fullscreen', this.isFullScreen);
        this.container.classList.toggle('is-mobile', this.isMobile);
        this.dragHandler.enabled = !this.isFullScreen;
        this.elements.toggleSizeBtn.textContent = this.isLargeSize ? '🔍' : '📏';
        this.elements.fullscreenBtn.textContent = this.isFullScreen ? '↙️' : '↗️';
    }

    toggleSize() { if (this.isFullScreen) this.isFullScreen = false; this.isLargeSize = !this.isLargeSize; this._updateContainerStateClasses(); }
    toggleFullScreen() { this.isFullScreen = !this.isFullScreen; if (this.isFullScreen) this.dragHandler.resetPosition(); this._updateContainerStateClasses(); }

    navigate(direction) {
        if (this.examples.length === 0) return;
        this.stopCurrentAudio(); this.toggleLoop(false);
        this.currentIndex = (this.currentIndex + direction + this.examples.length) % this.examples.length;
        this._updateContent();
        const example = this.examples[this.currentIndex];
        if (example?.full_sound_url) setTimeout(() => this.playAudio(example.full_sound_url), 100);
    }

    fetchRandomWord() {
        const randomWord = getRandomWord();
        if (!randomWord) { this.createContainer(); this._setLoadingState(true, 'Random word list is empty. Add words to the script.'); return; }
        this.elements.randomWordBtn.style.transform = 'scale(0.9)';
        setTimeout(() => { if (this.elements.randomWordBtn) this.elements.randomWordBtn.style.transform = ''; }, 150);
        this.fetchExamples(randomWord);
    }

    async _ensureMetadata() {
        if (this.deckTitleMap) return; // Already fetched or failed, don't retry in the same session
        console.log("Fetching Immersion Kit metadata...");
        try {
            const response = await new Promise((resolve, reject) => {
                GM_xmlhttpRequest({
                    method: "GET", url: "https://apiv2.immersionkit.com/index_meta",
                    onload: (res) => (res.status === 200) ? resolve(res) : reject(new Error(`Meta fetch failed: ${res.status}`)),
                    onerror: (err) => reject(new Error(`Meta fetch network error: ${err}`))
                });
            });
            this.deckTitleMap = JSON.parse(response.responseText).data;
            console.log("Metadata fetched successfully.");
        } catch (error) {
            console.error("Could not fetch Immersion Kit metadata:", error);
            this.deckTitleMap = {}; // Set to empty object to prevent refetching on failure
        }
    }

    async fetchExamples(word) {
        const originalWordForDisplay = word;
        const sanitizedWord = word.replace(/[^\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Han}\s]/gu, '');
        if (this.lastKeyword === sanitizedWord && this.examples.length > 0) { if (this.elements.title.textContent !== originalWordForDisplay) setTextContent(this.elements.title, originalWordForDisplay); return; }
        this.createContainer();
        this.lastKeyword = sanitizedWord;
        setTextContent(this.elements.title, originalWordForDisplay); this.elements.title.title = originalWordForDisplay;
        this.stopCurrentAudio(); this.toggleLoop(false);
        if (!sanitizedWord) { this.examples = []; this._setLoadingState(true, 'Invalid keyword (non-Japanese)'); return; }

        try {
            await this._ensureMetadata();
            this._setLoadingState(true, 'Loading examples...');
            const url = `https://apiv2.immersionkit.com/search?q=${encodeURIComponent(sanitizedWord)}&exactMatch=false&limit=50&sort=sentence_length:asc`;

            const response = await new Promise((resolve, reject) => {
                GM_xmlhttpRequest({
                    method: "GET", url: url,
                    onload: (res) => (res.status >= 200 && res.status < 400) ? resolve(res) : reject(new Error(`HTTP error! status: ${res.status}`)),
                    onerror: (res) => reject(new Error("Network error during request.")),
                    ontimeout: () => reject(new Error("Request timed out."))
                });
            });

            const data = JSON.parse(response.responseText);
            const rawExamples = data.examples || [];
            const linodeBaseUrl = 'https://us-southeast-1.linodeobjects.com/immersionkit/media/';
            this.examples = rawExamples.map(ex => {
                const slug = ex.title || '';
                const prettyTitle = this.deckTitleMap?.[slug]?.title || slug;
                const mediaType = ex.id ? ex.id.split('_')[0] : '';
                const fullImageUrl = ex.image && mediaType && prettyTitle ? `${linodeBaseUrl}${mediaType}/${prettyTitle}/media/${ex.image}` : '';
                const fullSoundUrl = ex.sound && mediaType && prettyTitle ? `${linodeBaseUrl}${mediaType}/${prettyTitle}/media/${ex.sound}` : '';
                return { ...ex, full_image_url: fullImageUrl, full_sound_url: fullSoundUrl };
            });

            if (this.examples.length > 0) {
                this.currentIndex = 0; this._setLoadingState(false); this._updateContent();
                const example = this.examples[this.currentIndex];
                if (example?.full_sound_url) setTimeout(() => this.playAudio(example.full_sound_url), 150);
            } else {
                this._setLoadingState(true, 'No examples found');
            }
        } catch (error) { console.error("Fetch error:", error); this._setLoadingState(true, `Failed to fetch: ${error.message}`); }
    }

    _loadImage(url) {
        if (this.currentImageBlobUrl) {
            URL.revokeObjectURL(this.currentImageBlobUrl);
            this.currentImageBlobUrl = null;
        }
        if (!url) { this.elements.image.src = ''; return; }
        GM_xmlhttpRequest({
            method: 'GET', url: url, responseType: 'blob',
            headers: { 'Referer': 'https://jpdb.io/', 'Origin': 'https://jpdb.io/' },
            onload: (response) => {
                if (response.status === 200) {
                    const objectURL = URL.createObjectURL(response.response);
                    this.currentImageBlobUrl = objectURL;
                    this.elements.image.src = objectURL;
                } else {
                    console.error(`Failed to load image: ${url}, status: ${response.status}`);
                    this.elements.image.src = '';
                }
            },
            onerror: (err) => { console.error(`GM_xmlhttpRequest failed for image ${url}:`, err); this.elements.image.src = ''; }
        });
    }

    playCurrentAudio() { this.toggleLoop(false); if (this.examples.length > 0) this.playAudio(this.examples[this.currentIndex].full_sound_url); }
    stopCurrentAudio() { if (this.currentAudioSource) { try { this.currentAudioSource.onended = null; this.currentAudioSource.stop(0); } catch (e) {} this.currentAudioSource = null; }}

    playAudio(url) {
        return new Promise((resolve, reject) => {
            if (!url) return resolve();
            const playId = ++this.lastPlayId;
            this.stopCurrentAudio();
            if (this.audioContext.state === 'suspended') this.audioContext.resume().catch(console.error);
            GM_xmlhttpRequest({
                method: 'GET', url: url, responseType: 'arraybuffer',
                headers: { 'Referer': 'https://jpdb.io/', 'Origin': 'https://jpdb.io/' },
                onload: (response) => {
                    if (playId !== this.lastPlayId) return resolve();
                    if (response.status !== 200) {
                         console.error(`Failed to load audio: ${url}, status: ${response.status}`);
                         return reject(new Error(`HTTP status ${response.status}`));
                    }
                    this.audioContext.decodeAudioData(response.response,
                        (buffer) => {
                            if (playId !== this.lastPlayId) return resolve();
                            const source = this.audioContext.createBufferSource();
                            source.buffer = buffer; source.connect(this.audioContext.destination); source.start(0);
                            source.onended = () => { if (this.currentAudioSource === source) this.currentAudioSource = null; resolve(); };
                            this.currentAudioSource = source;
                        },
                        (err) => { console.error(`decodeAudioData failed for URL: ${url}`, err); reject(err); }
                    );
                },
                onerror: (err) => { console.error(`GM_xmlhttpRequest failed for ${url}:`, err); reject(err); }
            });
        });
    }

    toggleLoop(forceState) {
        const newState = (forceState !== undefined) ? forceState : !this.isLoopingAudio;
        if (newState === this.isLoopingAudio) return;
        this.isLoopingAudio = newState;
        if (this.isLoopingAudio) { if (this.isPlayingAll) this.handlePlayAll(false); this.audioLoop(); }
        else { this.stopCurrentAudio(); }
        this.elements.loopBtn.classList.toggle('is-active', this.isLoopingAudio);
    }
    async audioLoop() {
        if (!this.isLoopingAudio || !this.container?.parentNode) { this.toggleLoop(false); return; }
        const example = this.examples.length > 0 ? this.examples[this.currentIndex] : null;
        if (example?.full_sound_url) {
            await this.playAudio(example.full_sound_url);
            if (this.isLoopingAudio) setTimeout(() => this.audioLoop(), 100);
        } else { this.toggleLoop(false); }
    }
    handlePlayAll(forceState) {
        this.isPlayingAll = (forceState !== undefined) ? forceState : !this.isPlayingAll;
        if (this.isPlayingAll) { this.toggleLoop(false); this.playAllSequence(); }
        else { this.stopCurrentAudio(); }
        this.elements.playAllBtn.textContent = this.isPlayingAll ? '⏹️' : '▶️';
    }
    async playAllSequence() {
        if (this.examples.length === 0) { this.handlePlayAll(false); return; }
        let playedCount = 0;
        while (this.isPlayingAll && playedCount < this.examples.length && this.container?.parentNode) {
            this._updateContent();
            const example = this.examples[this.currentIndex];
            if (example?.full_sound_url) {
                await this.playAudio(example.full_sound_url);
                if (!this.isPlayingAll) break;
                await new Promise(res => setTimeout(res, 300));
            }
            if (!this.isPlayingAll) break;
            this.currentIndex = (this.currentIndex + 1) % this.examples.length;
            playedCount++;
        }
        this.handlePlayAll(false);
    }
}

// =================================================================================
// SCRIPT INITIALIZATION
// =================================================================================

function getEmbedKeyword() {
    const selectors = ['.keyword-field', '[data-keyword]', '#keyword', '.expression', '.vocab-term', '.jp', '.japanese_word'];
    for (const selector of selectors) {
        const element = document.querySelector(selector);
        if (element) { let keyword = element.dataset.keyword || element.textContent || element.innerText; if (keyword) return keyword.trim().split(/[\s（(]/)[0]; }
    }
    const embed = document.querySelector('embed[src*="keyword="]');
    if (embed?.src) { try { const url = new URL(embed.src); return url.searchParams.get('keyword')?.trim() || null; } catch (e) {} }
    return null;
}

const immersionHandler = new ImmersionKitHandler();

function setupObservers() {
    let lastProcessedKeyword = null;
    const updateHandler = debounce(() => {
        const currentKeyword = getEmbedKeyword();
        if (currentKeyword && currentKeyword !== lastProcessedKeyword) {
            lastProcessedKeyword = currentKeyword;
            immersionHandler.fetchExamples(currentKeyword);
        } else if (!currentKeyword && lastProcessedKeyword !== null) {
            lastProcessedKeyword = null;
            if (immersionHandler.container?.parentNode) {
                immersionHandler.examples = []; immersionHandler.stopCurrentAudio(); immersionHandler.toggleLoop(false);
                immersionHandler._setLoadingState(true, "No keyword found on current card.");
                immersionHandler.elements.title.textContent = "Immersion Kit";
            }
        }
    }, 200);
    updateHandler();
    const observer = new MutationObserver(updateHandler);
    observer.observe(document.getElementById('qa') || document.body, { childList: true, subtree: true });
}

function injectStyles() {
    const style = document.createElement('style');
    style.textContent = `
        @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;500;700&display=swap');
        .no-parse { -yomitan-no-parse: true; }
        #anki-immersion-container { position: fixed; bottom: 100px; right: 20px; width: 450px; max-width: 85vw; max-height: 600px; z-index: 10000; background-color: #0f172a; border: 1px solid #334155; border-radius: 9px; box-shadow: 0 8px 25px rgba(0, 0, 0, 0.3); backdrop-filter: blur(10px); display: flex; flex-direction: column; overflow: hidden; }
        @media (max-width: 768px) { #anki-immersion-container { width: 95vw; max-width: 95vw; bottom: 10px; right: 2.5vw; left: 2.5vw; max-height: 70vh; } #anki-immersion-container.is-large { width: 98vw; max-width: 98vw; right: 1vw; left: 1vw; bottom: 5px; max-height: 85vh; } #anki-immersion-container.is-fullscreen { width: 100vw; height: 100vh; max-height: 100vh; top: 0; left: 0; right: 0; bottom: 0; transform: none; border-radius: 0; } }
        .immersion-content-wrapper { flex-grow: 1; overflow-y: auto; }
        .immersion-example-content { display: none; flex-direction: column; padding: 12px; }
        #anki-immersion-container.is-large { width: 800px; max-width: 90vw; max-height: 85vh; bottom: 20px; right: 20px; }
        #anki-immersion-container.is-fullscreen { width: 95vw; height: 95vh; max-height: 95vh; top: 50%; left: 50%; right: auto; bottom: auto; transform: translate(-50%, -50%); }
        .immersion-kit-dragging, .immersion-kit-dragging * { user-select: none !important; }
        #anki-immersion-container.is-dragging { transition: none !important; transform: scale(1.02); box-shadow: 0 12px 35px rgba(0, 0, 0, 0.4); z-index: 10001; }
        .example-sentence, .example-translation { text-rendering: optimizeLegibility; -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale; }
        .example-sentence { font-size: 1.4em; line-height: 1.35; margin: 0 0 10px; word-wrap: break-word; text-align: center; color: #e2e8f0; font-family: 'Noto Sans JP', sans-serif; }
        .example-translation { color: #94a3b8; font-size: 0.95em; line-height: 1.35; margin: 0 0 10px; text-align: center; font-style: italic; }
        .example-image { max-height: 200px; }
        @media (max-width: 768px) { .example-sentence { font-size: 1.2em; line-height: 1.4; margin-bottom: 12px; } .example-translation { font-size: 0.9em; margin-bottom: 12px; } .example-image { max-height: 150px; } }
        .is-large .example-sentence { font-size: 1.8em; } .is-large .example-translation { font-size: 1.15em; } .is-large .example-image { max-height: 400px; }
        @media (max-width: 768px) { .is-large .example-sentence { font-size: 1.5em; } .is-large .example-translation { font-size: 1em; } .is-large .example-image { max-height: 250px; } }
        .is-fullscreen .example-sentence { font-size: 2.5em; } .is-fullscreen .example-translation { font-size: 1.5em; } .is-fullscreen .example-image { max-height: 50vh; }
        @media (max-width: 768px) { .is-fullscreen .example-sentence { font-size: 1.8em; } .is-fullscreen .example-translation { font-size: 1.1em; } .is-fullscreen .example-image { max-height: 40vh; } }
        .ik-btn, .ik-btn-reset, .ik-btn-random { background-color: #334155; color: #e2e8f0; border: none; padding: 6px 10px; border-radius: 4px; cursor: pointer; font-size: 0.9em; transition: all 0.2s ease; min-width: 32px; min-height: 32px; display: flex; align-items: center; justify-content: center; }
        .ik-btn-random { background-color: #7c3aed; } .ik-btn-random:hover { background-color: #8b5cf6; } .ik-btn-random:active { transform: scale(0.95); }
        @media (max-width: 768px) { .ik-btn, .ik-btn-reset, .ik-btn-random { padding: 8px 12px; font-size: 1em; min-width: 40px; min-height: 40px; } }
        .ik-btn:hover { background-color: #475569; } .ik-btn-reset { background-color: #374151; opacity: 0.8; } .ik-btn-reset:hover { background-color: #4b5563; opacity: 1; }
        .ik-btn-overlay { position: absolute; bottom: 8px; right: 8px; background-color: rgba(51, 65, 85, 0.9); backdrop-filter: blur(5px); color: #e2e8f0; border: none; padding: 8px 12px; border-radius: 4px; cursor: pointer; transition: all 0.2s ease; min-width: 36px; min-height: 36px; display: flex; align-items: center; justify-content: center; }
        @media (max-width: 768px) { .ik-btn-overlay { padding: 10px 14px; min-width: 44px; min-height: 44px; bottom: 10px; right: 10px; } }
        .ik-btn-overlay:hover { background-color: rgba(71, 85, 105, 0.95); } .ik-btn.is-active { background-color: #16a34a; } .ik-btn.is-active:hover { background-color: #15803d; }
    `;
    document.head.appendChild(style);
}

function onReady(fn) { (document.readyState === 'complete' || document.readyState === 'interactive') ? setTimeout(fn, 1) : document.addEventListener('DOMContentLoaded', fn); }
window.addEventListener('resize', debounce(() => { if (immersionHandler.container) { immersionHandler.isMobile = isMobile(); immersionHandler._updateContainerStateClasses(); if (immersionHandler.isMobile && immersionHandler.dragHandler) immersionHandler.dragHandler.resetPosition(); } }, 250));

onReady(() => {
    injectStyles();
    setupObservers();
});

})();
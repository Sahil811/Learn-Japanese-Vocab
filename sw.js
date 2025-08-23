// Japanese Dojo Service Worker
const CACHE_NAME = 'japanese-dojo-v1.2';
const STATIC_CACHE = 'static-v1.2';
const API_CACHE = 'api-v1.2';

// Resources to cache immediately
const STATIC_RESOURCES = [
    '/',
    '/index.html',
    '/api/words',
    '/api/kanji'
];

// Install event - cache static resources
self.addEventListener('install', event => {
    console.log('📦 Service Worker installing...');
    event.waitUntil(
        Promise.all([
            caches.open(STATIC_CACHE).then(cache => {
                console.log('📦 Caching static resources');
                return cache.addAll(STATIC_RESOURCES);
            }),
            caches.open(API_CACHE)
        ]).then(() => {
            console.log('✅ Service Worker installed successfully');
            self.skipWaiting();
        })
    );
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
    console.log('🔄 Service Worker activating...');
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheName !== STATIC_CACHE && cacheName !== API_CACHE) {
                        console.log('🗑️ Deleting old cache:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => {
            console.log('✅ Service Worker activated');
            return self.clients.claim();
        })
    );
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', event => {
    const url = new URL(event.request.url);
    
    // Handle API requests with cache-first strategy for data endpoints
    if (url.pathname.startsWith('/api/')) {
        event.respondWith(cacheFirstStrategy(event.request, API_CACHE));
        return;
    }
    
    // Handle static resources with cache-first strategy
    if (event.request.method === 'GET') {
        event.respondWith(cacheFirstStrategy(event.request, STATIC_CACHE));
        return;
    }
    
    // Let other requests go through normally
    event.respondWith(fetch(event.request));
});

// Cache-first strategy with network fallback
async function cacheFirstStrategy(request, cacheName) {
    try {
        const cache = await caches.open(cacheName);
        const cachedResponse = await cache.match(request);
        
        if (cachedResponse) {
            // Return cached version immediately
            updateCacheInBackground(request, cache);
            return cachedResponse;
        }
        
        // Not in cache, fetch from network
        const networkResponse = await fetch(request);
        
        // Cache successful responses
        if (networkResponse.ok) {
            cache.put(request, networkResponse.clone());
        }
        
        return networkResponse;
    } catch (error) {
        console.error('Cache strategy failed:', error);
        
        // Try to return a cached version if network fails
        const cache = await caches.open(cacheName);
        const cachedResponse = await cache.match(request);
        if (cachedResponse) {
            return cachedResponse;
        }
        
        // Return error response
        return new Response('Network error', { status: 503 });
    }
}

// Update cache in background without blocking the response
async function updateCacheInBackground(request, cache) {
    try {
        const networkResponse = await fetch(request);
        if (networkResponse.ok) {
            cache.put(request, networkResponse.clone());
        }
    } catch (error) {
        // Silently fail background updates
        console.warn('Background cache update failed:', error);
    }
}

// Handle messages from the main thread
self.addEventListener('message', event => {
    if (event.data && event.data.type === 'CACHE_CLEAR') {
        clearCache(event.data.pattern);
    }
});

// Clear specific cache patterns
async function clearCache(pattern) {
    const cacheNames = await caches.keys();
    for (const cacheName of cacheNames) {
        if (pattern && !cacheName.includes(pattern)) continue;
        await caches.delete(cacheName);
    }
}
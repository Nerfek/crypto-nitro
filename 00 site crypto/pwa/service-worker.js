// ===== CRYPTOTRADERS PRO - SERVICE WORKER =====

const CACHE_NAME = 'cryptotraders-v1.0.0';
const OFFLINE_URL = '/offline.html';

// Fichiers à mettre en cache pour fonctionnement offline
const CACHE_FILES = [
  '/',
  '/index.html',
  '/dashboard/dashboard.html',
  '/dashboard/css/dashboard-main.css',
  '/dashboard/css/dashboard-nav.css',
  '/dashboard/css/overview.css',
  '/dashboard/css/trading.css',
  '/dashboard/js/dashboard-main.js',
  '/dashboard/js/personal-sheets.js',
  '/tradingview/trading-system.js',
  '/tradingview/crypto-loader.js',
  '/tradingview/trading-style.css',
  '/firebase/config.js',
  '/firebase/auth.js',
  '/firebase/session-protection.js',
  '/pwa/icons/icon-192.png',
  '/pwa/icons/icon-512.png',
  '/pwa/manifest.json',
  OFFLINE_URL
];

// URLs à ne PAS mettre en cache (APIs externes)
const SKIP_CACHE = [
  'api.binance.com',
  'api.coingecko.com',
  'firebase',
  'googleapis.com',
  'docs.google.com',
  'tradingview.com',
  'api.ipify.org'
];

// ===== INSTALLATION =====
self.addEventListener('install', (event) => {
  console.log('🔧 PWA: Installation du Service Worker');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('📦 PWA: Mise en cache des fichiers essentiels');
        return cache.addAll(CACHE_FILES);
      })
      .then(() => {
        console.log('✅ PWA: Installation terminée');
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('❌ PWA: Erreur installation:', error);
      })
  );
});

// ===== ACTIVATION =====
self.addEventListener('activate', (event) => {
  console.log('🚀 PWA: Activation du Service Worker');
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME) {
              console.log('🗑️ PWA: Suppression ancien cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('✅ PWA: Activation terminée');
        return self.clients.claim();
      })
  );
});

// ===== INTERCEPTION DES REQUÊTES =====
self.addEventListener('fetch', (event) => {
  const requestUrl = new URL(event.request.url);
  
  // Ignorer les requêtes non-GET
  if (event.request.method !== 'GET') {
    return;
  }
  
  // Ignorer les APIs externes
  if (SKIP_CACHE.some(domain => requestUrl.hostname.includes(domain))) {
    return;
  }
  
  // Stratégie: Network First pour les pages HTML, Cache First pour les assets
  if (event.request.destination === 'document') {
    event.respondWith(networkFirstStrategy(event.request));
  } else {
    event.respondWith(cacheFirstStrategy(event.request));
  }
});

// ===== STRATÉGIES DE CACHE =====

// Network First (pour HTML) - Réseau en priorité, cache en fallback
async function networkFirstStrategy(request) {
  try {
    // Essayer le réseau en premier
    const networkResponse = await fetch(request);
    
    // Si succès, mettre en cache et retourner
    if (networkResponse.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, networkResponse.clone());
      return networkResponse;
    }
    
    throw new Error('Network response not ok');
    
  } catch (error) {
    // Si réseau échoue, utiliser le cache
    console.log('🌐 PWA: Réseau indisponible, utilisation du cache pour:', request.url);
    
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Si pas en cache, retourner page offline
    if (request.destination === 'document') {
      return caches.match(OFFLINE_URL);
    }
    
    throw error;
  }
}

// Cache First (pour assets) - Cache en priorité, réseau en fallback
async function cacheFirstStrategy(request) {
  try {
    // Chercher en cache d'abord
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Si pas en cache, aller sur le réseau
    const networkResponse = await fetch(request);
    
    // Mettre en cache pour la prochaine fois
    if (networkResponse.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
    
  } catch (error) {
    console.error('❌ PWA: Erreur cache/réseau pour:', request.url);
    throw error;
  }
}

// ===== NOTIFICATIONS PUSH =====
self.addEventListener('push', (event) => {
  console.log('📨 PWA: Notification push reçue');
  
  const options = {
    body: event.data ? event.data.text() : 'Nouvelle notification CryptoTraders',
    icon: '/pwa/icons/icon-192.png',
    badge: '/pwa/icons/icon-192.png',
    vibrate: [200, 100, 200],
    data: {
      url: '/dashboard/dashboard.html'
    },
    actions: [
      {
        action: 'open',
        title: 'Ouvrir',
        icon: '/pwa/icons/icon-192.png'
      },
      {
        action: 'close',
        title: 'Fermer'
      }
    ]
  };
  
  event.waitUntil(
    self.registration.showNotification('CryptoTraders Pro', options)
  );
});

// ===== CLIC SUR NOTIFICATION =====
self.addEventListener('notificationclick', (event) => {
  console.log('🖱️ PWA: Clic sur notification');
  
  event.notification.close();
  
  if (event.action === 'open' || !event.action) {
    event.waitUntil(
      clients.openWindow(event.notification.data.url || '/dashboard/dashboard.html')
    );
  }
});

// ===== MESSAGES =====
self.addEventListener('message', (event) => {
  console.log('💬 PWA: Message reçu:', event.data);
  
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

console.log('✅ PWA: Service Worker CryptoTraders Pro chargé');
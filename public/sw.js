const CACHE_NAME = 'treino-na-mao-v1';
const STATIC_CACHE_NAME = 'treino-static-v1';
const DYNAMIC_CACHE_NAME = 'treino-dynamic-v1';

// Recursos estáticos que sempre devem ser cacheados
const STATIC_ASSETS = [
  '/',
  '/login',
  '/register',
  '/dashboard',
  '/offline.html',
  '/manifest.json',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
  '/apple-touch-icon.png',
  '/icons/ios/apple-touch-icon-57x57.png',
  '/icons/ios/apple-touch-icon-60x60.png',
  '/icons/ios/apple-touch-icon-72x72.png',
  '/icons/ios/apple-touch-icon-76x76.png',
  '/icons/ios/apple-touch-icon-114x114.png',
  '/icons/ios/apple-touch-icon-120x120.png',
  '/icons/ios/apple-touch-icon-144x144.png',
  '/icons/ios/apple-touch-icon-152x152.png',
  '/icons/ios/apple-touch-icon-167x167.png',
  '/icons/ios/apple-touch-icon-180x180.png',
  '/icons/ios/splash/splash-750x1334.png',
  '/icons/ios/splash/splash-828x1792.png',
  '/icons/ios/splash/splash-1125x2436.png',
  '/icons/ios/splash/splash-1170x2532.png',
  '/icons/ios/splash/splash-1284x2778.png',
  '/icons/ios/splash/splash-1536x2048.png',
  '/icons/ios/splash/splash-1668x2388.png',
  '/icons/ios/splash/splash-2048x2732.png',
  '/sounds/rest-complete.mp3',
  '/sounds/set-complete.mp3',
  '/sounds/exercise-complete.mp3'
];

// Limite para o cache dinâmico
const DYNAMIC_CACHE_LIMIT = 50;

// Função para limitar o tamanho do cache
async function limitCacheSize(cacheName, maxItems) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  if (keys.length > maxItems) {
    // Remove o item mais antigo até chegar ao limite
    await cache.delete(keys[0]);
    limitCacheSize(cacheName, maxItems);
  }
}

// Instala o service worker
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE_NAME)
      .then((cache) => {
        console.log('Cacheando recursos estáticos');
        return cache.addAll(STATIC_ASSETS);
      })
  );
});

// Ativa o service worker e limpa caches antigos
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys
          .filter(key => key !== STATIC_CACHE_NAME && key !== DYNAMIC_CACHE_NAME)
          .map(key => caches.delete(key))
      );
    })
  );
});

// Estratégia de cache: Cache primeiro, depois rede para API
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  
  // Estratégia diferente para requisições de API
  if (url.pathname.includes('/api/') || url.hostname.includes('supabase.co')) {
    // Network first para API
    event.respondWith(
      fetch(event.request)
        .then(response => {
          // Clona a resposta para armazenar no cache
          const responseClone = response.clone();
          caches.open(DYNAMIC_CACHE_NAME)
            .then(cache => {
              // Armazena somente requisições GET
              if (event.request.method === 'GET') {
                cache.put(event.request, responseClone);
                limitCacheSize(DYNAMIC_CACHE_NAME, DYNAMIC_CACHE_LIMIT);
              }
            });
          return response;
        })
        .catch(() => {
          // Se falhar, tenta buscar do cache
          return caches.match(event.request)
            .then(cachedResponse => {
              if (cachedResponse) {
                return cachedResponse;
              }
              
              // Se estiver navegando para uma rota e não houver resposta, entrega a página offline
              if (event.request.mode === 'navigate') {
                return caches.match('/offline.html');
              }
              
              // Retorna um erro ou uma resposta vazia para outros recursos
              return new Response(JSON.stringify({ error: 'Você está offline' }), {
                headers: { 'Content-Type': 'application/json' }
              });
            });
        })
    );
  } else {
    // Cache first para recursos estáticos
    event.respondWith(
      caches.match(event.request)
        .then(cachedResponse => {
          if (cachedResponse) {
            return cachedResponse;
          }
          
          // Não está no cache, buscar da rede
          return fetch(event.request)
            .then(networkResponse => {
              // Cache de recursos válidos
              if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
                return networkResponse;
              }
              
              const responseToCache = networkResponse.clone();
              caches.open(DYNAMIC_CACHE_NAME)
                .then(cache => {
                  if (event.request.method === 'GET') {
                    cache.put(event.request, responseToCache);
                    limitCacheSize(DYNAMIC_CACHE_NAME, DYNAMIC_CACHE_LIMIT);
                  }
                });
              
              return networkResponse;
            })
            .catch(() => {
              // Se a requisição falhar e for uma navegação
              if (event.request.mode === 'navigate') {
                return caches.match('/offline.html');
              }
              
              // Para recursos específicos, como imagens, podemos fornecer um fallback
              if (event.request.url.match(/\.(jpe?g|png|gif|svg)$/)) {
                return caches.match('/icons/icon-192x192.png');
              }
              
              // Retorna null para outros recursos
              return null;
            });
        })
    );
  }
});

// Sincronização em segundo plano quando a conexão é restaurada
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-workout-history') {
    event.waitUntil(
      // Aqui implementaríamos a lógica para sincronizar dados de treinos
      // que foram salvos localmente enquanto o usuário estava offline
      console.log('Sincronizando histórico de treinos...')
    );
  }
});

// Recebe mensagens do cliente (da página)
self.addEventListener('message', (event) => {
  if (event.data.action === 'skipWaiting') {
    self.skipWaiting();
  }
}); 
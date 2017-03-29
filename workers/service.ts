var CACHE_NAME = 'my-site-cache-v1';
var urlsToCache = [
  '/api/',
  'app.css',
  'app.js',
  'assets/docs/main.js',
  'https://cdnjs.cloudflare.com/ajax/libs/markdown-it/8.3.1/markdown-it.js',
  'http://cdnjs.cloudflare.com/ajax/libs/highlight.js/9.10.0/highlight.min.js',
  'http://cdnjs.cloudflare.com/ajax/libs/highlight.js/9.4.0/languages/typescript.min.js'
];

self.addEventListener('install', function(event) {
  // Perform install steps
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(function(cache) {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
  );
});

self.addEventListener('fetch', function(event) {
  event.respondWith(
    caches.match(event.request)
      .then(function(response) {
        // Cache hit - return response
        if (response) {
          return response;
        }
        return fetch(event.request);
      }
    )
  );
});

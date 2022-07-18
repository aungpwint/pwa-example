const cacheName = "pwa-v3-" + (self.registration ? self.registration.scope : '');
const startPage = "/";
const offlinePage = "/offline?sw-status=true";
const filesToCache = [startPage, offlinePage];
const neverCacheUrls = [/\/admin/, /\/account/, /preview=true/];

function checkNeverCacheList(url) {
    if (this.match(url)) {
        return false;
    }
    return true;
}

// Install
self.addEventListener("install", event => {
    event.waitUntil(caches.open(cacheName).then(function (cache) {
        filesToCache.map(function (url) {
            return cache.add(url).catch(function (reason) {
                return console.log(
                    "PWA: " + String(reason) + " " + url
                );
            });
        });
    }));
});

// Activate
self.addEventListener("activate", event => {
    event.waitUntil(caches.keys().then(function (keyList) {
        return Promise.all(
            keyList.map(function (key) {
                if (key !== cacheName) {
                    console.log("PWA old cache removed", key);
                    return caches.delete(key);
                }
            })
        );
    }));
    return self.clients.claim();
});

// Fetch
self.addEventListener("fetch", event => {
    if (!neverCacheUrls.every(checkNeverCacheList, event.request.url)) return;

    if (!event.request.url.match(/^(http|https):\/\//i)) return;

    if (new URL(event.request.url).origin !== location.origin) return;

    console.clear();
    
    if (event.request.method !== "GET") {
        event.respondWith(
            fetch(event.request).catch(function () {
                return caches.match(offlinePage);
            })
        );
        return;
    }

    if (event.request.mode === "navigate" && navigator.onLine) {
        event.respondWith(
            fetch(event.request).then(function (response) {
                return caches.open(cacheName).then(function (cache) {
                    cache.put(event.request, response.clone());
                    return response;
                });
            })
        );
        return;
    }

    event.respondWith(caches.match(event.request)
        .then(function (response) {
            return (
                response ||
                fetch(event.request).then(function (response) {
                    return caches.open(cacheName).then(function (cache) {
                        cache.put(event.request, response.clone());
                        return response;
                    });
                })
            );
        })
        .catch(function () {
            return caches.match(offlinePage);
        })
    );
});

/**
 * WallpaperFetch —— 壁纸数据源
 * Bing 每日壁纸获取、图片下载、Blob 缓存等纯数据操作。
 * 不直接操作 DOM —— 由 newtab.js 负责编排。
 * 挂载到 window.WallpaperFetch。
 */
(function () {
    'use strict';

    // 引用其他模块
    var D = window.WallpaperData;
    var S = window.WallpaperShow;
    function log() { window.log.apply(window, arguments); }
    function warn() { window.warn.apply(window, arguments); }
    var RSS_IMAGE_TIMEOUT_MS = 30000;

    // ================================================================
    // Bing 端点
    // ================================================================

    var BING_PRIMARY = function (mkt) { return 'https://bing.kaininx.workers.dev/?resolution=1920x1080&format=json&index=0&mkt=' + mkt; };
    var BING_FALLBACK = function (mkt) { return 'https://bing.biturl.top/?resolution=1920x1080&format=json&index=0&mkt=' + mkt; };

    // ================================================================
    // Bing 每日壁纸获取与缓存
    // ================================================================

    function bingMkt(lang) {
        var map = { 'zh-CN': 'zh-CN', 'zh-TW': 'zh-TW', 'en': 'en-US', 'ja': 'ja-JP', 'ko': 'ko-KR', 'fr': 'fr-FR', 'de': 'de-DE', 'es': 'es-ES', 'it': 'it-IT', 'pt': 'pt-BR', 'ru': 'ru-RU', 'ar': 'ar-SA', 'hi': 'hi-IN', 'tr': 'tr-TR', 'pl': 'pl-PL', 'vi': 'vi-VN' };
        return map[lang] || 'en-US';
    }

    function fetchBingUrl(lang) {
        var mkt = bingMkt(lang);
        var shared = new AbortController();
        function tryFetch(url, api, timeout) {
            var signal = AbortSignal.any([shared.signal, AbortSignal.timeout(timeout)]);
            return fetch(url, { signal: signal }).then(function (r) {
                if (!r.ok) throw new Error('HTTP ' + r.status);
                return r.json();
            }).then(function (data) {
                if (data && data.url) return { url: data.url, api: api };
                throw new Error('no url in response');
            });
        }
        var t = '&t=' + Date.now();
        return Promise.any([
            tryFetch(BING_PRIMARY(mkt) + t, 'primary', 8000),
            tryFetch(BING_FALLBACK(mkt) + t, 'fallback', 8000)
        ]).finally(function () { shared.abort(); });
    }

    function downloadBingBlob(url) {
        return fetch(url, { mode: 'cors' }).then(function (r) {
            if (!r.ok) throw new Error('fetch failed');
            return r.blob();
        });
    }

    function cacheBingBlob(url, provider, today) {
        var meta = D.loadBingMeta();
        var isNew = meta.src !== url;

        if (!isNew) {
            return D.idbGet(D.DB.BING_BLOB).then(function (record) {
                var blob = D.imageBlob(record);
                if (blob) {
                    var kb = (blob.size / 1024).toFixed(0);
                    log('Bing', 'wallpaper unchanged, skipped  ·  ' + provider + '  ·  ' + kb + ' KB');
                    return blob;
                }
                log('Bing', 'blob missing, re-downloading...');
                return downloadAndStore();
            });
        }

        return downloadAndStore();

        function downloadAndStore() {
            return downloadBingBlob(url).then(function (blob) {
                var kb = (blob.size / 1024).toFixed(0);
                log('Bing', 'fetched new wallpaper from ' + provider + '  ·  ' + kb + ' KB');
                return D.idbPut(D.DB.BING_BLOB, D.imageRecord(blob, 'bing')).then(function () {
                    meta.src = url;
                    meta.date = today;
                    meta.provider = provider;
                    D.saveBingMeta(meta);
                    return blob;
                });
            }).catch(function () { warn('Bing', 'got the URL but failed to download image, kept last image'); });
        }
    }

    // ================================================================
    // 通用工具
    // ================================================================

    function generateId() {
        return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
    }

    function isHttpsUrl(value) {
        try {
            var url = new URL(String(value || '').trim());
            return url.protocol === 'https:';
        } catch (e) {
            return false;
        }
    }

    function rssError(code, message) {
        var err = new Error(message);
        err.code = code;
        return err;
    }

    function apiError(code, message) {
        var err = new Error(message);
        err.code = code;
        return err;
    }

    function timeoutSignal(ms) {
        if (AbortSignal.timeout) return AbortSignal.timeout(ms);
        var controller = new AbortController();
        setTimeout(function () { controller.abort(); }, ms);
        return controller.signal;
    }

    function ensureHostPermission(url) {
        if (!(typeof chrome !== 'undefined' && chrome.permissions && chrome.runtime && chrome.runtime.id)) {
            return Promise.resolve({ granted: true, webMode: true });
        }
        var origin = new URL(url).origin + '/*';
        return new Promise(function (resolve) {
            chrome.permissions.contains({ origins: [origin] }, function (hasPermission) {
                if (hasPermission) {
                    resolve({ granted: true, webMode: false });
                    return;
                }
                chrome.permissions.request({ origins: [origin] }, function (granted) {
                    resolve({ granted: !!granted, webMode: false });
                });
            });
        });
    }

    function webProxyUrls(url) {
        return [
            'https://api.codetabs.com/v1/proxy?quest=' + encodeURIComponent(url),
            'https://api.allorigins.win/raw?url=' + encodeURIComponent(url)
        ];
    }

    function fetchResponse(url, timeoutMs) {
        return fetch(url, { signal: timeoutSignal(timeoutMs || 8000), mode: 'cors' }).then(function (response) {
            if (!response.ok) throw new Error('HTTP ' + response.status);
            return response;
        });
    }

    function fetchWithWebFallback(url, timeoutMs, reader) {
        return ensureHostPermission(url).then(function (permission) {
            if (!permission.granted) throw rssError('RSS_PERMISSION_DENIED', 'permission denied');
            var primary = permission.webMode ? Promise.reject(new Error('web proxy required')) : fetchResponse(url, timeoutMs);
            return primary.catch(function (err) {
                if (!permission.webMode) throw err;
                var proxies = webProxyUrls(url);
                var chain = Promise.reject(err);
                proxies.forEach(function (proxyUrl) {
                    chain = chain.catch(function () { return fetchResponse(proxyUrl, timeoutMs); });
                });
                return chain;
            }).then(reader);
        });
    }

    function fetchText(url, timeoutMs) {
        return fetchWithWebFallback(url, timeoutMs, function (response) { return response.text(); });
    }

    function resolveJsonPath(data, path) {
        if (!path) return '';
        var parts = String(path).replace(/\[(\d+)\]/g, '.$1').split('.').filter(Boolean);
        var current = data;
        for (var i = 0; i < parts.length; i++) {
            if (current === null || current === undefined) return '';
            current = current[parts[i]];
        }
        return typeof current === 'string' ? current.trim() : '';
    }

    function findApiImageUrl(data) {
        var seen = [];
        var preferred = ['url', 'imageUrl', 'image_url', 'src', 'image', 'wallpaper'];

        function valid(value) {
            return typeof value === 'string' && isHttpsUrl(value) && /\.(avif|bmp|gif|jpe?g|png|webp)(\?|#|$)/i.test(value);
        }

        function walk(value, depth) {
            if (!value || depth > 5 || seen.indexOf(value) !== -1) return '';
            if (valid(value)) return value;
            if (typeof value !== 'object') return '';
            seen.push(value);
            for (var p = 0; p < preferred.length; p++) {
                var key = preferred[p];
                if (Object.prototype.hasOwnProperty.call(value, key)) {
                    var direct = walk(value[key], depth + 1);
                    if (direct) return direct;
                }
            }
            var keys = Array.isArray(value) ? value.map(function (_, index) { return index; }) : Object.keys(value);
            for (var i = 0; i < keys.length; i++) {
                var found = walk(value[keys[i]], depth + 1);
                if (found) return found;
            }
            return '';
        }

        return walk(data, 0);
    }

    function classifyFetchError(err) {
        var message = err && err.message ? err.message : String(err || '');
        if (err && err.code === 'RSS_PERMISSION_DENIED') return apiError('API_CORS_OR_NETWORK', message || 'permission denied');
        if (/HTTP 401|HTTP 403/.test(message)) return apiError('API_AUTH_REQUIRED', message);
        if (/HTTP/.test(message)) return apiError('API_FETCH_FAILED', message);
        if (message === 'Failed to fetch') return apiError('API_CORS_OR_NETWORK', message);
        if ((err && err.name === 'AbortError') || message === 'The operation was aborted.' || message === 'AbortError' || message === 'signal timed out') {
            return apiError('API_TIMEOUT', message);
        }
        return err;
    }

    function fetchApiResponse(url, timeoutMs) {
        if (!isHttpsUrl(url)) return Promise.reject(apiError('INVALID_API_URL', 'invalid url'));
        return fetchWithWebFallback(url, timeoutMs || 8000, function (response) {
            return response;
        }).catch(function (err) {
            throw classifyFetchError(err);
        });
    }

    function blobFromImageResponse(response, imageUrl) {
        var contentType = response.headers.get('Content-Type') || '';
        if (contentType.indexOf('image/') !== 0) throw apiError('API_NOT_IMAGE', 'response is not an image');
        return response.blob().then(function (blob) {
            if (!blob || !blob.size) throw apiError('API_IMAGE_DOWNLOAD_FAILED', 'empty image');
            return {
                ok: true,
                imageUrl: imageUrl || response.url || '',
                blob: blob,
                mime: blob.type || contentType || '',
                finalUrl: response.url || imageUrl || ''
            };
        });
    }

    function textOf(node, selector) {
        var found = node.querySelector(selector);
        return found ? (found.textContent || '').trim() : '';
    }

    function attrOf(node, selector, attr) {
        var found = node.querySelector(selector);
        return found ? (found.getAttribute(attr) || '').trim() : '';
    }

    function nodesByLocalName(node, names) {
        var wanted = {};
        names.forEach(function (name) { wanted[name] = true; });
        return Array.prototype.filter.call(node.getElementsByTagName('*'), function (child) {
            return !!wanted[child.localName];
        });
    }

    function localNameText(node, localName) {
        var children = node.children || [];
        for (var i = 0; i < children.length; i++) {
            if (children[i].localName === localName) return (children[i].textContent || '').trim();
        }
        return '';
    }

    function absolutizeUrl(url, baseUrl) {
        if (!url) return '';
        try { return new URL(url, baseUrl).href; } catch (e) { return ''; }
    }

    function parseHtmlFragment(html) {
        var sanitized = String(html || '').replace(/\sstyle\s*=\s*("([^"]*)"|'([^']*)'|[^\s>]+)/gi, '');
        return new DOMParser().parseFromString(sanitized, 'text/html');
    }

    function stripHtml(html) {
        var doc = parseHtmlFragment(html);
        return (doc.body && doc.body.textContent || '').replace(/\s+/g, ' ').trim();
    }

    function srcsetCandidates(srcset, baseUrl) {
        return String(srcset || '').split(',').map(function (part) {
            var chunks = part.trim().split(/\s+/);
            var url = chunks[0] ? absolutizeUrl(chunks[0], baseUrl) : '';
            var width = 0;
            for (var i = 1; i < chunks.length; i++) {
                var match = /^(\d+)w$/.exec(chunks[i]);
                if (match) width = parseInt(match[1], 10) || 0;
            }
            return { url: url, width: width };
        }).filter(function (item) {
            return item.url && isHttpsUrl(item.url);
        }).sort(function (a, b) {
            return a.width - b.width;
        });
    }

    function orderedSrcsetUrls(srcset, baseUrl) {
        var candidates = srcsetCandidates(srcset, baseUrl);
        var preferred = candidates.filter(function (item) { return item.width >= 1200 && item.width <= 2400; });
        var larger = candidates.filter(function (item) { return item.width > 2400; });
        var smaller = candidates.filter(function (item) { return item.width > 0 && item.width < 1200; }).reverse();
        var unsized = candidates.filter(function (item) { return !item.width; });
        return preferred.concat(larger).concat(smaller).concat(unsized).map(function (item) { return item.url; });
    }

    function uniqueHttpsUrls(values, baseUrl) {
        var seen = {};
        var result = [];
        (values || []).forEach(function (value) {
            var abs = absolutizeUrl(value, baseUrl);
            if (!isHttpsUrl(abs) || seen[abs]) return;
            seen[abs] = true;
            result.push(abs);
        });
        return result;
    }

    function imageUrlsFromHtml(html, baseUrl) {
        var doc = parseHtmlFragment(html);
        var urls = [];
        Array.prototype.forEach.call(doc.querySelectorAll('img'), function (img) {
            urls = urls.concat(orderedSrcsetUrls(img.getAttribute('srcset') || '', baseUrl));
            urls.push(img.getAttribute('src') || '');
        });
        return uniqueHttpsUrls(urls, baseUrl);
    }

    function firstImageByLocalName(item, names) {
        var nodes = nodesByLocalName(item, names);
        for (var i = 0; i < nodes.length; i++) {
            if (names.indexOf(nodes[i].localName) === -1) continue;
            var url = nodes[i].getAttribute('url') || nodes[i].getAttribute('src');
            if (url) return url;
        }
        return '';
    }

    function extractImageUrls(item, baseUrl) {
        var enclosure = item.querySelector('enclosure[url][type^="image/"]') || item.querySelector('enclosure[url]');
        var media = item.querySelector('content[url][medium="image"], content[url][type^="image/"], thumbnail[url]');
        var encoded = textOf(item, 'content\\:encoded') || localNameText(item, 'encoded');
        var contentHtml = textOf(item, 'content') || localNameText(item, 'content');
        var candidates = [
            enclosure && enclosure.getAttribute('url'),
            media && media.getAttribute('url'),
            firstImageByLocalName(item, ['content', 'thumbnail'])
        ];
        return uniqueHttpsUrls(candidates, baseUrl)
            .concat(imageUrlsFromHtml(textOf(item, 'description'), baseUrl))
            .concat(imageUrlsFromHtml(encoded, baseUrl))
            .concat(imageUrlsFromHtml(contentHtml, baseUrl))
            .concat(imageUrlsFromHtml(textOf(item, 'summary'), baseUrl))
            .filter(function (url, index, list) { return list.indexOf(url) === index; });
    }

    function hasParserError(doc) {
        return !!(doc && doc.querySelector && doc.querySelector('parsererror'));
    }

    function escapeBareAmpersandsInXmlAttributes(xmlText) {
        var text = String(xmlText || '');
        var output = '';
        var inTag = false;
        var quote = '';
        var i = 0;
        var entityPattern = /^&(#[0-9]+|#x[0-9a-fA-F]+|[A-Za-z][A-Za-z0-9._:-]*);/;

        while (i < text.length) {
            if (!inTag) {
                if (text.slice(i, i + 9) === '<![CDATA[') {
                    var cdataEnd = text.indexOf(']]>', i + 9);
                    var cdataStop = cdataEnd === -1 ? text.length : cdataEnd + 3;
                    output += text.slice(i, cdataStop);
                    i = cdataStop;
                    continue;
                }
                if (text.slice(i, i + 4) === '<!--') {
                    var commentEnd = text.indexOf('-->', i + 4);
                    var commentStop = commentEnd === -1 ? text.length : commentEnd + 3;
                    output += text.slice(i, commentStop);
                    i = commentStop;
                    continue;
                }
                if (text[i] === '<') inTag = true;
                output += text[i++];
                continue;
            }

            if (quote) {
                if (text[i] === '&' && !entityPattern.test(text.slice(i))) {
                    output += '&amp;';
                    i++;
                    continue;
                }
                if (text[i] === quote) quote = '';
                output += text[i++];
                continue;
            }

            if (text[i] === '"' || text[i] === "'") {
                quote = text[i];
            } else if (text[i] === '>') {
                inTag = false;
            }
            output += text[i++];
        }

        return output;
    }

    function parseXmlDocument(xmlText) {
        var parser = new DOMParser();
        var doc = parser.parseFromString(xmlText, 'application/xml');
        if (!hasParserError(doc)) return doc;

        var repaired = escapeBareAmpersandsInXmlAttributes(xmlText);
        if (repaired !== xmlText) {
            doc = parser.parseFromString(repaired, 'application/xml');
            if (!hasParserError(doc)) return doc;
        }

        throw rssError('RSS_PARSE_FAILED', 'feed parse failed');
    }

    function parseRssItems(xmlText, feedUrl, source) {
        var doc = parseXmlDocument(xmlText);
        var nodes = Array.prototype.slice.call(doc.querySelectorAll('item, entry'));
        if (!nodes.length) nodes = nodesByLocalName(doc, ['item', 'entry']);
        return nodes.map(function (item, index) {
            var rawDescription = textOf(item, 'description') || textOf(item, 'summary') || textOf(item, 'content') || localNameText(item, 'encoded');
            var localLink = nodesByLocalName(item, ['link']).filter(function (node) {
                return (node.getAttribute('rel') || 'alternate') === 'alternate' && node.getAttribute('href');
            })[0];
            var link = attrOf(item, 'link[rel="alternate"]', 'href') || attrOf(item, 'link[href]', 'href') || (localLink && localLink.getAttribute('href')) || textOf(item, 'link');
            var published = textOf(item, 'pubDate') || textOf(item, 'published') || textOf(item, 'updated');
            var imageUrls = extractImageUrls(item, feedUrl);
            var imageUrl = imageUrls[0] || '';
            var title = textOf(item, 'title') || source.name || 'RSS wallpaper';
            return {
                sourceId: source.id,
                sourceName: source.name,
                title: stripHtml(title),
                description: stripHtml(rawDescription).slice(0, 240),
                link: absolutizeUrl(link, feedUrl),
                imageUrl: imageUrl,
                imageUrls: imageUrls,
                publishedAt: published ? Date.parse(published) || 0 : 0,
                fetchedAt: Date.now(),
                stableKey: source.id + ':' + (link || imageUrl || title || index)
            };
        }).filter(function (item) {
            return item.imageUrls && item.imageUrls.length;
        }).sort(function (a, b) {
            return (b.publishedAt || 0) - (a.publishedAt || 0);
        }).slice(0, 12);
    }

    function rssItemId(item) {
        var raw = item.stableKey || item.imageUrl || item.link || item.title;
        var hash = 0;
        for (var i = 0; i < raw.length; i++) hash = ((hash << 5) - hash + raw.charCodeAt(i)) | 0;
        return 'rss_' + Math.abs(hash).toString(36);
    }

    function downloadImageBlob(url) {
        return fetchWithWebFallback(url, RSS_IMAGE_TIMEOUT_MS, function (response) { return response.blob(); });
    }

    function downloadRssItemBlob(item) {
        var urls = item.imageUrls && item.imageUrls.length ? item.imageUrls : [item.imageUrl];
        var lastError = null;
        function next(index) {
            if (index >= urls.length) return Promise.reject(lastError || new Error('image download failed'));
            return downloadImageBlob(urls[index]).then(function (blob) {
                item.imageUrl = urls[index];
                return blob;
            }).catch(function (err) {
                lastError = err;
                return next(index + 1);
            });
        }
        return next(0);
    }

    function cacheRssItems(source, items, options) {
        options = options || {};
        var cached = [];
        var thumbs = D.loadThumbs();
        var meta = D.loadMeta();
        var total = items.length;

        function report(index) {
            if (typeof options.onProgress === 'function') {
                options.onProgress({
                    current: Math.min(index + 1, total),
                    total: total,
                    cached: cached.length,
                    source: source
                });
            }
        }

        function next(index) {
            report(index);
            if (index >= items.length) return Promise.resolve(cached);
            var item = items[index];
            var id = rssItemId(item);
            item.id = id;
            return D.idbGet(D.imgKey(id)).then(function (existing) {
                if (existing && existing.blob && thumbs[id]) {
                    cached.push(item);
                    return next(index + 1);
                }
                return downloadRssItemBlob(item).then(function (blob) {
                    var url = URL.createObjectURL(blob);
                    return S.thumbnail(url).then(function (thumb) {
                        URL.revokeObjectURL(url);
                        if (!thumb) throw new Error('thumbnail failed');
                        return D.idbPut(D.imgKey(id), { blob: blob, mime: blob.type || '', name: item.title || id, source: 'rss', id: id, src: item.imageUrl }).then(function () {
                            thumbs[id] = thumb;
                            cached.push(item);
                        });
                    }, function (err) {
                        URL.revokeObjectURL(url);
                        throw err || new Error('thumbnail failed');
                    });
                }).catch(function (err) {
                    warn('RSS', 'skipped image: ' + item.imageUrl + ' (' + (err && err.message ? err.message : err) + ')');
                    return null;
                }).then(function () {
                    return next(index + 1);
                });
            });
        }

        return next(0).then(function () {
            var order = cached.map(function (item) { return item.id; });
            if (!order.length) throw rssError('NO_USABLE_RSS_IMAGES', 'no usable images');
            cached.forEach(function (item) {
                meta[item.id] = {
                    sourceId: item.sourceId,
                    sourceName: item.sourceName,
                    title: item.title,
                    description: item.description,
                    link: item.link,
                    imageUrl: item.imageUrl,
                    publishedAt: item.publishedAt,
                    fetchedAt: item.fetchedAt
                };
            });
            D.saveThumbs(thumbs);
            D.saveMeta(meta);
            return { order: order, meta: meta, thumbs: thumbs, items: cached, total: total, cached: order.length };
        });
    }

    function testRssSource(source) {
        if (!source || !isHttpsUrl(source.url)) return Promise.reject(rssError('INVALID_RSS_URL', 'invalid url'));
        return fetchText(source.url, 8000).then(function (text) {
            var items = parseRssItems(text, source.url, source);
            if (!items.length) throw rssError('NO_RSS_IMAGES', 'no image entries');
            return { ok: true, count: items.length, first: items[0] };
        });
    }

    function refreshRssSource(source, options) {
        if (!source || !isHttpsUrl(source.url)) return Promise.reject(rssError('INVALID_RSS_URL', 'invalid url'));
        return fetchText(source.url, 8000).then(function (text) {
            var items = parseRssItems(text, source.url, source);
            if (!items.length) throw rssError('NO_RSS_IMAGES', 'no image entries');
            return cacheRssItems(source, items, options);
        });
    }

    function testApiSource(source, apiType) {
        if (!source || !isHttpsUrl(source.url)) return Promise.reject(apiError('INVALID_API_URL', 'invalid url'));
        apiType = apiType === 'json' ? 'json' : 'image';
        if (apiType === 'image') {
            return fetchApiResponse(source.url, 8000).then(function (response) {
                return blobFromImageResponse(response, response.url || source.url);
            });
        }
        return fetchApiResponse(source.url, 8000).then(function (response) {
            return response.text();
        }).then(function (text) {
            var data;
            try {
                data = JSON.parse(text);
            } catch (e) {
                throw apiError('API_JSON_PARSE_FAILED', 'json parse failed');
            }
            var imageUrl = resolveJsonPath(data, source.jsonPath || '') || findApiImageUrl(data);
            if (!imageUrl || !isHttpsUrl(imageUrl)) throw apiError('API_JSON_PATH_FAILED', 'image url not found');
            return fetchApiResponse(imageUrl, 8000).then(function (imageResponse) {
                return blobFromImageResponse(imageResponse, imageUrl);
            });
        });
    }

    function cacheApiResult(source, apiType, result) {
        if (!result || !result.blob) return Promise.reject(apiError('API_IMAGE_DOWNLOAD_FAILED', 'empty image'));
        apiType = apiType === 'json' ? 'json' : 'image';
        var thumbs = D.loadThumbs();
        var meta = D.loadMeta();
        var blob = result.blob;
        var imageUrl = result.imageUrl || result.finalUrl || source.url;
        var objectUrl = URL.createObjectURL(blob);
        return S.thumbnail(objectUrl).then(function (thumb) {
            URL.revokeObjectURL(objectUrl);
            if (!thumb) throw apiError('API_IMAGE_DOWNLOAD_FAILED', 'thumbnail failed');
            return D.idbPut(D.DB.API_BLOB, D.imageRecord(blob, source.name || 'api')).then(function () {
                var now = Date.now();
                thumbs.api = thumb;
                meta.api = {
                    sourceId: source.id,
                    sourceName: source.name,
                    apiType: apiType,
                    imageUrl: imageUrl,
                    fetchedAt: now
                };
                D.saveThumbs(thumbs);
                D.saveMeta(meta);
                D.savePreview(thumb);
                D.updateWallpaper(function (model) {
                    model.providers.api.state.lastCheckedAt = now;
                    model.providers.api.state.lastSuccessAt = now;
                    model.providers.api.state.lastError = '';
                    model.providers.api.state.lastSourceId = source.id;
                    model.providers.api.state.lastImageUrl = imageUrl;
                });
                return { ok: true, blob: blob, thumb: thumb, imageUrl: imageUrl };
            });
        }, function (err) {
            URL.revokeObjectURL(objectUrl);
            throw err;
        });
    }

    function refreshApiSource(source, apiType) {
        return testApiSource(source, apiType).then(function (result) {
            return cacheApiResult(source, apiType, result);
        }).catch(function (err) {
            D.updateWallpaper(function (model) {
                model.providers.api.state.lastCheckedAt = Date.now();
                model.providers.api.state.lastError = err && err.message ? err.message : String(err || 'API refresh failed');
            });
            throw err;
        });
    }

    // ================================================================
    // 公开 API
    // ================================================================

    window.WallpaperFetch = {
        bingMkt: bingMkt,
        fetchBingUrl: fetchBingUrl,
        downloadBingBlob: downloadBingBlob,
        cacheBingBlob: cacheBingBlob,
        generateId: generateId,
        isHttpsUrl: isHttpsUrl,
        apiError: apiError,
        resolveJsonPath: resolveJsonPath,
        findApiImageUrl: findApiImageUrl,
        parseRssItems: parseRssItems,
        testRssSource: testRssSource,
        refreshRssSource: refreshRssSource,
        testApiSource: testApiSource,
        cacheApiResult: cacheApiResult,
        refreshApiSource: refreshApiSource
    };

})();

/**
 * Wallpaper Theme — 壁纸主题色提取
 * 纯内存，不落盘。每次新标签页重新计算。
 */
(function () {
    'use strict';

    var ANALYSIS_SIZE = 96;
    var TOP_LIMIT = 32;
    var WASM_THEME_OFFSET = 27;
    var WASM_THEME_ROLE_COUNT = 8;
    var WASM_RESULT_HEADER = WASM_THEME_OFFSET + WASM_THEME_ROLE_COUNT * 4;
    var WASM_ABI_VERSION = 3;
    var _current = null;
    var _enginePromise = null;
    var _engineDisabled = false;
    var WASM_URL = resolveWasmUrl();

    function resolveWasmUrl() {
        var scriptUrl = document.currentScript && document.currentScript.src;
        if (scriptUrl) {
            try { return new URL('theme_engine.wasm', scriptUrl).href; } catch (e) { }
        }
        return 'js/wallpaper/theme_engine.wasm';
    }

    function lum(r, g, b) { return 0.299 * r + 0.587 * g + 0.114 * b; }
    function clamp(v) { return Math.max(0, Math.min(255, v)); }
    function clampColor(c) {
        return { r: clamp(c.r), g: clamp(c.g), b: clamp(c.b) };
    }
    function mix(a, b, amount) {
        return {
            r: Math.round(a.r + (b.r - a.r) * amount),
            g: Math.round(a.g + (b.g - a.g) * amount),
            b: Math.round(a.b + (b.b - a.b) * amount)
        };
    }
    function rgb(c) { return c.r + ',' + c.g + ',' + c.b; }
    function shade(c, amount) {
        return clampColor({ r: Math.round(c.r * amount), g: Math.round(c.g * amount), b: Math.round(c.b * amount) });
    }
    function lift(c, amount) {
        return mix(c, { r: 255, g: 255, b: 255 }, amount);
    }
    function boostChroma(c, amount) {
        var l = Math.round(lum(c.r, c.g, c.b));
        var gray = { r: l, g: l, b: l };
        return clampColor({
            r: Math.round(gray.r + (c.r - gray.r) * amount),
            g: Math.round(gray.g + (c.g - gray.g) * amount),
            b: Math.round(gray.b + (c.b - gray.b) * amount)
        });
    }
    function sat(c) {
        var max = Math.max(c.r, c.g, c.b), min = Math.min(c.r, c.g, c.b);
        return max === 0 ? 0 : (max - min) / max;
    }
    function hue(c) {
        var r = c.r / 255, g = c.g / 255, b = c.b / 255;
        var max = Math.max(r, g, b), min = Math.min(r, g, b);
        var d = max - min;
        if (d === 0) return 0;
        var h;
        if (max === r) h = ((g - b) / d) % 6;
        else if (max === g) h = (b - r) / d + 2;
        else h = (r - g) / d + 4;
        return (h * 60 + 360) % 360;
    }
    function hueDistance(a, b) {
        var d = Math.abs(a - b) % 360;
        return d > 180 ? 360 - d : d;
    }
    function weightedAverage(items, limit) {
        var total = 0, r = 0, g = 0, b = 0;
        for (var i = 0; i < items.length && i < limit; i++) {
            var w = items[i].n || 1;
            total += w;
            r += items[i].r * w;
            g += items[i].g * w;
            b += items[i].b * w;
        }
        if (!total) return items[0] || { r: 28, g: 31, b: 40 };
        return {
            r: Math.round(r / total),
            g: Math.round(g / total),
            b: Math.round(b / total)
        };
    }
    function paletteShare(items, predicate) {
        var total = 0;
        var matched = 0;
        for (var i = 0; i < items.length; i++) {
            var item = items[i];
            var weight = item.n || 1;
            total += weight;
            if (predicate(item)) matched += weight;
        }
        return total ? matched / total : 0;
    }
    function fitLum(c, minL, maxL) {
        var adjusted = c;
        var guard = 0;
        while (lum(adjusted.r, adjusted.g, adjusted.b) < minL && guard < 8) {
            adjusted = lift(adjusted, 0.10);
            guard++;
        }
        guard = 0;
        while (lum(adjusted.r, adjusted.g, adjusted.b) > maxL && guard < 8) {
            adjusted = shade(adjusted, 0.88);
            guard++;
        }
        return adjusted;
    }
    function scoreAccent(c, mood, avgL) {
        var l = lum(c.r, c.g, c.b);
        var moodHue = hue(mood);
        var cHue = hue(c);
        var distance = hueDistance(cHue, moodHue);
        var presence = Math.min(26, Math.sqrt(c.n || 1) * 2.6);
        var diversity = distance > 60 ? 44 : distance * 0.22;
        var neutralPenalty = sat(c) < 0.16 ? 36 : 0;
        return sat(c) * 96 + presence + diversity - Math.abs(l - 128) * 0.16 - Math.abs(l - avgL) * 0.06 - neutralPenalty;
    }
    function selectAccent(items, mood, avgL, isLight) {
        var accent = items.slice().sort(function (a, b) {
            return scoreAccent(b, mood, avgL) - scoreAccent(a, mood, avgL);
        })[0] || mood;

        if (sat(accent) < 0.16) {
            accent = isLight ? mix(mood, { r: 34, g: 42, b: 58 }, 0.42) : mix(mood, { r: 150, g: 170, b: 200 }, 0.46);
        }
        return isLight ? fitLum(accent, 62, 138) : fitLum(accent, 108, 168);
    }
    function textFor(surface) {
        var l = lum(surface.r, surface.g, surface.b);
        if (l > 154) {
            return {
                primary: { r: 24, g: 28, b: 36 },
                muted: { r: 76, g: 86, b: 102 },
                accentContrast: { r: 255, g: 255, b: 255 }
            };
        }
        return {
            primary: { r: 246, g: 248, b: 252 },
            muted: { r: 180, g: 190, b: 206 },
            accentContrast: { r: 12, g: 15, b: 21 }
        };
    }

    function ensureContrast(a, b, minDelta, lightenB) {
        var adjusted = b;
        var delta = Math.abs(lum(a.r, a.g, a.b) - lum(adjusted.r, adjusted.g, adjusted.b));
        var guard = 0;
        while (delta < minDelta && guard < 8) {
            adjusted = lightenB ? lift(adjusted, 0.10) : shade(adjusted, 0.86);
            delta = Math.abs(lum(a.r, a.g, a.b) - lum(adjusted.r, adjusted.g, adjusted.b));
            guard++;
        }
        return adjusted;
    }

    function readImageDataAtSize(img, size) {
        var canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        var ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (!ctx) return null;
        ctx.drawImage(img, 0, 0, size, size);
        var imageData = ctx.getImageData(0, 0, size, size);
        canvas.width = 0;
        canvas.height = 0;
        return imageData;
    }

    function readImageData(img) {
        return readImageDataAtSize(img, ANALYSIS_SIZE);
    }

    function getExport(exports, name) {
        return exports[name] || exports['_' + name] || null;
    }

    function initEngine() {
        if (_engineDisabled || !window.WebAssembly || !window.fetch) return Promise.resolve(null);
        if (!_enginePromise) {
            _enginePromise = fetch(WASM_URL).then(function (response) {
                if (!response || !response.ok) throw new Error('theme engine wasm unavailable');
                return response.arrayBuffer();
            }).then(function (bytes) {
                return WebAssembly.instantiate(bytes, {});
            }).then(function (result) {
                var exports = result.instance && result.instance.exports;
                var input = getExport(exports, 'theme_input_buffer');
                var output = getExport(exports, 'theme_result_buffer');
                var analyze = getExport(exports, 'theme_analyze');
                var maxPixels = getExport(exports, 'theme_max_pixels');
                var resultInts = getExport(exports, 'theme_result_ints');
                var abiVersion = getExport(exports, 'theme_abi_version');
                if (!exports.memory || !input || !output || !analyze || !maxPixels || !resultInts || !abiVersion) {
                    throw new Error('theme engine exports missing');
                }
                if (abiVersion() !== WASM_ABI_VERSION) throw new Error('theme engine abi mismatch');
                return {
                    memory: exports.memory,
                    inputPtr: input(),
                    resultPtr: output(),
                    analyze: analyze,
                    maxPixels: maxPixels(),
                    resultInts: resultInts()
                };
            }).catch(function () {
                _engineDisabled = true;
                return null;
            });
        }
        return _enginePromise;
    }

    function decodeColor(values, offset) {
        var n = values[offset + 3] || 0;
        if (n <= 0) return null;
        return {
            r: values[offset],
            g: values[offset + 1],
            b: values[offset + 2],
            n: n
        };
    }

    function decodeWasmPalette(engine) {
        var values = new Int32Array(engine.memory.buffer, engine.resultPtr, engine.resultInts);
        var topCount = Math.min(TOP_LIMIT, Math.max(0, values[26] || 0));
        var top = [];
        for (var i = 0; i < topCount; i++) {
            var color = decodeColor(values, WASM_RESULT_HEADER + i * 4);
            if (color) top.push(color);
        }
        return {
            count: values[0] || 0,
            avgL: values[1] || 0,
            dominant: decodeColor(values, 2),
            mood: decodeColor(values, 6),
            vibrant: decodeColor(values, 10),
            muted: decodeColor(values, 14),
            dark: decodeColor(values, 18),
            light: decodeColor(values, 22),
            theme: decodeWasmTheme(values),
            top: top,
            source: 'wasm'
        };
    }

    function decodeWasmTheme(values) {
        var roles = [];
        for (var i = 0; i < WASM_THEME_ROLE_COUNT; i++) {
            var color = decodeColor(values, WASM_THEME_OFFSET + i * 4);
            if (!color) return null;
            roles.push(color);
        }
        return {
            surfaceBase: rgb(roles[0]),
            surfaceElevated: rgb(roles[1]),
            tint: rgb(roles[2]),
            stroke: rgb(roles[3]),
            onSurface: rgb(roles[4]),
            onSurfaceMuted: rgb(roles[5]),
            accent: rgb(roles[6]),
            accentContrast: rgb(roles[7])
        };
    }

    function analyzeWithWasm(imageData) {
        return initEngine().then(function (engine) {
            if (!engine) return null;
            var data = imageData.data;
            var pixelCount = Math.min(Math.floor(data.length / 4), engine.maxPixels);
            var byteCount = pixelCount * 4;
            try {
                new Uint8Array(engine.memory.buffer, engine.inputPtr, byteCount).set(data.subarray(0, byteCount));
                if (engine.analyze(imageData.width, imageData.height, TOP_LIMIT) <= 0) return null;
                return decodeWasmPalette(engine);
            } catch (e) {
                _engineDisabled = true;
                return null;
            }
        });
    }

    function binColor(bin) {
        return {
            r: (((bin >> 8) & 15) << 4) + 8,
            g: (((bin >> 4) & 15) << 4) + 8,
            b: ((bin & 15) << 4) + 8
        };
    }

    function analyzeWithJs(data) {
        var freq = {};
        var totalL = 0;
        var count = 0;

        for (var i = 0; i < data.length; i += 4) {
            if (data[i + 3] < 128) continue;
            var l = lum(data[i], data[i + 1], data[i + 2]);
            var bin = (data[i] >> 4 << 8) | (data[i + 1] >> 4 << 4) | (data[i + 2] >> 4);
            freq[bin] = (freq[bin] || 0) + 1;
            totalL += l;
            count++;
        }

        if (count === 0) return null;

        var sorted = Object.keys(freq).sort(function (a, b) { return freq[b] - freq[a]; });
        var top = sorted.slice(0, TOP_LIMIT).map(function (key) {
            var color = binColor(Number(key));
            color.n = freq[key];
            return color;
        });
        if (!top.length) return null;

        return {
            count: count,
            avgL: totalL / count,
            dominant: top[0],
            mood: weightedAverage(top, 16),
            top: top,
            source: 'js'
        };
    }

    function pushCandidate(items, candidate) {
        if (candidate && candidate.n > 0) items.push(candidate);
    }

    function themeFromPalette(palette) {
        if (palette && palette.theme) return palette.theme;
        if (!palette || !palette.count || !palette.top || !palette.top.length) return fallback();

        var top = palette.top;
        var avgL = palette.avgL;
        var white = { r: 255, g: 255, b: 255 };
        var black = { r: 0, g: 0, b: 0 };
        var dominant = palette.dominant || top[0];
        var mood = palette.mood || weightedAverage(top, 16);
        var dominantL = lum(dominant.r, dominant.g, dominant.b);
        var darkShare = paletteShare(top, function (item) { return lum(item.r, item.g, item.b) < 96; });
        var lightShare = paletteShare(top, function (item) { return lum(item.r, item.g, item.b) > 176; });
        var isLight = avgL > 158;
        if (dominantL < 96 || darkShare > lightShare * 1.08) isLight = false;
        else if (dominantL > 178 && lightShare > darkShare * 0.75) isLight = true;

        var colorfulness = Math.max(sat(dominant), sat(mood));
        var hasHue = colorfulness > 0.12;
        var baseSeed = mix(mood, dominant, hasHue ? 0.22 : 0.08);
        var contentSeed = mix(dominant, mood, hasHue ? 0.18 : 0.28);
        if (hasHue) {
            baseSeed = boostChroma(baseSeed, 1.06);
            contentSeed = boostChroma(contentSeed, 1.14);
        }

        var surfaceBase = isLight ? mix(baseSeed, white, hasHue ? 0.52 : 0.48) : mix(baseSeed, { r: 14, g: 16, b: 21 }, hasHue ? 0.64 : 0.68);
        var surfaceElevated = isLight ? mix(contentSeed, white, hasHue ? 0.58 : 0.62) : mix(contentSeed, { r: 34, g: 37, b: 45 }, hasHue ? 0.40 : 0.42);
        surfaceBase = isLight ? fitLum(surfaceBase, hasHue ? 148 : 160, hasHue ? 222 : 218) : fitLum(surfaceBase, hasHue ? 22 : 20, hasHue ? 56 : 48);
        surfaceElevated = isLight ? fitLum(surfaceElevated, hasHue ? 168 : 184, hasHue ? 238 : 236) : fitLum(surfaceElevated, hasHue ? 48 : 40, hasHue ? 96 : 82);
        surfaceElevated = ensureContrast(surfaceBase, surfaceElevated, 14, true);

        var tint = isLight ? mix(dominant, white, hasHue ? 0.48 : 0.46) : mix(dominant, white, hasHue ? 0.20 : 0.18);
        tint = isLight ? fitLum(tint, 148, 222) : fitLum(tint, 84, 156);

        var accentItems = [];
        pushCandidate(accentItems, palette.vibrant);
        pushCandidate(accentItems, palette.muted);
        accentItems = accentItems.concat(top);
        var accent = selectAccent(accentItems, mood, avgL, isLight);

        var text = textFor(surfaceBase);
        var stroke = isLight ? mix(surfaceBase, black, 0.24) : mix(surfaceElevated, white, 0.18);

        return {
            surfaceBase: rgb(surfaceBase),
            surfaceElevated: rgb(surfaceElevated),
            tint: rgb(tint),
            stroke: rgb(stroke),
            onSurface: rgb(text.primary),
            onSurfaceMuted: rgb(text.muted),
            accent: rgb(accent),
            accentContrast: rgb(text.accentContrast)
        };
    }

    function extract(img) {
        try {
            var imageData = readImageData(img);
            if (!imageData) {
                _current = fallback();
                return Promise.resolve(_current);
            }

            return analyzeWithWasm(imageData).then(function (palette) {
                _current = themeFromPalette(palette || analyzeWithJs(imageData.data));
                return _current;
            }, function () {
                _current = themeFromPalette(analyzeWithJs(imageData.data));
                return _current;
            });
        } catch (e) {
            _current = fallback();
            return Promise.resolve(_current);
        }
    }

    function fallback() {
        return {
            surfaceBase: '18,20,27',
            surfaceElevated: '28,31,40',
            tint: '64,70,92',
            stroke: '54,61,78',
            onSurface: '244,247,251',
            onSurfaceMuted: '166,176,193',
            accent: '99,102,241',
            accentContrast: '255,255,255'
        };
    }

    function applyCurrent() {
        if (!_current) return;
        var r = document.documentElement.style;
        r.setProperty('--theme-surface-base-rgb', _current.surfaceBase);
        r.setProperty('--theme-surface-elevated-rgb', _current.surfaceElevated);
        r.setProperty('--theme-tint-rgb', _current.tint);
        r.setProperty('--theme-stroke-rgb', _current.stroke);
        r.setProperty('--theme-on-surface-rgb', _current.onSurface);
        r.setProperty('--theme-on-surface-muted-rgb', _current.onSurfaceMuted);
        r.setProperty('--theme-accent-rgb', _current.accent);
        r.setProperty('--theme-accent-contrast-rgb', _current.accentContrast);
    }

    window.WallpaperTheme = {
        extract: extract,
        applyCurrent: applyCurrent,
        hasCurrent: function () { return _current !== null; }
    };

})();

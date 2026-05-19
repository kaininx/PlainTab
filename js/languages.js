// PlainTab runtime language bootstrap.
// Keep this file small and synchronous: index.html loads it before runtime modules.
(function () {
    'use strict';

    var FALLBACK_LOCALE = 'en';
    var LOCALE_KEY = 'ptab_locale';
    var loadPromises = {};

    var LANGUAGE_LIST = [{"code":"zh-CN","name":"中文 (简体)"},{"code":"en","name":"English"},{"code":"ar","name":"العربية"},{"code":"de","name":"Deutsch"},{"code":"es","name":"Español"},{"code":"fr","name":"Français"},{"code":"hi","name":"हिन्दी"},{"code":"it","name":"Italiano"},{"code":"ja","name":"日本語"},{"code":"ko","name":"한국어"},{"code":"pl","name":"Polski"},{"code":"pt","name":"Português"},{"code":"ru","name":"Русский"},{"code":"tr","name":"Türkçe"},{"code":"vi","name":"Tiếng Việt"},{"code":"zh-TW","name":"中文 (繁體)"}];
    var LOCALE_MAP = {};
    LANGUAGE_LIST.forEach(function (lang) { LOCALE_MAP[lang.code] = true; });

    window.I18N = window.I18N || {};
    window.LanguageList = LANGUAGE_LIST;

    function normalizeLocale(code) {
        return String(code || '').replace(/_/g, '-');
    }

    function resolveLocale(code) {
        code = normalizeLocale(code);
        if (LOCALE_MAP[code]) return code;
        var lower = code.toLowerCase();
        var exact = LANGUAGE_LIST.filter(function (lang) { return lang.code.toLowerCase() === lower; })[0];
        if (exact) return exact.code;
        var main = lower.split('-')[0];
        var match = LANGUAGE_LIST.filter(function (lang) { return lang.code.toLowerCase().split('-')[0] === main; })[0];
        return match ? match.code : FALLBACK_LOCALE;
    }

    function browserLocale() {
        if (typeof chrome !== 'undefined' && chrome.i18n && chrome.i18n.getUILanguage) {
            return chrome.i18n.getUILanguage();
        }
        return navigator.language || FALLBACK_LOCALE;
    }

    function startupLocale() {
        var saved = '';
        try { saved = localStorage.getItem(LOCALE_KEY) || ''; } catch (e) { }
        return resolveLocale(saved || browserLocale());
    }

    function packSrc(locale) {
        return 'js/i18n/' + encodeURIComponent(locale) + '.js';
    }

    function writePack(locale) {
        if (window.I18N[locale]) return;
        document.write('<script src="' + packSrc(locale) + '"><\/script>');
    }

    function loadLocale(locale) {
        locale = resolveLocale(locale);
        if (window.I18N[locale]) return Promise.resolve(locale);
        if (loadPromises[locale]) return loadPromises[locale];

        loadPromises[locale] = new Promise(function (resolve) {
            var script = document.createElement('script');
            script.src = packSrc(locale);
            script.onload = function () { resolve(window.I18N[locale] ? locale : FALLBACK_LOCALE); };
            script.onerror = function () { resolve(FALLBACK_LOCALE); };
            document.body.appendChild(script);
        });
        return loadPromises[locale];
    }

    function validatePlainTabI18N(options) {
        options = options || {};
        var locales = options.locales || window.I18N || {};
        var report = {
            loadedLocales: Object.keys(locales),
            baselineMismatch: [],
            emptyValues: [],
            missingByLocale: {},
            ok: true
        };
        var en = locales.en || {};
        var enKeys = Object.keys(en).sort();
        Object.keys(locales).forEach(function (localeCode) {
            var lang = locales[localeCode] || {};
            Object.keys(lang).forEach(function (key) {
                if (!lang[key]) report.emptyValues.push({ locale: localeCode, key: key });
            });
            if (localeCode === 'en') return;
            var missing = enKeys.filter(function (key) { return !Object.prototype.hasOwnProperty.call(lang, key); });
            if (missing.length) report.missingByLocale[localeCode] = missing;
        });
        if (locales['zh-CN'] && locales.en) {
            var zhKeys = Object.keys(locales['zh-CN']).sort();
            zhKeys.forEach(function (key) {
                if (!Object.prototype.hasOwnProperty.call(locales.en, key)) report.baselineMismatch.push({ locale: 'en', missing: key });
            });
            enKeys.forEach(function (key) {
                if (!Object.prototype.hasOwnProperty.call(locales['zh-CN'], key)) report.baselineMismatch.push({ locale: 'zh-CN', missing: key });
            });
        }
        report.ok = report.baselineMismatch.length === 0 &&
            report.emptyValues.length === 0 &&
            Object.keys(report.missingByLocale).length === 0;
        if (!options.silent && typeof console !== 'undefined') {
            console.log('[PlainTab i18n] validation', report.ok ? 'passed' : 'failed', report);
        }
        return report;
    }

    writePack(FALLBACK_LOCALE);
    writePack(startupLocale());

    window.PlainTabI18N = {
        fallbackLocale: FALLBACK_LOCALE,
        languages: LANGUAGE_LIST,
        resolveLocale: resolveLocale,
        loadLocale: loadLocale,
        isLoaded: function (locale) { return !!window.I18N[resolveLocale(locale)]; }
    };
    window.validatePlainTabI18N = validatePlainTabI18N;
})();

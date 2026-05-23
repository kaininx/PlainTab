/**
 * PlainTab theme tokens.
 * Owns global surface palettes for default and wallpaper-derived themes,
 * plus the user-selected accent alias.
 */
(function () {
    'use strict';

    var THEME_TOKENS = [
        '--theme-surface-base-rgb',
        '--theme-surface-elevated-rgb',
        '--theme-tint-rgb',
        '--theme-stroke-rgb',
        '--theme-on-surface-rgb',
        '--theme-on-surface-muted-rgb',
        '--theme-accent-rgb',
        '--theme-accent-contrast-rgb'
    ];

    var ALIAS_TOKENS = [
        '--surface-base-rgb',
        '--surface-elevated-rgb',
        '--tint-rgb',
        '--stroke-rgb',
        '--on-surface-rgb',
        '--on-surface-muted-rgb',
        '--surface-rgb',
        '--surface-soft-rgb',
        '--surface-strong-rgb',
        '--border-rgb',
        '--text-primary-rgb',
        '--text-secondary-rgb',
        '--text-muted-rgb',
        '--accent-rgb',
        '--accent-contrast-rgb'
    ];

    function clamp(value, min, max) {
        return Math.max(min, Math.min(max, Math.round(value)));
    }

    function rgb(value) {
        return clamp(value.r, 0, 255) + ', ' + clamp(value.g, 0, 255) + ', ' + clamp(value.b, 0, 255);
    }

    function parseRgb(value) {
        if (!value) return null;
        if (typeof value === 'object' && isFinite(value.r) && isFinite(value.g) && isFinite(value.b)) {
            return { r: clamp(value.r, 0, 255), g: clamp(value.g, 0, 255), b: clamp(value.b, 0, 255) };
        }
        var parts = String(value).match(/\d+(?:\.\d+)?/g);
        if (!parts || parts.length < 3) return null;
        return { r: clamp(parseFloat(parts[0]), 0, 255), g: clamp(parseFloat(parts[1]), 0, 255), b: clamp(parseFloat(parts[2]), 0, 255) };
    }

    function hexToRgb(value) {
        var raw = String(value || '').trim();
        var match = raw.match(/^#?([0-9a-f]{6})$/i);
        if (!match) return null;
        var hex = match[1];
        return {
            r: parseInt(hex.slice(0, 2), 16),
            g: parseInt(hex.slice(2, 4), 16),
            b: parseInt(hex.slice(4, 6), 16)
        };
    }

    function lum(c) {
        return 0.2126 * c.r + 0.7152 * c.g + 0.0722 * c.b;
    }

    function applyThemeAliases(root) {
        root.setProperty('--surface-base-rgb', 'var(--theme-surface-base-rgb)');
        root.setProperty('--surface-elevated-rgb', 'var(--theme-surface-elevated-rgb)');
        root.setProperty('--tint-rgb', 'var(--theme-tint-rgb)');
        root.setProperty('--stroke-rgb', 'var(--theme-stroke-rgb)');
        root.setProperty('--on-surface-rgb', 'var(--theme-on-surface-rgb)');
        root.setProperty('--on-surface-muted-rgb', 'var(--theme-on-surface-muted-rgb)');
        root.setProperty('--accent-rgb', 'var(--theme-accent-rgb)');
        root.setProperty('--accent-contrast-rgb', 'var(--theme-accent-contrast-rgb)');
        root.setProperty('--surface-rgb', 'var(--surface-base-rgb)');
        root.setProperty('--surface-soft-rgb', 'var(--surface-elevated-rgb)');
        root.setProperty('--surface-strong-rgb', 'var(--surface-base-rgb)');
        root.setProperty('--border-rgb', 'var(--stroke-rgb)');
        root.setProperty('--text-primary-rgb', 'var(--on-surface-rgb)');
        root.setProperty('--text-secondary-rgb', 'var(--on-surface-muted-rgb)');
        root.setProperty('--text-muted-rgb', 'var(--on-surface-muted-rgb)');
        root.setProperty('--glass-bg', 'rgba(var(--surface-base-rgb), var(--panel-opacity))');
        root.setProperty('--glass-tint', 'linear-gradient(180deg, rgba(var(--tint-rgb), 0.24), rgba(var(--surface-elevated-rgb), 0.10))');
        root.setProperty('--glass-border', '1px solid rgba(var(--stroke-rgb), 0.78)');
    }

    function applyDefaultSurfaceTheme() {
        var root = document.documentElement.style;
        ALIAS_TOKENS.concat(THEME_TOKENS).forEach(function (name) { root.removeProperty(name); });
        root.setProperty('--glass-bg', 'rgba(var(--surface-base-rgb), var(--panel-opacity))');
        root.setProperty('--glass-tint', 'linear-gradient(180deg, rgba(var(--tint-rgb), 0.20), rgba(var(--surface-elevated-rgb), 0.08))');
        root.setProperty('--glass-border', '1px solid rgba(var(--stroke-rgb), 0.72)');
        document.documentElement.setAttribute('data-ui-theme-source', 'default');
        document.documentElement.setAttribute('data-wallpaper-theme', 'off');
    }

    function applyWallpaperTheme() {
        applyThemeAliases(document.documentElement.style);
        document.documentElement.setAttribute('data-ui-theme-source', 'wallpaper');
        document.documentElement.setAttribute('data-wallpaper-theme', 'on');
    }

    function applyCustomAccentTheme(value) {
        var accent = hexToRgb(value) || parseRgb(value);
        if (!accent) return false;
        var root = document.documentElement.style;
        root.setProperty('--accent-rgb', rgb(accent));
        root.setProperty('--accent-contrast-rgb', lum(accent) > 168 ? '12, 15, 21' : '255, 255, 255');
        return true;
    }

    window.PlainTabTheme = {
        hexToRgb: hexToRgb,
        applyDefaultSurfaceTheme: applyDefaultSurfaceTheme,
        applyWallpaperTheme: applyWallpaperTheme,
        applyCustomAccentTheme: applyCustomAccentTheme
    };
})();

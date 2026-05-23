/**
 * PlainTab theme tokens.
 * Owns global surface palettes for default and wallpaper-derived themes,
 * plus the user-selected accent alias.
 */
(function () {
    'use strict';

    var DEFAULT_PALETTE = {
        surfaceBase: '18, 20, 27',
        surfaceElevated: '28, 31, 40',
        tint: '64, 70, 92',
        stroke: '54, 61, 78',
        onSurface: '244, 247, 251',
        onSurfaceMuted: '166, 176, 193',
        accent: '99, 102, 241',
        accentContrast: '255, 255, 255'
    };

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

    function mix(a, b, amount) {
        return {
            r: a.r + (b.r - a.r) * amount,
            g: a.g + (b.g - a.g) * amount,
            b: a.b + (b.b - a.b) * amount
        };
    }

    function lum(c) {
        return 0.2126 * c.r + 0.7152 * c.g + 0.0722 * c.b;
    }

    function sat(c) {
        var max = Math.max(c.r, c.g, c.b);
        var min = Math.min(c.r, c.g, c.b);
        return max === 0 ? 0 : (max - min) / max;
    }

    function boostChroma(c, amount) {
        var gray = lum(c);
        return {
            r: gray + (c.r - gray) * amount,
            g: gray + (c.g - gray) * amount,
            b: gray + (c.b - gray) * amount
        };
    }

    function customAccentThemePalette(value) {
        var seed = hexToRgb(value) || parseRgb(value);
        if (!seed) return null;
        var colorful = sat(seed) > 0.16;
        var accent = seed;
        var baseAnchor = { r: 14, g: 16, b: 21 };
        var elevatedAnchor = { r: 34, g: 37, b: 45 };
        var strokeAnchor = { r: 90, g: 96, b: 116 };
        var surfaceBase = mix(seed, baseAnchor, colorful ? 0.82 : 0.88);
        var surfaceElevated = mix(seed, elevatedAnchor, colorful ? 0.70 : 0.80);
        var tint = mix(seed, { r: 244, g: 247, b: 251 }, colorful ? 0.28 : 0.20);
        var stroke = mix(seed, strokeAnchor, colorful ? 0.55 : 0.68);

        return {
            surfaceBase: rgb(surfaceBase),
            surfaceElevated: rgb(surfaceElevated),
            tint: rgb(tint),
            stroke: rgb(stroke),
            onSurface: '244, 247, 251',
            onSurfaceMuted: '166, 176, 193',
            accent: rgb(accent),
            accentContrast: '255, 255, 255'
        };
    }

    function writePalette(root, palette) {
        root.setProperty('--theme-surface-base-rgb', palette.surfaceBase);
        root.setProperty('--theme-surface-elevated-rgb', palette.surfaceElevated);
        root.setProperty('--theme-tint-rgb', palette.tint);
        root.setProperty('--theme-stroke-rgb', palette.stroke);
        root.setProperty('--theme-on-surface-rgb', palette.onSurface);
        root.setProperty('--theme-on-surface-muted-rgb', palette.onSurfaceMuted);
        root.setProperty('--theme-accent-rgb', palette.accent);
        root.setProperty('--theme-accent-contrast-rgb', palette.accentContrast);
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

    function applyPaletteAliases(root, palette) {
        root.setProperty('--surface-base-rgb', palette.surfaceBase);
        root.setProperty('--surface-elevated-rgb', palette.surfaceElevated);
        root.setProperty('--tint-rgb', palette.tint);
        root.setProperty('--stroke-rgb', palette.stroke);
        root.setProperty('--on-surface-rgb', palette.onSurface);
        root.setProperty('--on-surface-muted-rgb', palette.onSurfaceMuted);
        root.setProperty('--accent-rgb', palette.accent);
        root.setProperty('--accent-contrast-rgb', palette.accentContrast);
        root.setProperty('--surface-rgb', palette.surfaceBase);
        root.setProperty('--surface-soft-rgb', palette.surfaceElevated);
        root.setProperty('--surface-strong-rgb', palette.surfaceBase);
        root.setProperty('--border-rgb', palette.stroke);
        root.setProperty('--text-primary-rgb', palette.onSurface);
        root.setProperty('--text-secondary-rgb', palette.onSurfaceMuted);
        root.setProperty('--text-muted-rgb', palette.onSurfaceMuted);
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
        DEFAULT_PALETTE: DEFAULT_PALETTE,
        hexToRgb: hexToRgb,
        customAccentThemePalette: customAccentThemePalette,
        writePalette: writePalette,
        applyPaletteAliases: applyPaletteAliases,
        applyDefaultSurfaceTheme: applyDefaultSurfaceTheme,
        applyWallpaperTheme: applyWallpaperTheme,
        applyCustomAccentTheme: applyCustomAccentTheme
    };
})();

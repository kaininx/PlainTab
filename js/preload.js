(function () {
    var MAX_PREVIEW_LENGTH = 350000;
    var b = document.getElementById('wallpaperBack');
    if (!b) return;

    var t = localStorage.getItem('ptab_wallpaper_preview');
    if (t && t.length > MAX_PREVIEW_LENGTH) {
        localStorage.removeItem('ptab_wallpaper_preview');
        return;
    }

    if (t) b.style.backgroundImage = t;

    if (!t) {
        try {
            t = localStorage.getItem('ptab_bing_thumb');
            var mode = localStorage.getItem('ptab_mode');
            if (mode === 'local') {
                var idx = parseInt(localStorage.getItem('ptab_local_index'), 10) || 0;
                var order = JSON.parse(localStorage.getItem('ptab_img_order') || '[]');
                if (order.length) {
                    var id = order[idx % order.length];
                    var thumbs = JSON.parse(localStorage.getItem('ptab_img_thumbs') || '{}');
                    t = thumbs[id] || t;
                }
            }
        } catch (e) { }
        if (t) b.style.backgroundImage = t;
    }
})();

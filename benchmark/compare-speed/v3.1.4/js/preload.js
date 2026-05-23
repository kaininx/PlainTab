// preload.js — 在浏览器首帧绘制前，将缩略图写入 back 层
(function () {
    var b = document.getElementById('wallpaperBack');
    if (b) {
        var t = localStorage.getItem('ptab_bing_thumb');
        try {
            var mode = localStorage.getItem('ptab_mode');
            if (mode === 'local') {
                var idx = parseInt(localStorage.getItem('ptab_local_index')) || 0;
                var order = JSON.parse(localStorage.getItem('ptab_img_order') || '[]');
                if (order.length) {
                    var id = order[idx % order.length];
                    var thumbs = JSON.parse(localStorage.getItem('ptab_img_thumbs') || '{}');
                    t = thumbs[id] || t;
                }
            }
        } catch (e) {}
        if (t) b.style.backgroundImage = t;
    }
})();

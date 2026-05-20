/**
 * PlainTabNotice - small runtime prompt/toast layer.
 * Created lazily so it does not participate in first paint.
 */
(function () {
    'use strict';

    var overlay = null;
    var dialog = null;
    var toastStack = null;
    var activeResolve = null;
    var previousFocus = null;
    var toastTimer = null;

    function text(key, fallback) {
        if (window.t) {
            var value = window.t(key);
            if (value && value !== key) return value;
        }
        return fallback || key;
    }

    function ensureDialog() {
        if (overlay && dialog) return;
        overlay = document.createElement('div');
        overlay.className = 'pt-notice-overlay';
        overlay.hidden = true;
        overlay.innerHTML =
            '<section class="pt-notice" role="dialog" aria-modal="true" aria-labelledby="ptNoticeTitle" tabindex="-1">' +
                '<div class="pt-notice-glow" aria-hidden="true"></div>' +
                '<div class="pt-notice-kicker" id="ptNoticeKicker"></div>' +
                '<h2 class="pt-notice-title" id="ptNoticeTitle"></h2>' +
                '<p class="pt-notice-message" id="ptNoticeMessage"></p>' +
                '<div class="pt-notice-actions">' +
                    '<button class="pt-notice-btn" type="button" data-action="cancel"></button>' +
                    '<button class="pt-notice-btn primary" type="button" data-action="confirm"></button>' +
                '</div>' +
            '</section>';
        dialog = overlay.querySelector('.pt-notice');
        overlay.addEventListener('click', function (e) {
            if (e.target === overlay && overlay.dataset.blockBackdrop !== 'true') closeDialog(false);
        });
        overlay.addEventListener('keydown', onDialogKeydown);
        overlay.querySelector('[data-action="cancel"]').addEventListener('click', function () { closeDialog(false); });
        overlay.querySelector('[data-action="confirm"]').addEventListener('click', function () { closeDialog(true); });
        document.body.appendChild(overlay);
    }

    function ensureToastStack() {
        if (toastStack) return;
        toastStack = document.createElement('div');
        toastStack.className = 'pt-notice-toast-stack';
        toastStack.setAttribute('aria-live', 'polite');
        toastStack.setAttribute('aria-atomic', 'true');
        document.body.appendChild(toastStack);
    }

    function trapFocus(e) {
        var focusable = dialog.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
        if (!focusable.length) return;
        var first = focusable[0];
        var last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) {
            e.preventDefault();
            last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
            e.preventDefault();
            first.focus();
        }
    }

    function onDialogKeydown(e) {
        if (e.key === 'Escape') {
            e.preventDefault();
            closeDialog(false);
            return;
        }
        if (e.key === 'Enter') {
            e.preventDefault();
            closeDialog(true);
            return;
        }
        if (e.key === 'Tab') trapFocus(e);
    }

    function closeDialog(result) {
        if (!overlay || overlay.hidden) return;
        overlay.classList.remove('active');
        overlay.hidden = true;
        if (previousFocus && previousFocus.focus) {
            try { previousFocus.focus({ preventScroll: true }); } catch (e) { previousFocus.focus(); }
        }
        var resolve = activeResolve;
        activeResolve = null;
        if (resolve) resolve(!!result);
    }

    function openDialog(options) {
        options = options || {};
        ensureDialog();
        if (activeResolve) closeDialog(false);
        previousFocus = document.activeElement;
        overlay.dataset.variant = options.variant || 'default';
        overlay.dataset.blockBackdrop = options.blockBackdrop ? 'true' : 'false';
        overlay.querySelector('#ptNoticeKicker').textContent = options.kicker || text('appNoticeTitle', 'PlainTab');
        overlay.querySelector('#ptNoticeTitle').textContent = options.title || text('appNoticeTitle', 'PlainTab');
        overlay.querySelector('#ptNoticeMessage').textContent = options.message || '';
        overlay.querySelector('[data-action="cancel"]').textContent = options.cancelText || text('appNoticeCancel', 'Cancel');
        overlay.querySelector('[data-action="confirm"]').textContent = options.confirmText || text('appNoticeConfirm', 'Confirm');
        overlay.hidden = false;
        requestAnimationFrame(function () {
            overlay.classList.add('active');
            dialog.focus({ preventScroll: true });
        });
        return new Promise(function (resolve) {
            activeResolve = resolve;
        });
    }

    function appConfirm(options) {
        if (typeof options === 'string') options = { message: options };
        return openDialog(options);
    }

    function appAlert(options) {
        if (typeof options === 'string') options = { message: options };
        options = options || {};
        appToast(options);
        return Promise.resolve(true);
    }

    function appToast(options) {
        if (typeof options === 'string') options = { message: options };
        options = options || {};
        ensureToastStack();
        clearTimeout(toastTimer);
        toastStack.dataset.variant = options.variant || 'default';
        toastStack.innerHTML =
            '<div class="pt-notice-toast">' +
                '<span class="pt-notice-toast-dot" aria-hidden="true"></span>' +
                '<span class="pt-notice-toast-copy"></span>' +
            '</div>';
        toastStack.querySelector('.pt-notice-toast-copy').textContent = options.message || '';
        toastStack.hidden = false;
        requestAnimationFrame(function () { toastStack.classList.add('active'); });
        toastTimer = setTimeout(function () {
            toastStack.classList.remove('active');
            toastStack.hidden = true;
        }, options.duration || 3200);
    }

    window.PlainTabNotice = {
        confirm: appConfirm,
        alert: appAlert,
        toast: appToast
    };
})();

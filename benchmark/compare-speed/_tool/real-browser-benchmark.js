#!/usr/bin/env node
'use strict';

const childProcess = require('child_process');
const fs = require('fs');
const http = require('http');
const net = require('net');
const os = require('os');
const path = require('path');
const { performance } = require('perf_hooks');

const repoRoot = path.resolve(__dirname, '..', '..', '..');
const serverScript = path.join(__dirname, 'benchmark-server.py');
const DEFAULT_COLD_RUNS = 5;
const DEFAULT_WARM_RUNS = 50;
const DEFAULT_TIMEOUT_MS = 8000;

function parseArgs(argv) {
    const out = {
        versions: ['v3.1.4'],
        coldRuns: DEFAULT_COLD_RUNS,
        warmRuns: DEFAULT_WARM_RUNS,
        timeoutMs: DEFAULT_TIMEOUT_MS,
        headed: false,
        json: false,
        jobDir: '',
        jobId: '',
        browserNtp: false
    };
    for (let i = 0; i < argv.length; i += 1) {
        const arg = argv[i];
        if (arg === '--versions' && argv[i + 1]) out.versions = argv[++i].split(/[,\s]+/).filter(Boolean);
        else if (arg === '--runs' && argv[i + 1]) out.warmRuns = Math.max(1, parseInt(argv[++i], 10) || DEFAULT_WARM_RUNS);
        else if (arg === '--cold-runs' && argv[i + 1]) out.coldRuns = Math.max(1, parseInt(argv[++i], 10) || DEFAULT_COLD_RUNS);
        else if (arg === '--warm-runs' && argv[i + 1]) out.warmRuns = Math.max(1, parseInt(argv[++i], 10) || DEFAULT_WARM_RUNS);
        else if (arg === '--timeout' && argv[i + 1]) out.timeoutMs = Math.max(1000, (parseInt(argv[++i], 10) || 8) * 1000);
        else if (arg === '--job-dir' && argv[i + 1]) out.jobDir = path.resolve(argv[++i]);
        else if (arg === '--job-id' && argv[i + 1]) out.jobId = argv[++i];
        else if (arg === '--browser-ntp') out.browserNtp = true;
        else if (arg === '--headed') out.headed = true;
        else if (arg === '--json') out.json = true;
    }
    return out;
}

function findBrowser() {
    const candidates = [
        process.env.CHROME,
        path.join(process.env.ProgramFiles || '', 'Google', 'Chrome', 'Application', 'chrome.exe'),
        path.join(process.env['ProgramFiles(x86)'] || '', 'Google', 'Chrome', 'Application', 'chrome.exe'),
        path.join(process.env.LOCALAPPDATA || '', 'Google', 'Chrome', 'Application', 'chrome.exe'),
        path.join(process.env.ProgramFiles || '', 'Microsoft', 'Edge', 'Application', 'msedge.exe'),
        path.join(process.env['ProgramFiles(x86)'] || '', 'Microsoft', 'Edge', 'Application', 'msedge.exe')
    ].filter(Boolean);
    const found = candidates.find((item) => fs.existsSync(item));
    if (!found) throw new Error('Chrome/Edge not found. Set CHROME=/path/to/chrome.exe and retry.');
    return found;
}

function findPython() {
    return process.platform === 'win32' ? 'python' : 'python3';
}

function getFreePort(start) {
    return new Promise((resolve, reject) => {
        const tryPort = (port) => {
            const server = net.createServer();
            server.once('error', () => tryPort(port + 1));
            server.once('listening', () => server.close(() => resolve(port)));
            server.listen(port, '127.0.0.1');
        };
        tryPort(start);
        setTimeout(() => reject(new Error('Timed out finding a free port')), 5000).unref();
    });
}

function requestText(url, method = 'GET') {
    return new Promise((resolve, reject) => {
        const req = http.request(url, { method }, (res) => {
            let body = '';
            res.setEncoding('utf8');
            res.on('data', (chunk) => { body += chunk; });
            res.on('end', () => {
                if (res.statusCode < 200 || res.statusCode >= 300) {
                    reject(new Error(`${method} ${url} failed: HTTP ${res.statusCode}`));
                    return;
                }
                resolve(body);
            });
        });
        req.on('error', reject);
        req.end();
    });
}

function waitForHttp(url, timeoutMs) {
    const started = Date.now();
    return new Promise((resolve, reject) => {
        const tick = () => {
            requestText(url).then(resolve).catch((error) => {
                if (Date.now() - started > timeoutMs) reject(error);
                else setTimeout(tick, 100);
            });
        };
        tick();
    });
}

function waitForExit(child, timeoutMs) {
    return new Promise((resolve) => {
        if (!child || child.exitCode !== null) {
            resolve();
            return;
        }
        const timer = setTimeout(resolve, timeoutMs);
        child.once('exit', () => {
            clearTimeout(timer);
            resolve();
        });
    });
}

async function removeDirWithRetry(dir) {
    for (let i = 0; i < 8; i += 1) {
        try {
            fs.rmSync(dir, { recursive: true, force: true });
            return;
        } catch (error) {
            await sleep(250);
        }
    }
}

class Cdp {
    constructor(wsUrl) {
        this.wsUrl = wsUrl;
        this.nextId = 1;
        this.pending = new Map();
    }

    connect() {
        return new Promise((resolve, reject) => {
            this.ws = new WebSocket(this.wsUrl);
            this.ws.onopen = () => resolve();
            this.ws.onerror = (event) => reject(new Error(`WebSocket error: ${event.message || 'unknown'}`));
            this.ws.onmessage = (event) => {
                const message = JSON.parse(event.data);
                if (!message.id || !this.pending.has(message.id)) return;
                const { resolve: ok, reject: fail } = this.pending.get(message.id);
                this.pending.delete(message.id);
                if (message.error) fail(new Error(message.error.message || JSON.stringify(message.error)));
                else ok(message.result || {});
            };
            this.ws.onclose = () => {
                for (const { reject: fail } of this.pending.values()) fail(new Error('CDP connection closed'));
                this.pending.clear();
            };
        });
    }

    send(method, params = {}, sessionId) {
        const id = this.nextId++;
        const payload = { id, method, params };
        if (sessionId) payload.sessionId = sessionId;
        return new Promise((resolve, reject) => {
            this.pending.set(id, { resolve, reject });
            this.ws.send(JSON.stringify(payload));
        });
    }

    close() {
        if (this.ws) this.ws.close();
    }
}

async function evaluate(cdp, sessionId, expression) {
    const result = await cdp.send('Runtime.evaluate', {
        expression,
        awaitPromise: true,
        returnByValue: true
    }, sessionId);
    if (result.exceptionDetails) throw new Error(result.exceptionDetails.text || 'Runtime.evaluate failed');
    return result.result ? result.result.value : undefined;
}

async function createContext(cdp) {
    const result = await cdp.send('Target.createBrowserContext', { disposeOnDetach: true });
    return { id: result.browserContextId, opened: false };
}

async function disposeContext(cdp, context) {
    if (!context) return;
    const browserContextId = typeof context === 'string' ? context : context.id;
    if (!browserContextId) return;
    await cdp.send('Target.disposeBrowserContext', { browserContextId }).catch(() => {});
}

async function attachTarget(cdp, targetId) {
    const attached = await cdp.send('Target.attachToTarget', { targetId, flatten: true });
    const sessionId = attached.sessionId;
    await cdp.send('Page.enable', {}, sessionId).catch(() => {});
    await cdp.send('Runtime.enable', {}, sessionId);
    return sessionId;
}

async function closeTarget(cdp, targetId) {
    if (!targetId) return;
    await cdp.send('Target.closeTarget', { targetId }).catch(() => {});
}

async function clearBrowserCache(cdp) {
    const target = await cdp.send('Target.createTarget', { url: 'about:blank', newWindow: false });
    const sessionId = await attachTarget(cdp, target.targetId);
    await cdp.send('Network.enable', {}, sessionId).catch(() => {});
    await cdp.send('Network.clearBrowserCache', {}, sessionId).catch(() => {});
    await closeTarget(cdp, target.targetId);
}

function targetUrl(baseUrl, id) {
    return `${baseUrl}/benchmark/compare-speed/__bench__/${encodeURIComponent(id)}/index.html`;
}

function withRunParam(url, phase, run) {
    const separator = url.includes('?') ? '&' : '?';
    return `${url}${separator}ptab_benchmark_phase=${encodeURIComponent(phase)}&ptab_benchmark_t=${Date.now()}_${run}_${Math.random().toString(36).slice(2)}`;
}

async function openMeasuredTab(cdp, context, url, timeoutMs, phase, run, keepOpen) {
    const startWall = Date.now();
    const startPerf = performance.now();
    const params = {
        url: withRunParam(url, phase, run),
        newWindow: Boolean(context && !context.opened)
    };
    if (context && context.id) params.browserContextId = context.id;
    const target = await cdp.send('Target.createTarget', params);
    if (context) context.opened = true;
    const sessionId = await attachTarget(cdp, target.targetId);
    const result = await waitForWallpaperResult(cdp, sessionId, startWall, startPerf, timeoutMs);
    if (!keepOpen) await closeTarget(cdp, target.targetId);
    return Object.assign(result, {
        targetId: keepOpen ? target.targetId : null,
        sessionId: keepOpen ? sessionId : null
    });
}

async function reloadMeasuredTab(cdp, sessionId, timeoutMs, run) {
    await evaluate(cdp, sessionId, 'delete window.__plainTabBenchmarkResult; true').catch(() => {});
    const startWall = Date.now();
    const startPerf = performance.now();
    await cdp.send('Page.enable', {}, sessionId).catch(() => {});
    await cdp.send('Page.reload', { ignoreCache: false }, sessionId);
    return waitForWallpaperResult(cdp, sessionId, startWall, startPerf, timeoutMs, run);
}

async function waitForWallpaperResult(cdp, sessionId, startWall, startPerf, timeoutMs) {
    while (performance.now() - startPerf < timeoutMs) {
        const value = await evaluate(cdp, sessionId, 'window.__plainTabBenchmarkResult || null').catch(() => null);
        if (value && value.hit) {
            const fromWallClock = typeof value.wallAt === 'number' ? value.wallAt - startWall : NaN;
            const elapsed = performance.now() - startPerf;
            return {
                hit: true,
                ms: Number.isFinite(fromWallClock) && fromWallClock >= 0 ? fromWallClock : elapsed,
                navMs: typeof value.navMs === 'number' ? value.navMs : NaN,
                frameMs: typeof value.frameMs === 'number' ? value.frameMs : NaN,
                styleMs: typeof value.styleMs === 'number' ? value.styleMs : NaN
            };
        }
        await sleep(5);
    }
    return { hit: false, ms: NaN, navMs: NaN, frameMs: NaN, styleMs: NaN };
}

async function waitForWarmData(cdp, sessionId, timeoutMs) {
    const started = performance.now();
    while (performance.now() - started < timeoutMs) {
        const ready = await evaluate(cdp, sessionId, `Boolean(
            localStorage.getItem('ptab_wallpaper_preview') ||
            localStorage.getItem('ptab_bing_thumb')
        )`).catch(() => false);
        if (ready) return true;
        await sleep(100);
    }
    return false;
}

function sampleStats(samples) {
    const sorted = samples.filter(Number.isFinite).slice().sort((a, b) => a - b);
    if (!sorted.length) return { avg: NaN, p50: NaN, p95: NaN, min: NaN, max: NaN };
    const sum = sorted.reduce((acc, item) => acc + item, 0);
    const percentile = (p) => sorted[Math.min(sorted.length - 1, Math.max(0, Math.ceil(sorted.length * p) - 1))];
    return {
        avg: sum / sorted.length,
        p50: percentile(0.5),
        p95: percentile(0.95),
        min: sorted[0],
        max: sorted[sorted.length - 1]
    };
}

function createResult(id, baseUrl, coldRuns, warmRuns) {
    return {
        id,
        label: id === 'current' ? 'Current' : id,
        url: targetUrl(baseUrl, id),
        cold: sampleStats([]),
        warmReload: sampleStats([]),
        warmNewTab: sampleStats([]),
        coldHit: 0,
        warmReloadHit: 0,
        warmNewTabHit: 0,
        coldRuns,
        warmRuns
    };
}

function formatMs(value) {
    if (!Number.isFinite(value)) return '-';
    if (value < 1000) return `${value.toFixed(1)} ms`;
    return `${(value / 1000).toFixed(2)} s`;
}

function log(quiet, message) {
    if (!quiet) console.log(message);
}

function safeName(value) {
    return String(value).replace(/[^A-Za-z0-9._-]/g, '_');
}

function writeJsonAtomic(file, value) {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    if (!writeJsonAtomic.counters) writeJsonAtomic.counters = new Map();
    const next = (writeJsonAtomic.counters.get(file) || 0) + 1;
    writeJsonAtomic.counters.set(file, next);
    const snapshot = `${file}.${String(next).padStart(6, '0')}.json`;
    const tmp = `${snapshot}.${process.pid}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(value, null, 2), 'utf8');
    for (let i = 0; i < 8; i += 1) {
        try {
            fs.renameSync(tmp, snapshot);
            return;
        } catch (error) {
            if (i === 7) throw error;
            sleepSync(25 + i * 25);
        }
    }
}

function sleepSync(ms) {
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

function createProgress(jobDir, jobId, ids, coldRuns, warmRuns, includeBrowserNtp) {
    if (!jobDir) return null;
    fs.mkdirSync(jobDir, { recursive: true });
    const statusFile = path.join(jobDir, 'status.json');
    const state = {
        ok: true,
        jobId,
        state: 'running',
        stage: 'starting',
        message: '准备启动真实浏览器测试...',
        coldRuns,
        warmRuns,
        targets: ids,
        completedSteps: 0,
        totalSteps: ids.length * coldRuns + ids.length + ids.length * warmRuns * 2 + (includeBrowserNtp ? warmRuns : 0),
        current: null,
        previews: {},
        result: null,
        error: null,
        updatedAt: new Date().toISOString()
    };
    const write = () => {
        state.updatedAt = new Date().toISOString();
        writeJsonAtomic(statusFile, state);
    };
    write();
    return {
        state,
        statusFile,
        update(patch) {
            Object.assign(state, patch || {});
            write();
        },
        step(patch) {
            state.completedSteps += 1;
            Object.assign(state, patch || {});
            write();
        },
        fail(error) {
            state.state = 'error';
            state.error = error && error.stack ? error.stack : String(error);
            state.message = error && error.message ? error.message : String(error);
            write();
        },
        done(result) {
            state.state = 'done';
            state.stage = 'done';
            state.message = '真实浏览器测试完成。';
            state.result = result;
            write();
        }
    };
}

async function capturePreview(cdp, sessionId, progress, id, phase) {
    if (!progress || !sessionId) return;
    try {
        const shot = await cdp.send('Page.captureScreenshot', {
            format: 'jpeg',
            quality: 62,
            captureBeyondViewport: false
        }, sessionId);
        if (!shot || !shot.data) return;
        writePreview(progress, id, phase, shot.data);
    } catch (error) {
        progress.state.previews[id] = Object.assign(progress.state.previews[id] || {}, {
            label: id === 'current' ? 'Current' : id,
            phase,
            error: error && error.message ? error.message : String(error)
        });
        progress.update({});
    }
}

async function assertTargets(baseUrl, ids) {
    for (const id of ids) {
        const url = targetUrl(baseUrl, id);
        const html = await requestText(url);
        if (!html.includes('__plainTabWallpaperBenchmark')) {
            throw new Error(`${id} did not receive the benchmark probe. Use benchmark-server.py.`);
        }
    }
}

function writePreview(progress, id, phase, base64Data) {
    if (!progress || !base64Data) return;
    const file = `preview_${safeName(id)}.jpg`;
    fs.writeFileSync(path.join(path.dirname(progress.statusFile), file), Buffer.from(base64Data, 'base64'));
    progress.state.previews[id] = {
        label: id === 'current' ? 'Current' : (id === 'browserNtp' ? 'Browser NTP' : id),
        phase,
        file,
        updatedAt: new Date().toISOString()
    };
    progress.update({});
}

function visualDifference(a, b) {
    if (!a || !b || !a.length || !b.length) return 0;
    const n = Math.min(a.length, b.length);
    const step = Math.max(1, Math.floor(n / 2048));
    let changed = 0;
    let count = 0;
    for (let i = 0; i < n; i += step) {
        if (Math.abs(a[i] - b[i]) > 8) changed += 1;
        count += 1;
    }
    return count ? changed / count : 0;
}

async function captureBlankBaseline(cdp) {
    const target = await cdp.send('Target.createTarget', { url: 'about:blank', newWindow: false });
    const sessionId = await attachTarget(cdp, target.targetId);
    await sleep(80);
    const shot = await cdp.send('Page.captureScreenshot', {
        format: 'jpeg',
        quality: 58,
        captureBeyondViewport: false
    }, sessionId);
    await closeTarget(cdp, target.targetId);
    return Buffer.from(shot.data, 'base64');
}

async function openVisualNtpTab(cdp, blank, timeoutMs) {
    const startPerf = performance.now();
    const target = await cdp.send('Target.createTarget', { url: 'chrome://newtab/', newWindow: false });
    const sessionId = await attachTarget(cdp, target.targetId);
    let lastShot = null;
    let hit = false;
    let ms = NaN;
    while (performance.now() - startPerf < timeoutMs) {
        const shot = await cdp.send('Page.captureScreenshot', {
            format: 'jpeg',
            quality: 58,
            captureBeyondViewport: false
        }, sessionId).catch(() => null);
        if (shot && shot.data) {
            lastShot = shot.data;
            const buf = Buffer.from(shot.data, 'base64');
            const diff = visualDifference(blank, buf);
            const sizeDelta = Math.abs(buf.length - blank.length);
            if (diff > 0.10 || sizeDelta > 2500) {
                hit = true;
                ms = performance.now() - startPerf;
                break;
            }
        }
        await sleep(25);
    }
    await closeTarget(cdp, target.targetId);
    return { hit, ms, screenshot: lastShot };
}

async function measureBrowserNtp(cdp, warmRuns, timeoutMs, quiet, progress) {
    const samples = [];
    let hits = 0;
    log(quiet, '\n[Reference] Browser NTP: visual detection');
    if (progress) progress.update({ stage: 'browser-ntp', message: 'Browser NTP：视觉检测参考，不参与最终结论。' });
    const blank = await captureBlankBaseline(cdp);
    for (let run = 0; run < warmRuns; run += 1) {
        if (progress) progress.update({ current: { id: 'browserNtp', phase: 'browser-ntp', run: run + 1, runs: warmRuns }, message: `Browser NTP 参考 ${run + 1}/${warmRuns}` });
        const result = await openVisualNtpTab(cdp, blank, timeoutMs);
        if (result.hit) {
            hits += 1;
            samples.push(result.ms);
        }
        if (result.screenshot) writePreview(progress, 'browserNtp', 'Browser NTP 视觉参考', result.screenshot);
        log(quiet, `  browser ntp ${run + 1}/${warmRuns}: ${formatMs(result.ms)}`);
        if (progress) progress.step({ message: `Browser NTP ${run + 1}/${warmRuns}: ${formatMs(result.ms)}` });
    }
    return {
        id: 'browserNtp',
        label: 'Browser NTP',
        method: 'visual-detection',
        note: 'chrome://newtab/ visual first-content detection; reference only, not probe-based.',
        warmNewTab: sampleStats(samples),
        warmNewTabHit: hits,
        warmRuns
    };
}

async function measureAll(cdp, baseUrl, ids, coldRuns, warmRuns, timeoutMs, quiet, progress, includeBrowserNtp) {
    await assertTargets(baseUrl, ids);
    const samples = new Map(ids.map((id) => [id, { cold: [], warmReload: [], warmNewTab: [] }]));
    const warmStates = [];

    log(quiet, '\n[1/3] Cold: fresh browser context for every run');
    if (progress) progress.update({ stage: 'cold', message: 'Cold：全新隔离浏览器上下文 + 真实新标签页。' });
    for (let run = 0; run < coldRuns; run += 1) {
        for (const id of ids) {
            if (progress) progress.update({ current: { id, phase: 'cold', run: run + 1, runs: coldRuns }, message: `Cold ${run + 1}/${coldRuns}: ${id}` });
            await clearBrowserCache(cdp);
            const contextId = await createContext(cdp);
            try {
                const result = await openMeasuredTab(cdp, contextId, targetUrl(baseUrl, id), timeoutMs, 'cold', run, true);
                if (result.hit) samples.get(id).cold.push(result.ms);
                await capturePreview(cdp, result.sessionId, progress, id, 'Cold');
                await closeTarget(cdp, result.targetId);
                log(quiet, `  cold ${run + 1}/${coldRuns} ${id}: ${formatMs(result.ms)}`);
                if (progress) progress.step({ message: `Cold ${run + 1}/${coldRuns} ${id}: ${formatMs(result.ms)}` });
            } finally {
                await disposeContext(cdp, contextId);
            }
        }
    }

    log(quiet, '\n[2/3] Warm setup: one isolated warmed context per target');
    if (progress) progress.update({ stage: 'warm-setup', message: '准备 Warm 缓存：每个版本打开一次真实标签页。' });
    for (const id of ids) {
        if (progress) progress.update({ current: { id, phase: 'warm-setup', run: 1, runs: 1 }, message: `准备 Warm 缓存：${id}` });
        const contextId = await createContext(cdp);
        const setup = await openMeasuredTab(cdp, contextId, targetUrl(baseUrl, id), timeoutMs, 'warm-setup', 0, true);
        const ready = setup.hit && await waitForWarmData(cdp, setup.sessionId, timeoutMs);
        if (!ready) {
            await closeTarget(cdp, setup.targetId);
            await disposeContext(cdp, contextId);
            throw new Error(`${id} warmed page did not produce reusable wallpaper cache before timeout.`);
        }
        await capturePreview(cdp, setup.sessionId, progress, id, 'Warm 缓存已准备');
        warmStates.push({ id, contextId, targetId: setup.targetId, sessionId: setup.sessionId });
        log(quiet, `  ${id}: warmed`);
        if (progress) progress.step({ message: `${id}: Warm 缓存已准备` });
    }

    log(quiet, '\n[2/3] Same-tab Warm: reload the already warmed real tab');
    if (progress) progress.update({ stage: 'warm-reload', message: '同页面 Warm：reload 已缓存的真实标签页。' });
    for (let run = 0; run < warmRuns; run += 1) {
        for (const state of warmStates) {
            if (progress) progress.update({ current: { id: state.id, phase: 'warm-reload', run: run + 1, runs: warmRuns }, message: `同页面 Warm ${run + 1}/${warmRuns}: ${state.id}` });
            const result = await reloadMeasuredTab(cdp, state.sessionId, timeoutMs, run);
            if (result.hit) samples.get(state.id).warmReload.push(result.ms);
            await capturePreview(cdp, state.sessionId, progress, state.id, '同页面 Warm');
            log(quiet, `  warm reload ${run + 1}/${warmRuns} ${state.id}: ${formatMs(result.ms)}`);
            if (progress) progress.step({ message: `同页面 Warm ${run + 1}/${warmRuns} ${state.id}: ${formatMs(result.ms)}` });
        }
    }

    log(quiet, '\n[3/3] New-tab Warm: create a new real tab in the warmed context');
    if (progress) progress.update({ stage: 'warm-new-tab', message: '新标签页 Warm：已有缓存后每轮新建真实标签页。' });
    for (let run = 0; run < warmRuns; run += 1) {
        for (const state of warmStates) {
            if (progress) progress.update({ current: { id: state.id, phase: 'warm-new-tab', run: run + 1, runs: warmRuns }, message: `新标签页 Warm ${run + 1}/${warmRuns}: ${state.id}` });
            const result = await openMeasuredTab(cdp, state.contextId, targetUrl(baseUrl, state.id), timeoutMs, 'warm-new-tab', run, true);
            if (result.hit) samples.get(state.id).warmNewTab.push(result.ms);
            await capturePreview(cdp, result.sessionId, progress, state.id, '新标签页 Warm');
            await closeTarget(cdp, result.targetId);
            log(quiet, `  warm new tab ${run + 1}/${warmRuns} ${state.id}: ${formatMs(result.ms)}`);
            if (progress) progress.step({ message: `新标签页 Warm ${run + 1}/${warmRuns} ${state.id}: ${formatMs(result.ms)}` });
        }
    }

    for (const state of warmStates) {
        await closeTarget(cdp, state.targetId);
        await disposeContext(cdp, state.contextId);
    }

    const results = ids.map((id) => {
        const item = samples.get(id);
        const result = createResult(id, baseUrl, coldRuns, warmRuns);
        result.cold = sampleStats(item.cold);
        result.warmReload = sampleStats(item.warmReload);
        result.warmNewTab = sampleStats(item.warmNewTab);
        result.coldHit = item.cold.length;
        result.warmReloadHit = item.warmReload.length;
        result.warmNewTabHit = item.warmNewTab.length;
        return result;
    });
    const browserNtp = includeBrowserNtp ? await measureBrowserNtp(cdp, warmRuns, timeoutMs, quiet, progress) : null;
    return { results, browserNtp };
}

function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
    const args = parseArgs(process.argv.slice(2));
    const httpPort = await getFreePort(8214);
    const cdpPort = await getFreePort(9222);
    const baseUrl = `http://127.0.0.1:${httpPort}`;
    const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'plaintab-real-browser-benchmark-'));
    const browser = findBrowser();

    const server = childProcess.spawn(findPython(), [
        serverScript,
        '--port', String(httpPort),
        '--bind', '127.0.0.1',
        '--root', repoRoot
    ], { cwd: repoRoot, stdio: ['ignore', 'ignore', 'ignore'] });

    const chromeArgs = [
        `--remote-debugging-port=${cdpPort}`,
        `--user-data-dir=${profile}`,
        '--disable-extensions',
        '--no-first-run',
        '--no-default-browser-check',
        '--disable-background-networking',
        args.headed ? '--new-window' : '--headless=new',
        'about:blank'
    ];
    const chrome = childProcess.spawn(browser, chromeArgs, { stdio: ['ignore', 'ignore', 'ignore'] });

    let cdp;
    let progress;
    try {
        await waitForHttp(`${baseUrl}/benchmark/compare-speed/_tool/benchmark.html`, 10000);
        const versionText = await waitForHttp(`http://127.0.0.1:${cdpPort}/json/version`, 10000);
        const version = JSON.parse(versionText);
        cdp = new Cdp(version.webSocketDebuggerUrl);
        await cdp.connect();

        const ids = args.versions.concat(['current']);
        progress = createProgress(args.jobDir, args.jobId, ids, args.coldRuns, args.warmRuns, args.browserNtp);
        const measured = await measureAll(cdp, baseUrl, ids, args.coldRuns, args.warmRuns, args.timeoutMs, args.json, progress, args.browserNtp);
        const payload = {
            mode: 'real-browser',
            coldRuns: args.coldRuns,
            warmRuns: args.warmRuns,
            timeoutMs: args.timeoutMs,
            browserNtpEnabled: args.browserNtp,
            primaryMetric: 'warmNewTab.p50',
            scenarios: {
                cold: 'Fresh browser context, new real tab, no local PlainTab storage.',
                warmReload: 'Warmed context, same real tab reload.',
                warmNewTab: 'Warmed context, create a new real browser tab.',
                browserNtp: 'Optional chrome://newtab/ visual first-content detection; reference only.'
            },
            results: measured.results,
            browserNtp: measured.browserNtp
        };
        if (progress) progress.done(payload);

        if (args.jobDir) {
            console.log('\nPlainTab Real Browser Wallpaper Speed Benchmark');
            console.log(`Cold runs: ${args.coldRuns}, Warm runs: ${args.warmRuns}`);
            for (const result of measured.results) {
                console.log(`${result.id}: Cold p50 ${formatMs(result.cold.p50)} | Same-tab Warm p50 ${formatMs(result.warmReload.p50)} | New-tab Warm p50 ${formatMs(result.warmNewTab.p50)}`);
            }
            if (measured.browserNtp) console.log(`Browser NTP reference: New-tab visual p50 ${formatMs(measured.browserNtp.warmNewTab.p50)}`);
            return;
        }

        if (args.json) {
            console.log(JSON.stringify(payload, null, 2));
            return;
        }

        console.log('\nPlainTab Real Browser Wallpaper Speed Benchmark');
        console.log(`Cold runs: ${args.coldRuns}, Warm runs: ${args.warmRuns}`);
        for (const result of measured.results) {
            console.log(`${result.id}: Cold p50 ${formatMs(result.cold.p50)} | Same-tab Warm p50 ${formatMs(result.warmReload.p50)} | New-tab Warm p50 ${formatMs(result.warmNewTab.p50)}`);
        }
        if (measured.browserNtp) console.log(`Browser NTP reference: New-tab visual p50 ${formatMs(measured.browserNtp.warmNewTab.p50)}`);
        console.log('\nRaw JSON:');
        console.log(JSON.stringify(payload, null, 2));
    } catch (error) {
        if (progress) progress.fail(error);
        throw error;
    } finally {
        if (cdp) cdp.close();
        chrome.kill();
        server.kill();
        await waitForExit(chrome, 4000);
        await waitForExit(server, 2000);
        await removeDirWithRetry(profile);
    }
}

main().catch((error) => {
    console.error(error && error.stack ? error.stack : error);
    process.exit(1);
});

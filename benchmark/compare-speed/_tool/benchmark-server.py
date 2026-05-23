#!/usr/bin/env python3
import argparse
import html
import json
import mimetypes
import os
import posixpath
import re
import shutil
import subprocess
import sys
import tempfile
import threading
import time
import uuid
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import parse_qs, unquote, urlparse


BENCH_PREFIX = "/benchmark/compare-speed/__bench__/"
API_JOB_START_PATH = "/benchmark/compare-speed/_tool/api/job/start"
API_JOB_PREFIX = "/benchmark/compare-speed/_tool/api/job/"


def is_inside(path, root):
    try:
        os.path.commonpath([str(path), str(root)])
    except ValueError:
        return False
    return os.path.commonpath([str(path), str(root)]) == str(root)


def normalize_url_path(raw_path):
    parsed = urlparse(raw_path)
    path = unquote(parsed.path)
    path = posixpath.normpath(path)
    if path == ".":
        path = "/"
    if not path.startswith("/"):
        path = "/" + path
    return path, parsed.query


def read_latest_job_status(job_dir):
    candidates = []
    direct = job_dir / "status.json"
    if direct.exists():
        candidates.append(direct)
    candidates.extend(job_dir.glob("status.json.*.json"))
    candidates = sorted(candidates, key=status_sort_key, reverse=True)
    last_error = None
    for candidate in candidates:
        try:
            return json.loads(candidate.read_text(encoding="utf-8"))
        except Exception as error:
            last_error = error
    if last_error:
        raise last_error
    return None


def status_sort_key(item):
    name = item.name
    match = re.fullmatch(r"status\.json\.(\d+)\.json", name)
    if match:
        return (2, int(match.group(1)), name)
    match = re.fullmatch(r"status\.json\.py\.(\d+)\.[A-Fa-f0-9]+\.json", name)
    if match:
        return (1, int(match.group(1)), name)
    if name == "status.json":
        return (0, 0, name)
    return (-1, 0, name)


def write_job_status(job_dir, payload):
    filename = "status.json.py.%s.%s.json" % (int(time.time() * 1000), uuid.uuid4().hex[:8])
    target = job_dir / filename
    tmp = job_dir / (filename + ".tmp")
    tmp.write_text(json.dumps(payload, ensure_ascii=False), encoding="utf-8")
    tmp.replace(target)


def benchmark_probe():
    return """<script>
(function(){
window.__plainTabWallpaperBenchmark=true;
var sent=false;
function post(type,payload){
  if (type === "wallpaper-frame") {
    window.__plainTabBenchmarkResult = Object.assign({hit:true}, payload || {});
  }
}
function hasBackground(el){
  if(!el||!el.style)return false;
  var bg=el.style.backgroundImage;
  if(!bg||bg==="none")return false;
  if(el.id!=="wallpaperFront")return true;
  if(el.classList&&el.classList.contains("active"))return true;
  try{return parseFloat(getComputedStyle(el).opacity)>0.01;}catch(e){return false;}
}
function check(){
  if(sent)return;
  var back=document.getElementById("wallpaperBack");
  var front=document.getElementById("wallpaperFront");
  if(!hasBackground(back)&&!hasBackground(front))return;
  sent=true;
  var styleMs=performance.now();
  requestAnimationFrame(function(){
    setTimeout(function(){
      var frameMs=performance.now();
      post("wallpaper-frame",{styleMs:styleMs,frameMs:frameMs,navMs:frameMs,wallAt:performance.timeOrigin+frameMs});
    },0);
  });
  try{observer.disconnect();}catch(e){}
}
var observer=new MutationObserver(check);
observer.observe(document.documentElement,{subtree:true,childList:true,attributes:true,attributeFilter:["style","class"]});
check();
})();
</script>"""


def inject_probe(document):
    probe = benchmark_probe()
    if "__plainTabWallpaperBenchmark" in document:
        return document
    match = re.search(r"<head\\b[^>]*>", document, flags=re.IGNORECASE)
    if match:
        return document[: match.end()] + probe + document[match.end() :]
    return probe + document


class BenchmarkHandler(SimpleHTTPRequestHandler):
    server_version = "PlainTabBenchmarkHTTP/1.0"

    def __init__(self, *args, directory=None, **kwargs):
        self.repo_root = Path(directory).resolve()
        self.compare_root = self.repo_root / "benchmark" / "compare-speed"
        super().__init__(*args, directory=str(self.repo_root), **kwargs)

    def do_GET(self):
        path, _query = normalize_url_path(self.path)
        if path == API_JOB_START_PATH:
            return self.start_real_browser_job(_query)
        if path.startswith(API_JOB_PREFIX):
            return self.serve_job_resource(path)
        if path.startswith(BENCH_PREFIX):
            return self.serve_benchmark_target(path)
        return super().do_GET()

    def do_HEAD(self):
        path, _query = normalize_url_path(self.path)
        if path.startswith(BENCH_PREFIX):
            return self.serve_benchmark_target(path, head_only=True)
        return super().do_HEAD()

    def serve_benchmark_target(self, path, head_only=False):
        rest = path[len(BENCH_PREFIX) :]
        parts = [part for part in rest.split("/") if part]
        if not parts:
            return self.send_error(404, "Missing benchmark target")

        target = parts[0]
        rel_parts = parts[1:] or ["index.html"]
        rel_path = Path(*rel_parts)

        source_root = self.repo_root if target == "current" else self.compare_root / target
        source_root = source_root.resolve()
        source_path = (source_root / rel_path).resolve()
        if not is_inside(source_path, source_root):
            return self.send_error(403, "Forbidden")
        if source_path.is_dir():
            source_path = source_path / "index.html"
        if not source_path.exists() or not source_path.is_file():
            return self.send_error(404, "File not found")

        if source_path.name.lower() == "index.html":
            return self.serve_instrumented_index(source_path, head_only)
        return self.serve_file(source_path, head_only)

    def serve_file(self, source_path, head_only=False):
        content_type = mimetypes.guess_type(str(source_path))[0] or "application/octet-stream"
        data = source_path.read_bytes()
        self.send_response(200)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(data)))
        self.send_header("Cache-Control", "public, max-age=3600")
        self.end_headers()
        if not head_only:
            self.wfile.write(data)

    def serve_instrumented_index(self, source_path, head_only=False):
        raw = source_path.read_bytes()
        try:
            document = raw.decode("utf-8")
            charset = "utf-8"
        except UnicodeDecodeError:
            document = raw.decode("utf-8", errors="replace")
            charset = "utf-8"
        data = inject_probe(document).encode(charset)
        self.send_response(200)
        self.send_header("Content-Type", "text/html; charset=" + html.escape(charset))
        self.send_header("Content-Length", str(len(data)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        if not head_only:
            self.wfile.write(data)

    def start_real_browser_job(self, query):
        params = parse_qs(query)
        try:
            cold_runs = max(1, min(200, int(params.get("coldRuns", ["5"])[0])))
            warm_runs = max(1, min(200, int(params.get("warmRuns", params.get("runs", ["50"]))[0])))
            timeout = max(1, min(60, int(params.get("timeout", ["8"])[0])))
        except ValueError:
            return self.send_json({"ok": False, "error": "Invalid benchmark numbers"}, status=400)
        versions = params.get("versions", ["v3.1.4"])[0]
        browser_ntp = params.get("browserNtp", ["0"])[0].lower() in ("1", "true", "yes", "on")
        if not re.fullmatch(r"[A-Za-z0-9._,-]+", versions):
            return self.send_json({"ok": False, "error": "Invalid benchmark version list"}, status=400)
        script = self.compare_root / "_tool" / "real-browser-benchmark.js"
        job_id = uuid.uuid4().hex
        job_dir = (self.server.job_root / job_id).resolve()
        job_dir.mkdir(parents=True, exist_ok=True)
        cmd = [
            "node",
            str(script),
            "--cold-runs",
            str(cold_runs),
            "--warm-runs",
            str(warm_runs),
            "--timeout",
            str(timeout),
            "--versions",
            str(versions),
            "--job-id",
            job_id,
            "--job-dir",
            str(job_dir),
        ]
        if browser_ntp:
            cmd.append("--browser-ntp")
        try:
            process = subprocess.Popen(
                cmd,
                cwd=str(self.repo_root),
                stdout=subprocess.PIPE,
                stderr=subprocess.STDOUT,
                text=True,
                bufsize=1,
            )
            with self.server.jobs_lock:
                self.server.jobs[job_id] = {"dir": job_dir, "process": process}
            thread = threading.Thread(
                target=self.relay_job_output,
                args=(job_id, process, job_dir),
                daemon=True,
            )
            thread.start()
            print("[Benchmark] Started job %s: versions=%s, coldRuns=%s, warmRuns=%s, timeout=%ss, browserNtp=%s" % (job_id[:8], versions, cold_runs, warm_runs, timeout, browser_ntp), flush=True)
            return self.send_json({"ok": True, "jobId": job_id})
        except Exception as error:
            return self.send_json({"ok": False, "error": str(error)}, status=500)

    def relay_job_output(self, job_id, process, job_dir):
        lines = []
        try:
            if process.stdout:
                for line in process.stdout:
                    clean = line.rstrip()
                    if clean:
                        lines.append(clean)
                        print("[Benchmark %s] %s" % (job_id[:8], clean), flush=True)
            code = process.wait()
            if code != 0:
                try:
                    current = read_latest_job_status(job_dir) or {}
                except Exception:
                    current = {}
                if current.get("state") != "error":
                    current.update({
                        "ok": False,
                        "jobId": job_id,
                        "state": "error",
                        "error": "\n".join(lines[-12:]) or "Real browser benchmark failed",
                        "message": "真实浏览器测试失败。",
                    })
                    write_job_status(job_dir, current)
            print("[Benchmark %s] Finished with exit code %s" % (job_id[:8], code), flush=True)
        finally:
            with self.server.jobs_lock:
                job = self.server.jobs.get(job_id)
                if job:
                    job["returncode"] = process.returncode

    def serve_job_resource(self, path):
        rest = path[len(API_JOB_PREFIX):]
        parts = [part for part in rest.split("/") if part]
        if len(parts) < 2 or not re.fullmatch(r"[A-Fa-f0-9]{32}", parts[0]):
            return self.send_json({"ok": False, "error": "Invalid job path"}, status=404)
        job_id = parts[0]
        with self.server.jobs_lock:
            job = self.server.jobs.get(job_id)
        if not job:
            return self.send_json({"ok": False, "error": "Benchmark job not found"}, status=404)
        if parts[1] == "status" and len(parts) == 2:
            status = read_latest_job_status(job["dir"])
            if not status:
                return self.send_json({"ok": True, "jobId": job_id, "state": "starting"})
            return self.send_json(status)
        if parts[1] == "preview" and len(parts) == 3:
            filename = parts[2]
            if not re.fullmatch(r"preview_[A-Za-z0-9._-]+\.jpg", filename):
                return self.send_error(404, "Preview not found")
            preview = (job["dir"] / filename).resolve()
            if not is_inside(preview, job["dir"]) or not preview.exists():
                return self.send_error(404, "Preview not found")
            return self.serve_file(preview)
        return self.send_json({"ok": False, "error": "Job resource not found"}, status=404)

    def send_json(self, payload, status=200):
        data = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(data)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(data)


def main():
    parser = argparse.ArgumentParser(description="PlainTab benchmark HTTP server")
    parser.add_argument("--bind", default="127.0.0.1")
    parser.add_argument("--port", type=int, default=8014)
    parser.add_argument("--root", default=os.getcwd())
    args = parser.parse_args()

    root = Path(args.root).resolve()
    handler = lambda *handler_args, **handler_kwargs: BenchmarkHandler(
        *handler_args, directory=str(root), **handler_kwargs
    )
    server = ThreadingHTTPServer((args.bind, args.port), handler)
    server.job_root = Path(tempfile.mkdtemp(prefix="plaintab-benchmark-jobs-")).resolve()
    server.jobs = {}
    server.jobs_lock = threading.Lock()
    print("Serving PlainTab benchmark at http://%s:%s/" % (args.bind, args.port), flush=True)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()
        shutil.rmtree(server.job_root, ignore_errors=True)


if __name__ == "__main__":
    sys.exit(main())

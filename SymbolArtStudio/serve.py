"""Serve Symbol Art Studio and dynamically list sample/**/*.sar.
Python 3.8+, standard library only. Binds exclusively to loopback.
Modified 2026-09-29; GPL-3.0-or-later.
"""
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlsplit, unquote
import argparse
import json
import webbrowser

ROOT = Path(__file__).resolve().parent
SAMPLE = ROOT / 'sample'


def sample_files():
    SAMPLE.mkdir(exist_ok=True)
    base = SAMPLE.resolve()
    return sorted(
        p.relative_to(SAMPLE).as_posix() for p in SAMPLE.rglob('*')
        if p.is_file() and p.suffix.lower() == '.sar' and base in p.resolve().parents
    )


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def do_GET(self):
        path = urlsplit(self.path).path
        if path == '/':
            self.send_response(302)
            self.send_header('Location', '/SymbolArtStudio-v1.html')
            self.end_headers()
            return
        if path == '/sample/manifest.json':
            data = json.dumps({'files': sample_files()}, ensure_ascii=False).encode('utf-8')
            self.send_response(200)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.send_header('Content-Length', str(len(data)))
            self.send_header('Cache-Control', 'no-store')
            self.end_headers()
            self.wfile.write(data)
            return
        # Do not serve symlinks escaping the project folder.
        target = Path(self.translate_path(unquote(path))).resolve()
        if target != ROOT and ROOT not in target.parents:
            self.send_error(403)
            return
        super().do_GET()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--port', type=int, default=8765)
    parser.add_argument('--no-browser', action='store_true')
    parser.add_argument('--manifest', action='store_true', help='Regenerate manifest for static hosting, then exit')
    args = parser.parse_args()
    if args.manifest:
        (SAMPLE / 'manifest.json').write_text(json.dumps({'files': sample_files()}, ensure_ascii=False, indent=2), encoding='utf-8')
        print('Updated sample/manifest.json')
        return
    try:
        server = ThreadingHTTPServer(('127.0.0.1', args.port), Handler)
    except OSError as error:
        parser.exit(1, f'Cannot start server: {error}\nTry: python serve.py --port 8766\n')
    url = f'http://127.0.0.1:{server.server_port}/SymbolArtStudio-v1.html'
    print(f'Symbol Art Studio: {url}\nSample folder: {SAMPLE}\nPress Ctrl+C to stop.', flush=True)
    if not args.no_browser:
        webbrowser.open(url)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()


if __name__ == '__main__':
    main()

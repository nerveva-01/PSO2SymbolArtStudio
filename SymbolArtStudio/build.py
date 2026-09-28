"""Build the standalone HTML from src. Python 3; no dependencies."""
from pathlib import Path
import re
ROOT = Path(__file__).resolve().parent

def build():
    html = (ROOT / 'src/index.template.html').read_text(encoding='utf-8')
    def embed(match):
        kind, name = match.groups()
        tag, ext = ('script', 'js') if kind == 'SCRIPT' else ('style', 'css')
        text = (ROOT / 'src' / f'{name}.{ext}').read_text(encoding='utf-8')
        return f'<{tag}>\n{text}</{tag}>'
    html = re.sub(r'\{\{(SCRIPT|STYLE):([\w-]+)\}\}', embed, html)
    target = ROOT / 'SymbolArtStudio-v1.html'
    target.write_text(html, encoding='utf-8')
    print(f'Built {target.name} ({target.stat().st_size:,} bytes)')

if __name__ == '__main__':
    build()

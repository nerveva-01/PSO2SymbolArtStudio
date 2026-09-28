#!/usr/bin/env python3
"""Build the self-contained offline HTML. Python standard library only."""
import json
from pathlib import Path
root=Path(__file__).resolve().parent
parts={'I18N':'i18n.js','STYLE':'style.css','VENDOR':'vendor/BlowfishCrypto.js','CODEC':'codec.js','ASSETS':'assets.js','RENDERER':'renderer.js','APP':'app.js'}
html=(root/'index.template.html').read_text()
for name,filename in parts.items():
 text=(root/filename).read_text()
 if name=='I18N':text=text.replace('/*CATALOG*/',(root/'locales.json').read_text())
 if name!='STYLE':text=text.replace('</script','<\\/script')
 html=html.replace('/*'+name+'*/',text)
(root/'SymbolArtStudio.html').write_text(html)
print('Built',root/'SymbolArtStudio.html')

# Symbol Art Studio 1.3

[简体中文](README.md) | [English](README.en.md) | [日本語](README.ja.md)

## Features

- **Automatic language selection:** By default, the interface follows the browser's primary language, which usually follows the operating system. Chinese (`zh`, including regional and script variants) uses Simplified Chinese; Japanese (`ja`) uses Japanese; every other language uses English. Only the first language preference is used: secondary Chinese or Japanese preferences do not override another primary language. If no language is available, English is used. Manual selections are remembered. Choose **Auto (system)** to restore automatic selection.
- **Artwork and file names:** Each gallery card displays the artwork name stored inside the SAR and the actual SAR filename separately. Hover to see the full artwork name and relative file path. Blank artwork names appear as “Untitled artwork”; unreadable files still show their filenames.
- **Random sample:** Loads an SAR from the current sample folder. With multiple valid files, it avoids opening the same file twice in a row and skips unreadable files.
- **Sample gallery:** Displays multiple thumbnails, with filename/relative-path search and 24 items per page.
- **Double-click to edit:** Double-click a thumbnail, press Enter, or choose **Open selected** to view and edit the artwork in the original editor. Unsaved changes prompt for confirmation before replacement.
- Wide artwork and alliance flags use their respective game crop areas, without editing handles. Missing assets, invalid files, and empty folders have clear messages.
- Previewing samples does not change the active artwork. Files are processed locally and are not uploaded.

## Recommended: automatically read the sample folder

1. Extract the entire archive.
2. Put your `.sar` files in `sample`. Subfolders and uppercase `.SAR` extensions are supported.
3. With Python 3.8 or newer installed, double-click `start.bat` on Windows, or run `python3 serve.py` on other systems.
4. Click **Random sample** or **Browse samples**. After adding or removing files, click **Refresh list** in the gallery.

The server binds only to `127.0.0.1`; it does not publish your files to the internet. If the port is busy, run `python serve.py --port 8766`. Close the terminal or press Ctrl+C to stop the server.

`sample/original.sar` is the exact sample extracted from the original HTML. It is the only bundled artwork. Add more SAR files to get more thumbnails and random choices.

## No installation: open the HTML directly

Double-click `SymbolArtStudio-v1.html`, then choose **Browse samples → Choose sample folder**. You can also click **Random sample** first and then select the folder to open a random file immediately.

Browser security prevents a local HTML file from automatically scanning neighboring folders on disk. In this mode, select the folder manually; select it again after reloading the page. Folder selection reads files locally, without uploading them. After adding or deleting files, click **Refresh list** and select the folder again.

Use **Export SAR** or **Save project** to download edits. The original files in `sample` are not overwritten automatically. To update an existing gallery file, put the exported file back into `sample` and refresh the list.

## Static hosting

The complete folder can also be served by a static web server. `sample/manifest.json` lists file paths relative to `sample`. After adding files, run `python serve.py --manifest` to regenerate it. The included local launcher generates a current listing dynamically, so manual regeneration is unnecessary in launcher mode. If there is no manifest, the app tries the server's directory index; this fallback lists only the current directory.

## Source code

- `src/editor.js`: Editor and sample-gallery integration.
- `src/samples.js`: Folder discovery/selection, random loading, search, pagination, thumbnail rendering/caching, and gallery translations.
- `src/samples.css`: Gallery styling.
- `src/index.template.html`, `src/styles.css`: Page structure and original editor styles.
- `src/sar.js`, `src/blowfish.js`: SAR decoding/encoding and cipher implementation.
- `src/renderer.js`: Native WebGL renderer.
- `src/i18n.js`: Original interface translations and automatic language selection.
- `src/assets.js`: Embedded symbol assets and license text.
- `build.py`: Builds the standalone HTML by embedding the source modules; no npm or external dependencies are required.
- `serve.py`, `start.bat`: Local launcher and automatic sample-folder listing.

After editing `src`, run `python build.py`. The resulting HTML contains readable source code and can be opened on its own. Use a modern desktop browser with WebGL support. Folder selection requires the browser's directory-picker support.

The gallery shows up to 24 files per page, caches at most 120 thumbnails and 64 parsed artworks, and reuses one preview WebGL context. Artwork data is deep-copied before editing so changes do not corrupt the sample cache.

## License

Source code is distributed under GPL-3.0-or-later. See `LICENSE` for the full license and `THIRD_PARTY.md` for attribution. Game assets remain the property of their respective rights holders. Original source notices are retained.

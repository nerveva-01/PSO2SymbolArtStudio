/* Symbol Art Studio 1.3 sample browser, modified 2026-09-29.
 * GPL-3.0-or-later. One reusable WebGL renderer; bounded preview caches.
 */
(() => {
'use strict';
const messages = {
 '随机加载示例':['Random sample','サンプルをランダム読込'],
 '浏览示例':['Browse samples','サンプル一覧'],
 'SAR 示例图库':['SAR sample gallery','SAR サンプル一覧'],
 '选择 sample 文件夹':['Choose sample folder','sample フォルダーを選択'],
 '刷新列表':['Refresh list','一覧を更新'],
 '打开所选文件':['Open selected','選択して開く'],
 '搜索文件名或路径':['Search filename or path','ファイル名・パスを検索'],
 '上一页':['Previous','前へ'], '下一页':['Next','次へ'],
 '单击选择，双击打开查看 / 编辑。':['Select a card; double-click to view / edit.','クリックで選択、ダブルクリックで表示・編集。'],
 '本地 HTML 请先选择 sample 文件夹；本地启动模式会自动读取同目录 sample。':['For a local HTML file, choose the sample folder first. The launcher reads the adjacent sample folder automatically.','HTML を直接開いた場合は sample フォルダーを選択してください。ローカル起動時は同じ階層の sample を自動読込します。'],
 '正在查找 sample 文件夹…':['Finding the sample folder…','sample フォルダーを検索中…'],
 '请选择包含 SAR 的 sample 文件夹。':['Choose a sample folder containing SAR files.','SAR ファイルを含む sample フォルダーを選択してください。'],
 '正在读取…':['Loading…','読み込み中…'],
 '尚未生成预览':['Preview pending','プレビュー待機中'],
 '没有匹配的 SAR 文件':['No matching SAR files','一致する SAR ファイルがありません'],
 '此文件夹中没有 SAR 文件。':['This folder contains no SAR files.','このフォルダーには SAR ファイルがありません。'],
 '无法自动读取 sample，请选择文件夹。':['Could not read sample automatically. Choose a folder.','sample を自動読込できません。フォルダーを選択してください。'],
 '所选文件夹':['Selected folder','選択したフォルダー'],
 '同目录 sample':['Adjacent sample folder','同じ階層の sample'],
 '{source} · {count} 个 SAR · 显示 {shown} 个 · 已发现 {errors} 个无效文件':['{source} · {count} SAR files · {shown} matches · {errors} invalid files found','{source} · SAR {count} 件 · 該当 {shown} 件 · 無効 {errors} 件'],
 '第 {page} / {pages} 页':['Page {page} / {pages}','{page} / {pages} ページ'],
 '{count} 个图层':['{count} layers','{count} レイヤー'],
 '缺少素材 {ids}':['Missing assets {ids}','不足素材 {ids}'],
 '预览失败：{error}':['Preview failed: {error}','プレビュー失敗：{error}'],
 '没有可加载的有效 SAR 文件，请检查文件后刷新。':['No valid SAR files could be loaded. Check the files and refresh.','有効な SAR がありません。ファイルを確認して更新してください。'],
 '已随机加载 {file} · {count} 个图层':['Random sample: {file} · {count} layers','ランダム読込：{file} · {count} レイヤー'],
 '已跳过 {count} 个无法读取的文件。':['Skipped {count} unreadable files.','読込できないファイルを {count} 件スキップしました。'],
 '新建空白作品；可随机加载 sample 或浏览示例。':['Blank artwork. Load a random sample or browse samples.','新規作品です。ランダム読込またはサンプル一覧をご利用ください。'],
 '目录清单格式无效':['Invalid folder manifest','フォルダー一覧の形式が無効です'],
 '文件路径无效':['Invalid file path','ファイルパスが無効です'],
 '读取文件失败（{code}）':['File request failed ({code})','ファイル読込失敗（{code}）'],
 '刷新本地目录需重新选择文件夹。':['Select the folder again to refresh its contents.','更新するにはフォルダーをもう一度選択してください。'],
 '空白 SAR':['Empty SAR','空の SAR'],
 '作品名：{name}':['Artwork: {name}','作品名：{name}'],
 '文件名：{name}':['File: {name}','ファイル名：{name}'],
 '无法读取作品名':['Artwork name unavailable','作品名を読み込めません']
};
for (const [key, [en, ja]] of Object.entries(messages)) I18N.catalog[key] = {en, ja};
I18N.apply();
const t = (key, params) => I18N.t(key, params);
const el = id => document.getElementById(id);
function frame(art) {
 const [w,h] = art.width === 64 ? [31,31] : [191,95];
 return [127-w/2,127-h/2,w,h];
}
class SampleBrowser {
 constructor({openArt, report}) {
  this.openArt = openArt; this.report = report;
  this.entries = []; this.source = ''; this.mode = ''; this.page = 0;
  this.pageSize = 24; this.selected = null; this.lastOpened = null;
  this.revision = 0; this.paintGeneration = 0; this.discoveryGeneration = 0;
  this.artCache = new Map(); this.thumbCache = new Map();
  this.paintQueue = Promise.resolve(); this.discovery = null;
  this.busy = false; this.pendingRandom = false;
  el('browseSamples').onclick = () => this.show();
  el('sample').onclick = () => this.random();
  el('sampleChoose').onclick = () => el('sampleFolder').click();
  el('sampleFolder').onchange = async event => {
   const files = [...event.target.files]; event.target.value = '';
   if (!files.length) { this.pendingRandom = false; return; }
   ++this.discoveryGeneration;
   const folderName = files[0].webkitRelativePath.split('/')[0];
   const entries = files.filter(f => /\.sar$/i.test(f.name)).map(file => ({
    path: file.webkitRelativePath || file.name, file
   }));
   this.setEntries(entries, folderName || '所选文件夹', 'local');
   if (!entries.length) this.message('此文件夹中没有 SAR 文件。');
   const random = this.pendingRandom; this.pendingRandom = false;
   if (random && entries.length) await this.random();
  };
  el('sampleFolder').addEventListener('cancel', () => {this.pendingRandom = false;});
  el('sampleRefresh').onclick = () => {
   this.pendingRandom = false;
   if (this.mode === 'local' || location.protocol === 'file:') {
    this.message('刷新本地目录需重新选择文件夹。'); el('sampleFolder').click();
   } else this.discover(true);
  };
  el('sampleRandom').onclick = () => this.random();
  el('closeSamples').onclick = () => el('sampleDialog').close();
  el('sampleDialog').addEventListener('close', () => {++this.paintGeneration; this.pendingRandom = false;});
  el('sampleSearch').oninput = () => {this.page = 0; this.render();};
  el('samplePrev').onclick = () => {--this.page; this.render();};
  el('sampleNext').onclick = () => {++this.page; this.render();};
  el('sampleOpen').onclick = () => {if (this.selected) this.open(this.selected);};
 }
 message(key, params) {el('sampleMessage').textContent = t(key, params);}
 setEntries(entries, source, mode) {
  ++this.revision; ++this.paintGeneration;
  this.entries = [...new Map(entries.map(entry => [entry.path, entry])).values()]
   .sort((a,b) => a.path.localeCompare(b.path, undefined, {numeric:true}));
  this.source = source; this.mode = mode; this.page = 0; this.selected = null;
  this.artCache.clear(); this.thumbCache.clear();
  el('sampleSearch').value = ''; this.message('单击选择，双击打开查看 / 编辑。');
  this.render();
 }
 async show() {
  if (!el('sampleDialog').open) el('sampleDialog').showModal();
  this.render();
  if (!this.mode) await this.discover();
 }
 async fetchBytes(url) {
  const response = await fetch(url, {cache:'no-store', signal:AbortSignal.timeout(15000)});
  if (!response.ok) throw Error(t('读取文件失败（{code}）', {code:response.status}));
  if (Number(response.headers.get('Content-Length')) > 1048576) throw Error(t('文件过大（上限 1 MB）'));
  const data = await response.arrayBuffer();
  if (data.byteLength > 1048576) throw Error(t('文件过大（上限 1 MB）'));
  return new Uint8Array(data);
 }
 async discover(force = false) {
  if (location.protocol === 'file:') {this.message('请选择包含 SAR 的 sample 文件夹。'); return;}
  if (this.discovery && !force) return this.discovery;
  const generation = ++this.discoveryGeneration;
  this.message('正在查找 sample 文件夹…');
  const task = (async () => {
   try {
    const base = new URL('./sample/', location.href);
    let paths;
    try {
     const response = await fetch(new URL('manifest.json', base), {cache:'no-store', signal:AbortSignal.timeout(8000)});
     if (!response.ok) throw Error('manifest unavailable');
     const manifest = await response.json(); paths = Array.isArray(manifest) ? manifest : manifest.files;
     if (!Array.isArray(paths) || !paths.every(p => typeof p === 'string')) throw Error(t('目录清单格式无效'));
    } catch {
     // A plain static server may expose a directory listing instead of a manifest.
     const response = await fetch(base, {cache:'no-store', signal:AbortSignal.timeout(8000)});
     if (!response.ok) throw Error(t('读取文件失败（{code}）', {code:response.status}));
     const doc = new DOMParser().parseFromString(await response.text(), 'text/html');
     paths = [...doc.querySelectorAll('a[href]')].map(a => {
      const url = new URL(a.getAttribute('href'), base);
      return url.origin === base.origin && url.pathname.startsWith(base.pathname)
       ? decodeURIComponent(url.pathname.slice(base.pathname.length)) : '';
     }).filter(p => /\.sar$/i.test(p));
     if (!paths.length) throw Error(t('无法自动读取 sample，请选择文件夹。'));
    }
    const entries = paths.filter(p => /\.sar$/i.test(p)).map(path => {
     const parts = path.split('/');
     if (parts.some(p => !p || p === '.' || p === '..' || p.includes('\\')) || path.includes('\0')) throw Error(t('文件路径无效'));
     return {path, url:new URL(parts.map(encodeURIComponent).join('/'), base).href};
    });
    if (generation !== this.discoveryGeneration) return;
    this.setEntries(entries, '同目录 sample', 'http');
    if (!entries.length) this.message('此文件夹中没有 SAR 文件。');
   } catch (error) {
    if (generation === this.discoveryGeneration) {
     this.message('无法自动读取 sample，请选择文件夹。');
     el('sampleMessage').title = error.message;
    }
   }
  })();
  this.discovery = task;
  try {await task;} finally {if(this.discovery === task) this.discovery = null;}
 }
 cache(map, key, value, limit) {
  map.delete(key); map.set(key, value);
  while (map.size > limit) map.delete(map.keys().next().value);
  return value;
 }
 async read(entry) {
  if (this.artCache.has(entry)) return this.artCache.get(entry);
  if (entry.file?.size > 1048576) throw Error(t('文件过大（上限 1 MB）'));
  const bytes = entry.file ? new Uint8Array(await entry.file.arrayBuffer()) : await this.fetchBytes(entry.url);
  const art = SAR.validate(SAR.parse(bytes));
  return this.cache(this.artCache, entry, art, 64);
 }
 filtered() {
  const query = el('sampleSearch').value.trim().toLocaleLowerCase();
  return this.entries.filter(entry => entry.path.toLocaleLowerCase().includes(query));
 }
 summary(shown = this.filtered().length) {
  el('sampleSummary').textContent = t('{source} · {count} 个 SAR · 显示 {shown} 个 · 已发现 {errors} 个无效文件', {
   source:t(this.source || '所选文件夹'), count:this.entries.length, shown,
   errors:this.entries.filter(e => e.error).length
  });
 }
 select(entry) {
  this.selected = entry;
  el('sampleGrid').querySelectorAll('.sample-card').forEach(card => {
   const active = card.dataset.path === entry.path;
   card.classList.toggle('selected', active); card.setAttribute('aria-pressed', String(active));
  });
  el('sampleOpen').disabled = this.busy || !!entry.error;
  el('sampleSelection').textContent = entry.path;
 }
 render() {
  const generation = ++this.paintGeneration, revision = this.revision;
  const entries = this.filtered(), pages = Math.max(1, Math.ceil(entries.length / this.pageSize));
  this.page = Math.max(0, Math.min(this.page, pages-1));
  const grid = el('sampleGrid'); grid.replaceChildren(); grid.scrollTop = 0;
  el('samplePrev').disabled = this.page === 0; el('sampleNext').disabled = this.page >= pages-1;
  el('samplePage').textContent = t('第 {page} / {pages} 页', {page:this.page+1, pages});
  el('sampleOpen').disabled = this.busy || !this.selected || !!this.selected.error;
  el('sampleSelection').textContent = this.selected?.path || '';
  this.summary(entries.length);
  if (!entries.length) {const empty = document.createElement('p'); empty.className='sample-empty'; empty.textContent=t('没有匹配的 SAR 文件'); grid.append(empty); return;}
  const cards = entries.slice(this.page*this.pageSize, (this.page+1)*this.pageSize).map(entry => {
   const card = document.createElement('button'); card.type = 'button'; card.className = 'sample-card';
   card.dataset.path = entry.path; card.title = entry.path;
   card.setAttribute('aria-pressed', String(entry === this.selected));
   card.classList.toggle('selected', entry === this.selected);
   const picture = document.createElement('div'); picture.className = 'sample-picture';
   const image = new Image(); image.alt = entry.path; image.hidden = true;
   const state = document.createElement('span'); state.textContent = t('尚未生成预览');
   picture.append(image,state);
   const label = document.createElement('strong'); label.className = 'sample-artwork-name'; label.textContent = t('正在读取…');
   const filename = document.createElement('span'); filename.className = 'sample-filename';
   filename.textContent = t('文件名：{name}', {name:entry.path.split('/').pop()}); filename.title = entry.path;
   const info = document.createElement('small'); info.textContent = t('正在读取…');
   card.append(picture,label,filename,info); grid.append(card);
   card.onclick = () => this.select(entry);
   card.ondblclick = () => this.open(entry);
   card.onkeydown = event => {if (event.key === 'Enter') {event.preventDefault(); this.open(entry);}};
   return {entry,card,image,state,label,info};
  });
  if (!el('sampleDialog').open) return;
  // Serialize all preview rendering to avoid cross-contaminating a shared canvas.
  this.paintQueue = this.paintQueue.catch(() => {}).then(async () => {
   for (const item of cards) {
    if (generation !== this.paintGeneration || !el('sampleDialog').open) return;
    const {entry,card,image,state,label,info} = item;
    try {
     let preview = this.thumbCache.get(entry);
     if (!preview) {
      const art = await this.read(entry);
      if (generation !== this.paintGeneration) return;
      if (!this.previewRenderer) this.previewRenderer = new ArtRenderer(document.createElement('canvas'));
      const r = this.previewRenderer; r.canvas.width = 384; r.canvas.height = art.width === 64 ? 384 : 192;
      await r.load(art.layers.map(layer => layer.texture));
      if (generation !== this.paintGeneration) return;
      r.render(art, frame(art));
      preview = {url:r.canvas.toDataURL('image/png'), count:art.layers.length, name:art.name.replace(/\0/g,'').trim(),
       missing:[...new Set(art.layers.filter(l => l.visible && !ASSETS[l.texture]).map(l => l.texture))]};
      this.cache(this.thumbCache, entry, preview, 120);
     }
     image.src = preview.url; image.hidden = false; state.hidden = true;
     const artworkName = preview.name || t('未命名作品');
     label.textContent = t('作品名：{name}', {name:artworkName}); label.title = artworkName;
     image.alt = artworkName;
     card.title = t('作品名：{name}', {name:artworkName}) + '\n' + t('文件名：{name}', {name:entry.path});
     info.textContent = t('{count} 个图层', {count:preview.count}) + (preview.missing.length ? ' · '+t('缺少素材 {ids}', {ids:preview.missing.join(', ')}) : '');
     info.classList.toggle('sample-warning', !!preview.missing.length);
     delete entry.error;
    } catch(error) {
     if (revision !== this.revision) return;
     entry.error = error.message;
     if (generation !== this.paintGeneration) return;
     card.classList.add('sample-error'); state.textContent = '!'; label.textContent = t('无法读取作品名');
     info.textContent = t('预览失败：{error}', {error:error.message});
     if (this.selected === entry) el('sampleOpen').disabled = true;
    }
    this.summary();
    await new Promise(resolve => setTimeout(resolve, 0));
   }
  });
 }
 setBusy(value) {
  this.busy = value;
  for (const id of ['sample','sampleRandom','sampleRefresh','sampleChoose']) el(id).disabled = value;
  el('sampleOpen').disabled = value || !this.selected || !!this.selected.error;
 }
 async open(entry, random = false) {
  if (this.busy) return false;
  this.setBusy(true);
  try {
   const art = await this.read(entry);
   const message = t(random ? '已随机加载 {file} · {count} 个图层' : '已打开 {file} · {count} 个图层', {file:entry.path, count:art.layers.length});
   const opened = await this.openArt(JSON.parse(JSON.stringify(art)), message);
   if (opened) {this.lastOpened = entry.path; el('sampleDialog').close();}
   return opened;
  } catch(error) {
   entry.error = error.message;
   this.message('预览失败：{error}', {error:error.message}); this.report(t('预览失败：{error}', {error:error.message}));
   this.summary(); return false;
  } finally {this.setBusy(false);}
 }
 async random() {
  if (this.busy) return;
  if (!this.mode) {
   await this.show();
   if (!this.mode) {this.pendingRandom = true; this.message('请选择包含 SAR 的 sample 文件夹。'); return;}
  }
  const candidates = this.entries.filter(entry => !entry.error);
  // Shuffle without replacement; avoid the previously opened file when possible.
  for (let i=candidates.length-1; i>0; i--) {const j=Math.floor(Math.random()*(i+1)); [candidates[i],candidates[j]]=[candidates[j],candidates[i]];}
  if (candidates.length>1 && candidates[0].path===this.lastOpened) candidates.push(candidates.shift());
  let skipped = 0;
  for (const entry of candidates) {
   if (await this.open(entry, true)) {
    if (skipped) this.report(t('已随机加载 {file} · {count} 个图层', {file:entry.path,count:this.artCache.get(entry)?.layers.length || 0})+' · '+t('已跳过 {count} 个无法读取的文件。',{count:skipped}));
    return;
   }
   if (!entry.error) return; // User cancelled replacement; do not ask again.
   skipped++;
  }
  await this.show(); this.message('没有可加载的有效 SAR 文件，请检查文件后刷新。');
 }
}
window.SampleBrowser = SampleBrowser;
})();

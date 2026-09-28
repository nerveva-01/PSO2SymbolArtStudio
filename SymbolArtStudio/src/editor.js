/* Symbol Art Studio editor, 2026-09-28. GPL-3.0-or-later. */
'use strict';
const tr=(key,params)=>I18N.t(key,params);
const $=id=>document.getElementById(id),clone=o=>JSON.parse(JSON.stringify(o));
let art,selected=-1,history=[],future=[],dirty=false,full=false,assetMode='add',drag=null,draftTimer=null,loadGeneration=0,localStateKey='本地处理';
let renderer;try{renderer=new ArtRenderer($('art'))}catch(e){$('status').textContent=e.message;alert(e.message);throw e}
const overlay=$('overlay'),ctx=overlay.getContext('2d');
const STORE='symbol-art-studio-v1',POINT_NAMES=['左上','左下','右上','右下'];
const dimensions=()=>art.width===64?[31,31]:[191,95];
const gameBox=()=>{let [w,h]=dimensions();return [127-w/2,127-h/2,w,h]};
const box=()=>full?[0,0,255,255]:gameBox();
const layer=()=>art?.layers[selected];
const center=l=>[0,1].map(k=>l.points.reduce((n,p)=>n+p[k],0)/4);
function status(s){$('status').textContent=s}
function fail(e){status(tr('操作失败：')+e.message);alert(e.message)}
function saveDraft(){clearTimeout(draftTimer);draftTimer=setTimeout(()=>{try{localStorage.setItem(STORE,JSON.stringify({art,selected}));localStateKey='草稿已保存';$('localState').textContent=tr(localStateKey)}catch{localStateKey='请下载保存';$('localState').textContent=tr(localStateKey)}},500)}
function remember(){history.push({art:clone(art),selected});if(history.length>80)history.shift();future=[];dirty=true}
function commit(message){SAR.validate(art);update();saveDraft();status(message||tr('修改完成'))}
function change(fn,msg){const before=clone(art),old=selected;try{remember();fn();SAR.validate(art);commit(msg)}catch(e){art=before;selected=old;history.pop();update();fail(e)}}
function undo(){if(!history.length)return;future.push({art:clone(art),selected});let s=history.pop();art=s.art;selected=s.selected;dirty=true;update();saveDraft();status(tr('已撤销'))}
function redo(){if(!future.length)return;history.push({art:clone(art),selected});let s=future.pop();art=s.art;selected=s.selected;dirty=true;update();saveDraft();status(tr('已重做'))}
function select(i){selected=i;update();$('layers').querySelector('.selected')?.scrollIntoView({block:'nearest'})}
function checkMissing(){const ids=[...new Set(art.layers.filter(x=>x.visible&&!ASSETS[x.texture]).map(x=>x.texture))];$('missing').hidden=!ids.length;$('missing').textContent=tr('缺少符号素材：')+ids.map(i=>'#'+i).join('、')+tr('。这些图层当前不渲染，但所有数据会保留在 SAR / 工程中。')}
async function loadArt(a,message){SAR.validate(a);const generation=++loadGeneration;await renderer.load(a.layers.map(l=>l.texture));if(generation!==loadGeneration)return;clearTimeout(draftTimer);art=a;selected=-1;history=[];future=[];dirty=false;$('solo').checked=false;update();status(message)}
function readProject(text){let a;try{a=JSON.parse(text)}catch{throw Error(tr('JSON 工程格式无效，请检查文件内容'))}return SAR.validate(a)}
async function openFile(file){if(!file)return;try{if(file.size>1048576)throw Error(tr('文件过大（上限 1 MB）'));let a=/\.json$/i.test(file.name)?readProject(await file.text()):SAR.parse(new Uint8Array(await file.arrayBuffer()));if(dirty&&!confirm(tr('当前修改尚未导出。打开新文件并替换当前作品？')))return;await loadArt(a,tr('已打开 {file} · {count} 个图层',{file:file.name,count:a.layers.length}))}catch(e){fail(e)}finally{$('file').value=''}}
function update(){
 if(!art)return;
 $('localState').textContent=tr(localStateKey);
 $('docTitle').textContent=(art.name.replace(/\0/g,'')||tr('未命名作品'))+(dirty?' *':'');
 $('docInfo').textContent=art.layers.length+tr(' 个图层 · ')+(art.width===64?tr('32 × 32 联盟旗帜'):'192 × 96 Symbol Art')+tr(' · 作者 ID ')+art.authorId;
 $('count').textContent=art.layers.length+'/225';$('undo').disabled=!history.length;$('redo').disabled=!future.length;$('add').disabled=art.layers.length>=225;
 $('name').value=art.name.replace(/\0/g,'');$('format').value=art.width===64?'flag':'wide';$('sound').value=art.sound;
 const list=$('layers'),scroll=list.scrollTop;list.replaceChildren();art.layers.forEach((l,i)=>{
  const row=document.createElement('div');row.className='layer'+(i===selected?' selected':'')+(!l.visible?' off':'');row.setAttribute('role','option');row.setAttribute('aria-selected',String(i===selected));row.tabIndex=0;
  const im=new Image();if(ASSETS[l.texture])im.src=ASSETS[l.texture];im.alt='';
  const text=document.createElement('div');text.className='layer-text';const title=document.createElement('strong');title.textContent=l.label||tr('图层 ')+String(i+1).padStart(3,'0');
  const sub=document.createElement('small'),sw=document.createElement('span');sw.className='swatch';sw.style.background=SAR.hex(l);sub.append(sw,document.createTextNode('#'+l.texture+' · '+Math.round(SAR.ALPHAS[l.opacity]*100)+'%'));text.append(title,sub);
  const eye=document.createElement('button');eye.className='eye';eye.textContent=l.visible?'◉':'○';eye.title=l.visible?tr('隐藏图层'):tr('显示图层');eye.setAttribute('aria-label',eye.title+' '+(i+1));eye.onclick=e=>{e.stopPropagation();change(()=>{l.visible=!l.visible},tr('已修改图层可见性'))};
  row.append(im,text,eye);row.onclick=()=>select(i);row.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();select(i)}};row.ondblclick=()=>{let name=prompt(tr('图层名称（仅保存在 JSON 工程中）'),l.label||tr('图层 ')+(i+1));if(name!==null)change(()=>l.label=name.slice(0,60),tr('图层已重命名'))};list.append(row)
 });list.scrollTop=scroll;
 const l=layer();$('properties').hidden=!l;$('emptyProperties').hidden=!!l;$('properties').querySelectorAll('input,button').forEach(e=>e.disabled=!l);
 for(const id of ['duplicate','delete','up','down'])$(id).disabled=!l;
 $('duplicate').disabled=!l||art.layers.length>=225;$('up').disabled=!l||selected===0;$('down').disabled=!l||selected===art.layers.length-1;
 $('selectedId').textContent=l?'#'+(selected+1):tr('请选择图层');
 if(l){$('symbolPreview').src=ASSETS[l.texture]||'';$('symbolLabel').textContent=tr('符号 #')+l.texture;$('visible').checked=l.visible;$('color').value=SAR.hex(l);$('hex').textContent=SAR.hex(l);$('opacity').value=l.opacity;$('alphaLabel').textContent=Math.round(SAR.ALPHAS[l.opacity]*100)+'%';let c=center(l);$('cx').value=c[0];$('cy').value=c[1];}
 $('points').replaceChildren();if(l)l.points.forEach((p,i)=>{let row=document.createElement('div');row.className='point';let label=document.createElement('span');label.textContent=tr(POINT_NAMES[i]);row.append(label);p.forEach((value,k)=>{let input=document.createElement('input');input.type='number';input.min=0;input.max=255;input.value=value;input.setAttribute('aria-label',tr(POINT_NAMES[i])+' '+(k?'Y':'X'));input.onchange=()=>change(()=>{let n=Number(input.value);if(!Number.isInteger(n)||n<0||n>255)throw Error(tr('顶点坐标必须是 0–255 的整数'));l.points[i][k]=n},tr('已修改顶点'));row.append(input)});$('points').append(row)});
 checkMissing();render();
}
function render(){if(!art)return;const b=box(),area=$('stageArea'),maxW=area.clientWidth-56,maxH=area.clientHeight-72;let w=Math.max(120,Math.min(maxW,maxH*b[2]/b[3])),h=w*b[3]/b[2];const stage=$('stage');stage.style.width=w+'px';stage.style.height=h+'px';const dpr=Math.min(devicePixelRatio||1,2);for(const c of [$('art'),overlay]){if(c.width!==Math.round(w*dpr)||c.height!==Math.round(h*dpr)){c.width=Math.round(w*dpr);c.height=Math.round(h*dpr)}}renderer.render(art,b,$('solo').checked?selected:-1);drawOverlay();$('viewLabel').textContent=full?tr('完整工作区 · 0–255'):tr('游戏画幅 · ')+(art.width===64?'32 × 32':'192 × 96');}
function drawOverlay(){const b=box(),sx=overlay.width/b[2],sy=overlay.height/b[3],ratio=overlay.width/overlay.clientWidth;ctx.clearRect(0,0,overlay.width,overlay.height);ctx.save();ctx.setTransform(sx,0,0,sy,-b[0]*sx,-b[1]*sy);ctx.lineWidth=1.3*ratio/sx;
 if(full){const c=gameBox();ctx.setLineDash([4*ratio/sx,4*ratio/sx]);ctx.strokeStyle='#71eab4';ctx.strokeRect(...c);ctx.setLineDash([])}
 const l=layer();if(l&&$('outline').checked){const p=l.points;ctx.strokeStyle='#8fe7ac';ctx.fillStyle='#0d2217';ctx.shadowColor='#000';ctx.shadowBlur=2;ctx.beginPath();[0,2,3,1,0].forEach((i,j)=>j?ctx.lineTo(...p[i]):ctx.moveTo(...p[i]));ctx.stroke();const r=4.5*ratio/sx;p.forEach(pt=>{ctx.fillRect(pt[0]-r,pt[1]-r,2*r,2*r);ctx.strokeRect(pt[0]-r,pt[1]-r,2*r,2*r)})}ctx.restore();}
function translate(l,dx,dy){dx=Math.round(dx);dy=Math.round(dy);const xs=l.points.map(p=>p[0]),ys=l.points.map(p=>p[1]);dx=Math.max(-Math.min(...xs),Math.min(255-Math.max(...xs),dx));dy=Math.max(-Math.min(...ys),Math.min(255-Math.max(...ys),dy));l.points=l.points.map(p=>[p[0]+dx,p[1]+dy]);}
function transform(fn){if(!layer())return;change(()=>{const l=layer(),c=center(l),points=l.points.map(p=>fn(p,c).map(Math.round));if(points.flat().some(n=>!Number.isFinite(n)||n<0||n>255))throw Error(tr('变换超出 0–255 坐标范围，请缩小或移近中心'));l.points=points},tr('变换已应用'))}
function duplicate(){if(!layer()||art.layers.length>=225)return;change(()=>{let l=clone(layer());l.label=(l.label||tr('图层 ')+(selected+1))+tr(' 副本');translate(l,2,2);art.layers.splice(selected,0,l)},tr('已复制图层'))}
function remove(){if(!layer())return;change(()=>{art.layers.splice(selected,1);selected=Math.min(selected,art.layers.length-1)},tr('已删除图层，可撤销'))}
function download(data,name,type){let blob=data instanceof Blob?data:new Blob([data],{type}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),3000)}
function filename(ext){return (art.name.replace(/[\x00-\x1f<>:"/\\|?*]/g,'_').replace(/[. ]+$/,'')||'symbol-art')+'_edited.'+ext}
function saveSar(){try{download(SAR.encode(art),filename('sar'),'application/octet-stream');dirty=false;update();status(tr('已导出 SAR · 未压缩格式，保留全部图层属性'))}catch(e){fail(e)}}
function saveProject(){download(JSON.stringify(art,null,2),filename('json'),'application/json');dirty=false;update();status(tr('已保存可编辑 JSON 工程'))}
async function png(){try{let absent=art.layers.some(l=>l.visible&&!ASSETS[l.texture]);if(absent&&!confirm(tr('部分图层缺少素材，PNG 中会缺失这些图层。仍然导出？')))return;const canvas=$('art'),w=canvas.width,h=canvas.height;canvas.width=art.width===64?512:1536;canvas.height=art.width===64?512:768;renderer.render(art,gameBox(),-1);const url=canvas.toDataURL('image/png');canvas.width=w;canvas.height=h;render();let a=document.createElement('a');a.href=url;a.download=filename('png');a.click();status(tr('已导出透明 PNG · 游戏画幅、全部可见图层、不含控制点'))}catch(e){fail(e);render()}}
function assets(mode){assetMode=mode;$('assetTitle').textContent=mode==='add'?tr('添加符号图层'):tr('更换当前符号');$('assetSearch').value='';filterAssets();$('assetDialog').showModal()}
function filterAssets(){let q=$('assetSearch').value.trim();$('assetGrid').replaceChildren();Object.keys(ASSETS).filter(id=>id.includes(q)).forEach(id=>{const b=document.createElement('button'),im=new Image();im.src=ASSETS[id];im.alt='';im.loading='lazy';b.append(im,document.createTextNode('#'+id));b.title=tr('符号 #')+id;b.onclick=async()=>{try{await renderer.load([+id]);change(()=>{if(assetMode==='add'){if(art.layers.length>=225)throw Error(tr('已达到 225 图层上限'));let l={points:[[107,107],[107,147],[147,107],[147,147]],r:63,g:63,b:63,opacity:7,texture:+id,visible:true,extra:0};selected=Math.max(0,selected);art.layers.splice(selected,0,l)}else if(layer())layer().texture=+id},assetMode==='add'?tr('已添加图层'):tr('已更换符号'));$('assetDialog').close()}catch(e){fail(e)}};$('assetGrid').append(b)})}
function mouse(e){let r=overlay.getBoundingClientRect(),b=box();return [b[0]+(e.clientX-r.left)/r.width*b[2],b[1]+(e.clientY-r.top)/r.height*b[3]]}
function bary(p,a,b,c){let den=(b[1]-c[1])*(a[0]-c[0])+(c[0]-b[0])*(a[1]-c[1]);if(Math.abs(den)<1e-8)return null;let u=((b[1]-c[1])*(p[0]-c[0])+(c[0]-b[0])*(p[1]-c[1]))/den,v=((c[1]-a[1])*(p[0]-c[0])+(a[0]-c[0])*(p[1]-c[1]))/den;return u>=0&&v>=0&&u+v<=1?[u,v,1-u-v]:null}
const masks=new Map();
function hit(l,p){let uv=null,b=bary(p,l.points[0],l.points[1],l.points[2]);if(b)uv=[b[2],b[1]];else{b=bary(p,l.points[2],l.points[1],l.points[3]);if(b)uv=[b[0]+b[2],b[1]+b[2]]}if(!uv)return false;let im=renderer.images.get(l.texture);if(!im)return true;if(!masks.has(l.texture)){let c=document.createElement('canvas');c.width=im.width;c.height=im.height;let cx=c.getContext('2d');cx.drawImage(im,0,0);masks.set(l.texture,{data:cx.getImageData(0,0,c.width,c.height).data,w:c.width,h:c.height})}let m=masks.get(l.texture),x=Math.min(m.w-1,Math.max(0,Math.floor(uv[0]*m.w))),y=Math.min(m.h-1,Math.max(0,Math.floor(uv[1]*m.h)));return m.data[(y*m.w+x)*4+3]>16}
overlay.onpointerdown=e=>{if(!art||e.button!==0)return;let p=mouse(e),l=layer(),corner=-1;if(l&&$('outline').checked)corner=l.points.findIndex(pt=>Math.hypot(pt[0]-p[0],pt[1]-p[1])<9*box()[2]/overlay.clientWidth);if(corner<0&&(!l||!l.visible||!hit(l,p))){let i=art.layers.findIndex((l,i)=>l.visible&&(!$('solo').checked||i===selected)&&hit(l,p));select(i);l=layer()}if(!l)return;drag={start:p,points:clone(l.points),corner,before:clone(art),selected,moved:false};overlay.setPointerCapture(e.pointerId);e.preventDefault()};
overlay.onpointermove=e=>{if(!drag)return;let p=mouse(e),dx=p[0]-drag.start[0],dy=p[1]-drag.start[1],l=layer();l.points=clone(drag.points);if(drag.corner>=0)l.points[drag.corner]=[Math.max(0,Math.min(255,Math.round(p[0]))),Math.max(0,Math.min(255,Math.round(p[1])))];else translate(l,dx,dy);drag.moved=JSON.stringify(l.points)!==JSON.stringify(drag.points);render()};
function endDrag(cancel=false){if(!drag)return;if(cancel){art=drag.before;selected=drag.selected;update()}else if(drag.moved){history.push({art:drag.before,selected:drag.selected});if(history.length>80)history.shift();future=[];dirty=true;commit(tr('已调整图层位置'))}drag=null}
overlay.onpointerup=()=>endDrag();overlay.onpointercancel=()=>endDrag(true);
$('open').onclick=()=>$('file').click();$('file').onchange=e=>openFile(e.target.files[0]);
const samples = new SampleBrowser({report:status, openArt:async(a,message)=>{
 if(dirty&&!confirm(tr('当前修改尚未导出。打开新文件并替换当前作品？')))return false;
 await loadArt(a,message);return true;
}});
$('new').onclick=()=>{if(dirty&&!confirm(tr('替换当前作品并新建？')))return;loadArt({format:'symbol-art-studio',version:1,authorId:0,width:193,height:128,sound:0,name:tr('新作品'),layers:[]},tr('新建空白作品，点击“添加”插入符号'))};
$('undo').onclick=undo;$('redo').onclick=redo;$('duplicate').onclick=duplicate;$('delete').onclick=remove;
$('up').onclick=()=>{if(selected>0)change(()=>{let i=selected;[art.layers[i-1],art.layers[i]]=[art.layers[i],art.layers[i-1]];selected--},tr('图层已上移'))};
$('down').onclick=()=>{if(selected>=0&&selected<art.layers.length-1)change(()=>{let i=selected;[art.layers[i+1],art.layers[i]]=[art.layers[i],art.layers[i+1]];selected++},tr('图层已下移'))};
$('visible').onchange=()=>change(()=>layer().visible=$('visible').checked,tr('已修改图层可见性'));
$('color').onchange=()=>{let value=$('color').value;change(()=>{[layer().r,layer().g,layer().b]=SAR.fromHex(value)},tr('颜色已量化到游戏 6 位色阶'))};
$('opacity').onchange=()=>{let n=Number($('opacity').value);change(()=>layer().opacity=n,tr('已修改不透明度'))};
for(const [id,k] of [['cx',0],['cy',1]])$(id).onchange=()=>{let value=Number($(id).value);if(!Number.isFinite(value)){update();return}change(()=>{let c=center(layer()),d=[0,0];d[k]=value-c[k];translate(layer(),...d)},tr('已移动图层'))};
$('rotate').onclick=()=>{let a=Number($('angle').value)*Math.PI/180;transform((p,c)=>{let x=p[0]-c[0],y=p[1]-c[1];return [c[0]+x*Math.cos(a)-y*Math.sin(a),c[1]+x*Math.sin(a)+y*Math.cos(a)]})};
$('resize').onclick=()=>{let s=Number($('scale').value)/100;if(s<=0||s>10){fail(Error(tr('缩放比例应为 1–1000%')));return}transform((p,c)=>p.map((n,k)=>c[k]+(n-c[k])*s))};
$('flipX').onclick=()=>transform((p,c)=>[2*c[0]-p[0],p[1]]);$('flipY').onclick=()=>transform((p,c)=>[p[0],2*c[1]-p[1]]);
$('name').onchange=()=>{const n=$('name').value;change(()=>art.name=n,tr('已修改作品名称'))};$('sound').onchange=()=>{let n=Number($('sound').value);change(()=>art.sound=n,tr('已修改音效编号'))};$('format').onchange=()=>{let flag=$('format').value==='flag';change(()=>{art.width=flag?64:193;art.height=flag?64:128},tr('画幅已修改；图层坐标保持原样'))};
$('viewGame').onclick=()=>{full=false;$('viewGame').classList.add('active');$('viewFull').classList.remove('active');render()};$('viewFull').onclick=()=>{full=true;$('viewGame').classList.remove('active');$('viewFull').classList.add('active');render()};
$('solo').onchange=render;$('outline').onchange=render;$('background').onchange=()=>{let bg=$('background').value;$('stage').style.backgroundImage=bg==='checker'?'':'none';$('stage').style.backgroundColor=bg==='checker'?'#f0f0f0':bg};
$('saveSar').onclick=saveSar;$('saveProject').onclick=saveProject;$('png').onclick=png;$('add').onclick=()=>assets('add');$('replace').onclick=()=>assets('replace');$('assetSearch').oninput=filterAssets;$('closeAssets').onclick=()=>$('assetDialog').close();$('assetCount').textContent=Object.keys(ASSETS).length;
$('help').onclick=()=>$('helpDialog').showModal();$('closeHelp').onclick=()=>$('helpDialog').close();$('license').onclick=()=>{$('licenseText').textContent=LICENSE_TEXT;$('licenseText').hidden=!$('licenseText').hidden};
document.addEventListener('keydown',e=>{if(e.target.matches('input,select,textarea')||$('assetDialog').open||$('helpDialog').open||$('sampleDialog').open)return;let mod=e.ctrlKey||e.metaKey;if(mod&&e.key.toLowerCase()==='z'){e.preventDefault();e.shiftKey?redo():undo()}else if(mod&&e.key.toLowerCase()==='y'){e.preventDefault();redo()}else if(mod&&e.key.toLowerCase()==='s'){e.preventDefault();saveSar()}else if(mod&&e.key.toLowerCase()==='d'){e.preventDefault();duplicate()}else if(e.key==='Delete'||e.key==='Backspace'){e.preventDefault();remove()}else if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key)&&layer()){e.preventDefault();let n=e.shiftKey?10:1;change(()=>translate(layer(),e.key==='ArrowLeft'?-n:e.key==='ArrowRight'?n:0,e.key==='ArrowUp'?-n:e.key==='ArrowDown'?n:0),tr('已微调图层'))}});
function refreshLanguage(){update();samples.render();samples.message('单击选择，双击打开查看 / 编辑。');status(tr('语言已切换'));if($('assetDialog').open){$('assetTitle').textContent=tr(assetMode==='add'?'添加符号图层':'更换当前符号');filterAssets()}}
$('language').onchange=()=>{if(drag)endDrag();if(I18N.setLanguage($('language').value))refreshLanguage()};
window.addEventListener('languagechange',()=>{if(I18N.preference==='auto'){if(drag)endDrag();I18N.setLanguage('auto');refreshLanguage()}});
window.addEventListener('resize',render);new ResizeObserver(()=>render()).observe($('stageArea'));
window.addEventListener('beforeunload',e=>{if(dirty){e.preventDefault();e.returnValue=''}});
document.addEventListener('dragover',e=>{e.preventDefault();document.body.classList.add('dragging')});document.addEventListener('dragleave',e=>{if(!e.relatedTarget)document.body.classList.remove('dragging')});document.addEventListener('drop',e=>{e.preventDefault();document.body.classList.remove('dragging');if(!$('sampleDialog').open)openFile(e.dataTransfer.files[0])});
(async()=>{try{await loadArt({format:'symbol-art-studio',version:1,authorId:0,width:193,height:128,sound:0,name:tr('新作品'),layers:[]},tr('新建空白作品；可随机加载 sample 或浏览示例。'));let saved;try{saved=JSON.parse(localStorage.getItem(STORE)||'null')}catch{}if(saved?.art&&confirm(tr('发现上次编辑的本地草稿。是否恢复？'))){await loadArt(SAR.validate(saved.art),tr('已恢复本地草稿'));selected=Math.min(saved.selected,art.layers.length-1);dirty=true;update()}}catch(e){fail(e)}})();
// Exposed read-only helpers for automated regression checks and source consumers.
window.Studio={getArt:()=>clone(art),getSelected:()=>selected,select,loadArt,renderer,gameBox,samples};

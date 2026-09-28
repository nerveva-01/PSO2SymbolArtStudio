/* Symbol Art Studio, 2026-09-28. GPL-3.0-or-later.
 * SAR layout and color tables adapted from SymbolArtEditorOnline (Arthur Malulley B. de O., 2021).
 * Keeps all four vertices and the full secondary property word unchanged unless edited.
 */
(function(root){
'use strict';
const tr=key=>root.I18N?root.I18N.t(key):key;
const COLORS=[0,1,3,4,5,7,8,10,12,14,18,18,20,22,24,27,29,32,35,38,41,44,47,50,53,56,60,63,67,71,75,79,83,87,91,95,100,104,109,114,118,123,128,133,138,144,149,155,160,166,171,177,183,189,195,202,208,214,221,227,234,241,248,255];
const ALPHAS=[10,27,50,79,114,155,202,255].map(x=>x/255);
const cipher=new BlowfishCrypto({encryptionKeyArrayBuffer:Uint8Array.of(9,7,193,43).buffer});
function prs(a){
 let pos=0,bitCount=0,bits=0,out=[];
 const byte=()=>{if(pos>=a.length)throw Error(tr('PRS 数据截断'));return a[pos++]};
 const bit=()=>{if(!bitCount){bits=byte();bitCount=8}let b=bits&1;bits>>>=1;bitCount--;return b};
 while(true){
  if(out.length>65536)throw Error(tr('PRS 解压数据超出安全上限'));
  if(bit()){out.push(byte());continue}
  let offset,size;
  if(bit()){let word=byte()|(byte()<<8);if(!word)break;size=word&7;offset=(word>>3)|-8192;size=size?size+2:byte()+10}
  else{size=((bit()<<1)|bit())+2;offset=byte()|-256}
  if(out.length+offset<0)throw Error(tr('PRS 引用位置无效'));
  for(let i=0;i<size;i++)out.push(out[out.length+offset]);
 }
 return Uint8Array.from(out);
}
function payload(bytes){
 let a=bytes instanceof Uint8Array?Uint8Array.from(bytes):new Uint8Array(bytes);
 if(a.length<12||a.length>1048576)throw Error(tr('SAR 文件大小无效'));
 if(a[0]!==115||a[1]!==97||a[2]!==114||![4,132].includes(a[3]))throw Error(tr('不是受支持的 SAR 文件（需要 sar + 04/84）'));
 let flag=a[3];a=a.slice(4);cipher.decrypt({arrayBuffer:a.buffer});
 return flag===132?prs(a.map(x=>x^149)):a;
}
function parse(bytes){
 let a=payload(bytes),v=new DataView(a.buffer,a.byteOffset,a.byteLength);
 if(a.length<8)throw Error(tr('SAR 数据头不完整'));
 let count=a[4],end=8+16*count;
 if(count>225||a.length<end||(a.length-end)%2)throw Error(tr('SAR 图层数、长度或 UTF-16 名称无效'));
 if(!([192,193].includes(a[6])&&a[5]===128)&&!(a[6]===64&&a[5]===64))throw Error(tr('暂不支持该画幅编码：')+a[6]+' × '+a[5]);
 let art={format:'symbol-art-studio',version:1,authorId:v.getUint32(0,true),width:a[6],height:a[5],sound:a[7],name:'',layers:[]};
 for(let i=0;i<count;i++){
  let p=8+i*16,w=v.getUint32(p+8,true);
  art.layers.push({points:Array.from({length:4},(_,j)=>[a[p+j*2],a[p+j*2+1]]),r:w&63,g:(w>>>6)&63,b:(w>>>12)&63,opacity:(w>>>18)&7,texture:(w>>>21)&1023,visible:!(w>>>31),extra:v.getUint32(p+12,true)});
 }
 for(let p=end;p<a.length;p+=2)art.name+=String.fromCharCode(v.getUint16(p,true));
 return art;
}
function integer(v,min,max,what){if(!Number.isInteger(v)||v<min||v>max)throw Error(what+tr(' 超出范围 ')+min+'…'+max)}
function validate(a){
 if(!a||a.format!=='symbol-art-studio'||a.version!==1)throw Error(tr('不是 Symbol Art Studio 工程'));
 integer(a.authorId,0,4294967295,tr('作者 ID'));integer(a.sound,0,255,tr('音效'));
 if(!([192,193].includes(a.width)&&a.height===128)&&!(a.width===64&&a.height===64))throw Error(tr('画幅编码无效'));
 if(typeof a.name!=='string'||a.name.length>64)throw Error(tr('名称长度无效'));
 if(!Array.isArray(a.layers)||a.layers.length>225)throw Error(tr('最多支持 225 个图层'));
 for(const l of a.layers){
  if(!Array.isArray(l.points)||l.points.length!==4)throw Error(tr('图层必须包含四个顶点'));
  for(const p of l.points){if(!Array.isArray(p)||p.length!==2)throw Error(tr('坐标无效'));for(const c of p)integer(c,0,255,tr('顶点坐标'))}
  for(const k of ['r','g','b'])integer(l[k],0,63,tr('颜色'));integer(l.opacity,0,7,tr('透明度'));integer(l.texture,0,1023,tr('符号 ID'));integer(l.extra,0,4294967295,tr('扩展属性'));
  if(typeof l.visible!=='boolean')throw Error(tr('图层可见状态无效'));
 }
 return a;
}
function pack(art){
 validate(art);let a=new Uint8Array(8+art.layers.length*16+art.name.length*2),v=new DataView(a.buffer);
 v.setUint32(0,art.authorId,true);a.set([art.layers.length,art.height,art.width,art.sound],4);
 art.layers.forEach((l,i)=>{let p=8+i*16;a.set(l.points.flat(),p);let w=(l.r|(l.g<<6)|(l.b<<12)|(l.opacity<<18)|(l.texture<<21)|((l.visible?0:1)<<31))>>>0;v.setUint32(p+8,w,true);v.setUint32(p+12,l.extra,true)});
 for(let i=0;i<art.name.length;i++)v.setUint16(8+art.layers.length*16+i*2,art.name.charCodeAt(i),true);
 return a;
}
function encode(art){let a=pack(art);cipher.encrypt({arrayBuffer:a.buffer});let out=new Uint8Array(a.length+4);out.set([115,97,114,4]);out.set(a,4);return out}
function hex(l){return '#'+[l.r,l.g,l.b].map(x=>COLORS[x].toString(16).padStart(2,'0')).join('')}
function fromHex(h){return h.match(/[a-f\d]{2}/gi).map(x=>{let n=parseInt(x,16),best=0;for(let i=1;i<64;i++)if(Math.abs(COLORS[i]-n)<Math.abs(COLORS[best]-n))best=i;return best})}
root.SAR={parse,encode,pack,payload,validate,prs,COLORS,ALPHAS,hex,fromHex};
})(globalThis);

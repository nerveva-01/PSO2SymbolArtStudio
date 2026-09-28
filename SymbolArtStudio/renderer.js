/* Symbol Art Studio renderer — GPL-3.0-or-later. Native WebGL, no external runtime. */
class ArtRenderer {
 constructor(canvas){
  this.canvas=canvas;this.gl=canvas.getContext('webgl',{alpha:true,premultipliedAlpha:true,antialias:true,preserveDrawingBuffer:true});
  if(!this.gl)throw Error(I18N.t('无法启动 WebGL，请在浏览器中启用硬件加速'));
  const g=this.gl;
  const shader=(type,code)=>{let s=g.createShader(type);g.shaderSource(s,code);g.compileShader(s);if(!g.getShaderParameter(s,g.COMPILE_STATUS))throw Error(g.getShaderInfoLog(s));return s};
  let p=g.createProgram();g.attachShader(p,shader(g.VERTEX_SHADER,'attribute vec2 pos;attribute vec2 uv;uniform vec4 box;varying vec2 tex;void main(){tex=uv;gl_Position=vec4((pos.x-box.x)/box.z*2.0-1.0,1.0-(pos.y-box.y)/box.w*2.0,0,1);}'));
  g.attachShader(p,shader(g.FRAGMENT_SHADER,'precision mediump float;uniform sampler2D image;uniform vec4 tint;varying vec2 tex;void main(){vec4 c=texture2D(image,tex);float a=c.a*tint.a;gl_FragColor=vec4(c.rgb*tint.rgb*a,a);}'));
  g.linkProgram(p);if(!g.getProgramParameter(p,g.LINK_STATUS))throw Error(g.getProgramInfoLog(p));g.useProgram(p);this.program=p;
  this.buffer=g.createBuffer();g.bindBuffer(g.ARRAY_BUFFER,this.buffer);
  for(let [name,off] of [['pos',0],['uv',8]]){let a=g.getAttribLocation(p,name);g.enableVertexAttribArray(a);g.vertexAttribPointer(a,2,g.FLOAT,false,16,off)}
  this.box=g.getUniformLocation(p,'box');this.tint=g.getUniformLocation(p,'tint');g.enable(g.BLEND);g.blendFunc(g.ONE,g.ONE_MINUS_SRC_ALPHA);this.textures=new Map();this.images=new Map();
 }
 async load(ids){await Promise.all([...new Set(ids)].filter(id=>!this.textures.has(id)&&ASSETS[id]).map(id=>new Promise((resolve,reject)=>{let im=new Image();im.onload=()=>{const g=this.gl,t=g.createTexture();g.bindTexture(g.TEXTURE_2D,t);g.pixelStorei(g.UNPACK_PREMULTIPLY_ALPHA_WEBGL,false);g.texImage2D(g.TEXTURE_2D,0,g.RGBA,g.RGBA,g.UNSIGNED_BYTE,im);g.texParameteri(g.TEXTURE_2D,g.TEXTURE_MIN_FILTER,g.LINEAR);g.texParameteri(g.TEXTURE_2D,g.TEXTURE_MAG_FILTER,g.LINEAR);g.texParameteri(g.TEXTURE_2D,g.TEXTURE_WRAP_S,g.CLAMP_TO_EDGE);g.texParameteri(g.TEXTURE_2D,g.TEXTURE_WRAP_T,g.CLAMP_TO_EDGE);this.textures.set(id,t);this.images.set(id,im);resolve()};im.onerror=()=>reject(Error(I18N.t('符号素材加载失败 #')+id));im.src=ASSETS[id]})))}
 render(art,box,solo=-1){
  const g=this.gl;g.viewport(0,0,this.canvas.width,this.canvas.height);g.clearColor(0,0,0,0);g.clear(g.COLOR_BUFFER_BIT);g.useProgram(this.program);g.uniform4fv(this.box,box);g.bindBuffer(g.ARRAY_BUFFER,this.buffer);
  for(let i=art.layers.length-1;i>=0;i--){const l=art.layers[i];if(!l.visible||(solo>=0&&i!==solo)||!this.textures.has(l.texture))continue;
   let [tl,bl,tr,br]=l.points;let data=[...tl,0,0,...bl,0,1,...tr,1,0,...br,1,1];
   g.bufferData(g.ARRAY_BUFFER,new Float32Array(data),g.DYNAMIC_DRAW);g.bindTexture(g.TEXTURE_2D,this.textures.get(l.texture));g.uniform4f(this.tint,SAR.COLORS[l.r]/255,SAR.COLORS[l.g]/255,SAR.COLORS[l.b]/255,SAR.ALPHAS[l.opacity]);g.drawArrays(g.TRIANGLE_STRIP,0,4);
  }
 }
}

const fs=require('fs'),vm=require('vm'),assert=require('assert'),path=require('path');
const root=path.resolve(__dirname,'..');
for(const p of ['vendor/BlowfishCrypto.js','codec.js'])vm.runInThisContext(fs.readFileSync(path.join(root,p),'utf8'));
const sample=fs.readFileSync(path.join(root,"sample/Yume's_XIERRA_4.sar")),art=SAR.parse(sample);
assert.equal(art.layers.length,114);assert.equal(art.name,"Yume's_XIERRA_4");assert.equal(art.authorId,10705966);
assert.equal(new Set(art.layers.map(l=>l.texture)).size,27);
assert.deepStrictEqual(SAR.pack(art),SAR.payload(sample),'Unmodified payload must remain byte-for-byte exact');
assert.deepStrictEqual(SAR.parse(SAR.encode(art)),art,'Compressed import / uncompressed export round trip');
const changed=structuredClone(art);changed.layers[0].r=63;changed.layers[0].visible=false;changed.layers[0].points[0][0]-=3;changed.layers.reverse();changed.name='测试日本語🙂';
assert.deepStrictEqual(SAR.parse(SAR.encode(changed)),changed);
for(let n=0;n<24;n++){let a=structuredClone(art);a.name='x'.repeat(n);assert.deepStrictEqual(SAR.parse(SAR.encode(a)),a)}
const flag=structuredClone(art);flag.width=64;flag.height=64;flag.layers=[];assert.deepStrictEqual(SAR.parse(SAR.encode(flag)),flag);
for(const bad of [new Uint8Array(),new Uint8Array(14),sample.subarray(0,30)])assert.throws(()=>SAR.parse(bad));
assert.throws(()=>SAR.prs(Uint8Array.of(0,255)));assert.throws(()=>SAR.prs(Uint8Array.of(255)));
const invalid=structuredClone(art);invalid.layers[0].points[0][0]=256;assert.throws(()=>SAR.encode(invalid));
const unknown=structuredClone(art);unknown.layers[0].texture=1023;unknown.layers[0].extra=0xffffffff;assert.deepStrictEqual(SAR.parse(SAR.encode(unknown)),unknown);
fs.writeFileSync(path.join(root,'tests/roundtrip.sar'),SAR.encode(art));
console.log('PASS: sample 114 layers / 27 textures, exact decoded payload, compressed→uncompressed, edits, Unicode, all 8-byte tail alignments, flag/empty document, malformed data rejection, unknown fields preservation.');

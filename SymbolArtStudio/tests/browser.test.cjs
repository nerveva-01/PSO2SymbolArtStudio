/* Integration checks against the distributable file:// HTML. */
const {chromium}=require('playwright'),assert=require('assert'),path=require('path'),fs=require('fs');
const root=path.resolve(__dirname,'..');
(async()=>{
 let executablePath=process.env.CHROMIUM_PATH;
 let browser=await chromium.launch({executablePath,headless:true,args:['--no-sandbox','--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader']});
 const page=await browser.newPage({viewport:{width:1440,height:940},deviceScaleFactor:1});
 const errors=[],requests=[];page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(/^https?:/.test(r.url()))requests.push(r.url())});page.on('dialog',d=>d.accept());
 await page.goto('file://'+path.join(root,'SymbolArtStudio.html'));
 await page.waitForFunction(()=>window.Studio?.getArt()?.layers?.length===114);
 assert.equal(await page.evaluate(()=>Studio.renderer.textures.size),27);
 const original=await page.evaluate(()=>Studio.getArt());
 await page.screenshot({path:path.join(root,'tests/editor-screenshot.png')});
 // Import through the real file input, then lossless export.
 await page.locator('#file').setInputFiles(path.join(root,"sample/Yume's_XIERRA_4.sar"));
 await page.waitForFunction(()=>document.querySelector('#status').textContent.startsWith('已打开'));
 let dl=page.waitForEvent('download');await page.click('#saveSar');let download=await dl;await download.saveAs(path.join(root,'tests/browser-roundtrip.sar'));
 const roundtrip=await page.evaluate(async()=>SAR.parse(new Uint8Array(await (new Blob([SAR.encode(Studio.getArt())])).arrayBuffer())));
 assert.deepStrictEqual(roundtrip,original);
 // UI select/color/opacity/undo/redo.
 await page.locator('.layer').nth(5).click();assert.equal(await page.evaluate(()=>Studio.getSelected()),5);
 await page.locator('#color').evaluate(el=>{el.value='#ff0000';el.dispatchEvent(new Event('change',{bubbles:true}))});
 assert.equal(await page.evaluate(()=>Studio.getArt().layers[5].r),63);assert.equal(await page.evaluate(()=>Studio.getArt().layers[5].g),0);
 await page.click('#undo');assert.deepStrictEqual(await page.evaluate(()=>Studio.getArt()),original);
 await page.click('#redo');assert.equal(await page.evaluate(()=>Studio.getArt().layers[5].r),63);
 await page.locator('#opacity').evaluate(el=>{el.value=4;el.dispatchEvent(new Event('change',{bubbles:true}))});assert.equal(await page.evaluate(()=>Studio.getArt().layers[5].opacity),4);
 await page.click('#duplicate');assert.equal(await page.evaluate(()=>Studio.getArt().layers.length),115);await page.click('#delete');assert.equal(await page.evaluate(()=>Studio.getArt().layers.length),114);
 await page.click('#visible');assert.equal(await page.evaluate(()=>Studio.getArt().layers[5].visible),false);await page.click('#visible');
 const beforeOrder=await page.evaluate(()=>Studio.getArt().layers[5]);await page.click('#up');assert.deepStrictEqual(await page.evaluate(()=>Studio.getArt().layers[4]),beforeOrder);await page.click('#down');
 await page.click('#viewFull');await page.click('#viewGame');
 // PNG must be exportable on file:// without CORS taint.
 dl=page.waitForEvent('download');await page.click('#png');download=await dl;await download.saveAs(path.join(root,'tests/export.png'));assert(fs.statSync(path.join(root,'tests/export.png')).size>1000);
 // Create generic shape and exercise mouse drag/corner drag + transform controls.
 await page.click('#new');await page.waitForFunction(()=>Studio.getArt().layers.length===0);
 await page.click('#add');await page.fill('#assetSearch','242');await page.locator('#assetGrid button').filter({hasText:'#242'}).click();
 assert.equal(await page.evaluate(()=>Studio.getArt().layers[0].texture),242);
 const p=await page.locator('#overlay').boundingBox();let before=await page.evaluate(()=>Studio.getArt().layers[0].points);await page.mouse.move(p.x+p.width/2,p.y+p.height/2);await page.mouse.down();await page.mouse.move(p.x+p.width/2+30,p.y+p.height/2+15,{steps:4});await page.mouse.up();let after=await page.evaluate(()=>Studio.getArt().layers[0].points);assert.notDeepStrictEqual(after,before);
 before=after;const topLeft=await page.evaluate(()=>{let l=Studio.getArt().layers[0],b=Studio.gameBox(),r=document.querySelector('#overlay').getBoundingClientRect();return [r.x+(l.points[0][0]-b[0])/b[2]*r.width,r.y+(l.points[0][1]-b[1])/b[3]*r.height]});await page.mouse.move(...topLeft);await page.mouse.down();await page.mouse.move(topLeft[0]-10,topLeft[1]-10,{steps:3});await page.mouse.up();after=await page.evaluate(()=>Studio.getArt().layers[0].points);assert.notDeepStrictEqual(after[0],before[0]);assert.deepStrictEqual(after[1],before[1]);
 await page.fill('#angle','15');await page.click('#rotate');await page.fill('#scale','90');await page.click('#resize');await page.click('#flipX');await page.click('#flipY');await page.fill('#cx','120');await page.locator('#cx').press('Tab');
 await page.fill('#name','测试作品');await page.locator('#name').press('Tab');await page.selectOption('#format','flag');assert.equal(await page.evaluate(()=>Studio.getArt().width),64);
 dl=page.waitForEvent('download');await page.click('#saveSar');download=await dl;await download.saveAs(path.join(root,'tests/edited-flag.sar'));
 // Missing texture warns and remains present.
 await page.evaluate(async()=>{let a=Studio.getArt();a.layers[0].texture=1023;await Studio.loadArt(a,'test')});assert(await page.locator('#missing').isVisible());assert.equal(await page.evaluate(()=>Studio.getArt().layers[0].texture),1023);
 assert.deepStrictEqual(errors,[]);assert.deepStrictEqual(requests,[],'App must not fetch network resources');
 console.log('PASS: file import, 27 sample textures, lossless SAR export, selection/color/opacity/visibility, reorder, duplicate/delete, undo/redo, PNG export, add shape, mouse movement + corner editing, transforms, name, flag export, missing asset warning, no page errors or network requests.');
 await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});

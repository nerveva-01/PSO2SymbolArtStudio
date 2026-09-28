/* Multilingual UI regression test. Requires Playwright and Chromium. */
const {chromium}=require('playwright'),assert=require('assert'),path=require('path'),fs=require('fs');
const root=path.resolve(__dirname,'..');
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH,headless:true,args:['--no-sandbox','--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader']});
 const page=await browser.newPage({viewport:{width:1440,height:940}}),errors=[],requests=[],dialogs=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(/^https?:/.test(r.url()))requests.push(r.url())});page.on('dialog',d=>{dialogs.push(d.message());d.accept()});
 await page.goto('file://'+path.join(root,'SymbolArtStudio.html'));
 await page.waitForFunction(()=>window.Studio?.getArt()?.layers.length===114);
 const base=await page.evaluate(()=>Studio.getArt());
 await page.locator('.layer').nth(5).click();
 await page.locator('#color').evaluate(el=>{el.value='#ff0000';el.dispatchEvent(new Event('change',{bubbles:true}))});
 const edited=await page.evaluate(()=>Studio.getArt());
 for(const [lang,open,layerName,title] of [['en','Open SAR / Project','Layer 006','Symbol Art Studio · PSO2 Offline Editor'],['ja','SAR / プロジェクトを開く','レイヤー 006','Symbol Art Studio · PSO2 オフラインエディター'],['zh-CN','打开 SAR / 工程','图层 006','Symbol Art Studio · PSO2 离线编辑器']]){
  await page.selectOption('#language',lang);
  assert.equal(await page.locator('html').getAttribute('lang'),lang);assert.equal(await page.locator('#open').textContent(),open);assert.equal(await page.title(),title);
  assert.equal(await page.locator('.layer.selected strong').textContent(),layerName);
  assert.deepStrictEqual(await page.evaluate(()=>Studio.getArt()),edited,'Language switch must not change document data');assert.equal(await page.evaluate(()=>Studio.getSelected()),5);assert(await page.locator('#undo').isEnabled());
  const missing=await page.evaluate(()=>{const out=[];for(const el of document.querySelectorAll('[data-i18n]'))if(!I18N.catalog[el.dataset.i18n])out.push(el.dataset.i18n);return out});assert.deepStrictEqual(missing,[]);
 }
 // Undo history remains intact after all switches.
 await page.click('#undo');assert.deepStrictEqual(await page.evaluate(()=>Studio.getArt()),base);await page.click('#redo');assert.deepStrictEqual(await page.evaluate(()=>Studio.getArt()),edited);
 await page.selectOption('#language','en');await page.click('#help');assert((await page.locator('#helpDialog').innerText()).includes('How to use'));assert((await page.locator('#helpDialog').innerText()).includes('Compatibility:'));await page.click('#closeHelp');
 await page.click('#replace');assert.equal(await page.locator('#assetTitle').textContent(),'Replace current symbol');assert.equal(await page.locator('#assetSearch').getAttribute('placeholder'),'Search symbol ID, e.g. 240');await page.click('#closeAssets');
 // Browser-native dialogs are translated, including codec errors.
 let dialogEvent=page.waitForEvent('dialog');await page.locator('#file').setInputFiles({name:'invalid.sar',mimeType:'application/octet-stream',buffer:Buffer.from('invalid')});await dialogEvent;assert.equal(dialogs.at(-1),'Invalid SAR file size');
 await page.selectOption('#language','ja');dialogEvent=page.waitForEvent('dialog');await page.locator('#file').setInputFiles({name:'invalid.sar',mimeType:'application/octet-stream',buffer:Buffer.from('invalid')});await dialogEvent;assert.equal(dialogs.at(-1),'SAR ファイルのサイズが無効です');
 // User names are not translated.
 await page.evaluate(async()=>{const a=Studio.getArt();a.name='我的作品 日本語';a.layers[5].label='自定义レイヤー';await Studio.loadArt(a,'test');Studio.select(5)});
 await page.selectOption('#language','en');assert.equal(await page.locator('#name').inputValue(),'我的作品 日本語');assert.equal(await page.locator('.selected strong').textContent(),'自定义レイヤー');
 // Capture English UI, check that language control and header stay on-screen.
 await page.screenshot({path:path.join(root,'tests/i18n-en.png')});
 for(const width of [1440,1024]){await page.setViewportSize({width,height:940});const layout=await page.evaluate(()=>{let e=document.querySelector('#language').getBoundingClientRect();return {left:e.left,right:e.right,w:innerWidth,scroll:document.documentElement.scrollWidth}});assert(layout.left>=0&&layout.right<=width);assert(layout.scroll<=width)}
 await page.selectOption('#language','ja');await page.reload();await page.waitForFunction(()=>window.Studio?.getArt());assert.equal(await page.locator('#language').inputValue(),'ja');assert.equal(await page.locator('#open').textContent(),'SAR / プロジェクトを開く');
 // Editing still works after reload in Japanese, SAR export payload remains independent of language.
 assert(await page.evaluate(()=>{const a=Studio.getArt(),bytes=SAR.encode(a);I18N.setLanguage('en');return JSON.stringify(Array.from(SAR.encode(a)))===JSON.stringify(Array.from(bytes))}));
 assert.deepStrictEqual(errors,[]);assert.deepStrictEqual(requests,[]);
 console.log('PASS: three languages, complete static catalog, dynamic labels, help, dialogs/errors, document and selection preservation, undo/redo preservation, custom names unchanged, language persistence, header layouts, no external requests or page errors.');
 await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});

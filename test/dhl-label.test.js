const test=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');
const {splitLabels}=require('../public/dhl-label-layout');
test('label dimensions and multiple packages are preserved; missing dimensions fail closed',()=>{
 const z='^XA^PW831^LL959^FO20,20^FDTEST^FS^XZ';
 assert.equal(splitLabels(z+z).length,2);assert.equal(splitLabels(z)[0].widthMm,103.875);assert.equal(splitLabels(z)[0].heightMm,119.875);
 assert.throws(()=>splitLabels('^XA^FDtest^FS^XZ'));assert.throws(()=>splitLabels('^XA^PW99999^LL959^XZ'));
});
test('local WASM engine renders at native 203 dpi with embedded Latin font',async()=>{
 const api=require('zpl-renderer-js/external');await api.init({wasmBytes:fs.readFileSync(require.resolve('zpl-renderer-js/wasm'))});
 const f=fs.readFileSync('public/vendor/label-latin.ttf');
 const z=`^XA~DUR:LATIN.TTF,${f.length},${f.toString('hex')}^CW0,R:LATIN.TTF^CI28^PW831^LL959^FO40,30^A0N,32,32^FH^FD_C4_9E_C4_B0_C5_9E^FS^FO40,90^BY3^BCN,120,Y,N,N^FD123456789012^FS^XZ`;
 const png=Buffer.from(await api.zplToBase64Async(z,831/8,959/8,8),'base64');assert.equal(png.readUInt32BE(16),831);assert.equal(png.readUInt32BE(20),959);assert.ok(png.length>1000);
 const original='^XA^PW831^LL959^FT700,45^A0R,23,24^FDMERVE SILIVRILI^FS^XZ';
 const patched=original.replace('^XA',`^XA~DUR:LATIN.TTF,${f.length},${f.toString('hex')}^CW0,R:LATIN.TTF`);
 assert.equal(await api.zplToBase64Async(original,831/8,959/8,8),await api.zplToBase64Async(patched,831/8,959/8,8),'Existing font geometry must remain pixel-identical');
});

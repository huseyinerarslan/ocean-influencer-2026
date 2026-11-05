import { init, zplToBase64Async } from '/vendor/zpl-renderer-4.0.0.js';
import '/dhl-label-layout.js?v=1';
self.onmessage=async({data})=>{
  try{
    const labels=self.dhlLabelLayout.splitLabels(data);
    await init({wasmUrl:'/vendor/zpl-renderer-4.0.0.wasm'});
    const fontResponse=await fetch('/vendor/label-latin.ttf');
    if(!fontResponse.ok)throw Error('Türkçe yazı tipi yüklenemedi.');
    const font=new Uint8Array(await fontResponse.arrayBuffer());
    const fontHex=Array.from(font,b=>b.toString(16).padStart(2,'0')).join('');
    const fontCommand=`~DUR:LATIN.TTF,${font.length},${fontHex}^CW0,R:LATIN.TTF`;

    for(let i=0;i<labels.length;i++){
      const label=labels[i];
      const png=await zplToBase64Async(label.zpl.replace('^XA','^XA'+fontCommand),label.widthMm,label.heightMm,8,{enableInvertedLabels:true,grayscaleOutput:false});
      self.postMessage({type:'label',index:i,total:labels.length,widthMm:label.widthMm,heightMm:label.heightMm,png});
    }
    self.postMessage({type:'done'});
  }catch(e){self.postMessage({type:'error',message:'Etiket görüntüye dönüştürülemedi. '+(e.message||'')});}
};

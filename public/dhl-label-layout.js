(function(root){
  'use strict';
  function splitLabels(zpl){
    if(typeof zpl!=='string'||zpl.length>2000000)throw Error('Etiket verisi geçersiz veya çok büyük.');
    const labels=zpl.match(/\^XA[\s\S]*?\^XZ/g)||[];
    if(!labels.length||labels.length>100)throw Error('Etiket sayısı geçersiz.');
    return labels.map(text=>{
      const w=[...text.matchAll(/\^PW(\d+)/g)].at(-1),h=[...text.matchAll(/\^LL(\d+)/g)].at(-1);
      // DHL sandbox labels are 203 dpi (8 dots/mm). Do not crop to a guessed paper size.
      if(!w||!h)throw Error('Etiket ölçüleri bulunamadı; kesilmiş barkod basmamak için işlem durduruldu.');
      const widthDots=Number(w[1]),heightDots=Number(h[1]);
      if(widthDots<80||heightDots<80||widthDots>1600||heightDots>2400)throw Error('Etiket ölçüleri desteklenen aralık dışında.');
      return {zpl:text,widthDots,heightDots,widthMm:widthDots/8,heightMm:heightDots/8};
    });
  }
  if(typeof module!=='undefined')module.exports={splitLabels};
  else root.dhlLabelLayout={splitLabels};
})(globalThis);

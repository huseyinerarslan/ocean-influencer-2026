(async()=>{
  'use strict';
  const el=id=>document.getElementById(id),params=new URLSearchParams(location.search);
  const raw=params.get('ids')||params.get('order')||'';
  const ids=[...new Set(raw.split(','))];
  let worker,timer,stopped=false;
  const pending=[];
  function failed(message){stopped=true;clearTimeout(timer);worker?.terminate();el('error').textContent=message;el('status').textContent='Yazdırma hazır değil.';el('print').disabled=true;document.body.classList.remove('ready');el('labels').replaceChildren();}
  el('print').onclick=()=>{if(!el('print').disabled)window.print();};
  function canvas(w,h){const c=document.createElement('canvas');c.width=w;c.height=h;const ctx=c.getContext('2d');ctx.fillStyle='white';ctx.fillRect(0,0,w,h);ctx.imageSmoothingEnabled=false;return c;}
  async function prepare(d){
    const img=new Image();img.src='data:image/png;base64,'+d.png;await img.decode();
    const source=canvas(img.naturalWidth,img.naturalHeight);source.getContext('2d').drawImage(img,0,0);
    const pixels=source.getContext('2d').getImageData(0,0,source.width,source.height).data;
    let x0=source.width,y0=source.height,x1=-1,y1=-1;
    for(let y=0;y<source.height;y++)for(let x=0;x<source.width;x++){
      const p=(y*source.width+x)*4;
      if(pixels[p]<245||pixels[p+1]<245||pixels[p+2]<245){x0=Math.min(x0,x);x1=Math.max(x1,x);y0=Math.min(y0,y);y1=Math.max(y1,y);}
    }
    if(x1<0)throw Error('Boş etiket döndü.');
    // Keep every inked pixel and add 4 mm quiet space. Never resize barcode modules.
    const w=x1-x0+1,h=y1-y0+1,pad=32;
    const rotate=d.rotate && h+2*pad<=832;
    const out=canvas((rotate?h:w)+2*pad,(rotate?w:h)+2*pad),ctx=out.getContext('2d');
    if(rotate){ctx.translate(pad,pad+w);ctx.rotate(-Math.PI/2);ctx.drawImage(source,x0,y0,w,h,0,0,w,h);}
    else ctx.drawImage(source,x0,y0,w,h,pad,pad,w,h);
    if(out.width>832){
      // Added quiet-space must never reject a valid original DHL canvas.
      // Keep original pixels, dimensions and existing margins when the padded variant cannot fit.
      if(source.width<=832)return source;
      throw Error('DHL etiketinin orijinal genişliği 104 mm’yi aşıyor. Küçültmeden yazdırılamıyor.');
    }
    return out;
  }
  try{
    if(!ids.length||ids.length>50||ids.some(id=>!/^\d{1,9}$/.test(id)))throw Error('1–50 geçerli sipariş seçin.');
    const labels=[];
    for(let offset=0;offset<ids.length;offset+=4){
      const batch=await Promise.all(ids.slice(offset,offset+4).map(async id=>{
        const r=await fetch(`/api/orders/${id}/dhl/label`,{credentials:'same-origin',cache:'no-store'});
        if(!r.ok){const d=await r.json().catch(()=>({}));throw Error(`Sipariş #${id}: ${d.error||'Etiket alınamadı.'} Hiçbir etiket yazdırılmadı.`);}
        return r.text();
      }));labels.push(...batch);el('status').textContent=`${labels.length}/${ids.length} siparişin etiketleri yüklendi…`;
    }
    worker=new Worker('/dhl-label-worker.js?v=2',{type:'module'});
    timer=setTimeout(()=>failed('Dönüştürme zaman aşımına uğradı. Daha az sipariş seçip yeniden deneyin.'),180000);
    worker.onerror=()=>failed('Etiket dönüştürücüsü yüklenemedi. Sayfayı yenileyip tekrar deneyin.');
    worker.onmessage=async({data:d})=>{
      if(stopped)return;
      if(d.type==='error')return failed(d.message);
      if(d.type==='label'){
        const job=prepare(d);job.catch(()=>{});pending.push(job);
        el('status').textContent=`${d.index+1}/${d.total} etiket hazırlanıyor…`;
      }
      if(d.type==='done'){
        try{
          const rendered=await Promise.all(pending);if(stopped)return;
          if(!rendered.length)throw Error('Etiket görüntüsü boş.');
          const width=Math.max(...rendered.map(c=>c.width))<=800?800:832;
          const height=Math.ceil(Math.max(...rendered.map(c=>c.height))/80)*80;
          const images=[];
          for(const [i,c] of rendered.entries()){
            const page=canvas(width,height);page.getContext('2d').drawImage(c,Math.floor((width-c.width)/2),Math.floor((height-c.height)/2));
            const section=document.createElement('section');section.className='label';section.style.width=width/8+'mm';section.style.height=height/8+'mm';
            const img=new Image();img.alt=`DHL test etiketi ${i+1}`;img.src=page.toDataURL('image/png');section.append(img);el('labels').append(section);images.push(img);
          }
          await Promise.all(images.map(img=>img.decode()));if(stopped)return;
          const w=width/8,h=height/8,style=document.createElement('style');style.textContent=`@page { size: ${w}mm ${h}mm; margin: 0; }`;document.head.append(style);
          el('size').textContent=`Yazdırma kağıdı: ${w} × ${h} mm · 203 dpi · Ölçek %100 · Kenar boşlukları yok.`;
          el('status').textContent=`${ids.length} sipariş, ${images.length} etiket hazır. Her paket ayrı sayfadır. İlk baskıda barkodun okutulabildiğini kontrol edin.`;
          document.body.classList.add('ready');el('print').disabled=false;clearTimeout(timer);worker.terminate();
        }catch(e){failed(e.message);}
      }
    };
    worker.postMessage(labels.join('\n'));
  }catch(e){failed(e.message);}
})();

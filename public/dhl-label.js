(async()=>{
  'use strict';
  const el=id=>document.getElementById(id),params=new URLSearchParams(location.search);
  const raw=params.get('ids')||params.get('order')||'';
  const ids=[...new Set(raw.split(','))];
  let worker,timer,stopped=false;
  const pending=[];
  function failed(message){if(parent!==window)parent.postMessage({type:'dhl-print-error',message},location.origin);stopped=true;clearTimeout(timer);worker?.terminate();el('error').textContent=message;el('status').textContent='Yazdırma hazır değil.';el('print').disabled=true;document.body.classList.remove('ready');el('labels').replaceChildren();}
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
    const w=x1-x0+1,h=y1-y0+1;
    const out=canvas(d.rotate?h:w,d.rotate?w:h),ctx=out.getContext('2d');
    if(d.rotate){ctx.translate(0,w);ctx.rotate(-Math.PI/2);}
    ctx.drawImage(source,x0,y0,w,h,0,0,w,h);
    return out;
  }

  // Reclaim oversized blank lines between blocks on the compact roll.
  // Retain a quiet zone on each side of the gap.
  function compactRows(source){
    const {width,height}=source;
    const pixels=source.getContext('2d').getImageData(0,0,width,height).data;
    const keep=[];
    let blanks=0, identicalBars=0, previous=null;
    for(let y=0;y<height;y++){
      const row=pixels.subarray(y*width*4,(y+1)*width*4);
      let ink=false, edges=0, same=!!previous;
      for(let x=0;x<width;x++){
        const dark=row[x*4]<245;
        if(dark!==ink)edges++;
        ink=dark;
        if(same && row[x*4]!==previous[x*4])same=false;
      }
      blanks=edges===0 && !ink ? blanks+1 : 0;
      // Shorten only identical scan lines of a tall linear barcode.
      // Address text and matrix patterns retain their full height.
      identicalBars=edges>=30 && same ? identicalBars+1 : 0;
      if(blanks<=18 && identicalBars<80)keep.push(y);
      previous=row;
    }
    const result=canvas(width,keep.length),ctx=result.getContext('2d');
    let start=0;
    for(let i=1;i<=keep.length;i++){
      if(i<keep.length && keep[i]===keep[i-1]+1)continue;
      ctx.drawImage(source,0,keep[start],width,i-start,0,start,width,i-start);
      start=i;
    }
    return result;
  }
  function layout(artwork){
    for(const original of artwork){
      const sheet=document.createElement('section');
      sheet.className='label';
      sheet.append(compactRows(original));
      el('labels').append(sheet);
    }
    el('status').textContent=artwork.length+' etiket hazır.';
    el('print').disabled=false;
    document.body.classList.add('ready');
  }
  try{
    if(!ids.length||ids.length>50||ids.some(id=>!/^\d{1,9}$/.test(id)))throw Error('1–50 geçerli sipariş seçin.');
    const labels=[];
    for(let offset=0;offset<ids.length;offset+=4){
      const batch=await Promise.all(ids.slice(offset,offset+4).map(async id=>{
        const r=await fetch(`/api/orders/${id}/dhl/label${params.has('group')?'?group='+encodeURIComponent(params.get('group')):''}`,{credentials:'same-origin',cache:'no-store'});
        if(!r.ok){const d=await r.json().catch(()=>({}));throw Error(`Sipariş #${id}: ${d.error||'Etiket alınamadı.'} Hiçbir etiket yazdırılmadı.`);}
        return r.text();
      }));labels.push(...batch);el('status').textContent=`${labels.length}/${ids.length} siparişin etiketleri yüklendi…`;
    }
    worker=new Worker('/dhl-label-worker.js?v=4',{type:'module'});
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
          layout(rendered);clearTimeout(timer);worker.terminate();
          if(parent!==window)parent.postMessage({type:'dhl-print-ready'},location.origin);
        }catch(e){failed(e.message);}
      }
    };
    worker.postMessage(labels.join('\n'));
  }catch(e){failed(e.message);}
})();

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
    const w=x1-x0+1,h=y1-y0+1;
    const out=canvas(d.rotate?h:w,d.rotate?w:h),ctx=out.getContext('2d');
    if(d.rotate){ctx.translate(0,w);ctx.rotate(-Math.PI/2);}
    ctx.drawImage(source,x0,y0,w,h,0,0,w,h);
    return out;
  }

  let artwork=[];
  const pageRule=document.createElement('style');
  document.head.append(pageRule);
  const widthInput=el('paperWidth'),heightInput=el('paperHeight');
  try{
    const saved=JSON.parse(localStorage.getItem('dhl-print-mm') || 'null');
    if(saved){widthInput.value=saved.w;heightInput.value=saved.h;}
  }catch{}
  function layout(){
    if(!artwork.length)return;
    const w=widthInput.valueAsNumber,h=heightInput.valueAsNumber;
    const valid=widthInput.checkValidity() && heightInput.checkValidity();
    el('print').disabled=!valid;
    document.body.classList.toggle('ready',valid);
    el('error').textContent=valid?'':'Etiket enini 60–104 mm, boyunu 60–200 mm arasında girin.';
    el('labels').replaceChildren();
    if(!valid)return;
    const width=w*8,height=h*8,pad=32;
    for(const original of artwork){
      const page=canvas(width,height),ctx=page.getContext('2d');
      const fit=(x,y)=>Math.min((width-2*pad)/x,(height-2*pad)/y);
      const upright=fit(original.width,original.height), sideways=fit(original.height,original.width);
      const rotate=sideways>upright*1.05;
      const scale=rotate?sideways:upright;
      const dw=Math.round(original.width*scale),dh=Math.round(original.height*scale);
      const x=Math.floor((width-(rotate?dh:dw))/2),y=Math.floor((height-(rotate?dw:dh))/2);
      ctx.translate(x+(rotate?dh:0),y);
      if(rotate)ctx.rotate(Math.PI/2);
      ctx.drawImage(original,0,0,dw,dh);
      const sheet=document.createElement('section');
      sheet.className='label';sheet.style.setProperty('--w',w+'mm');sheet.style.setProperty('--h',h+'mm');
      sheet.append(page);el('labels').append(sheet);
    }
    pageRule.textContent='@page{size:'+w+'mm '+h+'mm;margin:0}';
    el('size').textContent=w+' × '+h+' mm';
    el('status').textContent=ids.length+' sipariş · '+artwork.length+' etiket hazır';
    try{localStorage.setItem('dhl-print-mm',JSON.stringify({w,h}));}catch{}
  }
  [widthInput,heightInput].forEach(input=>input.addEventListener('input',layout));
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
    worker=new Worker('/dhl-label-worker.js?v=3',{type:'module'});
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
          artwork=rendered;layout();clearTimeout(timer);worker.terminate();
        }catch(e){failed(e.message);}
      }
    };
    worker.postMessage(labels.join('\n'));
  }catch(e){failed(e.message);}
})();

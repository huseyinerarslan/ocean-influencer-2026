(async()=>{
  'use strict';
  const el=id=>document.getElementById(id),id=new URLSearchParams(location.search).get('order');
  let worker,timer;
  const images=[],sizes=[];
  function failed(message){clearTimeout(timer);worker?.terminate();el('error').textContent=message;el('status').textContent='Yazdırma hazır değil.';el('print').disabled=true;document.body.classList.remove('ready');}
  el('print').onclick=()=>{if(!el('print').disabled)window.print();};
  try{
    if(!/^\d{1,9}$/.test(id||''))throw Error('Geçerli bir sipariş seçin.');
    const r=await fetch(`/api/orders/${id}/dhl/label`,{credentials:'same-origin',cache:'no-store'});
    if(!r.ok){const d=await r.json().catch(()=>({}));throw Error(d.error||'Etiket alınamadı. Uygulamaya giriş yapıp tekrar deneyin.');}
    const zpl=await r.text();
    worker=new Worker('/dhl-label-worker.js?v=1',{type:'module'});
    timer=setTimeout(()=>failed('Dönüştürme zaman aşımına uğradı. Sayfayı yenileyip tekrar deneyin.'),90000);
    worker.onerror=()=>failed('Etiket dönüştürücüsü yüklenemedi. Sayfayı yenileyip tekrar deneyin.');
    worker.onmessage=async({data:d})=>{
      if(d.type==='error')return failed(d.message);
      if(d.type==='label'){
        const section=document.createElement('section');section.className='label';section.style.width=d.widthMm+'mm';section.style.height=d.heightMm+'mm';
        const img=new Image();img.alt=`DHL test etiketi ${d.index+1}`;img.src='data:image/png;base64,'+d.png;section.append(img);el('labels').append(section);
        images.push(img);sizes.push([d.widthMm,d.heightMm]);el('status').textContent=`${d.index+1} / ${d.total} etiket hazırlanıyor…`;
      }
      if(d.type==='done'){
        try{
          await Promise.all(images.map(img=>img.decode()));
          if(!images.length)throw Error('Etiket görüntüsü boş.');
          if(sizes.some(s=>s[0]!==sizes[0][0]||s[1]!==sizes[0][1]))throw Error('Paket etiketlerinin ölçüleri farklı. Birlikte yazdırılamıyor.');
          const [w,h]=sizes[0];const style=document.createElement('style');style.textContent=`@page { size: ${w}mm ${h}mm; margin: 0; }`;document.head.append(style);
          el('size').textContent=`DHL dosyasındaki etiket ölçüsü: ${w} × ${h} mm · 203 dpi.`;
          el('status').textContent=`${images.length} etiket hazır. İlk baskıda barkodun okutulabildiğini kontrol edin.`;
          document.body.classList.add('ready');el('print').disabled=false;clearTimeout(timer);worker.terminate();
        }catch(e){failed(e.message);}
      }
    };
    worker.postMessage(zpl);
  }catch(e){failed(e.message);}
})();

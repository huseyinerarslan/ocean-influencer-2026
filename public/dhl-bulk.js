(()=>{
  'use strict';
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const labels={NEW:'Adres henüz gönderilmedi',REJECTED:'Adres reddedildi; sipariş bilgilerini düzeltin',PREPARED:'Adres gönderildi',WAITING:'Varış şubesi bekleniyor',READY:'Barkod hazır',UNKNOWN:'DHL sonucu belirsiz; kontrol gerekiyor',CREATING:'Adres işlemi sürüyor veya kontrol gerekiyor',LABEL_CREATING:'Barkod işlemi sürüyor veya kontrol gerekiyor',LABEL_UNKNOWN:'Barkod sonucu belirsiz; kontrol gerekiyor'};
  async function request(id,suffix='',body){
    const r=await fetch(`/api/orders/${id}/dhl${suffix}`,{credentials:'same-origin',...(body?{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...body,sandbox:true})}:{})});
    const d=await r.json().catch(()=>({}));if(!r.ok)throw Error(d.error||'DHL işlemi başarısız.');return d;
  }
  window.openDhlBatch=async orders=>{
    if(!orders.length||orders.length>50)return alert('1–50 sipariş seçin.');
    if(document.getElementById('dhlBatchModal'))return;
    const modal=document.createElement('div');modal.id='dhlBatchModal';modal.className='ops-modal-bg show';modal.style.zIndex='10001';
    modal.innerHTML=`<div class="ops-modal"><h3>Toplu DHL · TEST ORTAMI</h3><p>1. Seçili siparişlerin kayıtlı alıcı adını ve adresini DHL test ortamına gönderin. 2. Her paketin kg/desisini girip barkodları oluşturun. Hazır barkodlar yeniden oluşturulmaz. Gerçek gönderi yapılmaz.</p><div class="ops-actions"><button class="btn primary" data-prepare>1. Adresleri teste gönder</button><button class="btn primary" data-create>2. Barkodları oluştur</button><button class="btn" data-refresh>Durumları yenile</button><button class="btn" data-print>Hazır barkodları yazdır</button><button class="btn" data-close>Kapat</button></div><p data-summary role="status" aria-live="polite"></p><div data-rows></div></div>`;
    document.body.append(modal);
    const get=s=>modal.querySelector(s);let busy=false;
    const rows=orders.map(o=>({order:o,data:null,until:0,error:'',element:null}));
    function setBusy(value){busy=value;modal.querySelectorAll('button,input').forEach(x=>x.disabled=value);if(!value)rows.forEach(update);}
    function addPackage(row,p={kg:'',desi:''}){
      const box=row.element.querySelector('[data-packages]');if(box.children.length>=20)return;
      const item=document.createElement('div');item.className='dhl-pack';item.innerHTML=`<b>Paket ${box.children.length+1}</b><label>Kg <input data-kg type="number" min="0.001" max="1000" step="0.001" value="${esc(p.kg)}"></label><label>Desi <input data-desi type="number" min="0.001" max="1000" step="0.001" value="${esc(p.desi)}"></label>`;box.append(item);
    }
    function update(row){
      const d=row.data,remaining=Math.max(0,Math.ceil((row.until-Date.now())/1000));
      row.element.querySelector('[data-status]').textContent=(d?labels[d.state]||d.state:'Durum alınamadı')+(remaining?' · '+remaining+' sn bekleyin':'')+(d?.reference?' · '+d.reference:'');
      row.element.querySelector('[data-error]').textContent=row.error;
      const frozen=!!d?.packages||d?.state==='READY';
      row.element.querySelectorAll('input,[data-add],[data-remove]').forEach(x=>x.disabled=busy||frozen);
      row.element.querySelector('[data-packages]').hidden=d?.state==='READY';
    }
    function accept(row,data){row.data=data;row.until=Date.now()+(data.retryAfter||0)*1000;
      if(data.packages){row.element.querySelector('[data-packages]').replaceChildren();data.packages.forEach(p=>addPackage(row,p));}update(row);
    }
    for(const row of rows){
      const o=row.order,section=document.createElement('section');section.style.cssText='border-top:1px solid #ddd;padding:14px 0';
      section.innerHTML=`<b>${esc(o.recipient_name)} · ${esc(o.order_no)}</b><p>${esc([o.address,o.district,o.city].filter(Boolean).join(' · '))}</p><p data-status></p><p data-error role="alert" style="color:#a11937"></p><div data-packages></div><button class="btn" data-add>Paket ekle</button> <button class="btn" data-remove>Son paketi kaldır</button>`;
      row.element=section;get('[data-rows]').append(section);addPackage(row);
      section.querySelector('[data-add]').onclick=()=>addPackage(row);
      section.querySelector('[data-remove]').onclick=()=>{const b=section.querySelector('[data-packages]');if(b.children.length>1)b.lastElementChild.remove();};
    }
    const summary=()=>{const ready=rows.filter(r=>r.data?.state==='READY').length;get('[data-summary]').textContent=`${ready}/${rows.length} siparişin barkodu hazır. ${rows.filter(r=>r.error).length} satırda hata var.`;};
    async function refresh(){if(busy)return;setBusy(true);
      for(const row of rows){try{accept(row,await request(row.order.id));row.error='';}catch(e){row.error=e.message;row.data=null;}update(row);}
      setBusy(false);summary();
    }
    async function run(kind){if(busy)return;
      const jobs=[];
      for(const row of rows){
        row.error='';const d=row.data;
        if(!d){row.error='Önce durumları yenileyin.';update(row);continue;}
        if(d.state==='READY')continue;
        if(kind==='prepare'){
          if(['NEW','REJECTED'].includes(d.state))jobs.push({row,suffix:'/prepare',body:{}});
        }else{
          if(!['PREPARED','WAITING'].includes(d.state)){row.error='Önce adresi gönderin; belirsiz işlemleri DHL ile kontrol edin.';update(row);continue;}
          if(Date.now()<row.until){row.error='Adres işleniyor. Sayaç bitince tekrar deneyin.';update(row);continue;}
          const packages=[...row.element.querySelectorAll('.dhl-pack')].map(p=>({kg:Number(p.querySelector('[data-kg]').value),desi:Number(p.querySelector('[data-desi]').value)}));
          if(!packages.length||packages.some(p=>![p.kg,p.desi].every(n=>Number.isFinite(n)&&n>0&&n<=1000))){row.error='Her paketin kg/desi değerini girin (0’dan büyük, en fazla 1000).';update(row);continue;}
          jobs.push({row,suffix:'/create',body:{packages}});
        }
      }
      setBusy(true);
      for(const [i,job] of jobs.entries()){
        get('[data-summary]').textContent=`${i+1}/${jobs.length} sipariş işleniyor; bu pencereyi açık tutun.`;
        try{accept(job.row,await request(job.row.order.id,job.suffix,job.body));}
        catch(e){job.row.error=e.message;try{accept(job.row,await request(job.row.order.id));}catch{}update(job.row);}
      }
      setBusy(false);summary();
    }
    get('[data-prepare]').onclick=()=>run('prepare');get('[data-create]').onclick=()=>run('create');get('[data-refresh]').onclick=refresh;
    get('[data-print]').onclick=()=>{const ids=rows.filter(r=>r.data?.state==='READY').map(r=>r.order.id);if(!ids.length){get('[data-summary]').textContent='Henüz hazır barkod yok.';return;}window.open('/dhl-label.html?ids='+ids.join(','),'_blank','noopener');};
    const timer=setInterval(()=>{if(!busy)rows.forEach(update);},1000);
    get('[data-close]').onclick=()=>{if(busy)return;clearInterval(timer);modal.remove();window.showBulkPrint?.();};
    await refresh();
  };
})();

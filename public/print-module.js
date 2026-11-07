(()=>{
  const el=id=>document.getElementById(id);
  const esc=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  const selected=new Set();let bulkOrders=[], readyLabels=new Set(), progress=new Map(), poll;
  const isImported=o=>/^EXCEL-/i.test(String(o?.order_no||''));
  const displayName=o=>isImported(o)?(o.recipient_name||'Influencer'):(o.recipient_name||o.order_no||'Sipariş');
  const dateTR=v=>{if(!v)return'—';const m=String(v).match(/^(\d{4})-(\d{2})-(\d{2})/);return m?`${m[3]}.${m[2]}.${m[1]}`:'—'};
  const req=async url=>{const r=await fetch(url,{credentials:'same-origin'});const d=await r.json().catch(()=>({}));if(!r.ok)throw Error(d.error||'İşlem başarısız');return d};
  const say=msg=>{try{toast(msg)}catch{alert(msg)}};

  const style=document.createElement('link');
  style.rel='stylesheet';style.href='/bulk-print.css?v=1';
  document.head.append(style);

  function openPrint(type,ids){if(!ids?.length)return say('Önce en az bir sipariş seç.');window.open('/print.html?type='+encodeURIComponent(type)+'&ids='+ids.join(','),'_blank');}
  window.printOneOrder=id=>openPrint('order',[id]);
  window.printOneLetter=id=>openPrint('letter',[id]);
  window.printBoth=id=>openPrint('both',[id]);

  function ensureMenuAndView(){
    const side=document.querySelector('.side');if(side&&!side.querySelector('[data-v="bulkprint"]')){
      const ordersBtn=[...side.querySelectorAll('[data-v]')].find(b=>b.dataset.v==='orders');const b=document.createElement('button');b.dataset.v='bulkprint';b.textContent='Toplu Yazdır';ordersBtn?.after(b);
      b.addEventListener('click',()=>showBulkPrint());
    }
    const main=document.querySelector('.main');if(main&&!el('bulkprint')){
      const sec=document.createElement('section');sec.id='bulkprint';sec.className='view';sec.innerHTML=`
      <div class="bp-heading"><div><h3>Toplu çıktı</h3><p>Siparişlerini seç, belgelerini ve kargo etiketlerini birlikte hazırla.</p></div><span id="bpCount" role="status" aria-live="polite">0 sipariş seçili</span></div>
      <div class="bp-workspace">
        <div class="bp-orders">
          <div class="bp-search"><label for="bpSearch">Sipariş ara</label><input id="bpSearch" type="search" placeholder="İsim, sipariş numarası veya şehir"></div>
          <div class="bp-selection"><span id="bpVisible"></span><div><button id="bpAll">Listedekileri seç</button><button id="bpClear">Seçimi temizle</button></div></div>
          <div id="bpList" class="bulk-print-list"></div>
        </div>
        <aside class="bp-actions" aria-label="Seçili siparişlerin çıktıları">
          <section class="bp-card"><div class="bp-card-heading"><span class="bp-symbol" aria-hidden="true">≡</span><h4>Sipariş belgeleri</h4></div>
            <button class="bp-document" id="bpOrders"><span><b>Sipariş kağıtları</b><small>Ürün listesi · A5 dikey</small></span><span aria-hidden="true">↗</span></button>
            <button class="bp-document" id="bpLetters"><span><b>Yazı kağıtları</b><small>Kişiye özel not · A5 yatay</small></span><span aria-hidden="true">↗</span></button>
          </section>
          <section class="bp-card bp-shipping"><div class="bp-card-heading"><span class="bp-symbol" aria-hidden="true">▣</span><div><h4>Kargo etiketleri</h4><small>DHL eCommerce</small></div><span class="bp-test">Test</span></div>
            <p id="bpReadyCount" aria-live="polite">Başlamak için sipariş seç.</p>
            <button class="bp-print" id="bpDhl">Etiketleri yazdır <span aria-hidden="true">↗</span></button>
            <button class="bp-prepare" id="bpDhlCreate">Eksik etiketleri hazırla</button>
            <small class="bp-note">Her paket ayrı etiket olarak yazdırılır.</small>
          </section>
        </aside>
      </div>`;main.appendChild(sec);
      el('bpDhlCreate').onclick=()=>window.openDhlBatch([...selected].filter(id=>!readyLabels.has(id)).map(id=>bulkOrders.find(o=>Number(o.id)===id)).filter(Boolean));
      el('bpDhl').onclick=()=>{
        const ids=[...selected];
        if(!ids.length)return say('Önce sipariş seçin.');
        if(ids.length>50)return say('Tek seferde en fazla 50 sipariş seçin.');
        const missing=ids.filter(id=>!readyLabels.has(id));
        if(missing.length)return say(missing.length+' siparişin DHL test barkodu hazır değil. Yalnızca DHL hazır yazan kayıtları seçin.');
        window.printDhlLabels(ids);
      };
      el('bpSearch').addEventListener('input',renderBulk);el('bpAll').onclick=()=>{filteredBulk().forEach(o=>selected.add(Number(o.id)));renderBulk()};el('bpClear').onclick=()=>{selected.clear();renderBulk()};el('bpOrders').onclick=()=>openPrint('order',[...selected]);el('bpLetters').onclick=()=>openPrint('letter',[...selected]);
    }
  }

  function filteredBulk(){const q=(el('bpSearch')?.value||'').toLocaleLowerCase('tr-TR').trim();if(!q)return bulkOrders;return bulkOrders.filter(o=>[o.recipient_name,o.order_no,o.city,o.district].some(v=>String(v||'').toLocaleLowerCase('tr-TR').includes(q)))}
  const orderStates={NEW:'Yeni',PREPARING:'Hazırlanıyor',SHIPPED:'Kargoya çıktı',DONE:'Tamamlandı',ARCHIVED:'Arşivde'};
  function labelState(id){
    if(readyLabels.has(id))return ['ready','Etiket hazır'];
    if(progress.has(id))return progress.get(id)?['error','Kontrol gerekli']:['pending','Etiket hazırlanıyor'];
    return ['missing','Etiket bekliyor'];
  }
  function renderBulk(){
    const list=el('bpList');if(!list)return;
    const rows=filteredBulk();
    el('bpVisible').textContent=rows.length+' sipariş listeleniyor';
    list.innerHTML=rows.map(o=>{
      const id=Number(o.id),[state,label]=labelState(id);
      return `<label class="bulk-print-row ${selected.has(id)?'is-selected':''}">
        <input class="bpcheck" type="checkbox" value="${id}" aria-label="${esc(displayName(o))} siparişini seç" ${selected.has(id)?'checked':''}>
        <div class="bp-recipient"><b>${esc(displayName(o))}</b><span>${esc(isImported(o)?'Excel kaydı':o.order_no||'')} · ${dateTR(o.order_date)}</span><small>${esc([o.district,o.city].filter(Boolean).join(' / ')||'Adres bilgisi eksik')}</small></div>
        <div class="bp-row-state"><span class="bp-state bp-${state}" title="${esc(progress.get(id)||label)}">${label}</span><small>${esc(orderStates[o.status]||o.status||'')} · ${o.letter_template_no?'Yazı '+esc(o.letter_template_no):'Yazı seçilmemiş'}</small></div>
      </label>`;
    }).join('') || '<div class="bp-empty"><b>Sipariş bulunamadı</b><p>Arama ifadesini değiştirerek tekrar deneyebilirsin.</p></div>';
    list.querySelectorAll('.bpcheck').forEach(c=>c.onchange=()=>{
      const id=Number(c.value);
      c.checked?selected.add(id):selected.delete(id);
      c.closest('label').classList.toggle('is-selected',c.checked);
      updateCount();
    });
    updateCount();
  }
  function updateCount(){
    if(!el('bpCount'))return;
    const count=selected.size,ready=[...selected].filter(id=>readyLabels.has(id)).length;
    el('bpCount').textContent=count+' sipariş seçili';
    const hidden=[...selected].filter(id=>!filteredBulk().some(o=>Number(o.id)===id)).length;
    el('bpCount').textContent+=hidden?' · '+hidden+' seçim arama dışında':'';
    el('bpReadyCount').textContent=count?ready+'/'+count+' seçili siparişin etiketi hazır'+(ready<count?'. Eksik etiketleri hazırlayabilirsin.':'. Yazdırmaya hazırsın.'):'Başlamak için sipariş seç.';
    el('bpOrders').disabled=!count;
    el('bpLetters').disabled=!count;
    el('bpDhl').disabled=!count||ready!==count||count>50;
    el('bpDhlCreate').disabled=!count||ready===count||count>50;
    el('bpClear').disabled=!count;
    if(count>50)el('bpReadyCount').textContent='Kargo işlemi için en fazla 50 sipariş seçebilirsin.';
  }
  async function refreshLabels(){
    clearTimeout(poll);
    const [ready,jobs]=await Promise.all([req('/api/dhl/ready-labels'),req('/api/dhl/label-progress')]);
    readyLabels=new Set(ready.map(x=>Number(x.order_id)));
    progress=new Map(jobs.map(x=>[Number(x.order_id),x.error]));
    renderBulk();
    if(jobs.some(x=>!x.error))poll=setTimeout(()=>{if(el('bulkprint')?.classList.contains('active'))refreshLabels().catch(e=>say(e.message));},5000);
  }
  async function showBulkPrint(){ensureMenuAndView();document.querySelectorAll('.view').forEach(v=>v.classList.remove('active'));el('bulkprint')?.classList.add('active');document.querySelectorAll('.side [data-v]').forEach(b=>b.classList.toggle('active',b.dataset.v==='bulkprint'));if(el('title'))el('title').textContent='Toplu Yazdır';try{bulkOrders=await req('/api/orders');const current=new Set(bulkOrders.map(o=>Number(o.id)));for(const id of selected){if(!current.has(id))selected.delete(id);}renderBulk();await refreshLabels().catch(()=>{})}catch(e){say(e.message)}}
  window.showBulkPrint=showBulkPrint;

  const originalOpen=window.openOrderDetail;
  if(typeof originalOpen==='function'){
    window.openOrderDetail=async function(id){await originalOpen(id);let box=el('orderDetailModal')?.querySelector('.print-detail-buttons');if(!box){box=document.createElement('div');box.className='print-detail-buttons';box.innerHTML=`<div class="dispatch-doc-heading"><h4>Sipariş belgeleri</h4><button class="btn" id="printBothOne">İkisini yazdır ↗</button></div><div class="dispatch-doc-grid"><button class="dispatch-document" id="printOrderOne"><span class="dispatch-paper" aria-hidden="true">≡</span><span><b>Sipariş kağıdı</b><small>Ürün listesi · A5 dikey</small></span><span aria-hidden="true">↗</span></button><button class="dispatch-document" id="printLetterOne"><span class="dispatch-paper" aria-hidden="true">✉</span><span><b>Yazı kağıdı</b><small>Kişiye özel not · A5 yatay</small></span><span aria-hidden="true">↗</span></button></div>`;const actions=el('orderDetailModal')?.querySelector('.ops-detail-grid')?.nextElementSibling;actions?.after(box)}if(box){el('printOrderOne').onclick=()=>openPrint('order',[id]);el('printLetterOne').onclick=()=>openPrint('letter',[id]);el('printBothOne').onclick=()=>openPrint('both',[id])}}
  }

  ensureMenuAndView();
})();
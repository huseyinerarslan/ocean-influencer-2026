(()=>{
  const el=id=>document.getElementById(id);
  const esc=s=>String(s??'').replace(/[&<>\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[c]));
  const selected=new Set();let bulkOrders=[];
  const isImported=o=>/^EXCEL-/i.test(String(o?.order_no||''));
  const displayName=o=>isImported(o)?(o.recipient_name||'Influencer'):(o.recipient_name||o.order_no||'Sipariş');
  const dateTR=v=>{if(!v)return'—';const m=String(v).match(/^(\d{4})-(\d{2})-(\d{2})/);return m?`${m[3]}.${m[2]}.${m[1]}`:'—'};
  const req=async url=>{const r=await fetch(url,{credentials:'same-origin'});const d=await r.json().catch(()=>({}));if(!r.ok)throw Error(d.error||'İşlem başarısız');return d};
  const say=msg=>{try{toast(msg)}catch{alert(msg)}};

  const style=document.createElement('style');style.textContent=`
    .print-tools{display:flex;gap:8px;flex-wrap:wrap;margin:0 0 14px}.print-tools .count{display:flex;align-items:center;padding:0 10px;font-weight:700;color:#526174}
    .bulk-print-list{display:grid;gap:8px}.bulk-print-row{display:grid;grid-template-columns:auto minmax(190px,1.5fr) minmax(140px,.7fr) minmax(120px,.55fr) minmax(120px,.55fr);gap:12px;align-items:center;background:#fff;border:1px solid #e1e7ef;border-radius:12px;padding:12px}.bulk-print-row input[type=checkbox]{width:20px;height:20px}.bulk-name{font-weight:750}.bulk-sub{font-size:12px;color:#718096;margin-top:3px}.print-detail-buttons{display:flex;gap:8px;flex-wrap:wrap;margin:4px 0 14px}.print-detail-buttons .btn{flex:0 0 auto}
    @media(max-width:800px){.print-tools{display:grid;grid-template-columns:1fr 1fr}.print-tools .count{grid-column:1/-1;padding:4px 0}.bulk-print-row{grid-template-columns:auto 1fr auto;padding:12px}.bulk-print-row .bulk-date,.bulk-print-row .bulk-template{display:none}.bulk-print-row .bulk-status{grid-column:2;color:#64748b;font-size:13px}.print-detail-buttons{display:grid;grid-template-columns:1fr}.print-detail-buttons .btn{width:100%}}
  `;document.head.appendChild(style);

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
      const sec=document.createElement('section');sec.id='bulkprint';sec.className='view';sec.innerHTML=`<div class="card panel"><h3>Toplu Yazdır</h3><p class="muted">Siparişleri seç. Sipariş kağıtları A5 dikey, yazı kağıtları A5 yatay olarak ayrı baskı işi açılır.</p><div class="toolbar"><input id="bpSearch" placeholder="Influencer / sipariş / şehir ara"></div><div class="print-tools"><button class="btn" id="bpAll">Tümünü Seç</button><button class="btn" id="bpClear">Seçimi Temizle</button><button class="btn primary" id="bpOrders">Seçili Sipariş Kağıtları</button><button class="btn primary" id="bpLetters">Seçili Yazı Kağıtları</button><span class="count" id="bpCount">0 seçili</span></div><div id="bpList" class="bulk-print-list"></div></div>`;main.appendChild(sec);
      el('bpSearch').addEventListener('input',renderBulk);el('bpAll').onclick=()=>{filteredBulk().forEach(o=>selected.add(Number(o.id)));renderBulk()};el('bpClear').onclick=()=>{selected.clear();renderBulk()};el('bpOrders').onclick=()=>openPrint('order',[...selected]);el('bpLetters').onclick=()=>openPrint('letter',[...selected]);
    }
  }

  function filteredBulk(){const q=(el('bpSearch')?.value||'').toLocaleLowerCase('tr-TR').trim();if(!q)return bulkOrders;return bulkOrders.filter(o=>[o.recipient_name,o.order_no,o.city,o.district].some(v=>String(v||'').toLocaleLowerCase('tr-TR').includes(q)))}
  function renderBulk(){const list=el('bpList');if(!list)return;const rows=filteredBulk();list.innerHTML=rows.map(o=>`<label class="bulk-print-row"><input class="bpcheck" type="checkbox" value="${o.id}" ${selected.has(Number(o.id))?'checked':''}><div><div class="bulk-name">${esc(displayName(o))}</div><div class="bulk-sub">${isImported(o)?'Eski Excel kaydı':esc(o.order_no||'')}</div></div><div class="bulk-date">${dateTR(o.order_date)}</div><div class="bulk-template">Yazı: ${esc(o.letter_template_no||'Yok')}</div><div class="bulk-status">${esc(o.status||'')}</div></label>`).join('')||'<div class="muted">Kayıt bulunamadı.</div>';list.querySelectorAll('.bpcheck').forEach(c=>c.onchange=()=>{const id=Number(c.value);c.checked?selected.add(id):selected.delete(id);updateCount()});updateCount()}
  function updateCount(){if(el('bpCount'))el('bpCount').textContent=selected.size+' seçili'}
  async function showBulkPrint(){ensureMenuAndView();document.querySelectorAll('.view').forEach(v=>v.classList.remove('active'));el('bulkprint')?.classList.add('active');document.querySelectorAll('.side [data-v]').forEach(b=>b.classList.toggle('active',b.dataset.v==='bulkprint'));if(el('title'))el('title').textContent='Toplu Yazdır';try{bulkOrders=await req('/api/orders');renderBulk()}catch(e){say(e.message)}}
  window.showBulkPrint=showBulkPrint;

  const originalOpen=window.openOrderDetail;
  if(typeof originalOpen==='function'){
    window.openOrderDetail=async function(id){await originalOpen(id);let box=el('orderDetailModal')?.querySelector('.print-detail-buttons');if(!box){box=document.createElement('div');box.className='print-detail-buttons';box.innerHTML=`<button class="btn" id="printOrderOne">Sipariş Kağıdı</button><button class="btn" id="printLetterOne">Yazı Kağıdı</button><button class="btn primary" id="printBothOne">İkisini Yazdır</button>`;const actions=el('orderDetailModal')?.querySelector('.ops-detail-grid')?.nextElementSibling;actions?.after(box)}if(box){el('printOrderOne').onclick=()=>openPrint('order',[id]);el('printLetterOne').onclick=()=>openPrint('letter',[id]);el('printBothOne').onclick=()=>openPrint('both',[id])}}
  }

  ensureMenuAndView();
})();
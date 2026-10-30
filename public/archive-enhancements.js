(()=>{
  const $=id=>document.getElementById(id);
  const esc=s=>String(s??'').replace(/[&<>\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[c]));
  const apiA=async(url,opt={})=>{const headers={...(opt.headers||{})};if(opt.body)headers['Content-Type']='application/json';const r=await fetch(url,{credentials:'same-origin',...opt,headers});const d=await r.json().catch(()=>({}));if(!r.ok)throw Error(d.error||'İşlem başarısız');return d};
  const say=m=>{try{toast(m)}catch{console.log(m)}};
  const dateKey=v=>{const m=String(v||'').match(/^(\d{4})-(\d{2})-(\d{2})/);return m?`${m[1]}-${m[2]}-${m[3]}`:''};
  const dateTR=v=>{const k=dateKey(v);if(!k)return '—';const [y,m,d]=k.split('-');return `${d}.${m}.${y}`};
  const statusText=s=>({NEW:'Yeni',PREPARING:'Hazırlanıyor','Çıkarıldı':'Çıkarıldı',SHIPPED:'Kargoya çıktı',DONE:'Tamamlandı',ARCHIVED:'Arşivde'}[s]||s||'—');
  let archiveQuery='';

  const style=document.createElement('style');
  style.textContent=`
    .side button[data-v="archive"]::before{content:'▱';display:inline-grid;place-items:center;width:20px;height:20px;border-radius:6px;background:rgba(255,255,255,.07);font-size:12px;color:#a9c8dd;flex:0 0 20px}
    .archive-head{display:flex;align-items:flex-start;justify-content:space-between;gap:14px;margin-bottom:14px}.archive-head h3{margin:0 0 3px}.archive-head p{margin:0;color:#718096;font-size:13px}.archive-search{min-width:280px;border:1px solid #d4dee8;border-radius:9px;padding:9px 11px;background:#fff}
    .archive-empty{padding:30px;text-align:center;color:#8491a1;border:1px dashed #d7e0e8;border-radius:12px;background:#fbfcfd}
    .btn.archive{background:#eef2f6!important;color:#394b5f!important}.btn.restore{background:#e9f6ef!important;color:#18714a!important;border-color:#cae8d7!important}
    @media(max-width:900px){.archive-head{flex-direction:column}.archive-search{min-width:0;width:100%}}
  `;
  document.head.appendChild(style);

  function ensureArchiveUI(){
    const side=document.querySelector('.side');
    if(side&&!side.querySelector('[data-v="archive"]')){
      const b=document.createElement('button');b.dataset.v='archive';b.textContent='Arşiv';
      const ordersBtn=side.querySelector('[data-v="orders"]');
      if(ordersBtn)ordersBtn.insertAdjacentElement('afterend',b);else side.appendChild(b);
      b.onclick=()=>showArchive();
    }
    const main=document.querySelector('.main');
    if(main&&!$('archive')){
      const sec=document.createElement('section');sec.id='archive';sec.className='view';
      sec.innerHTML=`<div class="card panel"><div class="archive-head"><div><h3>Sipariş Arşivi</h3><p>Operasyon ve raporların dışında tutulan geçmiş siparişler.</p></div><input id="archiveSearch" class="archive-search" placeholder="Sipariş no / kişi / şehir ara"></div><div class="tablewrap"><table class="table"><thead><tr><th>Sipariş</th><th>Tarih</th><th>Alıcı</th><th>Şehir</th><th>Durum</th><th></th></tr></thead><tbody id="archiveRows"></tbody></table></div></div>`;
      const orders=$('orders');if(orders)orders.insertAdjacentElement('afterend',sec);else main.appendChild(sec);
      $('archiveSearch')?.addEventListener('input',e=>{archiveQuery=e.target.value.toLocaleLowerCase('tr-TR');loadArchive()});
    }
    const actions=document.querySelector('#orderDetailModal .ops-actions');
    if(actions&&!$('archiveOrderBtn')){
      const b=document.createElement('button');b.id='archiveOrderBtn';b.className='btn archive';b.textContent='Arşive Al';b.onclick=()=>toggleCurrentArchive();actions.appendChild(b);
    }
    const status=$('odStatus');
    if(status&&![...status.options].some(o=>o.value==='ARCHIVED')){const op=document.createElement('option');op.value='ARCHIVED';op.textContent='Arşivde';status.appendChild(op)}
  }

  async function showArchive(){
    document.querySelectorAll('.view').forEach(x=>x.classList.remove('active'));$('archive')?.classList.add('active');
    document.querySelectorAll('.side [data-v]').forEach(x=>x.classList.toggle('active',x.dataset.v==='archive'));
    if($('title'))$('title').textContent='Arşiv';
    await loadArchive();
  }

  async function loadArchive(){
    const rows=await apiA('/api/orders?status=ARCHIVED');
    const filtered=rows.filter(x=>!archiveQuery||[x.order_no,x.recipient_name,x.city,x.district].join(' ').toLocaleLowerCase('tr-TR').includes(archiveQuery));
    const body=$('archiveRows');if(!body)return;
    body.innerHTML=filtered.length?filtered.map(x=>`<tr class="ops-order-row" onclick="openOrderDetail(${x.id})"><td><b>${esc(x.order_no)}</b></td><td>${dateTR(x.order_date)}</td><td>${esc(x.recipient_name)}</td><td>${esc(x.city||'')}</td><td><span class="badge">Arşivde</span></td><td><span class="ops-actions"><button class="btn" onclick="event.stopPropagation();openOrderDetail(${x.id})">Aç</button><button class="btn restore" onclick="event.stopPropagation();restoreOrder(${x.id})">Arşivden Çıkar</button></span></td></tr>`).join(''):`<tr><td colspan="6"><div class="archive-empty">Arşivde sipariş yok.</div></td></tr>`;
  }
  window.loadArchive=loadArchive;

  const baseLoadOrders=window.loadOrders;
  window.loadOrders=async function(){
    const q=new URLSearchParams();
    if($('oq')?.value)q.set('q',$('oq').value);
    if($('os')?.value&&$('os').value!=='all')q.set('status',$('os').value);
    if($('od')?.value)q.set('date',$('od').value);
    if($('of')?.value)q.set('from',$('of').value);
    if($('ot')?.value)q.set('to',$('ot').value);
    const all=await apiA('/api/orders?'+q);
    const orders=all.filter(x=>x.status!=='ARCHIVED');
    const tbody=$('orderRows');
    if(tbody)tbody.innerHTML=orders.map(x=>`<tr class="ops-order-row" onclick="openOrderDetail(${x.id})"><td><b>${esc(x.order_no)}</b></td><td><button class="btn primary ops-open" onclick="event.stopPropagation();openOrderDetail(${x.id})">Aç</button></td><td>${dateTR(x.order_date)}</td><td>${esc(x.recipient_name)}</td><td>${esc(x.city||'')}</td><td><span class="badge ${x.status==='DONE'?'done':'new'}">${esc(statusText(x.status))}</span></td><td>${x.waybill_no?esc(x.waybill_no):'<span class="muted">Bekliyor</span>'}</td><td>${x.dhl_tracking_no?esc(x.dhl_tracking_no):'<span class="muted">Bekliyor</span>'}</td></tr>`).join('');
    const activeAll=(await apiA('/api/orders')).filter(x=>x.status!=='ARCHIVED');
    const counts={};activeAll.forEach(x=>{const k=dateKey(x.order_date);if(k)counts[k]=(counts[k]||0)+1});
    const days=Object.entries(counts).sort((a,b)=>b[0].localeCompare(a[0])).slice(0,60);
    const box=$('days');if(box)box.innerHTML=days.map(([k,n])=>`<button class="day" onclick="filterDay('${k}')"><b>${dateTR(k)}</b><span>${n} sipariş</span></button>`).join('');
  };

  const baseDashboard=window.dashboard;
  window.dashboard=async function(){
    const orders=(await apiA('/api/orders')).filter(x=>x.status!=='ARCHIVED');
    const stats=$('stats');
    if(stats)stats.innerHTML=[['Toplam',orders.length],['Yeni',orders.filter(x=>x.status==='NEW').length],['Kargoya Çıktı',orders.filter(x=>x.status==='SHIPPED').length],['Tamamlandı',orders.filter(x=>x.status==='DONE').length]].map(x=>`<div class="card stat"><span class="muted">${x[0]}</span><br><b>${x[1]}</b></div>`).join('');
    const recent=$('recent');if(recent)recent.innerHTML=orders.slice(0,6).map(x=>`<div style="padding:10px 0;border-bottom:1px solid #edf1f5;cursor:pointer" onclick="openOrderDetail(${x.id})"><b>${esc(x.order_no)}</b> · ${esc(x.recipient_name)}<div class="muted">${dateTR(x.order_date)} · ${esc(x.city||'-')} · ${esc(statusText(x.status))}</div></div>`).join('')||'<p class="muted">Aktif sipariş yok.</p>';
  };

  const baseOpen=window.openOrderDetail;
  if(typeof baseOpen==='function')window.openOrderDetail=async function(id){window.__archiveOrderId=id;await baseOpen(id);const x=await apiA('/api/orders/'+id+'/detail');const b=$('archiveOrderBtn');if(b){b.textContent=x.status==='ARCHIVED'?'Arşivden Çıkar':'Arşive Al';b.className=x.status==='ARCHIVED'?'btn restore':'btn archive'}ensureArchiveUI()};

  async function toggleCurrentArchive(){const id=window.__archiveOrderId;if(!id)return;const x=await apiA('/api/orders/'+id+'/detail');if(x.status==='ARCHIVED')return restoreOrder(id);if(!confirm(`${x.order_no} arşive alınsın mı? Bu sipariş raporlarda sayılmayacak.`))return;await apiA('/api/orders/'+id,{method:'PATCH',body:JSON.stringify({status:'ARCHIVED',archived_from:x.status})});say('Sipariş arşive alındı');try{closeOrderDetail()}catch{};await window.loadOrders?.();await window.dashboard?.();if($('archive')?.classList.contains('active'))await loadArchive()}
  window.toggleCurrentArchive=toggleCurrentArchive;
  window.archiveOrder=async id=>{window.__archiveOrderId=id;return toggleCurrentArchive()};
  window.restoreOrder=async function(id){const activity=await apiA('/api/orders/'+id+'/activity');const a=activity.find(x=>x.action==='ORDER_UPDATED'&&x.details?.status==='ARCHIVED'&&x.details?.archived_from);const status=a?.details?.archived_from||'DONE';await apiA('/api/orders/'+id,{method:'PATCH',body:JSON.stringify({status})});say('Sipariş arşivden çıkarıldı');try{closeOrderDetail()}catch{};await loadArchive();await window.loadOrders?.();await window.dashboard?.()};

  const oldGo=window.go;
  window.go=function(v){if(v==='archive')return showArchive();return typeof oldGo==='function'?oldGo(v):undefined};

  ensureArchiveUI();
  new MutationObserver(ensureArchiveUI).observe(document.body,{childList:true,subtree:true});
})();
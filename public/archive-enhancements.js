(()=>{
  'use strict';

  const $=id=>document.getElementById(id);
  const esc=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  const apiA=async(url,opt={})=>{
    const headers={...(opt.headers||{})};
    if(opt.body)headers['Content-Type']='application/json';
    const r=await fetch(url,{credentials:'same-origin',...opt,headers});
    const d=await r.json().catch(()=>({}));
    if(!r.ok)throw Error(d.error||'İşlem başarısız');
    return d;
  };
  const say=message=>{try{toast(message)}catch{console.log(message)}};
  const dateKey=v=>{const m=String(v||'').match(/^(\d{4})-(\d{2})-(\d{2})/);return m?`${m[1]}-${m[2]}-${m[3]}`:''};
  const dateTR=v=>{const k=dateKey(v);if(!k)return '—';const [y,m,d]=k.split('-');return `${d}.${m}.${y}`};
  const statusText=s=>({NEW:'Yeni',PREPARING:'Hazırlanıyor','Çıkarıldı':'Çıkarıldı',SHIPPED:'Kargoya çıktı',DONE:'Tamamlandı',ARCHIVED:'Arşivde'}[s]||s||'—');
  const isImported=o=>/^EXCEL-/i.test(String(o?.order_no||''));
  const recordTitle=o=>isImported(o)?(o.recipient_name||'Influencer'):(o.order_no||o.recipient_name||'Sipariş');
  const recordSub=o=>isImported(o)?'Eski Excel kaydı':(o.recipient_name||'');

  let archiveQuery='';

  const style=document.createElement('style');
  style.id='archive-module-style';
  style.textContent=`
    .side button[data-v="archive"]::before{content:'▱'}
    .archive-head{display:flex;align-items:flex-start;justify-content:space-between;gap:14px;margin-bottom:14px}
    .archive-head h3{margin:0 0 3px}
    .archive-head p{margin:0;color:#718096;font-size:13px}
    .archive-search{min-width:280px;border:1px solid #d4dee8;border-radius:9px;padding:9px 11px;background:#fff}
    .archive-empty{padding:30px;text-align:center;color:#8491a1;border:1px dashed #d7e0e8;border-radius:12px;background:#fbfcfd}
    .btn.archive{background:#eef2f6;color:#394b5f}
    .btn.restore{background:#e9f6ef;color:#18714a;border-color:#cae8d7}
    .ops-record-sub{font-size:12px;color:#718096;margin-top:3px}
    .ops-mobile-meta{display:none}
    @media(max-width:900px){.archive-head{flex-direction:column}.archive-search{min-width:0;width:100%}}
  `;
  document.head.appendChild(style);

  function ensureArchiveUI(){
    const side=document.querySelector('.side');
    if(side&&!side.querySelector('[data-v="archive"]')){
      const button=document.createElement('button');
      button.dataset.v='archive';
      button.textContent='Arşiv';
      side.insertBefore(button, side.querySelector('[onclick="logout()"]'));
      button.onclick=showArchive;
    }

    const main=document.querySelector('.main');
    if(main&&!$('archive')){
      const section=document.createElement('section');
      section.id='archive';
      section.className='view';
      section.innerHTML=`<div class="card panel"><div class="archive-head"><div><h3>Sipariş Arşivi</h3><p>Operasyon ve raporların dışında tutulan geçmiş siparişler.</p></div><input id="archiveSearch" class="archive-search" placeholder="Sipariş no / kişi / şehir ara"></div><div class="tablewrap"><table class="table"><thead><tr><th>Sipariş</th><th>Tarih</th><th>Alıcı</th><th>Şehir</th><th>Durum</th><th></th></tr></thead><tbody id="archiveRows"></tbody></table></div></div>`;
      const orders=$('orders');
      if(orders)orders.insertAdjacentElement('afterend',section);
      else main.appendChild(section);
      $('archiveSearch')?.addEventListener('input',e=>{
        archiveQuery=e.target.value.toLocaleLowerCase('tr-TR');
        loadArchive();
      });
    }

    const status=$('odStatus');
    if(status&&![...status.options].some(option=>option.value==='ARCHIVED')){
      const option=document.createElement('option');
      option.value='ARCHIVED';
      option.textContent='Arşivde';
      status.appendChild(option);
    }
  }

  function ensureArchiveAction(){
    const actions=document.querySelector('#orderDetailModal .ops-actions');
    if(!actions||$('archiveOrderBtn'))return;
    const button=document.createElement('button');
    button.id='archiveOrderBtn';
    button.className='btn archive';
    button.textContent='Arşive Al';
    button.onclick=toggleCurrentArchive;
    actions.appendChild(button);
  }

  async function showArchive(){
    ensureArchiveUI();
    document.querySelectorAll('.view').forEach(view=>view.classList.remove('active'));
    $('archive')?.classList.add('active');
    document.querySelectorAll('.side [data-v]').forEach(button=>button.classList.toggle('active',button.dataset.v==='archive'));
    if($('title'))$('title').textContent='Arşiv';
    await loadArchive();
  }

  async function loadArchive(){
    const rows=await apiA('/api/orders?status=ARCHIVED');
    const filtered=rows.filter(x=>
      !archiveQuery||[x.order_no,x.recipient_name,x.city,x.district]
        .join(' ')
        .toLocaleLowerCase('tr-TR')
        .includes(archiveQuery)
    );
    const body=$('archiveRows');
    if(!body)return;
    body.innerHTML=filtered.length?filtered.map(x=>`<tr onclick="openOrderDetail(${x.id})"><td><b>${esc(x.order_no)}</b></td><td>${dateTR(x.order_date)}</td><td>${esc(x.recipient_name)}</td><td>${esc(x.city||'')}</td><td><span class="badge">Arşivde</span></td><td><span class="ops-actions"><button class="btn" onclick="event.stopPropagation();openOrderDetail(${x.id})">Aç</button><button class="btn restore" onclick="event.stopPropagation();restoreOrder(${x.id})">Arşivden Çıkar</button></span></td></tr>`).join(''):`<tr><td colspan="6"><div class="archive-empty">Arşivde sipariş yok.</div></td></tr>`;
  }
  window.loadArchive=loadArchive;

  window.loadOrders=async function(){
    const query=new URLSearchParams();
    if($('oq')?.value)query.set('q',$('oq').value);
    if($('os')?.value&&$('os').value!=='all')query.set('status',$('os').value);
    if($('od')?.value)query.set('date',$('od').value);
    if($('of')?.value)query.set('from',$('of').value);
    if($('ot')?.value)query.set('to',$('ot').value);

    const all=await apiA('/api/orders?'+query);
    const orders=all.filter(x=>x.status!=='ARCHIVED');

    const head=document.querySelector('#orders thead tr');
    if(head)head.innerHTML='<th>Kayıt</th><th>Detay</th><th>Tarih</th><th>Şehir</th><th>Durum</th><th>İrsaliye</th><th>DHL</th>';

    const body=$('orderRows');
    if(body)body.innerHTML=orders.map(x=>{
      const date=dateTR(x.order_date);
      const city=x.city||'—';
      const status=statusText(x.status);
      const meta=[date!=='—'?date:null,city!=='—'?city:null,status].filter(Boolean).join(' · ');
      return `<tr class="ops-order-row" onclick="openOrderDetail(${x.id})">
        <td data-role="record"><b>${esc(recordTitle(x))}</b>${recordSub(x)?`<div class="ops-record-sub">${esc(recordSub(x))}</div>`:''}</td>
        <td data-role="action"><button class="btn primary ops-open" onclick="event.stopPropagation();openOrderDetail(${x.id})">Aç</button></td>
        <td data-role="date">${date}</td>
        <td data-role="city">${esc(city)}</td>
        <td data-role="status"><span class="badge ${x.status==='DONE'?'done':'new'}">${esc(status)}</span></td>
        <td data-role="waybill">${x.waybill_no?esc(x.waybill_no):'<span class="muted">Bekliyor</span>'}</td>
        <td data-role="dhl">${x.dhl_tracking_no?esc(x.dhl_tracking_no):'<span class="muted">Bekliyor</span>'}</td>
        <td class="ops-mobile-meta">${esc(meta)}</td>
      </tr>`;
    }).join('');

    const activeAll=(await apiA('/api/orders')).filter(x=>x.status!=='ARCHIVED');
    const counts={};
    activeAll.forEach(x=>{const key=dateKey(x.order_date);if(key)counts[key]=(counts[key]||0)+1});
    const days=Object.entries(counts).sort((a,b)=>b[0].localeCompare(a[0])).slice(0,60);
    const dayBox=$('days');
    if(dayBox)dayBox.innerHTML=days.map(([key,count])=>`<button class="day" onclick="filterDay('${key}')"><b>${dateTR(key)}</b><span>${count} sipariş</span></button>`).join('');
  };

  const baseOpen=window.openOrderDetail;
  if(typeof baseOpen==='function'){
    window.openOrderDetail=async function(id){
      window.__archiveOrderId=id;
      await baseOpen(id);
      ensureArchiveUI();
      ensureArchiveAction();
      const order=await apiA('/api/orders/'+id+'/detail');
      const button=$('archiveOrderBtn');
      if(button){
        const archived=order.status==='ARCHIVED';
        button.textContent=archived?'Arşivden Çıkar':'Arşive Al';
        button.className=archived?'btn restore':'btn archive';
      }
    };
  }

  async function refreshDashboard(){
    if($('dashboard')?.classList.contains('active')&&typeof window.showReports==='function'){
      await window.showReports();
    }
  }

  async function toggleCurrentArchive(){
    const id=window.__archiveOrderId;
    if(!id)return;
    const order=await apiA('/api/orders/'+id+'/detail');
    if(order.status==='ARCHIVED')return restoreOrder(id);
    if(!confirm(`${order.order_no} arşive alınsın mı? Bu sipariş raporlarda sayılmayacak.`))return;

    await apiA('/api/orders/'+id,{method:'PATCH',body:JSON.stringify({status:'ARCHIVED',archived_from:order.status})});
    say('Sipariş arşive alındı');
    try{closeOrderDetail()}catch{}
    await window.loadOrders?.();
    if($('archive')?.classList.contains('active'))await loadArchive();
    await refreshDashboard();
  }

  window.toggleCurrentArchive=toggleCurrentArchive;
  window.archiveOrder=async id=>{window.__archiveOrderId=id;return toggleCurrentArchive()};

  window.restoreOrder=async function(id){
    const activity=await apiA('/api/orders/'+id+'/activity');
    const archived=activity.find(x=>x.action==='ORDER_UPDATED'&&x.details?.status==='ARCHIVED'&&x.details?.archived_from);
    const status=archived?.details?.archived_from||'DONE';
    await apiA('/api/orders/'+id,{method:'PATCH',body:JSON.stringify({status})});
    say('Sipariş arşivden çıkarıldı');
    try{closeOrderDetail()}catch{}
    await loadArchive();
    await window.loadOrders?.();
    await refreshDashboard();
  };

  const baseGo=window.go;
  window.go=function(view){
    if(view==='archive')return showArchive();
    return typeof baseGo==='function'?baseGo(view):undefined;
  };

  ensureArchiveUI();
})();
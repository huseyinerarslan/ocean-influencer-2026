(()=>{
  const el=id=>document.getElementById(id);
  const esc=s=>String(s??'').replace(/[&<>\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[c]));
  const dateKey=v=>{if(!v)return'';const m=String(v).match(/^(\d{4})-(\d{2})-(\d{2})/);return m?`${m[1]}-${m[2]}-${m[3]}`:''};
  const dateTR=v=>{const k=dateKey(v);if(!k)return'—';const [y,m,d]=k.split('-');return`${d}.${m}.${y}`};
  const statusText=s=>({NEW:'Yeni',PREPARING:'Hazırlanıyor','Çıkarıldı':'Çıkarıldı',SHIPPED:'Kargoya çıktı',DONE:'Tamamlandı'}[s]||s||'—');
  const isImported=x=>/^EXCEL-/i.test(String(x?.order_no||''));
  const primaryLabel=x=>isImported(x)?(x.recipient_name||'Influencer'):(x.order_no||x.recipient_name||'Sipariş');
  const secondaryLabel=x=>isImported(x)?'':(x.recipient_name||'');
  const req=async url=>{const r=await fetch(url,{credentials:'same-origin'});const d=await r.json().catch(()=>({}));if(!r.ok)throw Error(d.error||'İşlem başarısız');return d};

  const style=document.createElement('style');
  style.textContent=`
    .ops-record-sub{font-size:12px;color:#718096;margin-top:3px}.ops-mobile-meta{display:none}
    .ops-date-field{display:contents}.ops-date-label{display:none}
    @media(max-width:800px){
      .side{position:sticky!important;top:0;z-index:40;padding:12px 14px!important;gap:6px!important;overflow-x:auto!important;overscroll-behavior-x:contain;scrollbar-width:none}
      .side::-webkit-scrollbar{display:none}.side button{flex:0 0 auto;padding:10px 12px!important;font-size:16px;white-space:nowrap}
      .main{padding:16px!important}.top{align-items:flex-start!important;gap:10px}.top h2{font-size:28px}.top>.btn{padding:10px 12px!important;white-space:nowrap}
      #orders .days{gap:8px;margin-bottom:14px}.day{min-width:112px;padding:9px!important}.day b{font-size:16px}
      #orders .toolbar{display:grid!important;grid-template-columns:1fr 1fr;gap:10px!important;align-items:end}
      #orders .toolbar>#oq{grid-column:1/-1;min-width:0!important;width:100%}
      #orders .toolbar>#os{min-width:0!important;width:100%}
      .ops-date-field{display:grid;gap:4px;min-width:0}.ops-date-label{display:block;font-size:12px;font-weight:700;color:#718096;padding-left:2px}.ops-date-field input{width:100%!important;min-width:0!important}
      #orders .toolbar>.btn{width:100%;min-height:48px}.tablewrap{overflow:visible!important}
      #orders .table{display:block;background:transparent!important}#orders .table thead{display:none}#orders .table tbody{display:grid;gap:10px}
      #orders .ops-order-row{display:grid!important;grid-template-columns:minmax(0,1fr) auto;gap:6px 12px;background:#fff;border:1px solid #dfe6ef;border-radius:14px;padding:14px;box-shadow:0 4px 18px #12233a0a}
      #orders .ops-order-row td{display:block!important;border:0!important;padding:0!important;white-space:normal!important;min-width:0}
      #orders td[data-role='record']{grid-column:1;grid-row:1;font-size:18px;line-height:1.25;align-self:center}
      #orders td[data-role='action']{grid-column:2;grid-row:1/3;align-self:center}
      #orders td[data-role='date'],#orders td[data-role='city'],#orders td[data-role='status'],#orders td[data-role='waybill'],#orders td[data-role='dhl']{display:none!important}
      #orders td.ops-mobile-meta{display:block!important;grid-column:1;grid-row:2;font-size:13px;color:#64748b;line-height:1.45}
      #orders .ops-open{padding:9px 14px!important}.ops-record-sub{font-size:13px}
      .ops-modal-bg{padding:0!important;align-items:flex-end!important}.ops-modal{width:100%!important;max-height:94vh!important;border-radius:20px 20px 0 0!important;padding:16px!important}
      .ops-modal-head{position:sticky;top:-16px;background:#fff;z-index:2;padding:14px 0 10px}.ops-detail-grid{grid-template-columns:1fr!important}.ops-detail-grid .wide{grid-column:auto!important}
      .ops-field input,.ops-field select,.ops-field textarea{width:100%}.ops-item{grid-template-columns:1fr!important}.ops-item input,.ops-item select,.ops-item button{width:100%}
      .ops-actions{width:100%}.ops-actions .btn{flex:1}
    }
  `;
  document.head.appendChild(style);

  function wrapDate(id,label){
    const input=el(id);if(!input||input.parentElement?.classList.contains('ops-date-field'))return;
    const wrap=document.createElement('label');wrap.className='ops-date-field';
    const text=document.createElement('span');text.className='ops-date-label';text.textContent=label;
    input.parentNode.insertBefore(wrap,input);wrap.appendChild(text);wrap.appendChild(input);
  }
  wrapDate('od','Gün');wrapDate('of','Başlangıç');wrapDate('ot','Bitiş');
  if(el('oq'))el('oq').placeholder='Influencer / sipariş / şehir ara';

  const originalOpen=window.openOrderDetail;
  if(typeof originalOpen==='function'){
    window.openOrderDetail=async function(id){
      await originalOpen(id);
      const title=el('odTitle');
      if(title&&/^EXCEL-/i.test(title.textContent||'')){
        title.textContent=el('odName')?.value||'Influencer';
        const sub=el('odSub');if(sub)sub.textContent=(sub.textContent?sub.textContent+' · ':'')+'Eski Excel kaydı';
      }
    };
  }

  window.loadOrders=async function(){
    const tr=document.querySelector('#orders thead tr');
    if(tr)tr.innerHTML='<th>Kayıt</th><th>Detay</th><th>Tarih</th><th>Şehir</th><th>Durum</th><th>İrsaliye</th><th>DHL</th>';
    const q=new URLSearchParams();
    if(el('oq')?.value)q.set('q',el('oq').value);
    if(el('os')?.value&&el('os').value!=='all')q.set('status',el('os').value);
    if(el('od')?.value)q.set('date',el('od').value);
    if(el('of')?.value)q.set('from',el('of').value);
    if(el('ot')?.value)q.set('to',el('ot').value);
    const orders=await req('/api/orders?'+q);
    const tbody=el('orderRows');
    if(tbody)tbody.innerHTML=orders.map(x=>{
      const primary=primaryLabel(x),secondary=secondaryLabel(x),date=dateTR(x.order_date),city=x.city||'—',status=statusText(x.status);
      const meta=[date!=='—'?date:null,city!=='—'?city:null,status].filter(Boolean).join(' · ');
      return `<tr class="ops-order-row" onclick="openOrderDetail(${x.id})">
        <td data-role="record"><b>${esc(primary)}</b>${secondary?`<div class="ops-record-sub">${esc(secondary)}</div>`:''}</td>
        <td data-role="action"><button class="btn primary ops-open" onclick="event.stopPropagation();openOrderDetail(${x.id})">Aç</button></td>
        <td data-role="date">${date}</td><td data-role="city">${esc(city)}</td>
        <td data-role="status"><span class="badge ${x.status==='DONE'?'done':'new'}">${esc(status)}</span></td>
        <td data-role="waybill">${x.waybill_no?esc(x.waybill_no):'<span class="muted">Bekliyor</span>'}</td>
        <td data-role="dhl">${x.dhl_tracking_no?esc(x.dhl_tracking_no):'<span class="muted">Bekliyor</span>'}</td>
        <td class="ops-mobile-meta">${esc(meta)}</td>
      </tr>`;
    }).join('');
    const days=await req('/api/orders/days');
    const valid=days.map(x=>({...x,key:dateKey(x.order_date)})).filter(x=>x.key);
    const box=el('days');if(box)box.innerHTML=valid.map(x=>`<button class="day" onclick="filterDay('${x.key}')"><b>${dateTR(x.key)}</b><span>${x.count} sipariş</span></button>`).join('');
  };

  const baseDashboard=window.dashboard;
  window.dashboard=async function(){
    if(typeof baseDashboard==='function')await baseDashboard();
    const recent=el('recent');if(!recent)return;
    const orders=await req('/api/orders');
    recent.innerHTML=orders.slice(0,6).map(x=>`<div style="padding:10px 0;border-bottom:1px solid #edf1f5;cursor:pointer" onclick="openOrderDetail(${x.id})"><b>${esc(primaryLabel(x))}</b>${secondaryLabel(x)?` · ${esc(secondaryLabel(x))}`:''}<div class="muted">${dateTR(x.order_date)} · ${esc(x.city||'-')} · ${esc(statusText(x.status))}</div></div>`).join('')||'<p class="muted">Henüz sipariş yok.</p>';
  };

  setTimeout(()=>{
    if(document.getElementById('orders')?.classList.contains('active'))window.loadOrders().catch(console.error);
  },120);
})();
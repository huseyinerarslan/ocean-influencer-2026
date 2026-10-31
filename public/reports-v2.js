(()=>{
  const $=id=>document.getElementById(id);
  const esc=s=>String(s??'').replace(/[&<>\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[c]));
  const api=async url=>{const r=await fetch(url,{credentials:'same-origin'});const d=await r.json().catch(()=>({}));if(!r.ok)throw Error(d.error||'İşlem başarısız');return d};
  const keyDate=v=>{const m=String(v||'').match(/^(\d{4})-(\d{2})-(\d{2})/);return m?`${m[1]}-${m[2]}-${m[3]}`:''};
  const trDate=v=>{const k=keyDate(v);if(!k)return '—';const [y,m,d]=k.split('-');return `${d}.${m}.${y}`};
  const norm=s=>String(s||'').trim().toLocaleLowerCase('tr-TR');
  let allOrders=[], search='';

  const css=document.createElement('style');
  css.textContent=`
  .side button[data-v="reports"]::before{content:'▥';display:inline-grid;place-items:center;width:20px;height:20px;border-radius:6px;background:rgba(255,255,255,.07);font-size:12px;color:#a9c8dd;flex:0 0 20px}
  .rp-head{display:flex;justify-content:space-between;align-items:flex-start;gap:14px;margin-bottom:16px}.rp-head h3{margin:0 0 4px}.rp-head p{margin:0;color:#718096;font-size:13px}.rp-tools{display:flex;gap:8px;flex-wrap:wrap}.rp-tools input,.rp-tools select{border:1px solid #d4dee8;border-radius:9px;padding:9px 11px;background:#fff;min-width:180px}
  .rp-kpis{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px;margin-bottom:16px}.rp-kpi{padding:16px}.rp-kpi span{display:block;font-size:11px;color:#748399;font-weight:800}.rp-kpi b{display:block;font-size:25px;color:#10243a;margin-top:4px}.rp-kpi small{display:block;margin-top:4px;color:#7a8797}
  .rp-grid{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:18px}.rp-box{padding:18px}.rp-box h4{margin:0 0 12px}.rp-rank{display:grid;grid-template-columns:32px 1fr auto;gap:10px;align-items:center;padding:9px 0;border-bottom:1px solid #edf1f5}.rp-no{width:28px;height:28px;border-radius:8px;background:#eef5fa;color:#276589;display:grid;place-items:center;font-size:12px;font-weight:800}.rp-name{font-weight:800;color:#1e2d40}.rp-sub{font-size:12px;color:#7a8797}.rp-val{font-weight:800;color:#173650}
  .rp-title{display:flex;justify-content:space-between;align-items:center;margin-bottom:10px}.rp-cards{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}.rp-card{border:1px solid #e1e8ef;border-radius:13px;background:#fff;padding:14px;cursor:pointer}.rp-card:hover{border-color:#a9c5d9;box-shadow:0 8px 22px rgba(16,36,58,.07)}.rp-card-name{font-weight:850;color:#17283d}.rp-meta{font-size:12px;color:#748399;margin-top:3px}.rp-stats{display:grid;grid-template-columns:repeat(3,1fr);gap:7px;margin-top:12px}.rp-stat{background:#f6f9fb;border-radius:9px;padding:8px}.rp-stat b{display:block}.rp-stat span{font-size:10px;color:#7c8998}.rp-pills{display:flex;gap:5px;flex-wrap:wrap;margin-top:9px}.rp-pill{font-size:10px;padding:4px 7px;border-radius:999px;background:#eef5fa;color:#2a658a;font-weight:700}.rp-empty{padding:25px;text-align:center;color:#8491a1;border:1px dashed #d7e0e8;border-radius:12px;grid-column:1/-1}
  .rp-modal-bg{position:fixed;inset:0;background:#0f172a99;z-index:10050;display:none;align-items:center;justify-content:center;padding:18px}.rp-modal-bg.show{display:flex}.rp-modal{width:min(900px,96vw);max-height:90vh;overflow:auto;background:#fff;border-radius:17px;padding:20px}.rp-modal-head{display:flex;justify-content:space-between;gap:12px}.rp-history{padding:11px 0;border-bottom:1px solid #edf1f5}.rp-history-date{font-size:12px;color:#718096}.rp-history-products{font-size:13px;color:#33465c;margin-top:4px}
  @media(max-width:1050px){.rp-cards{grid-template-columns:repeat(2,1fr)}}@media(max-width:800px){.rp-head{flex-direction:column}.rp-tools{width:100%}.rp-tools input,.rp-tools select{width:100%;min-width:0}.rp-kpis,.rp-grid,.rp-cards{grid-template-columns:1fr}}
  `;
  document.head.appendChild(css);

  function ensureUI(){
    const side=document.querySelector('.side');
    if(side&&!side.querySelector('[data-v="reports"]')){
      const b=document.createElement('button');b.dataset.v='reports';b.textContent='Raporlar';
      const archive=side.querySelector('[data-v="archive"]'), orders=side.querySelector('[data-v="orders"]');
      (archive||orders)?.insertAdjacentElement('afterend',b); if(!b.parentElement)side.appendChild(b);
      b.onclick=showReports;
    }
    const main=document.querySelector('.main');
    if(main&&!$('reports')){
      const s=document.createElement('section');s.id='reports';s.className='view';
      s.innerHTML=`<div class="rp-head"><div><h3>Influencer Raporları</h3><p>Arşiv dışındaki gönderimlerden oluşturulan analizler.</p></div><div class="rp-tools"><select id="rpPeriod"><option value="0">Tüm dönem</option><option value="30">Son 30 gün</option><option value="90">Son 90 gün</option><option value="365">Son 1 yıl</option></select><input id="rpSearch" placeholder="Influencer ara"></div></div><div id="rpKpis" class="rp-kpis"></div><div class="rp-grid"><div class="card rp-box"><h4>En Çok İş Birliği Yapılanlar</h4><div id="rpTopInf"></div></div><div class="card rp-box"><h4>En Çok Gönderilen Ürünler</h4><div id="rpTopProd"></div></div></div><div class="rp-title"><h4>Influencer Kartları</h4><span id="rpCount" class="muted"></span></div><div id="rpCards" class="rp-cards"></div>`;
      ($('archive')||$('orders'))?.insertAdjacentElement('afterend',s);if(!s.parentElement)main.appendChild(s);
      $('rpPeriod').addEventListener('change',render);$('rpSearch').addEventListener('input',e=>{search=norm(e.target.value);render()});
    }
    if(!$('rpModal')){const m=document.createElement('div');m.id='rpModal';m.className='rp-modal-bg';m.innerHTML='<div class="rp-modal"><div class="rp-modal-head"><div><h3 id="rpModalName">Influencer</h3><div id="rpModalSub" class="muted"></div></div><button class="btn" onclick="closeReportProfile()">Kapat</button></div><div id="rpModalBody" style="margin-top:14px"></div></div>';document.body.appendChild(m)}
  }

  function filteredOrders(){const days=Number($('rpPeriod')?.value||0);if(!days)return allOrders;const c=new Date();c.setHours(0,0,0,0);c.setDate(c.getDate()-days+1);return allOrders.filter(o=>{const k=keyDate(o.order_date);return k&&new Date(k+'T00:00:00')>=c})}
  function groups(orders){const m=new Map();for(const o of orders){const k=o.contact_id?`c:${o.contact_id}`:`n:${norm(o.recipient_name)}`;if(!m.has(k))m.set(k,{key:k,name:o.recipient_name||'İsimsiz',city:o.city||'',orders:[],products:new Map(),qty:0});const g=m.get(k);g.orders.push(o);if(o.recipient_name)g.name=o.recipient_name;if(o.city)g.city=o.city;for(const it of (o.items||[])){const pk=it.item_code||it.item_name||'Ürün',q=Number(it.qty||0);g.qty+=q;if(!g.products.has(pk))g.products.set(pk,{name:it.item_name||pk,qty:0,count:0});const p=g.products.get(pk);p.qty+=q;p.count++}}return [...m.values()].map(g=>{const ds=g.orders.map(x=>keyDate(x.order_date)).filter(Boolean).sort();g.first=ds[0]||'';g.last=ds.at(-1)||'';g.unique=g.products.size;return g}).sort((a,b)=>b.orders.length-a.orders.length||String(b.last).localeCompare(String(a.last)))}
  function products(orders){const m=new Map();for(const o of orders)for(const it of (o.items||[])){const k=it.item_code||it.item_name||'Ürün';if(!m.has(k))m.set(k,{name:it.item_name||k,qty:0,orders:new Set()});const p=m.get(k);p.qty+=Number(it.qty||0);p.orders.add(o.id)}return [...m.values()].sort((a,b)=>b.qty-a.qty||b.orders.size-a.orders.size)}

  function render(){
    const os=filteredOrders(), allGroups=groups(os), ps=products(os);let gs=allGroups;
    if(search)gs=gs.filter(g=>norm([g.name,g.city,...[...g.products.values()].map(p=>p.name)].join(' ')).includes(search));
    const qty=os.reduce((a,o)=>a+(o.items||[]).reduce((s,i)=>s+Number(i.qty||0),0),0), top=ps[0];
    $('rpKpis').innerHTML=[['Toplam Influencer',allGroups.length,'rapor kapsamı'],['Toplam İş Birliği',os.length,'gönderim'],['Gönderilen Ürün',Number(qty.toFixed(2)),'toplam adet'],['En Çok Gönderilen',top?.name||'—',top?`${Number(top.qty.toFixed(2))} adet`:'veri yok']].map(x=>`<div class="card rp-kpi"><span>${esc(x[0])}</span><b>${esc(x[1])}</b><small>${esc(x[2])}</small></div>`).join('');
    $('rpTopInf').innerHTML=gs.slice(0,8).map((g,i)=>`<div class="rp-rank"><span class="rp-no">${i+1}</span><div><div class="rp-name">${esc(g.name)}</div><div class="rp-sub">Son: ${trDate(g.last)} · ${g.unique} farklı ürün</div></div><div class="rp-val">${g.orders.length} kez</div></div>`).join('')||'<div class="rp-empty">Veri yok.</div>';
    $('rpTopProd').innerHTML=ps.slice(0,8).map((p,i)=>`<div class="rp-rank"><span class="rp-no">${i+1}</span><div><div class="rp-name">${esc(p.name)}</div><div class="rp-sub">${p.orders.size} gönderimde</div></div><div class="rp-val">${Number(p.qty.toFixed(2))} adet</div></div>`).join('')||'<div class="rp-empty">Veri yok.</div>';
    $('rpCards').innerHTML=gs.length?gs.map((g,i)=>{const pills=[...g.products.values()].sort((a,b)=>b.count-a.count||b.qty-a.qty).slice(0,3);return `<div class="rp-card" data-rpi="${i}"><div class="rp-card-name">${esc(g.name)}</div><div class="rp-meta">${esc(g.city||'Şehir bilgisi yok')} · Son: ${trDate(g.last)}</div><div class="rp-stats"><div class="rp-stat"><b>${g.orders.length}</b><span>İş birliği</span></div><div class="rp-stat"><b>${g.unique}</b><span>Farklı ürün</span></div><div class="rp-stat"><b>${Number(g.qty.toFixed(2))}</b><span>Toplam adet</span></div></div><div class="rp-meta" style="margin-top:9px">İlk iş birliği: ${trDate(g.first)}</div><div class="rp-pills">${pills.map(p=>`<span class="rp-pill">${esc(p.name)}</span>`).join('')}</div></div>`}).join(''):'<div class="rp-empty">Influencer bulunamadı.</div>';
    $('rpCards').querySelectorAll('[data-rpi]').forEach(el=>el.onclick=()=>openProfile(gs[Number(el.dataset.rpi)]));$('rpCount').textContent=`${gs.length} influencer`;
  }

  function openProfile(g){if(!g)return;const os=[...g.orders].sort((a,b)=>String(keyDate(b.order_date)).localeCompare(String(keyDate(a.order_date))));$('rpModalName').textContent=g.name;$('rpModalSub').textContent=`${g.orders.length} iş birliği · ${g.unique} farklı ürün · ${Number(g.qty.toFixed(2))} adet`;$('rpModalBody').innerHTML=`<div class="rp-kpis" style="grid-template-columns:repeat(3,minmax(0,1fr))"><div class="card rp-kpi"><span>İlk İş Birliği</span><b style="font-size:18px">${trDate(g.first)}</b></div><div class="card rp-kpi"><span>Son İş Birliği</span><b style="font-size:18px">${trDate(g.last)}</b></div><div class="card rp-kpi"><span>Toplam Gönderim</span><b>${g.orders.length}</b></div></div><h4>Gönderim Geçmişi</h4>${os.map(o=>`<div class="rp-history"><div class="rp-history-date">${trDate(o.order_date)} · ${esc(o.order_no||'')}</div><div class="rp-history-products">${(o.items||[]).length?(o.items||[]).map(i=>`${esc(i.item_name||i.item_code)} × ${esc(i.qty)}`).join(' · '):'Ürün bilgisi yok'}</div></div>`).join('')}`;$('rpModal').classList.add('show')}
  window.closeReportProfile=()=>$('rpModal')?.classList.remove('show');
  async function showReports(){ensureUI();document.querySelectorAll('.view').forEach(v=>v.classList.remove('active'));$('reports').classList.add('active');document.querySelectorAll('.side [data-v]').forEach(b=>b.classList.toggle('active',b.dataset.v==='reports'));$('title').textContent='Raporlar';allOrders=(await api('/api/orders')).filter(o=>o.status!=='ARCHIVED');render()}
  window.showReports=showReports;
  const previousGo=window.go;window.go=function(v){if(v==='reports')return showReports();return typeof previousGo==='function'?previousGo(v):undefined};
  ensureUI();
})();
(()=>{
  const $=id=>document.getElementById(id);
  const esc=s=>String(s??'').replace(/[&<>\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[c]));
  const apiR=async(url,opt={})=>{const headers={...(opt.headers||{})};if(opt.body)headers['Content-Type']='application/json';const r=await fetch(url,{credentials:'same-origin',...opt,headers});const d=await r.json().catch(()=>({}));if(!r.ok)throw Error(d.error||'İşlem başarısız');return d};
  const dateKey=v=>{const m=String(v||'').match(/^(\d{4})-(\d{2})-(\d{2})/);return m?`${m[1]}-${m[2]}-${m[3]}`:''};
  const dateTR=v=>{const k=dateKey(v);if(!k)return '—';const [y,m,d]=k.split('-');return `${d}.${m}.${y}`};
  const norm=s=>String(s||'').trim().toLocaleLowerCase('tr-TR');
  let allOrders=[], reportQuery='';

  const style=document.createElement('style');
  style.textContent=`
    .side button[data-v="reports"]::before{content:'▥';display:inline-grid;place-items:center;width:20px;height:20px;border-radius:6px;background:rgba(255,255,255,.07);font-size:12px;color:#a9c8dd;flex:0 0 20px}
    .report-head{display:flex;justify-content:space-between;align-items:flex-start;gap:14px;margin-bottom:16px}.report-head h3{margin:0 0 4px}.report-head p{margin:0;color:#718096;font-size:13px}.report-tools{display:flex;gap:8px;flex-wrap:wrap}.report-tools input,.report-tools select{border:1px solid #d4dee8;border-radius:9px;padding:9px 11px;background:#fff;min-width:180px}
    .report-kpis{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px;margin-bottom:16px}.report-kpi{padding:16px}.report-kpi span{display:block;font-size:11px;text-transform:uppercase;letter-spacing:.07em;font-weight:800;color:#748399}.report-kpi b{display:block;font-size:26px;color:#10243a;margin-top:4px}.report-kpi small{display:block;margin-top:4px;color:#7a8797}
    .report-grid{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:16px}.report-box{padding:18px}.report-box h4{margin:0 0 12px}.rank-row{display:grid;grid-template-columns:32px minmax(0,1fr) auto;gap:10px;align-items:center;padding:9px 0;border-bottom:1px solid #edf1f5}.rank-row:last-child{border-bottom:0}.rank-no{width:28px;height:28px;border-radius:8px;background:#eef5fa;color:#276589;display:grid;place-items:center;font-size:12px;font-weight:850}.rank-main{min-width:0}.rank-name{font-weight:800;color:#1e2d40;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.rank-sub{font-size:12px;color:#7a8797;margin-top:2px}.rank-val{font-weight:850;color:#173650;white-space:nowrap}
    .inf-title{display:flex;justify-content:space-between;align-items:center;margin:4px 0 10px}.inf-title h4{margin:0}.inf-count{font-size:12px;color:#718096}.influencer-cards{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}.inf-card{border:1px solid #e1e8ef;border-radius:13px;background:#fff;padding:14px;cursor:pointer;transition:.15s ease}.inf-card:hover{border-color:#a9c5d9;box-shadow:0 8px 22px rgba(16,36,58,.07);transform:translateY(-1px)}.inf-name{font-size:15px;font-weight:850;color:#17283d}.inf-meta{font-size:12px;color:#748399;margin-top:3px}.inf-stats{display:grid;grid-template-columns:repeat(3,1fr);gap:7px;margin-top:12px}.inf-stat{background:#f6f9fb;border-radius:9px;padding:8px}.inf-stat b{display:block;font-size:15px;color:#173650}.inf-stat span{font-size:10px;color:#7c8998}.inf-last{margin-top:10px;font-size:12px;color:#506176}.inf-products{margin-top:8px;display:flex;gap:5px;flex-wrap:wrap}.inf-pill{font-size:10px;padding:4px 7px;border-radius:999px;background:#eef5fa;color:#2a658a;font-weight:750}.report-empty{padding:26px;text-align:center;color:#8491a1;border:1px dashed #d7e0e8;border-radius:12px;background:#fbfcfd;grid-column:1/-1}
    .report-modal-bg{position:fixed;inset:0;background:#0f172a99;z-index:10020;display:none;align-items:center;justify-content:center;padding:18px}.report-modal-bg.show{display:flex}.report-modal{width:min(900px,96vw);max-height:90vh;overflow:auto;background:#fff;border-radius:17px;padding:20px;box-shadow:0 25px 80px #0004}.report-modal-head{display:flex;justify-content:space-between;gap:12px}.report-modal-head h3{margin:0}.report-close{border:0;background:#edf2f7;border-radius:9px;padding:8px 12px;cursor:pointer}.history-row{padding:11px 0;border-bottom:1px solid #edf1f5}.history-row:last-child{border-bottom:0}.history-date{font-size:12px;color:#718096;margin-bottom:4px}.history-products{font-size:13px;color:#33465c}
    @media(max-width:1100px){.influencer-cards{grid-template-columns:repeat(2,minmax(0,1fr))}}@media(max-width:800px){.report-head{flex-direction:column}.report-tools{width:100%}.report-tools input,.report-tools select{width:100%;min-width:0}.report-kpis,.report-grid,.influencer-cards{grid-template-columns:1fr}}
  `;
  document.head.appendChild(style);

  function ensureReportsUI(){
    const side=document.querySelector('.side');
    if(side&&!side.querySelector('[data-v="reports"]')){
      const b=document.createElement('button');b.dataset.v='reports';b.textContent='Raporlar';
      const archive=side.querySelector('[data-v="archive"]');
      const orders=side.querySelector('[data-v="orders"]');
      if(archive)archive.insertAdjacentElement('afterend',b);else if(orders)orders.insertAdjacentElement('afterend',b);else side.appendChild(b);
      b.onclick=()=>showReports();
    }
    const main=document.querySelector('.main');
    if(main&&!$('reports')){
      const sec=document.createElement('section');sec.id='reports';sec.className='view';
      sec.innerHTML=`<div class="report-head"><div><h3>Influencer Raporları</h3><p>Arşiv dışındaki gönderimlerden üretilen iş birliği ve ürün analizi.</p></div><div class="report-tools"><select id="reportPeriod"><option value="all">Tüm dönem</option><option value="30">Son 30 gün</option><option value="90">Son 90 gün</option><option value="365">Son 1 yıl</option></select><input id="reportSearch" placeholder="Influencer ara"></div></div><div id="reportKpis" class="report-kpis"></div><div class="report-grid"><div class="card report-box"><h4>En Çok İş Birliği Yapılanlar</h4><div id="topInfluencers"></div></div><div class="card report-box"><h4>En Çok Gönderilen Ürünler</h4><div id="topProducts"></div></div></div><div class="inf-title"><h4>Influencer Kartları</h4><span id="infCount" class="inf-count"></span></div><div id="influencerCards" class="influencer-cards"></div>`;
      const anchor=$('archive')||$('orders');if(anchor)anchor.insertAdjacentElement('afterend',sec);else main.appendChild(sec);
      $('reportPeriod')?.addEventListener('change',renderReports);$('reportSearch')?.addEventListener('input',e=>{reportQuery=norm(e.target.value);renderReports()});
    }
    if(!$('reportInfluencerModal')){
      const m=document.createElement('div');m.id='reportInfluencerModal';m.className='report-modal-bg';m.innerHTML='<div class="report-modal"><div class="report-modal-head"><div><h3 id="rimName">Influencer</h3><div id="rimSub" class="muted"></div></div><button class="report-close" onclick="closeInfluencerReport()">Kapat</button></div><div id="rimBody" style="margin-top:14px"></div></div>';document.body.appendChild(m);
    }
  }

  function periodOrders(){
    const days=Number($('reportPeriod')?.value||0);if(!days)return allOrders;
    const cutoff=new Date();cutoff.setHours(0,0,0,0);cutoff.setDate(cutoff.getDate()-days+1);
    return allOrders.filter(o=>{const k=dateKey(o.order_date);if(!k)return false;const d=new Date(k+'T00:00:00');return d>=cutoff});
  }

  function buildGroups(orders){
    const groups=new Map();
    orders.forEach(o=>{
      const key=o.contact_id?`c:${o.contact_id}`:`n:${norm(o.recipient_name)}`;
      if(!groups.has(key))groups.set(key,{key,name:o.recipient_name||'İsimsiz',orders:[],products:new Map(),qty:0,city:o.city||''});
      const g=groups.get(key);g.orders.push(o);if(o.recipient_name)g.name=o.recipient_name;if(o.city)g.city=o.city;
      (o.items||[]).forEach(it=>{const code=it.item_code||it.item_name||'Ürün';const qty=Number(it.qty||0);g.qty+=qty;if(!g.products.has(code))g.products.set(code,{code,name:it.item_name||code,qty:0,count:0});const p=g.products.get(code);p.qty+=qty;p.count+=1});
    });
    return [...groups.values()].map(g=>{const dates=g.orders.map(x=>dateKey(x.order_date)).filter(Boolean).sort();g.first=dates[0]||'';g.last=dates[dates.length-1]||'';g.uniqueProducts=g.products.size;return g}).sort((a,b)=>b.orders.length-a.orders.length||String(b.last).localeCompare(String(a.last)));
  }

  function buildProducts(orders){
    const map=new Map();orders.forEach(o=>(o.items||[]).forEach(it=>{const code=it.item_code||it.item_name||'Ürün';if(!map.has(code))map.set(code,{code,name:it.item_name||code,qty:0,orders:new Set()});const p=map.get(code);p.qty+=Number(it.qty||0);p.orders.add(o.id)}));return [...map.values()].sort((a,b)=>b.qty-a.qty||b.orders.size-a.orders.size);
  }

  function renderReports(){
    const orders=periodOrders();let groups=buildGroups(orders);const products=buildProducts(orders);
    if(reportQuery)groups=groups.filter(g=>norm([g.name,g.city,...[...g.products.values()].map(p=>p.name)].join(' ')).includes(reportQuery));
    const totalQty=orders.reduce((n,o)=>n+(o.items||[]).reduce((s,it)=>s+Number(it.qty||0),0),0);
    const top=products[0];const k=$('reportKpis');if(k)k.innerHTML=[['Influencer',buildGroups(orders).length,'aktif rapor kapsamı'],['İş Birliği',orders.length,'sipariş/gönderim'],['Gönderilen Ürün',Number(totalQty.toFixed(2)),'toplam adet'],['En Çok Gönderilen',top?top.name:'—',top?`${Number(top.qty.toFixed(2))} adet`:'veri yok']].map(x=>`<div class="card report-kpi"><span>${esc(x[0])}</span><b>${esc(x[1])}</b><small>${esc(x[2])}</small></div>`).join('');
    const ti=$('topInfluencers');if(ti)ti.innerHTML=groups.slice(0,8).map((g,i)=>`<div class="rank-row"><span class="rank-no">${i+1}</span><div class="rank-main"><div class="rank-name">${esc(g.name)}</div><div class="rank-sub">Son gönderim ${dateTR(g.last)} · ${g.uniqueProducts} farklı ürün</div></div><div class="rank-val">${g.orders.length} kez</div></div>`).join('')||'<div class="report-empty">Veri yok.</div>';
    const tp=$('topProducts');if(tp)tp.innerHTML=products.slice(0,8).map((p,i)=>`<div class="rank-row"><span class="rank-no">${i+1}</span><div class="rank-main"><div class="rank-name">${esc(p.name)}</div><div class="rank-sub">${p.orders.size} farklı gönderimde</div></div><div class="rank-val">${Number(p.qty.toFixed(2))} adet</div></div>`).join('')||'<div class="report-empty">Veri yok.</div>';
    const cards=$('influencerCards');if(cards)cards.innerHTML=groups.length?groups.map(g=>{const recent=[...g.products.values()].sort((a,b)=>b.count-a.count||b.qty-a.qty).slice(0,3);return `<div class="inf-card" onclick="openInfluencerReport('${esc(g.key)}')"><div class="inf-name">${esc(g.name)}</div><div class="inf-meta">${esc(g.city||'Şehir bilgisi yok')} · Son: ${dateTR(g.last)}</div><div class="inf-stats"><div class="inf-stat"><b>${g.orders.length}</b><span>İş birliği</span></div><div class="inf-stat"><b>${g.uniqueProducts}</b><span>Farklı ürün</span></div><div class="inf-stat"><b>${Number(g.qty.toFixed(2))}</b><span>Toplam adet</span></div></div><div class="inf-last">İlk iş birliği: <b>${dateTR(g.first)}</b></div><div class="inf-products">${recent.map(p=>`<span class="inf-pill">${esc(p.name)}</span>`).join('')}</div></div>`}).join(''):'<div class="report-empty">Arama veya dönem için influencer bulunamadı.</div>';
    if($('infCount'))$('infCount').textContent=`${groups.length} influencer`;
    window.__reportGroups=groups;
  }

  async function showReports(){ensureReportsUI();document.querySelectorAll('.view').forEach(x=>x.classList.remove('active'));$('reports')?.classList.add('active');document.querySelectorAll('.side [data-v]').forEach(x=>x.classList.toggle('active',x.dataset.v==='reports'));if($('title'))$('title').textContent='Raporlar';allOrders=(await apiR('/api/orders')).filter(x=>x.status!=='ARCHIVED');renderReports()}
  window.showReports=showReports;

  window.openInfluencerReport=function(key){const g=(window.__reportGroups||[]).find(x=>x.key===key);if(!g)return;const orders=[...g.orders].sort((a,b)=>String(dateKey(b.order_date)).localeCompare(String(dateKey(a.order_date)));$('rimName').textContent=g.name;$('rimSub').textContent=`${g.orders.length} iş birliği · ${g.uniqueProducts} farklı ürün · ${Number(g.qty.toFixed(2))} adet`;$('rimBody').innerHTML=`<div class="report-kpis" style="grid-template-columns:repeat(3,minmax(0,1fr))"><div class="card report-kpi"><span>İlk İş Birliği</span><b style="font-size:18px">${dateTR(g.first)}</b></div><div class="card report-kpi"><span>Son İş Birliği</span><b style="font-size:18px">${dateTR(g.last)}</b></div><div class="card report-kpi"><span>Toplam Gönderim</span><b>${g.orders.length}</b></div></div><h4>Gönderim Geçmişi</h4>${orders.map(o=>`<div class="history-row"><div class="history-date">${dateTR(o.order_date)} · ${esc(o.order_no||'')}</div><div class="history-products">${(o.items||[]).length?(o.items||[]).map(it=>`${esc(it.item_name||it.item_code)} × ${esc(it.qty)}`).join(' · '):'Ürün bilgisi yok'}</div></div>`).join('')}`;$('reportInfluencerModal').classList.add('show')};
  window.closeInfluencerReport=()=>$('reportInfluencerModal')?.classList.remove('show');

  const oldGo=window.go;window.go=function(v){if(v==='reports')return showReports();return typeof oldGo==='function'?oldGo(v):undefined};
  ensureReportsUI();new MutationObserver(ensureReportsUI).observe(document.body,{childList:true,subtree:true});
})();
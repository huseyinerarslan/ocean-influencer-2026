(()=>{
  const el=id=>document.getElementById(id);
  const esc=s=>String(s??'').replace(/[&<>\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[c]));
  const api2=async(url,opt={})=>{
    const headers={...(opt.headers||{})};
    if(opt.body && !(opt.body instanceof FormData)) headers['Content-Type']='application/json';
    const r=await fetch(url,{credentials:'same-origin',...opt,headers});
    const d=await r.json().catch(()=>({}));
    if(!r.ok) throw new Error(d.error||'İşlem başarısız');
    return d;
  };
  const say=msg=>{try{toast(msg)}catch{console.log(msg)}};
  const dateKey=v=>{
    if(!v)return '';
    const s=String(v);
    const m=s.match(/^(\d{4})-(\d{2})-(\d{2})/);
    return m?`${m[1]}-${m[2]}-${m[3]}`:'';
  };
  const dateTR=v=>{
    const k=dateKey(v);if(!k)return '—';
    const [y,m,d]=k.split('-');return `${d}.${m}.${y}`;
  };
  const statusText=s=>({NEW:'Yeni',PREPARING:'Hazırlanıyor','Çıkarıldı':'Çıkarıldı',SHIPPED:'Kargoya çıktı',DONE:'Tamamlandı'}[s]||s||'—');

  let sets=[];
  let editProductId=null;
  let editSetId=null;
  let currentOrderId=null;

  const style=document.createElement('style');
  style.textContent=`
    .ops-actions{display:flex;gap:6px;flex-wrap:wrap}.btn.danger{background:#fee2e2;color:#991b1b}.btn.warn{background:#fff3cd;color:#725600}
    .ops-list-row{display:grid;grid-template-columns:minmax(120px,.7fr) minmax(220px,1.6fr) minmax(120px,.7fr) auto;gap:10px;align-items:center;padding:9px 0;border-bottom:1px solid #edf1f5}
    .ops-order-row{cursor:pointer}.ops-order-row:hover td{background:#f7fbff}.ops-open{white-space:nowrap}
    .ops-modal-bg{position:fixed;inset:0;background:#0f172a99;z-index:9998;display:none;align-items:center;justify-content:center;padding:18px}.ops-modal-bg.show{display:flex}
    .ops-modal{background:#fff;border-radius:18px;width:min(1050px,96vw);max-height:92vh;overflow:auto;padding:22px;box-shadow:0 25px 80px #0004}
    .ops-modal-head{display:flex;justify-content:space-between;gap:15px;align-items:flex-start}.ops-modal h3{margin:0}.ops-close{border:0;background:#edf2f7;border-radius:9px;padding:8px 12px;cursor:pointer}
    .ops-detail-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}.ops-detail-grid .wide{grid-column:1/-1}
    .ops-field{display:grid;gap:5px}.ops-field input,.ops-field select,.ops-field textarea{border:1px solid #cad5e2;border-radius:9px;padding:9px}
    .ops-item{display:grid;grid-template-columns:170px 1fr 90px auto;gap:8px;align-items:center;padding:9px 0;border-bottom:1px solid #edf1f5}.ops-item input,.ops-item select{border:1px solid #cad5e2;border-radius:8px;padding:8px;min-width:0}
    .set-editor{margin-top:14px}.set-component{display:grid;grid-template-columns:1fr 1.4fr 90px auto;gap:8px;margin:7px 0}.set-component input{border:1px solid #cad5e2;border-radius:8px;padding:8px;min-width:0}
    .days:empty{display:none}
    @media(max-width:800px){.ops-list-row,.ops-item,.set-component,.ops-detail-grid{grid-template-columns:1fr}.ops-detail-grid .wide{grid-column:auto}}
  `;
  document.head.appendChild(style);

  function ensureMenus(){
    const side=document.querySelector('.side');if(!side)return;
    const templatesBtn=[...side.querySelectorAll('[data-v]')].find(b=>b.dataset.v==='templates');
    if(!side.querySelector('[data-v="sets"]')){
      const b=document.createElement('button');b.dataset.v='sets';b.textContent='Setler';side.insertBefore(b,templatesBtn||side.lastElementChild);
    }
    if(!side.querySelector('[data-ops-manage]')){
      const manage=document.createElement('button');manage.dataset.opsManage='1';manage.textContent='Veri Yönetimi';manage.onclick=()=>location.href='/manage';side.insertBefore(manage,side.lastElementChild);
    }
  }

  function ensureSetsSection(){
    const main=document.querySelector('.main');if(!main||document.getElementById('sets'))return;
    const sec=document.createElement('section');sec.id='sets';sec.className='view';sec.innerHTML=`
      <div class="card panel"><h3>Set Kataloğu</h3>
        <div class="toolbar"><input id="sq" placeholder="Set kodu / set adı ara"><button class="btn primary" onclick="newSet()">+ Yeni Set</button></div>
        <div id="setEditor" class="card panel" style="display:none;margin-bottom:14px">
          <h4 id="setEditorTitle">Set Düzenle</h4>
          <div class="formgrid"><div class="field"><label>Set Kodu</label><input id="sc"></div><div class="field"><label>Set Adı</label><input id="sn"></div><div class="field"><label>Barkod</label><input id="sb"></div></div>
          <div class="set-editor"><b>Set İçeriği</b><div id="setComponents"></div><button class="btn" onclick="addSetComponent()">+ Bileşen Ekle</button></div>
          <div style="margin-top:12px" class="ops-actions"><button class="btn primary" onclick="saveSet()">Kaydet</button><button class="btn" onclick="cancelSetEdit()">Vazgeç</button></div>
        </div>
        <div id="setList"></div>
      </div>`;
    const tpl=document.getElementById('templates');main.insertBefore(sec,tpl||null);
    el('sq')?.addEventListener('input',()=>window.renderSets?.());
  }

  function ensureStatus(){
    const s=el('os');if(!s||[...s.options].some(o=>o.value==='Çıkarıldı'))return;
    const op=document.createElement('option');op.value='Çıkarıldı';op.textContent='Çıkarıldı';
    s.insertBefore(op,[...s.options].find(o=>o.value==='SHIPPED')||null);
  }

  function ensureOrderModal(){
    if(document.getElementById('orderDetailModal'))return;
    const modal=document.createElement('div');modal.id='orderDetailModal';modal.className='ops-modal-bg';modal.innerHTML=`
      <div class="ops-modal"><div class="ops-modal-head"><div><h3 id="odTitle">Sipariş</h3><div class="muted" id="odSub"></div></div><button class="ops-close" onclick="closeOrderDetail()">Kapat</button></div>
        <div class="ops-detail-grid" style="margin-top:15px">
          <div class="ops-field"><label>Alıcı</label><input id="odName"></div><div class="ops-field"><label>Telefon</label><input id="odPhone"></div><div class="ops-field"><label>Durum</label><select id="odStatus"><option value="NEW">Yeni</option><option value="PREPARING">Hazırlanıyor</option><option value="Çıkarıldı">Çıkarıldı</option><option value="SHIPPED">Kargoya çıktı</option><option value="DONE">Tamamlandı</option></select></div>
          <div class="ops-field"><label>İl</label><input id="odCity"></div><div class="ops-field"><label>İlçe</label><input id="odDistrict"></div><div class="ops-field"><label>Posta Kodu</label><input id="odPost"></div>
          <div class="ops-field wide"><label>Adres</label><textarea id="odAddress" rows="3"></textarea></div>
          <div class="ops-field"><label>Yazı Şablonu</label><input id="odTemplate"></div><div class="ops-field"><label>İrsaliye No</label><input id="odWaybill"></div><div class="ops-field"><label><input id="odWaybillDone" type="checkbox"> İrsaliye tamamlandı</label></div>
        </div>
        <div class="ops-actions" style="margin:12px 0"><button class="btn primary" onclick="saveOrderDetail()">Sipariş Bilgilerini Kaydet</button></div>
        <hr style="border:0;border-top:1px solid #e5e7eb"><h4>Sipariş İçeriği</h4><div id="odItems"></div>
        <div class="card panel" style="margin-top:12px"><b>Ürün Ekle</b><div class="ops-item"><select id="odAddProduct"></select><input id="odAddName" placeholder="Ürün adı" disabled><input id="odAddQty" type="number" min="0.001" step="1" value="1"><button class="btn primary" onclick="addOrderItem()">Ekle</button></div></div>
      </div>`;
    document.body.appendChild(modal);
  }

  ensureMenus();ensureSetsSection();ensureStatus();ensureOrderModal();

  const dl=document.createElement('datalist');dl.id='opsProductCodes';document.body.appendChild(dl);

  const oldGo=window.go;
  window.go=function(v){
    if(typeof oldGo==='function')oldGo(v);
    if(v==='sets')window.loadSets?.();
  };

  window.loadProducts=async function(){
    products=await api2('/api/products');
    dl.innerHTML=products.map(x=>`<option value="${esc(x.item_code)}">${esc(x.item_name)}</option>`).join('');
    const list=el('productList');if(list)list.innerHTML=products.map(x=>`<div class="ops-list-row"><b>${esc(x.item_code)}</b><span>${esc(x.item_name)}</span><span class="muted">${esc(x.barcode||'')}</span><span class="ops-actions"><button class="btn" onclick="editProduct(${x.id})">Düzenle</button><button class="btn danger" onclick="deleteProduct(${x.id})">Sil</button></span></div>`).join('');
    if(typeof refreshProductSelects==='function')refreshProductSelects();
  };
  window.editProduct=function(id){const x=products.find(p=>Number(p.id)===Number(id));if(!x)return;editProductId=id;el('pc').value=x.item_code||'';el('pn').value=x.item_name||'';el('pb').value=x.barcode||'';const b=document.querySelector('#products .btn.primary');if(b)b.textContent='Güncelle';};
  window.saveProduct=async function(){const body={item_code:el('pc').value.trim(),item_name:el('pn').value.trim(),barcode:el('pb').value.trim()};if(!body.item_code||!body.item_name)return say('Ürün kodu ve adı gerekli');if(editProductId)await api2('/api/products/'+editProductId,{method:'PATCH',body:JSON.stringify(body)});else await api2('/api/products',{method:'POST',body:JSON.stringify(body)});editProductId=null;el('pc').value=el('pn').value=el('pb').value='';const b=document.querySelector('#products .btn.primary');if(b)b.textContent='Kaydet';say('Ürün kaydedildi');await window.loadProducts();};
  window.deleteProduct=async function(id){const x=products.find(p=>Number(p.id)===Number(id));if(!confirm((x?.item_name||'Bu ürün')+' katalogdan kaldırılsın mı? Geçmiş siparişlerden silinmez.'))return;await api2('/api/products/'+id,{method:'DELETE'});say('Ürün katalogdan kaldırıldı');await window.loadProducts();};

  window.loadSets=async function(){sets=await api2('/api/sets');window.renderSets();};
  window.renderSets=function(){const q=(el('sq')?.value||'').toLocaleLowerCase('tr-TR');const list=el('setList');if(!list)return;list.innerHTML=sets.filter(s=>(s.set_item_no+' '+s.set_name).toLocaleLowerCase('tr-TR').includes(q)).map(s=>`<div class="ops-list-row"><b>${esc(s.set_item_no)}</b><span>${esc(s.set_name)}<div class="muted">${(s.items||[]).length} bileşen</div></span><span class="muted">${esc(s.barcode||'')}</span><span class="ops-actions"><button class="btn" onclick="editSet(${s.id})">Düzenle</button><button class="btn danger" onclick="deleteSet(${s.id})">Sil</button></span></div>`).join('');};
  window.newSet=function(){editSetId=null;el('setEditor').style.display='block';el('setEditorTitle').textContent='Yeni Set';el('sc').value=el('sn').value=el('sb').value='';el('setComponents').innerHTML='';window.addSetComponent();};
  window.editSet=function(id){const s=sets.find(x=>Number(x.id)===Number(id));if(!s)return;editSetId=id;el('setEditor').style.display='block';el('setEditorTitle').textContent='Set Düzenle';el('sc').value=s.set_item_no||'';el('sn').value=s.set_name||'';el('sb').value=s.barcode||'';el('setComponents').innerHTML='';(s.items||[]).forEach(window.addSetComponent);};
  window.cancelSetEdit=function(){editSetId=null;el('setEditor').style.display='none';};
  window.addSetComponent=function(it={}){const d=document.createElement('div');d.className='set-component';d.innerHTML=`<input class="sci" list="opsProductCodes" placeholder="Ürün kodu" value="${esc(it.item_code||'')}"><input class="scn" placeholder="Ürün adı" value="${esc(it.item_name||'')}"><input class="scq" type="number" min="0.001" step="1" value="${esc(it.qty||1)}"><button class="btn danger" onclick="this.parentElement.remove()">Çıkar</button>`;el('setComponents').appendChild(d);};
  window.saveSet=async function(){const items=[...document.querySelectorAll('#setComponents .set-component')].map(r=>{const code=r.querySelector('.sci').value.trim();const p=products.find(x=>x.item_code===code);return {item_code:code,item_name:r.querySelector('.scn').value.trim()||p?.item_name||'',barcode:p?.barcode||'',qty:Number(r.querySelector('.scq').value||1)}}).filter(x=>x.item_code);const body={set_item_no:el('sc').value.trim(),set_name:el('sn').value.trim(),barcode:el('sb').value.trim(),items};if(!body.set_item_no||!body.set_name)return say('Set kodu ve adı gerekli');if(editSetId)await api2('/api/sets/'+editSetId,{method:'PATCH',body:JSON.stringify(body)});else await api2('/api/sets',{method:'POST',body:JSON.stringify(body)});say('Set kaydedildi');window.cancelSetEdit();await window.loadSets();};
  window.deleteSet=async function(id){const s=sets.find(x=>Number(x.id)===Number(id));if(!confirm((s?.set_name||'Bu set')+' katalogdan kaldırılsın mı?'))return;await api2('/api/sets/'+id,{method:'DELETE'});say('Set kaldırıldı');await window.loadSets();};

  function fixOrderHeader(){
    const tr=document.querySelector('#orders thead tr');if(!tr)return;
    tr.innerHTML='<th>Sipariş</th><th>Detay</th><th>Tarih</th><th>Alıcı</th><th>Şehir</th><th>Durum</th><th>İrsaliye</th><th>DHL</th>';
  }

  window.loadOrders=async function(){
    fixOrderHeader();
    const q=new URLSearchParams();
    if(el('oq')?.value)q.set('q',el('oq').value);
    if(el('os')?.value&&el('os').value!=='all')q.set('status',el('os').value);
    if(el('od')?.value)q.set('date',el('od').value);
    if(el('of')?.value)q.set('from',el('of').value);
    if(el('ot')?.value)q.set('to',el('ot').value);
    const orders=await api2('/api/orders?'+q);
    const tbody=el('orderRows');
    if(tbody)tbody.innerHTML=orders.map(x=>`<tr class="ops-order-row" onclick="openOrderDetail(${x.id})"><td><b>${esc(x.order_no)}</b></td><td><button class="btn primary ops-open" onclick="event.stopPropagation();openOrderDetail(${x.id})">Aç</button></td><td>${dateTR(x.order_date)}</td><td>${esc(x.recipient_name)}</td><td>${esc(x.city||'')}</td><td><span class="badge ${x.status==='DONE'?'done':'new'}">${esc(statusText(x.status))}</span></td><td>${x.waybill_no?esc(x.waybill_no):'<span class="muted">Bekliyor</span>'}</td><td>${x.dhl_tracking_no?esc(x.dhl_tracking_no):'<span class="muted">Bekliyor</span>'}</td></tr>`).join('');
    const days=await api2('/api/orders/days');
    const valid=days.map(x=>({...x,key:dateKey(x.order_date)})).filter(x=>x.key);
    const box=el('days');if(box)box.innerHTML=valid.map(x=>`<button class="day" onclick="filterDay('${x.key}')"><b>${dateTR(x.key)}</b><span>${x.count} sipariş</span></button>`).join('');
  };

  window.openOrderDetail=async function(id){
    const x=await api2('/api/orders/'+id+'/detail');currentOrderId=id;
    el('odTitle').textContent=x.order_no||'Sipariş';el('odSub').textContent=(dateTR(x.order_date)!=='—'?dateTR(x.order_date)+' · ':'')+(x.source_status||statusText(x.status)||'');
    el('odName').value=x.recipient_name||'';el('odPhone').value=x.phone||'';el('odCity').value=x.city||'';el('odDistrict').value=x.district||'';el('odPost').value=x.postal_code||'';el('odAddress').value=x.address||'';el('odTemplate').value=x.letter_template_no||'';el('odStatus').value=x.status||'NEW';el('odWaybill').value=x.waybill_no||'';el('odWaybillDone').checked=!!x.waybill_done;
    window.renderOrderItems(x.items||[]);
    el('odAddProduct').innerHTML='<option value="">Ürün seç</option>'+products.map(p=>`<option value="${esc(p.item_code)}">${esc(p.item_code)} · ${esc(p.item_name)}</option>`).join('');
    el('odAddProduct').onchange=()=>{const p=products.find(z=>z.item_code===el('odAddProduct').value);el('odAddName').value=p?.item_name||''};
    el('orderDetailModal').classList.add('show');
  };
  window.closeOrderDetail=function(){el('orderDetailModal').classList.remove('show');currentOrderId=null;};
  window.renderOrderItems=function(items){el('odItems').innerHTML=items.length?items.map(it=>`<div class="ops-item" data-item-id="${it.id}"><input class="oic" value="${esc(it.item_code)}"><input class="oin" value="${esc(it.item_name)}"><input class="oiq" type="number" min="0.001" step="1" value="${esc(it.qty)}"><span class="ops-actions"><button class="btn" onclick="saveOrderItem(${it.id})">Kaydet</button><button class="btn danger" onclick="removeOrderItem(${it.id})">Çıkar</button></span></div>`).join(''):'<div class="muted">Bu siparişte ürün kalemi yok.</div>';};
  window.saveOrderDetail=async function(){if(!currentOrderId)return;await api2('/api/orders/'+currentOrderId+'/detail',{method:'PATCH',body:JSON.stringify({recipient_name:el('odName').value,phone:el('odPhone').value,city:el('odCity').value,district:el('odDistrict').value,postal_code:el('odPost').value,address:el('odAddress').value,letter_template_no:el('odTemplate').value,status:el('odStatus').value,waybill_no:el('odWaybill').value,waybill_done:el('odWaybillDone').checked})});say('Sipariş güncellendi');await window.loadOrders();await window.dashboard?.();};
  window.saveOrderItem=async function(id){const r=document.querySelector(`[data-item-id="${id}"]`);await api2('/api/order-items/'+id,{method:'PATCH',body:JSON.stringify({item_code:r.querySelector('.oic').value,item_name:r.querySelector('.oin').value,qty:Number(r.querySelector('.oiq').value||1)})});say('Ürün satırı güncellendi');await window.openOrderDetail(currentOrderId);};
  window.removeOrderItem=async function(id){if(!confirm('Bu ürün bu siparişten çıkarılsın mı?'))return;await api2('/api/order-items/'+id,{method:'DELETE'});say('Ürün siparişten çıkarıldı');await window.openOrderDetail(currentOrderId);};
  window.addOrderItem=async function(){if(!currentOrderId)return;const code=el('odAddProduct').value;const p=products.find(x=>x.item_code===code);if(!p)return say('Ürün seçmelisin');await api2('/api/orders/'+currentOrderId+'/items',{method:'POST',body:JSON.stringify({item_code:p.item_code,item_name:p.item_name,qty:Number(el('odAddQty').value||1)})});say('Ürün eklendi');await window.openOrderDetail(currentOrderId);};

  const baseDashboard=window.dashboard;
  window.dashboard=async function(){
    if(typeof baseDashboard==='function')await baseDashboard();
    const recent=el('recent');if(!recent)return;
    const orders=await api2('/api/orders');
    recent.innerHTML=orders.slice(0,6).map(x=>`<div style="padding:10px 0;border-bottom:1px solid #edf1f5;cursor:pointer" onclick="openOrderDetail(${x.id})"><b>${esc(x.order_no)}</b> · ${esc(x.recipient_name)}<div class="muted">${dateTR(x.order_date)} · ${esc(x.city||'-')} · ${esc(statusText(x.status))}</div></div>`).join('')||'<p class="muted">Henüz sipariş yok.</p>';
  };

  document.querySelectorAll('.side [data-v]').forEach(b=>{
    if(b.dataset.v==='sets'&&!b.dataset.opsBound){b.dataset.opsBound='1';b.addEventListener('click',()=>{document.querySelectorAll('.view').forEach(x=>x.classList.remove('active'));el('sets')?.classList.add('active');document.querySelectorAll('.side [data-v]').forEach(x=>x.classList.toggle('active',x===b));if(el('title'))el('title').textContent='Setler';window.loadSets();});}
  });

  setTimeout(async()=>{
    try{
      if(!document.getElementById('app')?.classList.contains('hidden')){
        await window.loadProducts();
        if(document.getElementById('orders')?.classList.contains('active'))await window.loadOrders();
      }
    }catch(e){console.error('Ops enhancement init:',e);}
  },50);
})();

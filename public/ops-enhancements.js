(()=>{
  const esc=s=>String(s??'').replace(/[&<>\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[c]));
  let sets=[];
  let editProductId=null;
  let editSetId=null;
  let currentOrderId=null;

  const style=document.createElement('style');
  style.textContent=`
    .ops-actions{display:flex;gap:6px;flex-wrap:wrap}.btn.danger{background:#fee2e2;color:#991b1b}.btn.warn{background:#fff3cd;color:#725600}
    .ops-list-row{display:grid;grid-template-columns:minmax(120px,.7fr) minmax(220px,1.6fr) minmax(120px,.7fr) auto;gap:10px;align-items:center;padding:9px 0;border-bottom:1px solid #edf1f5}
    .ops-modal-bg{position:fixed;inset:0;background:#0f172a99;z-index:9998;display:none;align-items:center;justify-content:center;padding:18px}.ops-modal-bg.show{display:flex}
    .ops-modal{background:#fff;border-radius:18px;width:min(1050px,96vw);max-height:92vh;overflow:auto;padding:22px;box-shadow:0 25px 80px #0004}
    .ops-modal-head{display:flex;justify-content:space-between;gap:15px;align-items:flex-start}.ops-modal h3{margin:0}.ops-close{border:0;background:#edf2f7;border-radius:9px;padding:8px 12px;cursor:pointer}
    .ops-detail-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}.ops-detail-grid .wide{grid-column:1/-1}
    .ops-field{display:grid;gap:5px}.ops-field input,.ops-field select,.ops-field textarea{border:1px solid #cad5e2;border-radius:9px;padding:9px}
    .ops-item{display:grid;grid-template-columns:170px 1fr 90px auto;gap:8px;align-items:center;padding:9px 0;border-bottom:1px solid #edf1f5}.ops-item input,.ops-item select{border:1px solid #cad5e2;border-radius:8px;padding:8px;min-width:0}
    .set-editor{margin-top:14px}.set-component{display:grid;grid-template-columns:1fr 1.4fr 90px auto;gap:8px;margin:7px 0}.set-component input{border:1px solid #cad5e2;border-radius:8px;padding:8px;min-width:0}
    @media(max-width:800px){.ops-list-row,.ops-item,.set-component,.ops-detail-grid{grid-template-columns:1fr}.ops-detail-grid .wide{grid-column:auto}}
  `;
  document.head.appendChild(style);

  const side=document.querySelector('.side');
  const templatesBtn=[...side.querySelectorAll('[data-v]')].find(b=>b.dataset.v==='templates');
  if(side && !side.querySelector('[data-v="sets"]')){
    const b=document.createElement('button'); b.dataset.v='sets'; b.textContent='Setler';
    side.insertBefore(b,templatesBtn||side.lastElementChild);
    const manage=document.createElement('button');manage.textContent='Veri Yönetimi';manage.onclick=()=>location.href='/manage';side.insertBefore(manage,side.lastElementChild);
  }

  const main=document.querySelector('.main');
  if(main && !document.getElementById('sets')){
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
    const tpl=document.getElementById('templates'); main.insertBefore(sec,tpl||null);
    $('sq').addEventListener('input',renderSets);
  }

  const dl=document.createElement('datalist');dl.id='opsProductCodes';document.body.appendChild(dl);

  const statusSel=$('os');
  if(statusSel && ![...statusSel.options].some(o=>o.value==='Çıkarıldı')){
    const op=document.createElement('option');op.value='Çıkarıldı';op.textContent='Çıkarıldı';statusSel.insertBefore(op,[...statusSel.options].find(o=>o.value==='SHIPPED')||null);
  }

  const modal=document.createElement('div');modal.id='orderDetailModal';modal.className='ops-modal-bg';modal.innerHTML=`
    <div class="ops-modal"><div class="ops-modal-head"><div><h3 id="odTitle">Sipariş</h3><div class="muted" id="odSub"></div></div><button class="ops-close" onclick="closeOrderDetail()">Kapat</button></div>
      <div class="ops-detail-grid" style="margin-top:15px">
        <div class="ops-field"><label>Alıcı</label><input id="odName"></div><div class="ops-field"><label>Telefon</label><input id="odPhone"></div><div class="ops-field"><label>Durum</label><select id="odStatus"><option value="NEW">Yeni</option><option value="PREPARING">Hazırlanıyor</option><option value="Çıkarıldı">Çıkarıldı</option><option value="SHIPPED">Kargoya çıktı</option><option value="DONE">Tamamlandı</option></select></div>
        <div class="ops-field"><label>İl</label><input id="odCity"></div><div class="ops-field"><label>İlçe</label><input id="odDistrict"></div><div class="ops-field"><label>Posta Kodu</label><input id="odPost"></div>
        <div class="ops-field wide"><label>Adres</label><textarea id="odAddress" rows="2"></textarea></div>
        <div class="ops-field"><label>Yazı Şablonu</label><input id="odTemplate"></div><div class="ops-field"><label>İrsaliye No</label><input id="odWaybill"></div><div class="ops-field"><label><input id="odWaybillDone" type="checkbox"> İrsaliye tamamlandı</label></div>
      </div>
      <div class="ops-actions" style="margin:12px 0"><button class="btn primary" onclick="saveOrderDetail()">Sipariş Bilgilerini Kaydet</button></div>
      <hr style="border:0;border-top:1px solid #e5e7eb"><h4>Ürünler</h4><div id="odItems"></div>
      <div class="card panel" style="margin-top:12px"><b>Ürün Ekle</b><div class="ops-item"><select id="odAddProduct"></select><input id="odAddName" placeholder="Ürün adı" disabled><input id="odAddQty" type="number" min="0.001" step="1" value="1"><button class="btn primary" onclick="addOrderItem()">Ekle</button></div></div>
    </div>`;
  document.body.appendChild(modal);

  const oldGo=go;
  go=function(v){oldGo(v);if(v==='sets')loadSets();};

  loadProducts=async function(){
    products=await api('/api/products');
    dl.innerHTML=products.map(x=>`<option value="${esc(x.item_code)}">${esc(x.item_name)}</option>`).join('');
    const list=$('productList');
    list.innerHTML=products.map(x=>`<div class="ops-list-row"><b>${esc(x.item_code)}</b><span>${esc(x.item_name)}</span><span class="muted">${esc(x.barcode||'')}</span><span class="ops-actions"><button class="btn" onclick="editProduct(${x.id})">Düzenle</button><button class="btn danger" onclick="deleteProduct(${x.id})">Sil</button></span></div>`).join('');
  };

  editProduct=function(id){
    const x=products.find(p=>Number(p.id)===Number(id));if(!x)return;editProductId=id;$('pc').value=x.item_code||'';$('pn').value=x.item_name||'';$('pb').value=x.barcode||'';
    const btn=document.querySelector('#products .btn.primary');if(btn)btn.textContent='Güncelle';window.scrollTo({top:0,behavior:'smooth'});
  };

  saveProduct=async function(){
    const body={item_code:$('pc').value.trim(),item_name:$('pn').value.trim(),barcode:$('pb').value.trim()};
    if(!body.item_code||!body.item_name)return toast('Ürün kodu ve adı gerekli');
    if(editProductId)await api('/api/products/'+editProductId,{method:'PATCH',body:JSON.stringify(body)});else await api('/api/products',{method:'POST',body:JSON.stringify(body)});
    editProductId=null;$('pc').value=$('pn').value=$('pb').value='';const btn=document.querySelector('#products .btn.primary');if(btn)btn.textContent='Kaydet';toast('Ürün kaydedildi');await loadProducts();
  };

  deleteProduct=async function(id){
    const x=products.find(p=>Number(p.id)===Number(id));if(!confirm((x?.item_name||'Bu ürün')+' katalogdan kaldırılsın mı? Geçmiş siparişlerden silinmez.'))return;
    await api('/api/products/'+id,{method:'DELETE'});toast('Ürün katalogdan kaldırıldı');await loadProducts();
  };

  loadSets=async function(){sets=await api('/api/sets');renderSets();};
  renderSets=function(){
    const q=($('sq')?.value||'').toLocaleLowerCase('tr-TR');
    $('setList').innerHTML=sets.filter(s=>(s.set_item_no+' '+s.set_name).toLocaleLowerCase('tr-TR').includes(q)).map(s=>`<div class="ops-list-row"><b>${esc(s.set_item_no)}</b><span>${esc(s.set_name)}<div class="muted">${(s.items||[]).length} bileşen</div></span><span class="muted">${esc(s.barcode||'')}</span><span class="ops-actions"><button class="btn" onclick="editSet(${s.id})">Düzenle</button><button class="btn danger" onclick="deleteSet(${s.id})">Sil</button></span></div>`).join('');
  };
  newSet=function(){editSetId=null;$('setEditor').style.display='block';$('setEditorTitle').textContent='Yeni Set';$('sc').value=$('sn').value=$('sb').value='';$('setComponents').innerHTML='';addSetComponent();};
  editSet=function(id){const s=sets.find(x=>Number(x.id)===Number(id));if(!s)return;editSetId=id;$('setEditor').style.display='block';$('setEditorTitle').textContent='Set Düzenle';$('sc').value=s.set_item_no||'';$('sn').value=s.set_name||'';$('sb').value=s.barcode||'';$('setComponents').innerHTML='';(s.items||[]).forEach(addSetComponent);};
  cancelSetEdit=function(){editSetId=null;$('setEditor').style.display='none';};
  addSetComponent=function(it={}){const d=document.createElement('div');d.className='set-component';d.innerHTML=`<input class="sci" list="opsProductCodes" placeholder="Ürün kodu" value="${esc(it.item_code||'')}"><input class="scn" placeholder="Ürün adı" value="${esc(it.item_name||'')}"><input class="scq" type="number" min="0.001" step="1" value="${esc(it.qty||1)}"><button class="btn danger" onclick="this.parentElement.remove()">Çıkar</button>`;$('setComponents').appendChild(d);};
  saveSet=async function(){
    const items=[...document.querySelectorAll('#setComponents .set-component')].map(r=>{const code=r.querySelector('.sci').value.trim();const p=products.find(x=>x.item_code===code);return {item_code:code,item_name:r.querySelector('.scn').value.trim()||p?.item_name||'',barcode:p?.barcode||'',qty:Number(r.querySelector('.scq').value||1)}}).filter(x=>x.item_code);
    const body={set_item_no:$('sc').value.trim(),set_name:$('sn').value.trim(),barcode:$('sb').value.trim(),items};if(!body.set_item_no||!body.set_name)return toast('Set kodu ve adı gerekli');
    if(editSetId)await api('/api/sets/'+editSetId,{method:'PATCH',body:JSON.stringify(body)});else await api('/api/sets',{method:'POST',body:JSON.stringify(body)});toast('Set kaydedildi');cancelSetEdit();await loadSets();
  };
  deleteSet=async function(id){const s=sets.find(x=>Number(x.id)===Number(id));if(!confirm((s?.set_name||'Bu set')+' katalogdan kaldırılsın mı?'))return;await api('/api/sets/'+id,{method:'DELETE'});toast('Set kaldırıldı');await loadSets();};

  loadOrders=async function(){
    const q=new URLSearchParams();if($('oq').value)q.set('q',$('oq').value);if($('os').value!=='all')q.set('status',$('os').value);if($('od').value)q.set('date',$('od').value);if($('of').value)q.set('from',$('of').value);if($('ot').value)q.set('to',$('ot').value);
    const o=await api('/api/orders?'+q);$('orderRows').innerHTML=o.map(x=>`<tr><td><b>${esc(x.order_no)}</b></td><td>${esc(x.order_date||'')}</td><td>${esc(x.recipient_name)}</td><td>${esc(x.city||'')}</td><td><span class="badge ${x.status==='DONE'?'done':'new'}">${esc(x.status)}</span></td><td>${x.waybill_no?esc(x.waybill_no):'<span class="muted">Bekliyor</span>'}</td><td>${x.dhl_tracking_no?esc(x.dhl_tracking_no):'<span class="muted">Bekliyor</span>'}</td><td><button class="btn primary" onclick="openOrderDetail(${x.id})">Aç</button></td></tr>`).join('');
    const d=await api('/api/orders/days');$('days').innerHTML=d.filter(x=>x.order_date).map(x=>`<button class="day" onclick="filterDay('${x.order_date}')"><b>${x.order_date}</b><span>${x.count} sipariş</span></button>`).join('');
  };

  openOrderDetail=async function(id){
    const x=await api('/api/orders/'+id+'/detail');currentOrderId=id;$('odTitle').textContent=x.order_no;$('odSub').textContent=(x.order_date||'')+' · '+(x.source_status||'');$('odName').value=x.recipient_name||'';$('odPhone').value=x.phone||'';$('odCity').value=x.city||'';$('odDistrict').value=x.district||'';$('odPost').value=x.postal_code||'';$('odAddress').value=x.address||'';$('odTemplate').value=x.letter_template_no||'';$('odStatus').value=x.status||'NEW';$('odWaybill').value=x.waybill_no||'';$('odWaybillDone').checked=!!x.waybill_done;renderOrderItems(x.items||[]);
    $('odAddProduct').innerHTML='<option value="">Ürün seç</option>'+products.map(p=>`<option value="${esc(p.item_code)}">${esc(p.item_code)} · ${esc(p.item_name)}</option>`).join('');$('odAddProduct').onchange=()=>{const p=products.find(z=>z.item_code===$('odAddProduct').value);$('odAddName').value=p?.item_name||''};$('orderDetailModal').classList.add('show');
  };
  closeOrderDetail=function(){$('orderDetailModal').classList.remove('show');currentOrderId=null;};
  renderOrderItems=function(items){$('odItems').innerHTML=items.length?items.map(it=>`<div class="ops-item" data-item-id="${it.id}"><input class="oic" value="${esc(it.item_code)}"><input class="oin" value="${esc(it.item_name)}"><input class="oiq" type="number" min="0.001" step="1" value="${esc(it.qty)}"><span class="ops-actions"><button class="btn" onclick="saveOrderItem(${it.id})">Kaydet</button><button class="btn danger" onclick="removeOrderItem(${it.id})">Çıkar</button></span></div>`).join(''):'<div class="muted">Bu siparişte ürün kalemi yok.</div>';};
  saveOrderDetail=async function(){if(!currentOrderId)return;await api('/api/orders/'+currentOrderId+'/detail',{method:'PATCH',body:JSON.stringify({recipient_name:$('odName').value,phone:$('odPhone').value,city:$('odCity').value,district:$('odDistrict').value,postal_code:$('odPost').value,address:$('odAddress').value,letter_template_no:$('odTemplate').value,status:$('odStatus').value,waybill_no:$('odWaybill').value,waybill_done:$('odWaybillDone').checked})});toast('Sipariş güncellendi');await loadOrders();await dashboard();};
  saveOrderItem=async function(id){const r=document.querySelector(`[data-item-id="${id}"]`);await api('/api/order-items/'+id,{method:'PATCH',body:JSON.stringify({item_code:r.querySelector('.oic').value,item_name:r.querySelector('.oin').value,qty:Number(r.querySelector('.oiq').value||1)})});toast('Ürün satırı güncellendi');await openOrderDetail(currentOrderId);};
  removeOrderItem=async function(id){if(!confirm('Bu ürün bu siparişten çıkarılsın mı?'))return;await api('/api/order-items/'+id,{method:'DELETE'});toast('Ürün siparişten çıkarıldı');await openOrderDetail(currentOrderId);};
  addOrderItem=async function(){if(!currentOrderId)return;const code=$('odAddProduct').value;const p=products.find(x=>x.item_code===code);if(!p)return toast('Ürün seçmelisin');await api('/api/orders/'+currentOrderId+'/items',{method:'POST',body:JSON.stringify({item_code:p.item_code,item_name:p.item_name,qty:Number($('odAddQty').value||1)})});toast('Ürün eklendi');await openOrderDetail(currentOrderId);};

  const oldDashboard=dashboard;
  dashboard=async function(){await oldDashboard();const recent=$('recent');if(!recent)return;const o=await api('/api/orders');recent.innerHTML=o.slice(0,6).map(x=>`<div style="padding:10px 0;border-bottom:1px solid #edf1f5;cursor:pointer" onclick="openOrderDetail(${x.id})"><b>${esc(x.order_no)}</b> · ${esc(x.recipient_name)}<div class="muted">${esc(x.order_date||'')} · ${esc(x.city||'-')} · ${esc(x.status)}</div></div>`).join('')||'<p class="muted">Henüz sipariş yok.</p>';};
})();

(()=>{
'use strict';
const el=id=>document.getElementById(id), esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const call=async(url,body)=>{const r=await fetch(url,{credentials:'same-origin',...(body?{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}:{})});const d=await r.json();if(!r.ok)throw Error(d.error||'İşlem tamamlanamadı');return d};
const css=document.createElement('link');css.rel='stylesheet';css.href='/order-workspace.css?v=2';document.head.append(css);
let recipientVersion=0,recipientTimer,busy=false,pasteBusy=false;
function message(text){el('orderError').textContent=text;}
function resetRecipient(){recipientVersion++;clearTimeout(recipientTimer);['nc','nn','np','ncity','nd','npost','na','contactLookup'].forEach(id=>el(id).value='');el('contactMatches').replaceChildren();el('recipientSelection').textContent='Yeni alıcı bilgilerini doldur.';el('nn').focus();}
el('newRecipient').onclick=resetRecipient;
el('contactLookup').oninput=()=>{
 const version=++recipientVersion;clearTimeout(recipientTimer);const q=el('contactLookup').value.trim();el('contactMatches').replaceChildren();if(q.length<2)return;
 recipientTimer=setTimeout(async()=>{try{
 const data=await call('/api/contacts?search=1&q='+encodeURIComponent(q));if(version!==recipientVersion)return;
 el('contactMatches').innerHTML=data.rows.length?'':'<p class="muted">Kayıt bulunamadı. Yeni alıcı bilgilerini aşağıya yazabilirsin.</p>';
 data.rows.forEach(person=>{const b=document.createElement('button');b.type='button';b.className='ow-match';b.innerHTML=`<b>${esc(person.name)}</b><span>${esc([person.phone,person.district,person.city].filter(Boolean).join(' · '))}</span><small>${esc(person.address||'Adres eksik')}</small>`;b.onclick=()=>{
 recipientVersion++;clearTimeout(recipientTimer);const fields={nc:person.id,nn:person.name,np:person.phone,ncity:person.city,nd:person.district,npost:person.postal_code,na:person.address};Object.entries(fields).forEach(([id,v])=>el(id).value=v||'');el('contactMatches').replaceChildren();el('contactLookup').value=person.name;window.dispatchEvent(new CustomEvent('postal-selected',{detail:'new'}));el('recipientSelection').textContent='Adres #'+person.id+' seçildi. Buradaki değişiklikler yalnızca bu siparişi etkiler.';};el('contactMatches').append(b)});
 if(data.hasMore){const p=document.createElement('p');p.className='muted';p.textContent='İlk 20 sonuç. Daha ayrıntılı arayabilirsin.';el('contactMatches').append(p)}
 }catch(e){if(version===recipientVersion)el('contactMatches').textContent=e.message}},250);
};
function summary(){const rows=[...el('itemRows').children];let count=0,total=0;rows.forEach((row,i)=>{row.querySelector('.ow-index').textContent=i+1;if(row.item){count++;total+=Number(row.querySelector('.qty').value)||0}});el('lineSummary').textContent=count+' kalem · '+total.toLocaleString('tr-TR')+' adet';}
function choose(row,item){message('');row.item=item;row.querySelector('.prodsel').value=item.item_code;row.querySelector('.search-product').value=item.item_code;row.querySelector('.ow-item-name').textContent=item.item_name+(item.kind==='set'?' · Set':'');row.querySelector('.product-matches').replaceChildren();row.classList.remove('ow-invalid');summary();}
window.chooseProduct=choose;
window.addItem=function(){const row=document.createElement('div');row.className='itemrow ow-row';row.innerHTML=`<span class="ow-index"></span><div class="ow-product"><input class="search-product" aria-label="Ürün kodu, adı veya barkodu" autocomplete="off" placeholder="Ürün kodu, adı veya barkodu"><input type="hidden" class="prodsel"><small class="ow-item-name">Ürün seçilmedi</small><div class="product-matches"></div></div><input class="qty" aria-label="Adet" type="number" min="0.001" step="0.001" value="1"><button class="btn" aria-label="Satırı sil" type="button">×</button>`;
 const input=row.querySelector('.search-product'),list=row.querySelector('.product-matches'),qty=row.querySelector('.qty');let version=0,timer;
 row.querySelector('button').onclick=()=>{clearTimeout(timer);version++;row.remove();message('');if(!el('itemRows').children.length)addItem();summary()};
 input.oninput=()=>{const v=++version;clearTimeout(timer);row.item=null;row.querySelector('.prodsel').value='';row.querySelector('.ow-item-name').textContent='Sonuçlardan ürün seç';list.replaceChildren();summary();if(input.value.trim().length<2)return;
 timer=setTimeout(async()=>{try{const items=await call('/api/catalog/search?q='+encodeURIComponent(input.value.trim()));if(v!==version||!row.isConnected)return;list.replaceChildren();if(!items.length)list.textContent='Ürün bulunamadı';items.forEach(item=>{const b=document.createElement('button');b.type='button';b.className='ow-match';b.innerHTML=`<b>${esc(item.item_code)} ${item.kind==='set'?'<span class="ow-tag">Set</span>':''}</b><span>${esc(item.item_name)}</span>`;b.onclick=()=>{version++;choose(row,item);qty.focus();qty.select()};list.append(b)})}catch(e){if(v===version)list.textContent=e.message}},220);
 };
 input.onkeydown=e=>{if(e.key==='Escape')list.replaceChildren();if(e.key==='Enter'&&list.firstElementChild?.tagName==='BUTTON'){e.preventDefault();list.firstElementChild.click()}};
 input.onpaste=e=>{const text=e.clipboardData.getData('text');if(/[\t\n]/.test(text)){e.preventDefault();pasteRows(text,row)}};
 qty.oninput=summary;qty.onkeydown=e=>{if(e.key==='Enter'){e.preventDefault();const next=row.nextElementSibling||addItem();next.querySelector('.search-product').focus()}};
 el('itemRows').append(row);summary();return row;
};
async function pasteRows(text,start){
 if(pasteBusy)return false;pasteBusy=true;el('bulkResult').textContent='Ürünler kontrol ediliyor…';
 try{
 const lines=text.trim().split(/\r?\n/).filter(x=>x.trim()).map(line=>{const cells=line.split('\t').map(x=>x.trim());return {code:cells[0],qty:cells.length>1?cells[cells.length-1]:'1'}});
 if(!lines.length||lines.length>500)throw Error('1–500 satır yapıştırabilirsin.');
 if(lines.some(l=>!Number.isFinite(Number(l.qty.replace(',','.')))||Number(l.qty.replace(',','.'))<=0))throw Error('Adet sütununda pozitif sayı olmalı. Başlık satırını yapıştırma.');
 const resolved=await call('/api/catalog/resolve',{codes:lines.map(l=>l.code)});
 let errors=0;el('bulkResult').classList.remove('has-error');const empty=[...el('itemRows').children].filter(r=>!r.querySelector('.search-product').value.trim());if(start&&!start.item&&!empty.includes(start))empty.unshift(start);
 resolved.forEach((r,i)=>{const row=empty.shift()||addItem();row.querySelector('.qty').value=Number(lines[i].qty.replace(',','.'));if(r.item)choose(row,r.item);else{errors++;row.item=null;row.querySelector('.prodsel').value='';row.querySelector('.search-product').value=r.code;row.querySelector('.ow-item-name').textContent=r.error;row.classList.add('ow-invalid')}});
 el('bulkCodes').value='';el('bulkResult').classList.toggle('has-error',errors>0);el('bulkResult').textContent=lines.length+' satır eklendi.'+(errors?' '+errors+' satır bulunamadı; işaretli satırları düzelt.':'');summary();return true;
 }catch(e){el('bulkResult').classList.add('has-error');el('bulkResult').textContent=e.message}finally{pasteBusy=false}
}
function noteRow(code='',qty=''){
 if(el('noteRows').children.length>=500)return null;
 const row=document.createElement('div');row.className='ow-note-row';row.innerHTML='<span class="ow-note-index"></span><input class="note-code" aria-label="Not ürün kodu veya barkodu" placeholder="Kod / barkod"><input class="note-qty" aria-label="Not adedi" inputmode="decimal" placeholder="1"><button type="button" class="btn" aria-label="Not satırını sil">×</button>';
 row.querySelector('.note-code').value=code;row.querySelector('.note-qty').value=qty;
 row.querySelector('button').onclick=()=>{row.remove();if(!el('noteRows').children.length)noteRow();numberNotes()};
 [...row.querySelectorAll('input')].forEach((input,col)=>{
  input.onpaste=e=>{const value=e.clipboardData.getData('text');if(!/[\t\n]/.test(value))return;e.preventDefault();
   const matrix=value.replace(/\r/g,'').replace(/\n$/,'').split('\n').map(line=>line.split('\t'));
   const index=[...el('noteRows').children].indexOf(row);
   if(index+matrix.length>500||matrix.some(c=>c.length+col>2)){el('bulkResult').textContent='En fazla 500 satır ve iki sütun (kod, adet) yapıştırabilirsin.';el('bulkResult').classList.add('has-error');return;}
   matrix.forEach((cells,i)=>{const target=el('noteRows').children[index+i]||noteRow();cells.forEach((v,j)=>target.querySelectorAll('input')[col+j].value=v.trim())});numberNotes();
  };
  input.onkeydown=e=>{if(e.key==='Enter'||(e.key==='Tab'&&!e.shiftKey&&col===1&&!row.nextElementSibling)){e.preventDefault();const next=row.nextElementSibling||noteRow();next?.querySelector('input').focus()}};
 });el('noteRows').append(row);numberNotes();return row;
}
function numberNotes(){[...el('noteRows').children].forEach((r,i)=>r.querySelector('.ow-note-index').textContent=i+1);}
function pendingNotes(){return [...el('noteRows').children].some(r=>[...r.querySelectorAll('input')].some(i=>i.value.trim()));}
window.addBulkItems=async()=>{
 if(pasteBusy)return;
 const rows=[...el('noteRows').children].map(r=>({code:r.querySelector('.note-code').value.trim(),qty:r.querySelector('.note-qty').value.trim()})).filter(r=>r.code||r.qty);
 if(!rows.length){el('bulkResult').textContent='Önce not tablosuna ürün kodlarını gir.';return;}
 if(rows.some(r=>!r.code)){el('bulkResult').textContent='Adet girilen her satırda ürün kodu da olmalı.';return;}
 const controls=[...document.querySelectorAll('.ow-paste input,.ow-paste button')];controls.forEach(c=>c.disabled=true);
 try{if(await pasteRows(rows.map(r=>r.code+'\t'+(r.qty||'1')).join('\n'))){el('noteRows').replaceChildren();for(let i=0;i<4;i++)noteRow();}}finally{controls.forEach(c=>c.disabled=false);}
};
el('addNoteRow').onclick=()=>{const row=noteRow();if(row)row.querySelector('input').focus();else el('bulkResult').textContent='En fazla 500 not satırı eklenebilir.'};
for(let i=0;i<4;i++)noteRow();
window.saveOrder=async()=>{
 if(busy||pasteBusy)return;message('');
 const rows=[...el('itemRows').children].filter(r=>r.querySelector('.search-product').value.trim());
 if(!rows.length)return message('En az bir ürün satırı gerekli.');
 const invalid=rows.find(r=>!r.item||!Number.isFinite(Number(r.querySelector('.qty').value))||Number(r.querySelector('.qty').value)<=0);
 if(invalid){invalid.classList.add('ow-invalid');invalid.querySelector('.search-product').focus();return message('İşaretli satırın ürününü ve adetini kontrol et.');}
 if(pendingNotes())return message('Not tablosundaki satırları önce siparişe aktar.');
 if(!/^[0-9]{5}$/.test(el('npost').value.trim())){el('npost').focus();return message('SAP teslimat adresi için 5 haneli posta kodunu tamamla.');}
 for(const [id,label] of [['nn','Alıcı adı'],['ncity','İl'],['nd','İlçe'],['na','Açık adres']])if(!el(id).value.trim()){el(id).focus();return message(label+' gerekli.');}
 busy=true;const b=document.querySelector('#new [onclick="saveOrder()"]');b.disabled=true;b.textContent='Sipariş kaydediliyor…';
 try{const body={contact_id:el('nc').value||null,recipient_name:el('nn').value.trim(),phone:el('np').value.trim(),city:el('ncity').value.trim(),district:el('nd').value.trim(),postal_code:el('npost').value.trim(),address:el('na').value.trim(),letter_template_no:el('nt').value,order_date:el('ndate').value,items:rows.map(r=>({item_code:r.item.item_code,qty:Number(r.querySelector('.qty').value)}))};
 await call('/api/orders',body);resetRecipient();el('itemRows').replaceChildren();addItem();el('bulkResult').textContent='';el('nt').value='';toast('Sipariş kaydedildi. DHL test etiketi hazırlanacak.');go('orders');
 }catch(e){message(e.message)}finally{busy=false;b.disabled=false;b.textContent='Siparişi oluştur →'}
};
// Replace any bootstrap row created before this module loaded.
el('itemRows').replaceChildren();addItem();
if(!el('ndate').value)el('ndate').value=new Date().toLocaleDateString('en-CA');
const originalOpen=window.openOrderDetail;
window.openOrderDetail=async function(id){await originalOpen(id);
const select=el('odAddProduct');select.hidden=true;let picker=el('detailProductSearch');if(!picker){picker=document.createElement('div');picker.id='detailProductSearch';picker.innerHTML='<input id="detailProductQuery" placeholder="Ürün adı, kodu veya barkodu" aria-label="Siparişe eklenecek ürün ara"><div id="detailProductMatches"></div>';select.before(picker)}
let lookupVersion=0,lookupTimer;el('detailProductQuery').value='';el('detailProductMatches').replaceChildren();
el('detailProductQuery').oninput=()=>{const version=++lookupVersion;clearTimeout(lookupTimer);select.value='';el('odAddName').value='';el('detailProductMatches').replaceChildren();const q=el('detailProductQuery').value.trim();if(q.length<2)return;lookupTimer=setTimeout(async()=>{try{const rows=await call('/api/catalog/search?q='+encodeURIComponent(q));if(version!==lookupVersion)return;rows.forEach(item=>{const b=document.createElement('button');b.type='button';b.className='ow-match';b.textContent=item.item_code+' · '+item.item_name;b.onclick=()=>{lookupVersion++;select.innerHTML='<option></option>';const option=document.createElement('option');option.value=item.item_code;option.textContent=item.item_name;select.append(option);select.value=item.item_code;products=products.filter(p=>p.item_code!==item.item_code);products.push(item);el('odAddName').value=item.item_name;el('detailProductQuery').value=item.item_code;el('detailProductMatches').replaceChildren();};el('detailProductMatches').append(b)})}catch(e){el('detailProductMatches').textContent=e.message}},220)};
let panel=el('sapPreview');if(!panel){panel=document.createElement('details');panel.id='sapPreview';panel.className='ow-sap-preview';document.querySelector('#orderDetailModal .ops-modal').append(panel)}panel.innerHTML='<summary>SAP aktarım taslağı · Henüz gönderilmedi</summary><p>Yükleniyor…</p>';try{const d=await call('/api/orders/'+id+'/sap-preview');if(window.__archiveOrderId!==id)return;panel.innerHTML=`<summary>SAP aktarım taslağı · Henüz gönderilmedi</summary><p><b>Cari:</b> ${esc(d.customer.cardCode||'Eski kayıt — belirlenmedi')} · <b>Teslim alıcı:</b> ${esc(d.delivery.name)}</p><p>${esc(d.source.orderNumber)} · ${d.lines.length} ürün satırı</p><p>İrsaliye otomasyonu bağlantı aşamasında. Bu taslak SAP kaydı değildir.</p><ul>${d.blockers.map(x=>'<li>'+esc(x)+'</li>').join('')}</ul>`}catch(e){panel.querySelector('p').textContent=e.message}};
})();

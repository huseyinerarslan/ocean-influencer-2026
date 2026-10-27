(()=>{
  const byId=id=>document.getElementById(id);
  const esc=s=>String(s??'').replace(/[&<>\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[c]));
  let editingContactId=null;

  const style=document.createElement('style');
  style.textContent=`
    #contacts .contact-groups{display:grid;gap:10px;margin-top:18px}
    #contacts .contact-group{border:1px solid #e2e8f0;border-radius:14px;padding:14px;background:#fff}
    #contacts .contact-group-head{display:flex;justify-content:space-between;gap:10px;align-items:flex-start;margin-bottom:8px}
    #contacts .contact-group-name{font-weight:800;font-size:18px}
    #contacts .contact-entry{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:10px;align-items:center;padding:10px 0;border-top:1px solid #edf1f5}
    #contacts .contact-entry:first-of-type{border-top:0}.contact-place{font-weight:650}.contact-phone{color:#607087;font-size:13px;margin-top:2px}.contact-address{font-size:13px;color:#718096;margin-top:3px;white-space:normal}
    .contact-form-actions{display:flex;gap:8px;flex-wrap:wrap}
    @media(max-width:900px){
      html,body{max-width:100%;overflow-x:hidden!important}
      .app{display:block!important;min-height:100vh!important;width:100%!important}
      .side{height:auto!important;min-height:0!important;max-height:none!important;align-self:auto!important;align-items:center!important;position:sticky!important;top:0!important;z-index:50!important;padding:10px 12px!important;overflow-x:auto!important;overflow-y:hidden!important}
      .side button{height:auto!important;min-height:44px!important;align-self:center!important;flex:0 0 auto!important}
      .main{width:100%!important;max-width:100%!important;overflow:hidden!important;padding:14px!important}
      .top{width:100%!important}.top>div{min-width:0}.top .btn{flex:0 0 auto}
      .card,.panel,.view,#new,#contacts,#products,#sets,#templates{max-width:100%!important;min-width:0!important}
      .formgrid{grid-template-columns:minmax(0,1fr)!important;width:100%!important;max-width:100%!important}
      .formgrid>*{min-width:0!important;max-width:100%!important}.full{grid-column:auto!important;min-width:0!important}
      .field{min-width:0!important;max-width:100%!important}.field input,.field select,.field textarea,#new input,#new select,#new textarea,#contacts input,#contacts select,#contacts textarea{display:block!important;width:100%!important;max-width:100%!important;min-width:0!important}
      #new .card,#contacts .card{width:100%!important;overflow:hidden!important}
      #new .items{width:100%!important;min-width:0!important}.itemrow{grid-template-columns:minmax(0,1fr)!important;width:100%!important;min-width:0!important}.itemrow select,.itemrow input,.itemrow button{width:100%!important;max-width:100%!important;min-width:0!important}
      #products .toolbar,#sets .toolbar{display:grid!important;grid-template-columns:minmax(0,1fr)!important;width:100%!important}.toolbar input,.toolbar select{min-width:0!important;width:100%!important;max-width:100%!important}
      #contacts .contact-group-head{display:block}.contact-group-head .badge{display:inline-block;margin-top:7px}.contact-entry{grid-template-columns:minmax(0,1fr)!important}.contact-entry .btn{width:100%!important;margin-top:4px}
      .contact-form-actions{display:grid!important;grid-template-columns:1fr!important}.contact-form-actions .btn{width:100%!important}
    }
  `;
  document.head.appendChild(style);

  function norm(s){return String(s||'').trim().toLocaleLowerCase('tr-TR').replace(/\s+/g,' ')}
  function groupContacts(rows){
    const map=new Map();
    for(const x of rows){
      const key=norm(x.name);
      if(!map.has(key))map.set(key,{name:x.name||'',rows:[]});
      map.get(key).rows.push(x);
    }
    return [...map.values()].sort((a,b)=>a.name.localeCompare(b.name,'tr'));
  }

  function ensureContactCancel(){
    const save=byId('contacts')?.querySelector('button[onclick="saveContact()"]');
    if(!save)return;
    const parent=save.parentElement;
    if(!parent.classList.contains('contact-form-actions'))parent.classList.add('contact-form-actions');
    if(!byId('contactCancelEdit')){
      const b=document.createElement('button');b.id='contactCancelEdit';b.type='button';b.className='btn';b.textContent='Vazgeç';b.style.display='none';b.onclick=()=>window.cancelContactEdit();parent.appendChild(b);
    }
  }

  window.editContactInline=function(id){
    const x=(contacts||[]).find(c=>Number(c.id)===Number(id));if(!x)return;
    editingContactId=Number(id);
    byId('cn').value=x.name||'';byId('cp').value=x.phone||'';byId('cc').value=x.city||'';byId('cd').value=x.district||'';byId('cpost').value=x.postal_code||'';byId('ca').value=x.address||'';
    const save=byId('contacts')?.querySelector('button[onclick="saveContact()"]');if(save)save.textContent='Değişiklikleri Kaydet';
    const cancel=byId('contactCancelEdit');if(cancel)cancel.style.display='inline-block';
    byId('contacts')?.scrollIntoView({behavior:'smooth',block:'start'});
  };
  window.cancelContactEdit=function(){
    editingContactId=null;['cn','cp','cc','cd','cpost','ca'].forEach(id=>{if(byId(id))byId(id).value=''});
    const save=byId('contacts')?.querySelector('button[onclick="saveContact()"]');if(save)save.textContent='Kişi Kaydet';
    const cancel=byId('contactCancelEdit');if(cancel)cancel.style.display='none';
  };

  window.loadContacts=async function(){
    contacts=await api('/api/contacts');
    if(byId('nc'))byId('nc').innerHTML='<option value="">Yeni kişi / seçiniz</option>'+contacts.map(x=>`<option value="${x.id}">${esc(x.name)}${x.city?` · ${esc(x.city)}`:''}</option>`).join('');
    const list=byId('contactList');if(!list)return;
    const groups=groupContacts(contacts);
    list.className='contact-groups';
    list.innerHTML=groups.map(g=>`<div class="contact-group"><div class="contact-group-head"><div class="contact-group-name">${esc(g.name)}</div>${g.rows.length>1?`<span class="badge">${g.rows.length} kayıt</span>`:''}</div>${g.rows.map(x=>`<div class="contact-entry"><div><div class="contact-place">${esc([x.city,x.district].filter(Boolean).join(' / ')||'Konum bilgisi yok')}</div><div class="contact-phone">${esc(x.phone||'Telefon yok')}</div><div class="contact-address">${esc(x.address||'Adres bilgisi yok')}</div></div><button class="btn" type="button" onclick="editContactInline(${x.id})">Düzenle</button></div>`).join('')}</div>`).join('');
  };

  window.saveContact=async function(){
    const body={name:byId('cn').value.trim(),phone:byId('cp').value.trim(),city:byId('cc').value.trim(),district:byId('cd').value.trim(),postal_code:byId('cpost').value.trim(),address:byId('ca').value.trim()};
    if(!body.name)return toast('Ad Soyad gerekli');
    if(editingContactId){await api('/api/contacts/'+editingContactId,{method:'PATCH',body:JSON.stringify(body)});toast('Kişi bilgileri güncellendi')}else{await api('/api/contacts',{method:'POST',body:JSON.stringify(body)});toast('Kişi kaydedildi')}
    window.cancelContactEdit();await window.loadContacts();
  };

  ensureContactCancel();
  setTimeout(()=>{if(!document.getElementById('app')?.classList.contains('hidden'))window.loadContacts().catch(console.error)},150);
})();
(()=>{
  'use strict';

  const $=id=>document.getElementById(id);
  const esc=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  const apiX=async(url,opt={})=>{
    const headers={...(opt.headers||{})};
    if(opt.body&&!(opt.body instanceof FormData))headers['Content-Type']='application/json';
    const r=await fetch(url,{credentials:'same-origin',...opt,headers});
    const d=await r.json().catch(()=>({}));
    if(!r.ok)throw Error(d.error||'İşlem başarısız');
    return d;
  };
  const notify=message=>{try{toast(message)}catch{console.log(message)}};

  let editContactId=null;
  let editTemplateId=null;
  let contactQuery='';
  let templateQuery='';

  const css=document.createElement('style');
  css.id='ux-master-data-style';
  css.textContent=`
    .ux-head{display:flex;align-items:flex-start;justify-content:space-between;gap:14px;margin-bottom:14px}
    .ux-head h3{margin:0 0 3px}
    .ux-head p{margin:0;color:#718096;font-size:13px}
    .ux-search{display:flex;gap:8px;align-items:center}
    .ux-search input{min-width:250px;border:1px solid #d4dee8;border-radius:9px;padding:9px 11px;background:#fff}
    .ux-list{display:grid;gap:10px;margin-top:14px}
    .ux-contact-group{border:1px solid #e4eaf0;border-radius:12px;background:#fff;padding:12px 13px}
    .ux-contact-head{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:4px}
    .ux-contact-count{font-size:10px;font-weight:800;color:#526b80;background:#f2f6f9;border-radius:999px;padding:4px 7px}
    .ux-row{display:grid;grid-template-columns:minmax(190px,.9fr) minmax(220px,1.3fr) minmax(150px,.8fr) auto;gap:12px;align-items:center;padding:10px 0;border-top:1px solid #edf1f5;background:#fff;transition:.14s ease}
    .ux-contact-group .ux-row:first-of-type{border-top:0}
    .ux-row:hover{background:#fbfdff}
    .ux-name{font-weight:800;color:#17283d}
    .ux-sub{font-size:12px;color:#718096;margin-top:2px}
    .ux-address{font-size:13px;color:#405267;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    .ux-actions{display:flex;gap:6px;justify-content:flex-end}
    .ux-editing{border:1px solid #9ec1d8;box-shadow:0 0 0 3px rgba(43,111,155,.08)}
    .ux-form-actions{display:flex;gap:8px;align-items:center}
    .ux-secondary{background:#f3f6f9;color:#45566b}
    .ux-template-body{font-size:13px;color:#536479;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    .ux-pill{display:inline-flex;padding:4px 8px;border-radius:999px;background:#eef5fa;color:#276589;font-size:11px;font-weight:800}
    .ux-empty{padding:24px;text-align:center;color:#8491a1;border:1px dashed #d7e0e8;border-radius:12px;background:#fbfcfd}
    #contacts .formgrid,#templates .formgrid{background:#f8fafc;border:1px solid #e5ebf1;border-radius:12px;padding:14px;margin-bottom:14px}
    @media(max-width:900px){
      .ux-head{flex-direction:column}
      .ux-search{width:100%}
      .ux-search input{min-width:0;width:100%}
      .ux-contact-head{align-items:flex-start}
      .ux-row{grid-template-columns:1fr}
      .ux-actions{justify-content:flex-start}
    }
  `;
  document.head.appendChild(css);

  function addSectionHeads(){
    const contactsPanel=document.querySelector('#contacts .card.panel');
    if(contactsPanel&&!contactsPanel.querySelector('.ux-head')){
      const heading=contactsPanel.querySelector('h3');
      if(heading){
        const wrap=document.createElement('div');
        wrap.className='ux-head';
        wrap.innerHTML='<div><h3>Kişiler & Adresler</h3><p>Kaydı bul, tek tıkla düzenle ve kaydet.</p></div><div class="ux-search"><input id="uxContactSearch" placeholder="İsim / telefon / şehir / adres ara"></div>';
        heading.replaceWith(wrap);
        wrap.querySelector('input').addEventListener('input',e=>{
          contactQuery=e.target.value.toLocaleLowerCase('tr-TR');
          renderContacts();
        });
      }
    }

    const templatesPanel=document.querySelector('#templates .card.panel');
    if(templatesPanel&&!templatesPanel.querySelector('.ux-head')){
      const heading=templatesPanel.querySelector('h3');
      if(heading){
        const wrap=document.createElement('div');
        wrap.className='ux-head';
        wrap.innerHTML='<div><h3>Yazı Şablonları</h3><p>Metni seç, düzenle ve baskıya anında yansıt.</p></div><div class="ux-search"><input id="uxTemplateSearch" placeholder="No / başlık / metin ara"></div>';
        heading.replaceWith(wrap);
        wrap.querySelector('input').addEventListener('input',e=>{
          templateQuery=e.target.value.toLocaleLowerCase('tr-TR');
          renderTemplates();
        });
      }
    }
  }

  function contactButton(){return document.querySelector('#contacts .full .btn.primary')}
  function templateButton(){return document.querySelector('#templates .full .btn.primary')}

  function ensureCancelButtons(){
    const contactSave=contactButton();
    if(contactSave&&!$('uxContactCancel')){
      const button=document.createElement('button');
      button.id='uxContactCancel';
      button.className='btn ux-secondary';
      button.textContent='Vazgeç';
      button.style.display='none';
      button.onclick=resetContact;
      contactSave.parentElement.classList.add('ux-form-actions');
      contactSave.parentElement.appendChild(button);
    }

    const templateSave=templateButton();
    if(templateSave&&!$('uxTemplateCancel')){
      const button=document.createElement('button');
      button.id='uxTemplateCancel';
      button.className='btn ux-secondary';
      button.textContent='Vazgeç';
      button.style.display='none';
      button.onclick=resetTemplate;
      templateSave.parentElement.classList.add('ux-form-actions');
      templateSave.parentElement.appendChild(button);
    }
  }

  function resetContact(){
    editContactId=null;
    ['cn','cp','cc','cd','cpost','ca'].forEach(id=>{if($(id))$(id).value=''});
    const save=contactButton();
    if(save)save.textContent='Kişi Kaydet';
    const cancel=$('uxContactCancel');
    if(cancel)cancel.style.display='none';
    document.querySelector('#contacts .formgrid')?.classList.remove('ux-editing');
  }

  function resetTemplate(){
    editTemplateId=null;
    ['tn','tt','tb'].forEach(id=>{if($(id))$(id).value=''});
    const save=templateButton();
    if(save)save.textContent='Şablon Kaydet';
    const cancel=$('uxTemplateCancel');
    if(cancel)cancel.style.display='none';
    document.querySelector('#templates .formgrid')?.classList.remove('ux-editing');
  }

  function groupContacts(rows){
    const groups=new Map();
    rows.forEach(x=>{
      const key=String(x.name||'').trim().toLocaleLowerCase('tr-TR').replace(/\s+/g,' ');
      if(!groups.has(key))groups.set(key,{name:x.name||'İsimsiz',rows:[]});
      groups.get(key).rows.push(x);
    });
    return [...groups.values()].sort((a,b)=>a.name.localeCompare(b.name,'tr'));
  }

  function renderContacts(){
    const list=$('contactList');
    if(!list)return;
    const rows=(window.contacts||contacts||[]).filter(x=>
      !contactQuery||[x.name,x.phone,x.city,x.district,x.address]
        .join(' ')
        .toLocaleLowerCase('tr-TR')
        .includes(contactQuery)
    );
    const groups=groupContacts(rows);

    list.className='ux-list';
    list.innerHTML=groups.length?groups.map(group=>`
      <section class="ux-contact-group">
        <div class="ux-contact-head">
          <div class="ux-name">${esc(group.name)}</div>
          ${group.rows.length>1?`<span class="ux-contact-count">${group.rows.length} kayıt</span>`:''}
        </div>
        ${group.rows.map(x=>`
          <div class="ux-row">
            <div><div class="ux-sub">${esc(x.phone||'Telefon yok')}</div></div>
            <div>
              <div class="ux-address" title="${esc(x.address||'')}">${esc(x.address||'Adres yok')}</div>
              <div class="ux-sub">${esc(x.city||'')}${x.district?' / '+esc(x.district):''}${x.postal_code?' · '+esc(x.postal_code):''}</div>
            </div>
            <div><span class="ux-pill">Adres #${x.id}</span></div>
            <div class="ux-actions"><button class="btn" onclick="uxEditContact(${x.id})">Düzenle</button></div>
          </div>
        `).join('')}
      </section>
    `).join(''):'<div class="ux-empty">Eşleşen kişi/adres bulunamadı.</div>';
  }

  window.uxEditContact=id=>{
    const x=(window.contacts||contacts||[]).find(v=>Number(v.id)===Number(id));
    if(!x)return;
    editContactId=id;
    $('cn').value=x.name||'';
    $('cp').value=x.phone||'';
    $('cc').value=x.city||'';
    $('cd').value=x.district||'';
    $('cpost').value=x.postal_code||'';
    $('ca').value=x.address||'';
    const save=contactButton();
    if(save)save.textContent='Değişiklikleri Kaydet';
    const cancel=$('uxContactCancel');
    if(cancel)cancel.style.display='';
    document.querySelector('#contacts .formgrid')?.classList.add('ux-editing');
    document.querySelector('#contacts .formgrid')?.scrollIntoView({behavior:'smooth',block:'start'});
  };

  window.loadContacts=async function(){
    window.contacts=contacts=await apiX('/api/contacts');
    const select=$('nc');
    if(select){
      select.innerHTML='<option value="">Yeni kişi / seçiniz</option>'+
        contacts.map(x=>`<option value="${x.id}">${esc(x.name)}${x.city?' · '+esc(x.city):''}</option>`).join('');
    }
    renderContacts();
  };

  window.saveContact=async function(){
    const body={
      name:$('cn').value.trim(),
      phone:$('cp').value.trim(),
      city:$('cc').value.trim(),
      district:$('cd').value.trim(),
      postal_code:$('cpost').value.trim(),
      address:$('ca').value.trim(),
    };
    if(!body.name)return notify('Ad Soyad gerekli');

    if(editContactId){
      await apiX('/api/contacts/'+editContactId,{method:'PATCH',body:JSON.stringify(body)});
    }else{
      await apiX('/api/contacts',{method:'POST',body:JSON.stringify(body)});
    }

    notify(editContactId?'Kişi/adres güncellendi':'Kişi/adres eklendi');
    resetContact();
    await window.loadContacts();
  };

  function renderTemplates(){
    const list=$('templateList');
    if(!list)return;
    const rows=(window.templates||templates||[]).filter(x=>
      !templateQuery||[x.template_no,x.title,x.body]
        .join(' ')
        .toLocaleLowerCase('tr-TR')
        .includes(templateQuery)
    );

    list.className='ux-list';
    list.innerHTML=rows.length?rows.map(x=>`
      <div class="ux-row">
        <div>
          <span class="ux-pill">Şablon ${esc(x.template_no)}</span>
          <div class="ux-name" style="margin-top:5px">${esc(x.title||'Başlıksız')}</div>
        </div>
        <div class="ux-template-body" title="${esc(x.body||'')}">${esc((x.body||'').replace(/\s+/g,' '))}</div>
        <div class="ux-sub">Son düzenleme: ${x.updated_at?new Date(x.updated_at).toLocaleDateString('tr-TR'):'—'}</div>
        <div class="ux-actions"><button class="btn" onclick="uxEditTemplate(${x.id})">Düzenle</button></div>
      </div>
    `).join(''):'<div class="ux-empty">Eşleşen yazı şablonu bulunamadı.</div>';
  }

  window.uxEditTemplate=id=>{
    const x=(window.templates||templates||[]).find(v=>Number(v.id)===Number(id));
    if(!x)return;
    editTemplateId=id;
    $('tn').value=x.template_no||'';
    $('tt').value=x.title||'';
    $('tb').value=x.body||'';
    const save=templateButton();
    if(save)save.textContent='Değişiklikleri Kaydet';
    const cancel=$('uxTemplateCancel');
    if(cancel)cancel.style.display='';
    document.querySelector('#templates .formgrid')?.classList.add('ux-editing');
    document.querySelector('#templates .formgrid')?.scrollIntoView({behavior:'smooth',block:'start'});
  };

  window.loadTemplates=async function(){
    window.templates=templates=await apiX('/api/templates');
    const select=$('nt');
    if(select){
      select.innerHTML='<option value="">Yok</option>'+
        templates.map(x=>`<option value="${esc(x.template_no)}">${esc(x.template_no)} - ${esc(x.title||'')}</option>`).join('');
    }
    renderTemplates();
  };

  window.saveTemplate=async function(){
    const body={
      template_no:$('tn').value.trim(),
      title:$('tt').value.trim(),
      body:$('tb').value,
    };
    if(!body.template_no||!body.body.trim())return notify('Şablon no ve metin gerekli');

    if(editTemplateId){
      await apiX('/api/templates/'+editTemplateId,{method:'PATCH',body:JSON.stringify(body)});
    }else{
      await apiX('/api/templates',{method:'POST',body:JSON.stringify(body)});
    }

    notify(editTemplateId?'Yazı şablonu güncellendi':'Yazı şablonu eklendi');
    resetTemplate();
    await window.loadTemplates();
  };

  addSectionHeads();
  ensureCancelButtons();
  if($('contactList'))renderContacts();
  if($('templateList'))renderTemplates();
})();
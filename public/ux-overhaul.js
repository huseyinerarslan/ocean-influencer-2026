(()=>{
  const $=id=>document.getElementById(id);
  const esc=s=>String(s??'').replace(/[&<>\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[c]));
  const apiX=async(url,opt={})=>{const h={...(opt.headers||{})};if(opt.body&&!(opt.body instanceof FormData))h['Content-Type']='application/json';const r=await fetch(url,{credentials:'same-origin',...opt,headers:h});const d=await r.json().catch(()=>({}));if(!r.ok)throw Error(d.error||'İşlem başarısız');return d};
  const notify=m=>{try{toast(m)}catch{console.log(m)}};
  let editContactId=null,editTemplateId=null,contactQuery='',templateQuery='';

  const css=document.createElement('style');
  css.textContent=`
  :root{--ux-navy:#10243a;--ux-blue:#1d628f;--ux-bg:#f4f7fa;--ux-line:#dfe7ef;--ux-muted:#718096;--ux-text:#172033}
  .ocean-brand-logo{width:176px!important;height:45px!important;object-fit:contain!important;object-position:left center!important;filter:brightness(0) invert(1)!important;overflow:visible!important}
  .ocean-login-logo{width:250px!important;height:64px!important;object-fit:contain!important;object-position:left center!important;margin-bottom:18px!important}
  .ocean-top-logo{display:none!important}.top .muted{font-size:12px!important;letter-spacing:.06em!important;text-transform:none!important;color:#758397!important}.top .muted:after{content:'Influencer Operasyon';font-size:12px!important}
  .side{width:228px!important}.app{grid-template-columns:228px 1fr!important}.brand{padding:4px 8px 18px!important;min-height:76px!important;display:flex!important;flex-direction:column!important;justify-content:center!important}.ocean-brand-sub{margin-top:6px!important}
  .side button{display:flex!important;align-items:center!important;gap:10px!important;min-height:42px!important;padding:9px 11px!important}.side button[data-v]::before,.side button[data-ops-manage]::before{display:inline-grid;place-items:center;width:20px;height:20px;border-radius:6px;background:rgba(255,255,255,.07);font-size:12px;color:#a9c8dd;flex:0 0 20px}.side button[data-v="dashboard"]::before{content:'⌂'}.side button[data-v="orders"]::before{content:'▤'}.side button[data-v="bulkPrint"]::before{content:'▣'}.side button[data-v="new"]::before{content:'+'}.side button[data-v="contacts"]::before{content:'◎'}.side button[data-v="products"]::before{content:'◇'}.side button[data-v="sets"]::before{content:'⬡'}.side button[data-v="templates"]::before{content:'≡'}.side button[data-ops-manage]::before{content:'⚙'}
  .main{max-width:none!important}.top{min-height:82px!important}.top h2{font-size:28px!important}.toolbar{gap:8px!important}.tablewrap{overflow:hidden!important}.table td,.table th{padding:12px 13px!important}
  .ux-head{display:flex;align-items:flex-start;justify-content:space-between;gap:14px;margin-bottom:14px}.ux-head h3{margin:0 0 3px!important}.ux-head p{margin:0;color:var(--ux-muted);font-size:13px}.ux-search{display:flex;gap:8px;align-items:center}.ux-search input{min-width:250px;border:1px solid #d4dee8;border-radius:9px;padding:9px 11px;background:#fff}.ux-list{display:grid;gap:8px;margin-top:14px}.ux-row{display:grid;grid-template-columns:minmax(190px,.9fr) minmax(220px,1.3fr) minmax(150px,.8fr) auto;gap:12px;align-items:center;padding:12px 13px;border:1px solid #e4eaf0;border-radius:11px;background:#fff;transition:.14s ease}.ux-row:hover{border-color:#b8cddd;box-shadow:0 5px 16px rgba(16,36,58,.055)}.ux-name{font-weight:800;color:#17283d}.ux-sub{font-size:12px;color:#718096;margin-top:2px}.ux-address{font-size:13px;color:#405267;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.ux-actions{display:flex;gap:6px;justify-content:flex-end}.ux-editing{border:1px solid #9ec1d8!important;box-shadow:0 0 0 3px rgba(43,111,155,.08)!important}.ux-form-actions{display:flex;gap:8px;align-items:center}.ux-secondary{background:#f3f6f9!important;color:#45566b!important}.ux-template-body{font-size:13px;color:#536479;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.ux-pill{display:inline-flex;padding:4px 8px;border-radius:999px;background:#eef5fa;color:#276589;font-size:11px;font-weight:800}.ux-empty{padding:24px;text-align:center;color:#8491a1;border:1px dashed #d7e0e8;border-radius:12px;background:#fbfcfd}
  #contacts .formgrid,#templates .formgrid{background:#f8fafc;border:1px solid #e5ebf1;border-radius:12px;padding:14px;margin-bottom:14px}
  #contacts .card.panel,#templates .card.panel{padding:18px!important}
  @media(max-width:900px){.app{grid-template-columns:1fr!important}.side{width:100%!important}.brand{display:none!important}.ux-head{flex-direction:column}.ux-search{width:100%}.ux-search input{min-width:0;width:100%}.ux-row{grid-template-columns:1fr}.ux-actions{justify-content:flex-start}.top .muted:after{content:'Influencer Operasyon'}.tablewrap{overflow:auto!important}}
  `;
  document.head.appendChild(css);

  function cleanBrand(){
    document.querySelectorAll('.ocean-brand-logo,.ocean-login-logo').forEach(img=>{if(img.dataset.uxLogo!=='10'){img.src='/ocean-logo.svg?v=10';img.removeAttribute('style');img.dataset.uxLogo='10'}});
    const topMuted=document.querySelector('.top .muted');if(topMuted&&!topMuted.dataset.ux){topMuted.innerHTML='';topMuted.dataset.ux='1'}
  }
  function addSectionHeads(){
    const c=document.querySelector('#contacts .card.panel');
    if(c&&!c.querySelector('.ux-head')){const h=c.querySelector('h3');if(h){const wrap=document.createElement('div');wrap.className='ux-head';wrap.innerHTML='<div><h3>Kişiler & Adresler</h3><p>Kaydı bul, tek tıkla düzenle ve kaydet.</p></div><div class="ux-search"><input id="uxContactSearch" placeholder="İsim / telefon / şehir / adres ara"></div>';h.replaceWith(wrap);wrap.querySelector('input').addEventListener('input',e=>{contactQuery=e.target.value.toLocaleLowerCase('tr-TR');renderContacts()})}}
    const t=document.querySelector('#templates .card.panel');
    if(t&&!t.querySelector('.ux-head')){const h=t.querySelector('h3');if(h){const wrap=document.createElement('div');wrap.className='ux-head';wrap.innerHTML='<div><h3>Yazı Şablonları</h3><p>Metni seç, düzenle ve baskıya anında yansıt.</p></div><div class="ux-search"><input id="uxTemplateSearch" placeholder="No / başlık / metin ara"></div>';h.replaceWith(wrap);wrap.querySelector('input').addEventListener('input',e=>{templateQuery=e.target.value.toLocaleLowerCase('tr-TR');renderTemplates()})}}
  }
  function contactButton(){return document.querySelector('#contacts .full .btn.primary')}
  function templateButton(){return document.querySelector('#templates .full .btn.primary')}
  function ensureCancelButtons(){
    const cb=contactButton();if(cb&&!document.getElementById('uxContactCancel')){const x=document.createElement('button');x.id='uxContactCancel';x.className='btn ux-secondary';x.textContent='Vazgeç';x.style.display='none';x.onclick=resetContact;cb.parentElement.classList.add('ux-form-actions');cb.parentElement.appendChild(x)}
    const tb=templateButton();if(tb&&!document.getElementById('uxTemplateCancel')){const x=document.createElement('button');x.id='uxTemplateCancel';x.className='btn ux-secondary';x.textContent='Vazgeç';x.style.display='none';x.onclick=resetTemplate;tb.parentElement.classList.add('ux-form-actions');tb.parentElement.appendChild(x)}
  }

  function resetContact(){editContactId=null;['cn','cp','cc','cd','cpost','ca'].forEach(id=>{if($(id))$(id).value=''});const b=contactButton();if(b)b.textContent='Kişi Kaydet';const c=$('uxContactCancel');if(c)c.style.display='none';document.querySelector('#contacts .formgrid')?.classList.remove('ux-editing')}
  function resetTemplate(){editTemplateId=null;['tn','tt','tb'].forEach(id=>{if($(id))$(id).value=''});const b=templateButton();if(b)b.textContent='Şablon Kaydet';const c=$('uxTemplateCancel');if(c)c.style.display='none';document.querySelector('#templates .formgrid')?.classList.remove('ux-editing')}

  function renderContacts(){
    const list=$('contactList');if(!list)return;
    const q=contactQuery;const rows=(window.contacts||contacts||[]).filter(x=>!q||[x.name,x.phone,x.city,x.district,x.address].join(' ').toLocaleLowerCase('tr-TR').includes(q));
    list.className='ux-list';list.innerHTML=rows.length?rows.map(x=>`<div class="ux-row"><div><div class="ux-name">${esc(x.name)}</div><div class="ux-sub">${esc(x.phone||'Telefon yok')}</div></div><div><div class="ux-address" title="${esc(x.address||'')}">${esc(x.address||'Adres yok')}</div><div class="ux-sub">${esc(x.city||'')}${x.district?' / '+esc(x.district):''}${x.postal_code?' · '+esc(x.postal_code):''}</div></div><div><span class="ux-pill">Adres #${x.id}</span></div><div class="ux-actions"><button class="btn" onclick="uxEditContact(${x.id})">Düzenle</button></div></div>`).join(''):'<div class="ux-empty">Eşleşen kişi/adres bulunamadı.</div>';
  }
  window.uxEditContact=id=>{const x=(window.contacts||contacts||[]).find(v=>Number(v.id)===Number(id));if(!x)return;editContactId=id;$('cn').value=x.name||'';$('cp').value=x.phone||'';$('cc').value=x.city||'';$('cd').value=x.district||'';$('cpost').value=x.postal_code||'';$('ca').value=x.address||'';const b=contactButton();if(b)b.textContent='Değişiklikleri Kaydet';const c=$('uxContactCancel');if(c)c.style.display='';document.querySelector('#contacts .formgrid')?.classList.add('ux-editing');document.querySelector('#contacts .formgrid')?.scrollIntoView({behavior:'smooth',block:'start'})};
  window.loadContacts=async function(){window.contacts=contacts=await apiX('/api/contacts');const nc=$('nc');if(nc)nc.innerHTML='<option value="">Yeni kişi / seçiniz</option>'+contacts.map(x=>`<option value="${x.id}">${esc(x.name)}${x.city?' · '+esc(x.city):''}</option>`).join('');renderContacts()};
  window.saveContact=async function(){const body={name:$('cn').value.trim(),phone:$('cp').value.trim(),city:$('cc').value.trim(),district:$('cd').value.trim(),postal_code:$('cpost').value.trim(),address:$('ca').value.trim()};if(!body.name)return notify('Ad Soyad gerekli');if(editContactId)await apiX('/api/contacts/'+editContactId,{method:'PATCH',body:JSON.stringify(body)});else await apiX('/api/contacts',{method:'POST',body:JSON.stringify(body)});notify(editContactId?'Kişi/adres güncellendi':'Kişi/adres eklendi');resetContact();await window.loadContacts()};

  function renderTemplates(){
    const list=$('templateList');if(!list)return;
    const q=templateQuery;const rows=(window.templates||templates||[]).filter(x=>!q||[x.template_no,x.title,x.body].join(' ').toLocaleLowerCase('tr-TR').includes(q));
    list.className='ux-list';list.innerHTML=rows.length?rows.map(x=>`<div class="ux-row"><div><span class="ux-pill">Şablon ${esc(x.template_no)}</span><div class="ux-name" style="margin-top:5px">${esc(x.title||'Başlıksız')}</div></div><div class="ux-template-body" title="${esc(x.body||'')}">${esc((x.body||'').replace(/\s+/g,' '))}</div><div class="ux-sub">Son düzenleme: ${x.updated_at?new Date(x.updated_at).toLocaleDateString('tr-TR'):'—'}</div><div class="ux-actions"><button class="btn" onclick="uxEditTemplate(${x.id})">Düzenle</button></div></div>`).join(''):'<div class="ux-empty">Eşleşen yazı şablonu bulunamadı.</div>';
  }
  window.uxEditTemplate=id=>{const x=(window.templates||templates||[]).find(v=>Number(v.id)===Number(id));if(!x)return;editTemplateId=id;$('tn').value=x.template_no||'';$('tt').value=x.title||'';$('tb').value=x.body||'';const b=templateButton();if(b)b.textContent='Değişiklikleri Kaydet';const c=$('uxTemplateCancel');if(c)c.style.display='';document.querySelector('#templates .formgrid')?.classList.add('ux-editing');document.querySelector('#templates .formgrid')?.scrollIntoView({behavior:'smooth',block:'start'})};
  window.loadTemplates=async function(){window.templates=templates=await apiX('/api/templates');const nt=$('nt');if(nt)nt.innerHTML='<option value="">Yok</option>'+templates.map(x=>`<option value="${esc(x.template_no)}">${esc(x.template_no)} - ${esc(x.title||'')}</option>`).join('');renderTemplates()};
  window.saveTemplate=async function(){const body={template_no:$('tn').value.trim(),title:$('tt').value.trim(),body:$('tb').value};if(!body.template_no||!body.body.trim())return notify('Şablon no ve metin gerekli');if(editTemplateId)await apiX('/api/templates/'+editTemplateId,{method:'PATCH',body:JSON.stringify(body)});else await apiX('/api/templates',{method:'POST',body:JSON.stringify(body)});notify(editTemplateId?'Yazı şablonu güncellendi':'Yazı şablonu eklendi');resetTemplate();await window.loadTemplates()};

  function polish(){cleanBrand();addSectionHeads();ensureCancelButtons()}
  polish();
  if($('contactList'))renderContacts();
  if($('templateList'))renderTemplates();
  new MutationObserver(()=>{cleanBrand();addSectionHeads();ensureCancelButtons()}).observe(document.body,{childList:true,subtree:true});
})();
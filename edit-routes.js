'use strict';

function installEditRoutes(app,pool,auth){
  app.patch('/api/contacts/:id',auth,async(req,res)=>{
    const x=req.body||{};
    const q=await pool.query(`UPDATE contacts SET
      name=COALESCE(NULLIF($1,''),name),
      phone=$2, city=$3, district=$4, postal_code=$5, address=$6,
      updated_at=NOW()
      WHERE id=$7 RETURNING *`,[
      String(x.name||'').trim(),x.phone||'',x.city||'',x.district||'',x.postal_code||'',x.address||'',req.params.id
    ]);
    if(!q.rowCount)return res.status(404).json({error:'Kişi bulunamadı'});
    res.json(q.rows[0]);
  });

  app.patch('/api/templates/:id',auth,async(req,res)=>{
    const x=req.body||{};
    const q=await pool.query(`UPDATE letter_templates SET
      template_no=COALESCE(NULLIF($1,''),template_no),
      title=$2, body=$3, updated_at=NOW()
      WHERE id=$4 RETURNING *`,[
      String(x.template_no||'').trim(),x.title||'',x.body||'',req.params.id
    ]);
    if(!q.rowCount)return res.status(404).json({error:'Şablon bulunamadı'});
    res.json(q.rows[0]);
  });

  app.get('/manage',(req,res)=>{
    res.type('html').send(`<!doctype html><html lang="tr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Veri Yönetimi</title><style>body{font-family:system-ui;background:#f4f7fb;color:#172033;margin:0;padding:24px}.wrap{max-width:1200px;margin:auto}.tabs{display:flex;gap:8px;margin-bottom:16px}.tabs button,.btn{border:0;border-radius:10px;padding:10px 14px;cursor:pointer}.tabs button.active,.btn.primary{background:#174f7a;color:white}.grid{display:grid;grid-template-columns:1fr 1fr;gap:18px}.card{background:#fff;border:1px solid #dfe6ef;border-radius:16px;padding:18px}.field{display:grid;gap:6px;margin:10px 0}input,textarea{font:inherit;border:1px solid #cad5e2;border-radius:9px;padding:10px}.list{max-height:65vh;overflow:auto}.row{padding:10px;border-bottom:1px solid #edf1f5;cursor:pointer}.row:hover{background:#f7fafc}.muted{color:#718096}.hidden{display:none}.search{width:100%;margin-bottom:10px}@media(max-width:850px){.grid{grid-template-columns:1fr}}</style></head><body><div class="wrap"><div style="display:flex;justify-content:space-between;align-items:center"><div><h1>Veri Yönetimi</h1><div class="muted">Influencer bilgileri ve yazı şablonlarını düzenle</div></div><a href="/">Uygulamaya dön</a></div><div class="tabs"><button id="tb1" class="active" onclick="showTab('contacts')">Influencer Bilgileri</button><button id="tb2" onclick="showTab('templates')">Yazı Şablonları</button></div><section id="contacts"><div class="grid"><div class="card"><input id="cq" class="search" placeholder="İsim, şehir, telefon ara" oninput="renderContacts()"><div id="cl" class="list"></div></div><div class="card"><h3>Kişi Düzenle</h3><input id="cid" type="hidden"><div class="field"><label>Ad Soyad</label><input id="cn"></div><div class="field"><label>Telefon</label><input id="cp"></div><div class="field"><label>İl</label><input id="cc"></div><div class="field"><label>İlçe</label><input id="cd"></div><div class="field"><label>Posta Kodu</label><input id="cpost"></div><div class="field"><label>Adres</label><textarea id="ca" rows="5"></textarea></div><button class="btn primary" onclick="saveContact()">Güncelle</button></div></div></section><section id="templates" class="hidden"><div class="grid"><div class="card"><input id="tq" class="search" placeholder="Şablon no / başlık ara" oninput="renderTemplates()"><div id="tl" class="list"></div></div><div class="card"><h3>Yazı Şablonu Düzenle</h3><input id="tid" type="hidden"><div class="field"><label>No</label><input id="tn"></div><div class="field"><label>Başlık</label><input id="tt"></div><div class="field"><label>Metin</label><textarea id="tb" rows="14"></textarea></div><button class="btn primary" onclick="saveTemplate()">Güncelle</button></div></div></section></div><script>let contacts=[],templates=[];const $=x=>document.getElementById(x);async function api(u,o={}){const r=await fetch(u,{headers:{'Content-Type':'application/json',...(o.headers||{})},...o});if(r.status===401){location.href='/';throw new Error('Giriş gerekli')}const d=await r.json();if(!r.ok)throw new Error(d.error||'Hata');return d}function showTab(x){$('contacts').classList.toggle('hidden',x!=='contacts');$('templates').classList.toggle('hidden',x!=='templates');$('tb1').classList.toggle('active',x==='contacts');$('tb2').classList.toggle('active',x==='templates')}function esc(s){return String(s||'').replace(/[&<>]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[m]))}async function load(){contacts=await api('/api/contacts');templates=await api('/api/templates');renderContacts();renderTemplates()}function renderContacts(){const q=$('cq').value.toLocaleLowerCase('tr-TR');$('cl').innerHTML=contacts.filter(x=>[x.name,x.phone,x.city,x.district].join(' ').toLocaleLowerCase('tr-TR').includes(q)).map(x=>`<div class="row" onclick="editContact(${x.id})"><b>${esc(x.name)}</b><div class="muted">${esc(x.phone)} · ${esc(x.city)}/${esc(x.district)}</div></div>`).join('')}function editContact(id){const x=contacts.find(a=>a.id===id);if(!x)return;$('cid').value=x.id;$('cn').value=x.name||'';$('cp').value=x.phone||'';$('cc').value=x.city||'';$('cd').value=x.district||'';$('cpost').value=x.postal_code||'';$('ca').value=x.address||''}async function saveContact(){const id=$('cid').value;if(!id)return alert('Önce bir kişi seç');const x=await api('/api/contacts/'+id,{method:'PATCH',body:JSON.stringify({name:$('cn').value,phone:$('cp').value,city:$('cc').value,district:$('cd').value,postal_code:$('cpost').value,address:$('ca').value})});const i=contacts.findIndex(a=>a.id===x.id);contacts[i]=x;renderContacts();alert('Kişi güncellendi')}function renderTemplates(){const q=$('tq').value.toLocaleLowerCase('tr-TR');$('tl').innerHTML=templates.filter(x=>[x.template_no,x.title].join(' ').toLocaleLowerCase('tr-TR').includes(q)).map(x=>`<div class="row" onclick="editTemplate(${x.id})"><b>${esc(x.template_no)} · ${esc(x.title)}</b><div class="muted">${esc((x.body||'').slice(0,90))}</div></div>`).join('')}function editTemplate(id){const x=templates.find(a=>a.id===id);if(!x)return;$('tid').value=x.id;$('tn').value=x.template_no||'';$('tt').value=x.title||'';$('tb').value=x.body||''}async function saveTemplate(){const id=$('tid').value;if(!id)return alert('Önce bir şablon seç');const x=await api('/api/templates/'+id,{method:'PATCH',body:JSON.stringify({template_no:$('tn').value,title:$('tt').value,body:$('tb').value})});const i=templates.findIndex(a=>a.id===x.id);templates[i]=x;renderTemplates();alert('Şablon güncellendi')}load();</script></body></html>`)
  });
}

module.exports={installEditRoutes};

(() => {
  'use strict';
  const el = id => document.getElementById(id);
  const esc = text => String(text ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  let activeId, version = 0, busy = false, timer;
  async function request(id, suffix = '', body) {
    const r = await fetch(`/api/orders/${id}/dhl${suffix}`, { credentials:'same-origin',
      ...(body ? {method:'POST', headers:{'Content-Type':'application/json'},body:JSON.stringify({...body,sandbox:true})} : {}) });
    const d = await r.json();
    if (!r.ok) throw Error(d.error || 'DHL test işlemi tamamlanamadı.');
    return d;
  }
  const css = document.createElement('link');
  css.rel='stylesheet';
  css.href='/order-dispatch.css?v=1';
  document.head.append(css);
  const packageIcon='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="m12 3 9 5v9l-9 5-9-5V8l9-5Z"/><path d="m3 8 9 5 9-5M12 13v9M7.5 5.5l9 5v4"/></svg>';
  function heading(){
    return '<div class="dispatch-head"><div class="dispatch-title"><span class="dispatch-icon">'+packageIcon+'</span><div><h4>Kargo & paketler</h4><span class="dispatch-carrier">DHL eCommerce</span></div></div><span class="dispatch-test">Test ortamı</span></div>';
  }
  function panel() {
    let box=el('dhlSandboxPanel');
    if(!box){box=document.createElement('section');box.id='dhlSandboxPanel';document.querySelector('#orderDetailModal .ops-modal')?.append(box);}
    return box;
  }
  function addPackage(kg=2,desi=2) {
    const row=document.createElement('div');row.className='dhl-pack';
    row.innerHTML=`<b>Paket ${el('dhlPackages').children.length+1}</b><label>Kg<input type="number" min="0.001" max="1000" step="0.001" required value="${esc(kg)}" data-kg readonly></label><label>Desi<input type="number" min="0.001" max="1000" step="0.001" required value="${esc(desi)}" data-desi readonly></label>`;
    el('dhlPackages').append(row);
  }
  function render(data) {
    clearInterval(timer);
    const box=panel();
    if(data.preparing){
      box.innerHTML=heading()+'<div class="dispatch-processing" role="status"><span class="dispatch-spinner"></span><div><b>Etiket hazırlanıyor</b><p>Adres kontrolü ve barkod hazırlığı arka planda sürüyor.</p></div></div>';
      timer=setTimeout(()=>{if(box.offsetWidth)refresh();},5000);
      return;
    }
    const frozen=!!data.packages;
    const pending=['CREATING','UNKNOWN','LABEL_CREATING','LABEL_UNKNOWN'].includes(data.state);
    const initial=['NEW','REJECTED'].includes(data.state);
    box.innerHTML=heading()+`
      <div id="dhlError" role="alert"></div>
      <div class="dispatch-destination"><span>Teslimat adresi</span><div id="dhlSnapshot"></div></div>
      <div id="dhlStatus" role="status" aria-live="polite"></div>
      ${initial?'<div class="dispatch-empty"><b>Gönderiye hazırla</b><p>Alıcı bilgilerini kaydettikten sonra etiketi hazırlayabilirsin.</p><button id="dhlPrepare" class="btn primary">Etiketi hazırlamaya başla</button></div>':''}
      ${['PREPARED','WAITING'].includes(data.state)?`<form id="dhlLabelForm"><div id="dhlPackages"></div><div class="ops-actions">${!frozen?'<button type="button" class="btn" id="dhlAddPackage">Paket ekle</button><button type="button" class="btn" id="dhlRemovePackage">Son paketi kaldır</button>':''}<button class="btn primary" id="dhlCreate" type="submit">Etiketi oluştur</button></div></form>`:''}
      <div class="dispatch-packages" id="dhlPackageCards">
      ${data.state==='READY'?`<article class="dispatch-package"><div class="dispatch-package-head"><span class="dispatch-icon">${packageIcon}</span><span class="dispatch-ready">Baskıya hazır</span></div><h5>${data.packages?.length>1?'Paketler 1–'+data.packages.length:'1. Paket'}</h5><div class="dispatch-tracking"><span>Takip numarası</span><strong>${esc(data.shipmentId)}</strong></div><button id="dhlPreview" class="btn primary">Etiketi yazdır <span aria-hidden="true">↗</span></button></article>`:''}
      </div>
      <div class="dispatch-footer"><details><summary>Gönderi ayrıntıları</summary><dl><dt>Test referansı</dt><dd>${esc(data.reference||'Henüz oluşturulmadı')}</dd><dt>Varsayılan paket</dt><dd>2 kg · 2 desi</dd></dl><p>Test etiketi gerçek gönderilerde kullanılamaz. SMS kapalıdır.</p>${data.state==='READY'?'<button id="dhlDownload" class="btn">ZPL dosyasını indir</button>':''}</details><button id="dhlRefresh" class="dispatch-refresh">Durumu yenile</button></div>`;
    const messages={NEW:'Test kaydı henüz oluşturulmadı.',REJECTED:'DHL adres isteğini reddetti. Bilgileri düzeltip kaydettikten sonra tekrar deneyin.',
      PREPARED:'Adres DHL test sistemine gönderildi. Varış şubesi için kısa bir süre beklenir.',
      WAITING:'Gönderi barkodu henüz alınamadı. DHL varış şubesini belirleyememiş olabilir. Bir süre sonra aynı kayıtla tekrar deneyin. Devam ederse referans numarasıyla DHL’ye başvurun.',
      READY:''};
    el('dhlStatus').textContent=data.state==='READY'?'':(messages[data.state] || 'Gönderi durumu kontrol edilmeli. Ayrıntılardaki referans numarasıyla DHL’ye başvurabilirsiniz.');
    if(data.recipient){
      const r=data.recipient;
      el('dhlSnapshot').innerHTML='<b>'+esc(r.fullName)+'</b><p>'+esc([r.address,r.districtName,r.cityName].filter(Boolean).join(' · '))+'</p>';
    }else{
      el('dhlSnapshot').textContent='Siparişteki alıcı adresi kullanılacak.';
    }
    el('dhlRefresh').onclick=()=>refresh();
    if(initial) {
      el('dhlPrepare').disabled=!data.configured;
      el('dhlPrepare').onclick=()=>run('/prepare',{});
    }
    if(data.autoError && data.state!=='READY') el('dhlError').textContent=data.autoError;
    if(!data.configured) el('dhlError').textContent='Sunucudaki DHL test bağlantısı yapılandırılmamış.';
    if(el('dhlPackages')) {
      (data.packages || data.plannedPackages || [{kg:2,desi:2}]).forEach(p=>addPackage(p.kg,p.desi));
      if(frozen) el('dhlPackages').querySelectorAll('input').forEach(x=>x.disabled=true);
      if(el('dhlAddPackage')) el('dhlAddPackage').onclick=()=>{if(el('dhlPackages').children.length<20)addPackage();};
      if(el('dhlRemovePackage')) el('dhlRemovePackage').onclick=()=>{if(el('dhlPackages').children.length>1)el('dhlPackages').lastElementChild.remove();};
      el('dhlLabelForm').onsubmit=e=>{e.preventDefault();run('/create',{packages:[...el('dhlPackages').children].map(row=>({kg:Number(row.querySelector('[data-kg]').value),desi:Number(row.querySelector('[data-desi]').value)}))});};
      let remaining=data.retryAfter;
      const tick=()=>{const b=el('dhlCreate');if(!b)return clearInterval(timer);b.disabled=busy||remaining>0||!data.configured;b.textContent=remaining>0?`Adres işleniyor · ${remaining} sn`:'Etiketi oluştur';remaining--;};
      tick();if(remaining>=0)timer=setInterval(tick,1000);
    }
    if(el('dhlPreview')) {
      const openLabel=group=>window.printDhlLabels([activeId],group);
      el('dhlPreview').onclick=()=>openLabel(1);
      const extras=data.extras || [];
      for(const pack of extras){
        const line=document.createElement('article');
        line.className='dispatch-package';
        line.innerHTML='<div class="dispatch-package-head"><span class="dispatch-icon">'+packageIcon+'</span><span class="'+(pack.state==='READY'?'dispatch-ready':'dispatch-wait')+'">'+(pack.state==='READY'?'Baskıya hazır':pack.error?'Kontrol gerekli':'Hazırlanıyor')+'</span></div><h5>'+pack.group_no+'. Paket</h5>';
        el('dhlPackageCards').append(line);
        if(pack.state==='READY'){
          const print=document.createElement('button');
          print.className='btn primary';
          print.textContent='Etiketi yazdır ↗';
          print.onclick=()=>openLabel(pack.group_no);
          line.append(print);
        }else{
          const message=document.createElement('p');message.textContent=pack.error || 'Barkod arka planda hazırlanıyor.';line.append(message);
        }
      }
      const next=Math.max(data.packages?.length || 1,...extras.map(x=>x.group_no))+1;
      if(next<=3 && extras.every(x=>x.state==='READY')){
        const add=document.createElement('button');
        add.className='dispatch-add';
        add.innerHTML='<span aria-hidden="true">+</span><b>'+next+'. paketi ekle</b><small>Ek koli için ayrı etiket</small>';
        add.onclick=()=>run('/extra',{group:next});
        el('dhlPackageCards').append(add);
      }
      if(extras.some(x=>x.state!=='READY' && !x.error)){
        timer=setTimeout(()=>{if(!busy && box.offsetWidth)refresh();},5000);
      }
    }
    if(el('dhlDownload')) el('dhlDownload').onclick=async()=>{
      try {
        const r=await fetch(`/api/orders/${activeId}/dhl/label`);
        if(!r.ok)throw Error('Etiket indirilemedi. Oturumu ve yetkinizi kontrol edin.');
        const url=URL.createObjectURL(await r.blob());const a=document.createElement('a');a.href=url;a.download=`DHL-TEST-${data.reference}.zpl`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
      }catch(e){el('dhlError').textContent=e.message;}
    };
  }
  async function refresh() {
    const id=activeId, v=version;
    try {const data=await request(id);if(id===activeId&&v===version)render(data);}
    catch(e){if(v===version){panel().innerHTML='<h4>DHL · TEST ORTAMI</h4><p role="alert"></p>';panel().querySelector('p').textContent=e.message;}}
  }
  async function run(suffix,body) {
    if(busy)return;busy=true;const id=activeId,v=version;
    panel().querySelectorAll('button').forEach(b=>b.disabled=true);el('dhlError').textContent='';
    el('dhlStatus').textContent='DHL test sistemi yanıtı bekleniyor…';
    let error;
    try {await request(id,suffix,body);}catch(e){error=e.message;}
    finally {busy=false;if(id===activeId&&v===version){await refresh();if(error&&el('dhlError'))el('dhlError').textContent=error;}}
  }
  const open=window.openOrderDetail;
  window.openOrderDetail=async function(id){
    version++;activeId=id;const v=version;clearInterval(timer);
    if(el('dhlSandboxPanel'))el('dhlSandboxPanel').remove();
    await open.apply(this,arguments);
    if(v===version)await refresh();
  };
})();

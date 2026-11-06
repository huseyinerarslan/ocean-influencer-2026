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
  const css = document.createElement('style');
  css.textContent = '#dhlSandboxPanel{border:1px solid #e6c84c;background:#fffcf0;border-radius:12px;padding:16px;margin-top:18px;overflow-wrap:anywhere}#dhlSandboxPanel h4{margin:0 0 8px}#dhlSandboxPanel p{font-size:13px;line-height:1.5}.dhl-pack{display:flex;gap:12px;align-items:end;margin:10px 0;flex-wrap:wrap}.dhl-pack label{display:grid;gap:4px;font-size:13px}.dhl-pack input{width:110px;max-width:100%;padding:8px}#dhlStatus{white-space:pre-line;padding:10px 0}#dhlError{color:#9f1239;white-space:pre-line}#dhlSandboxPanel button:disabled{opacity:.5;cursor:wait}';
  document.head.append(css);
  function panel() {
    let box=el('dhlSandboxPanel');
    if(!box){box=document.createElement('section');box.id='dhlSandboxPanel';document.querySelector('#orderDetailModal .ops-modal')?.append(box);}
    return box;
  }
  function addPackage(kg='',desi=2) {
    const row=document.createElement('div');row.className='dhl-pack';
    row.innerHTML=`<b>Paket ${el('dhlPackages').children.length+1}</b><label>Kg<input type="number" min="0.001" max="1000" step="0.001" required value="${esc(kg)}" data-kg></label><label>Desi<input type="number" min="0.001" max="1000" step="0.001" required value="${esc(desi)}" data-desi readonly></label>`;
    el('dhlPackages').append(row);
  }
  function render(data) {
    clearInterval(timer);
    const box=panel();
    if(data.preparing){
      box.innerHTML='<h4>DHL · TEST ORTAMI</h4><p role="status">Test barkodu arka planda hazırlanıyor. Bu pencereyi kapatabilirsiniz.</p>';
      timer=setTimeout(()=>{if(box.offsetWidth)refresh();},5000);
      return;
    }
    const frozen=!!data.packages;
    const pending=['CREATING','UNKNOWN','LABEL_CREATING','LABEL_UNKNOWN'].includes(data.state);
    const initial=['NEW','REJECTED'].includes(data.state);
    box.innerHTML=`<h4>DHL · TEST ORTAMI</h4>
      <p>Bu bölüm yalnızca DHL test sisteminde çalışır. Gerçek kargo çıkışı yapılmaz, siparişin durumu değişmez. Telefon/e-posta yerine test bilgileri kullanılır; SMS kapalıdır.</p>
      <div id="dhlStatus" role="status" aria-live="polite"></div>
      <div id="dhlError" role="alert"></div>
      <div id="dhlSnapshot"></div>
      ${initial?'<p>Önce yukarıdaki alıcı, il, ilçe ve açık adresi kontrol edip <b>Sipariş Bilgilerini Kaydet</b> düğmesine basın. Kayıtlı ad ve adres DHL test sistemine gönderilecektir.</p><button id="dhlPrepare" class="btn primary">1. Adresi DHL teste gönder</button>':''}
      ${['PREPARED','WAITING'].includes(data.state)?`<p>Paket hazır olduğunda her kolinin kg ve desi bilgisini girin.</p><form id="dhlLabelForm"><div id="dhlPackages"></div><div class="ops-actions">${!frozen?'<button type="button" class="btn" id="dhlAddPackage">Paket ekle</button><button type="button" class="btn" id="dhlRemovePackage">Son paketi kaldır</button>':''}<button class="btn primary" id="dhlCreate" type="submit">2. Test barkodu oluştur</button></div></form>`:''}
      ${data.state==='READY'?'<button id="dhlPreview" class="btn primary">Etiketi görüntüle / Yazdır</button> <button id="dhlDownload" class="btn">ZPL indir (teknik)</button><p>Etiketi görüntüleyip normal yazdırma ekranından yazıcınızı seçebilirsiniz. Bu test etiketini gerçek kargoda kullanmayın.</p>':''}
      <button id="dhlRefresh" class="btn" style="margin-top:10px">Durumu yenile</button>`;
    const messages={NEW:'Test kaydı henüz oluşturulmadı.',REJECTED:'DHL adres isteğini reddetti. Bilgileri düzeltip kaydettikten sonra tekrar deneyin.',
      PREPARED:'Adres DHL test sistemine gönderildi. Varış şubesi için kısa bir süre beklenir.',
      WAITING:'Gönderi barkodu henüz alınamadı. DHL varış şubesini belirleyememiş olabilir. Bir süre sonra aynı kayıtla tekrar deneyin. Devam ederse referans numarasıyla DHL’ye başvurun.',
      READY:'Test gönderi barkodu hazır. Test gönderi numarası: '+data.shipmentId};
    el('dhlStatus').textContent=(messages[data.state] || 'Önceki isteğin sonucu belirsiz veya işlem sürüyor. Durumu yenileyin. Değişmiyorsa bu referansla DHL’ye başvurun; mükerrer gönderi oluşturmamak için yeni istek durduruldu.')+(data.reference?'\nTest referansı: '+data.reference:'');
    if(data.recipient) el('dhlSnapshot').textContent='DHL’ye gönderilen adres: '+[data.recipient.fullName,data.recipient.address,data.recipient.districtName,data.recipient.cityName].join(' · ');
    el('dhlRefresh').onclick=()=>refresh();
    if(initial) {
      el('dhlPrepare').disabled=!data.configured;
      el('dhlPrepare').onclick=()=>run('/prepare',{});
    }
    if(data.autoError && data.state!=='READY') el('dhlError').textContent=data.autoError;
    if(!data.configured) el('dhlError').textContent='Sunucudaki DHL test bağlantısı yapılandırılmamış.';
    if(el('dhlPackages')) {
      (data.packages || data.plannedPackages || [{kg:'',desi:2}]).forEach(p=>addPackage(p.kg,p.desi));
      if(frozen) el('dhlPackages').querySelectorAll('input').forEach(x=>x.disabled=true);
      if(el('dhlAddPackage')) el('dhlAddPackage').onclick=()=>{if(el('dhlPackages').children.length<20)addPackage();};
      if(el('dhlRemovePackage')) el('dhlRemovePackage').onclick=()=>{if(el('dhlPackages').children.length>1)el('dhlPackages').lastElementChild.remove();};
      el('dhlLabelForm').onsubmit=e=>{e.preventDefault();run('/create',{packages:[...el('dhlPackages').children].map(row=>({kg:Number(row.querySelector('[data-kg]').value),desi:Number(row.querySelector('[data-desi]').value)}))});};
      let remaining=data.retryAfter;
      const tick=()=>{const b=el('dhlCreate');if(!b)return clearInterval(timer);b.disabled=busy||remaining>0||!data.configured;b.textContent=remaining>0?`Adres işleniyor · ${remaining} sn`:'2. Test barkodu oluştur';remaining--;};
      tick();if(remaining>=0)timer=setInterval(tick,1000);
    }
    if(el('dhlPreview')) el('dhlPreview').onclick=()=>window.open('/dhl-label.html?order='+encodeURIComponent(activeId), '_blank', 'noopener');
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

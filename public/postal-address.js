(()=>{
'use strict';
const el=id=>document.getElementById(id);
function attach(cityId,districtId,addressId,postalId){
 const city=el(cityId),district=el(districtId),address=el(addressId),postal=el(postalId);if(!postal)return;
 postal.maxLength=5;postal.inputMode='numeric';postal.required=true;
 const help=document.createElement('div');help.className='postal-help';help.innerHTML='<span role="status" aria-live="polite"></span> <a href="https://www.ptt.gov.tr/posta-kodu" target="_blank" rel="noopener">PTT’den kontrol et ↗</a>';postal.after(help);
 const status=help.querySelector('span');let version=0,timer;
 async function lookup(){
  const v=++version;if(postal.value.trim())return;
  if(!city.value.trim()||!district.value.trim()||address.value.trim().length<8){status.textContent='İl, ilçe ve açık adresi tamamla. İl bilgisi tek başına yeterli değil.';return;}
  const key=[city.value,district.value,address.value].join('|');status.textContent='Kayıtlı tam adres kontrol ediliyor…';
  try{const params=new URLSearchParams({city:city.value.trim(),district:district.value.trim(),address:address.value.trim()});const response=await fetch('/api/address/postal-code?'+params,{credentials:'same-origin'});const data=await response.json();if(!response.ok)throw Error(data.error||'Adres sorgulanamadı.');
   if(v!==version||postal.value.trim()||key!==[city.value,district.value,address.value].join('|'))return;
   if(data.postalCode){postal.value=data.postalCode;status.textContent='Aynı tam adresin kayıtlı kodu getirildi. PTT doğrulaması değildir.';}
   else status.textContent=data.reason==='conflict'?'Bu adres için farklı kodlar kayıtlı. Doğru kodu kontrol edip gir.':'Eşleşen kayıtlı kod yok. Mahallenin posta kodunu tamamla.';
  }catch(e){if(v===version)status.textContent=e.message}
 }
 [city,district,address].forEach(input=>input.addEventListener('input',()=>{version++;clearTimeout(timer);if(postal.value){postal.value='';status.textContent='Adres değişti. Posta kodu yeniden kontrol edilmeli.';}timer=setTimeout(lookup,600)}));
 postal.addEventListener('input',()=>{if(postalId==='npost'&&/posta kodu/i.test(el('orderError').textContent))el('orderError').textContent='';version++;clearTimeout(timer);status.textContent=postal.value?'Kod elle girildi; ilçe ve mahalleyle uyuştuğunu kontrol et.':'';});
 const adopt=()=>{version++;clearTimeout(timer);status.textContent=postal.value?'Kayıtlı posta kodu. Adres değişirse yeniden kontrol edilir.':'';if(!postal.value)lookup()};
 status.textContent='Tam adresle eşleşen kayıt varsa otomatik getirilir.';
 return {adopt};
}
const bindings={new:attach('ncity','nd','na','npost'),contact:attach('cc','cd','ca','cpost'),detail:attach('odCity','odDistrict','odAddress','odPost')};
window.addEventListener('postal-selected',e=>bindings[e.detail]?.adopt());
const edit=window.uxEditContact;window.uxEditContact=id=>{edit(id);bindings.contact.adopt()};
const open=window.openOrderDetail;window.openOrderDetail=async id=>{await open(id);bindings.detail.adopt()};
for(const key of ['saveContact','saveOrderDetail']){const original=window[key];window[key]=async()=>{try{await original()}catch(e){toast(e.message);const id=key==='saveContact'?'cpost':'odPost';el(id).parentElement.querySelector('[role="status"]').textContent=e.message;el(id).focus()}};}
})();

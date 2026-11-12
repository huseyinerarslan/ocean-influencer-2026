'use strict';
const names=['Adana','Adıyaman','Afyonkarahisar','Ağrı','Amasya','Ankara','Antalya','Artvin','Aydın','Balıkesir','Bilecik','Bingöl','Bitlis','Bolu','Burdur','Bursa','Çanakkale','Çankırı','Çorum','Denizli','Diyarbakır','Edirne','Elazığ','Erzincan','Erzurum','Eskişehir','Gaziantep','Giresun','Gümüşhane','Hakkari','Hatay','Isparta','Mersin','İstanbul','İzmir','Kars','Kastamonu','Kayseri','Kırklareli','Kırşehir','Kocaeli','Konya','Kütahya','Malatya','Manisa','Kahramanmaraş','Mardin','Muğla','Muş','Nevşehir','Niğde','Ordu','Rize','Sakarya','Samsun','Siirt','Sinop','Sivas','Tekirdağ','Tokat','Trabzon','Tunceli','Şanlıurfa','Uşak','Van','Yozgat','Zonguldak','Aksaray','Bayburt','Karaman','Kırıkkale','Batman','Şırnak','Bartın','Ardahan','Iğdır','Yalova','Karabük','Kilis','Osmaniye','Düzce'];
const norm=v=>String(v||'').trim().toLocaleLowerCase('tr-TR').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/ı/g,'i').replace(/\s+/g,' ');
function postalError(data){
 const code=String(data.postal_code||'').trim();
 if(!/^[0-9]{5}$/.test(code)||code==='00000')return 'SAP teslimat adresi için 5 haneli posta kodunu tamamlayın.';
 const index=names.findIndex(n=>norm(n)===norm(data.city));
 if(index>=0&&code.slice(0,2)!==String(index+1).padStart(2,'0'))return 'Posta kodu seçilen il ile uyuşmuyor. İl, ilçe ve mahalleye ait kodu kontrol edin.';
 return null;
}
function checkPostal(data){const error=postalError(data);if(error)throw Object.assign(new Error(error),{status:400});}
function install(app,pool,auth){
 app.get('/api/address/postal-code',auth,async(req,res)=>{
  const city=String(req.query.city||'').trim(),district=String(req.query.district||'').trim(),address=String(req.query.address||'').trim();
  res.set('Cache-Control','no-store');
  if(!city||!district||address.length<8)return res.json({postalCode:null,reason:'incomplete'});
  // Never guess from province or district alone. Require the exact complete delivery address.
  try{
   const {rows}=await pool.query(`SELECT DISTINCT btrim(postal_code) AS postal_code FROM (
    SELECT city,district,address,postal_code FROM contacts UNION ALL SELECT city,district,address,postal_code FROM orders
   ) a WHERE lower(btrim(city))=lower($1) AND lower(btrim(district))=lower($2)
    AND lower(regexp_replace(btrim(address),'\\s+',' ','g'))=lower(regexp_replace(btrim($3),'\\s+',' ','g'))
    AND btrim(postal_code) ~ '^[0-9]{5}$' LIMIT 3`,[city,district,address]);
   const codes=rows.map(r=>r.postal_code).filter(code=>!postalError({city,postal_code:code}));
   res.json(codes.length===1?{postalCode:codes[0],source:'saved_address',verified:false}:{postalCode:null,reason:codes.length>1?'conflict':'not_found'});
  }catch{res.status(503).json({error:'Kayıtlı adres sorgulanamadı. Posta kodunu elle girebilirsin.'})}
 });
}
module.exports={postalError,checkPostal,install};

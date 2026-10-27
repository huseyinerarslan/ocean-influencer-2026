'use strict';
const multer=require('multer');
const XLSX=require('xlsx');
const upload=multer({storage:multer.memoryStorage(),limits:{fileSize:15*1024*1024}});

const DEFAULT_TEMPLATES=[
{"template_no":"1","title":"Yazı İçeriği 1","body":"Sevgili {{AD}},\nOcean Home Textile ürünlerini keyifle kullanmanı dileriz.\n\nSevgilerimizle,"},
{"template_no":"2","title":"Yazı İçeriği 2","body":"Sevgili {{AD}}, \n\nSeni Ocean Home Textile ailesinin yeni koleksiyon ürünleri ile tanıştırmak istiyoruz. Fonksiyonel detayları ve zamansız tasarımlarıyla günlük yaşamına düzen ve pratiklik katmasını dileriz.\n\nÜrünlerimizi keyifle kullanmanı dileriz.\n\nSevgilerimizle,"},
{"template_no":"9","title":"Yazı İçeriği 9","body":"Sevgili {{AD}}, \n\nSeni Ocean Home Textile ailesinin yeni koleksiyon ürünü ile tanıştırmak istiyoruz.\n\nDolabında daha düzenli ve ferah bir alan yaratmak için tasarlanan 3 kademeli ayarlanabilir ayakkabı düzenleyici, farklı yükseklikteki ayakkabılar için pratik ve şık bir çözüm sunar.\nŞeffaf ve modern tasarımı sayesinde dolabında sade, zarif ve estetik bir görünüm oluştururken alanı daha verimli kullanmana yardımcı olur.\n\nUmarız günlük yaşamına küçük ama keyifli bir düzen dokunuşu katar.\n\nSevgilerimizle,"},
{"template_no":"10","title":"Yazı İçeriği 10","body":"Sevgili {{AD}}, \n\nOcean Home Textile ürünleri ile ilgili paylaşımın için çok teşekkür ederiz.\nÜrünlerimizi deneyimleyip takipçilerinle buluşturman bizim için çok kıymetli. Denemek istediğin farklı bir ürün olursa, sana göndermekten her zaman memnuniyet duyarız.\n\nOcean Home Textile ürünlerini keyifle kullanmanı dileriz.\n\nSevgilerimizle,"},
{"template_no":"11","title":"Yazı İçeriği 11","body":"Sevgili {{AD}}, \n\nŞeffaf ayakkabı düzenleyicilerimizi beğenerek kullanmana çok sevindik.\nGüzel geri bildirimin ve desteğin için teşekkür ederiz.\nOcean Home Textile ürünlerini keyifle kullanmanı dileriz.\n\nSevgilerimizle,"},
{"template_no":"12","title":"Yazı İçeriği 12","body":"Sevgili {{AD}}, \n\nBaharın gelişiyle evler tazeleniyor…\nKışlıkları kaldırmanın en keyifli zamanı geldi.\n\nSenin için özenle seçtiğimiz ürünlerin yaşam alanına düzen, ferahlık ve keyif katmasını dileriz💙\n\nSevgilerimizle,"},
{"template_no":"13","title":"Yazı İçeriği 13","body":"Sevgili {{AD}}, \n\nMarkamıza bu kadar içten yaklaşmanız ve ürünlerimizi böylesine zarif bir dille anlatmanız bizi gerçekten çok mutlu etti. Emeğiniz, özeniniz ve samimiyetiniz için gönülden teşekkür ederiz 💛\nBu yıl 21. yaşını kutlayan, üretimini Karadeniz Ereğli’de sürdüren ve ekibinin yaklaşık %85’i kadınlardan oluşan bir marka olarak; bu teşekkür sadece bizden değil, her bir ürüne emeğini katan tüm ekip arkadaşlarımızdan geliyor.\nSizin için hazırladığımız bu paketi, bu güzel iş birliğimizi hatırlatan keyifli bir anı olarak kabul etmenizi çok isteriz 🤍\n\nSevgilerimizle"},
{"template_no":"14","title":"Yazı İçeriği 14","body":"Sevgili {{AD}}, \n\nSeni Ocean Home Textile ailesinin yeni koleksiyon ürünleri ile tanıştırmak istiyoruz.\n\nOcean Home Textile ürünlerini keyifle kullanmanı dileriz.\n\nSevgilerimizle,"},
{"template_no":"15","title":"Yazı İçeriği 15","body":"Sevgili {{AD}},\n\nSeni Ocean Home Textile ailesinin yaz koleksiyon ürünü ile tanıştırmak istiyoruz. \nÖzel termal astarı ve su itici kumaşı ile makyaj ve tüm bakım ürünlerini güneşin sıcak etkisinden korumaya yardımcı olacak makyaj çantalarının günlük yaşantına kolaylık katmasını dileriz.\n\nOcean Home Textile ürünlerini keyifle kullanman dileğiyle.\n\nSevgilerimizle,"},
{"template_no":"16","title":"Yazı İçeriği 16","body":"Sevgili {{AD}}, \n\nPamuklu dokusu ve yumuşak elyaf dolgulu yapısıyla farklı kullanım alanlarına zarifçe uyum sağlayan yatak örtüsü, OEKO-TEX®️ STANDARD 100 kriterleri doğrultusunda, 1000’den fazla zararlı maddeye karşı test edilmiştir.\n\nOcean Home Textile ürünlerini keyifle kullanman dileğiyle.\n\nSevgilerimizle,"},
{"template_no":"17","title":"Yazı İçeriği 17","body":"{{AD}}, \n\nEvinin keyifle tadını çıkardığın bir yaş olsun!\nSeni Seviyorum\nEce"},
{"template_no":"18","title":"Yazı İçeriği 18","body":"Sevgili {{AD}}, \n\nPvc kaplama kumaş ile tasarlanan ıslak kuru çantalarımızın yeni ve daha geniş ölçüsünü ilk deneyenlerden olmanı istedik.\nSeyahatlerinde, plajda, sporda ve günlük kullanımında sana eşlik etmesini dileriz.\n\nKeyifle kullanman dileğiyle 🤍\n\nSevgilerimizle,"},
{"template_no":"19","title":"Yazı İçeriği 19","body":"Sevgili {{AD}}, \n\nSeni Ocean Home Textile ailesinin yeni ürünüyle tanıştırmak istiyoruz. 🤍\nDoğallığı, konforu ve yumuşacık dokusuyla hazırladığımız nakışlı örtümüzü ilk deneyimleyenlerden biri olmanı istedik.\n\nKeyifle kullanmanı dileriz.\n\nSevgilerimizle,"},
{"template_no":"20","title":"Yazı İçeriği 20","body":"Sevgili {{AD}}, \n\nSeni Ocean Home Textile ailesinin yeni ürünüyle tanıştırmak istiyoruz. 🤍\nDoğallığı, konforu ve yumuşacık dokusuyla hazırladığımız nakışlı örtümüzü seninle paylaşmaktan mutluluk duyuyoruz.\n\nKeyifle kullanmanı dileriz.\n\nSevgilerimizle,"},
{"template_no":"21","title":"Yazı İçeriği 21","body":"Sevgili {{AD}}, \n\nSeyahatlerde ve evde ayakkabılarını düzenli bir şekilde saklaman ve kolayca taşıman için tasarladığımız 6 Bölmeli Ayakkabı Taşıma Seyahat Çantamızı seninle buluşturduk.\n\nKeyifle kullanmanı dileriz.\n\nSevgilerimizle,"},
{"template_no":"24","title":"Yazı İçeriği 24","body":"Sevgili {{AD}}, \n\nBu paketi sevgili Ada için büyük bir özenle hazırladık🤍\nKeyifle kullanmasını dileriz.\n\nSevgilerimizle,"},
{"template_no":"26","title":"Yazı İçeriği 26","body":"Sevgili {{AD}}, \n\nPvc kaplama kumaş ile tasarlanan ıslak kuru çantalarımızın seyahatlerinde, plajda, sporda ve günlük kullanımında sana eşlik etmesini dileriz.\n\nKeyifle kullanman dileğiyle 🤍\n\nSevgilerimizle,"},
{"template_no":"28","title":"Yazı İçeriği 28","body":"Sevgili {{AD}},\n\nYazlık evinde keyifle kullanabilmen için özenle seçtiğimiz ürünlerin yaşam alanına düzen ve konfor katmasını dileriz.\n\nUmarız keyifli anlarına ve yazın en güzel günlerine eşlik eder🤍\n\nSevgilerimizle,"},
{"template_no":"30","title":"Yazı İçeriği 30","body":"Sevgili {{AD}} Hanım,\n\nYeni pozisyonunuz hayırlı olsun.\nBaşarılarınızın artarak devam etmesini diliyoruz🤍\n\nSevgilerimizle,"},
{"template_no":"31","title":"Yazı İçeriği 31","body":"Sevgili {{AD}},\n\nSeni Ocean Home Textile ailesinin yeni ürünü ile tanıştırmak istiyoruz.\nDış yüzeyinde %100 pamuk kumaş, dolgu kısmında ise polyester yerine %100 pamuk elyaf yapısıyla farklı kullanım alanlarına zarifçe uyum sağlayan yatak örtüsü, OEKO-TEX®️ STANDARD 100 kriterlerine uygun olarak 1000’den fazla zararlı maddeye karşı test edilmiştir.\n\nOcean Home Textile ürünlerini keyifle kullanman dileğiyle.\n\nSevgilerimizle,"},
{"template_no":"32","title":"Yazı İçeriği 32","body":"Sevgili {{AD}}, \n\nDoğallığı, konforu ve yumuşacık dokusuyla hazırladığımız nakışlı örtümüzü seninle paylaşmaktan mutluluk duyuyoruz🤍\n\nKeyifle kullanmanı dileriz.\n\nSevgilerimizle,"},
{"template_no":"34","title":"Yazı İçeriği 34","body":"Sevgili {{AD}}, \n\nSu itici pamuklu dış kumaşı, su geçirmez pvc astarı ile tasarlanan ıslak kuru çantalarımızın okul çantalarında, seyahatlerinde, sporda ve günlük kullanımında sana eşlik etmesini dileriz.\n\nKeyifle kullanman dileğiyle.\n\nSevgilerimizle,"},
{"template_no":"38","title":"Yazı İçeriği 38","body":"Sevgili {{AD}},\n\nSeni Ocean Home Textile’in yeni rattan görünümlü sepet koleksiyonuyla tanıştırmak istedik.\nEl işçiliğiyle örülen koleksiyonumuz, doğal rattan görünümünü dayanıklı polipropilen yapıyla buluşturuyor. Yıkanabilir, suya ve neme dayanıklı, uzun ömürlü yapısıyla; banyodan mutfağa, çocuk odasından balkon, veranda ve bahçeye kadar yaşam alanlarının pek çok köşesine eşlik ediyor.\n\nUmarız evinde çok seveceğin bir yer bulur. 🤎\n\nSevgilerimizle,"}
];

function clean(v){if(v===undefined||v===null)return'';return String(v).replace(/\u00a0/g,' ').replace(/\s+/g,' ').trim()}
function phone(v){const s=clean(v);return s.endsWith('.0')?s.slice(0,-2):s}
function norm(v){return clean(v).toLocaleLowerCase('tr-TR')}

async function seedTemplates(pool){
  for(const x of DEFAULT_TEMPLATES){
    await pool.query(`INSERT INTO letter_templates(template_no,title,body) VALUES($1,$2,$3)
      ON CONFLICT(template_no) DO UPDATE SET title=EXCLUDED.title,body=EXCLUDED.body,updated_at=NOW()`,[x.template_no,x.title,x.body]);
  }
}

function installImportRoutes(app,pool,auth){
  app.get('/import',(req,res)=>{
    res.type('html').send(`<!doctype html><html lang="tr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Toplu Veri Aktar</title><style>body{font-family:system-ui;background:#f4f7fb;color:#172033;margin:0;padding:32px}.box{max-width:760px;margin:auto;background:white;border:1px solid #dfe6ef;border-radius:18px;padding:28px}input,button{font:inherit}input{display:block;width:100%;padding:14px;margin:14px 0;border:1px solid #cad5e2;border-radius:10px}button{padding:12px 16px;border:0;border-radius:10px;background:#174f7a;color:#fff;cursor:pointer}.note{background:#eef5fb;padding:14px;border-radius:10px;color:#35506b}</style></head><body><div class="box"><h1>Toplu Veri Aktar</h1><p>Son Excel dosyanı yükle. Program <b>Adres Defteri</b> ve <b>Çoklu Adresler</b> sayfalarından influencer/adres havuzunu SQL'e aktarır. Yazı şablonları da otomatik güncellenir.</p><div class="note">Aynı kişiyi tekrar yüklesen bile isim + adres bilgisine göre çoğaltmamaya çalışır.</div><form method="post" action="/api/import/excel" enctype="multipart/form-data"><input type="file" name="excel" accept=".xlsx,.xls" required><button type="submit">Excel'i Aktar</button></form><p><a href="/">← Uygulamaya dön</a></p></div></body></html>`)
  });

  app.post('/api/import/excel',upload.single('excel'),async(req,res)=>{
    if(!req.file)return res.status(400).send('Excel dosyası gerekli');
    try{
      const wb=XLSX.read(req.file.buffer,{type:'buffer',cellDates:false});
      const names=['Adres Defteri','Çoklu Adresler'];
      const rows=[];
      for(const sn of names){
        const ws=wb.Sheets[sn]; if(!ws)continue;
        const data=XLSX.utils.sheet_to_json(ws,{header:1,defval:''});
        for(let i=1;i<data.length;i++){
          const r=data[i]||[]; const name=clean(r[0]); if(!name)continue;
          rows.push({name,district:clean(r[1]),city:clean(r[2]),address:clean(r[3]),phone:phone(r[4])});
        }
      }
      const orderWs=wb.Sheets['INFLUENCER GÖNDERİMLERİ'];
      const postalByName=new Map();
      if(orderWs){
        const data=XLSX.utils.sheet_to_json(orderWs,{header:1,defval:''});
        for(let i=3;i<data.length;i++){const r=data[i]||[];const n=norm(r[2]);const pc=clean(r[14]);if(n&&pc)postalByName.set(n,pc)}
      }
      let added=0,skipped=0;
      for(const x of rows){
        const ex=await pool.query(`SELECT id FROM contacts WHERE lower(trim(name))=lower(trim($1)) AND COALESCE(address,'')=$2 LIMIT 1`,[x.name,x.address]);
        if(ex.rowCount){skipped++;continue}
        await pool.query('INSERT INTO contacts(name,phone,city,district,postal_code,address) VALUES($1,$2,$3,$4,$5,$6)',[x.name,x.phone,x.city,x.district,postalByName.get(norm(x.name))||'',x.address]);
        added++;
      }
      await seedTemplates(pool);
      res.type('html').send(`<!doctype html><html lang="tr"><meta charset="utf-8"><body style="font-family:system-ui;padding:32px"><h2>Aktarım tamamlandı</h2><p><b>${added}</b> kişi/adres eklendi.</p><p><b>${skipped}</b> kayıt zaten vardı.</p><p><b>${DEFAULT_TEMPLATES.length}</b> yazı şablonu güncellendi.</p><p><a href="/">Uygulamaya dön</a> · <a href="/import">Başka Excel aktar</a></p></body></html>`)
    }catch(e){console.error(e);res.status(500).send('Aktarım hatası: '+e.message)}
  });

  seedTemplates(pool).catch(e=>console.error('Template seed failed',e));
}

module.exports={installImportRoutes,seedTemplates};

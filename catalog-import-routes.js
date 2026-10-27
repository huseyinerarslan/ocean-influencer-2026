'use strict';
const multer=require('multer');
const AdmZip=require('adm-zip');
const upload=multer({storage:multer.memoryStorage(),limits:{fileSize:10*1024*1024}});

function extractArray(source,name,nextName){
  const start=source.indexOf(`const ${name}=`);
  if(start<0)throw new Error(`${name} bulunamadı`);
  const arrStart=source.indexOf('[',start);
  const next=source.indexOf(`\nconst ${nextName}=`,arrStart);
  if(arrStart<0||next<0)throw new Error(`${name} ayrıştırılamadı`);
  const json=source.slice(arrStart,next).trim().replace(/;\s*$/,'');
  return JSON.parse(json);
}
function clean(v){return String(v??'').replace(/\u00a0/g,' ').trim()}

async function ensureSchema(pool){
  await pool.query(`
    CREATE TABLE IF NOT EXISTS product_sets(
      id BIGSERIAL PRIMARY KEY,
      set_item_no TEXT UNIQUE NOT NULL,
      set_name TEXT NOT NULL,
      barcode TEXT,
      active BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS set_items(
      id BIGSERIAL PRIMARY KEY,
      set_id BIGINT REFERENCES product_sets(id) ON DELETE CASCADE,
      component_item_no TEXT NOT NULL,
      component_name TEXT,
      component_barcode TEXT,
      qty NUMERIC(12,3) NOT NULL DEFAULT 1
    );
  `);
}

function readCatalogFromZip(buffer){
  const zip=new AdmZip(buffer);
  const entry=zip.getEntries().find(e=>/\/js\/product-catalog\.js$/i.test('/'+e.entryName.replace(/\\/g,'/')) || /(^|\/)product-catalog\.js$/i.test(e.entryName));
  if(!entry)throw new Error('ZIP içinde product-catalog.js bulunamadı');
  return entry.getData().toString('utf8');
}

function installCatalogRoutes(app,pool,auth){
  app.get('/catalog-import',(req,res)=>{
    res.type('html').send(`<!doctype html><html lang="tr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Ürün / Set Kataloğu Aktar</title><style>body{font-family:system-ui;background:#f4f7fb;color:#172033;margin:0;padding:32px}.box{max-width:760px;margin:auto;background:#fff;border:1px solid #dfe6ef;border-radius:18px;padding:28px}.note{background:#eef5fb;padding:14px;border-radius:10px;margin:14px 0}input,button{font:inherit}input{display:block;width:100%;padding:14px;margin:14px 0;border:1px solid #cad5e2;border-radius:10px}button{padding:12px 16px;border:0;border-radius:10px;background:#174f7a;color:#fff;cursor:pointer}</style></head><body><div class="box"><h1>Ürün / Set Kataloğu Aktar</h1><p>Eski <b>ocean_influencer_excel_v6_6.zip</b> dosyasını seç. Sistem ZIP içindeki ürün ve set kataloğunu SQL'e aktarır.</p><div class="note">Mevcut ürünler güncellenir. Setler ve set içerikleri yeniden eşleştirilir; sipariş kayıtlarına dokunulmaz.</div><form action="/api/catalog/import" method="post" enctype="multipart/form-data"><input type="file" name="catalog" accept=".zip" required><button type="submit">Ürün ve Setleri Aktar</button></form><p><a href="/">← Uygulamaya dön</a></p></div></body></html>`)
  });

  app.post('/api/catalog/import',upload.single('catalog'),async(req,res)=>{
    if(!req.file)return res.status(400).send('ZIP dosyası gerekli');
    try{
      await ensureSchema(pool);
      const source=readCatalogFromZip(req.file.buffer);
      const products=extractArray(source,'PRODUCTS','SET_ROWS');
      const setRows=extractArray(source,'SET_ROWS','HBC');
      const c=await pool.connect();
      let productCount=0,setCount=0,setItemCount=0;
      try{
        await c.query('BEGIN');
        for(const p of products){
          const code=clean(p.item_no),name=clean(p.item_name),barcode=clean(p.barcode);
          if(!code)continue;
          await c.query(`INSERT INTO products(item_code,item_name,barcode,active) VALUES($1,$2,$3,true)
            ON CONFLICT(item_code) DO UPDATE SET item_name=EXCLUDED.item_name,barcode=EXCLUDED.barcode,active=true,updated_at=NOW()`,[code,name||code,barcode]);
          productCount++;
        }

        const grouped=new Map();
        for(const r of setRows){
          const code=clean(r.set_item_no); if(!code)continue;
          if(!grouped.has(code))grouped.set(code,{set_item_no:code,set_name:clean(r.set_name)||code,barcode:clean(r.set_barcode),items:[]});
          grouped.get(code).items.push({component_item_no:clean(r.component_item_no),component_name:clean(r.component_name),component_barcode:clean(r.component_barcode),qty:Number(r.qty)||1});
        }
        for(const s of grouped.values()){
          const q=await c.query(`INSERT INTO product_sets(set_item_no,set_name,barcode,active) VALUES($1,$2,$3,true)
            ON CONFLICT(set_item_no) DO UPDATE SET set_name=EXCLUDED.set_name,barcode=EXCLUDED.barcode,active=true,updated_at=NOW() RETURNING id`,[s.set_item_no,s.set_name,s.barcode]);
          const setId=q.rows[0].id;
          await c.query('DELETE FROM set_items WHERE set_id=$1',[setId]);
          for(const it of s.items){
            if(!it.component_item_no)continue;
            await c.query('INSERT INTO set_items(set_id,component_item_no,component_name,component_barcode,qty) VALUES($1,$2,$3,$4,$5)',[setId,it.component_item_no,it.component_name,it.component_barcode,it.qty]);
            setItemCount++;
          }
          setCount++;
        }
        await c.query('COMMIT');
      }catch(e){await c.query('ROLLBACK');throw e}finally{c.release()}
      res.type('html').send(`<!doctype html><html lang="tr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Katalog Aktarıldı</title></head><body style="font-family:system-ui;padding:24px"><h1>Katalog aktarıldı</h1><p><b>${productCount}</b> ürün işlendi.</p><p><b>${setCount}</b> set işlendi.</p><p><b>${setItemCount}</b> set bileşeni eşleştirildi.</p><p><a href="/">Uygulamaya dön</a> · <a href="/catalog-import">Tekrar aktar</a></p></body></html>`)
    }catch(e){res.status(500).send('Katalog aktarım hatası: '+String(e.message||e))}
  });

  app.get('/api/sets',auth,async(req,res)=>{
    await ensureSchema(pool);
    const q=await pool.query(`SELECT s.*,COALESCE(json_agg(json_build_object('item_code',si.component_item_no,'item_name',si.component_name,'barcode',si.component_barcode,'qty',si.qty) ORDER BY si.id) FILTER (WHERE si.id IS NOT NULL),'[]') items FROM product_sets s LEFT JOIN set_items si ON si.set_id=s.id WHERE s.active=true GROUP BY s.id ORDER BY s.set_name`);
    res.json(q.rows);
  });
}

module.exports={installCatalogRoutes};

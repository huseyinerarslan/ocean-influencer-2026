'use strict';
const multer=require('multer');
const XLSX=require('xlsx');
const crypto=require('crypto');
const upload=multer({storage:multer.memoryStorage(),limits:{fileSize:20*1024*1024}});

function clean(v){if(v===undefined||v===null)return'';return String(v).replace(/\u00a0/g,' ').replace(/\s+/g,' ').trim()}
function phone(v){const s=clean(v);return s.endsWith('.0')?s.slice(0,-2):s}
function norm(v){return clean(v).toLocaleLowerCase('tr-TR')}
function qty(v){const n=Number(String(v??'').replace(',','.'));return Number.isFinite(n)&&n>0?n:1}
function excelDate(v){
  if(!v)return null;
  if(v instanceof Date && !Number.isNaN(v.getTime()))return v.toISOString().slice(0,10);
  const s=clean(v);
  if(/^\d{4}-\d{2}-\d{2}/.test(s))return s.slice(0,10);
  if(/^\d{1,2}[./-]\d{1,2}[./-]\d{4}$/.test(s)){const [d,m,y]=s.split(/[./-]/);return `${y}-${m.padStart(2,'0')}-${d.padStart(2,'0')}`}
  const n=Number(s);
  if(Number.isFinite(n)&&n>30000&&n<70000){const d=XLSX.SSF.parse_date_code(n);if(d)return `${d.y}-${String(d.m).padStart(2,'0')}-${String(d.d).padStart(2,'0')}`}
  return null;
}
function fingerprint(x){return crypto.createHash('sha1').update(JSON.stringify(x)).digest('hex')}

function extractContacts(wb){
  const rows=[];
  for(const sn of ['Adres Defteri','Çoklu Adresler']){
    const ws=wb.Sheets[sn]; if(!ws)continue;
    const data=XLSX.utils.sheet_to_json(ws,{header:1,defval:'',raw:false});
    for(let i=1;i<data.length;i++){
      const r=data[i]||[]; const name=clean(r[0]); if(!name)continue;
      rows.push({name,district:clean(r[1]),city:clean(r[2]),address:clean(r[3]),postal_code:clean(r[4]),phone:phone(r[5])});
    }
  }
  return rows;
}

function extractOrders(wb){
  const ws=wb.Sheets['INFLUENCER GÖNDERİMLERİ'];
  if(!ws)return [];
  const data=XLSX.utils.sheet_to_json(ws,{header:1,defval:'',raw:true});
  const groups=[]; let current=null;
  for(let i=3;i<data.length;i++){
    const r=data[i]||[];
    const seq=clean(r[0]), name=clean(r[2]);
    if(!seq||!name)continue;
    const base=[seq,norm(name),norm(r[9]),phone(r[10])].join('|');
    if(!current||current.base!==base){
      current={base,seq,name,district:clean(r[7]),city:clean(r[8]),address:clean(r[9]),phone:phone(r[10]),template:clean(r[11]),waybill:clean(r[12]),excel_status:clean(r[13]),postal_code:clean(r[14]),order_date:excelDate(r[15]),items:[]};
      groups.push(current);
    }
    const itemCode=clean(r[3]);
    if(itemCode)current.items.push({item_code:itemCode,qty:qty(r[4]),item_name:clean(r[5])});
  }
  const seqSeen=new Map();
  for(const g of groups){
    const n=(seqSeen.get(g.seq)||0)+1;seqSeen.set(g.seq,n);
    g.order_no=`EXCEL-${g.seq}${n>1?'-'+n:''}`;
    g.source_ref='excel:'+fingerprint({seq:g.seq,name:g.name,address:g.address,phone:g.phone,items:g.items,waybill:g.waybill});
  }
  return groups;
}

function installImportRoutes(app,pool,auth){
  app.get('/import',(req,res)=>res.redirect('/import.html'));
  app.post('/api/import/excel',upload.single('excel'),async(req,res)=>{
    if(!req.file)return res.status(400).send('Excel dosyası gerekli');
    try{
      const wb=XLSX.read(req.file.buffer,{type:'buffer',cellDates:true});
      const contacts=extractContacts(wb);
      const orders=extractOrders(wb);
      const c=await pool.connect();
      let contactsAdded=0,contactsSkipped=0,ordersAdded=0,ordersUpdated=0,itemCount=0,productCount=0;
      try{
        await c.query('BEGIN');
        await c.query('ALTER TABLE orders ADD COLUMN IF NOT EXISTS source_ref TEXT');
        await c.query('ALTER TABLE orders ADD COLUMN IF NOT EXISTS source_status TEXT');
        await c.query('ALTER TABLE orders ALTER COLUMN order_date DROP NOT NULL');
        await c.query('CREATE UNIQUE INDEX IF NOT EXISTS orders_source_ref_uq ON orders(source_ref) WHERE source_ref IS NOT NULL');

        const existing=(await c.query('SELECT id,name,address FROM contacts')).rows;
        const contactMap=new Map(existing.map(x=>[norm(x.name)+'|'+norm(x.address),x.id]));
        for(const x of contacts){
          const k=norm(x.name)+'|'+norm(x.address);
          if(contactMap.has(k)){contactsSkipped++;continue}
          const q=await c.query('INSERT INTO contacts(name,phone,city,district,postal_code,address) VALUES($1,$2,$3,$4,$5,$6) RETURNING id',[x.name,x.phone,x.city,x.district,x.postal_code,x.address]);
          contactMap.set(k,q.rows[0].id);contactsAdded++;
        }

        for(const o of orders){
          const contactKey=norm(o.name)+'|'+norm(o.address);
          let contactId=contactMap.get(contactKey)||null;
          if(!contactId){
            const q=await c.query('INSERT INTO contacts(name,phone,city,district,postal_code,address) VALUES($1,$2,$3,$4,$5,$6) RETURNING id',[o.name,o.phone,o.city,o.district,o.postal_code,o.address]);
            contactId=q.rows[0].id;contactMap.set(contactKey,contactId);contactsAdded++;
          }

          const old=await c.query('SELECT id FROM orders WHERE source_ref=$1',[o.source_ref]);
          let orderId;
          if(old.rowCount){
            orderId=old.rows[0].id;
            await c.query(`UPDATE orders SET contact_id=$1,recipient_name=$2,phone=$3,city=$4,district=$5,postal_code=$6,address=$7,letter_template_no=$8,status='Çıkarıldı',waybill_done=$9,waybill_no=$10,source_status=$11,order_date=COALESCE($12,order_date),updated_at=NOW() WHERE id=$13`,[contactId,o.name,o.phone,o.city,o.district,o.postal_code,o.address,o.template,Boolean(o.waybill),o.waybill||null,o.excel_status||null,o.order_date,orderId]);
            await c.query('DELETE FROM order_items WHERE order_id=$1',[orderId]);
            ordersUpdated++;
          }else{
            let orderNo=o.order_no;
            const noExists=await c.query('SELECT 1 FROM orders WHERE order_no=$1',[orderNo]);
            if(noExists.rowCount)orderNo=`${orderNo}-${o.source_ref.slice(-6)}`;
            const q=await c.query(`INSERT INTO orders(order_no,contact_id,recipient_name,phone,city,district,postal_code,address,letter_template_no,status,waybill_done,waybill_no,order_date,source_ref,source_status) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,'Çıkarıldı',$10,$11,$12,$13,$14) RETURNING id`,[orderNo,contactId,o.name,o.phone,o.city,o.district,o.postal_code,o.address,o.template,Boolean(o.waybill),o.waybill||null,o.order_date,o.source_ref,o.excel_status||null]);
            orderId=q.rows[0].id;ordersAdded++;
          }

          for(const it of o.items){
            await c.query(`INSERT INTO products(item_code,item_name) VALUES($1,$2) ON CONFLICT(item_code) DO UPDATE SET item_name=CASE WHEN EXCLUDED.item_name<>'' THEN EXCLUDED.item_name ELSE products.item_name END,updated_at=NOW()`,[it.item_code,it.item_name||it.item_code]);
            await c.query('INSERT INTO order_items(order_id,item_code,item_name,qty) VALUES($1,$2,$3,$4)',[orderId,it.item_code,it.item_name||it.item_code,it.qty]);
            itemCount++;productCount++;
          }
        }
        await c.query('COMMIT');
      }catch(e){await c.query('ROLLBACK');throw e}finally{c.release()}

      res.type('html').send(`<!doctype html><html lang="tr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Aktarım Tamamlandı</title></head><body style="font-family:system-ui;padding:22px"><h1>Aktarım tamamlandı</h1><p><b>${contactsAdded}</b> yeni kişi/adres eklendi, <b>${contactsSkipped}</b> kişi zaten vardı.</p><p><b>${ordersAdded}</b> geçmiş sipariş eklendi, <b>${ordersUpdated}</b> sipariş güncellendi.</p><p><b>${itemCount}</b> ürün satırı siparişlere bağlandı.</p><p>Excel'den gelen geçmiş siparişlerin durumu <b>Çıkarıldı</b> olarak kaydedildi.</p><p>Yazı şablonlarına dokunulmadı; yaptığın düzenlemeler korunuyor.</p><p><a href="/">Siparişlere dön</a> · <a href="/import">Başka Excel aktar</a></p></body></html>`);
    }catch(e){res.status(500).send('Aktarım hatası: '+String(e.message||e))}
  });
}
module.exports={installImportRoutes};
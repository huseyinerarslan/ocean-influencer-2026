'use strict';
const bad=message=>Object.assign(new Error(message),{status:400});
async function schema(pool){
 await pool.query(`CREATE TABLE IF NOT EXISTS product_sets(id BIGSERIAL PRIMARY KEY,set_item_no TEXT UNIQUE NOT NULL,set_name TEXT NOT NULL,barcode TEXT,active BOOLEAN DEFAULT TRUE,created_at TIMESTAMPTZ DEFAULT NOW(),updated_at TIMESTAMPTZ DEFAULT NOW());
 CREATE TABLE IF NOT EXISTS set_items(id BIGSERIAL PRIMARY KEY,set_id BIGINT REFERENCES product_sets(id) ON DELETE CASCADE,component_item_no TEXT NOT NULL,component_name TEXT,component_barcode TEXT,qty NUMERIC(12,3) NOT NULL DEFAULT 1);
 ALTER TABLE order_items ADD COLUMN IF NOT EXISTS set_components JSONB;
 ALTER TABLE orders ADD COLUMN IF NOT EXISTS business_partner_code TEXT;
 ALTER TABLE orders ADD COLUMN IF NOT EXISTS source_system TEXT;
 CREATE INDEX IF NOT EXISTS orders_created_page_idx ON orders(created_at DESC,id DESC);`);
}
async function resolveItems(db,lines){
 if(!Array.isArray(lines)||!lines.length||lines.length>500)throw bad('1–500 ürün satırı girin.');
 const result=[];
 for(const [index,line] of lines.entries()){
  const code=String(line.item_code||'').trim(),qty=Number(String(line.qty??'').replace(',','.'));
  if(!code||!Number.isFinite(qty)||qty<=0||qty>999999||Math.abs(Math.round(qty*1000)-qty*1000)>0.000001)throw bad(`${index+1}. satırda geçerli ürün kodu ve pozitif adet gerekli (en fazla 3 ondalık).`);
  const {rows}=await db.query(`SELECT item_code,item_name,'product' AS kind FROM products WHERE active=true AND item_code=$1
    UNION ALL SELECT set_item_no,set_name,'set' FROM product_sets WHERE active=true AND set_item_no=$1`,[code]);
  if(!rows.length)throw bad(`${code}: ürün veya set aktif katalogda bulunamadı.`);
  // Set codes can also exist in products. Keep the ordered set code; print expansion is separate.
  const item=rows.find(r=>r.kind==='set')||rows[0];
  let components=[];
  if(item.kind==='set'){
   const c=await db.query(`SELECT si.component_item_no AS item_code,si.component_name AS item_name,si.qty FROM set_items si JOIN product_sets s ON s.id=si.set_id WHERE s.set_item_no=$1 AND s.active=true ORDER BY si.id`,[code]);
   if(!c.rows.length)throw bad(`${code}: set içeriği boş, önce set bileşenlerini tamamlayın.`);
   components=c.rows;
  }
  result.push({item_code:item.item_code,item_name:item.item_name,qty,set_components:components});
 }
 return result;
}
function draft(order,items){
 return {schemaVersion:1,mode:'PREVIEW_ONLY',readyForSap:false,
  blockers:[...(require('./postal-address').postalError(order)?[require('./postal-address').postalError(order)]:[]),'YKTP Entegra Sipariş UDO/alan eşlemesi doğrulanmalı.','Depo, fiyat/iskonto, vergi ve belge serisi kuralları doğrulanmalı.','Entegra kaydından irsaliyeye geçiş ve mükerrer kayıt kontrolü SAP ekibiyle test edilmeli.'],
  source:{system:order.source_system||'LEGACY',orderId:String(order.id),orderNumber:order.order_no,idempotencyKey:`OCEAN-INF-${order.id}`},
  customer:{cardCode:order.business_partner_code||null},
  delivery:{name:order.recipient_name,phone:order.phone,city:order.city,district:order.district,postalCode:order.postal_code,address:order.address},
  document:{date:order.order_date,channel:'INFLUENCER',requestedType:'DELIVERY',waybillNumber:order.waybill_no||null},
  lines:items.map((x,i)=>({line:i+1,itemCode:x.item_code,itemName:x.item_name,quantity:Number(x.qty),setComponents:x.set_components||null}))};
}
function install(app,pool,auth){
 const safe=fn=>async(req,res)=>{try{await fn(req,res)}catch(e){res.status(e.status||500).json({error:e.status?e.message:'İşlem tamamlanamadı.'})}};
 app.get('/api/catalog/search',auth,safe(async(req,res)=>{
  const q=String(req.query.q||'').trim().slice(0,160);if(q.length<2)return res.json([]);
  const {rows}=await pool.query(`SELECT * FROM (
   SELECT item_code,item_name,barcode,'product' AS kind FROM products p WHERE active=true AND NOT EXISTS(SELECT 1 FROM product_sets s WHERE s.active=true AND s.set_item_no=p.item_code)
   UNION ALL SELECT set_item_no,set_name,barcode,'set' FROM product_sets WHERE active=true
  ) c WHERE item_code ILIKE $1 OR item_name ILIKE $1 OR barcode ILIKE $1
  ORDER BY (LOWER(item_code)=LOWER($2) OR LOWER(COALESCE(barcode,''))=LOWER($2)) DESC,item_code LIMIT 15`,['%'+q+'%',q]);res.json(rows);
 }));
 app.post('/api/catalog/resolve',auth,safe(async(req,res)=>{
  if(!Array.isArray(req.body.codes)||req.body.codes.length>500)throw bad('En fazla 500 kod gönderebilirsin.');
  const codes=req.body.codes.map(x=>String(x).trim());
  const {rows}=await pool.query(`SELECT item_code,item_name,barcode,'product' AS kind FROM products WHERE active=true AND (UPPER(item_code)=ANY($1::text[]) OR UPPER(barcode)=ANY($1::text[]))
  UNION ALL SELECT set_item_no,set_name,barcode,'set' FROM product_sets WHERE active=true AND (UPPER(set_item_no)=ANY($1::text[]) OR UPPER(barcode)=ANY($1::text[]))`,[codes.map(c=>c.toUpperCase())]);
  res.json(codes.map(code=>{const matches=rows.filter(r=>[r.item_code,r.barcode].some(v=>String(v||'').toUpperCase()===code.toUpperCase()));const unique=[...new Set(matches.map(r=>r.item_code))];return {code,item:unique.length===1?(matches.find(r=>r.kind==='set')||matches[0]):null,error:unique.length>1?'Barkod birden fazla ürüne ait':'Katalogda bulunamadı'};}));
 }));
 app.get('/api/orders/:id/sap-preview',auth,safe(async(req,res)=>{
  const {rows}=await pool.query('SELECT * FROM orders WHERE id=$1',[req.params.id]);if(!rows.length)return res.status(404).json({error:'Sipariş bulunamadı'});
  const items=await pool.query('SELECT * FROM order_items WHERE order_id=$1 ORDER BY id',[req.params.id]);res.json(draft(rows[0],items.rows));
 }));
}
module.exports={schema,resolveItems,draft,install};

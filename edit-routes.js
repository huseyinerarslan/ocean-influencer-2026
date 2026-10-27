'use strict';

async function ensureCatalog(pool){
  await pool.query(`
    CREATE TABLE IF NOT EXISTS product_sets(id BIGSERIAL PRIMARY KEY,set_item_no TEXT UNIQUE NOT NULL,set_name TEXT NOT NULL,barcode TEXT,active BOOLEAN DEFAULT TRUE,created_at TIMESTAMPTZ DEFAULT NOW(),updated_at TIMESTAMPTZ DEFAULT NOW());
    CREATE TABLE IF NOT EXISTS set_items(id BIGSERIAL PRIMARY KEY,set_id BIGINT REFERENCES product_sets(id) ON DELETE CASCADE,component_item_no TEXT NOT NULL,component_name TEXT,component_barcode TEXT,qty NUMERIC(12,3) NOT NULL DEFAULT 1);
  `);
}
async function addLog(pool,orderId,action,details={}){try{await pool.query('INSERT INTO activity_logs(order_id,action,details) VALUES($1,$2,$3::jsonb)',[orderId,action,JSON.stringify(details)])}catch{}}

function installEditRoutes(app,pool,auth){
  app.patch('/api/contacts/:id',auth,async(req,res)=>{
    const x=req.body||{};const q=await pool.query(`UPDATE contacts SET name=COALESCE(NULLIF($1,''),name),phone=$2,city=$3,district=$4,postal_code=$5,address=$6,updated_at=NOW() WHERE id=$7 RETURNING *`,[String(x.name||'').trim(),x.phone||'',x.city||'',x.district||'',x.postal_code||'',x.address||'',req.params.id]);
    if(!q.rowCount)return res.status(404).json({error:'Kişi bulunamadı'});res.json(q.rows[0]);
  });

  app.patch('/api/templates/:id',auth,async(req,res)=>{
    const x=req.body||{};const q=await pool.query(`UPDATE letter_templates SET template_no=COALESCE(NULLIF($1,''),template_no),title=$2,body=$3,updated_at=NOW() WHERE id=$4 RETURNING *`,[String(x.template_no||'').trim(),x.title||'',x.body||'',req.params.id]);
    if(!q.rowCount)return res.status(404).json({error:'Şablon bulunamadı'});res.json(q.rows[0]);
  });

  app.patch('/api/products/:id',auth,async(req,res)=>{
    const x=req.body||{},code=String(x.item_code||'').trim(),name=String(x.item_name||'').trim();if(!code||!name)return res.status(400).json({error:'Ürün kodu ve adı gerekli'});
    try{const q=await pool.query('UPDATE products SET item_code=$1,item_name=$2,barcode=$3,updated_at=NOW() WHERE id=$4 RETURNING *',[code,name,String(x.barcode||'').trim(),req.params.id]);if(!q.rowCount)return res.status(404).json({error:'Ürün bulunamadı'});res.json(q.rows[0])}catch(e){if(e.code==='23505')return res.status(409).json({error:'Bu ürün kodu zaten kullanılıyor'});res.status(500).json({error:e.message})}
  });
  app.delete('/api/products/:id',auth,async(req,res)=>{const q=await pool.query('UPDATE products SET active=false,updated_at=NOW() WHERE id=$1 RETURNING id',[req.params.id]);if(!q.rowCount)return res.status(404).json({error:'Ürün bulunamadı'});res.json({ok:true})});

  app.post('/api/sets',auth,async(req,res)=>{
    await ensureCatalog(pool);const x=req.body||{},code=String(x.set_item_no||'').trim(),name=String(x.set_name||'').trim();if(!code||!name)return res.status(400).json({error:'Set kodu ve adı gerekli'});const c=await pool.connect();
    try{await c.query('BEGIN');const q=await c.query('INSERT INTO product_sets(set_item_no,set_name,barcode,active) VALUES($1,$2,$3,true) RETURNING *',[code,name,String(x.barcode||'').trim()]);for(const it of (x.items||[])){const ic=String(it.item_code||'').trim();if(!ic)continue;await c.query('INSERT INTO set_items(set_id,component_item_no,component_name,component_barcode,qty) VALUES($1,$2,$3,$4,$5)',[q.rows[0].id,ic,String(it.item_name||'').trim(),String(it.barcode||'').trim(),Number(it.qty||1)])}await c.query('COMMIT');res.json(q.rows[0])}catch(e){await c.query('ROLLBACK');if(e.code==='23505')return res.status(409).json({error:'Bu set kodu zaten kullanılıyor'});res.status(500).json({error:e.message})}finally{c.release()}
  });
  app.patch('/api/sets/:id',auth,async(req,res)=>{
    await ensureCatalog(pool);const x=req.body||{},code=String(x.set_item_no||'').trim(),name=String(x.set_name||'').trim();if(!code||!name)return res.status(400).json({error:'Set kodu ve adı gerekli'});const c=await pool.connect();
    try{await c.query('BEGIN');const q=await c.query('UPDATE product_sets SET set_item_no=$1,set_name=$2,barcode=$3,updated_at=NOW() WHERE id=$4 RETURNING *',[code,name,String(x.barcode||'').trim(),req.params.id]);if(!q.rowCount){await c.query('ROLLBACK');return res.status(404).json({error:'Set bulunamadı'})}if(Array.isArray(x.items)){await c.query('DELETE FROM set_items WHERE set_id=$1',[req.params.id]);for(const it of x.items){const ic=String(it.item_code||'').trim();if(!ic)continue;await c.query('INSERT INTO set_items(set_id,component_item_no,component_name,component_barcode,qty) VALUES($1,$2,$3,$4,$5)',[req.params.id,ic,String(it.item_name||'').trim(),String(it.barcode||'').trim(),Number(it.qty||1)])}}await c.query('COMMIT');res.json(q.rows[0])}catch(e){await c.query('ROLLBACK');if(e.code==='23505')return res.status(409).json({error:'Bu set kodu zaten kullanılıyor'});res.status(500).json({error:e.message})}finally{c.release()}
  });
  app.delete('/api/sets/:id',auth,async(req,res)=>{await ensureCatalog(pool);const q=await pool.query('UPDATE product_sets SET active=false,updated_at=NOW() WHERE id=$1 RETURNING id',[req.params.id]);if(!q.rowCount)return res.status(404).json({error:'Set bulunamadı'});res.json({ok:true})});

  app.get('/api/orders/:id/detail',auth,async(req,res)=>{const q=await pool.query(`SELECT o.*,COALESCE(json_agg(json_build_object('id',oi.id,'item_code',oi.item_code,'item_name',oi.item_name,'qty',oi.qty) ORDER BY oi.id) FILTER (WHERE oi.id IS NOT NULL),'[]') items FROM orders o LEFT JOIN order_items oi ON oi.order_id=o.id WHERE o.id=$1 GROUP BY o.id`,[req.params.id]);if(!q.rowCount)return res.status(404).json({error:'Sipariş bulunamadı'});res.json(q.rows[0])});
  app.patch('/api/orders/:id/detail',auth,async(req,res)=>{const x=req.body||{};const q=await pool.query(`UPDATE orders SET recipient_name=COALESCE(NULLIF($1,''),recipient_name),phone=$2,city=$3,district=$4,postal_code=$5,address=$6,letter_template_no=$7,status=COALESCE(NULLIF($8,''),status),waybill_no=$9,waybill_done=$10,updated_at=NOW() WHERE id=$11 RETURNING *`,[String(x.recipient_name||'').trim(),x.phone||'',x.city||'',x.district||'',x.postal_code||'',x.address||'',x.letter_template_no||'',x.status||'',x.waybill_no||'',Boolean(x.waybill_done),req.params.id]);if(!q.rowCount)return res.status(404).json({error:'Sipariş bulunamadı'});await addLog(pool,req.params.id,'ORDER_DETAIL_UPDATED',{user:req.user.username});res.json(q.rows[0])});
  app.post('/api/orders/:id/items',auth,async(req,res)=>{const x=req.body||{},code=String(x.item_code||'').trim();if(!code)return res.status(400).json({error:'Ürün seçmelisin'});const q=await pool.query('INSERT INTO order_items(order_id,item_code,item_name,qty) VALUES($1,$2,$3,$4) RETURNING *',[req.params.id,code,String(x.item_name||code).trim(),Number(x.qty||1)]);await addLog(pool,req.params.id,'ORDER_ITEM_ADDED',{item_code:code,user:req.user.username});res.json(q.rows[0])});
  app.patch('/api/order-items/:id',auth,async(req,res)=>{const x=req.body||{},old=await pool.query('SELECT * FROM order_items WHERE id=$1',[req.params.id]);if(!old.rowCount)return res.status(404).json({error:'Sipariş kalemi bulunamadı'});const q=await pool.query('UPDATE order_items SET item_code=COALESCE(NULLIF($1,\'\'),item_code),item_name=COALESCE(NULLIF($2,\'\'),item_name),qty=COALESCE($3,qty) WHERE id=$4 RETURNING *',[String(x.item_code||'').trim(),String(x.item_name||'').trim(),x.qty===undefined?null:Number(x.qty),req.params.id]);await addLog(pool,old.rows[0].order_id,'ORDER_ITEM_UPDATED',{item_id:req.params.id,user:req.user.username});res.json(q.rows[0])});
  app.delete('/api/order-items/:id',auth,async(req,res)=>{const q=await pool.query('DELETE FROM order_items WHERE id=$1 RETURNING *',[req.params.id]);if(!q.rowCount)return res.status(404).json({error:'Sipariş kalemi bulunamadı'});await addLog(pool,q.rows[0].order_id,'ORDER_ITEM_REMOVED',{item_code:q.rows[0].item_code,user:req.user.username});res.json({ok:true})});

  app.get('/manage',(req,res)=>res.redirect('/manage.html'));
}
module.exports={installEditRoutes};

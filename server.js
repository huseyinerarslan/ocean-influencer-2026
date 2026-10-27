'use strict';
const path=require('path');
const express=require('express');
const cookieParser=require('cookie-parser');
const bcrypt=require('bcryptjs');
const jwt=require('jsonwebtoken');
const {Pool}=require('pg');
const {installImportRoutes,seedTemplates}=require('./import-routes');

const app=express();
const PORT=Number(process.env.PORT||3000);
const DATABASE_URL=process.env.DATABASE_URL;
const JWT_SECRET=process.env.JWT_SECRET||'change-this-secret';
const ADMIN_USER=process.env.ADMIN_USER||'admin';
const ADMIN_PASSWORD=process.env.ADMIN_PASSWORD||'Ocean@123';
if(!DATABASE_URL){console.error('DATABASE_URL missing');process.exit(1)}
const pool=new Pool({connectionString:DATABASE_URL,ssl:process.env.NODE_ENV==='production'?{rejectUnauthorized:false}:false});
app.use(express.json({limit:'10mb'}));
app.use(cookieParser());
app.set('trust proxy',1);

async function schema(){
 await pool.query(`
 CREATE TABLE IF NOT EXISTS users(id BIGSERIAL PRIMARY KEY,username TEXT UNIQUE NOT NULL,password_hash TEXT NOT NULL,role TEXT NOT NULL DEFAULT 'admin',created_at TIMESTAMPTZ DEFAULT NOW());
 CREATE TABLE IF NOT EXISTS contacts(id BIGSERIAL PRIMARY KEY,name TEXT NOT NULL,phone TEXT,city TEXT,district TEXT,postal_code TEXT,address TEXT,created_at TIMESTAMPTZ DEFAULT NOW(),updated_at TIMESTAMPTZ DEFAULT NOW());
 CREATE TABLE IF NOT EXISTS products(id BIGSERIAL PRIMARY KEY,item_code TEXT UNIQUE NOT NULL,item_name TEXT NOT NULL,barcode TEXT,active BOOLEAN DEFAULT TRUE,created_at TIMESTAMPTZ DEFAULT NOW(),updated_at TIMESTAMPTZ DEFAULT NOW());
 CREATE TABLE IF NOT EXISTS letter_templates(id BIGSERIAL PRIMARY KEY,template_no TEXT UNIQUE NOT NULL,title TEXT,body TEXT NOT NULL,created_at TIMESTAMPTZ DEFAULT NOW(),updated_at TIMESTAMPTZ DEFAULT NOW());
 CREATE TABLE IF NOT EXISTS orders(id BIGSERIAL PRIMARY KEY,order_no TEXT UNIQUE NOT NULL,contact_id BIGINT REFERENCES contacts(id),recipient_name TEXT NOT NULL,phone TEXT,city TEXT,district TEXT,postal_code TEXT,address TEXT,letter_template_no TEXT,status TEXT NOT NULL DEFAULT 'NEW',waybill_done BOOLEAN DEFAULT FALSE,waybill_no TEXT,dhl_tracking_no TEXT,order_date DATE NOT NULL DEFAULT CURRENT_DATE,created_at TIMESTAMPTZ DEFAULT NOW(),updated_at TIMESTAMPTZ DEFAULT NOW());
 CREATE TABLE IF NOT EXISTS order_items(id BIGSERIAL PRIMARY KEY,order_id BIGINT REFERENCES orders(id) ON DELETE CASCADE,item_code TEXT NOT NULL,item_name TEXT NOT NULL,qty NUMERIC(12,3) NOT NULL DEFAULT 1);
 CREATE TABLE IF NOT EXISTS activity_logs(id BIGSERIAL PRIMARY KEY,order_id BIGINT REFERENCES orders(id) ON DELETE CASCADE,action TEXT NOT NULL,details JSONB,created_at TIMESTAMPTZ DEFAULT NOW());
 `);
 const q=await pool.query('SELECT id FROM users WHERE username=$1',[ADMIN_USER]);
 if(!q.rowCount){const h=await bcrypt.hash(ADMIN_PASSWORD,12);await pool.query('INSERT INTO users(username,password_hash) VALUES($1,$2)',[ADMIN_USER,h]);}
}
function token(u){return jwt.sign({sub:u.id,username:u.username,role:u.role},JWT_SECRET,{expiresIn:'12h'})}
function auth(req,res,next){try{const t=req.cookies.ocean_token;if(!t)return res.status(401).json({error:'Oturum gerekli'});req.user=jwt.verify(t,JWT_SECRET);next()}catch{return res.status(401).json({error:'Oturum süresi doldu'})}}
async function log(orderId,action,details={}){try{await pool.query('INSERT INTO activity_logs(order_id,action,details) VALUES($1,$2,$3::jsonb)',[orderId,action,JSON.stringify(details)])}catch{}}
async function nextNo(){const y=new Date().getFullYear();const q=await pool.query("SELECT order_no FROM orders WHERE order_no LIKE $1 ORDER BY id DESC LIMIT 1",[`INF-${y}-%`]);let n=1;if(q.rowCount){const m=q.rows[0].order_no.match(/(\d+)$/);if(m)n=Number(m[1])+1}return `INF-${y}-${String(n).padStart(6,'0')}`}

app.get('/health',async(req,res)=>{try{await pool.query('SELECT 1');res.json({ok:true,database:'connected'})}catch(e){res.status(500).json({ok:false,error:e.message})}});
app.post('/api/login',async(req,res)=>{const {username,password}=req.body||{};const q=await pool.query('SELECT * FROM users WHERE username=$1',[username]);if(!q.rowCount||!(await bcrypt.compare(password||'',q.rows[0].password_hash)))return res.status(401).json({error:'Kullanıcı adı veya şifre hatalı'});res.cookie('ocean_token',token(q.rows[0]),{httpOnly:true,sameSite:'lax',secure:process.env.NODE_ENV==='production',maxAge:12*60*60*1000});res.json({ok:true,user:{username:q.rows[0].username,role:q.rows[0].role}})});
app.post('/api/logout',(req,res)=>{res.clearCookie('ocean_token');res.json({ok:true})});
app.get('/api/me',auth,(req,res)=>res.json({user:req.user}));

app.get('/api/contacts',auth,async(req,res)=>{const q=await pool.query('SELECT * FROM contacts ORDER BY name');res.json(q.rows)});
app.post('/api/contacts',auth,async(req,res)=>{const x=req.body||{};const q=await pool.query('INSERT INTO contacts(name,phone,city,district,postal_code,address) VALUES($1,$2,$3,$4,$5,$6) RETURNING *',[x.name,x.phone||'',x.city||'',x.district||'',x.postal_code||'',x.address||'']);res.json(q.rows[0])});
app.get('/api/products',auth,async(req,res)=>{const q=await pool.query('SELECT * FROM products WHERE active=true ORDER BY item_name');res.json(q.rows)});
app.post('/api/products',auth,async(req,res)=>{const x=req.body||{};const q=await pool.query(`INSERT INTO products(item_code,item_name,barcode) VALUES($1,$2,$3) ON CONFLICT(item_code) DO UPDATE SET item_name=EXCLUDED.item_name,barcode=EXCLUDED.barcode,updated_at=NOW() RETURNING *`,[x.item_code,x.item_name,x.barcode||'']);res.json(q.rows[0])});
app.get('/api/templates',auth,async(req,res)=>{const q=await pool.query('SELECT * FROM letter_templates ORDER BY template_no');res.json(q.rows)});
app.post('/api/templates',auth,async(req,res)=>{const x=req.body||{};const q=await pool.query(`INSERT INTO letter_templates(template_no,title,body) VALUES($1,$2,$3) ON CONFLICT(template_no) DO UPDATE SET title=EXCLUDED.title,body=EXCLUDED.body,updated_at=NOW() RETURNING *`,[x.template_no,x.title||'',x.body||'']);res.json(q.rows[0])});

app.get('/api/orders',auth,async(req,res)=>{
 const p=[];const w=[];let i=1;
 if(req.query.q){w.push(`(o.order_no ILIKE $${i} OR o.recipient_name ILIKE $${i} OR o.city ILIKE $${i})`);p.push(`%${req.query.q}%`);i++}
 if(req.query.status&&req.query.status!=='all'){w.push(`o.status=$${i++}`);p.push(req.query.status)}
 if(req.query.date){w.push(`o.order_date=$${i++}`);p.push(req.query.date)}
 if(req.query.from){w.push(`o.order_date>=$${i++}`);p.push(req.query.from)}
 if(req.query.to){w.push(`o.order_date<=$${i++}`);p.push(req.query.to)}
 const sql=`SELECT o.*,COALESCE(json_agg(json_build_object('item_code',oi.item_code,'item_name',oi.item_name,'qty',oi.qty)) FILTER (WHERE oi.id IS NOT NULL),'[]') items FROM orders o LEFT JOIN order_items oi ON oi.order_id=o.id ${w.length?'WHERE '+w.join(' AND '):''} GROUP BY o.id ORDER BY o.order_date DESC,o.id DESC`;
 const q=await pool.query(sql,p);res.json(q.rows)
});
app.get('/api/orders/days',auth,async(req,res)=>{const q=await pool.query("SELECT order_date,COUNT(*)::int count FROM orders GROUP BY order_date ORDER BY order_date DESC LIMIT 60");res.json(q.rows)});
app.post('/api/orders',auth,async(req,res)=>{const x=req.body||{};const no=await nextNo();const c=await pool.connect();try{await c.query('BEGIN');const q=await c.query(`INSERT INTO orders(order_no,contact_id,recipient_name,phone,city,district,postal_code,address,letter_template_no,status,order_date) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,'NEW',COALESCE($10,CURRENT_DATE)) RETURNING *`,[no,x.contact_id||null,x.recipient_name,x.phone||'',x.city||'',x.district||'',x.postal_code||'',x.address||'',x.letter_template_no||'',x.order_date||null]);for(const it of (x.items||[])){await c.query('INSERT INTO order_items(order_id,item_code,item_name,qty) VALUES($1,$2,$3,$4)',[q.rows[0].id,it.item_code,it.item_name,Number(it.qty||1)])}await c.query('COMMIT');await log(q.rows[0].id,'ORDER_CREATED',{user:req.user.username});res.json(q.rows[0])}catch(e){await c.query('ROLLBACK');res.status(500).json({error:e.message})}finally{c.release()}});
app.patch('/api/orders/:id',auth,async(req,res)=>{const x=req.body||{};const q=await pool.query(`UPDATE orders SET status=COALESCE($1,status),waybill_done=COALESCE($2,waybill_done),waybill_no=COALESCE($3,waybill_no),dhl_tracking_no=COALESCE($4,dhl_tracking_no),updated_at=NOW() WHERE id=$5 RETURNING *`,[x.status??null,x.waybill_done??null,x.waybill_no??null,x.dhl_tracking_no??null,req.params.id]);if(!q.rowCount)return res.status(404).json({error:'Sipariş bulunamadı'});await log(req.params.id,'ORDER_UPDATED',x);res.json(q.rows[0])});
app.get('/api/orders/:id/activity',auth,async(req,res)=>{const q=await pool.query('SELECT * FROM activity_logs WHERE order_id=$1 ORDER BY created_at DESC',[req.params.id]);res.json(q.rows)});
app.post('/api/orders/:id/dhl/create',auth,async(req,res)=>res.status(501).json({error:'DHL eCommerce API bilgileri bekleniyor',code:'DHL_NOT_CONFIGURED'}));

installImportRoutes(app,pool,auth);
app.use(express.static(path.join(__dirname,'public')));
app.get('*',(req,res)=>res.sendFile(path.join(__dirname,'public','index.html')));
schema().then(async()=>{await seedTemplates(pool);app.listen(PORT,()=>console.log(`Ocean Influencer running on ${PORT}`))}).catch(e=>{console.error(e);process.exit(1)});
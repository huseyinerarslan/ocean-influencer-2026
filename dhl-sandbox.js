'use strict';
const { randomUUID } = require('node:crypto');
const BASE = 'https://testapi.mngkargo.com.tr/mngapi/api/';
const WAIT_MS = 30000;
const fail = (status, message) => Object.assign(new Error(message), { status });

function createDhlClient(env = process.env, fetcher = global.fetch) {
  const keys = ['DHL_TEST_CLIENT_ID', 'DHL_TEST_CLIENT_SECRET', 'DHL_TEST_CUSTOMER_NUMBER', 'DHL_TEST_PASSWORD'];
  const configured = () => env.DHL_MODE === 'sandbox' && keys.every(k => env[k]);
  let token, expires = 0;
  async function request(path, body, jwt) {
    let response;
    try {
      response = await fetcher(BASE + path, {
        method: body === undefined ? 'GET' : 'POST',
        redirect: 'error', signal: AbortSignal.timeout(25000),
        headers: { 'Content-Type': 'application/json',
          'X-IBM-Client-Id': env.DHL_TEST_CLIENT_ID,
          'X-IBM-Client-Secret': env.DHL_TEST_CLIENT_SECRET,
          ...(jwt ? { Authorization: 'Bearer ' + jwt } : {}) },
        ...(body === undefined ? {} : { body: JSON.stringify(body) })
      });
    } catch { throw fail(502, 'DHL yanıtı alınamadı. İşlemin sonucu kontrol edilmeden yeniden gönderilmeyecek.'); }
    if (!response.ok) {
      if (response.status === 401) expires = 0;
      // Never expose provider bodies: they may echo credentials or recipient data.
      const error = fail(502, `DHL isteği kabul etmedi (HTTP ${response.status}). Adres ve paket bilgilerini kontrol edin.`);
      error.rejected = [400, 401, 403, 422].includes(response.status);
      throw error;
    }
    try { return await response.json(); }
    catch { throw fail(502, 'DHL yanıtı okunamadı. Sonuç kontrolü gerekiyor.'); }
  }
  return {
    configured,
    async call(path, body) {
      if (!configured()) throw fail(503, 'DHL test bağlantısı henüz yapılandırılmadı.');
      if (!token || Date.now() >= expires) {
        const result = await request('token', {
          customerNumber: env.DHL_TEST_CUSTOMER_NUMBER,
          password: env.DHL_TEST_PASSWORD, identityType: 1
        });
        if (!result.jwt) throw fail(502, 'DHL test oturumu açılamadı.');
        token = result.jwt; expires = Date.now() + 240000;
      }
      return request(path, body, token);
    }
  };
}

function recipient(order) {
  for (const [field, label] of [['recipient_name','Alıcı'],['city','İl'],['district','İlçe'],['address','Açık adres']]) {
    if (!String(order[field] || '').trim()) throw fail(400, `${label} gerekli. Önce sipariş bilgilerini kaydedin.`);
  }
  if (order.address.trim().length < 15 || !/\d/.test(order.address)) {
    throw fail(400, 'Mahalle, cadde/sokak ve bina numarası içeren açık adresi kaydedin.');
  }
  return { customerId: '', refCustomerId: '', fullName: order.recipient_name.trim(),
    cityName: order.city.trim().toLocaleUpperCase('tr-TR'), districtName: order.district.trim().toLocaleUpperCase('tr-TR'),
    address: order.address.trim(), email: 'sandbox@example.com', mobilePhoneNumber: '5555555555',
    bussinessPhoneNumber: '', homePhoneNumber: '', taxOffice: '', taxNumber: '' };
}
function pieces(input, reference) {
  if (!Array.isArray(input) || input.length < 1 || input.length > 20) throw fail(400, '1–20 paket girin.');
  return input.map((x, i) => {
    const kg = Number(x.kg), desi = Number(x.desi);
    if (!Number.isFinite(kg) || !Number.isFinite(desi) || kg <= 0 || desi <= 0 || kg > 1000 || desi > 1000) {
      throw fail(400, `${i+1}. paketin kg ve desi değerleri 0’dan büyük, en fazla 1000 olmalı.`);
    }
    return { barcode: reference + 'P' + (i+1), kg, desi, content: 'Sandbox test paketi' };
  });
}
function orderPayload(reference, rec) {
  return { order: { referenceId: reference, barcode: reference, billOfLandingId: '', isCOD: 0, codAmount: 0,
    shipmentServiceType: 1, packagingType: 1, content: 'Sandbox test', smsPreference1: 0, smsPreference2: 0,
    smsPreference3: 0, paymentType: 1, deliveryType: 1, description: 'Okyanus sandbox testi',
    marketPlaceShortCode: '', marketPlaceSaleCode: '' },
    recipient: { ...rec, refCustomerId: reference },
    orderPieceList: pieces([{ kg: 2, desi: 2 }], reference) };
}
function labelResult(raw, expectedPieces) {
  const row = Array.isArray(raw) ? raw[0] : raw;
  if (!row || typeof row !== 'object') throw fail(502, 'DHL barkod yanıtı anlaşılamadı. Sonuç kontrolü gerekiyor.');
  const labels = (row.barcodes || []).filter(x => typeof x.value === 'string' && x.value.includes('^XA') && x.value.includes('^XZ'));
  if (row.shipmentId && !row.referenceBarcodeOnError && labels.length === expectedPieces) {
    return { state: 'READY', result: { shipmentId: String(row.shipmentId), invoiceId: row.invoiceId, labels } };
  }
  if (!row.shipmentId && row.referenceBarcodeOnError) return { state: 'WAITING', result: null };
  throw fail(502, 'DHL yanıtında gönderi veya paket etiketi eksik. Sonuç kontrolü gerekiyor.');
}
async function schema(pool) {
  await pool.query(`CREATE TABLE IF NOT EXISTS dhl_sandbox_shipments (
    order_id BIGINT PRIMARY KEY REFERENCES orders(id) ON DELETE CASCADE,
    reference TEXT UNIQUE NOT NULL, state TEXT NOT NULL,
    recipient JSONB NOT NULL, packages JSONB, result JSONB,
    prepared_at TIMESTAMPTZ, attempted_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`);
  await pool.query(`CREATE TABLE IF NOT EXISTS dhl_sandbox_jobs (
    order_id BIGINT PRIMARY KEY REFERENCES orders(id) ON DELETE CASCADE,
    packages JSONB NOT NULL, due_at TIMESTAMPTZ DEFAULT NOW(),
    attempts INTEGER NOT NULL DEFAULT 0, error TEXT
  )`);

  // Existing shipments and queued orders become group 1 without changing their references.
  for (const table of ['dhl_sandbox_shipments','dhl_sandbox_jobs']) {
    await pool.query(`DO $$ BEGIN
      IF NOT EXISTS (SELECT FROM pg_attribute WHERE attrelid='${table}'::regclass
                     AND attname='group_no' AND NOT attisdropped) THEN
        ALTER TABLE ${table} ADD COLUMN group_no integer NOT NULL DEFAULT 1,
          DROP CONSTRAINT ${table}_pkey, ADD PRIMARY KEY(order_id,group_no);
      END IF;
    END $$`);
  }

}
function publicState(row, configured) {
  return { mode: 'sandbox', configured: !!configured, state: row?.state || 'NEW',
    reference: row?.reference || null, recipient: row?.recipient || null,
    packages: row?.packages || null, shipmentId: row?.result?.shipmentId || null,
    retryAfter: row?.attempted_at ? Math.max(0, Math.ceil((new Date(row.attempted_at).getTime()+WAIT_MS-Date.now())/1000)) : 0 };
}
function install(app, pool, auth, requireOperations, dhl = createDhlClient()) {
  const route = '/api/orders/:id/dhl';
  const guard = [auth, requireOperations('shipping')];
  const validId = req => {
    if (!/^\d{1,9}$/.test(req.params.id)) throw fail(400, 'Geçersiz sipariş.');
    return Number(req.params.id);
  };
  const handle = fn => async (req, res) => {
    try { await fn(req, res); }
    catch (e) { res.status(e.status || 500).json({ error: e.status ? e.message : 'DHL test işlemi tamamlanamadı. Kaydı yeniden açıp durumu kontrol edin.' }); }
  };
  // Session advisory lock serializes repeated clicks across server instances; persisted states survive crashes.
  async function locked(id, fn) {
    const db = await pool.connect(); let acquired = false;
    try {
      const lock = await db.query('SELECT pg_try_advisory_lock(32685, $1) AS locked', [id]);
      acquired = lock.rows[0].locked;
      if (!acquired) throw fail(409, 'Bu sipariş için DHL işlemi devam ediyor. Biraz sonra durumu yenileyin.');
      return await fn(db);
    } finally {
      if (acquired) {
        try { await db.query('SELECT pg_advisory_unlock(32685, $1)', [id]); }
        catch (e) { db.release(true); throw fail(500, 'DHL işlem kilidi kapatılamadı. Durumu yenileyin.'); }
      }
      db.release();
    }
  }
  async function get(db, id, group=1) { return (await db.query('SELECT * FROM dhl_sandbox_shipments WHERE order_id=$1 AND group_no=$2', [id,group])).rows[0]; }
  async function state(db, id, value, group) {
    await db.query('UPDATE dhl_sandbox_shipments SET state=$2, updated_at=NOW() WHERE order_id=$1 AND group_no=$3', [id, value, group]);
  }
  app.get('/api/dhl/label-progress', ...guard, handle(async (req,res) => {
    const {rows} = await pool.query(`SELECT j.order_id,j.error FROM dhl_sandbox_jobs j
      LEFT JOIN dhl_sandbox_shipments s ON s.order_id=j.order_id AND s.group_no=j.group_no WHERE s.state IS DISTINCT FROM 'READY'`);
    res.set('Cache-Control','no-store');
    res.json(rows);
  }));
  app.get('/api/dhl/ready-labels', ...guard, handle(async (req,res) => {
    const rows=await pool.query("SELECT order_id,reference FROM dhl_sandbox_shipments WHERE state='READY' AND group_no=1 AND NOT EXISTS (SELECT 1 FROM dhl_sandbox_jobs j LEFT JOIN dhl_sandbox_shipments x USING(order_id,group_no) WHERE j.order_id=dhl_sandbox_shipments.order_id AND x.state IS DISTINCT FROM 'READY') ORDER BY order_id DESC");
    res.set('Cache-Control','no-store');res.json(rows.rows);
  }));
  app.get(route, ...guard, handle(async (req,res) => {
    const id = validId(req);
    const data = publicState(await get(pool,id), dhl.configured());
    const job = (await pool.query('SELECT due_at,error,packages FROM dhl_sandbox_jobs WHERE order_id=$1 AND group_no=1',[id])).rows[0];
    const extras = (await pool.query(`SELECT k.group_no, s.state, j.error FROM (
      SELECT group_no FROM dhl_sandbox_jobs WHERE order_id=$1 AND group_no>1 UNION
      SELECT group_no FROM dhl_sandbox_shipments WHERE order_id=$1 AND group_no>1
    ) k LEFT JOIN dhl_sandbox_jobs j ON j.order_id=$1 AND j.group_no=k.group_no
    LEFT JOIN dhl_sandbox_shipments s ON s.order_id=$1 AND s.group_no=k.group_no ORDER BY k.group_no`,[id])).rows;
    res.json({...data, extras, preparing: !!job?.due_at && data.state !== 'READY', autoError: job?.error, plannedPackages: job?.packages});
  }));
  async function prepare(id, group=1) {
    if (!dhl.configured()) throw fail(503, 'DHL test bağlantısı henüz yapılandırılmadı.');
    return locked(id, async db => {
      let row = await get(db,id,group);
      if (row && !['REJECTED'].includes(row.state)) {
        if (['CREATING','UNKNOWN'].includes(row.state)) throw fail(409, `Önceki isteğin sonucu belirsiz. DHL’ye ${row.reference} referansıyla sorulmalı; ikinci sipariş oluşturulmadı.`);
        return row;
      }
      const order = (await db.query('SELECT * FROM orders WHERE id=$1', [id])).rows[0];
      if (!order) throw fail(404,'Sipariş bulunamadı.');
      const rec = group===1 ? recipient(order) : (await get(db,id,1)).recipient;
      const reference = row?.reference || 'OKYTEST'+randomUUID().replace(/-/g,'').slice(0,16).toUpperCase();
      await db.query(`INSERT INTO dhl_sandbox_shipments(order_id,reference,state,recipient,group_no) VALUES($1,$2,'CREATING',$3::jsonb,$4)
        ON CONFLICT(order_id,group_no) DO UPDATE SET state='CREATING',recipient=EXCLUDED.recipient,updated_at=NOW()`, [id,reference,JSON.stringify(rec),group]);
      try {
        const raw = await dhl.call('standardcmdapi/createOrder',orderPayload(reference,rec));
        const result = Array.isArray(raw) ? raw[0] : raw;
        if (result?.referenceId !== reference || !result.orderInvoiceId) throw fail(502,'DHL sipariş yanıtı doğrulanamadı. Sonuç kontrolü gerekiyor.');
        await db.query("UPDATE dhl_sandbox_shipments SET state='PREPARED',prepared_at=NOW(),attempted_at=NOW(),updated_at=NOW() WHERE order_id=$1 AND group_no=$2",[id,group]);
      } catch(e) { await state(db,id,e.rejected ? 'REJECTED' : 'UNKNOWN',group); throw e; }
      return get(db,id,group);
    });
  }
  async function create(id, input, group=1) {
    return locked(id, async db => {
      let row=await get(db,id,group);
      if(row?.state==='READY') return row; // No additional remote creation, even after reload.
      if(!row || ['REJECTED'].includes(row.state)) throw fail(409,'Önce adresi DHL test ortamına gönderin.');
      if(!['PREPARED','WAITING'].includes(row.state)) throw fail(409,`İşlem sonucu kontrol edilmeli. DHL referansı: ${row.reference}. Yeni istek gönderilmedi.`);
      if(publicState(row,true).retryAfter>0) throw fail(409,'DHL adresi işliyor. En az 30 saniye sonra barkodu tekrar deneyin.');
      const packages=pieces(input,row.reference);
      if(row.packages && !require('node:util').isDeepStrictEqual(row.packages, packages)) throw fail(409,'İlk barkod isteğinden sonra paket bilgileri değiştirilemez.');
      await db.query("UPDATE dhl_sandbox_shipments SET state='LABEL_CREATING',packages=$2::jsonb,attempted_at=NOW(),updated_at=NOW() WHERE order_id=$1 AND group_no=$3",[id,JSON.stringify(packages),group]);
      try {
        const raw=await dhl.call('barcodecmdapi/createbarcode',{referenceId:row.reference,billOfLandingId:'',isCOD:0,codAmount:0,
          printReferenceBarcodeOnError:1,message:'Sandbox test',additionalContent1:'',additionalContent2:'',additionalContent3:'',additionalContent4:'',orderPieceList:packages});
        const outcome=labelResult(raw,packages.length);
        await db.query('UPDATE dhl_sandbox_shipments SET state=$2,result=$3::jsonb,updated_at=NOW() WHERE order_id=$1 AND group_no=$4',[id,outcome.state,JSON.stringify(outcome.result),group]);
      } catch(e) { await state(db,id,e.rejected ? 'WAITING' : 'LABEL_UNKNOWN',group); throw e; }
      return get(db,id,group);
    });
  }
  for (const [path, action] of [['/prepare', id=>prepare(id)], ['/create', create]]) {
    app.post(route+path, ...guard, handle(async (req,res) => {
      if (req.body?.sandbox !== true) throw fail(400,'DHL test ortamı seçilmelidir.');
      res.json(publicState(await action(validId(req), req.body.packages), dhl.configured()));
    }));
  }
  app.post(route+'/extra', ...guard, handle(async(req,res)=>{
    const id=validId(req), group=req.body?.group;
    if(req.body?.sandbox!==true || ![2,3].includes(group)) throw fail(400,'Geçersiz test paketi.');
    await locked(id,async db=>{
      const first=await get(db,id);
      if(first?.state!=='READY') throw fail(409,'Önce ilk barkodun hazırlanmasını bekleyin.');
      const count=first.result.labels.length;
      if(group<=count) throw fail(409,'Bu paket ilk etiketler arasında.');
      if(await get(db,id,group)) return;
      if(group>count+1 && (await get(db,id,group-1))?.state!=='READY') throw fail(409,'Önce önceki paketin hazırlanmasını bekleyin.');
      await db.query(`INSERT INTO dhl_sandbox_jobs(order_id,group_no,packages) VALUES($1,$2,$3::jsonb)
        ON CONFLICT(order_id,group_no) DO NOTHING`,[id,group,JSON.stringify([{kg:2,desi:2}])]);
    });
    res.json({group});
  }));
  app.get(route+'/label', ...guard, handle(async(req,res) => {
    const id=validId(req), group=Number(req.query?.group || 1);
    if(![1,2,3].includes(group))throw fail(400,'Geçersiz paket.');
    const row=await get(pool,id,group);
    if(row?.state!=='READY') throw fail(409,'Gönderi etiketi henüz hazır değil.');
    res.set('Cache-Control','no-store');
    res.set('Content-Disposition',`attachment; filename="DHL-TEST-${row.reference}.zpl"`);
    const labels=[...row.result.labels];
    if(req.query && !req.query.group){
      const extras=await pool.query(`SELECT result FROM dhl_sandbox_shipments WHERE order_id=$1 AND group_no>1 AND state='READY' ORDER BY group_no`,[id]);
      if((await pool.query(`SELECT 1 FROM dhl_sandbox_jobs j LEFT JOIN dhl_sandbox_shipments s USING(order_id,group_no) WHERE j.order_id=$1 AND j.group_no>1 AND s.state IS DISTINCT FROM 'READY' LIMIT 1`,[id])).rowCount) throw fail(409,'Ek paket henüz hazır değil.');
      for(const extra of extras.rows)labels.push(...extra.result.labels);
    }
    res.type('text/plain').send(labels.map(x=>x.value).join('\n'));
  }));
  return {prepare, create};

}
module.exports={createDhlClient,recipient,pieces,orderPayload,labelResult,publicState,schema,install};

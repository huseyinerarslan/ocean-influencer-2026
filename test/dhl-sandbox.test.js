'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const {createDhlClient,recipient,pieces,orderPayload,labelResult,install} = require('../dhl-sandbox');
const sample={recipient_name:'TEST',city:'Zonguldak',district:'Ereğli',address:'Örnek Mahallesi Test Sokak No: 1'};
const env={DHL_MODE:'sandbox',DHL_TEST_CLIENT_ID:'test',DHL_TEST_CLIENT_SECRET:'test',DHL_TEST_CUSTOMER_NUMBER:'test',DHL_TEST_PASSWORD:'test'};
test('only sandbox endpoint; no redirects; tokens and SMS remain server-side',async()=>{
  const requests=[];
  const client=createDhlClient(env,async(url,options)=>{requests.push({url,options});return {ok:true,json:async()=>url.endsWith('/token')?{jwt:'private-token'}:{ok:true}};});
  await client.call('standardcmdapi/createOrder',orderPayload('OKYTEST1',recipient(sample)));
  assert.equal(requests.length,2);
  assert.ok(requests.every(x=>x.url.startsWith('https://testapi.mngkargo.com.tr/mngapi/api/')));
  assert.equal(requests[1].options.redirect,'error');
  const body=JSON.parse(requests[1].options.body);
  assert.deepEqual([body.order.smsPreference1,body.order.smsPreference2,body.order.smsPreference3],[0,0,0]);
  assert.equal(body.order.barcode,body.order.referenceId);
  assert.equal(createDhlClient({...env,DHL_MODE:'production'}).configured(),false);
});
test('invalid address and packages rejected',()=>{
  assert.throws(()=>recipient({...sample,address:'Test'}));
  assert.throws(()=>recipient({...sample,city:''}));
  for(const input of [[],[{kg:0,desi:1}],[{kg:1,desi:Infinity}],Array(21).fill({kg:1,desi:1})])assert.throws(()=>pieces(input,'R'));
  assert.equal(pieces([{kg:1,desi:2},{kg:3,desi:4}],'R')[1].barcode,'RP2');
});
test('fallback order barcode is not shipment success',()=>{
  assert.equal(labelResult([{shipmentId:null,referenceBarcodeOnError:'Varış yok',barcodes:[{value:'^XA^XZ'}]}],1).state,'WAITING');
  assert.equal(labelResult([{shipmentId:'123',referenceBarcodeOnError:'',barcodes:[{value:'^XA^XZ'}]}],1).state,'READY');
  assert.throws(()=>labelResult([{shipmentId:'123',barcodes:[{value:'^XA^XZ'}]}],2));
});
function harness() {
  let row,locked=false,calls=0,behavior='ok';
  const routes={};
  const db={release(){},async query(sql,p=[]){
    if(sql.includes('pg_try_advisory_lock')){const old=locked;locked=true;return {rows:[{locked:!old}]};}
    if(sql.includes('pg_advisory_unlock')){locked=false;return {rows:[]};}
    if(sql.startsWith('SELECT * FROM orders'))return {rows:[sample]};
    if(sql.startsWith('SELECT * FROM dhl_sandbox_shipments'))return {rows:row?[row]:[]};
    if(sql.startsWith('INSERT INTO')){row={order_id:p[0],reference:p[1],state:'CREATING',recipient:JSON.parse(p[2])};return {rows:[]};}
    if(sql.includes("state='PREPARED'")){row.state='PREPARED';row.attempted_at=new Date();}
    else if(sql.includes("state='LABEL_CREATING'")){row.state='LABEL_CREATING';row.packages=JSON.parse(p[1]);row.attempted_at=new Date();}
    else if(sql.includes('result=$3')){row.state=p[1];row.result=JSON.parse(p[2]);}
    else if(sql.startsWith('UPDATE')){row.state=p[1];}
    else throw Error('Unexpected SQL');
    return {rows:[]};
  }};
  const pool={query:db.query,connect:async()=>db};
  const app={get:(path,...handlers)=>routes['GET '+path]=handlers,post:(path,...handlers)=>routes['POST '+path]=handlers};
  const auth=()=>{}, permission=()=>{};
  const dhl={configured:()=>true,async call(path,body){calls++;
    if(behavior==='timeout')throw Error('network');
    if(path.includes('createOrder'))return [{referenceId:body.order.referenceId,orderInvoiceId:'1'}];
    if(behavior==='fallback')return [{shipmentId:null,referenceBarcodeOnError:'Varış yok',barcodes:[]}];
    return [{shipmentId:'123',referenceBarcodeOnError:'',barcodes:[{value:'^XA^XZ'}]}];
  }};
  install(app,pool,auth,k=>{assert.equal(k,'shipping');return permission;},dhl);
  for(const handlers of Object.values(routes)){assert.equal(handlers[0],auth);assert.equal(handlers[1],permission);}
  return {get row(){return row},get calls(){return calls},set behavior(x){behavior=x},
    async run(suffix,body={sandbox:true}){const r={code:200,status(n){this.code=n;return this},json(data){this.data=data},set(){},type(){return this},send(data){this.data=data}};
      const handlers=routes[(suffix==='/label'?'GET':'POST')+' /api/orders/:id/dhl'+suffix];await handlers.at(-1)({params:{id:'1'},body},r);return r;}};
}
test('prepare, delay, label, repeated clicks reuse single test shipment',async()=>{
  const h=harness();assert.equal((await h.run('/prepare')).data.state,'PREPARED');
  await h.run('/prepare');assert.equal(h.calls,1);
  assert.equal((await h.run('/create',{sandbox:true,packages:[{kg:1,desi:1}]})).code,409);
  h.row.attempted_at=new Date(Date.now()-31000);
  assert.equal((await h.run('/create',{sandbox:true,packages:[{kg:1,desi:1}]})).data.state,'READY');
  await h.run('/create');assert.equal(h.calls,2);
  assert.equal((await h.run('/label')).data,'^XA^XZ');
});
test('uncertain provider responses block duplicate order and label calls',async()=>{
  const h=harness();h.behavior='timeout';await h.run('/prepare');
  assert.equal(h.row.state,'UNKNOWN');await h.run('/prepare');assert.equal(h.calls,1);
  const b=harness();await b.run('/prepare');b.row.attempted_at=new Date(Date.now()-31000);b.behavior='timeout';
  await b.run('/create',{sandbox:true,packages:[{kg:1,desi:1}]});assert.equal(b.row.state,'LABEL_UNKNOWN');
  await b.run('/create',{sandbox:true,packages:[{kg:1,desi:1}]});assert.equal(b.calls,2);
});
test('fallback can retry same reference; changing packages after request is blocked',async()=>{
  const h=harness();await h.run('/prepare');h.row.attempted_at=new Date(Date.now()-31000);h.behavior='fallback';
  await h.run('/create',{sandbox:true,packages:[{kg:1,desi:1}]});assert.equal(h.row.state,'WAITING');
  assert.equal((await h.run('/label')).code,409);h.row.attempted_at=new Date(Date.now()-31000);
  assert.equal((await h.run('/create',{sandbox:true,packages:[{kg:2,desi:1}]})).code,409);
  h.behavior='ok';await h.run('/create',{sandbox:true,packages:[{kg:1,desi:1}]});assert.equal(h.row.state,'READY');
});

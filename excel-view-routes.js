'use strict';
const multer=require('multer');
const XLSX=require('xlsx');
const upload=multer({storage:multer.memoryStorage(),limits:{fileSize:20*1024*1024}});
const VISIBLE_SHEETS=['INFLUENCER GÖNDERİMLERİ','Adres Defteri','Çoklu Adresler','SAP','DHL','İRSALİYE NO'];

async function ensure(pool){
  await pool.query(`
    CREATE TABLE IF NOT EXISTS excel_snapshots(
      id BIGSERIAL PRIMARY KEY,
      file_name TEXT NOT NULL,
      uploaded_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS excel_snapshot_sheets(
      id BIGSERIAL PRIMARY KEY,
      snapshot_id BIGINT REFERENCES excel_snapshots(id) ON DELETE CASCADE,
      sheet_name TEXT NOT NULL,
      headers JSONB NOT NULL,
      rows JSONB NOT NULL,
      row_count INT NOT NULL DEFAULT 0
    );
  `);
}

function cleanCell(v){
  if(v===null||v===undefined)return'';
  if(v instanceof Date)return v.toISOString().slice(0,10);
  return String(v).replace(/\u00a0/g,' ').trim();
}
function uniqueHeaders(raw){
  const seen={};
  return raw.map((h,i)=>{
    let k=cleanCell(h)||`Kolon ${i+1}`;
    if(seen[k]){seen[k]++;k=`${k} (${seen[k]})`} else seen[k]=1;
    return k;
  });
}

function installExcelViewRoutes(app,pool,auth){
  app.get('/api/excel/latest',auth,async(req,res)=>{
    await ensure(pool);
    const s=await pool.query('SELECT * FROM excel_snapshots ORDER BY uploaded_at DESC,id DESC LIMIT 1');
    if(!s.rowCount)return res.json({snapshot:null,sheets:[]});
    const sh=await pool.query('SELECT sheet_name,headers,rows,row_count FROM excel_snapshot_sheets WHERE snapshot_id=$1 ORDER BY id',[s.rows[0].id]);
    res.json({snapshot:s.rows[0],sheets:sh.rows});
  });

  app.post('/api/excel/snapshot',auth,upload.single('excel'),async(req,res)=>{
    if(!req.file)return res.status(400).json({error:'Excel dosyası gerekli'});
    await ensure(pool);
    const wb=XLSX.read(req.file.buffer,{type:'buffer',cellDates:true});
    const client=await pool.connect();
    try{
      await client.query('BEGIN');
      const snap=await client.query('INSERT INTO excel_snapshots(file_name) VALUES($1) RETURNING *',[req.file.originalname||'excel.xlsx']);
      const snapshotId=snap.rows[0].id;
      for(const name of VISIBLE_SHEETS){
        const ws=wb.Sheets[name]; if(!ws)continue;
        const data=XLSX.utils.sheet_to_json(ws,{header:1,defval:'',raw:false});
        if(!data.length)continue;
        let headerRow=0;
        if(name==='INFLUENCER GÖNDERİMLERİ')headerRow=2;
        if(name==='DHL')headerRow=1;
        const headers=uniqueHeaders(data[headerRow]||[]);
        const rows=data.slice(headerRow+1).filter(r=>r.some(v=>cleanCell(v)!=='')).map(r=>{
          const obj={}; headers.forEach((h,i)=>obj[h]=cleanCell(r[i])); return obj;
        });
        await client.query('INSERT INTO excel_snapshot_sheets(snapshot_id,sheet_name,headers,rows,row_count) VALUES($1,$2,$3::jsonb,$4::jsonb,$5)',[snapshotId,name,JSON.stringify(headers),JSON.stringify(rows),rows.length]);
      }
      await client.query('COMMIT');
      res.json({ok:true,snapshot_id:snapshotId});
    }catch(e){await client.query('ROLLBACK');res.status(500).json({error:e.message})}finally{client.release()}
  });

  app.get('/excel-data',(req,res)=>{
    res.type('html').send(`<!doctype html><html lang="tr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Son Excel Verileri</title><style>body{font-family:system-ui;background:#f4f7fb;color:#172033;margin:0;padding:24px}.wrap{max-width:1500px;margin:auto}.top{display:flex;justify-content:space-between;gap:16px;align-items:center;flex-wrap:wrap}.card{background:#fff;border:1px solid #dfe6ef;border-radius:16px;padding:18px;margin:14px 0}.tabs{display:flex;gap:8px;overflow:auto}.tabs button{white-space:nowrap;border:1px solid #d8e1eb;background:white;border-radius:10px;padding:10px 12px;cursor:pointer}.tabs button.active{background:#174f7a;color:white}.tablewrap{overflow:auto;max-height:68vh}.table{border-collapse:collapse;width:max-content;min-width:100%}.table th,.table td{border-bottom:1px solid #edf1f5;padding:8px 10px;text-align:left;white-space:nowrap;max-width:420px;overflow:hidden;text-overflow:ellipsis}.table th{position:sticky;top:0;background:#f8fafc}.muted{color:#718096}input,button{font:inherit}.upload{display:flex;gap:8px;align-items:center;flex-wrap:wrap}.primary{background:#174f7a;color:white;border:0;border-radius:10px;padding:10px 14px;cursor:pointer}</style></head><body><div class="wrap"><div class="top"><div><h1>Son Excel Verileri</h1><div id="meta" class="muted">Yükleniyor…</div></div><div><a href="/">Uygulamaya dön</a> · <a href="/manage">Veri Yönetimi</a></div></div><div class="card"><div class="upload"><input id="f" type="file" accept=".xlsx,.xls"><button class="primary" onclick="uploadExcel()">Yeni Excel Snapshot Yükle</button><span id="msg" class="muted"></span></div></div><div class="card"><div id="tabs" class="tabs"></div><div id="content" class="tablewrap"></div></div></div><script>let data=null,active=0;async function api(u,o={}){const r=await fetch(u,o);const d=await r.json().catch(()=>({}));if(!r.ok)throw Error(d.error||'Hata');return d}function esc(v){return String(v??'').replace(/[&<>\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[c]))}async function load(){try{data=await api('/api/excel/latest');if(!data.snapshot){document.getElementById('meta').textContent='Henüz Excel snapshot yok.';return}document.getElementById('meta').textContent=data.snapshot.file_name+' · '+new Date(data.snapshot.uploaded_at).toLocaleString('tr-TR');render()}catch(e){document.getElementById('meta').textContent='Önce ana uygulamada giriş yapmalısın.'}}function render(){const tabs=document.getElementById('tabs');tabs.innerHTML=data.sheets.map((s,i)=>'<button class="'+(i===active?'active':'')+'" onclick="active='+i+';render()">'+esc(s.sheet_name)+' ('+s.row_count+')</button>').join('');const s=data.sheets[active];if(!s){document.getElementById('content').innerHTML='<p>Veri yok.</p>';return}const headers=s.headers||[];const rows=s.rows||[];document.getElementById('content').innerHTML='<table class="table"><thead><tr>'+headers.map(h=>'<th>'+esc(h)+'</th>').join('')+'</tr></thead><tbody>'+rows.slice(0,2000).map(r=>'<tr>'+headers.map(h=>'<td title="'+esc(r[h])+'">'+esc(r[h])+'</td>').join('')+'</tr>').join('')+'</tbody></table>'+(rows.length>2000?'<p class="muted">İlk 2000 satır gösteriliyor.</p>':'')}async function uploadExcel(){const f=document.getElementById('f').files[0];if(!f)return;const fd=new FormData();fd.append('excel',f);document.getElementById('msg').textContent='Yükleniyor…';try{await api('/api/excel/snapshot',{method:'POST',body:fd});document.getElementById('msg').textContent='Kaydedildi.';await load()}catch(e){document.getElementById('msg').textContent=e.message}}load()</script></body></html>`);
  });
}
module.exports={installExcelViewRoutes};

'use strict';
const multer=require('multer');
const XLSX=require('xlsx');
const upload=multer({storage:multer.memoryStorage(),limits:{fileSize:15*1024*1024}});
function clean(v){if(v===undefined||v===null)return'';return String(v).replace(/\u00a0/g,' ').replace(/\s+/g,' ').trim()}
function phone(v){const s=clean(v);return s.endsWith('.0')?s.slice(0,-2):s}
function norm(v){return clean(v).toLocaleLowerCase('tr-TR')}
function installImportRoutes(app,pool,auth){
  app.get('/import',(req,res)=>res.redirect('/import.html'));
  app.post('/api/import/excel',upload.single('excel'),async(req,res)=>{
    if(!req.file)return res.status(400).send('Excel dosyası gerekli');
    try{
      const wb=XLSX.read(req.file.buffer,{type:'buffer',cellDates:false});
      const rows=[];
      for(const sn of ['Adres Defteri','Çoklu Adresler']){
        const ws=wb.Sheets[sn]; if(!ws)continue;
        const data=XLSX.utils.sheet_to_json(ws,{header:1,defval:''});
        for(let i=1;i<data.length;i++){
          const r=data[i]||[]; const name=clean(r[0]); if(!name)continue;
          rows.push({name,district:clean(r[1]),city:clean(r[2]),address:clean(r[3]),postal_code:clean(r[4]),phone:phone(r[5])});
        }
      }
      const existing=(await pool.query('SELECT id,name,phone,city,district,postal_code,address FROM contacts')).rows;
      const keys=new Set(existing.map(x=>norm(x.name)+'|'+norm(x.address)));
      let added=0,skipped=0;
      const c=await pool.connect();
      try{
        await c.query('BEGIN');
        for(const x of rows){
          const k=norm(x.name)+'|'+norm(x.address);
          if(keys.has(k)){skipped++;continue}
          await c.query('INSERT INTO contacts(name,phone,city,district,postal_code,address) VALUES($1,$2,$3,$4,$5,$6)',[x.name,x.phone,x.city,x.district,x.postal_code,x.address]);
          keys.add(k);added++;
        }
        await c.query('COMMIT');
      }catch(e){await c.query('ROLLBACK');throw e}finally{c.release()}
      res.type('html').send('<!doctype html><html lang="tr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Aktarım Tamamlandı</title></head><body style="font-family:system-ui;padding:22px"><h1>Aktarım tamamlandı</h1><p><b>'+added+'</b> kişi/adres eklendi.</p><p><b>'+skipped+'</b> kayıt zaten vardı.</p><p>Yazı şablonlarına dokunulmadı; yaptığın düzenlemeler korunuyor.</p><p><a href="/">Uygulamaya dön</a> · <a href="/import">Başka Excel aktar</a></p></body></html>');
    }catch(e){res.status(500).send('Aktarım hatası: '+String(e.message||e))}
  });
}
module.exports={installImportRoutes};
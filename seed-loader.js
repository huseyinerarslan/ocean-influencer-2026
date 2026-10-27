'use strict';
const fs=require('fs');
const path=require('path');

function loadChunks(prefix){
  const dir=path.join(__dirname,'seed');
  if(!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir)
    .filter(x=>x.startsWith(prefix+'-')&&x.endsWith('.json'))
    .sort()
    .flatMap(x=>JSON.parse(fs.readFileSync(path.join(dir,x),'utf8')));
}

async function seedBaseData(pool){
  await pool.query('ALTER TABLE letter_templates ADD COLUMN IF NOT EXISTS layout_json JSONB');

  const contacts=loadChunks('contacts');
  const templates=loadChunks('templates');

  const contactCount=Number((await pool.query('SELECT COUNT(*) c FROM contacts')).rows[0].c||0);
  if(contactCount===0 && contacts.length){
    const c=await pool.connect();
    try{
      await c.query('BEGIN');
      for(const x of contacts){
        await c.query(
          'INSERT INTO contacts(name,phone,city,district,postal_code,address) VALUES($1,$2,$3,$4,$5,$6)',
          [x.name||'',x.phone||'',x.city||'',x.district||'',x.postal_code||'',x.address||'']
        );
      }
      await c.query('COMMIT');
      console.log(`Seeded ${contacts.length} contacts`);
    }catch(e){await c.query('ROLLBACK');throw e}finally{c.release()}
  }

  if(templates.length){
    for(const x of templates){
      await pool.query(
        `INSERT INTO letter_templates(template_no,title,body,layout_json)
         VALUES($1,$2,$3,$4::jsonb)
         ON CONFLICT(template_no) DO UPDATE SET title=EXCLUDED.title,body=EXCLUDED.body,layout_json=EXCLUDED.layout_json,updated_at=NOW()`,
        [x.template_no||'',x.title||'',x.body||'',JSON.stringify(x.layout||{})]
      );
    }
    console.log(`Seeded/updated ${templates.length} templates`);
  }
}

module.exports={seedBaseData};

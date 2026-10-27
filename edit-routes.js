'use strict';

function installEditRoutes(app,pool,auth){
  app.patch('/api/contacts/:id',auth,async(req,res)=>{
    const x=req.body||{};
    const q=await pool.query(`UPDATE contacts SET
      name=COALESCE(NULLIF($1,''),name),
      phone=$2, city=$3, district=$4, postal_code=$5, address=$6,
      updated_at=NOW()
      WHERE id=$7 RETURNING *`,[
      String(x.name||'').trim(),x.phone||'',x.city||'',x.district||'',x.postal_code||'',x.address||'',req.params.id
    ]);
    if(!q.rowCount)return res.status(404).json({error:'Kişi bulunamadı'});
    res.json(q.rows[0]);
  });

  app.patch('/api/templates/:id',auth,async(req,res)=>{
    const x=req.body||{};
    const q=await pool.query(`UPDATE letter_templates SET
      template_no=COALESCE(NULLIF($1,''),template_no),
      title=$2, body=$3, updated_at=NOW()
      WHERE id=$4 RETURNING *`,[
      String(x.template_no||'').trim(),x.title||'',x.body||'',req.params.id
    ]);
    if(!q.rowCount)return res.status(404).json({error:'Şablon bulunamadı'});
    res.json(q.rows[0]);
  });
}

module.exports={installEditRoutes};

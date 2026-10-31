(()=>{
  'use strict';
  let replacements=[];
  let loading=false;

  async function loadMap(){
    if(loading||replacements.length)return;
    loading=true;
    try{
      const r=await fetch('/api/orders',{credentials:'same-origin'});
      if(!r.ok)return;
      const orders=await r.json();
      const byName=new Map();
      (orders||[]).forEach(o=>(o.items||[]).forEach(it=>{
        const name=String(it.item_name||'').trim();
        const code=String(it.item_code||'').trim();
        if(!name||!code||name===code)return;
        if(!byName.has(name))byName.set(name,new Set());
        byName.get(name).add(code);
      }));
      replacements=[...byName.entries()]
        .filter(([,codes])=>codes.size===1)
        .map(([name,codes])=>[name,[...codes][0]])
        .sort((a,b)=>b[0].length-a[0].length);
      apply();
    }catch(e){console.warn('Report item code map failed',e)}
    finally{loading=false}
  }

  function swapText(s){
    let out=String(s??'');
    for(const [name,code] of replacements){
      if(out.includes(name))out=out.split(name).join(code);
    }
    return out;
  }

  function apply(){
    const root=document.getElementById('reports');
    if(!root||!replacements.length)return;

    const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);
    const nodes=[];
    while(walker.nextNode())nodes.push(walker.currentNode);
    nodes.forEach(n=>{
      const next=swapText(n.nodeValue);
      if(next!==n.nodeValue)n.nodeValue=next;
    });

    root.querySelectorAll('[title]').forEach(el=>{
      const old=el.getAttribute('title')||'';
      const next=swapText(old);
      if(next!==old)el.setAttribute('title',next);
    });
  }

  const observer=new MutationObserver(()=>{
    if(!document.getElementById('reports'))return;
    if(!replacements.length)loadMap(); else apply();
  });

  function init(){
    loadMap();
    apply();
    observer.observe(document.body,{childList:true,subtree:true,characterData:true});
    document.querySelector('.side [data-v="reports"]')?.addEventListener('click',()=>setTimeout(()=>{loadMap();apply()},120));
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();

(()=>{
  'use strict';

  const COLORS=['#1b5b84','#2f789f','#4a91b2','#6aa9c4','#8fc0d4','#b4d5e2'];
  let ordersCache=null;
  let rendering=false;
  let timer=null;

  const dateKey=v=>{const m=String(v||'').match(/^(\d{4})-(\d{2})-(\d{2})/);return m?`${m[1]}-${m[2]}-${m[3]}`:''};

  function canonicalCity(value){
    const raw=String(value||'').trim().replace(/\s+/g,' ');
    if(!raw)return 'Bilinmiyor';
    return raw
      .toLocaleLowerCase('tr-TR')
      .split(' ')
      .map(part=>part ? part.charAt(0).toLocaleUpperCase('tr-TR')+part.slice(1) : '')
      .join(' ');
  }

  async function getOrders(){
    if(ordersCache)return ordersCache;
    const r=await fetch('/api/orders',{credentials:'same-origin'});
    if(!r.ok)throw new Error('Şehir raporu verileri alınamadı');
    ordersCache=(await r.json()).filter(o=>o.status!=='ARCHIVED');
    return ordersCache;
  }

  function periodOrders(orders){
    const period=document.getElementById('prPeriod')?.value||'all';
    const from=document.getElementById('prFrom')?.value||'';
    const to=document.getElementById('prTo')?.value||'';
    const now=new Date();
    let cutoff='';
    if(['30','90','365'].includes(period)){
      const d=new Date(now);
      d.setDate(d.getDate()-Number(period));
      cutoff=d.toISOString().slice(0,10);
    }
    return orders.filter(o=>{
      const k=dateKey(o.order_date);
      if(period==='custom'){
        if(from&&k<from)return false;
        if(to&&k>to)return false;
        return true;
      }
      if(cutoff&&k<cutoff)return false;
      return true;
    });
  }

  async function render(){
    const box=document.getElementById('prCities');
    if(!box||rendering)return;
    rendering=true;
    try{
      const orders=periodOrders(await getOrders());
      const map=new Map();
      orders.forEach(o=>{
        const name=canonicalCity(o.city);
        const key=name.toLocaleLowerCase('tr-TR');
        if(!map.has(key))map.set(key,{name,value:0});
        map.get(key).value+=1;
      });
      const cities=[...map.values()].sort((a,b)=>b.value-a.value||a.name.localeCompare(b.name,'tr'));
      const top=cities.slice(0,5);
      const total=orders.length||1;
      let acc=0;
      const stops=top.map((c,i)=>{
        const start=acc;
        acc+=c.value/total*100;
        return `${COLORS[i%COLORS.length]} ${start.toFixed(1)}% ${acc.toFixed(1)}%`;
      });
      if(acc<100)stops.push(`#e9eef3 ${acc.toFixed(1)}% 100%`);
      box.innerHTML=`<div class="pr-donut-wrap city-normalized"><div class="pr-donut" style="background:conic-gradient(${stops.join(',')})"><div class="pr-donut-center"><div><b>${orders.length}</b><span>gönderim</span></div></div></div><div class="pr-legend">${top.map((c,i)=>`<div class="pr-legend-row"><span class="pr-dot" style="background:${COLORS[i%COLORS.length]}"></span><span class="pr-legend-name">${c.name}</span><span class="pr-legend-val">${Math.round(c.value/total*100)}%</span></div>`).join('')||'<span class="pr-panel-sub">Veri yok.</span>'}</div></div>`;
    }catch(e){
      console.warn('City normalize failed',e);
    }finally{
      rendering=false;
    }
  }

  function schedule(){
    clearTimeout(timer);
    timer=setTimeout(render,80);
  }

  function bind(){
    const box=document.getElementById('prCities');
    if(!box){setTimeout(bind,100);return;}

    ['prPeriod','prFrom','prTo'].forEach(id=>{
      document.getElementById(id)?.addEventListener('change',()=>{
        ordersCache=null;
        schedule();
      });
    });

    const obs=new MutationObserver(()=>{
      if(rendering)return;
      const normalized=box.querySelector('.city-normalized');
      if(!normalized)schedule();
    });
    obs.observe(box,{childList:true,subtree:true});

    render();
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bind);else bind();
})();

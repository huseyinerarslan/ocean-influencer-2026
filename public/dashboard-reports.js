(()=>{
  'use strict';

  const norm=s=>String(s||'').trim().toLocaleLowerCase('tr-TR');
  const esc=s=>String(s??'').replace(/[&<>\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[c]));

  const css=document.createElement('style');
  css.id='dashboard-reports-style';
  css.textContent=`
    .side [data-v="reports"]{display:none!important}
    #dashboard.dashboard-intelligence{display:none}
    #dashboard.dashboard-intelligence.active{display:block}
    #dashboard.dashboard-intelligence>.stats,
    #dashboard.dashboard-intelligence>.grid{display:none!important}

    .pr-filterbar .pr-search-shell{
      width:250px;height:36px;display:flex;align-items:center;gap:7px;
      padding:0 8px 0 10px;border:1px solid #d9e3ec;border-radius:10px;
      background:#fff;transition:border-color .16s ease,box-shadow .16s ease,transform .16s ease,background .16s ease;
      position:relative;z-index:45;overflow:visible
    }
    .pr-filterbar .pr-search-shell:focus-within{
      border-color:#4d94b8;background:#fbfdff;
      box-shadow:0 0 0 4px rgba(47,120,159,.12),0 7px 18px rgba(16,36,58,.07);
      transform:translateY(-1px)
    }
    .pr-search-icon{width:18px;height:18px;display:grid;place-items:center;position:relative;flex:0 0 18px}
    .pr-search-icon:before{content:'';width:8px;height:8px;border:1.7px solid #7990a4;border-radius:50%;position:absolute;left:2px;top:2px;transition:.16s ease}
    .pr-search-icon:after{content:'';width:6px;height:1.7px;border-radius:2px;background:#7990a4;transform:rotate(45deg);position:absolute;left:10px;top:11px;transition:.16s ease}
    .pr-search-shell:focus-within .pr-search-icon:before{border-color:#2f789f}
    .pr-search-shell:focus-within .pr-search-icon:after{background:#2f789f}
    .pr-filterbar .pr-search-shell input.pr-search{
      width:100%!important;min-width:0!important;height:34px!important;padding:0!important;
      border:0!important;border-radius:0!important;background:transparent!important;
      box-shadow:none!important;outline:none!important;font-size:12px;color:#263b50
    }
    .pr-search-clear{display:none;width:22px;height:22px;flex:0 0 22px;border:0;border-radius:7px;background:#edf3f7;color:#597083;cursor:pointer;font-size:15px;line-height:1;padding:0}
    .pr-search-shell.has-value .pr-search-clear{display:grid;place-items:center}
    .pr-search-clear:hover{background:#dfeaf1;color:#244d68}
    .pr-search-feedback{min-width:62px;font-size:10px;font-weight:750;color:#75879a;white-space:nowrap;transition:.15s ease}
    .pr-search-feedback.searching{color:#2f789f}
    .pr-search-feedback.found{color:#235f80}

    .pr-search-suggestions{
      display:none;position:absolute;left:-1px;top:calc(100% + 8px);width:340px;max-height:330px;overflow:auto;
      background:#fff;border:1px solid #dbe5ed;border-radius:12px;padding:6px;
      box-shadow:0 18px 45px rgba(16,36,58,.18);z-index:10080
    }
    .pr-search-suggestions.show{display:block}
    .pr-suggest-head{padding:7px 9px 5px;font-size:9px;font-weight:850;letter-spacing:.06em;text-transform:uppercase;color:#8a98a8}
    .pr-suggest-item{width:100%;border:0;background:transparent;border-radius:9px;padding:8px 9px;display:grid;grid-template-columns:30px minmax(0,1fr) auto;gap:9px;align-items:center;text-align:left;cursor:pointer;color:#24394d}
    .pr-suggest-item:hover,.pr-suggest-item.active{background:#edf5f9}
    .pr-suggest-avatar{width:30px;height:30px;border-radius:9px;background:#e4eff5;color:#255f80;display:grid;place-items:center;font-size:10px;font-weight:900}
    .pr-suggest-main{min-width:0}.pr-suggest-name{display:block;font-size:11px;font-weight:850;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.pr-suggest-meta{display:block;margin-top:2px;font-size:9px;color:#8391a0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    .pr-suggest-count{font-size:9px;font-weight:800;color:#526b80;background:#f2f6f9;border-radius:999px;padding:4px 6px;white-space:nowrap}
    .pr-suggest-empty{padding:12px 10px;font-size:10px;color:#8794a3;text-align:center}
    #prInfluencers.pr-results-pulse{animation:prResultsPulse .75s ease}
    @keyframes prResultsPulse{0%{filter:brightness(1)}35%{filter:brightness(.97);transform:translateY(-1px)}100%{filter:brightness(1);transform:none}}

    @media(max-width:700px){
      .pr-filterbar .pr-search-shell{width:100%;flex:1 1 100%}
      .pr-search-feedback{min-width:auto}
      .pr-search-suggestions{width:min(92vw,380px)}
    }
  `;
  document.head.appendChild(css);

  let premiumShowReports=null;
  let baseGo=null;
  let searchTimer=null;
  let jumpTimer=null;
  let closeTimer=null;
  let suggestionData=[];
  let suggestions=[];
  let suggestionPromise=null;
  let activeSuggestion=-1;

  function reportsButton(){return document.querySelector('.side [data-v="reports"]')}
  function keepReportsOutOfMenu(){
    const b=reportsButton();
    if(b){b.setAttribute('aria-hidden','true');b.tabIndex=-1;}
  }

  function mountReportsOnDashboard(){
    const dashboard=document.getElementById('dashboard');
    const reports=document.getElementById('reports');
    const shell=reports?.querySelector('.pr-shell')||document.querySelector('#dashboard .pr-shell');
    if(!dashboard||!shell)return false;

    dashboard.classList.add('dashboard-intelligence');
    if(shell.parentElement!==dashboard)dashboard.appendChild(shell);
    reports?.classList.remove('active');
    enhanceSearch();
    keepReportsOutOfMenu();
    return true;
  }

  function resultCount(){
    const more=document.getElementById('prMore');
    const m=String(more?.textContent||'').match(/\((\d+)\)/);
    if(m)return Number(m[1]);
    return document.querySelectorAll('#prInfluencers .pr-inf-card').length;
  }

  function updateSearchFeedback(searching=false){
    const input=document.getElementById('prSearch');
    const shell=input?.closest('.pr-search-shell');
    const feedback=document.getElementById('prSearchFeedback');
    if(!input||!shell||!feedback)return;
    const has=Boolean(input.value.trim());
    shell.classList.toggle('has-value',has);
    feedback.classList.toggle('searching',searching);
    feedback.classList.toggle('found',has&&!searching);
    if(searching){feedback.textContent='aranıyor…';return;}
    feedback.textContent=has?`${resultCount()} sonuç`:'İsimle ara';
  }

  function initials(name){
    return String(name||'?').split(/\s+/).filter(Boolean).slice(0,2).map(x=>x[0]).join('').toLocaleUpperCase('tr-TR');
  }

  async function loadSuggestionData(){
    if(suggestionData.length)return suggestionData;
    if(suggestionPromise)return suggestionPromise;
    suggestionPromise=(async()=>{
      try{
        const r=await fetch('/api/orders',{credentials:'same-origin'});
        if(!r.ok)return [];
        const orders=(await r.json()).filter(o=>o.status!=='ARCHIVED');
        const map=new Map();
        orders.forEach(o=>{
          const name=String(o.recipient_name||'').trim();
          if(!name)return;
          const key=norm(name);
          if(!map.has(key))map.set(key,{name,city:'',count:0,codes:new Set(),last:''});
          const x=map.get(key);
          x.count+=1;
          if(o.city)x.city=String(o.city).trim();
          const d=String(o.order_date||'');
          if(d>x.last)x.last=d;
          (o.items||[]).forEach(it=>{const code=String(it.item_code||'').trim();if(code)x.codes.add(code)});
        });
        suggestionData=[...map.values()].map(x=>({
          ...x,
          codes:[...x.codes],
          haystack:norm([x.name,x.city,...x.codes].join(' '))
        })).sort((a,b)=>b.count-a.count||a.name.localeCompare(b.name,'tr'));
        return suggestionData;
      }catch(e){
        console.warn('Dashboard search suggestions failed',e);
        return [];
      }finally{suggestionPromise=null}
    })();
    return suggestionPromise;
  }

  function closeSuggestions(){
    const box=document.getElementById('prSearchSuggestions');
    if(box)box.classList.remove('show');
    activeSuggestion=-1;
  }

  function paintActiveSuggestion(){
    document.querySelectorAll('#prSearchSuggestions .pr-suggest-item').forEach((el,i)=>el.classList.toggle('active',i===activeSuggestion));
    const active=document.querySelector('#prSearchSuggestions .pr-suggest-item.active');
    active?.scrollIntoView({block:'nearest'});
  }

  function renderSuggestions(){
    const input=document.getElementById('prSearch');
    const box=document.getElementById('prSearchSuggestions');
    if(!input||!box)return;
    const q=norm(input.value);
    if(!q){closeSuggestions();box.innerHTML='';return;}

    suggestions=suggestionData
      .filter(x=>x.haystack.includes(q))
      .sort((a,b)=>{
        const an=norm(a.name),bn=norm(b.name);
        const as=an.startsWith(q)?0:1,bs=bn.startsWith(q)?0:1;
        return as-bs||b.count-a.count||a.name.localeCompare(b.name,'tr');
      })
      .slice(0,8);
    activeSuggestion=-1;

    if(!suggestions.length){
      box.innerHTML='<div class="pr-suggest-empty">Eşleşen influencer önerisi yok.</div>';
      box.classList.add('show');
      return;
    }

    box.innerHTML=`<div class="pr-suggest-head">Önerilen sonuçlar</div>${suggestions.map((x,i)=>`<button type="button" class="pr-suggest-item" data-index="${i}"><span class="pr-suggest-avatar">${esc(initials(x.name))}</span><span class="pr-suggest-main"><span class="pr-suggest-name">${esc(x.name)}</span><span class="pr-suggest-meta">${esc(x.city||'Şehir bilgisi yok')}${x.codes.length?` · ${esc(x.codes.slice(0,2).join(', '))}`:''}</span></span><span class="pr-suggest-count">${x.count} gönderim</span></button>`).join('')}`;
    box.classList.add('show');
    box.querySelectorAll('.pr-suggest-item').forEach(btn=>{
      btn.addEventListener('mousedown',e=>e.preventDefault());
      btn.addEventListener('click',()=>chooseSuggestion(Number(btn.dataset.index)));
    });
  }

  function scrollToResults(){
    const grid=document.getElementById('prInfluencers');
    if(!grid)return;
    const anchor=grid.previousElementSibling||grid;
    anchor.scrollIntoView({behavior:'smooth',block:'start'});
    grid.classList.remove('pr-results-pulse');
    void grid.offsetWidth;
    grid.classList.add('pr-results-pulse');
    setTimeout(()=>grid.classList.remove('pr-results-pulse'),850);
  }

  function chooseSuggestion(index){
    const item=suggestions[index];
    const input=document.getElementById('prSearch');
    if(!item||!input)return;
    input.value=item.name;
    input.dispatchEvent(new Event('input',{bubbles:true}));
    closeSuggestions();
    setTimeout(()=>{updateSearchFeedback(false);scrollToResults()},120);
  }

  function enhanceSearch(){
    const input=document.getElementById('prSearch');
    if(!input||input.dataset.searchUx==='1')return;
    input.dataset.searchUx='1';
    input.placeholder='Influencer, şehir veya kalem no ara';

    const wrap=document.createElement('div');
    wrap.className='pr-search-shell';
    const icon=document.createElement('span');
    icon.className='pr-search-icon';
    icon.setAttribute('aria-hidden','true');
    const clear=document.createElement('button');
    clear.type='button';clear.className='pr-search-clear';clear.title='Aramayı temizle';clear.textContent='×';
    const dropdown=document.createElement('div');
    dropdown.id='prSearchSuggestions';dropdown.className='pr-search-suggestions';
    input.parentNode.insertBefore(wrap,input);
    wrap.appendChild(icon);wrap.appendChild(input);wrap.appendChild(clear);wrap.appendChild(dropdown);

    const feedback=document.createElement('span');
    feedback.id='prSearchFeedback';feedback.className='pr-search-feedback';feedback.textContent='İsimle ara';
    wrap.insertAdjacentElement('afterend',feedback);

    loadSuggestionData();

    input.addEventListener('focus',async()=>{
      clearTimeout(closeTimer);
      await loadSuggestionData();
      renderSuggestions();
    });
    input.addEventListener('blur',()=>{
      closeTimer=setTimeout(closeSuggestions,150);
    });
    input.addEventListener('input',async()=>{
      updateSearchFeedback(true);
      await loadSuggestionData();
      renderSuggestions();
      clearTimeout(searchTimer);
      searchTimer=setTimeout(()=>updateSearchFeedback(false),140);
      clearTimeout(jumpTimer);
      if(input.value.trim().length>=2){
        jumpTimer=setTimeout(()=>{
          if(resultCount()>0)scrollToResults();
        },520);
      }
    });
    input.addEventListener('keydown',e=>{
      const box=document.getElementById('prSearchSuggestions');
      const open=box?.classList.contains('show')&&suggestions.length;
      if(e.key==='ArrowDown'&&open){e.preventDefault();activeSuggestion=Math.min(activeSuggestion+1,suggestions.length-1);paintActiveSuggestion();return;}
      if(e.key==='ArrowUp'&&open){e.preventDefault();activeSuggestion=Math.max(activeSuggestion-1,0);paintActiveSuggestion();return;}
      if(e.key==='Enter'){
        e.preventDefault();
        if(open&&activeSuggestion>=0){chooseSuggestion(activeSuggestion);return;}
        closeSuggestions();
        setTimeout(()=>{updateSearchFeedback(false);scrollToResults()},80);
        return;
      }
      if(e.key==='Escape')closeSuggestions();
    });
    clear.addEventListener('click',()=>{
      input.value='';
      input.dispatchEvent(new Event('input',{bubbles:true}));
      closeSuggestions();
      input.focus();
    });
    updateSearchFeedback(false);
  }

  async function openDashboardReports(){
    const app=document.getElementById('app');
    if(!app||app.classList.contains('hidden'))return;
    keepReportsOutOfMenu();
    if(typeof premiumShowReports==='function'){
      await premiumShowReports();
      mountReportsOnDashboard();
    }
    document.querySelectorAll('.view').forEach(v=>v.classList.remove('active'));
    const dashboard=document.getElementById('dashboard');
    dashboard?.classList.add('active');
    document.querySelectorAll('.side [data-v]').forEach(x=>x.classList.toggle('active',x.dataset.v==='dashboard'));
    const title=document.getElementById('title');
    if(title)title.textContent='Dashboard';
    keepReportsOutOfMenu();
    updateSearchFeedback(false);
  }

  function waitForLogin(){
    const app=document.getElementById('app');
    if(!app||app.classList.contains('hidden')){setTimeout(waitForLogin,120);return;}
    openDashboardReports();
  }

  function boot(){
    if(typeof window.showReports!=='function'||!document.getElementById('reports')){
      setTimeout(boot,80);return;
    }
    premiumShowReports=window.showReports;
    baseGo=window.go;

    window.showReports=()=>openDashboardReports();
    window.go=function(v){
      if(v==='dashboard'||v==='reports')return openDashboardReports();
      return typeof baseGo==='function'?baseGo(v):undefined;
    };

    const side=document.querySelector('.side');
    if(side)new MutationObserver(()=>keepReportsOutOfMenu()).observe(side,{childList:true,subtree:true});
    waitForLogin();
  }

  boot();
})();

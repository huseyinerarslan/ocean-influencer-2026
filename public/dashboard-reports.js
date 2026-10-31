(()=>{
  'use strict';

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
      position:relative
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
    @media(max-width:700px){.pr-filterbar .pr-search-shell{width:100%;flex:1 1 100%}.pr-search-feedback{min-width:auto}}
  `;
  document.head.appendChild(css);

  let premiumShowReports=null;
  let baseGo=null;
  let searchTimer=null;

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
    input.parentNode.insertBefore(wrap,input);
    wrap.appendChild(icon);wrap.appendChild(input);wrap.appendChild(clear);

    const feedback=document.createElement('span');
    feedback.id='prSearchFeedback';feedback.className='pr-search-feedback';feedback.textContent='İsimle ara';
    wrap.insertAdjacentElement('afterend',feedback);

    input.addEventListener('input',()=>{
      updateSearchFeedback(true);
      clearTimeout(searchTimer);
      searchTimer=setTimeout(()=>updateSearchFeedback(false),120);
    });
    clear.addEventListener('click',()=>{
      input.value='';
      input.dispatchEvent(new Event('input',{bubbles:true}));
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

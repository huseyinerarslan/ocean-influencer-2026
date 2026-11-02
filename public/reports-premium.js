(()=>{
  'use strict';

  const $=id=>document.getElementById(id);
  const esc=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  const norm=s=>String(s||'').trim().toLocaleLowerCase('tr-TR');
  const dateKey=v=>{const m=String(v||'').match(/^(\d{4})-(\d{2})-(\d{2})/);return m?`${m[1]}-${m[2]}-${m[3]}`:''};
  const dateTR=v=>{const k=dateKey(v);if(!k)return '—';const [y,m,d]=k.split('-');return `${d}.${m}.${y}`};
  const fmt=n=>Number(n||0).toLocaleString('tr-TR',{maximumFractionDigits:2});
  const apiR=async url=>{const r=await fetch(url,{credentials:'same-origin'});const d=await r.json().catch(()=>({}));if(!r.ok)throw Error(d.error||'İşlem başarısız');return d};
  const COLORS=['#1b5b84','#2f789f','#4a91b2','#6aa9c4','#8fc0d4','#b4d5e2'];

  let allOrders=[];
  let query='';
  let showAll=false;
  let activeSuggestion=-1;
  let suggestions=[];
  let searchTimer=null;
  let jumpTimer=null;
  let closeTimer=null;

  function canonicalCity(value){
    const raw=String(value||'').trim().replace(/\s+/g,' ');
    if(!raw)return 'Bilinmiyor';
    return raw.toLocaleLowerCase('tr-TR').split(' ').map(part=>
      part?part.charAt(0).toLocaleUpperCase('tr-TR')+part.slice(1):''
    ).join(' ');
  }

  const css=document.createElement('style');
  css.id='reports-premium-style';
  css.textContent=`
    #dashboard{--pr-navy:#10243a;--pr-blue:#1b5b84;--pr-ink:#172033;--pr-muted:#728195;--pr-line:#e6edf3}
    #dashboard>.stats,#dashboard>.grid{display:none}
    #dashboard .pr-shell{display:flex;flex-direction:column;gap:18px}
    #dashboard .pr-topbar{display:flex;align-items:flex-start;justify-content:space-between;gap:22px;flex-wrap:wrap}
    #dashboard .pr-title{display:flex;align-items:center;gap:10px;min-width:250px;flex:1 1 300px}
    #dashboard .pr-title-mark{width:32px;height:32px;border-radius:10px;background:linear-gradient(145deg,#10243a,#28759f);box-shadow:0 7px 18px rgba(16,36,58,.16);position:relative;flex:0 0 auto}
    #dashboard .pr-title-mark:before,#dashboard .pr-title-mark:after{content:'';position:absolute;bottom:8px;width:4px;border-radius:3px;background:#fff}
    #dashboard .pr-title-mark:before{left:8px;height:8px}
    #dashboard .pr-title-mark:after{left:15px;height:14px;box-shadow:7px -5px 0 #fff}
    #dashboard .pr-title h3{font-size:16px;line-height:1.1;margin:0;color:var(--pr-ink);font-weight:850}
    #dashboard .pr-title p{font-size:11px;margin:3px 0 0;color:var(--pr-muted)}
    #dashboard .pr-filterbar{display:flex;align-items:center;justify-content:flex-end;gap:10px;row-gap:9px;flex:1 1 520px;flex-wrap:wrap}
    #dashboard .pr-filterbar select,#dashboard .pr-filterbar input{height:38px;border:1px solid #d9e3ec;border-radius:10px;background:#fff;padding:0 12px;font-size:12px;color:#31445a;outline:none}
    #dashboard .pr-filterbar select:focus,#dashboard .pr-filterbar input:focus{border-color:#8bb5cd;box-shadow:0 0 0 3px rgba(45,119,158,.08)}
    #dashboard .pr-custom{display:none;gap:8px}
    #dashboard .pr-custom.show{display:flex}
    #dashboard .pr-fresh{font-size:10px;color:#6f8294;padding:5px 8px;border-radius:999px;background:#f3f7fa;white-space:nowrap}

    #dashboard .pr-search-shell{width:300px;height:38px;display:flex;align-items:center;gap:8px;padding:0 9px 0 11px;border:1px solid #d9e3ec;border-radius:10px;background:#fff;transition:.16s ease;position:relative;z-index:45;flex:0 1 300px}
    #dashboard .pr-search-shell:focus-within{border-color:#4d94b8;background:#fbfdff;box-shadow:0 0 0 4px rgba(47,120,159,.12),0 7px 18px rgba(16,36,58,.07);transform:translateY(-1px)}
    #dashboard .pr-search-icon{width:18px;height:18px;position:relative;flex:0 0 18px}
    #dashboard .pr-search-icon:before{content:'';width:8px;height:8px;border:1.7px solid #7990a4;border-radius:50%;position:absolute;left:2px;top:2px}
    #dashboard .pr-search-icon:after{content:'';width:6px;height:1.7px;border-radius:2px;background:#7990a4;transform:rotate(45deg);position:absolute;left:10px;top:11px}
    #dashboard .pr-search-shell input{width:100%;min-width:0;height:36px;padding:0;border:0;border-radius:0;background:transparent;box-shadow:none;outline:none;font-size:12px;color:#263b50}
    #dashboard .pr-search-clear{display:none;width:22px;height:22px;flex:0 0 22px;border:0;border-radius:7px;background:#edf3f7;color:#597083;cursor:pointer;font-size:15px;line-height:1;padding:0}
    #dashboard .pr-search-shell.has-value .pr-search-clear{display:grid;place-items:center}
    #dashboard .pr-search-clear:hover{background:#dfeaf1;color:#244d68}
    #dashboard .pr-search-feedback{min-width:72px;font-size:10px;font-weight:750;color:#75879a;white-space:nowrap}
    #dashboard .pr-search-feedback.searching{color:#2f789f}
    #dashboard .pr-search-feedback.found{color:#235f80}
    #dashboard .pr-search-suggestions{display:none;position:absolute;left:-1px;top:calc(100% + 8px);width:360px;max-height:330px;overflow:auto;background:#fff;border:1px solid #dbe5ed;border-radius:12px;padding:6px;box-shadow:0 18px 45px rgba(16,36,58,.18);z-index:10080}
    #dashboard .pr-search-suggestions.show{display:block}
    #dashboard .pr-suggest-head{padding:7px 9px 5px;font-size:9px;font-weight:850;letter-spacing:.06em;text-transform:uppercase;color:#8a98a8}
    #dashboard .pr-suggest-item{width:100%;border:0;background:transparent;border-radius:9px;padding:8px 9px;display:grid;grid-template-columns:30px minmax(0,1fr) auto;gap:9px;align-items:center;text-align:left;cursor:pointer;color:#24394d}
    #dashboard .pr-suggest-item:hover,#dashboard .pr-suggest-item.active{background:#edf5f9}
    #dashboard .pr-suggest-avatar{width:30px;height:30px;border-radius:9px;background:#e4eff5;color:#255f80;display:grid;place-items:center;font-size:10px;font-weight:900}
    #dashboard .pr-suggest-main{min-width:0}
    #dashboard .pr-suggest-name{display:block;font-size:11px;font-weight:850;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    #dashboard .pr-suggest-meta{display:block;margin-top:2px;font-size:9px;color:#8391a0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    #dashboard .pr-suggest-count{font-size:9px;font-weight:800;color:#526b80;background:#f2f6f9;border-radius:999px;padding:4px 6px;white-space:nowrap}
    #dashboard .pr-suggest-empty{padding:12px 10px;font-size:10px;color:#8794a3;text-align:center}

    #dashboard .pr-kpis{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:8px}
    #dashboard .pr-kpi{position:relative;overflow:hidden;background:#fff;border:1px solid var(--pr-line);border-radius:12px;padding:9px 12px;min-height:72px;box-shadow:0 5px 18px rgba(16,36,58,.035)}
    #dashboard .pr-kpi:after{content:'';position:absolute;right:-14px;top:-17px;width:54px;height:54px;border-radius:50%;background:linear-gradient(145deg,rgba(47,120,159,.09),rgba(47,120,159,0))}
    #dashboard .pr-kpi-label{font-size:9px;font-weight:850;letter-spacing:.055em;text-transform:uppercase;color:#7c8998;line-height:1.05}
    #dashboard .pr-kpi-value{font-size:19px;font-weight:880;line-height:1.05;color:var(--pr-navy);margin-top:5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    #dashboard .pr-kpi-sub{font-size:9px;color:#8793a2;margin-top:3px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    #dashboard .pr-kpi-accent{position:absolute;left:0;top:9px;bottom:9px;width:3px;border-radius:0 3px 3px 0;background:#2f789f}

    #dashboard .pr-grid{display:grid;grid-template-columns:minmax(0,1.75fr) minmax(280px,.75fr);gap:14px}
    #dashboard .pr-grid.equal{grid-template-columns:repeat(2,minmax(0,1fr))}
    #dashboard .pr-panel{background:#fff;border:1px solid var(--pr-line);border-radius:14px;padding:14px;box-shadow:0 5px 18px rgba(16,36,58,.03);min-width:0}
    #dashboard .pr-panel-head{display:flex;align-items:flex-start;justify-content:space-between;gap:10px;margin-bottom:10px}
    #dashboard .pr-panel-title{font-size:12px;font-weight:850;color:#203247}
    #dashboard .pr-panel-sub{font-size:10px;color:#8793a2;margin-top:2px}
    #dashboard .pr-chip{font-size:9px;font-weight:800;color:#2b6789;background:#edf5f9;border:1px solid #dbeaf2;padding:4px 7px;border-radius:999px;white-space:nowrap}
    #dashboard .pr-trend{height:230px;position:relative}
    #dashboard .pr-trend svg{width:100%;height:100%;display:block}
    #dashboard .pr-axis{font-size:9px;fill:#8a97a6}
    #dashboard .pr-bars{display:grid;gap:9px}
    #dashboard .pr-bar-row{display:grid;grid-template-columns:minmax(120px,.95fr) minmax(130px,1.5fr) auto;gap:9px;align-items:center}
    #dashboard .pr-bar-name{font-size:11px;font-weight:750;color:#31445a;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    #dashboard .pr-bar-track{height:7px;border-radius:999px;background:#edf2f6;overflow:hidden}
    #dashboard .pr-bar-fill{height:100%;border-radius:999px;background:linear-gradient(90deg,#1b5b84,#55a2c4);min-width:3px}
    #dashboard .pr-bar-val{font-size:10px;font-weight:850;color:#365067;white-space:nowrap}
    #dashboard .pr-bar-sub{display:block;font-size:9px;font-weight:500;color:#8a97a6;margin-top:2px}
    #dashboard .pr-donut-wrap{display:grid;grid-template-columns:132px 1fr;gap:12px;align-items:center;min-height:210px}
    #dashboard .pr-donut{width:132px;height:132px;border-radius:50%;position:relative;box-shadow:inset 0 0 0 1px rgba(16,36,58,.04)}
    #dashboard .pr-donut:after{content:'';position:absolute;inset:25px;background:#fff;border-radius:50%;box-shadow:0 0 0 1px #edf1f5}
    #dashboard .pr-donut-center{position:absolute;inset:0;display:grid;place-items:center;z-index:2;text-align:center;pointer-events:none}
    #dashboard .pr-donut-center b{display:block;font-size:20px;color:#173650}
    #dashboard .pr-donut-center span{font-size:9px;color:#8995a4}
    #dashboard .pr-legend{display:grid;gap:7px}
    #dashboard .pr-legend-row{display:grid;grid-template-columns:9px minmax(0,1fr) auto;gap:7px;align-items:center}
    #dashboard .pr-dot{width:8px;height:8px;border-radius:3px}
    #dashboard .pr-legend-name{font-size:10px;color:#4d6074;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    #dashboard .pr-legend-val{font-size:10px;font-weight:800;color:#30485d}

    #dashboard .pr-insights{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:9px}
    #dashboard .pr-insight{background:#fff;border:1px solid var(--pr-line);border-radius:12px;padding:11px 12px;min-height:88px;display:grid;grid-template-columns:30px 1fr;gap:9px;align-items:start}
    #dashboard .pr-insight-icon{width:30px;height:30px;border-radius:9px;background:#eef5f9;color:#28698d;display:grid;place-items:center;font-size:13px;font-weight:900}
    #dashboard .pr-insight b{display:block;font-size:11px;color:#26394d}
    #dashboard .pr-insight strong{display:block;font-size:18px;color:#16344d;margin:2px 0}
    #dashboard .pr-insight span{display:block;font-size:9px;color:#8793a2;line-height:1.35}
    #dashboard .pr-section-head{display:flex;align-items:center;justify-content:space-between;gap:12px}
    #dashboard .pr-section-head h4{font-size:12px;margin:0;color:#203247}
    #dashboard .pr-section-meta{font-size:10px;color:#8290a1}
    #dashboard .pr-influencers{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:9px}
    #dashboard .pr-inf-card{background:#fff;border:1px solid var(--pr-line);border-radius:13px;padding:12px;cursor:pointer;transition:.16s ease;min-width:0}
    #dashboard .pr-inf-card:hover{transform:translateY(-2px);border-color:#b4cddd;box-shadow:0 9px 24px rgba(16,36,58,.07)}
    #dashboard .pr-inf-head{display:flex;align-items:flex-start;justify-content:space-between;gap:8px}
    #dashboard .pr-avatar{width:30px;height:30px;border-radius:10px;background:linear-gradient(145deg,#e9f2f7,#dcebf3);color:#235e80;display:grid;place-items:center;font-size:11px;font-weight:900;flex:0 0 auto}
    #dashboard .pr-inf-id{min-width:0;flex:1}
    #dashboard .pr-inf-name{font-size:11px;font-weight:850;color:#203247;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    #dashboard .pr-inf-city{font-size:9px;color:#8a97a6;margin-top:2px}
    #dashboard .pr-inf-rank{font-size:9px;background:#f1f5f8;color:#5d7083;border-radius:999px;padding:3px 6px}
    #dashboard .pr-mini-stats{display:grid;grid-template-columns:repeat(3,1fr);gap:5px;margin-top:10px}
    #dashboard .pr-mini{background:#f7f9fb;border-radius:8px;padding:7px}
    #dashboard .pr-mini b{display:block;font-size:13px;color:#173650}
    #dashboard .pr-mini span{font-size:8px;color:#8793a2}
    #dashboard .pr-inf-foot{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-top:9px;padding-top:8px;border-top:1px solid #edf1f4;font-size:9px;color:#7f8d9c}
    #dashboard .pr-inf-product{white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:58%}
    #dashboard .pr-more{height:34px;border:1px solid #dbe5ed;background:#fff;color:#38546a;border-radius:9px;font-size:11px;font-weight:750;padding:0 12px;cursor:pointer}
    #dashboard .pr-more:hover{background:#f5f8fa}
    #dashboard .pr-empty{padding:26px;text-align:center;color:#8793a2;font-size:11px;border:1px dashed #d9e2e9;border-radius:11px;background:#fbfcfd;grid-column:1/-1}
    #dashboard #prInfluencers.pr-results-pulse{animation:prResultsPulse .75s ease}
    @keyframes prResultsPulse{0%{filter:brightness(1)}35%{filter:brightness(.97);transform:translateY(-1px)}100%{filter:brightness(1);transform:none}}

    .pr-modal-bg{position:fixed;inset:0;background:rgba(10,22,36,.64);z-index:10030;display:none;align-items:center;justify-content:center;padding:18px;backdrop-filter:blur(5px)}
    .pr-modal-bg.show{display:flex}
    .pr-modal{width:min(930px,96vw);max-height:90vh;overflow:auto;background:#f8fafc;border:1px solid rgba(255,255,255,.5);border-radius:18px;box-shadow:0 28px 90px rgba(0,0,0,.28)}
    .pr-modal-top{position:sticky;top:0;z-index:2;display:flex;justify-content:space-between;align-items:flex-start;gap:12px;padding:16px 18px;background:rgba(255,255,255,.94);backdrop-filter:blur(10px);border-bottom:1px solid #e8eef3}
    .pr-modal-top h3{font-size:15px;margin:0;color:#183149}
    .pr-modal-top p{font-size:10px;margin:3px 0 0;color:#8190a0}
    .pr-close{border:0;background:#eef2f6;color:#455b70;border-radius:9px;padding:7px 10px;font-size:11px;cursor:pointer}
    .pr-modal-body{padding:14px 18px 18px}
    .pr-modal-kpis{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px;margin-bottom:12px}
    .pr-modal-kpi{background:#fff;border:1px solid #e6edf3;border-radius:11px;padding:10px}
    .pr-modal-kpi span{display:block;font-size:8px;text-transform:uppercase;letter-spacing:.05em;color:#8a97a6;font-weight:800}
    .pr-modal-kpi b{display:block;font-size:15px;color:#183149;margin-top:4px}
    .pr-history{display:grid;gap:7px}
    .pr-history-row{background:#fff;border:1px solid #e8eef3;border-radius:10px;padding:10px 11px}
    .pr-history-top{display:flex;justify-content:space-between;gap:10px;font-size:9px;color:#8593a2}
    .pr-history-products{font-size:10px;color:#3f5266;margin-top:5px;line-height:1.45}

    @media(max-width:1250px){#dashboard .pr-kpis{grid-template-columns:repeat(3,1fr)}#dashboard .pr-influencers{grid-template-columns:repeat(3,1fr)}}
    @media(max-width:1100px){#dashboard .pr-filterbar{justify-content:flex-start;flex-basis:100%}#dashboard .pr-search-shell{width:340px;flex:1 1 280px}}
    @media(max-width:980px){#dashboard .pr-grid,#dashboard .pr-grid.equal{grid-template-columns:1fr}#dashboard .pr-insights{grid-template-columns:repeat(2,1fr)}#dashboard .pr-influencers{grid-template-columns:repeat(2,1fr)}}
    @media(max-width:700px){
      #dashboard .pr-shell{gap:14px}
      #dashboard .pr-topbar{gap:14px}
      #dashboard .pr-title{min-width:0;flex-basis:100%}
      #dashboard .pr-filterbar{width:100%;display:grid;grid-template-columns:1fr;gap:8px}
      #dashboard .pr-filterbar>select,#dashboard .pr-custom,#dashboard .pr-fresh,#dashboard .pr-search-shell{width:100%;max-width:none;flex:none}
      #dashboard .pr-custom.show{display:grid;grid-template-columns:1fr 1fr}
      #dashboard .pr-search-feedback{min-width:auto}
      #dashboard .pr-search-suggestions{width:min(92vw,380px)}
      #dashboard .pr-kpis,#dashboard .pr-insights,#dashboard .pr-influencers,.pr-modal-kpis{grid-template-columns:1fr 1fr}
      #dashboard .pr-donut-wrap{grid-template-columns:110px 1fr}
      #dashboard .pr-donut{width:110px;height:110px}
      #dashboard .pr-donut:after{inset:21px}
      #dashboard .pr-bar-row{grid-template-columns:minmax(95px,.9fr) minmax(90px,1.2fr) auto}
    }
    @media(max-width:460px){#dashboard .pr-kpis,#dashboard .pr-insights,#dashboard .pr-influencers,.pr-modal-kpis{grid-template-columns:1fr}#dashboard .pr-trend{height:205px}}
  `;
  document.head.appendChild(css);

  function ensureUI(){
    const side=document.querySelector('.side');
    side?.querySelector('[data-v="reports"]')?.remove();

    const dashboard=$('dashboard');
    if(!dashboard)return false;
    let shell=dashboard.querySelector('.pr-shell');
    if(shell)return true;

    shell=document.createElement('div');
    shell.className='pr-shell';
    shell.innerHTML=`
      <div class="pr-topbar">
        <div class="pr-title"><div class="pr-title-mark"></div><div><h3>Influencer Intelligence</h3><p>İş birlikleri, ürün hareketi ve fırsat sinyalleri</p></div></div>
        <div class="pr-filterbar">
          <select id="prPeriod"><option value="all">Tüm dönem</option><option value="30">Son 30 gün</option><option value="90">Son 90 gün</option><option value="365">Son 1 yıl</option><option value="custom">Özel tarih</option></select>
          <span id="prCustom" class="pr-custom"><input id="prFrom" type="date"><input id="prTo" type="date"></span>
          <div class="pr-search-shell">
            <span class="pr-search-icon" aria-hidden="true"></span>
            <input id="prSearch" placeholder="Influencer, şehir veya kalem no ara">
            <button id="prSearchClear" class="pr-search-clear" type="button" title="Aramayı temizle">×</button>
            <div id="prSearchSuggestions" class="pr-search-suggestions"></div>
          </div>
          <span id="prSearchFeedback" class="pr-search-feedback">İsimle ara</span>
          <span id="prFresh" class="pr-fresh"></span>
        </div>
      </div>
      <div id="prKpis" class="pr-kpis"></div>
      <div class="pr-grid">
        <div class="pr-panel"><div class="pr-panel-head"><div><div class="pr-panel-title">Gönderim Trendi</div><div class="pr-panel-sub">Aylık iş birliği hareketi</div></div><span class="pr-chip">12 aylık görünüm</span></div><div id="prTrend" class="pr-trend"></div></div>
        <div class="pr-panel"><div class="pr-panel-head"><div><div class="pr-panel-title">Şehir Dağılımı</div><div class="pr-panel-sub">Gönderim yoğunluğu</div></div></div><div id="prCities"></div></div>
      </div>
      <div class="pr-grid equal">
        <div class="pr-panel"><div class="pr-panel-head"><div><div class="pr-panel-title">En Çok İş Birliği Yapılanlar</div><div class="pr-panel-sub">İlk 8 influencer</div></div></div><div id="prTopInfluencers" class="pr-bars"></div></div>
        <div class="pr-panel"><div class="pr-panel-head"><div><div class="pr-panel-title">En Çok Gönderilen Ürünler</div><div class="pr-panel-sub">Toplam ürün adedi</div></div></div><div id="prTopProducts" class="pr-bars"></div></div>
      </div>
      <div id="prInsights" class="pr-insights"></div>
      <div class="pr-section-head"><div><h4>Influencer Portföyü</h4><div class="pr-section-meta">Kartı açarak gönderim geçmişini inceleyebilirsin.</div></div><button id="prMore" class="pr-more">Tümünü Göster</button></div>
      <div id="prInfluencers" class="pr-influencers"></div>
    `;
    dashboard.appendChild(shell);

    $('prPeriod').addEventListener('change',()=>{const custom=$('prPeriod').value==='custom';$('prCustom').classList.toggle('show',custom);renderAll()});
    $('prFrom').addEventListener('change',renderAll);
    $('prTo').addEventListener('change',renderAll);
    $('prMore').addEventListener('click',()=>{showAll=!showAll;renderInfluencers()});
    bindSearch();

    if(!$('prModal')){
      const m=document.createElement('div');
      m.id='prModal';
      m.className='pr-modal-bg';
      m.innerHTML='<div class="pr-modal"><div class="pr-modal-top"><div><h3 id="prModalName">Influencer</h3><p id="prModalSub"></p></div><button class="pr-close" id="prModalClose">Kapat</button></div><div class="pr-modal-body" id="prModalBody"></div></div>';
      document.body.appendChild(m);
      $('prModalClose').onclick=()=>m.classList.remove('show');
      m.addEventListener('click',e=>{if(e.target===m)m.classList.remove('show')});
    }
    return true;
  }

  function activeOrders(){return allOrders.filter(o=>o.status!=='ARCHIVED')}

  function filteredOrders(){
    const active=activeOrders();
    const mode=$('prPeriod')?.value||'all';
    if(mode==='all')return active;
    if(mode==='custom'){
      const from=$('prFrom')?.value||'';
      const to=$('prTo')?.value||'';
      return active.filter(o=>{const k=dateKey(o.order_date);return k&&(!from||k>=from)&&(!to||k<=to)});
    }
    const days=Number(mode);
    const cutoff=new Date();
    cutoff.setHours(0,0,0,0);
    cutoff.setDate(cutoff.getDate()-days+1);
    return active.filter(o=>{const k=dateKey(o.order_date);return k&&new Date(k+'T00:00:00')>=cutoff});
  }

  function buildGroups(orders){
    const map=new Map();
    orders.forEach(o=>{
      const key=o.contact_id?`c:${o.contact_id}`:`n:${norm(o.recipient_name)}`;
      if(!map.has(key))map.set(key,{key,name:o.recipient_name||'İsimsiz',city:canonicalCity(o.city),orders:[],products:new Map(),qty:0});
      const g=map.get(key);
      g.orders.push(o);
      if(o.recipient_name)g.name=o.recipient_name;
      if(o.city)g.city=canonicalCity(o.city);
      (o.items||[]).forEach(it=>{
        const code=it.item_code||it.item_name||'Ürün';
        const q=Number(it.qty||0);
        g.qty+=q;
        if(!g.products.has(code))g.products.set(code,{code,name:code,qty:0,count:0});
        const p=g.products.get(code);
        p.qty+=q;
        p.count++;
      });
    });
    return [...map.values()].map(g=>{
      const dates=g.orders.map(o=>dateKey(o.order_date)).filter(Boolean).sort();
      g.first=dates[0]||'';
      g.last=dates[dates.length-1]||'';
      g.uniqueProducts=g.products.size;
      g.topProduct=[...g.products.values()].sort((a,b)=>b.qty-a.qty)[0];
      return g;
    }).sort((a,b)=>b.orders.length-a.orders.length||String(b.last).localeCompare(String(a.last)));
  }

  function buildProducts(orders){
    const map=new Map();
    orders.forEach(o=>(o.items||[]).forEach(it=>{
      const code=it.item_code||it.item_name||'Ürün';
      if(!map.has(code))map.set(code,{code,name:code,qty:0,orders:new Set()});
      const p=map.get(code);
      p.qty+=Number(it.qty||0);
      p.orders.add(o.id);
    }));
    return [...map.values()].sort((a,b)=>b.qty-a.qty||b.orders.size-a.orders.size);
  }

  function buildCities(orders){
    const map=new Map();
    orders.forEach(o=>{
      const name=canonicalCity(o.city);
      const key=name.toLocaleLowerCase('tr-TR');
      if(!map.has(key))map.set(key,{name,value:0});
      map.get(key).value++;
    });
    return [...map.values()].sort((a,b)=>b.value-a.value||a.name.localeCompare(b.name,'tr'));
  }

  function monthBuckets(orders){
    const now=new Date();
    const keys=[];
    for(let i=11;i>=0;i--){
      const d=new Date(now.getFullYear(),now.getMonth()-i,1);
      keys.push(`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`);
    }
    const map=Object.fromEntries(keys.map(k=>[k,0]));
    orders.forEach(o=>{const k=dateKey(o.order_date).slice(0,7);if(k in map)map[k]++});
    return keys.map(k=>({key:k,label:new Date(k+'-01T00:00:00').toLocaleDateString('tr-TR',{month:'short'}).replace('.',''),value:map[k]}));
  }

  function renderKpis(orders,groups,products){
    const totalQty=orders.reduce((s,o)=>s+(o.items||[]).reduce((a,it)=>a+Number(it.qty||0),0),0);
    const now=new Date();
    const ym=`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;
    const thisMonth=activeOrders().filter(o=>dateKey(o.order_date).startsWith(ym)).length;
    const topInf=groups[0];
    const topProduct=products[0];
    const data=[
      ['Influencer',groups.length,'aktif portföy'],
      ['İş Birliği',orders.length,'gönderim'],
      ['Ürün Adedi',fmt(totalQty),'toplam gönderilen'],
      ['Bu Ay',thisMonth,'gönderim'],
      ['En Aktif',topInf?.name||'—',topInf?`${topInf.orders.length} iş birliği`:'veri yok'],
      ['Top Ürün',topProduct?.name||'—',topProduct?`${fmt(topProduct.qty)} adet`:'veri yok']
    ];
    $('prKpis').innerHTML=data.map((x,i)=>`<div class="pr-kpi"><span class="pr-kpi-accent" style="background:${COLORS[i%COLORS.length]}"></span><div class="pr-kpi-label">${esc(x[0])}</div><div class="pr-kpi-value" title="${esc(x[1])}">${esc(x[1])}</div><div class="pr-kpi-sub">${esc(x[2])}</div></div>`).join('');
  }

  function renderTrend(orders){
    const d=monthBuckets(orders);
    const vals=d.map(x=>x.value);
    const max=Math.max(1,...vals);
    const W=860,H=220,L=38,R=12,T=16,B=30,pw=W-L-R,ph=H-T-B,step=pw/Math.max(1,d.length-1);
    const pts=d.map((x,i)=>({x:L+i*step,y:T+ph-(x.value/max)*ph,...x}));
    const poly=pts.map(p=>`${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
    const area=`${L},${T+ph} ${poly} ${L+pw},${T+ph}`;
    const grid=[0,.25,.5,.75,1].map(f=>{const y=T+ph-ph*f;return `<line x1="${L}" y1="${y}" x2="${W-R}" y2="${y}" stroke="#edf2f6" stroke-width="1"/><text x="${L-8}" y="${y+3}" text-anchor="end" class="pr-axis">${Math.round(max*f)}</text>`}).join('');
    const labels=pts.map((p,i)=>i%2===0||i===pts.length-1?`<text x="${p.x}" y="${H-8}" text-anchor="middle" class="pr-axis">${esc(d[i].label)}</text>`:'').join('');
    const dots=pts.map(p=>`<circle cx="${p.x}" cy="${p.y}" r="3.2" fill="#fff" stroke="#2f789f" stroke-width="2"><title>${esc(p.label)}: ${p.value} gönderim</title></circle>`).join('');
    $('prTrend').innerHTML=`<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" aria-label="Aylık gönderim trendi"><defs><linearGradient id="prArea" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stop-color="#2f789f" stop-opacity=".22"/><stop offset="100%" stop-color="#2f789f" stop-opacity="0"/></linearGradient></defs>${grid}<polygon points="${area}" fill="url(#prArea)"/><polyline points="${poly}" fill="none" stroke="#1b5b84" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>${dots}${labels}</svg>`;
  }

  function renderBars(id,rows,valueFn,subFn){
    const box=$(id);
    if(!rows.length){box.innerHTML='<div class="pr-empty">Bu dönem için veri yok.</div>';return}
    const max=Math.max(1,...rows.map(valueFn));
    box.innerHTML=rows.slice(0,8).map(r=>{
      const v=valueFn(r);
      const pct=Math.max(3,(v/max)*100);
      return `<div class="pr-bar-row"><div class="pr-bar-name" title="${esc(r.name)}">${esc(r.name)}<span class="pr-bar-sub">${esc(subFn(r))}</span></div><div class="pr-bar-track"><div class="pr-bar-fill" style="width:${pct.toFixed(1)}%"></div></div><div class="pr-bar-val">${esc(fmt(v))}</div></div>`;
    }).join('');
  }

  function renderCities(orders){
    const cities=buildCities(orders);
    const top=cities.slice(0,5);
    const total=orders.length||1;
    let acc=0;
    const stops=top.map((c,i)=>{const start=acc;acc+=c.value/total*100;return `${COLORS[i%COLORS.length]} ${start.toFixed(1)}% ${acc.toFixed(1)}%`});
    if(acc<100)stops.push(`#e9eef3 ${acc.toFixed(1)}% 100%`);
    $('prCities').innerHTML=`<div class="pr-donut-wrap"><div class="pr-donut" style="background:conic-gradient(${stops.join(',')})"><div class="pr-donut-center"><div><b>${orders.length}</b><span>gönderim</span></div></div></div><div class="pr-legend">${top.map((c,i)=>`<div class="pr-legend-row"><span class="pr-dot" style="background:${COLORS[i%COLORS.length]}"></span><span class="pr-legend-name">${esc(c.name)}</span><span class="pr-legend-val">${Math.round(c.value/total*100)}%</span></div>`).join('')||'<span class="pr-panel-sub">Veri yok.</span>'}</div></div>`;
  }

  function daysAgo(k){if(!k)return Infinity;return Math.floor((Date.now()-new Date(k+'T00:00:00').getTime())/86400000)}

  function renderInsights(){
    const groups=buildGroups(activeOrders());
    const now=Date.now();
    const dormant=groups.filter(g=>g.orders.length>=2&&daysAgo(g.last)>90).length;
    const repeat=groups.filter(g=>[...g.products.values()].some(p=>p.count>1)).length;
    const new30=groups.filter(g=>g.first&&(now-new Date(g.first+'T00:00:00').getTime())/86400000<=30).length;
    const active30=groups.filter(g=>daysAgo(g.last)<=30).length;
    const data=[['↗','Aktif Son 30 Gün',active30,'Yakın dönemde gönderim yapılan kişiler'],['◎','Yeniler',new30,'İlk iş birliği son 30 günde başlayanlar'],['↻','Tekrar Ürün',repeat,'Aynı ürünün birden fazla kez gittiği kişiler'],['◷','90+ Gün Sessiz',dormant,'Daha önce çalışılmış ama uzun süredir gönderim yapılmayanlar']];
    $('prInsights').innerHTML=data.map(x=>`<div class="pr-insight"><div class="pr-insight-icon">${x[0]}</div><div><b>${esc(x[1])}</b><strong>${x[2]}</strong><span>${esc(x[3])}</span></div></div>`).join('');
  }

  function initials(name){return String(name||'?').split(/\s+/).filter(Boolean).slice(0,2).map(x=>x[0]).join('').toLocaleUpperCase('tr-TR')}

  function currentGroups(){
    let rows=buildGroups(filteredOrders());
    if(query)rows=rows.filter(g=>norm([g.name,g.city,...[...g.products.values()].flatMap(p=>[p.code,p.name])].join(' ')).includes(query));
    return rows;
  }

  function renderInfluencers(){
    const rows=currentGroups();
    const visible=showAll?rows:rows.slice(0,16);
    $('prInfluencers').innerHTML=visible.length?visible.map((g,i)=>`<div class="pr-inf-card" data-pr-key="${esc(g.key)}"><div class="pr-inf-head"><div class="pr-avatar">${esc(initials(g.name))}</div><div class="pr-inf-id"><div class="pr-inf-name" title="${esc(g.name)}">${esc(g.name)}</div><div class="pr-inf-city">${esc(g.city||'Şehir bilgisi yok')}</div></div><span class="pr-inf-rank">#${i+1}</span></div><div class="pr-mini-stats"><div class="pr-mini"><b>${g.orders.length}</b><span>İş birliği</span></div><div class="pr-mini"><b>${g.uniqueProducts}</b><span>Farklı ürün</span></div><div class="pr-mini"><b>${fmt(g.qty)}</b><span>Adet</span></div></div><div class="pr-inf-foot"><span>Son: <b>${dateTR(g.last)}</b></span><span class="pr-inf-product" title="${esc(g.topProduct?.name||'')}">${esc(g.topProduct?.name||'Ürün yok')}</span></div></div>`).join(''):'<div class="pr-empty">Arama veya seçili dönem için influencer bulunamadı.</div>';
    $('prMore').style.display=rows.length>16?'':'none';
    $('prMore').textContent=showAll?'Daha Az Göster':`Tümünü Göster (${rows.length})`;
    document.querySelectorAll('#prInfluencers .pr-inf-card').forEach(card=>card.addEventListener('click',()=>openInfluencer(card.dataset.prKey)));
    updateSearchFeedback(false);
  }

  function openInfluencer(key){
    const groups=buildGroups(filteredOrders());
    const g=groups.find(x=>x.key===key);
    if(!g)return;
    $('prModalName').textContent=g.name;
    $('prModalSub').textContent=`${g.orders.length} iş birliği · ${g.uniqueProducts} farklı ürün · ${fmt(g.qty)} adet · Son gönderim ${dateTR(g.last)}`;
    const products=[...g.products.values()].sort((a,b)=>b.qty-a.qty);
    const max=Math.max(1,...products.map(p=>p.qty));
    const history=[...g.orders].sort((a,b)=>String(dateKey(b.order_date)).localeCompare(String(dateKey(a.order_date))));
    $('prModalBody').innerHTML=`<div class="pr-modal-kpis"><div class="pr-modal-kpi"><span>İlk İş Birliği</span><b>${dateTR(g.first)}</b></div><div class="pr-modal-kpi"><span>Son İş Birliği</span><b>${dateTR(g.last)}</b></div><div class="pr-modal-kpi"><span>Gönderim</span><b>${g.orders.length}</b></div><div class="pr-modal-kpi"><span>Toplam Adet</span><b>${fmt(g.qty)}</b></div></div><div class="pr-grid equal"><div class="pr-panel"><div class="pr-panel-title" style="margin-bottom:10px">Ürün Dağılımı</div><div class="pr-bars">${products.slice(0,8).map(p=>`<div class="pr-bar-row"><div class="pr-bar-name" title="${esc(p.name)}">${esc(p.name)}</div><div class="pr-bar-track"><div class="pr-bar-fill" style="width:${Math.max(3,p.qty/max*100).toFixed(1)}%"></div></div><div class="pr-bar-val">${fmt(p.qty)}</div></div>`).join('')||'<div class="pr-empty">Ürün verisi yok.</div>'}</div></div><div class="pr-panel"><div class="pr-panel-title" style="margin-bottom:10px">Gönderim Geçmişi</div><div class="pr-history">${history.map(o=>`<div class="pr-history-row"><div class="pr-history-top"><span>${dateTR(o.order_date)}</span><span>${esc(o.order_no||'')}</span></div><div class="pr-history-products">${(o.items||[]).length?(o.items||[]).map(it=>`${esc(it.item_code||it.item_name)} × ${esc(it.qty)}`).join(' · '):'Ürün bilgisi yok'}</div></div>`).join('')}</div></div></div>`;
    $('prModal').classList.add('show');
  }

  function renderAll(){
    const orders=filteredOrders();
    const groups=buildGroups(orders);
    const products=buildProducts(orders);
    renderKpis(orders,groups,products);
    renderTrend(orders);
    renderCities(orders);
    renderBars('prTopInfluencers',groups,g=>g.orders.length,g=>`${g.uniqueProducts} farklı ürün · son ${dateTR(g.last)}`);
    renderBars('prTopProducts',products,p=>p.qty,p=>`${p.orders.size} gönderimde`);
    renderInsights();
    renderInfluencers();
    $('prFresh').textContent=`${orders.length} aktif kayıt`;
  }

  function updateSearchFeedback(searching=false){
    const input=$('prSearch');
    const shell=input?.closest('.pr-search-shell');
    const feedback=$('prSearchFeedback');
    if(!input||!shell||!feedback)return;
    const has=Boolean(input.value.trim());
    shell.classList.toggle('has-value',has);
    feedback.classList.toggle('searching',searching);
    feedback.classList.toggle('found',has&&!searching);
    if(searching){feedback.textContent='aranıyor…';return}
    feedback.textContent=has?`${currentGroups().length} sonuç`:'İsimle ara';
  }

  function suggestionGroups(){
    const q=norm($('prSearch')?.value);
    if(!q)return [];
    return buildGroups(activeOrders()).map(g=>{
      const codes=[...g.products.keys()];
      return {...g,codes,haystack:norm([g.name,g.city,...codes].join(' '))};
    }).filter(g=>g.haystack.includes(q)).sort((a,b)=>{
      const as=norm(a.name).startsWith(q)?0:1;
      const bs=norm(b.name).startsWith(q)?0:1;
      return as-bs||b.orders.length-a.orders.length||a.name.localeCompare(b.name,'tr');
    }).slice(0,8);
  }

  function closeSuggestions(){
    $('prSearchSuggestions')?.classList.remove('show');
    activeSuggestion=-1;
  }

  function renderSuggestions(){
    const box=$('prSearchSuggestions');
    if(!box)return;
    suggestions=suggestionGroups();
    activeSuggestion=-1;
    if(!norm($('prSearch')?.value)){box.innerHTML='';closeSuggestions();return}
    if(!suggestions.length){box.innerHTML='<div class="pr-suggest-empty">Eşleşen influencer önerisi yok.</div>';box.classList.add('show');return}
    box.innerHTML=`<div class="pr-suggest-head">Önerilen sonuçlar</div>${suggestions.map((x,i)=>`<button type="button" class="pr-suggest-item" data-index="${i}"><span class="pr-suggest-avatar">${esc(initials(x.name))}</span><span class="pr-suggest-main"><span class="pr-suggest-name">${esc(x.name)}</span><span class="pr-suggest-meta">${esc(x.city||'Şehir bilgisi yok')}${x.codes.length?` · ${esc(x.codes.slice(0,2).join(', '))}`:''}</span></span><span class="pr-suggest-count">${x.orders.length} gönderim</span></button>`).join('')}`;
    box.classList.add('show');
    box.querySelectorAll('.pr-suggest-item').forEach(btn=>{
      btn.addEventListener('mousedown',e=>e.preventDefault());
      btn.addEventListener('click',()=>chooseSuggestion(Number(btn.dataset.index)));
    });
  }

  function paintActiveSuggestion(){
    document.querySelectorAll('#prSearchSuggestions .pr-suggest-item').forEach((el,i)=>el.classList.toggle('active',i===activeSuggestion));
    document.querySelector('#prSearchSuggestions .pr-suggest-item.active')?.scrollIntoView({block:'nearest'});
  }

  function scrollToResults(){
    const grid=$('prInfluencers');
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
    const input=$('prSearch');
    if(!item||!input)return;
    input.value=item.name;
    query=norm(item.name);
    renderInfluencers();
    closeSuggestions();
    setTimeout(scrollToResults,80);
  }

  function bindSearch(){
    const input=$('prSearch');
    const clear=$('prSearchClear');
    if(!input||input.dataset.bound==='1')return;
    input.dataset.bound='1';

    input.addEventListener('focus',()=>{clearTimeout(closeTimer);renderSuggestions()});
    input.addEventListener('blur',()=>{closeTimer=setTimeout(closeSuggestions,150)});
    input.addEventListener('input',()=>{
      query=norm(input.value);
      updateSearchFeedback(true);
      renderInfluencers();
      renderSuggestions();
      clearTimeout(searchTimer);
      searchTimer=setTimeout(()=>updateSearchFeedback(false),140);
      clearTimeout(jumpTimer);
      if(input.value.trim().length>=2)jumpTimer=setTimeout(()=>{if(currentGroups().length)scrollToResults()},520);
    });
    input.addEventListener('keydown',e=>{
      const open=$('prSearchSuggestions')?.classList.contains('show')&&suggestions.length;
      if(e.key==='ArrowDown'&&open){e.preventDefault();activeSuggestion=Math.min(activeSuggestion+1,suggestions.length-1);paintActiveSuggestion();return}
      if(e.key==='ArrowUp'&&open){e.preventDefault();activeSuggestion=Math.max(activeSuggestion-1,0);paintActiveSuggestion();return}
      if(e.key==='Enter'){e.preventDefault();if(open&&activeSuggestion>=0){chooseSuggestion(activeSuggestion);return}closeSuggestions();scrollToResults();return}
      if(e.key==='Escape')closeSuggestions();
    });
    clear?.addEventListener('click',()=>{
      input.value='';
      query='';
      renderInfluencers();
      closeSuggestions();
      updateSearchFeedback(false);
      input.focus();
    });
  }

  async function showDashboard(){
    const app=$('app');
    if(!app||app.classList.contains('hidden'))return;
    if(!ensureUI())return;
    document.querySelectorAll('.view').forEach(x=>x.classList.remove('active'));
    $('dashboard')?.classList.add('active');
    document.querySelectorAll('.side [data-v]').forEach(x=>x.classList.toggle('active',x.dataset.v==='dashboard'));
    if($('title'))$('title').textContent='Dashboard';
    $('prFresh').textContent='yükleniyor…';
    try{
      allOrders=await apiR('/api/orders');
      renderAll();
    }catch(e){
      $('prFresh').textContent='yüklenemedi';
      console.error('Dashboard raporları yüklenemedi',e);
    }
  }

  const baseGo=window.go;
  window.go=function(v){
    if(v==='dashboard'||v==='reports')return showDashboard();
    return typeof baseGo==='function'?baseGo(v):undefined;
  };
  window.showReports=showDashboard;

  function boot(){
    const app=$('app');
    if(!app||app.classList.contains('hidden')){setTimeout(boot,120);return}
    ensureUI();
    showDashboard();
  }

  boot();
})();
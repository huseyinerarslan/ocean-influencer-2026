(()=>{
  const css=document.createElement('style');
  css.id='ocean-premium-shell';
  css.textContent=`
  :root{
    --ps-navy:#0b1f33;--ps-navy2:#102942;--ps-blue:#2d6f9c;--ps-blue2:#5f9fc7;
    --ps-bg:#f3f6f9;--ps-card:#fff;--ps-line:#dde5ec;--ps-line2:#edf1f5;
    --ps-text:#17283a;--ps-muted:#718095;--ps-soft:#f7f9fb;
    --ps-shadow:0 10px 30px rgba(20,44,68,.055);--ps-shadow2:0 18px 45px rgba(13,35,56,.09)
  }
  html,body{background:var(--ps-bg)!important;color:var(--ps-text)!important}
  body{font-family:Inter,-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Arial,sans-serif!important;font-size:13px!important;letter-spacing:-.008em!important}
  .app{grid-template-columns:248px minmax(0,1fr)!important;background:var(--ps-bg)!important}
  .side{width:248px!important;background:linear-gradient(180deg,#0b1f33 0%,#0d263d 55%,#0a1d30 100%)!important;padding:18px 14px 20px!important;gap:4px!important;border-right:1px solid rgba(255,255,255,.06)!important;box-shadow:12px 0 30px rgba(11,31,51,.04)!important;overflow-y:auto!important;overflow-x:visible!important}
  .brand{font-size:0!important;margin:0 4px 15px!important;padding:4px 8px 18px!important;min-height:118px!important;height:auto!important;max-height:none!important;overflow:visible!important;border-bottom:1px solid rgba(255,255,255,.11)!important;display:flex!important;flex-direction:column!important;align-items:flex-start!important;justify-content:center!important}
  .brand .ocean-brand-logo{display:block!important;width:198px!important;max-width:198px!important;height:auto!important;min-height:0!important;max-height:none!important;object-fit:contain!important;object-position:left center!important;overflow:visible!important;clip-path:none!important;filter:brightness(0) invert(1)!important;margin:0!important;padding:0!important}
  .brand .ocean-brand-sub{display:block!important;margin:9px 0 0 1px!important;color:#9fb6ca!important;font-size:10px!important;line-height:1.2!important;letter-spacing:.11em!important;text-transform:uppercase!important;font-weight:750!important}
  .side button{min-height:40px!important;padding:9px 10px!important;border-radius:9px!important;color:#c9d7e3!important;font-size:12.5px!important;font-weight:650!important;letter-spacing:.005em!important;transition:background .16s ease,color .16s ease,transform .16s ease!important}
  .side button:hover{background:rgba(255,255,255,.065)!important;color:#fff!important;transform:translateX(1px)!important}
  .side button.active{background:linear-gradient(90deg,rgba(55,122,168,.29),rgba(55,122,168,.13))!important;color:#fff!important;box-shadow:inset 2px 0 0 #78b8df!important}
  .side button[data-v]::before,.side button[data-ops-manage]::before{background:rgba(255,255,255,.055)!important;border:1px solid rgba(255,255,255,.055)!important;width:19px!important;height:19px!important;flex-basis:19px!important;border-radius:6px!important;font-size:11px!important}
  .main{padding:20px 24px 38px!important;max-width:none!important;min-width:0!important;background:linear-gradient(180deg,#f6f8fa 0,#f3f6f9 150px,#f3f6f9 100%)!important}
  .top{min-height:64px!important;margin:0 0 17px!important;padding:8px 12px 12px!important;border-bottom:1px solid var(--ps-line)!important;display:flex!important;align-items:center!important;background:rgba(246,248,250,.94)!important;backdrop-filter:blur(12px)!important}
  .top>div{display:flex!important;align-items:center!important;gap:13px!important;min-width:0!important}.top .muted{display:none!important}
  .top h2{font-size:19px!important;line-height:1.2!important;margin:0!important;color:#17283a!important;letter-spacing:-.025em!important;font-weight:760!important}.top h2:before{content:"";display:inline-block;width:7px;height:7px;border-radius:50%;background:#4c91bd;margin:0 9px 2px 0;box-shadow:0 0 0 4px rgba(76,145,189,.10)}
  .top>.btn.primary{margin-left:auto!important;padding:8px 12px!important;min-height:36px!important;font-size:12px!important;box-shadow:0 5px 15px rgba(36,99,143,.14)!important}
  .card,.panel{border:1px solid var(--ps-line)!important;border-radius:12px!important;background:rgba(255,255,255,.98)!important;box-shadow:var(--ps-shadow)!important}
  .panel{padding:16px!important}h3{font-size:15px!important;line-height:1.3!important;margin:0 0 12px!important;color:#1a2b3f!important;font-weight:770!important;letter-spacing:-.015em!important}h4{font-size:13px!important;color:#26394f!important;font-weight:760!important;letter-spacing:-.01em!important}
  .muted{color:var(--ps-muted)!important}
  .stats{grid-template-columns:repeat(4,minmax(0,1fr))!important;gap:10px!important;margin-bottom:14px!important}.stat{min-height:92px!important;padding:14px 15px!important;border-radius:11px!important;box-shadow:0 7px 20px rgba(20,44,68,.045)!important}.stat:before{width:2px!important;background:linear-gradient(180deg,#5da0c9,#2f719c)!important}.stat span{font-size:9.5px!important;letter-spacing:.09em!important}.stat b{font-size:24px!important;line-height:1.1!important;margin-top:5px!important;color:#132c43!important;font-variant-numeric:tabular-nums!important}
  #dashboard .grid{grid-template-columns:minmax(0,1.55fr) minmax(280px,.65fr)!important;gap:12px!important}#dashboard .grid>.card{min-height:220px!important}
  #dashboard #recent>div{padding:10px 2px!important;border-bottom:1px solid var(--ps-line2)!important;transition:.15s ease!important}#dashboard #recent>div:hover{padding-left:7px!important;background:#fbfcfd!important}
  .btn{min-height:35px!important;border-radius:8px!important;padding:8px 11px!important;font-size:11.5px!important;font-weight:700!important;border:1px solid #d7e0e8!important;background:#fff!important;color:#35495f!important;box-shadow:0 1px 2px rgba(15,34,53,.025)!important}.btn:hover{background:#f8fafc!important;border-color:#b8c9d7!important;transform:translateY(-1px)!important}.btn.primary{background:linear-gradient(180deg,#2d719d,#225f88)!important;border-color:#225f88!important;color:#fff!important;box-shadow:0 6px 16px rgba(35,96,137,.16)!important}.btn.good{background:#edf8f2!important;color:#176a43!important;border-color:#d0eadc!important}.btn.danger{background:#fff3f2!important;color:#9d2d25!important;border-color:#f0d5d2!important}
  .toolbar{padding:8px!important;border-radius:10px!important;border:1px solid var(--ps-line)!important;background:#fff!important;box-shadow:0 5px 16px rgba(20,44,68,.035)!important;gap:7px!important}.toolbar input,.toolbar select,.field input,.field select,.field textarea{min-height:36px!important;border-radius:8px!important;border:1px solid #d5dee7!important;background:#fff!important;padding:8px 10px!important;font-size:12px!important;color:#22364b!important;box-shadow:none!important}.toolbar input:focus,.toolbar select:focus,.field input:focus,.field select:focus,.field textarea:focus{outline:none!important;border-color:#71a7c9!important;box-shadow:0 0 0 3px rgba(77,142,183,.10)!important}.field{margin:10px 0!important;gap:5px!important}.field label{font-size:10.5px!important;color:#65758a!important;font-weight:760!important;letter-spacing:.025em!important}
  .tablewrap{border:1px solid var(--ps-line)!important;border-radius:11px!important;background:#fff!important;box-shadow:0 7px 20px rgba(20,44,68,.04)!important;overflow:auto!important}.table{width:100%!important}.table th{position:sticky;top:0;z-index:2;background:#f8fafc!important;font-size:9.5px!important;letter-spacing:.07em!important;color:#77879a!important;padding:9px 10px!important}.table td{font-size:11.5px!important;color:#2b3e54!important;padding:10px!important;border-color:#edf1f5!important}.table tbody tr{transition:.12s ease!important}.table tbody tr:hover td{background:#f8fbfd!important}.table td b{font-weight:760!important;color:#162f46!important}.badge{font-size:9.5px!important;font-weight:760!important;padding:4px 7px!important;border-radius:999px!important}
  .days{gap:6px!important;margin-bottom:10px!important}.day{min-width:98px!important;padding:8px 9px!important;border-radius:9px!important;box-shadow:none!important}.day b{font-size:11.5px!important}.day span{font-size:10px!important}
  .formgrid{gap:8px 10px!important}.itemrow{border-radius:9px!important;background:#f9fbfc!important;border:1px solid #e6ebf0!important;padding:7px!important;gap:7px!important}
  .ops-modal-bg,.rp-modal-bg,.pv-modal-bg{backdrop-filter:blur(5px)!important}.ops-modal,.rp-modal,.pv-modal{border-radius:14px!important;border:1px solid #dce4eb!important;box-shadow:0 28px 75px rgba(8,25,42,.24)!important}.ops-modal h3,.rp-modal h3,.pv-modal h3{font-size:16px!important}.ops-field label{font-size:10.5px!important;color:#6d7c8f!important;font-weight:760!important}
  .ux-row,.ops-list-row,.bulk-print-row,.contact-entry{border-color:#e7edf2!important;border-radius:9px!important;box-shadow:none!important}.ux-row:hover,.bulk-print-row:hover{border-color:#bfd0dc!important;background:#fbfdff!important;box-shadow:0 5px 15px rgba(20,44,68,.035)!important}.ux-name,.contact-group-name{font-size:12px!important}.ux-sub,.ux-address{font-size:10.5px!important}
  .login{background:radial-gradient(circle at 25% 15%,rgba(91,157,199,.14),transparent 28%),linear-gradient(135deg,#091b2d,#0e2d48 54%,#174d6f)!important}.login .card{width:min(390px,92vw)!important;padding:27px!important;border-radius:16px!important;background:rgba(255,255,255,.985)!important;box-shadow:0 32px 90px rgba(4,18,30,.32)!important}.login .ocean-login-logo{width:286px!important;max-width:100%!important;height:auto!important;max-height:none!important;object-fit:contain!important;clip-path:none!important;margin:0 auto 20px!important;filter:none!important}.login .muted{font-size:11px!important;text-align:center!important;margin-bottom:16px!important}.login .field{margin:11px 0!important}.login .btn.primary{min-height:40px!important}
  .ocean-top-logo{display:none!important}
  .notice{font-size:11px!important;line-height:1.5!important;border-radius:9px!important}
  #contacts .card.panel,#products .card.panel,#templates .card.panel,#sets .card.panel{box-shadow:var(--ps-shadow)!important}
  #contacts .formgrid,#templates .formgrid{padding:12px!important;border-radius:10px!important;background:#f8fafc!important;border-color:#e6ebf0!important}
  .toast{font-size:11.5px!important;border-radius:9px!important;padding:10px 13px!important}
  @media(min-width:901px){.side{position:sticky!important;top:0!important;height:100vh!important}.top{position:sticky!important;top:0!important;z-index:30!important}.main{min-height:100vh!important}}
  @media(max-width:1100px){.stats{grid-template-columns:repeat(2,minmax(0,1fr))!important}#dashboard .grid{grid-template-columns:1fr!important}}
  @media(max-width:900px){.app{grid-template-columns:1fr!important}.side{width:100%!important;position:static!important;padding:9px!important;flex-direction:row!important;overflow-x:auto!important;overflow-y:hidden!important;box-shadow:0 6px 18px rgba(11,31,51,.10)!important}.brand{display:none!important}.side button{min-height:36px!important;white-space:nowrap!important}.main{padding:12px 12px 28px!important}.top{padding:5px 2px 10px!important;min-height:54px!important}.top h2{font-size:17px!important}.panel{padding:13px!important}.stats{grid-template-columns:repeat(2,minmax(0,1fr))!important}.table td{font-size:11px!important}.login .ocean-login-logo{width:250px!important}}
  @media(max-width:560px){.stats{grid-template-columns:1fr 1fr!important}.stat{min-height:82px!important}.stat b{font-size:21px!important}.top>.btn.primary{padding:7px 9px!important}.main{padding:10px!important}}
  `;
  document.head.appendChild(css);

  const LOGO='/ocean-logo.png?v=6';
  function fixBrand(){
    const brand=document.querySelector('.brand');
    if(brand){
      let img=brand.querySelector('.ocean-brand-logo');
      if(!img){brand.innerHTML=`<img class="ocean-brand-logo" src="${LOGO}" alt="Ocean Home Textile"><span class="ocean-brand-sub">Influencer Operasyon</span>`;img=brand.querySelector('img')}
      if(img){img.src=LOGO;img.removeAttribute('width');img.removeAttribute('height');img.style.cssText=''}
    }
    document.querySelectorAll('.ocean-login-logo').forEach(img=>{img.src=LOGO;img.removeAttribute('width');img.removeAttribute('height');img.style.cssText=''});
  }
  function polishDashboard(){
    const dash=document.getElementById('dashboard');if(!dash)return;
    const panels=[...dash.querySelectorAll('.grid>.card.panel')];
    if(panels[1]&&!panels[1].dataset.psSystem){
      panels[1].dataset.psSystem='1';
      const h=panels[1].querySelector('h3');if(h)h.textContent='Operasyon Durumu';
      panels[1].querySelectorAll('p').forEach(p=>{p.style.margin='9px 0';p.style.fontSize='11px'});
    }
  }
  function decorate(){fixBrand();polishDashboard();document.documentElement.dataset.oceanPremium='1'}
  decorate();new MutationObserver(decorate).observe(document.body,{childList:true,subtree:true});
})();
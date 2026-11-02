(()=>{
  'use strict';

  const css=document.createElement('style');
  css.id='ocean-premium-shell';
  css.textContent=`
    :root{
      --ps-navy:#0b1f33;
      --ps-navy2:#102942;
      --ps-blue:#2d6f9c;
      --ps-bg:#f3f6f9;
      --ps-card:#fff;
      --ps-line:#dde5ec;
      --ps-line2:#edf1f5;
      --ps-text:#17283a;
      --ps-muted:#718095;
      --ps-shadow:0 10px 30px rgba(20,44,68,.055);
    }

    html,body{background:var(--ps-bg);color:var(--ps-text)}
    body{font-family:Inter,-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Arial,sans-serif;font-size:13px;letter-spacing:-.008em}
    .app{grid-template-columns:248px minmax(0,1fr);background:var(--ps-bg)}

    .side{
      width:248px;
      background:linear-gradient(180deg,#0b1f33 0%,#0d263d 55%,#0a1d30 100%);
      padding:8px 10px;
      gap:1px;
      border-right:1px solid rgba(255,255,255,.06);
      box-shadow:12px 0 30px rgba(11,31,51,.04);
      overflow:hidden;
    }
    .brand{
      margin:0 4px 8px;
      padding:8px 6px 10px;
      min-height:0;
      border-bottom:1px solid rgba(255,255,255,.10);
      color:#d9e7f2;
      font-size:12px;
      line-height:1.1;
      letter-spacing:.11em;
      text-transform:uppercase;
      font-weight:800;
    }
    .side button{
      min-height:30px;
      height:30px;
      padding:4px 8px;
      margin:0;
      border-radius:8px;
      color:#c9d7e3;
      font-size:11px;
      line-height:1;
      font-weight:650;
      letter-spacing:.005em;
      transition:background .16s ease,color .16s ease,transform .16s ease;
    }
    .side button+button{margin-top:1px}
    .side button:hover{background:rgba(255,255,255,.065);color:#fff;transform:translateX(1px)}
    .side button.active{background:linear-gradient(90deg,rgba(55,122,168,.29),rgba(55,122,168,.13));color:#fff;box-shadow:inset 2px 0 0 #78b8df}
    .side button[data-v]::before,.side button[data-ops-manage]::before{
      width:16px;height:16px;min-width:16px;flex-basis:16px;
      border-radius:5px;font-size:8px;margin-right:6px;
      background:rgba(255,255,255,.055);border:1px solid rgba(255,255,255,.055)
    }
    .side hr,.side .nav-separator{margin:3px 4px}
    .side .section-label,.side .nav-label,.side .menu-label,.side small,.side .muted{margin:2px 7px;line-height:1}

    .main{
      padding:20px 24px 38px;
      max-width:none;
      min-width:0;
      background:linear-gradient(180deg,#f6f8fa 0,#f3f6f9 150px,#f3f6f9 100%);
    }
    .top{
      min-height:64px;
      margin:0 0 17px;
      padding:8px 12px 12px;
      border-bottom:1px solid var(--ps-line);
      display:flex;
      align-items:center;
      background:rgba(246,248,250,.94);
      backdrop-filter:blur(12px);
    }
    .top>div{display:flex;align-items:center;gap:13px;min-width:0}
    .top .muted{display:none}
    .top h2{font-size:19px;line-height:1.2;margin:0;color:#17283a;letter-spacing:-.025em;font-weight:760}
    .top h2:before{content:"";display:inline-block;width:7px;height:7px;border-radius:50%;background:#4c91bd;margin:0 9px 2px 0;box-shadow:0 0 0 4px rgba(76,145,189,.10)}
    .top>.btn.primary{margin-left:auto;padding:8px 12px;min-height:36px;font-size:12px;box-shadow:0 5px 15px rgba(36,99,143,.14)}

    .card,.panel{border:1px solid var(--ps-line);border-radius:12px;background:rgba(255,255,255,.98);box-shadow:var(--ps-shadow)}
    .panel{padding:16px}
    h3{font-size:15px;line-height:1.3;margin:0 0 12px;color:#1a2b3f;font-weight:770;letter-spacing:-.015em}
    h4{font-size:13px;color:#26394f;font-weight:760;letter-spacing:-.01em}
    .muted{color:var(--ps-muted)}

    .btn{
      min-height:35px;border-radius:8px;padding:8px 11px;font-size:11.5px;font-weight:700;
      border:1px solid #d7e0e8;background:#fff;color:#35495f;box-shadow:0 1px 2px rgba(15,34,53,.025)
    }
    .btn:hover{background:#f8fafc;border-color:#b8c9d7;transform:translateY(-1px)}
    .btn.primary{background:linear-gradient(180deg,#2d719d,#225f88);border-color:#225f88;color:#fff;box-shadow:0 6px 16px rgba(35,96,137,.16)}
    .btn.good{background:#edf8f2;color:#176a43;border-color:#d0eadc}
    .btn.danger{background:#fff3f2;color:#9d2d25;border-color:#f0d5d2}

    .toolbar{
      padding:8px;border-radius:10px;border:1px solid var(--ps-line);background:#fff;
      box-shadow:0 5px 16px rgba(20,44,68,.035);gap:7px
    }
    .toolbar input,.toolbar select,.field input,.field select,.field textarea{
      min-height:36px;border-radius:8px;border:1px solid #d5dee7;background:#fff;
      padding:8px 10px;font-size:12px;color:#22364b;box-shadow:none
    }
    .toolbar input:focus,.toolbar select:focus,.field input:focus,.field select:focus,.field textarea:focus{
      outline:none;border-color:#71a7c9;box-shadow:0 0 0 3px rgba(77,142,183,.10)
    }
    .field{margin:10px 0;gap:5px}
    .field label{font-size:10.5px;color:#65758a;font-weight:760;letter-spacing:.025em}

    .tablewrap{border:1px solid var(--ps-line);border-radius:11px;background:#fff;box-shadow:0 7px 20px rgba(20,44,68,.04);overflow:auto}
    .table{width:100%}
    .table th{position:sticky;top:0;z-index:2;background:#f8fafc;font-size:9.5px;letter-spacing:.07em;color:#77879a;padding:9px 10px}
    .table td{font-size:11.5px;color:#2b3e54;padding:10px;border-color:#edf1f5}
    .table tbody tr{transition:.12s ease}
    .table tbody tr:hover td{background:#f8fbfd}
    .table td b{font-weight:760;color:#162f46}
    .badge{font-size:9.5px;font-weight:760;padding:4px 7px;border-radius:999px}

    .days{gap:6px;margin-bottom:10px}
    .day{min-width:98px;padding:8px 9px;border-radius:9px;box-shadow:none}
    .day b{font-size:11.5px}
    .day span{font-size:10px}
    .formgrid{gap:8px 10px}
    .itemrow{border-radius:9px;background:#f9fbfc;border:1px solid #e6ebf0;padding:7px;gap:7px}

    .ops-modal-bg,.rp-modal-bg,.pv-modal-bg{backdrop-filter:blur(5px)}
    .ops-modal,.rp-modal,.pv-modal{border-radius:14px;border:1px solid #dce4eb;box-shadow:0 28px 75px rgba(8,25,42,.24)}
    .ops-modal h3,.rp-modal h3,.pv-modal h3{font-size:16px}
    .ops-field label{font-size:10.5px;color:#6d7c8f;font-weight:760}
    .ux-row,.ops-list-row,.bulk-print-row,.contact-entry{border-color:#e7edf2;border-radius:9px;box-shadow:none}
    .ux-row:hover,.bulk-print-row:hover{border-color:#bfd0dc;background:#fbfdff;box-shadow:0 5px 15px rgba(20,44,68,.035)}
    .ux-name,.contact-group-name{font-size:12px}
    .ux-sub,.ux-address{font-size:10.5px}

    .login{background:radial-gradient(circle at 25% 15%,rgba(91,157,199,.14),transparent 28%),linear-gradient(135deg,#091b2d,#0e2d48 54%,#174d6f)}
    .login .card{width:min(390px,92vw);padding:27px;border-radius:16px;background:rgba(255,255,255,.985);box-shadow:0 32px 90px rgba(4,18,30,.32)}
    .login .muted{font-size:11px;text-align:center;margin-bottom:16px}
    .login .field{margin:11px 0}
    .login .btn.primary{min-height:40px}
    .ocean-top-logo,.ocean-brand-logo,.ocean-login-logo{display:none}
    .notice{font-size:11px;line-height:1.5;border-radius:9px}
    #contacts .card.panel,#products .card.panel,#templates .card.panel,#sets .card.panel{box-shadow:var(--ps-shadow)}
    #contacts .formgrid,#templates .formgrid{padding:12px;border-radius:10px;background:#f8fafc;border-color:#e6ebf0}
    .toast{font-size:11.5px;border-radius:9px;padding:10px 13px}

    @media(min-width:901px){
      .side{position:sticky;top:0;height:100vh;min-height:100vh;max-height:100vh}
      .top{position:sticky;top:0;z-index:30}
      .main{min-height:100vh}
    }
    @media(max-width:900px){
      .app{grid-template-columns:1fr}
      .side{width:100%;position:static;padding:9px;flex-direction:row;overflow-x:auto;overflow-y:hidden;box-shadow:0 6px 18px rgba(11,31,51,.10)}
      .brand{display:none}
      .side button{min-height:36px;height:36px;white-space:nowrap}
      .main{padding:12px 12px 28px}
      .top{padding:5px 2px 10px;min-height:54px}
      .top h2{font-size:17px}
      .panel{padding:13px}
      .table td{font-size:11px}
    }
    @media(max-width:560px){.top>.btn.primary{padding:7px 9px}.main{padding:10px}}
  `;
  document.head.appendChild(css);

  const brand=document.querySelector('.brand');
  if(brand)brand.textContent='Influencer Operasyon';
  document.documentElement.dataset.oceanPremium='1';
})();
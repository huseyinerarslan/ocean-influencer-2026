(()=>{
  const css=document.createElement('style');
  css.id='ocean-pro-theme';
  css.textContent=`
  :root{
    --ocean-navy:#10243a;--ocean-navy-2:#173650;--ocean-blue:#1f5f8d;--ocean-blue-2:#2d75a8;
    --ocean-ink:#172033;--ocean-muted:#6f7d90;--ocean-line:#dfe7f0;--ocean-bg:#f5f7fa;
    --ocean-card:#ffffff;--ocean-soft:#eef4f8;--ocean-success:#18794e;--ocean-warning:#9a6700;
    --ocean-danger:#b42318;--ocean-radius:14px;--ocean-shadow:0 8px 24px rgba(16,36,58,.07);
  }
  html,body{background:var(--ocean-bg)!important;color:var(--ocean-ink)!important}
  body{font-family:Inter,-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Arial,sans-serif!important;letter-spacing:-.01em}
  .app{background:var(--ocean-bg)!important}
  .side{background:linear-gradient(180deg,var(--ocean-navy),#0d1e31)!important;padding:18px 14px!important;gap:5px!important;border-right:1px solid rgba(255,255,255,.05)}
  .brand{font-size:0!important;margin:0 6px 16px!important;padding:8px 8px 18px!important;border-bottom:1px solid rgba(255,255,255,.10)}
  .brand:before{content:"OCEAN HOME TEXTILE";display:block;color:#fff;font-size:13px;font-weight:800;letter-spacing:.14em}
  .brand:after{content:"Influencer Operasyon";display:block;color:#a9bfd1;font-size:12px;font-weight:600;letter-spacing:.02em;margin-top:5px}
  .side button{position:relative!important;color:#cbd8e4!important;border-radius:10px!important;padding:10px 11px!important;font-size:14px!important;font-weight:600!important;transition:.16s ease!important}
  .side button:hover{background:rgba(255,255,255,.07)!important;color:#fff!important;transform:translateX(1px)}
  .side button.active{background:rgba(71,139,190,.22)!important;color:#fff!important;box-shadow:inset 3px 0 0 #70b7e5!important}
  .side button.active:after{content:"";position:absolute;right:10px;top:50%;width:5px;height:5px;border-radius:50%;background:#86c8ee;transform:translateY(-50%)}
  .main{padding:24px 28px 40px!important;background:radial-gradient(circle at 100% 0,rgba(54,117,162,.055),transparent 28%),var(--ocean-bg)!important}
  .top{margin:0 0 20px!important;padding:4px 0 17px!important;border-bottom:1px solid var(--ocean-line)!important}
  .top .muted{font-size:11px!important;font-weight:800!important;letter-spacing:.14em!important;color:#8190a3!important;text-transform:uppercase}
  .top h2{font-size:26px!important;letter-spacing:-.035em!important;color:#162337!important;margin-top:3px!important}
  .card,.panel{background:var(--ocean-card)!important;border:1px solid var(--ocean-line)!important;border-radius:var(--ocean-radius)!important;box-shadow:var(--ocean-shadow)!important}
  .panel{padding:20px!important}
  h3{font-size:18px!important;letter-spacing:-.025em!important;color:#18263a!important;margin-top:0}
  h4{color:#24364c!important}
  .muted{color:var(--ocean-muted)!important}
  .stats{gap:12px!important}.stat{padding:16px 17px!important;position:relative!important;overflow:hidden!important}
  .stat:before{content:"";position:absolute;left:0;top:0;bottom:0;width:3px;background:#6fa9cf}
  .stat span{font-size:11px!important;text-transform:uppercase!important;letter-spacing:.08em!important;font-weight:800!important;color:#748399!important}
  .stat b{display:block;font-size:28px!important;letter-spacing:-.045em!important;color:#10243a!important;margin-top:3px}
  .btn{border:1px solid #d8e1ea!important;border-radius:9px!important;padding:9px 13px!important;background:#fff!important;color:#31445b!important;font-weight:700!important;font-size:13px!important;box-shadow:0 1px 2px rgba(16,36,58,.04)!important;transition:.15s ease!important}
  .btn:hover{border-color:#b9c9d8!important;background:#f8fafc!important;transform:translateY(-1px)}
  .btn.primary{background:linear-gradient(180deg,#246692,#19547e)!important;color:#fff!important;border-color:#174f7a!important;box-shadow:0 5px 14px rgba(31,95,141,.18)!important}
  .btn.primary:hover{background:linear-gradient(180deg,#2a719f,#1b5b87)!important}
  .btn.good{background:#e7f6ee!important;border-color:#c3e8d3!important;color:#16653f!important}
  input,select,textarea{color:#1c2a3b!important}
  .field label{font-size:12px!important;font-weight:800!important;color:#526277!important;letter-spacing:.015em!important}
  .field input,.field select,.field textarea,.toolbar input,.toolbar select,#orders .toolbar input,#orders .toolbar select{border:1px solid #d4dee8!important;border-radius:9px!important;background:#fff!important;padding:10px 11px!important;box-shadow:inset 0 1px 1px rgba(16,36,58,.02)!important;transition:.15s ease!important}
  .field input:focus,.field select:focus,.field textarea:focus,.toolbar input:focus,.toolbar select:focus{outline:none!important;border-color:#6da5cb!important;box-shadow:0 0 0 3px rgba(67,133,178,.12)!important}
  .toolbar{background:#fff!important;border:1px solid var(--ocean-line)!important;border-radius:12px!important;padding:10px!important;margin-bottom:12px!important;box-shadow:0 4px 14px rgba(16,36,58,.04)!important}
  .tablewrap{border:1px solid var(--ocean-line)!important;border-radius:12px!important;background:#fff!important;box-shadow:0 5px 18px rgba(16,36,58,.045)!important}
  .table{background:#fff!important}.table th{background:#f8fafc!important;color:#6f7e91!important;font-size:11px!important;text-transform:uppercase!important;letter-spacing:.055em!important;font-weight:800!important;border-bottom:1px solid #dfe6ee!important}
  .table td{font-size:13px!important;color:#25364b!important;border-bottom:1px solid #eef2f6!important}.table tbody tr:hover td{background:#f8fbfd!important}
  .badge{padding:5px 9px!important;border:1px solid #dce5ee!important;background:#f3f6f9!important;color:#52657b!important;font-weight:750!important;font-size:11px!important}
  .badge.new{background:#eaf3fb!important;border-color:#cfe3f3!important;color:#24638e!important}.badge.done{background:#e9f6ef!important;border-color:#cae8d7!important;color:#18714a!important}
  .days{gap:8px!important}.day{border:1px solid #dce6ef!important;border-radius:11px!important;background:#fff!important;color:#2b425b!important;box-shadow:0 3px 10px rgba(16,36,58,.035)!important}.day:hover{border-color:#9abbd2!important;background:#f8fbfd!important}.day b{font-size:14px!important;color:#1f5f8d!important}.day span{font-size:12px;color:#738196}
  .notice{background:#fff8dc!important;border:1px solid #f0df9f!important;color:#755f13!important}
  .itemrow{background:#f8fafc!important;border:1px solid #e4eaf0!important;border-radius:10px!important;padding:8px!important}
  .ops-modal{border:1px solid #dbe4ed!important;box-shadow:0 24px 70px rgba(11,28,45,.22)!important}.ops-modal-head{border-bottom:1px solid #edf1f5!important;margin-bottom:12px!important}
  .ops-order-row{transition:.14s ease!important}.ops-order-row:hover{background:#f8fbfd!important}.ops-open{min-width:58px}
  .contact-group{box-shadow:0 4px 14px rgba(16,36,58,.035)!important}.contact-group-name{color:#17283d!important}.contact-entry{border-color:#edf1f5!important}
  .bulk-print-row{box-shadow:0 3px 12px rgba(16,36,58,.035)!important}.bulk-print-row:hover{border-color:#adc7d9!important;background:#fbfdff!important}
  .toast{background:#10243a!important;box-shadow:0 12px 32px rgba(9,23,39,.2)!important;border:1px solid rgba(255,255,255,.08)!important}
  .login{background:linear-gradient(135deg,#0d2034 0%,#153c59 54%,#245f87 100%)!important;position:relative!important;overflow:hidden}
  .login:before,.login:after{content:"";position:absolute;border-radius:50%;filter:blur(1px);background:rgba(255,255,255,.045)}
  .login:before{width:420px;height:420px;right:-110px;top:-100px}.login:after{width:280px;height:280px;left:-90px;bottom:-80px}
  .login .card{position:relative!important;z-index:1!important;border:1px solid rgba(255,255,255,.15)!important;box-shadow:0 30px 80px rgba(3,18,30,.28)!important;padding:30px!important}.login h1{font-size:27px!important;color:#10243a!important;letter-spacing:-.04em}.login .muted{font-size:13px!important}
  @media(min-width:901px){.side{position:sticky!important;top:0!important;height:100vh!important}.main{min-height:100vh!important}.top{position:sticky!important;top:0!important;z-index:20!important;background:rgba(245,247,250,.94)!important;backdrop-filter:blur(10px)!important;padding-top:14px!important}}
  @media(max-width:900px){
    .main{padding:14px 14px 30px!important}.top{padding:3px 0 13px!important}.top h2{font-size:24px!important}.top .muted{font-size:10px!important}
    .side{background:#10243a!important;border:0!important;box-shadow:0 4px 16px rgba(9,28,45,.12)!important}.side button{font-size:14px!important;border-radius:9px!important}.side button.active{box-shadow:none!important;background:#2b425d!important}.side button.active:after{display:none!important}
    .panel{padding:15px!important}.card{border-radius:13px!important}.toolbar{padding:8px!important}.stat{padding:14px!important}.stat b{font-size:25px!important}
    #orders .ops-order-row{box-shadow:0 5px 16px rgba(16,36,58,.05)!important;border-color:#dfe7ef!important}.ops-record-sub{color:#758498!important}
    .btn{min-height:42px!important}.login .card{width:min(390px,92vw)!important;padding:24px!important}
  }
  `;
  document.head.appendChild(css);

  const decorate=()=>{
    const brand=document.querySelector('.brand');if(brand)brand.setAttribute('aria-label','Ocean Home Textile Influencer Operasyon');
    const title=document.getElementById('title');
    if(title&&!title.dataset.pro){title.dataset.pro='1';}
    document.querySelectorAll('.side button').forEach(b=>{if(!b.title)b.title=b.textContent.trim()});
  };
  decorate();
  new MutationObserver(decorate).observe(document.body,{childList:true,subtree:true});
})();
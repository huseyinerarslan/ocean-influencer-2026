(()=>{
  'use strict';
  const B64='/ocean-logo-correct.b64?v=2';
  let LOGO_URL='';

  const old=document.getElementById('ocean-logo-hardfix');
  if(old)old.remove();
  const css=document.createElement('style');
  css.id='ocean-logo-hardfix';
  css.textContent=`
    @media(min-width:901px){
      .side{height:100vh!important;min-height:100vh!important;max-height:100vh!important;overflow:hidden!important;padding:6px 9px!important;box-sizing:border-box!important;gap:0!important;scrollbar-width:none!important}
      .side::-webkit-scrollbar{display:none!important}
      .brand-final{min-height:0!important;height:auto!important;max-height:none!important;margin:0 3px 4px!important;padding:2px 4px 5px!important;border-bottom:1px solid rgba(255,255,255,.10)!important;overflow:visible!important;display:flex!important;flex-direction:column!important;align-items:center!important;justify-content:flex-start!important}
      .brand-final .ocean-stable-logo-box{width:100%!important;max-width:214px!important;background:#fff!important;border-radius:10px!important;padding:4px 6px!important;box-sizing:border-box!important;display:flex!important;align-items:center!important;justify-content:center!important;overflow:hidden!important;box-shadow:0 5px 14px rgba(0,0,0,.10)!important}
      .brand-final img.ocean-stable-logo{display:block!important;width:100%!important;height:auto!important;max-width:100%!important;max-height:58px!important;object-fit:contain!important;object-position:center!important;margin:0!important;padding:0!important;border:0!important;filter:none!important;clip-path:none!important;opacity:1!important;visibility:visible!important;background:transparent!important}
      .brand-final .ocean-stable-sub{display:block!important;margin:3px 0 0!important;font-size:8px!important;line-height:1!important;letter-spacing:.08em!important;text-transform:uppercase!important;color:#a9bfd1!important;font-weight:800!important;text-align:center!important}
      .side button{min-height:28px!important;height:28px!important;padding:3px 7px!important;margin:0!important;border-radius:8px!important;font-size:10.8px!important;line-height:1!important}
      .side button+button{margin-top:0!important}
      .side button[data-v]::before,.side button[data-ops-manage]::before{width:15px!important;height:15px!important;min-width:15px!important;flex-basis:15px!important;font-size:8px!important;border-radius:5px!important;margin-right:6px!important}
      .side hr,.side .nav-separator{margin:2px 4px!important}
      .side .section-label,.side .nav-label,.side .menu-label,.side small,.side .muted{margin:1px 7px!important;line-height:1!important}
    }
    .ocean-login-stable-box{width:min(310px,100%)!important;margin:0 auto 18px!important;background:#fff!important;border-radius:12px!important;padding:9px 12px!important;box-sizing:border-box!important;display:flex!important;align-items:center!important;justify-content:center!important}
    .ocean-login-stable-logo{display:block!important;width:100%!important;height:auto!important;max-height:96px!important;object-fit:contain!important;object-position:center!important;margin:0!important;padding:0!important;filter:none!important;clip-path:none!important}
  `;
  document.head.appendChild(css);

  function lockBrand(){
    const brand=document.querySelector('.brand,.brand-final');
    if(brand){
      brand.classList.remove('brand');
      brand.classList.add('brand-final');
      brand.innerHTML=`<div class="ocean-stable-logo-box"><img class="ocean-stable-logo" alt="Ocean Home Textile"></div><span class="ocean-stable-sub">Influencer Operasyon</span>`;
    }
    const login=document.querySelector('.login .card');
    if(login){
      login.querySelectorAll('.ocean-login-logo,.ocean-login-mark,.ocean-final-login-box,.ocean-login-stable-box').forEach(x=>x.remove());
      const box=document.createElement('div');
      box.className='ocean-login-stable-box';
      box.innerHTML='<img class="ocean-login-stable-logo" alt="Ocean Home Textile">';
      const h=login.querySelector('h1');
      login.insertBefore(box,h||login.firstChild);
    }
    applyLogo();
  }

  function applyLogo(){
    if(!LOGO_URL)return;
    document.querySelectorAll('.ocean-stable-logo,.ocean-login-stable-logo').forEach(img=>{
      if(img.src!==LOGO_URL)img.src=LOGO_URL;
    });
  }

  async function loadLogo(){
    try{
      const r=await fetch(B64,{cache:'no-store'});
      if(!r.ok)throw new Error('Logo kaynağı yüklenemedi');
      const b64=(await r.text()).replace(/\s+/g,'');
      const raw=atob(b64);
      const bytes=new Uint8Array(raw.length);
      for(let i=0;i<raw.length;i++)bytes[i]=raw.charCodeAt(i);
      const blob=new Blob([bytes],{type:'image/png'});
      if(LOGO_URL)URL.revokeObjectURL(LOGO_URL);
      LOGO_URL=URL.createObjectURL(blob);
      applyLogo();
    }catch(e){
      console.error('Ocean logo error:',e);
    }
  }

  lockBrand();
  loadLogo();
})();
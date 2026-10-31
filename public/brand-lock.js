(()=>{
  'use strict';
  const LOGO='/ocean-logo-final.png?v=2';
  const css=document.createElement('style');
  css.id='ocean-brand-lock-style';
  css.textContent=`
  @media(min-width:901px){
    .side{height:100vh!important;min-height:100vh!important;max-height:100vh!important;overflow:hidden!important;padding:6px 10px 7px!important;box-sizing:border-box!important;gap:0!important}
    .brand-final{min-height:0!important;height:auto!important;margin:0 3px 4px!important;padding:2px 5px 5px!important;border-bottom:1px solid rgba(255,255,255,.10)!important;display:flex!important;flex-direction:column!important;align-items:center!important;justify-content:flex-start!important}
    .brand-final .ocean-stable-logo-box{width:100%!important;max-width:212px!important;background:#fff!important;border-radius:10px!important;padding:4px 6px!important;box-sizing:border-box!important;display:flex!important;align-items:center!important;justify-content:center!important;overflow:hidden!important}
    .brand-final .ocean-stable-logo{display:block!important;width:100%!important;height:auto!important;max-width:100%!important;max-height:46px!important;object-fit:contain!important;object-position:center!important;margin:0!important;padding:0!important;filter:none!important}
    .brand-final .ocean-stable-sub{margin:3px 0 0!important;font-size:8px!important;line-height:1!important;letter-spacing:.08em!important;text-transform:uppercase!important;color:#a9bfd1!important;font-weight:800!important;text-align:center!important}
    .side button{min-height:31px!important;height:31px!important;padding:4px 8px!important;margin:0!important;border-radius:8px!important;font-size:11.5px!important;line-height:1!important}
    .side button+button{margin-top:1px!important}.side hr,.side .nav-separator{margin:3px 4px!important}
  }
  `;
  document.head.appendChild(css);
  const old=document.querySelector('.brand');
  if(old){
    old.className='brand-final';
    old.innerHTML=`<div class="ocean-stable-logo-box"><img class="ocean-stable-logo" src="${LOGO}" alt="Ocean Home Textile"></div><span class="ocean-stable-sub">Influencer Operasyon</span>`;
  }
})();

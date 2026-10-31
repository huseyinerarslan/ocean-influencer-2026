(()=>{
  'use strict';

  const old=document.getElementById('ocean-logo-hardfix');
  if(old)old.remove();

  const css=document.createElement('style');
  css.id='ocean-logo-hardfix';
  css.textContent=`
    @media(min-width:901px){
      .side{
        height:100vh!important;
        min-height:100vh!important;
        max-height:100vh!important;
        overflow:hidden!important;
        padding:8px 10px!important;
        box-sizing:border-box!important;
        gap:0!important;
        scrollbar-width:none!important;
      }
      .side::-webkit-scrollbar{display:none!important}
      .brand-final{
        min-height:0!important;
        height:auto!important;
        margin:0 4px 8px!important;
        padding:8px 6px 10px!important;
        border-bottom:1px solid rgba(255,255,255,.10)!important;
        display:flex!important;
        align-items:center!important;
        justify-content:flex-start!important;
        overflow:visible!important;
      }
      .brand-final .ocean-text-brand{
        display:block!important;
        color:#d9e7f2!important;
        font-size:12px!important;
        line-height:1.1!important;
        letter-spacing:.11em!important;
        text-transform:uppercase!important;
        font-weight:800!important;
      }
      .side button{
        min-height:30px!important;
        height:30px!important;
        padding:4px 8px!important;
        margin:0!important;
        border-radius:8px!important;
        font-size:11px!important;
        line-height:1!important;
      }
      .side button+button{margin-top:1px!important}
      .side button[data-v]::before,.side button[data-ops-manage]::before{
        width:16px!important;
        height:16px!important;
        min-width:16px!important;
        flex-basis:16px!important;
        font-size:8px!important;
        border-radius:5px!important;
        margin-right:6px!important;
      }
      .side hr,.side .nav-separator{margin:3px 4px!important}
      .side .section-label,.side .nav-label,.side .menu-label,.side small,.side .muted{
        margin:2px 7px!important;
        line-height:1!important;
      }
    }
  `;
  document.head.appendChild(css);

  function removeLogos(){
    document.querySelectorAll(
      '.ocean-brand-logo,.ocean-login-logo,.ocean-login-mark,.ocean-final-login-box,.ocean-login-stable-box,.ocean-stable-logo-box,.ocean-stable-logo'
    ).forEach(el=>el.remove());

    const brand=document.querySelector('.brand,.brand-final');
    if(brand){
      brand.classList.remove('brand');
      brand.classList.add('brand-final');
      brand.innerHTML='<span class="ocean-text-brand">Influencer Operasyon</span>';
    }
  }

  removeLogos();

  let raf=0;
  new MutationObserver(()=>{
    if(document.querySelector('.brand,.ocean-brand-logo,.ocean-login-logo,.ocean-login-mark,.ocean-final-login-box,.ocean-login-stable-box,.ocean-stable-logo-box,.ocean-stable-logo')){
      cancelAnimationFrame(raf);
      raf=requestAnimationFrame(removeLogos);
    }
  }).observe(document.body,{childList:true,subtree:true});
})();
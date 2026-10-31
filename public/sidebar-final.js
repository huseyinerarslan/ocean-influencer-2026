(()=>{
  'use strict';
  const LOGO='/ocean-logo.png?v=12';

  const css=document.createElement('style');
  css.id='ocean-sidebar-final-style';
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
      }
      .brand{
        min-height:0!important;height:auto!important;max-height:none!important;
        margin:0 3px 6px!important;padding:3px 5px 7px!important;
        border-bottom:1px solid rgba(255,255,255,.10)!important;
        overflow:visible!important;display:flex!important;flex-direction:column!important;
        align-items:center!important;justify-content:flex-start!important
      }
      .brand .ocean-stable-logo-box{
        width:100%!important;max-width:214px!important;background:#fff!important;
        border-radius:10px!important;padding:4px 6px!important;box-sizing:border-box!important;
        display:flex!important;align-items:center!important;justify-content:center!important;
        overflow:hidden!important;box-shadow:0 5px 14px rgba(0,0,0,.10)!important
      }
      .brand img.ocean-stable-logo{
        display:block!important;width:100%!important;height:auto!important;max-width:100%!important;
        max-height:50px!important;object-fit:contain!important;object-position:center!important;
        margin:0!important;padding:0!important;border:0!important;filter:none!important;
        clip-path:none!important;opacity:1!important;visibility:visible!important
      }
      .brand .ocean-stable-sub{
        margin:4px 0 0!important;font-size:8px!important;line-height:1!important;
        letter-spacing:.08em!important;text-transform:uppercase!important;color:#a9bfd1!important;
        font-weight:800!important;text-align:center!important
      }
      .side button{
        min-height:33px!important;height:33px!important;padding:4px 8px!important;margin:0!important;
        border-radius:8px!important;font-size:11.5px!important;line-height:1!important
      }
      .side button + button{margin-top:1px!important}
      .side button[data-v]::before,.side button[data-ops-manage]::before{
        width:17px!important;height:17px!important;min-width:17px!important;flex-basis:17px!important;
        font-size:9px!important;border-radius:5px!important;margin-right:7px!important
      }
      .side hr,.side .nav-separator{margin:4px!important}
      .side .section-label,.side .nav-label,.side .menu-label,.side small,.side .muted{
        margin:3px 7px 2px!important;line-height:1!important
      }
    }
    .ocean-login-stable-box{
      width:min(310px,100%)!important;margin:0 auto 18px!important;background:#fff!important;
      border-radius:12px!important;padding:9px 12px!important;box-sizing:border-box!important;
      display:flex!important;align-items:center!important;justify-content:center!important
    }
    .ocean-login-stable-logo{
      display:block!important;width:100%!important;height:auto!important;max-height:82px!important;
      object-fit:contain!important;filter:none!important
    }
  `;
  document.head.appendChild(css);

  function apply(){
    const brand=document.querySelector('.brand');
    if(brand){
      let box=brand.querySelector('.ocean-stable-logo-box');
      if(!box){
        brand.innerHTML=`<div class="ocean-stable-logo-box"><img class="ocean-stable-logo" src="${LOGO}" alt="Ocean Home Textile"></div><span class="ocean-stable-sub">Influencer Operasyon</span>`;
      }else{
        const img=box.querySelector('img');
        if(img && !img.src.includes('/ocean-logo.png')) img.src=LOGO;
      }
    }

    const login=document.querySelector('.login .card');
    if(login&&!login.querySelector('.ocean-login-stable-box')){
      login.querySelectorAll('.ocean-login-logo,.ocean-login-mark,.ocean-final-login-box').forEach(x=>x.remove());
      const box=document.createElement('div');
      box.className='ocean-login-stable-box';
      box.innerHTML=`<img class="ocean-login-stable-logo" src="${LOGO}" alt="Ocean Home Textile">`;
      const h=login.querySelector('h1');
      login.insertBefore(box,h||login.firstChild);
    }
  }

  apply();
  let raf=0;
  new MutationObserver(()=>{
    cancelAnimationFrame(raf);
    raf=requestAnimationFrame(apply);
  }).observe(document.body,{childList:true,subtree:true});
})();
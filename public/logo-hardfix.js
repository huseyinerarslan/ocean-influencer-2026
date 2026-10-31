(()=>{
  'use strict';
  const LOGO='/ocean-logo-final.png?v=2';

  const old=document.getElementById('ocean-logo-hardfix');
  if(old) old.remove();

  const css=document.createElement('style');
  css.id='ocean-logo-hardfix';
  css.textContent=`
    @media(min-width:901px){
      .side{
        height:100vh!important;
        min-height:100vh!important;
        max-height:100vh!important;
        overflow:hidden!important;
        padding:5px 9px 6px!important;
        box-sizing:border-box!important;
        gap:0!important;
        scrollbar-width:none!important;
      }
      .side::-webkit-scrollbar{display:none!important}

      .brand-final{
        min-height:0!important;
        height:auto!important;
        max-height:none!important;
        margin:0 3px 4px!important;
        padding:2px 4px 5px!important;
        border-bottom:1px solid rgba(255,255,255,.10)!important;
        overflow:visible!important;
        display:flex!important;
        flex-direction:column!important;
        align-items:center!important;
        justify-content:flex-start!important;
      }
      .brand-final .ocean-stable-logo-box{
        width:100%!important;
        max-width:214px!important;
        height:44px!important;
        background:#fff!important;
        border-radius:9px!important;
        padding:3px 6px!important;
        box-sizing:border-box!important;
        display:flex!important;
        align-items:center!important;
        justify-content:center!important;
        overflow:hidden!important;
      }
      .brand-final img.ocean-stable-logo{
        display:block!important;
        width:100%!important;
        height:100%!important;
        max-width:100%!important;
        max-height:38px!important;
        object-fit:contain!important;
        object-position:center!important;
        margin:0!important;
        padding:0!important;
        border:0!important;
        filter:none!important;
        clip-path:none!important;
        opacity:1!important;
        visibility:visible!important;
        background:transparent!important;
      }
      .brand-final .ocean-stable-sub{
        display:block!important;
        margin:3px 0 0!important;
        font-size:8px!important;
        line-height:1!important;
        letter-spacing:.08em!important;
        text-transform:uppercase!important;
        color:#a9bfd1!important;
        font-weight:800!important;
        text-align:center!important;
      }

      .side button{
        min-height:29px!important;
        height:29px!important;
        padding:3px 7px!important;
        margin:0!important;
        border-radius:7px!important;
        font-size:11px!important;
        line-height:1!important;
      }
      .side button+button{margin-top:1px!important}
      .side button[data-v]::before,
      .side button[data-ops-manage]::before{
        width:16px!important;
        height:16px!important;
        min-width:16px!important;
        flex-basis:16px!important;
        font-size:8px!important;
        border-radius:5px!important;
        margin-right:6px!important;
      }
      .side hr,.side .nav-separator{margin:2px 4px!important}
      .side .section-label,.side .nav-label,.side .menu-label,
      .side small,.side .muted{
        margin:2px 7px 1px!important;
        line-height:1!important;
        font-size:9px!important;
      }
    }

    @media(max-width:900px){
      .brand-final{display:none!important}
    }
  `;
  document.head.appendChild(css);

  function lockBrand(){
    let brand=document.querySelector('.brand-final');
    if(!brand){
      brand=document.querySelector('.brand');
      if(!brand) return;
      brand.classList.remove('brand');
      brand.classList.add('brand-final');
    }

    brand.innerHTML=`<div class="ocean-stable-logo-box"><img class="ocean-stable-logo" src="${LOGO}" alt="Ocean Home Textile"></div><span class="ocean-stable-sub">Influencer Operasyon</span>`;
  }

  lockBrand();

  let raf=0;
  new MutationObserver(()=>{
    if(document.querySelector('.brand')){
      cancelAnimationFrame(raf);
      raf=requestAnimationFrame(lockBrand);
    }
  }).observe(document.body,{childList:true,subtree:true});
})();
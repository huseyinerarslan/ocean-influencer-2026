(()=>{
  const BRAND='/oceanhome-brand-original.png?v=1';
  const css=document.createElement('style');
  css.id='ocean-sidebar-brand-fix';
  css.textContent=`
    @media(min-width:901px){
      .side{
        height:100vh!important;min-height:100vh!important;
        overflow-y:auto!important;overflow-x:hidden!important;
        scrollbar-width:thin!important;
        scrollbar-color:rgba(255,255,255,.26) transparent!important;
        padding:12px 10px 14px!important;
        gap:1px!important;
      }
      .side::-webkit-scrollbar{width:7px!important}
      .side::-webkit-scrollbar-track{background:transparent!important}
      .side::-webkit-scrollbar-thumb{background:rgba(255,255,255,.22)!important;border-radius:999px!important}
      .side::-webkit-scrollbar-thumb:hover{background:rgba(255,255,255,.34)!important}
      .brand{
        min-height:0!important;height:auto!important;max-height:none!important;
        margin:0 3px 10px!important;padding:6px 6px 11px!important;
        overflow:visible!important;border-bottom:1px solid rgba(255,255,255,.10)!important;
        display:flex!important;flex-direction:column!important;align-items:center!important;justify-content:flex-start!important
      }
      .brand .ocean-stable-logo-box{
        width:100%!important;max-width:218px!important;background:#fff!important;
        border-radius:11px!important;padding:6px 8px!important;box-sizing:border-box!important;
        display:flex!important;align-items:center!important;justify-content:center!important;
        box-shadow:0 5px 14px rgba(0,0,0,.10)!important;overflow:hidden!important
      }
      .brand .ocean-stable-logo{
        display:block!important;width:100%!important;height:auto!important;max-width:100%!important;max-height:none!important;
        object-fit:contain!important;object-position:center!important;margin:0!important;padding:0!important;
        border:0!important;filter:none!important;clip-path:none!important;opacity:1!important;visibility:visible!important
      }
      .brand .ocean-brand-sub{
        margin:7px 0 0!important;font-size:9px!important;line-height:1.1!important;
        letter-spacing:.09em!important;color:#a9bfd1!important;font-weight:750!important;text-align:center!important
      }
      .side button{
        min-height:36px!important;padding:7px 9px!important;margin:0!important;
        border-radius:9px!important;font-size:12px!important;line-height:1.15!important
      }
      .side button[data-v]::before,.side button[data-ops-manage]::before{
        width:18px!important;height:18px!important;flex-basis:18px!important;font-size:10px!important;border-radius:5px!important
      }
      .side .nav-separator,.side hr{margin:7px 4px!important}
    }
  `;
  document.head.appendChild(css);

  function applyBrand(){
    const brand=document.querySelector('.brand');
    if(!brand)return;
    brand.innerHTML=`<div class="ocean-stable-logo-box"><img class="ocean-stable-logo" src="${BRAND}" alt="Ocean Home Textile"></div><span class="ocean-brand-sub">Influencer Operasyon</span>`;
  }
  applyBrand();
  let raf=0;
  new MutationObserver(()=>{cancelAnimationFrame(raf);raf=requestAnimationFrame(applyBrand)}).observe(document.body,{childList:true,subtree:true});
})();
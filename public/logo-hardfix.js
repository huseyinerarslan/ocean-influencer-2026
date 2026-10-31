(()=>{
  const LOGO='/ocean-logo.png?v=11';
  const css=document.createElement('style');
  css.id='ocean-logo-hardfix';
  css.textContent=`
    .brand{
      min-height:126px!important;height:auto!important;max-height:none!important;
      overflow:visible!important;padding:8px 8px 18px!important;
      display:flex!important;flex-direction:column!important;align-items:center!important;
      justify-content:center!important
    }
    .brand .ocean-final-logo-box{
      width:214px!important;max-width:100%!important;
      background:#fff!important;border-radius:10px!important;
      padding:8px 10px!important;box-sizing:border-box!important;
      display:flex!important;align-items:center!important;justify-content:center!important;
      overflow:visible!important;box-shadow:0 8px 24px rgba(0,0,0,.10)!important
    }
    .brand img.ocean-brand-logo.ocean-final-logo{
      display:block!important;width:100%!important;height:auto!important;
      min-width:0!important;min-height:0!important;max-width:100%!important;max-height:none!important;
      object-fit:contain!important;object-position:center!important;
      margin:0!important;padding:0!important;border:0!important;
      filter:none!important;clip-path:none!important;opacity:1!important;
      visibility:visible!important;background:transparent!important
    }
    .brand .ocean-brand-sub{
      display:block!important;margin:10px 0 0!important;color:#a9bfd1!important;
      font-size:10px!important;line-height:1.2!important;letter-spacing:.11em!important;
      text-transform:uppercase!important;font-weight:750!important;text-align:center!important
    }
    .login .ocean-final-login-box{
      width:min(310px,100%)!important;margin:0 auto 20px!important;
      display:flex!important;align-items:center!important;justify-content:center!important
    }
    .login img.ocean-login-logo.ocean-final-login{
      display:block!important;width:100%!important;height:auto!important;
      max-width:100%!important;max-height:none!important;object-fit:contain!important;
      margin:0!important;padding:0!important;filter:none!important;clip-path:none!important;
      opacity:1!important;visibility:visible!important;background:transparent!important
    }
    @media(max-width:900px){
      .brand .ocean-final-logo-box{width:200px!important}
      .login .ocean-final-login-box{width:min(270px,100%)!important}
    }
  `;
  document.head.appendChild(css);

  function hardFixLogo(){
    const brand=document.querySelector('.brand');
    if(brand&&!brand.querySelector('.ocean-final-logo-box')){
      brand.innerHTML=`<div class="ocean-final-logo-box"><img class="ocean-brand-logo ocean-final-logo" src="${LOGO}" alt="Ocean Home Textile"></div><span class="ocean-brand-sub">Influencer Operasyon</span>`;
    }
    const brandImg=brand?.querySelector('.ocean-final-logo');
    if(brandImg){brandImg.src=LOGO;brandImg.removeAttribute('width');brandImg.removeAttribute('height');}

    const login=document.querySelector('.login .card');
    if(login&&!login.querySelector('.ocean-final-login-box')){
      login.querySelectorAll('.ocean-login-logo,.ocean-login-mark').forEach(x=>x.remove());
      const box=document.createElement('div');
      box.className='ocean-final-login-box';
      box.innerHTML=`<img class="ocean-login-logo ocean-final-login" src="${LOGO}" alt="Ocean Home Textile">`;
      const h=login.querySelector('h1');
      login.insertBefore(box,h||login.firstChild);
    }
    const loginImg=login?.querySelector('.ocean-final-login');
    if(loginImg){loginImg.src=LOGO;loginImg.removeAttribute('width');loginImg.removeAttribute('height');}
  }

  hardFixLogo();
  let raf=0;
  new MutationObserver(()=>{cancelAnimationFrame(raf);raf=requestAnimationFrame(hardFixLogo)}).observe(document.body,{childList:true,subtree:true});
})();
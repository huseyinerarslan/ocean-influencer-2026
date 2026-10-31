(()=>{
  const LOGO='/ocean-logo.png?v=10';
  const css=document.createElement('style');
  css.id='ocean-logo-hardfix';
  css.textContent=`
    .brand{min-height:124px!important;height:auto!important;max-height:none!important;overflow:visible!important;padding:8px 8px 18px!important;display:flex!important;flex-direction:column!important;align-items:flex-start!important;justify-content:center!important}
    .brand .ocean-brand-logo.ocean-brand-mark{display:block!important;width:208px!important;height:55px!important;min-width:208px!important;min-height:55px!important;max-width:208px!important;max-height:55px!important;margin:0!important;padding:0!important;overflow:visible!important;clip-path:none!important;filter:none!important;background:#fff!important;-webkit-mask-image:url('${LOGO}')!important;mask-image:url('${LOGO}')!important;-webkit-mask-repeat:no-repeat!important;mask-repeat:no-repeat!important;-webkit-mask-position:left center!important;mask-position:left center!important;-webkit-mask-size:contain!important;mask-size:contain!important}
    .brand .ocean-brand-sub{display:block!important;margin:10px 0 0 1px!important;color:#a9bfd1!important;font-size:10px!important;line-height:1.2!important;letter-spacing:.11em!important;text-transform:uppercase!important;font-weight:750!important}
    .login .ocean-login-logo.ocean-login-mark{display:block!important;width:300px!important;height:79px!important;max-width:100%!important;max-height:79px!important;margin:0 auto 20px!important;padding:0!important;clip-path:none!important;filter:none!important;background-image:url('${LOGO}')!important;background-repeat:no-repeat!important;background-position:center!important;background-size:contain!important}
    @media(max-width:900px){.login .ocean-login-logo.ocean-login-mark{width:250px!important;height:66px!important}}
  `;
  document.head.appendChild(css);

  function hardFixLogo(){
    const brand=document.querySelector('.brand');
    if(brand){
      let mark=brand.querySelector('.ocean-brand-mark');
      if(!mark){
        const old=brand.querySelector('.ocean-brand-logo');
        mark=document.createElement('div');
        mark.className='ocean-brand-logo ocean-brand-mark';
        mark.setAttribute('role','img');
        mark.setAttribute('aria-label','Ocean Home Textile');
        if(old) old.replaceWith(mark); else brand.prepend(mark);
      }
      let sub=brand.querySelector('.ocean-brand-sub');
      if(!sub){sub=document.createElement('span');sub.className='ocean-brand-sub';sub.textContent='Influencer Operasyon';brand.appendChild(sub)}
    }

    const login=document.querySelector('.login .card');
    if(login){
      let mark=login.querySelector('.ocean-login-mark');
      if(!mark){
        const old=login.querySelector('.ocean-login-logo');
        mark=document.createElement('div');
        mark.className='ocean-login-logo ocean-login-mark';
        mark.setAttribute('role','img');
        mark.setAttribute('aria-label','Ocean Home Textile');
        if(old) old.replaceWith(mark); else login.prepend(mark);
      }
    }
  }

  hardFixLogo();
  let raf=0;
  new MutationObserver(()=>{cancelAnimationFrame(raf);raf=requestAnimationFrame(hardFixLogo)}).observe(document.body,{childList:true,subtree:true});
})();
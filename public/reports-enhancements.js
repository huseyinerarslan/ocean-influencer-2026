(()=>{
  const old=document.querySelector('script[data-premium-reports]');
  if(old)return;
  const s=document.createElement('script');
  s.src='/reports-premium.js?v=1';
  s.dataset.premiumReports='1';
  document.head.appendChild(s);
})();

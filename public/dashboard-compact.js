(()=>{
  'use strict';
  const css=document.createElement('style');
  css.id='dashboard-compact-kpis';
  css.textContent=`
    #dashboard .pr-kpis{gap:8px!important}
    #dashboard .pr-kpi{
      min-height:72px!important;
      padding:9px 12px!important;
      border-radius:12px!important;
    }
    #dashboard .pr-kpi:after{
      width:54px!important;
      height:54px!important;
      right:-14px!important;
      top:-17px!important;
    }
    #dashboard .pr-kpi-accent{
      top:9px!important;
      bottom:9px!important;
    }
    #dashboard .pr-kpi-label{
      font-size:9px!important;
      line-height:1.05!important;
      margin:0!important;
    }
    #dashboard .pr-kpi-value{
      font-size:19px!important;
      line-height:1.05!important;
      margin-top:5px!important;
    }
    #dashboard .pr-kpi-sub{
      font-size:9px!important;
      line-height:1.05!important;
      margin-top:3px!important;
    }
    @media(max-width:1250px){
      #dashboard .pr-kpi{min-height:68px!important}
    }
    @media(max-width:700px){
      #dashboard .pr-kpi{min-height:64px!important;padding:8px 10px!important}
      #dashboard .pr-kpi-value{font-size:18px!important}
    }
  `;
  document.head.appendChild(css);
})();

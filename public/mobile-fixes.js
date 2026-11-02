(()=>{
  'use strict';

  const $=id=>document.getElementById(id);

  const style=document.createElement('style');
  style.id='mobile-layout-style';
  style.textContent=`
    .ops-date-field{display:contents}
    .ops-date-label{display:none}

    @media(max-width:900px){
      html,body{max-width:100%;overflow-x:hidden}
      .app{display:block;min-height:100vh;width:100%}
      .main{width:100%;max-width:100%;overflow:hidden}
      .top{width:100%}
      .top>div{min-width:0}
      .top .btn{flex:0 0 auto}
      .card,.panel,.view,#new,#contacts,#products,#sets,#templates{max-width:100%;min-width:0}
      .formgrid{grid-template-columns:minmax(0,1fr);width:100%;max-width:100%}
      .formgrid>*{min-width:0;max-width:100%}
      .full{grid-column:auto;min-width:0}
      .field{min-width:0;max-width:100%}
      .field input,.field select,.field textarea,#new input,#new select,#new textarea,#contacts input,#contacts select,#contacts textarea{display:block;width:100%;max-width:100%;min-width:0}
      #new .card,#contacts .card{width:100%;overflow:hidden}
      #new .items{width:100%;min-width:0}
      .itemrow{grid-template-columns:minmax(0,1fr);width:100%;min-width:0}
      .itemrow select,.itemrow input,.itemrow button{width:100%;max-width:100%;min-width:0}
      #products .toolbar,#sets .toolbar{display:grid;grid-template-columns:minmax(0,1fr);width:100%}
      .toolbar input,.toolbar select{min-width:0;width:100%;max-width:100%}
    }

    @media(max-width:800px){
      #orders .days{gap:8px;margin-bottom:14px}
      #orders .day{min-width:112px;padding:9px}
      #orders .day b{font-size:16px}

      #orders .toolbar{display:grid;grid-template-columns:1fr 1fr;gap:10px;align-items:end}
      #orders .toolbar>#oq{grid-column:1/-1;min-width:0;width:100%}
      #orders .toolbar>#os{min-width:0;width:100%}
      .ops-date-field{display:grid;gap:4px;min-width:0}
      .ops-date-label{display:block;font-size:12px;font-weight:700;color:#718096;padding-left:2px}
      .ops-date-field input{width:100%;min-width:0}
      #orders .toolbar>.btn{width:100%;min-height:48px}

      #orders .tablewrap{overflow:visible}
      #orders .table{display:block;background:transparent}
      #orders .table thead{display:none}
      #orders .table tbody{display:grid;gap:10px}
      #orders .ops-order-row{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:6px 12px;background:#fff;border:1px solid #dfe6ef;border-radius:14px;padding:14px;box-shadow:0 4px 18px #12233a0a}
      #orders .ops-order-row td{display:block;border:0;padding:0;white-space:normal;min-width:0}
      #orders td[data-role='record']{grid-column:1;grid-row:1;font-size:18px;line-height:1.25;align-self:center}
      #orders td[data-role='action']{grid-column:2;grid-row:1/3;align-self:center}
      #orders td[data-role='date'],#orders td[data-role='city'],#orders td[data-role='status'],#orders td[data-role='waybill'],#orders td[data-role='dhl']{display:none}
      #orders td.ops-mobile-meta{display:block;grid-column:1;grid-row:2;font-size:13px;color:#64748b;line-height:1.45}
      #orders .ops-open{padding:9px 14px}
      .ops-record-sub{font-size:13px}

      .ops-modal-bg{padding:0;align-items:flex-end}
      .ops-modal{width:100%;max-height:94vh;border-radius:20px 20px 0 0;padding:16px}
      .ops-modal-head{position:sticky;top:-16px;background:#fff;z-index:2;padding:14px 0 10px}
      .ops-detail-grid{grid-template-columns:1fr}
      .ops-detail-grid .wide{grid-column:auto}
      .ops-field input,.ops-field select,.ops-field textarea{width:100%}
      .ops-item{grid-template-columns:1fr}
      .ops-item input,.ops-item select,.ops-item button{width:100%}
      .ops-actions{width:100%}
      .ops-actions .btn{flex:1}
    }
  `;
  document.head.appendChild(style);

  function wrapDate(id,label){
    const input=$(id);
    if(!input||input.parentElement?.classList.contains('ops-date-field'))return;
    const wrap=document.createElement('label');
    wrap.className='ops-date-field';
    const text=document.createElement('span');
    text.className='ops-date-label';
    text.textContent=label;
    input.parentNode.insertBefore(wrap,input);
    wrap.appendChild(text);
    wrap.appendChild(input);
  }

  wrapDate('od','Gün');
  wrapDate('of','Başlangıç');
  wrapDate('ot','Bitiş');
  if($('oq'))$('oq').placeholder='Influencer / sipariş / şehir ara';

  const baseOpen=window.openOrderDetail;
  if(typeof baseOpen==='function'){
    window.openOrderDetail=async function(id){
      await baseOpen(id);
      const title=$('odTitle');
      if(title&&/^EXCEL-/i.test(title.textContent||'')){
        title.textContent=$('odName')?.value||'Influencer';
        const sub=$('odSub');
        if(sub)sub.textContent=(sub.textContent?sub.textContent+' · ':'')+'Eski Excel kaydı';
      }
    };
  }
})();
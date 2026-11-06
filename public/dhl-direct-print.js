(() => {
  let active;
  window.printDhlLabels = (ids, group) => {
    if (active) return;
    const frame = document.createElement('iframe');
    frame.title = 'DHL etiket baskısı';
    frame.style.cssText = 'position:fixed;left:-10000px;top:0;width:100vw;height:100vh;border:0;pointer-events:none';
    const query = new URLSearchParams({ids:ids.join(',')});
    if (group) query.set('group',group);
    const status = document.createElement('div');
    status.setAttribute('role','status');
    status.textContent = 'DHL etiketleri yazdırmaya hazırlanıyor…';
    status.style.cssText = 'position:fixed;bottom:16px;right:16px;padding:12px 16px;background:#16384b;color:white;border-radius:8px;z-index:20000;pointer-events:none';
    document.body.append(status);
    const trigger = document.activeElement;
    active = frame;
    function finish() {
      clearTimeout(timeout);
      window.removeEventListener('message',onMessage);
      status.remove();
      frame.remove();
      if(trigger?.isConnected)trigger.focus({preventScroll:true});
      active = null;
    }
    function fail(message) {
      finish();
      window.alert(message);
    }
    function onMessage(event) {
      if (event.origin !== location.origin || event.source !== frame.contentWindow) return;
      if (event.data?.type === 'dhl-print-error') return fail(event.data.message);
      if (event.data?.type !== 'dhl-print-ready') return;
      clearTimeout(timeout);
      status.remove();
      const printer = frame.contentWindow;
      printer.addEventListener('afterprint',()=>setTimeout(finish,0),{once:true});
      try { printer.focus(); printer.print(); }
      catch { fail('Yazdırma penceresi açılamadı. Tekrar deneyin.'); }
    }
    const timeout = setTimeout(()=>fail('Etiket hazırlanamadı. Tekrar deneyin.'),200000);
    window.addEventListener('message',onMessage);
    frame.src = '/dhl-label.html?' + query;
    document.body.append(frame);
  };
})();

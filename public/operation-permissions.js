// Shared permission names for the account form and the API.
const operationLabels = Object.freeze({
  createOrders: 'Sipariş oluştur',
  editOrders: 'Siparişleri düzenle, durum değiştir ve arşivle',
  shipping: 'DHL test adresi gönder ve barkod oluştur',
  print: 'Sipariş ve yazı kağıtlarını yazdır',
  contacts: 'Kişi kayıtlarını yönet',
  products: 'Ürün kataloğunu yönet',
  sets: 'Setleri yönet',
  templates: 'Yazı şablonlarını yönet',
  importExcel: 'Excel’den sipariş, kişi ve ürün aktar',
  importCatalog: 'Katalogdan ürün ve set aktar'
});

if (typeof module !== 'undefined') module.exports = operationLabels;

if (typeof document !== 'undefined') {
  const selectors = {
    shipping: ['#dhlSandboxPanel','#bpDhl','#bpDhlCreate','#dhlBatchModal'],
    createOrders: ['[data-v="new"]', '[onclick*="go(\'new\')"]', '#new'],
    print: ['[data-v="bulkprint"]', '#bulkprint', '.print-detail-buttons'],
    editOrders: ['#archiveOrderBtn','[onclick*="restoreOrder("]','[onclick^="markDone("]','[onclick^="saveOrderDetail("]','[onclick^="addOrderItem("]','[onclick^="saveOrderItem("]','[onclick^="removeOrderItem("]'],
    contacts: ['#contacts .toolbar', '[onclick*="saveContact("]', '[onclick*="uxEditContact("]'],
    products: ['#products .toolbar', '[onclick^="editProduct("]', '[onclick^="deleteProduct("]'],
    sets: ['#setEditor', '[onclick^="newSet("]', '[onclick^="editSet("]', '[onclick^="deleteSet("]'],
    templates: ['[onclick*="saveTemplate("]', '[onclick*="uxEditTemplate("]']
  };
  window.applyOperationAccess = function(user) {
    const granted = new Set(user.permissions);
    const hidden = Object.entries(selectors).filter(([key]) => !granted.has(key)).flatMap(([,list]) => list);
    if (!granted.has('contacts') && !granted.has('templates')) hidden.push('[data-ops-manage]');
    let style = document.getElementById('operation-visibility');
    if (!style) {
      style = document.createElement('style');
      style.id = 'operation-visibility';
      document.head.append(style);
    }
    style.textContent = hidden.length ? hidden.join(',') + '{display:none!important}' : '';
  };

  const form = document.getElementById('accountForm');
  const choices = document.getElementById('operationChoices');
  for (const [key, title] of Object.entries(operationLabels)) {
    const label = document.createElement('label');
    const input = document.createElement('input');
    input.type = 'checkbox';
    input.name = 'permission';
    input.value = key;
    input.style.cssText = 'width:auto;min-height:0';
    label.append(input, ' ' + title);
    choices.append(label);
  }
  function showChoices() {
    const admin = form.elements.role.value === 'admin';
    choices.disabled = admin;
    choices.style.display = admin ? 'none' : 'grid';
  }
  form.elements.role.addEventListener('change', showChoices);
  form.addEventListener('reset', () => setTimeout(showChoices, 0));
}

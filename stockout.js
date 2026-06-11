// ============================================================
// stockout.js - Stock Out Management
// ============================================================

let soAllProducts = [];
let soHistory = [];
let soCurrentPage = 1;
const SO_PAGE_SIZE = 15;

document.addEventListener('DOMContentLoaded', () => {
  renderLayout('เบิกสินค้าออก', 'stockout');
  loadStockOutPage();
});

async function loadStockOutPage() {
  const container = document.getElementById('pageContent');
  container.innerHTML = getStockOutHTML();

  const [pRes, hRes] = await Promise.all([apiGetProducts(), apiGetStockOut()]);

  if (pRes.success) {
    soAllProducts = pRes.data || [];
    populateSoProductSelect();
  }

  if (hRes.success) {
    soHistory = hRes.data || [];
    renderSoHistory();
  }
}

function getStockOutHTML() {
  const today = new Date().toISOString().split('T')[0];
  return `
    <div class="row g-4">
      <!-- Form -->
      <div class="col-lg-4">
        <div class="card">
          <div class="card-header">
            <span class="card-title">📤 เพิ่มรายการเบิกออก</span>
          </div>
          <div class="card-body">
            <div class="mb-3">
              <label class="form-label">สินค้า *</label>
              <div class="search-bar mb-1">
                <span class="search-icon">🔍</span>
                <input type="text" class="form-control" id="soSearchProduct" placeholder="ค้นหาสินค้า..." oninput="filterSoProducts()">
              </div>
              <select class="form-select" id="soProductID" size="6" style="height:auto;" onchange="onSoProductChange()">
                <option value="">-- กำลังโหลด --</option>
              </select>
            </div>
            <div class="card mb-3 p-3" id="soProductInfo" style="display:none;background:var(--surface-alt);border:1px solid var(--border);">
              <div id="soProductDetail"></div>
            </div>
            <div class="mb-3">
              <label class="form-label">จำนวนที่เบิก *</label>
              <input type="number" class="form-control" id="soQuantity" min="1" value="1" placeholder="0">
              <div class="form-text" id="soMaxHint"></div>
            </div>
            <div class="mb-3">
              <label class="form-label">ผู้รับสินค้า / แผนก</label>
              <input type="text" class="form-control" id="soReceiver" placeholder="ชื่อผู้รับหรือแผนก">
            </div>
            <div class="mb-3">
              <label class="form-label">วันที่เบิก</label>
              <input type="date" class="form-control" id="soDate" value="${today}">
            </div>
            <div class="mb-4">
              <label class="form-label">หมายเหตุ</label>
              <textarea class="form-control" id="soNote" rows="2" placeholder="หมายเหตุ (ไม่บังคับ)"></textarea>
            </div>
            <button class="btn btn-primary w-100" onclick="submitStockOut()">
              📤 บันทึกการเบิกสินค้า
            </button>
          </div>
        </div>
      </div>

      <!-- History -->
      <div class="col-lg-8">
        <div class="table-wrapper">
          <div class="table-toolbar">
            <div class="card-title ms-1">📋 ประวัติการเบิกสินค้า</div>
            <span class="table-info" id="soHistoryInfo">กำลังโหลด...</span>
          </div>
          <div class="table-responsive">
            <table class="table table-hover">
              <thead>
                <tr>
                  <th>รหัส</th>
                  <th>สินค้า</th>
                  <th>จำนวน</th>
                  <th>ผู้รับ</th>
                  <th>วันที่</th>
                  <th>หมายเหตุ</th>
                </tr>
              </thead>
              <tbody id="soHistoryBody">
                <tr><td colspan="6" class="text-center py-4 text-muted">กำลังโหลด...</td></tr>
              </tbody>
            </table>
          </div>
          <div class="table-footer">
            <div></div>
            <div id="soPagination"></div>
          </div>
        </div>
      </div>
    </div>
  `;
}

function filterSoProducts() {
  const q = document.getElementById('soSearchProduct').value.toLowerCase();
  const filtered = soAllProducts.filter(p =>
    (p.ProductName||'').toLowerCase().includes(q) ||
    (p.SKU||'').toLowerCase().includes(q)
  );
  populateSoProductSelect(filtered);
}

function populateSoProductSelect(products = null) {
  const list = products || soAllProducts;
  const sel = document.getElementById('soProductID');
  if (!sel) return;
  sel.innerHTML = list.map(p => {
    const qty = parseInt(p.Quantity);
    const disabled = qty === 0 ? 'disabled' : '';
    return `<option value="${p.ProductID}" ${disabled}>[${p.SKU||'--'}] ${p.ProductName} (คงเหลือ: ${qty} ${p.Unit||'ชิ้น'}) ${qty === 0 ? '❌' : ''}</option>`;
  }).join('');
  const first = list.find(p => parseInt(p.Quantity) > 0);
  if (first) { sel.value = first.ProductID; onSoProductChange(); }
  else if (list.length === 0) sel.innerHTML = '<option value="">ไม่พบสินค้า</option>';
}

function onSoProductChange() {
  const id = document.getElementById('soProductID').value;
  const p = soAllProducts.find(x => x.ProductID === id);
  const infoEl = document.getElementById('soProductInfo');
  const detailEl = document.getElementById('soProductDetail');
  const hintEl = document.getElementById('soMaxHint');
  const qtyInput = document.getElementById('soQuantity');
  if (!p) { infoEl.style.display = 'none'; return; }

  const qty = parseInt(p.Quantity);
  infoEl.style.display = 'block';
  detailEl.innerHTML = `
    <div style="font-weight:700;margin-bottom:4px;">${p.ProductName}</div>
    <div style="font-size:12px;color:var(--text-secondary);">
      SKU: ${p.SKU||'-'} | หมวด: ${p.Category||'-'}<br>
      <strong>คงเหลือ: </strong>${getStockBadge(p.Quantity, p.MinStock)}
    </div>
  `;

  if (hintEl) hintEl.textContent = `สูงสุด ${qty} ${p.Unit||'ชิ้น'}`;
  if (qtyInput) {
    qtyInput.max = qty;
    if (parseInt(qtyInput.value) > qty) qtyInput.value = qty;
  }
}

async function submitStockOut() {
  const productID = document.getElementById('soProductID').value;
  const quantity = parseInt(document.getElementById('soQuantity').value);
  const receiver = document.getElementById('soReceiver').value.trim();
  const date = document.getElementById('soDate').value;
  const note = document.getElementById('soNote').value.trim();

  if (!productID) { showToast('กรุณาเลือกสินค้า', 'warning'); return; }
  if (!quantity || quantity < 1) { showToast('กรุณากรอกจำนวนที่ถูกต้อง', 'warning'); return; }

  const p = soAllProducts.find(x => x.ProductID === productID);
  if (p && quantity > parseInt(p.Quantity)) {
    showToast(`สินค้าไม่เพียงพอ! คงเหลือ ${p.Quantity} ${p.Unit||'ชิ้น'}`, 'error');
    return;
  }

  const ok = await confirmDialog(
    'ยืนยันการเบิกสินค้า',
    `เบิก "${p?.ProductName}" จำนวน ${quantity} ${p?.Unit||'ชิ้น'} ออกจากสต๊อก?`,
    'ยืนยัน'
  );
  if (!ok) return;

  const result = await apiStockOut({ productID, quantity, receiver, date, note });
  if (result.success) {
    showToast(`✅ เบิกสินค้าสำเร็จ! รหัส: ${result.transactionID}`, 'success');
    document.getElementById('soQuantity').value = 1;
    document.getElementById('soReceiver').value = '';
    document.getElementById('soNote').value = '';
    const [pRes, hRes] = await Promise.all([apiGetProducts(), apiGetStockOut()]);
    if (pRes.success) { soAllProducts = pRes.data; populateSoProductSelect(); }
    if (hRes.success) { soHistory = hRes.data; renderSoHistory(); }
  } else {
    showToast(result.message || 'เกิดข้อผิดพลาด', 'error');
  }
}

function renderSoHistory() {
  const tbody = document.getElementById('soHistoryBody');
  const infoEl = document.getElementById('soHistoryInfo');
  if (!tbody) return;

  const paged = paginate(soHistory, soCurrentPage, SO_PAGE_SIZE);
  if (infoEl) infoEl.textContent = `${soHistory.length} รายการ`;

  if (!paged.items.length) {
    tbody.innerHTML = `<tr><td colspan="6"><div class="empty-state"><div class="empty-icon">📤</div><p>ยังไม่มีประวัติการเบิกสินค้า</p></div></td></tr>`;
    return;
  }

  tbody.innerHTML = paged.items.map(r => `
    <tr>
      <td><code style="font-size:11px;">${r.TransactionID}</code></td>
      <td>
        <div style="font-weight:600;">${r.ProductName || '-'}</div>
        <div style="font-size:11px;color:var(--text-muted);">${r.ProductID}</div>
      </td>
      <td><span class="badge bg-danger">-${formatNumber(r.Quantity)}</span></td>
      <td>${r.Receiver || '-'}</td>
      <td>${formatDate(r.Date)}</td>
      <td style="font-size:12px;color:var(--text-muted);">${r.Note || '-'}</td>
    </tr>
  `).join('');

  renderPagination('soPagination', soCurrentPage, paged.totalPages, p => {
    soCurrentPage = p;
    renderSoHistory();
  });
}

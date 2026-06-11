// ============================================================
// stockin.js - Stock In Management
// ============================================================

let siAllProducts = [];
let siHistory = [];
let siCurrentPage = 1;
const SI_PAGE_SIZE = 15;

document.addEventListener('DOMContentLoaded', () => {
  renderLayout('รับสินค้าเข้า', 'stockin');
  loadStockInPage();
});

async function loadStockInPage() {
  const container = document.getElementById('pageContent');
  container.innerHTML = getStockInHTML();

  // Load products and history in parallel
  const [pRes, hRes] = await Promise.all([apiGetProducts(), apiGetStockIn()]);

  if (pRes.success) {
    siAllProducts = pRes.data || [];
    populateProductSelect();
  }

  if (hRes.success) {
    siHistory = hRes.data || [];
    renderHistory();
  }
}

function getStockInHTML() {
  const today = new Date().toISOString().split('T')[0];
  return `
    <div class="row g-4">
      <!-- Form -->
      <div class="col-lg-4">
        <div class="card">
          <div class="card-header">
            <span class="card-title">📥 เพิ่มรายการรับเข้า</span>
          </div>
          <div class="card-body">
            <div class="mb-3">
              <label class="form-label">สินค้า *</label>
              <div class="search-bar mb-1">
                <span class="search-icon">🔍</span>
                <input type="text" class="form-control" id="siSearchProduct" placeholder="ค้นหาสินค้า..." oninput="filterSiProducts()">
              </div>
              <select class="form-select" id="siProductID" size="6" style="height:auto;" onchange="onSiProductChange()">
                <option value="">-- กำลังโหลด --</option>
              </select>
            </div>
            <div class="card mb-3 p-3" id="siProductInfo" style="display:none;background:var(--surface-alt);border:1px solid var(--border);">
              <div id="siProductDetail"></div>
            </div>
            <div class="mb-3">
              <label class="form-label">จำนวนที่รับเข้า *</label>
              <input type="number" class="form-control" id="siQuantity" min="1" value="1" placeholder="0">
            </div>
            <div class="mb-3">
              <label class="form-label">ผู้จัดจำหน่าย / แหล่งที่มา</label>
              <input type="text" class="form-control" id="siSupplier" placeholder="ชื่อ Supplier">
            </div>
            <div class="mb-3">
              <label class="form-label">วันที่รับสินค้า</label>
              <input type="date" class="form-control" id="siDate" value="${today}">
            </div>
            <div class="mb-4">
              <label class="form-label">หมายเหตุ</label>
              <textarea class="form-control" id="siNote" rows="2" placeholder="หมายเหตุ (ไม่บังคับ)"></textarea>
            </div>
            <button class="btn btn-success w-100" onclick="submitStockIn()">
              📥 บันทึกการรับสินค้า
            </button>
          </div>
        </div>
      </div>

      <!-- History -->
      <div class="col-lg-8">
        <div class="table-wrapper">
          <div class="table-toolbar">
            <div class="card-title ms-1">📋 ประวัติการรับสินค้า</div>
            <span class="table-info" id="siHistoryInfo">กำลังโหลด...</span>
          </div>
          <div class="table-responsive">
            <table class="table table-hover">
              <thead>
                <tr>
                  <th>รหัส</th>
                  <th>สินค้า</th>
                  <th>จำนวน</th>
                  <th>ผู้จัดจำหน่าย</th>
                  <th>วันที่</th>
                  <th>หมายเหตุ</th>
                </tr>
              </thead>
              <tbody id="siHistoryBody">
                <tr><td colspan="6" class="text-center py-4 text-muted">กำลังโหลด...</td></tr>
              </tbody>
            </table>
          </div>
          <div class="table-footer">
            <div></div>
            <div id="siPagination"></div>
          </div>
        </div>
      </div>
    </div>
  `;
}

function filterSiProducts() {
  const q = document.getElementById('siSearchProduct').value.toLowerCase();
  const sel = document.getElementById('siProductID');
  const filtered = siAllProducts.filter(p =>
    (p.ProductName||'').toLowerCase().includes(q) ||
    (p.SKU||'').toLowerCase().includes(q)
  );
  populateProductSelect(filtered);
}

function populateProductSelect(products = null) {
  const list = products || siAllProducts;
  const sel = document.getElementById('siProductID');
  if (!sel) return;
  sel.innerHTML = list.map(p =>
    `<option value="${p.ProductID}">[${p.SKU||'--'}] ${p.ProductName} (คงเหลือ: ${p.Quantity} ${p.Unit||'ชิ้น'})</option>`
  ).join('');
  if (list.length > 0) { sel.value = list[0].ProductID; onSiProductChange(); }
  else sel.innerHTML = '<option value="">ไม่พบสินค้า</option>';
}

function onSiProductChange() {
  const id = document.getElementById('siProductID').value;
  const p = siAllProducts.find(x => x.ProductID === id);
  const infoEl = document.getElementById('siProductInfo');
  const detailEl = document.getElementById('siProductDetail');
  if (!p) { infoEl.style.display = 'none'; return; }
  infoEl.style.display = 'block';
  detailEl.innerHTML = `
    <div style="font-weight:700;margin-bottom:4px;">${p.ProductName}</div>
    <div style="font-size:12px;color:var(--text-secondary);">
      SKU: ${p.SKU||'-'} | หมวด: ${p.Category||'-'}<br>
      <strong>คงเหลือปัจจุบัน: </strong>${getStockBadge(p.Quantity, p.MinStock)}
      | ราคาทุน: ${formatCurrency(p.CostPrice)}
    </div>
  `;
}

async function submitStockIn() {
  const productID = document.getElementById('siProductID').value;
  const quantity = parseInt(document.getElementById('siQuantity').value);
  const supplier = document.getElementById('siSupplier').value.trim();
  const date = document.getElementById('siDate').value;
  const note = document.getElementById('siNote').value.trim();

  if (!productID) { showToast('กรุณาเลือกสินค้า', 'warning'); return; }
  if (!quantity || quantity < 1) { showToast('กรุณากรอกจำนวนที่ถูกต้อง', 'warning'); return; }

  const p = siAllProducts.find(x => x.ProductID === productID);
  const ok = await confirmDialog(
    'ยืนยันการรับสินค้า',
    `รับ "${p?.ProductName}" จำนวน ${quantity} ${p?.Unit||'ชิ้น'} เข้าสต๊อก?`,
    'ยืนยัน'
  );
  if (!ok) return;

  const result = await apiStockIn({ productID, quantity, supplier, date, note });
  if (result.success) {
    showToast(`✅ รับสินค้าเข้าสำเร็จ! รหัส: ${result.transactionID}`, 'success');
    // Reset form
    document.getElementById('siQuantity').value = 1;
    document.getElementById('siSupplier').value = '';
    document.getElementById('siNote').value = '';
    // Reload
    const [pRes, hRes] = await Promise.all([apiGetProducts(), apiGetStockIn()]);
    if (pRes.success) { siAllProducts = pRes.data; populateProductSelect(); }
    if (hRes.success) { siHistory = hRes.data; renderHistory(); }
  } else {
    showToast(result.message || 'เกิดข้อผิดพลาด', 'error');
  }
}

function renderHistory() {
  const tbody = document.getElementById('siHistoryBody');
  const infoEl = document.getElementById('siHistoryInfo');
  if (!tbody) return;

  const paged = paginate(siHistory, siCurrentPage, SI_PAGE_SIZE);
  if (infoEl) infoEl.textContent = `${siHistory.length} รายการ`;

  if (!paged.items.length) {
    tbody.innerHTML = `<tr><td colspan="6"><div class="empty-state"><div class="empty-icon">📥</div><p>ยังไม่มีประวัติการรับสินค้า</p></div></td></tr>`;
    return;
  }

  tbody.innerHTML = paged.items.map(r => `
    <tr>
      <td><code style="font-size:11px;">${r.TransactionID}</code></td>
      <td>
        <div style="font-weight:600;">${r.ProductName || '-'}</div>
        <div style="font-size:11px;color:var(--text-muted);">${r.ProductID}</div>
      </td>
      <td><span class="badge bg-success">+${formatNumber(r.Quantity)}</span></td>
      <td>${r.Supplier || '-'}</td>
      <td>${formatDate(r.Date)}</td>
      <td style="font-size:12px;color:var(--text-muted);">${r.Note || '-'}</td>
    </tr>
  `).join('');

  renderPagination('siPagination', siCurrentPage, paged.totalPages, p => {
    siCurrentPage = p;
    renderHistory();
  });
}

// ============================================================
// products.js - Product Management
// ============================================================

let allProducts = [];
let filteredProducts = [];
let currentPage = 1;
const PAGE_SIZE = 15;
let productModal = null;
let editMode = false;
let categories = new Set();

document.addEventListener('DOMContentLoaded', () => {
  renderLayout('จัดการสินค้า', 'products');
  productModal = new bootstrap.Modal(document.getElementById('productModal'));
  loadProducts();

  // Check for filter param
  const params = new URLSearchParams(window.location.search);
  if (params.get('filter') === 'low') {
    setTimeout(() => filterByLowStock(), 800);
  }
});

async function loadProducts() {
  const container = document.getElementById('pageContent');
  container.innerHTML = getProductsHTML();
  bindSearch();

  const result = await apiGetProducts();
  if (!result.success) {
    document.getElementById('productTableBody').innerHTML =
      `<tr><td colspan="9" class="text-center text-danger py-4">⚠️ ${result.message}</td></tr>`;
    return;
  }

  allProducts = result.data || [];
  categories = new Set(allProducts.map(p => p.Category).filter(Boolean));
  updateCategoryOptions();
  applyFilters();
}

function getProductsHTML() {
  return `
    <div class="table-wrapper">
      <div class="table-toolbar">
        <div class="table-toolbar-left">
          <div class="search-bar">
            <span class="search-icon">🔍</span>
            <input type="text" class="form-control" id="searchInput" placeholder="ค้นหาสินค้า, SKU, หมวดหมู่..." style="min-width:220px;">
          </div>
          <select class="form-select" id="categoryFilter" style="min-width:140px;">
            <option value="all">ทุกหมวดหมู่</option>
          </select>
          <select class="form-select" id="stockFilter" style="min-width:130px;">
            <option value="all">ทุกสถานะ</option>
            <option value="out">หมดสต๊อก</option>
            <option value="low">ใกล้หมด</option>
            <option value="ok">ปกติ</option>
          </select>
        </div>
        <div class="table-toolbar-right">
          <span class="table-info" id="tableInfo">กำลังโหลด...</span>
          <button class="btn btn-primary" onclick="openAddModal()">➕ เพิ่มสินค้า</button>
        </div>
      </div>

      <div class="table-responsive">
        <table class="table table-hover">
          <thead>
            <tr>
              <th style="width:50px;">#</th>
              <th>รูป</th>
              <th class="sortable" onclick="sortBy('ProductName')">ชื่อสินค้า</th>
              <th>SKU</th>
              <th>หมวดหมู่</th>
              <th class="sortable" onclick="sortBy('Quantity')">คงเหลือ</th>
              <th>ราคาทุน</th>
              <th>ราคาขาย</th>
              <th style="width:110px;">จัดการ</th>
            </tr>
          </thead>
          <tbody id="productTableBody">
            ${getSkeletonRows(7, 9)}
          </tbody>
        </table>
      </div>

      <div class="table-footer">
        <div class="table-info" id="tableInfoBottom"></div>
        <div id="pagination"></div>
      </div>
    </div>
  `;
}

function bindSearch() {
  const searchInput = document.getElementById('searchInput');
  const categoryFilter = document.getElementById('categoryFilter');
  const stockFilter = document.getElementById('stockFilter');
  if (searchInput) searchInput.addEventListener('input', debounce(applyFilters, 300));
  if (categoryFilter) categoryFilter.addEventListener('change', applyFilters);
  if (stockFilter) stockFilter.addEventListener('change', applyFilters);
}

function updateCategoryOptions() {
  const sel = document.getElementById('categoryFilter');
  const datalist = document.getElementById('categoryList');
  if (sel) {
    const current = sel.value;
    sel.innerHTML = '<option value="all">ทุกหมวดหมู่</option>' +
      [...categories].map(c => `<option value="${c}">${c}</option>`).join('');
    sel.value = current;
  }
  if (datalist) {
    datalist.innerHTML = [...categories].map(c => `<option value="${c}">`).join('');
  }
}

function applyFilters() {
  const search = (document.getElementById('searchInput')?.value || '').toLowerCase();
  const category = document.getElementById('categoryFilter')?.value || 'all';
  const stock = document.getElementById('stockFilter')?.value || 'all';

  filteredProducts = allProducts.filter(p => {
    const matchSearch = !search ||
      (p.ProductName||'').toLowerCase().includes(search) ||
      (p.SKU||'').toLowerCase().includes(search) ||
      (p.Category||'').toLowerCase().includes(search) ||
      (p.Location||'').toLowerCase().includes(search);
    const matchCat = category === 'all' || p.Category === category;
    const qty = parseInt(p.Quantity);
    const min = parseInt(p.MinStock || 5);
    const matchStock = stock === 'all' ||
      (stock === 'out' && qty === 0) ||
      (stock === 'low' && qty > 0 && qty <= min) ||
      (stock === 'ok' && qty > min);
    return matchSearch && matchCat && matchStock;
  });

  currentPage = 1;
  renderTable();
}

function filterByLowStock() {
  const sel = document.getElementById('stockFilter');
  if (sel) { sel.value = 'low'; applyFilters(); }
}

let sortField = '';
let sortDir = 1;
function sortBy(field) {
  if (sortField === field) sortDir *= -1;
  else { sortField = field; sortDir = 1; }
  filteredProducts.sort((a, b) => {
    const va = a[field] || ''; const vb = b[field] || '';
    const na = parseFloat(va); const nb = parseFloat(vb);
    if (!isNaN(na) && !isNaN(nb)) return (na - nb) * sortDir;
    return va.localeCompare(vb, 'th') * sortDir;
  });
  renderTable();
}

function renderTable() {
  const paged = paginate(filteredProducts, currentPage, PAGE_SIZE);
  const tbody = document.getElementById('productTableBody');
  const infoEl = document.getElementById('tableInfo');
  const infoBotEl = document.getElementById('tableInfoBottom');

  const total = filteredProducts.length;
  const start = (currentPage - 1) * PAGE_SIZE + 1;
  const end = Math.min(currentPage * PAGE_SIZE, total);
  const infoText = total ? `แสดง ${start}–${end} จาก ${total} รายการ` : 'ไม่พบสินค้า';
  if (infoEl) infoEl.textContent = infoText;
  if (infoBotEl) infoBotEl.textContent = infoText;

  if (!paged.items.length) {
    tbody.innerHTML = `<tr><td colspan="9">
      <div class="empty-state"><div class="empty-icon">📦</div><p>ไม่พบสินค้า</p></div>
    </td></tr>`;
    document.getElementById('pagination').innerHTML = '';
    return;
  }

  tbody.innerHTML = paged.items.map((p, i) => {
    const img = p.ImageURL
      ? `<img src="${p.ImageURL}" class="product-img" onerror="this.style.display='none';this.nextSibling.style.display='flex'">
         <div class="product-img-placeholder" style="display:none;">📷</div>`
      : `<div class="product-img-placeholder">📷</div>`;
    return `
      <tr>
        <td style="color:var(--text-muted);font-size:12px;">${start + i}</td>
        <td><div style="display:flex;">${img}</div></td>
        <td>
          <div style="font-weight:600;">${p.ProductName || '-'}</div>
          <div style="font-size:11px;color:var(--text-muted);">${p.Location ? '📍 ' + p.Location : ''}</div>
        </td>
        <td><code style="font-size:12px;">${p.SKU || '-'}</code></td>
        <td><span class="badge" style="background:var(--surface-alt);color:var(--text-secondary);border:1px solid var(--border);">${p.Category || '-'}</span></td>
        <td>${getStockBadge(p.Quantity, p.MinStock)}</td>
        <td>${formatCurrency(p.CostPrice)}</td>
        <td>${formatCurrency(p.SellPrice)}</td>
        <td>
          <div class="action-btns">
            <button class="btn btn-sm btn-outline-primary btn-icon" onclick="openEditModal('${p.ProductID}')" title="แก้ไข">✏️</button>
            <button class="btn btn-sm btn-danger btn-icon" onclick="deleteProduct('${p.ProductID}','${p.ProductName}')" title="ลบ">🗑️</button>
          </div>
        </td>
      </tr>
    `;
  }).join('');

  renderPagination('pagination', currentPage, paged.totalPages, p => {
    currentPage = p;
    renderTable();
    window.scrollTo(0, 0);
  });
}

// ============================================================
// Modal Operations
// ============================================================
function openAddModal() {
  editMode = false;
  document.getElementById('modalTitle').textContent = '➕ เพิ่มสินค้าใหม่';
  clearProductForm();
  productModal.show();
}

function openEditModal(id) {
  const p = allProducts.find(x => x.ProductID === id);
  if (!p) return;
  editMode = true;
  document.getElementById('modalTitle').textContent = '✏️ แก้ไขสินค้า';
  document.getElementById('productID').value = p.ProductID;
  document.getElementById('productName').value = p.ProductName || '';
  document.getElementById('sku').value = p.SKU || '';
  document.getElementById('category').value = p.Category || '';
  document.getElementById('unit').value = p.Unit || '';
  document.getElementById('quantity').value = p.Quantity || 0;
  document.getElementById('costPrice').value = p.CostPrice || 0;
  document.getElementById('sellPrice').value = p.SellPrice || 0;
  document.getElementById('location').value = p.Location || '';
  document.getElementById('minStock').value = p.MinStock || 5;
  document.getElementById('description').value = p.Description || '';
  document.getElementById('imageURL').value = p.ImageURL || '';
  productModal.show();
}

function clearProductForm() {
  ['productID','productName','sku','category','unit','description','imageURL','location'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  document.getElementById('quantity').value = 0;
  document.getElementById('costPrice').value = 0;
  document.getElementById('sellPrice').value = 0;
  document.getElementById('minStock').value = 5;
  document.getElementById('unit').value = 'ชิ้น';
}

async function saveProduct() {
  const name = document.getElementById('productName').value.trim();
  if (!name) { showToast('กรุณากรอกชื่อสินค้า', 'warning'); return; }

  const data = {
    productID: document.getElementById('productID').value,
    productName: name,
    sku: document.getElementById('sku').value.trim(),
    category: document.getElementById('category').value.trim(),
    unit: document.getElementById('unit').value.trim() || 'ชิ้น',
    quantity: document.getElementById('quantity').value,
    costPrice: document.getElementById('costPrice').value,
    sellPrice: document.getElementById('sellPrice').value,
    location: document.getElementById('location').value.trim(),
    minStock: document.getElementById('minStock').value,
    description: document.getElementById('description').value.trim(),
    imageURL: document.getElementById('imageURL').value.trim(),
  };

  let result;
  if (editMode) {
    result = await apiUpdateProduct(data);
  } else {
    result = await apiAddProduct(data);
  }

  if (result.success) {
    showToast(result.message || 'บันทึกสำเร็จ', 'success');
    productModal.hide();
    loadProducts();
  } else {
    showToast(result.message || 'เกิดข้อผิดพลาด', 'error');
  }
}

async function deleteProduct(id, name) {
  const ok = await confirmDialog('ลบสินค้า', `ต้องการลบ "${name}" ใช่หรือไม่? การกระทำนี้ไม่สามารถย้อนกลับได้`, 'ลบ');
  if (!ok) return;
  const result = await apiDeleteProduct(id);
  if (result.success) {
    showToast(result.message, 'success');
    loadProducts();
  } else {
    showToast(result.message, 'error');
  }
}

// ============================================================
// Helpers
// ============================================================
function getSkeletonRows(rows, cols) {
  return Array(rows).fill(0).map(() =>
    `<tr class="skeleton-row">${Array(cols).fill(0).map(() =>
      `<td><div class="skeleton" style="height:14px;width:80%;"></div></td>`
    ).join('')}</tr>`
  ).join('');
}

function debounce(fn, ms) {
  let t;
  return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
}

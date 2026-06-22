// ============================================================
// api.js - Google Apps Script API Connector
// แก้ไข API_URL ให้ตรงกับ Web App URL ที่ได้จากการ Deploy
// ============================================================

const API_URL = 'api';

// ============================================================
// Core Fetch Functions
// ============================================================
async function apiGet(action, params = {}) {
  const url = new URL(API_URL);
  url.searchParams.set('action', action);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));

  showLoader();
  try {
    const res = await fetch(url.toString());
    const data = await res.json();
    return data;
  } catch (err) {
    console.error('API GET error:', err);
    showToast('เกิดข้อผิดพลาดในการเชื่อมต่อ', 'error');
    return { success: false, message: err.toString() };
  } finally {
    hideLoader();
  }
}

async function apiPost(action, body = {}) {
  showLoader();
  try {
    const res = await fetch(API_URL, {
      method: 'POST',
      body: JSON.stringify({ action, ...body }),
      headers: { 'Content-Type': 'text/plain' }  // ใช้ text/plain เพื่อหลีกเลี่ยง CORS preflight
    });
    const data = await res.json();
    return data;
  } catch (err) {
    console.error('API POST error:', err);
    showToast('เกิดข้อผิดพลาดในการเชื่อมต่อ', 'error');
    return { success: false, message: err.toString() };
  } finally {
    hideLoader();
  }
}

// ============================================================
// Auth API
// ============================================================
async function apiLogin(username, password) {
  return await apiPost('login', { username, password });
}

// ============================================================
// Products API
// ============================================================
async function apiGetProducts(params = {}) {
  return await apiGet('getProducts', params);
}

async function apiGetProduct(id) {
  return await apiGet('getProduct', { id });
}

async function apiAddProduct(data) {
  return await apiPost('addProduct', data);
}

async function apiUpdateProduct(data) {
  return await apiPost('updateProduct', data);
}

async function apiDeleteProduct(productID) {
  return await apiPost('deleteProduct', { productID });
}

// ============================================================
// Stock API
// ============================================================
async function apiStockIn(data) {
  return await apiPost('stockIn', data);
}

async function apiStockOut(data) {
  return await apiPost('stockOut', data);
}

async function apiGetStockIn(params = {}) {
  return await apiGet('getStockIn', params);
}

async function apiGetStockOut(params = {}) {
  return await apiGet('getStockOut', params);
}

// ============================================================
// Dashboard API
// ============================================================
async function apiGetDashboard() {
  return await apiGet('getDashboard');
}

// ============================================================
// Report API
// ============================================================
async function apiGetReport(params = {}) {
  return await apiGet('getReport', params);
}

// ============================================================
// UI Helpers
// ============================================================
function showLoader() {
  const loader = document.getElementById('globalLoader');
  if (loader) loader.style.display = 'flex';
}

function hideLoader() {
  const loader = document.getElementById('globalLoader');
  if (loader) loader.style.display = 'none';
}

function showToast(message, type = 'success') {
  const icons = { success: 'success', error: 'error', warning: 'warning', info: 'info' };
  if (typeof Swal !== 'undefined') {
    Swal.fire({
      toast: true,
      position: 'top-end',
      icon: icons[type] || 'info',
      title: message,
      showConfirmButton: false,
      timer: 3000,
      timerProgressBar: true
    });
  } else {
    alert(message);
  }
}

async function confirmDialog(title, text, confirmText = 'ยืนยัน') {
  if (typeof Swal === 'undefined') return confirm(text);
  const result = await Swal.fire({
    title, text,
    icon: 'warning',
    showCancelButton: true,
    confirmButtonColor: '#1565C0',
    cancelButtonColor: '#6c757d',
    confirmButtonText: confirmText,
    cancelButtonText: 'ยกเลิก'
  });
  return result.isConfirmed;
}

// ============================================================
// Auth Session
// ============================================================
function getSession() {
  const s = sessionStorage.getItem('ims_user');
  return s ? JSON.parse(s) : null;
}

function setSession(user) {
  sessionStorage.setItem('ims_user', JSON.stringify(user));
}

function clearSession() {
  sessionStorage.removeItem('ims_user');
}

function requireAuth() {
  const user = getSession();
  if (!user) {
    window.location.href = 'login.html';
    return null;
  }
  return user;
}

function requireAdmin() {
  const user = requireAuth();
  if (user && user.role !== 'admin') {
    showToast('คุณไม่มีสิทธิ์เข้าถึงส่วนนี้', 'error');
    window.location.href = 'index.html';
    return null;
  }
  return user;
}

// ============================================================
// Pagination Helper
// ============================================================
function paginate(data, page, pageSize = 20) {
  const total = data.length;
  const totalPages = Math.ceil(total / pageSize);
  const start = (page - 1) * pageSize;
  const items = data.slice(start, start + pageSize);
  return { items, total, totalPages, page };
}

function renderPagination(containerId, currentPage, totalPages, callback) {
  const container = document.getElementById(containerId);
  if (!container) return;
  if (totalPages <= 1) { container.innerHTML = ''; return; }

  let html = '<ul class="pagination pagination-sm mb-0 justify-content-center">';
  html += `<li class="page-item ${currentPage === 1 ? 'disabled' : ''}">
    <a class="page-link" href="#" onclick="return false;" data-page="${currentPage-1}">‹</a></li>`;
  for (let i = 1; i <= totalPages; i++) {
    if (totalPages > 7 && Math.abs(i - currentPage) > 2 && i !== 1 && i !== totalPages) {
      if (i === 2 || i === totalPages - 1) html += '<li class="page-item disabled"><span class="page-link">…</span></li>';
      continue;
    }
    html += `<li class="page-item ${i === currentPage ? 'active' : ''}">
      <a class="page-link" href="#" onclick="return false;" data-page="${i}">${i}</a></li>`;
  }
  html += `<li class="page-item ${currentPage === totalPages ? 'disabled' : ''}">
    <a class="page-link" href="#" onclick="return false;" data-page="${currentPage+1}">›</a></li>`;
  html += '</ul>';
  container.innerHTML = html;

  container.querySelectorAll('.page-link[data-page]').forEach(link => {
    link.addEventListener('click', () => {
      const p = parseInt(link.dataset.page);
      if (p >= 1 && p <= totalPages) callback(p);
    });
  });
}

// ============================================================
// Format Helpers
// ============================================================
function formatNumber(n) {
  return new Intl.NumberFormat('th-TH').format(n || 0);
}

function formatCurrency(n) {
  return new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB', minimumFractionDigits: 0 }).format(n || 0);
}

function formatDate(d) {
  if (!d) return '-';
  const date = new Date(d);
  if (isNaN(date)) return d;
  return date.toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric' });
}

function getStockBadge(qty, minStock = 5) {
  qty = parseInt(qty);
  minStock = parseInt(minStock);
  if (qty === 0) return '<span class="badge bg-danger">หมดสต๊อก</span>';
  if (qty <= minStock) return `<span class="badge bg-warning text-dark">ใกล้หมด (${qty})</span>`;
  return `<span class="badge bg-success">${qty}</span>`;
}

// ============================================================
// Dark Mode
// ============================================================
function initDarkMode() {
  const toggle = document.getElementById('darkModeToggle');
  const isDark = localStorage.getItem('darkMode') === 'true';
  if (isDark) document.body.classList.add('dark-mode');
  if (toggle) {
    toggle.checked = isDark;
    toggle.addEventListener('change', () => {
      document.body.classList.toggle('dark-mode', toggle.checked);
      localStorage.setItem('darkMode', toggle.checked);
    });
  }
}

// ============================================================
// User Info in Navbar
// ============================================================
function renderUserInfo() {
  const user = getSession();
  const el = document.getElementById('userInfo');
  if (el && user) {
    el.textContent = `${user.username} (${user.role === 'admin' ? 'ผู้ดูแล' : 'พนักงาน'})`;
  }
}

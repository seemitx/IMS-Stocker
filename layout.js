// ============================================================
// layout.js - Shared Layout (Sidebar + Topbar)
// ============================================================

function renderLayout(pageTitle, activeNav) {
  const user = requireAuth();
  if (!user) return;

  const isAdmin = user.role === 'admin';

  const sidebarHTML = `
    <nav class="sidebar" id="sidebar">
      <div class="sidebar-brand">
        <div class="brand-icon">📦</div>
        <div>
          <div class="brand-name">IMS System</div>
          <div class="brand-sub">จัดการสต๊อกสินค้า</div>
        </div>
      </div>
      <div class="sidebar-nav">
        <div class="nav-section-label">หลัก</div>
        <a href="index.html" class="sidebar-link ${activeNav==='dashboard'?'active':''}">
          <span class="nav-icon">📊</span> Dashboard
        </a>
        <a href="products.html" class="sidebar-link ${activeNav==='products'?'active':''}">
          <span class="nav-icon">📦</span> สินค้า
        </a>
        <div class="nav-section-label">การเคลื่อนไหว</div>
        <a href="stock-in.html" class="sidebar-link ${activeNav==='stockin'?'active':''}">
          <span class="nav-icon">📥</span> รับสินค้าเข้า
        </a>
        <a href="stock-out.html" class="sidebar-link ${activeNav==='stockout'?'active':''}">
          <span class="nav-icon">📤</span> เบิกสินค้าออก
        </a>
        <div class="nav-section-label">รายงาน</div>
        <a href="reports.html" class="sidebar-link ${activeNav==='reports'?'active':''}">
          <span class="nav-icon">📋</span> รายงาน
        </a>
        <div class="nav-section-label">ระบบ</div>
        <a href="#" class="sidebar-link" onclick="doLogout()">
          <span class="nav-icon">🚪</span> ออกจากระบบ
        </a>
      </div>
      <div class="sidebar-footer">
        <div style="font-size:11px;color:rgba(255,255,255,0.4);">v1.0 • IMS System</div>
      </div>
    </nav>
  `;

  const topbarHTML = `
    <div class="topbar">
      <button class="sidebar-toggle" onclick="toggleSidebar()">☰</button>
      <span class="topbar-title">${pageTitle}</span>
      <div class="topbar-actions">
        <label class="dark-toggle">
          🌙
          <div class="form-check form-switch mb-0 ms-1">
            <input class="form-check-input" type="checkbox" id="darkModeToggle">
          </div>
        </label>
        <div class="user-badge">
          <div class="user-avatar">${user.username.charAt(0).toUpperCase()}</div>
          <span id="userInfo">${user.username}</span>
        </div>
      </div>
    </div>
  `;

  // สร้าง layout
  document.body.insertAdjacentHTML('afterbegin', `
    <div id="globalLoader"><div class="loader-spinner"></div></div>
    <div class="app-layout">
      ${sidebarHTML}
      <div class="main-content">
        ${topbarHTML}
        <div class="page-content" id="pageContent"></div>
      </div>
    </div>
    <div class="sidebar-overlay" id="sidebarOverlay" onclick="closeSidebar()" 
         style="display:none;position:fixed;inset:0;background:rgba(0,0,0,0.4);z-index:999;"></div>
  `);

  renderUserInfo();
  initDarkMode();
}

function toggleSidebar() {
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebarOverlay');
  sidebar.classList.toggle('open');
  overlay.style.display = sidebar.classList.contains('open') ? 'block' : 'none';
}

function closeSidebar() {
  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('sidebarOverlay').style.display = 'none';
}

function doLogout() {
  clearSession();
  window.location.href = 'login.html';
}

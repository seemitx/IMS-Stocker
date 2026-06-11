// ============================================================
// dashboard.js
// ============================================================

let movementChart = null;

document.addEventListener('DOMContentLoaded', () => {
  renderLayout('Dashboard', 'dashboard');
  loadDashboard();
});

async function loadDashboard() {
  const container = document.getElementById('pageContent');
  container.innerHTML = getSkeletonHTML();

  const result = await apiGetDashboard();

  if (!result.success) {
    container.innerHTML = renderError(result.message);
    return;
  }

  const d = result.data;
  container.innerHTML = getDashboardHTML(d);
  renderMovementChart(d.chart);
  renderCategoryBars(d.categories);
  renderLowStockList(d.lowStockItems);
}

function getDashboardHTML(d) {
  return `
    <!-- Stat Cards -->
    <div class="row g-3 mb-4">
      <div class="col-6 col-lg-3">
        <div class="stat-card">
          <div class="stat-icon blue">📦</div>
          <div class="stat-info">
            <div class="stat-value">${formatNumber(d.totalProducts)}</div>
            <div class="stat-label">สินค้าทั้งหมด</div>
          </div>
        </div>
      </div>
      <div class="col-6 col-lg-3">
        <div class="stat-card">
          <div class="stat-icon orange">⚠️</div>
          <div class="stat-info">
            <div class="stat-value">${formatNumber(d.lowStock)}</div>
            <div class="stat-label">สินค้าใกล้หมด</div>
          </div>
        </div>
      </div>
      <div class="col-6 col-lg-3">
        <div class="stat-card">
          <div class="stat-icon red">🚫</div>
          <div class="stat-info">
            <div class="stat-value">${formatNumber(d.outOfStock)}</div>
            <div class="stat-label">หมดสต๊อก</div>
          </div>
        </div>
      </div>
      <div class="col-6 col-lg-3">
        <div class="stat-card">
          <div class="stat-icon green">💰</div>
          <div class="stat-info">
            <div class="stat-value" style="font-size:18px;">${formatCurrency(d.totalValue)}</div>
            <div class="stat-label">มูลค่าสินค้ารวม</div>
          </div>
        </div>
      </div>
    </div>

    <!-- Low Stock Alert -->
    ${d.lowStock > 0 ? `
    <div class="alert-low-stock mb-4">
      <span style="font-size:18px;">⚠️</span>
      <div>
        <strong>แจ้งเตือน:</strong> มีสินค้า ${d.lowStock} รายการที่ใกล้หมดสต๊อก
        <a href="products.html?filter=low" class="ms-2" style="color:#E65100;text-decoration:underline;">ดูรายการ →</a>
      </div>
    </div>` : ''}

    <!-- Charts Row -->
    <div class="row g-3 mb-4">
      <div class="col-lg-8">
        <div class="card">
          <div class="card-header">
            <span class="card-title">📈 การเคลื่อนไหวสินค้า 7 วันล่าสุด</span>
            <small style="color:var(--text-muted);">รับเข้า vs เบิกออก</small>
          </div>
          <div class="card-body">
            <div class="chart-container">
              <canvas id="movementChart"></canvas>
            </div>
          </div>
        </div>
      </div>
      <div class="col-lg-4">
        <div class="card h-100">
          <div class="card-header">
            <span class="card-title">📂 หมวดหมู่สินค้า</span>
          </div>
          <div class="card-body" id="categoryBars">
            <div class="empty-state"><div class="empty-icon">📂</div><p>ไม่มีข้อมูล</p></div>
          </div>
        </div>
      </div>
    </div>

    <!-- Low Stock Table + Quick Actions -->
    <div class="row g-3">
      <div class="col-lg-7">
        <div class="card">
          <div class="card-header">
            <span class="card-title">🔴 สินค้าใกล้หมด / หมดสต๊อก</span>
            <a href="products.html" class="btn btn-sm btn-outline-primary">ดูทั้งหมด</a>
          </div>
          <div class="card-body p-0" id="lowStockList">
            <div class="empty-state"><div class="empty-icon">✅</div><p>สินค้าทุกรายการมีเพียงพอ</p></div>
          </div>
        </div>
      </div>
      <div class="col-lg-5">
        <div class="card">
          <div class="card-header">
            <span class="card-title">⚡ ทำรายการด่วน</span>
          </div>
          <div class="card-body">
            <div class="d-grid gap-2">
              <a href="stock-in.html" class="btn btn-success">
                📥 รับสินค้าเข้า
              </a>
              <a href="stock-out.html" class="btn btn-primary">
                📤 เบิกสินค้าออก
              </a>
              <a href="products.html" class="btn btn-outline-primary">
                ➕ เพิ่มสินค้าใหม่
              </a>
              <a href="reports.html" class="btn btn-outline-primary">
                📋 ดูรายงาน
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
}

function renderMovementChart(chart) {
  const ctx = document.getElementById('movementChart');
  if (!ctx || !chart) return;

  if (movementChart) movementChart.destroy();

  movementChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: chart.labels,
      datasets: [
        {
          label: 'รับเข้า',
          data: chart.in,
          backgroundColor: 'rgba(46,125,50,0.75)',
          borderRadius: 5,
        },
        {
          label: 'เบิกออก',
          data: chart.out,
          backgroundColor: 'rgba(198,40,40,0.75)',
          borderRadius: 5,
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: 'top' }
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: { stepSize: 1 }
        }
      }
    }
  });
}

function renderCategoryBars(categories) {
  const el = document.getElementById('categoryBars');
  if (!el) return;
  const entries = Object.entries(categories || {});
  if (!entries.length) {
    el.innerHTML = '<div class="empty-state"><div class="empty-icon">📂</div><p>ยังไม่มีหมวดหมู่</p></div>';
    return;
  }
  const max = Math.max(...entries.map(e => e[1]));
  el.innerHTML = entries.map(([cat, count]) => `
    <div class="category-bar">
      <span class="category-bar-label">${cat || 'ไม่ระบุ'}</span>
      <div class="category-bar-track">
        <div class="category-bar-fill" style="width:${Math.round((count/max)*100)}%"></div>
      </div>
      <span class="category-bar-count">${count}</span>
    </div>
  `).join('');
}

function renderLowStockList(items) {
  const el = document.getElementById('lowStockList');
  if (!el) return;
  if (!items || !items.length) {
    el.innerHTML = '<div class="empty-state"><div class="empty-icon">✅</div><p>สินค้าทุกรายการมีเพียงพอ</p></div>';
    return;
  }
  el.innerHTML = '<div style="padding:0 16px;">' + items.map(item => `
    <div class="low-stock-item">
      <div>
        <div class="low-stock-name">${item.ProductName || '-'}</div>
        <div class="low-stock-sku">SKU: ${item.SKU || '-'} | หมวด: ${item.Category || '-'}</div>
      </div>
      <div class="text-end">
        ${getStockBadge(item.Quantity, item.MinStock)}
        <div style="font-size:11px;color:var(--text-muted);margin-top:2px;">
          ขั้นต่ำ ${item.MinStock || 5} ${item.Unit || 'ชิ้น'}
        </div>
      </div>
    </div>
  `).join('') + '</div>';
}

function getSkeletonHTML() {
  return `
    <div class="row g-3 mb-4">
      ${[1,2,3,4].map(() => `
        <div class="col-6 col-lg-3">
          <div class="stat-card">
            <div class="skeleton" style="width:52px;height:52px;border-radius:12px;"></div>
            <div>
              <div class="skeleton" style="width:80px;height:26px;margin-bottom:6px;"></div>
              <div class="skeleton" style="width:100px;height:14px;"></div>
            </div>
          </div>
        </div>
      `).join('')}
    </div>
    <div class="row g-3">
      <div class="col-lg-8"><div class="card" style="height:320px;"></div></div>
      <div class="col-lg-4"><div class="card" style="height:320px;"></div></div>
    </div>
  `;
}

function renderError(msg) {
  return `<div class="alert alert-danger m-4">⚠️ ${msg || 'เกิดข้อผิดพลาด'}</div>`;
}

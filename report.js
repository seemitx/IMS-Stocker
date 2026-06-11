// ============================================================
// report.js - Reports & Export
// ============================================================

let reportData = [];
let reportType = 'inventory';

document.addEventListener('DOMContentLoaded', () => {
  renderLayout('รายงาน', 'reports');
  loadReportPage();
});

function loadReportPage() {
  const container = document.getElementById('pageContent');
  container.innerHTML = getReportHTML();
  loadReport('inventory');
}

function getReportHTML() {
  const today = new Date().toISOString().split('T')[0];
  const monthStart = today.substring(0, 7) + '-01';
  return `
    <!-- Report Tabs -->
    <div class="card mb-4">
      <div class="card-body" style="padding:16px 20px;">
        <div class="d-flex flex-wrap gap-2 align-items-center justify-content-between">
          <div class="d-flex gap-2 flex-wrap">
            <button class="btn btn-primary" id="tab-inventory" onclick="loadReport('inventory')">📦 สินค้าคงเหลือ</button>
            <button class="btn btn-outline-primary" id="tab-stockin" onclick="loadReport('stockin')">📥 รับเข้า</button>
            <button class="btn btn-outline-primary" id="tab-stockout" onclick="loadReport('stockout')">📤 เบิกออก</button>
          </div>
          <div class="d-flex gap-2 flex-wrap align-items-center" id="dateFilters" style="display:none!important;">
            <input type="date" class="form-control form-control-sm" id="fromDate" value="${monthStart}" style="width:140px;">
            <span style="color:var(--text-muted);">ถึง</span>
            <input type="date" class="form-control form-control-sm" id="toDate" value="${today}" style="width:140px;">
            <button class="btn btn-sm btn-outline-primary" onclick="applyDateFilter()">กรอง</button>
          </div>
          <div class="d-flex gap-2">
            <button class="btn btn-sm btn-outline-primary" onclick="exportExcel()">📊 Export Excel</button>
            <button class="btn btn-sm btn-danger" onclick="exportPDF()">📄 Export PDF</button>
          </div>
        </div>
      </div>
    </div>

    <!-- Summary Cards -->
    <div id="reportSummary" class="mb-4"></div>

    <!-- Table -->
    <div class="table-wrapper">
      <div class="table-toolbar">
        <div class="card-title ms-1" id="reportTitle">สินค้าคงเหลือ</div>
        <div class="d-flex gap-2 align-items-center">
          <div class="search-bar">
            <span class="search-icon">🔍</span>
            <input type="text" class="form-control form-control-sm" id="reportSearch" placeholder="ค้นหา..." oninput="filterReport()">
          </div>
          <span class="table-info" id="reportInfo"></span>
        </div>
      </div>
      <div class="table-responsive">
        <table class="table table-hover">
          <thead id="reportThead"><tr><td>กำลังโหลด...</td></tr></thead>
          <tbody id="reportTbody"><tr><td>กำลังโหลด...</td></tr></tbody>
        </table>
      </div>
      <div class="table-footer">
        <div id="reportInfoBottom"></div>
        <div id="reportPagination"></div>
      </div>
    </div>
  `;
}

let filteredReport = [];
let reportPage = 1;
const REPORT_PAGE_SIZE = 20;

async function loadReport(type) {
  reportType = type;
  reportPage = 1;

  // Update tab buttons
  ['inventory','stockin','stockout'].forEach(t => {
    const btn = document.getElementById(`tab-${t}`);
    if (btn) btn.className = t === type ? 'btn btn-primary' : 'btn btn-outline-primary';
  });

  // Show/hide date filters
  const df = document.getElementById('dateFilters');
  if (df) df.style.display = (type !== 'inventory') ? 'flex' : 'none';

  const titles = { inventory: '📦 สินค้าคงเหลือ', stockin: '📥 รายงานรับเข้า', stockout: '📤 รายงานเบิกออก' };
  const titleEl = document.getElementById('reportTitle');
  if (titleEl) titleEl.textContent = titles[type] || type;

  // Build params
  let params = { type };
  if (type !== 'inventory') {
    const from = document.getElementById('fromDate')?.value;
    const to = document.getElementById('toDate')?.value;
    if (from) params.from = from;
    if (to) params.to = to;
  }

  const result = await apiGetReport(params);
  if (!result.success) {
    document.getElementById('reportTbody').innerHTML = `<tr><td colspan="10" class="text-center text-danger">⚠️ ${result.message}</td></tr>`;
    return;
  }

  reportData = result.data || [];
  renderSummaryCards();
  filteredReport = [...reportData];
  renderReportTable();
}

function applyDateFilter() {
  loadReport(reportType);
}

function filterReport() {
  const q = document.getElementById('reportSearch')?.value.toLowerCase() || '';
  filteredReport = reportData.filter(r =>
    Object.values(r).some(v => (v||'').toString().toLowerCase().includes(q))
  );
  reportPage = 1;
  renderReportTable();
}

function renderSummaryCards() {
  const el = document.getElementById('reportSummary');
  if (!el) return;

  if (reportType === 'inventory') {
    const total = reportData.length;
    const totalValue = reportData.reduce((s, p) => s + parseFloat(p.CostPrice||0) * parseInt(p.Quantity||0), 0);
    const outOfStock = reportData.filter(p => parseInt(p.Quantity) === 0).length;
    el.innerHTML = `
      <div class="row g-3">
        <div class="col-6 col-md-3">
          <div class="stat-card"><div class="stat-icon blue">📦</div>
            <div class="stat-info"><div class="stat-value">${formatNumber(total)}</div><div class="stat-label">รายการสินค้า</div></div></div>
        </div>
        <div class="col-6 col-md-3">
          <div class="stat-card"><div class="stat-icon green">💰</div>
            <div class="stat-info"><div class="stat-value" style="font-size:18px;">${formatCurrency(totalValue)}</div><div class="stat-label">มูลค่ารวม</div></div></div>
        </div>
        <div class="col-6 col-md-3">
          <div class="stat-card"><div class="stat-icon red">🚫</div>
            <div class="stat-info"><div class="stat-value">${formatNumber(outOfStock)}</div><div class="stat-label">หมดสต๊อก</div></div></div>
        </div>
        <div class="col-6 col-md-3">
          <div class="stat-card"><div class="stat-icon teal">📊</div>
            <div class="stat-info"><div class="stat-value">${formatNumber(reportData.reduce((s,p)=>s+parseInt(p.Quantity||0),0))}</div><div class="stat-label">รวมจำนวนทั้งหมด</div></div></div>
        </div>
      </div>
    `;
  } else {
    const totalQty = reportData.reduce((s, r) => s + parseInt(r.Quantity||0), 0);
    el.innerHTML = `
      <div class="row g-3">
        <div class="col-6 col-md-4">
          <div class="stat-card"><div class="stat-icon blue">📋</div>
            <div class="stat-info"><div class="stat-value">${formatNumber(reportData.length)}</div><div class="stat-label">รายการทั้งหมด</div></div></div>
        </div>
        <div class="col-6 col-md-4">
          <div class="stat-card"><div class="stat-icon ${reportType==='stockin'?'green':'orange'}">📦</div>
            <div class="stat-info"><div class="stat-value">${formatNumber(totalQty)}</div><div class="stat-label">จำนวนรวม</div></div></div>
        </div>
      </div>
    `;
  }
}

function renderReportTable() {
  const thead = document.getElementById('reportThead');
  const tbody = document.getElementById('reportTbody');
  const infoEl = document.getElementById('reportInfo');
  const infoBotEl = document.getElementById('reportInfoBottom');
  if (!thead || !tbody) return;

  let headers = [];
  if (reportType === 'inventory') {
    headers = ['SKU','ชื่อสินค้า','หมวดหมู่','คงเหลือ','หน่วย','ราคาทุน','ราคาขาย','มูลค่า','ที่จัดเก็บ'];
  } else {
    headers = ['รหัส TX','สินค้า','จำนวน', reportType==='stockin' ? 'ผู้จัดจำหน่าย' : 'ผู้รับ', 'วันที่','หมายเหตุ'];
  }
  thead.innerHTML = `<tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr>`;

  const paged = paginate(filteredReport, reportPage, REPORT_PAGE_SIZE);
  const total = filteredReport.length;
  const start = (reportPage - 1) * REPORT_PAGE_SIZE + 1;
  const end = Math.min(reportPage * REPORT_PAGE_SIZE, total);
  const infoText = total ? `${start}–${end} จาก ${total} รายการ` : 'ไม่พบข้อมูล';
  if (infoEl) infoEl.textContent = infoText;
  if (infoBotEl) infoBotEl.textContent = infoText;

  if (!paged.items.length) {
    tbody.innerHTML = `<tr><td colspan="${headers.length}"><div class="empty-state"><div class="empty-icon">📋</div><p>ไม่พบข้อมูล</p></div></td></tr>`;
    document.getElementById('reportPagination').innerHTML = '';
    return;
  }

  tbody.innerHTML = paged.items.map(r => {
    if (reportType === 'inventory') {
      const value = parseFloat(r.CostPrice||0) * parseInt(r.Quantity||0);
      return `<tr>
        <td><code style="font-size:11px;">${r.SKU||'-'}</code></td>
        <td><strong>${r.ProductName}</strong></td>
        <td>${r.Category||'-'}</td>
        <td>${getStockBadge(r.Quantity, r.MinStock)}</td>
        <td>${r.Unit||'-'}</td>
        <td>${formatCurrency(r.CostPrice)}</td>
        <td>${formatCurrency(r.SellPrice)}</td>
        <td><strong>${formatCurrency(value)}</strong></td>
        <td>${r.Location||'-'}</td>
      </tr>`;
    } else {
      const badge = reportType === 'stockin'
        ? `<span class="badge bg-success">+${formatNumber(r.Quantity)}</span>`
        : `<span class="badge bg-danger">-${formatNumber(r.Quantity)}</span>`;
      return `<tr>
        <td><code style="font-size:11px;">${r.TransactionID}</code></td>
        <td>${r.ProductName||r.ProductID}</td>
        <td>${badge}</td>
        <td>${r.Supplier||r.Receiver||'-'}</td>
        <td>${formatDate(r.Date)}</td>
        <td style="font-size:12px;color:var(--text-muted);">${r.Note||'-'}</td>
      </tr>`;
    }
  }).join('');

  renderPagination('reportPagination', reportPage, paged.totalPages, p => {
    reportPage = p;
    renderReportTable();
    window.scrollTo(0, 0);
  });
}

// ============================================================
// Export Functions
// ============================================================
function exportExcel() {
  if (!reportData.length) { showToast('ไม่มีข้อมูลสำหรับ Export', 'warning'); return; }

  let csv = '';
  let headers = [];

  if (reportType === 'inventory') {
    headers = ['SKU','ชื่อสินค้า','หมวดหมู่','คงเหลือ','หน่วย','ราคาทุน','ราคาขาย','มูลค่า','ที่จัดเก็บ'];
    csv = headers.join(',') + '\n';
    csv += reportData.map(r => [
      r.SKU, r.ProductName, r.Category, r.Quantity, r.Unit,
      r.CostPrice, r.SellPrice,
      (parseFloat(r.CostPrice||0) * parseInt(r.Quantity||0)).toFixed(2),
      r.Location
    ].map(v => `"${v||''}"`).join(',')).join('\n');
  } else {
    headers = ['รหัส TX','ProductID','ชื่อสินค้า','จำนวน', reportType==='stockin'?'ผู้จัดจำหน่าย':'ผู้รับ','วันที่','หมายเหตุ'];
    csv = headers.join(',') + '\n';
    csv += reportData.map(r => [
      r.TransactionID, r.ProductID, r.ProductName, r.Quantity,
      r.Supplier||r.Receiver, r.Date, r.Note
    ].map(v => `"${v||''}"`).join(',')).join('\n');
  }

  // BOM for Thai UTF-8
  const bom = '\uFEFF';
  const blob = new Blob([bom + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `report_${reportType}_${new Date().toISOString().split('T')[0]}.csv`;
  a.click();
  URL.revokeObjectURL(url);
  showToast('Export CSV สำเร็จ', 'success');
}

function exportPDF() {
  if (!reportData.length) { showToast('ไม่มีข้อมูลสำหรับ Export', 'warning'); return; }

  const titles = { inventory: 'รายงานสินค้าคงเหลือ', stockin: 'รายงานรับสินค้าเข้า', stockout: 'รายงานเบิกสินค้าออก' };
  const printDate = new Date().toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' });

  let tableHTML = '';
  if (reportType === 'inventory') {
    tableHTML = `<table border="1" style="border-collapse:collapse;width:100%;font-size:12px;">
      <thead style="background:#1565C0;color:#fff;">
        <tr><th>SKU</th><th>ชื่อสินค้า</th><th>หมวดหมู่</th><th>คงเหลือ</th><th>หน่วย</th><th>ราคาทุน</th><th>ราคาขาย</th><th>มูลค่า</th></tr>
      </thead><tbody>` +
      reportData.map((r, i) => `<tr style="background:${i%2?'#F5F7FA':'#fff'}">
        <td>${r.SKU||'-'}</td><td>${r.ProductName}</td><td>${r.Category||'-'}</td>
        <td align="center">${r.Quantity}</td><td>${r.Unit||'-'}</td>
        <td align="right">${parseFloat(r.CostPrice||0).toFixed(2)}</td>
        <td align="right">${parseFloat(r.SellPrice||0).toFixed(2)}</td>
        <td align="right"><strong>${(parseFloat(r.CostPrice||0)*parseInt(r.Quantity||0)).toFixed(2)}</strong></td>
      </tr>`).join('') + `</tbody></table>`;
  } else {
    tableHTML = `<table border="1" style="border-collapse:collapse;width:100%;font-size:12px;">
      <thead style="background:#1565C0;color:#fff;">
        <tr><th>รหัส TX</th><th>ชื่อสินค้า</th><th>จำนวน</th><th>${reportType==='stockin'?'ผู้จัดจำหน่าย':'ผู้รับ'}</th><th>วันที่</th><th>หมายเหตุ</th></tr>
      </thead><tbody>` +
      reportData.map((r, i) => `<tr style="background:${i%2?'#F5F7FA':'#fff'}">
        <td>${r.TransactionID}</td><td>${r.ProductName||r.ProductID}</td>
        <td align="center">${r.Quantity}</td>
        <td>${r.Supplier||r.Receiver||'-'}</td>
        <td>${r.Date||'-'}</td><td>${r.Note||'-'}</td>
      </tr>`).join('') + `</tbody></table>`;
  }

  const totalValue = reportType === 'inventory'
    ? reportData.reduce((s,p) => s + parseFloat(p.CostPrice||0)*parseInt(p.Quantity||0), 0) : null;

  const html = `<!DOCTYPE html><html><head>
    <meta charset="UTF-8">
    <title>${titles[reportType]}</title>
    <style>
      body { font-family: 'Sarabun', sans-serif; font-size: 13px; color: #1A2332; padding: 20px; }
      h1 { color: #1565C0; font-size: 20px; margin-bottom: 4px; }
      .meta { color: #546E7A; font-size: 12px; margin-bottom: 16px; }
      table { page-break-inside: auto; }
      tr { page-break-inside: avoid; }
      th, td { padding: 6px 10px; }
      .summary { margin-top: 12px; font-size: 13px; }
    </style>
  </head><body>
    <h1>📦 ${titles[reportType]}</h1>
    <div class="meta">วันที่พิมพ์: ${printDate} | จำนวน: ${reportData.length} รายการ</div>
    ${tableHTML}
    ${totalValue !== null ? `<div class="summary"><strong>มูลค่ารวม: ${formatCurrency(totalValue)}</strong></div>` : ''}
    <script>window.print();<\/script>
  </body></html>`;

  const w = window.open('', '_blank');
  w.document.write(html);
  w.document.close();
}

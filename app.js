/* ============================
   🧾 我的账本 — Core Application
   ============================ */

// ─── IndexedDB  ────────────────────────────────
const DB_NAME = 'ExpenseTrackerDB';
const DB_VERSION = 1;
const STORE_NAME = 'expenses';

let db = null;

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = e => {
      const db_ = e.target.result;
      if (!db_.objectStoreNames.contains(STORE_NAME)) {
        const store = db_.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
        store.createIndex('date', 'date', { unique: false });
        store.createIndex('category', 'category', { unique: false });
        store.createIndex('createdAt', 'createdAt', { unique: false });
      }
    };
    req.onsuccess = e => {
      db = e.target.result;
      resolve(db);
    };
    req.onerror = e => reject(e);
  });
}

function getAllExpenses() {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const index = store.index('date');
    const req = index.openCursor(null, 'prev');
    const results = [];
    req.onsuccess = e => {
      const cursor = e.target.result;
      if (cursor) {
        results.push(cursor.value);
        cursor.continue();
      } else {
        resolve(results);
      }
    };
    req.onerror = e => reject(e);
  });
}

function addExpense(exp) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    exp.createdAt = new Date().toISOString();
    const req = store.add(exp);
    req.onsuccess = () => resolve(req.result);
    req.onerror = e => reject(e);
  });
}

function deleteExpense(id) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const req = store.delete(id);
    req.onsuccess = () => resolve();
    req.onerror = e => reject(e);
  });
}

function updateExpense(exp) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const req = store.put(exp);
    req.onsuccess = () => resolve();
    req.onerror = e => reject(e);
  });
}

function clearAllExpenses() {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const req = store.clear();
    req.onsuccess = () => resolve();
    req.onerror = e => reject(e);
  });
}

// ─── Settings helpers ─────────────────────────

function getApiKey() {
  return localStorage.getItem('gemini_api_key') || '';
}

function saveApiKey() {
  const key = document.getElementById('apiKeyInput').value.trim();
  localStorage.setItem('gemini_api_key', key);
  showToast(key ? '✅ API Key 已保存' : 'API Key 已清除');
}

function getDefaultPayment() {
  return localStorage.getItem('default_payment') || 'TNG';
}

function saveSettings() {
  localStorage.setItem('default_payment', document.getElementById('defaultPayment').value);
  showToast('✅ 设置已保存');
}

// ─── Navigation ───────────────────────────────

const PAGE_TITLES = {
  dashboard: '我的账本',
  add: '记一笔',
  list: '全部账单',
  stats: '消费统计',
  settings: '设置'
};

let currentPage = 'dashboard';

function navigate(page) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.getElementById(`page-${page}`).classList.add('active');
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  document.querySelector(`.nav-item[data-page="${page}"]`)?.classList.add('active');
  document.getElementById('pageTitle').textContent = PAGE_TITLES[page] || '我的账本';
  currentPage = page;

  if (page === 'dashboard') renderDashboard();
  if (page === 'list') renderExpensesList();
  if (page === 'stats') renderStats();
  if (page === 'settings') loadSettings();
}

// ─── Toast ────────────────────────────────────

let toastTimer = null;

function showToast(msg) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.classList.add('visible');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('visible'), 2000);
}

// ─── Date helpers ─────────────────────────────

function todayStr() {
  const d = new Date();
  return d.toISOString().split('T')[0];
}

function formatDate(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  const month = d.getMonth() + 1;
  const day = d.getDate();
  const weekdays = ['日', '一', '二', '三', '四', '五', '六'];
  return `${month}月${day}日 周${weekdays[d.getDay()]}`;
}

function isToday(dateStr) {
  return dateStr === todayStr();
}

function isThisWeek(dateStr) {
  const now = new Date();
  const d = new Date(dateStr + 'T00:00:00');
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay());
  startOfWeek.setHours(0,0,0,0);
  return d >= startOfWeek && d <= now;
}

function isThisMonth(dateStr) {
  const now = new Date();
  const d = new Date(dateStr + 'T00:00:00');
  return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
}

function formatMYR(amount) {
  return 'RM ' + parseFloat(amount).toFixed(2);
}

// ─── Category icons ───────────────────────────

const CATEGORY_ICONS = {
  '餐饮': '🍽️', '交通': '🚗', '购物': '🛍️', '娱乐': '🎮',
  '住房': '🏠', '医疗': '🏥', '教育': '📚', '通讯': '📱',
  '日用': '🧴', '其他': '📦'
};

const CATEGORY_COLORS = {
  '餐饮': '#ef4444', '交通': '#f59e0b', '购物': '#8b5cf6',
  '娱乐': '#ec4899', '住房': '#06b6d4', '医疗': '#10b981',
  '教育': '#3b82f6', '通讯': '#6366f1', '日用': '#f97316',
  '其他': '#6b7280'
};

function getCategoryIcon(cat) {
  return CATEGORY_ICONS[cat] || '📦';
}

function getCategoryColor(cat) {
  return CATEGORY_COLORS[cat] || '#6b7280';
}

// ─── Photo & AI ───────────────────────────────

async function handlePhoto(input) {
  const file = input.files[0];
  if (!file) return;

  const photoArea = document.getElementById('photoArea');
  photoArea.innerHTML = `<img src="${URL.createObjectURL(file)}" alt="receipt">`;
  photoArea.classList.add('has-image');

  document.getElementById('aiResult').classList.remove('visible');

  // Show loading
  const resultCard = document.getElementById('aiResult');
  resultCard.innerHTML = `
    <div class="loading-spinner">
      <div class="spinner"></div>
      <span>AI 正在识别单据…</span>
    </div>
  `;
  resultCard.classList.add('visible');

  try {
    const aiData = await analyzeImageWithGemini(file);

    // Rebuild form with AI data
    resultCard.innerHTML = `
      <div class="ai-badge">🤖 AI 识别结果</div>
      <div class="form-row">
        <div class="form-group">
          <label>金额 (RM)</label>
          <input type="number" id="expAmount" step="0.01" min="0" placeholder="0.00" value="${aiData.amount || ''}">
        </div>
        <div class="form-group">
          <label>日期</label>
          <input type="date" id="expDate" value="${aiData.date || todayStr()}">
        </div>
      </div>
      <div class="form-group">
        <label>商家</label>
        <input type="text" id="expMerchant" placeholder="商家名称" value="${escapeHtml(aiData.merchant || '')}">
      </div>
      <div class="form-row">
        <div class="form-group">
          <label>分类</label>
          <select id="expCategory">
            ${CATEGORY_OPTIONS(aiData.category || '其他')}
          </select>
        </div>
        <div class="form-group">
          <label>支付方式</label>
          <select id="expPayment">
            ${PAYMENT_OPTIONS()}
          </select>
        </div>
      </div>
      <div class="form-group">
        <label>备注</label>
        <textarea id="expNote" placeholder="备注信息（可选）" rows="2">${escapeHtml(aiData.note || '')}</textarea>
      </div>
      <div style="display:flex;gap:10px;margin-top:4px;">
        <button class="btn-primary" onclick="saveExpense()" style="flex:1">✅ 保存</button>
        <button onclick="resetForm()" style="flex:0 0 52px;padding:14px;border:1px solid var(--border);border-radius:var(--radius-sm);background:var(--bg-card);color:var(--text-tertiary);font-size:18px;cursor:pointer;">🔄</button>
      </div>
    `;

    // Set default payment
    const defPay = getDefaultPayment();
    document.getElementById('expPayment').value = defPay;
    document.getElementById('expDate').value = aiData.date || todayStr();

  } catch (err) {
    resultCard.innerHTML = `
      <div class="ai-badge" style="color:var(--red);border-color:rgba(239,68,68,0.3);">⚠️ 识别失败</div>
      <p style="color:var(--text-tertiary);font-size:13px;margin-bottom:12px;">${escapeHtml(err.message)}</p>
      <div class="form-group">
        <label>金额 (RM)</label>
        <input type="number" id="expAmount" step="0.01" min="0" placeholder="0.00">
      </div>
      <div class="form-group">
        <label>商家</label>
        <input type="text" id="expMerchant" placeholder="商家名称">
      </div>
      <div class="form-row">
        <div class="form-group">
          <label>日期</label>
          <input type="date" id="expDate" value="${todayStr()}">
        </div>
        <div class="form-group">
          <label>分类</label>
          <select id="expCategory">
            ${CATEGORY_OPTIONS()}
          </select>
        </div>
      </div>
      <button class="btn-primary" onclick="saveExpense()" style="width:100%">✅ 手动保存</button>
    `;
  }

  input.value = '';
}

function CATEGORY_OPTIONS(selected) {
  const cats = ['餐饮', '交通', '购物', '娱乐', '住房', '医疗', '教育', '通讯', '日用', '其他'];
  return cats.map(c => `<option value="${c}" ${c === selected ? 'selected' : ''}>${getCategoryIcon(c)} ${c}</option>`).join('');
}

function PAYMENT_OPTIONS() {
  const payments = ['现金', 'TNG', '信用卡', 'Debit', 'GrabPay', '其他'];
  return payments.map(p => `<option value="${p}">${p}</option>`).join('');
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// ─── Gemini API call ──────────────────────────

async function analyzeImageWithGemini(file) {
  const apiKey = getApiKey();
  if (!apiKey) {
    navigate('settings');
    throw new Error('请先到「设置」输入 Gemini API Key');
  }

  const base64 = await fileToBase64(file);
  const mimeType = file.type || 'image/jpeg';

  const body = {
    contents: [{
      parts: [
        {
          inline_data: {
            mime_type: mimeType,
            data: base64.split(',')[1]
          }
        },
        {
          text: `You are a receipt OCR assistant. Extract the following information from this receipt or bill image.
Return ONLY valid JSON — no markdown, no code fences, no extra text. Use this exact format:
{"amount": 45.60, "merchant": "商家名称", "category": "餐饮", "date": "2026-06-20", "note": "optional note"}
Rules:
- amount: the total amount paid (number only, no currency symbol). If unclear, best guess.
- merchant: the store/restaurant/business name. If not visible, use "未知".
- category: choose one of: 餐饮, 交通, 购物, 娱乐, 住房, 医疗, 教育, 通讯, 日用, 其他. Best guess based on merchant type.
- date: the transaction date in YYYY-MM-DD format. If not visible, use today's date.
- note: brief description (max 20 chars) or empty string.
Return ONLY the JSON object, nothing else.`
        }
      ]
    }]
  };

  const resp = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });

  if (!resp.ok) {
    const err = await resp.text();
    if (resp.status === 403 || resp.status === 400) {
      throw new Error('API Key 无效，请检查设置');
    }
    throw new Error(`AI 识别失败 (${resp.status})`);
  }

  const data = await resp.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';

  try {
    // Try to extract JSON from the response (handle potential markdown wrapping)
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('无法解析 AI 返回数据');
    const parsed = JSON.parse(jsonMatch[0]);

    return {
      amount: parsed.amount || '',
      merchant: parsed.merchant || '',
      category: validCategory(parsed.category) ? parsed.category : '其他',
      date: parsed.date || todayStr(),
      note: parsed.note || ''
    };
  } catch (e) {
    console.error('Parse error:', text);
    throw new Error('AI 识别内容无法解析，请手动输入');
  }
}

function validCategory(cat) {
  return ['餐饮', '交通', '购物', '娱乐', '住房', '医疗', '教育', '通讯', '日用', '其他'].includes(cat);
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// ─── Save expense ─────────────────────────────

async function saveExpense() {
  const amount = parseFloat(document.getElementById('expAmount')?.value);
  const merchant = document.getElementById('expMerchant')?.value.trim();
  const category = document.getElementById('expCategory')?.value;
  const date = document.getElementById('expDate')?.value;
  const payment = document.getElementById('expPayment')?.value;
  const note = document.getElementById('expNote')?.value.trim();

  if (!amount || amount <= 0) {
    showToast('⚠️ 请输入有效金额');
    return;
  }

  if (!merchant) {
    showToast('⚠️ 请输入商家名称');
    return;
  }

  try {
    await addExpense({ amount, merchant, category, date, payment, note });
    showToast(`✅ 已记录：${formatMYR(amount)} — ${merchant}`);
    navigate('dashboard');
    resetForm();
  } catch (e) {
    showToast('⚠️ 保存失败，请重试');
  }
}

function resetForm() {
  const photoArea = document.getElementById('photoArea');
  photoArea.innerHTML = `
    <div class="icon">📷</div>
    <div class="hint">拍照或选择单据照片<br><span style="font-size:12px;color:var(--text-tertiary)">AI 自动识别金额和商家</span></div>
    <input type="file" id="photoInput" accept="image/*" capture="environment" onchange="handlePhoto(this)" style="display:none">
  `;
  photoArea.classList.remove('has-image');
  document.getElementById('aiResult').classList.remove('visible');
  document.getElementById('aiResult').innerHTML = '';
}

// ─── Dashboard ────────────────────────────────

async function renderDashboard() {
  const expenses = await getAllExpenses();
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

  const thisMonthTx = expenses.filter(e => new Date(e.date) >= monthStart);
  const lastMonthTx = expenses.filter(e => {
    const d = new Date(e.date);
    return d >= lastMonthStart && d <= lastMonthEnd;
  });

  const total = thisMonthTx.reduce((s, e) => s + e.amount, 0);
  const lastTotal = lastMonthTx.reduce((s, e) => s + e.amount, 0);

  document.getElementById('monthTotal').textContent = formatMYR(total);
  document.getElementById('txCount').textContent = `${thisMonthTx.length} 笔交易`;

  const compareEl = document.getElementById('monthCompare');
  if (lastTotal === 0) {
    compareEl.innerHTML = thisMonthTx.length > 0 ? '📈 本月第一笔记录' : '与上月持平';
  } else {
    const diff = ((total - lastTotal) / lastTotal * 100).toFixed(1);
    if (diff > 0) {
      compareEl.innerHTML = `<span class="up">↑ ${diff}%</span> 比上月增加`;
    } else if (diff < 0) {
      compareEl.innerHTML = `<span class="down">↓ ${Math.abs(diff)}%</span> 比上月减少`;
    } else {
      compareEl.innerHTML = '与上月持平';
    }
  }

  // Recent 5 transactions
  const recent = expenses.slice(0, 5);
  const container = document.getElementById('recentTx');
  if (recent.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="icon">📭</div>
        <h3>还没有记录</h3>
        <p>点「记一笔」开始记账吧</p>
      </div>
    `;
  } else {
    container.innerHTML = recent.map(tx => `
      <div class="transaction-item" onclick="showExpenseActions(${tx.id})">
        <div class="tx-icon" style="background:${getCategoryColor(tx.category)}22;color:${getCategoryColor(tx.category)}">
          ${getCategoryIcon(tx.category)}
        </div>
        <div class="tx-info">
          <div class="tx-merchant">${escapeHtml(tx.merchant)}</div>
          <div class="tx-meta">
            <span>${getCategoryIcon(tx.category)} ${tx.category}</span>
            <span>${formatDate(tx.date)}</span>
          </div>
        </div>
        <div class="tx-amount">${formatMYR(tx.amount)}</div>
      </div>
    `).join('');
  }

  document.getElementById('countBadge').textContent = `${expenses.length} 笔`;
}

// ─── Expenses List ────────────────────────────

let currentFilter = 'all';

function setFilter(filter, el) {
  currentFilter = filter;
  document.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
  el.classList.add('active');
  renderExpensesList();
}

function matchesFilter(tx, filter) {
  if (filter === 'all') return true;
  if (filter === 'today') return isToday(tx.date);
  if (filter === 'week') return isThisWeek(tx.date);
  if (filter === 'month') return isThisMonth(tx.date);
  return true;
}

async function renderExpensesList() {
  const expenses = await getAllExpenses();
  const query = (document.getElementById('searchInput')?.value || '').toLowerCase().trim();

  const filtered = expenses.filter(tx => {
    if (!matchesFilter(tx, currentFilter)) return false;
    if (query) {
      return tx.merchant.toLowerCase().includes(query) ||
             (tx.note || '').toLowerCase().includes(query) ||
             tx.category.includes(query);
    }
    return true;
  });

  const container = document.getElementById('expensesList');
  if (filtered.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="icon">🔍</div>
        <h3>没有匹配的记录</h3>
        <p>试试换个搜索词或筛选条件</p>
      </div>
    `;
    return;
  }

  // Group by month
  let currentMonth = '';
  let html = '';

  filtered.forEach(tx => {
    const txMonth = tx.date.substring(0, 7);
    if (txMonth !== currentMonth) {
      currentMonth = txMonth;
      const [y, m] = txMonth.split('-');
      html += `<div style="font-size:12px;color:var(--text-tertiary);padding:12px 4px 6px;font-weight:600;">${y}年${parseInt(m)}月</div>`;
    }
    html += `
      <div class="transaction-item" onclick="showExpenseActions(${tx.id})">
        <div class="tx-icon" style="background:${getCategoryColor(tx.category)}22;color:${getCategoryColor(tx.category)}">
          ${getCategoryIcon(tx.category)}
        </div>
        <div class="tx-info">
          <div class="tx-merchant">${escapeHtml(tx.merchant)}</div>
          <div class="tx-meta">
            <span>${getCategoryIcon(tx.category)} ${tx.category}</span>
            <span>${formatDate(tx.date)}</span>
            ${tx.payment ? `<span>${tx.payment}</span>` : ''}
          </div>
        </div>
        <div class="tx-amount">${formatMYR(tx.amount)}</div>
      </div>
    `;
  });

  container.innerHTML = html;
}

// ─── Action Sheet ─────────────────────────────

function showExpenseActions(id) {
  const overlay = document.getElementById('overlay');
  const sheet = document.getElementById('actionSheet');
  const body = document.getElementById('actionBody');

  document.getElementById('actionTitle').textContent = '操作';

  body.innerHTML = `
    <button onclick="editExpense(${id});closeActionSheet();">✏️ 编辑</button>
    <button class="danger" onclick="deleteExpenseById(${id});closeActionSheet();">🗑️ 删除</button>
  `;

  overlay.classList.add('visible');
  sheet.classList.add('visible');
}

function closeActionSheet() {
  document.getElementById('overlay').classList.remove('visible');
  document.getElementById('actionSheet').classList.remove('visible');
}

async function editExpense(id) {
  const expenses = await getAllExpenses();
  const tx = expenses.find(e => e.id === id);
  if (!tx) return;

  // Navigate to add page and populate form
  navigate('add');
  const resultCard = document.getElementById('aiResult');

  resultCard.innerHTML = `
    <div class="ai-badge" style="color:var(--amber);border-color:rgba(245,158,11,0.3);">✏️ 编辑记录</div>
    <div class="form-row">
      <div class="form-group">
        <label>金额 (RM)</label>
        <input type="number" id="expAmount" step="0.01" min="0" placeholder="0.00" value="${tx.amount}">
      </div>
      <div class="form-group">
        <label>日期</label>
        <input type="date" id="expDate" value="${tx.date}">
      </div>
    </div>
    <div class="form-group">
      <label>商家</label>
      <input type="text" id="expMerchant" placeholder="商家名称" value="${escapeHtml(tx.merchant)}">
    </div>
    <div class="form-row">
      <div class="form-group">
        <label>分类</label>
        <select id="expCategory">
          ${CATEGORY_OPTIONS(tx.category)}
        </select>
      </div>
      <div class="form-group">
        <label>支付方式</label>
        <select id="expPayment">
          ${PAYMENT_OPTIONS()}
        </select>
      </div>
    </div>
    <div class="form-group">
      <label>备注</label>
      <textarea id="expNote" placeholder="备注信息（可选）" rows="2">${escapeHtml(tx.note || '')}</textarea>
    </div>
    <div style="display:flex;gap:10px;margin-top:4px;">
      <button class="btn-primary" onclick="updateExpenseById(${id})" style="flex:1">💾 更新</button>
      <button onclick="resetForm()" style="flex:0 0 52px;padding:14px;border:1px solid var(--border);border-radius:var(--radius-sm);background:var(--bg-card);color:var(--text-tertiary);font-size:18px;cursor:pointer;">🔄</button>
    </div>
  `;
  resultCard.classList.add('visible');

  document.getElementById('expPayment').value = tx.payment || getDefaultPayment();

  // Store editing id
  resultCard.dataset.editId = id;
}

async function updateExpenseById(id) {
  const amount = parseFloat(document.getElementById('expAmount')?.value);
  const merchant = document.getElementById('expMerchant')?.value.trim();
  const category = document.getElementById('expCategory')?.value;
  const date = document.getElementById('expDate')?.value;
  const payment = document.getElementById('expPayment')?.value;
  const note = document.getElementById('expNote')?.value.trim();

  if (!amount || amount <= 0) { showToast('⚠️ 请输入有效金额'); return; }
  if (!merchant) { showToast('⚠️ 请输入商家名称'); return; }

  try {
    await updateExpense({ id, amount, merchant, category, date, payment, note, createdAt: new Date().toISOString() });
    showToast('✅ 已更新');
    navigate('dashboard');
    resetForm();
  } catch (e) {
    showToast('⚠️ 更新失败');
  }
}

async function deleteExpenseById(id) {
  try {
    await deleteExpense(id);
    showToast('🗑️ 已删除');
    if (currentPage === 'dashboard') renderDashboard();
    if (currentPage === 'list') renderExpensesList();
    if (currentPage === 'stats') renderStats();
  } catch (e) {
    showToast('⚠️ 删除失败');
  }
}

// ─── Stats ────────────────────────────────────

async function renderStats() {
  const expenses = await getAllExpenses();
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const thisMonthTx = expenses.filter(e => new Date(e.date) >= monthStart);

  const total = thisMonthTx.reduce((s, e) => s + e.amount, 0);
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const avg = daysInMonth > 0 ? total / daysInMonth : 0;
  const maxTx = thisMonthTx.reduce((max, e) => e.amount > (max?.amount || 0) ? e : max, null);

  document.getElementById('statsTotal').textContent = formatMYR(total);
  document.getElementById('statsAvg').textContent = formatMYR(avg);
  document.getElementById('statsCount').textContent = thisMonthTx.length;
  document.getElementById('statsMax').textContent = maxTx ? formatMYR(maxTx.amount) : 'RM 0';

  // Category breakdown
  const catTotals = {};
  thisMonthTx.forEach(tx => {
    catTotals[tx.category] = (catTotals[tx.category] || 0) + tx.amount;
  });

  const sortedCats = Object.entries(catTotals).sort((a, b) => b[1] - a[1]);
  const maxCatAmount = sortedCats.length > 0 ? sortedCats[0][1] : 0;

  const breakdownEl = document.getElementById('categoryBreakdown');
  if (sortedCats.length === 0) {
    breakdownEl.innerHTML = '<div class="empty-state"><div class="icon">📊</div><h3>本月暂无数据</h3></div>';
  } else {
    breakdownEl.innerHTML = sortedCats.map(([cat, amt]) => {
      const pct = total > 0 ? ((amt / total) * 100).toFixed(1) : 0;
      const barWidth = maxCatAmount > 0 ? (amt / maxCatAmount * 100) : 0;
      return `
        <div class="category-item">
          <span style="font-size:18px;">${getCategoryIcon(cat)}</span>
          <div style="flex:1;min-width:0;">
            <div style="display:flex;justify-content:space-between;margin-bottom:4px;">
              <span style="font-size:13px;color:var(--text-primary);">${cat}</span>
              <span style="font-size:11px;color:var(--text-tertiary);">${pct}%</span>
            </div>
            <div class="category-bar">
              <div class="category-bar-fill" style="width:${barWidth}%;background:${getCategoryColor(cat)};"></div>
            </div>
          </div>
          <div class="category-amount">${formatMYR(amt)}</div>
        </div>
      `;
    }).join('');
  }

  // Pie chart (canvas)
  drawPieChart(sortedCats, total);
  drawBarChart(thisMonthTx);
}

function drawPieChart(categories, total) {
  const canvas = document.getElementById('pieChart');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.parentElement.getBoundingClientRect();
  const w = rect.width - 32;
  canvas.width = w * dpr;
  canvas.height = 220 * dpr;
  canvas.style.width = w + 'px';
  canvas.style.height = '220px';
  ctx.scale(dpr, dpr);

  const cx = w / 2;
  const cy = 110;
  const radius = Math.min(w / 2 - 10, 90);

  ctx.clearRect(0, 0, w, 220);

  if (categories.length === 0) {
    ctx.fillStyle = '#5a5a7a';
    ctx.font = '14px -apple-system';
    ctx.textAlign = 'center';
    ctx.fillText('暂无数据', cx, cy + 5);
    return;
  }

  let startAngle = -Math.PI / 2;
  categories.forEach(([cat, amt]) => {
    const sliceAngle = (amt / total) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, radius, startAngle, startAngle + sliceAngle);
    ctx.closePath();
    ctx.fillStyle = getCategoryColor(cat);
    ctx.fill();

    // Small white separator
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, radius, startAngle, startAngle + 0.02);
    ctx.closePath();
    ctx.fillStyle = '#08080f';
    ctx.fill();

    startAngle += sliceAngle;
  });

  // Center hole (donut style)
  ctx.beginPath();
  ctx.arc(cx, cy, radius * 0.55, 0, Math.PI * 2);
  ctx.fillStyle = '#12121a';
  ctx.fill();

  // Center text
  ctx.fillStyle = '#f1f1f7';
  ctx.font = 'bold 16px -apple-system';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(categories.length + '类', cx, cy - 8);
  ctx.fillStyle = '#8b8ba7';
  ctx.font = '11px -apple-system';
  ctx.fillText(formatMYR(total), cx, cy + 14);
}

function drawBarChart(expenses) {
  const canvas = document.getElementById('barChart');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.parentElement.getBoundingClientRect();
  const w = rect.width - 32;
  canvas.width = w * dpr;
  canvas.height = 200 * dpr;
  canvas.style.width = w + 'px';
  canvas.style.height = '200px';
  ctx.scale(dpr, dpr);

  ctx.clearRect(0, 0, w, 200);

  // Group by day
  const daily = {};
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();

  expenses.forEach(tx => {
    daily[tx.date] = (daily[tx.date] || 0) + tx.amount;
  });

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const pad = 12;
  const chartW = w - pad * 2;
  const chartH = 170;
  const barCount = daysInMonth;
  const barGap = 2;
  const barW = Math.max(3, Math.min(12, (chartW - barGap * (barCount - 1)) / barCount));
  const totalW = barCount * barW + (barCount - 1) * barGap;

  const values = [];
  let maxVal = 0;
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const v = daily[dateStr] || 0;
    values.push(v);
    if (v > maxVal) maxVal = v;
  }

  const startX = pad + Math.max(0, (chartW - totalW) / 2);

  values.forEach((v, i) => {
    const x = startX + i * (barW + barGap);
    const h = maxVal > 0 ? (v / maxVal) * (chartH - 30) : 0;
    const y = chartH - h;

    // Bar
    const gradient = ctx.createLinearGradient(x, y, x, chartH);
    gradient.addColorStop(0, '#7c3aed');
    gradient.addColorStop(1, '#4c1d95');
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.roundRect(x, y, barW, h, [2, 2, 0, 0]);
    ctx.fill();

    // Today marker
    if (i + 1 === now.getDate()) {
      ctx.fillStyle = '#a78bfa';
      ctx.font = '8px -apple-system';
      ctx.textAlign = 'center';
      ctx.fillText('今天', x + barW / 2, chartH + 12);
    }
  });
}

// ─── Settings ─────────────────────────────────

function loadSettings() {
  document.getElementById('apiKeyInput').value = getApiKey();
  document.getElementById('defaultPayment').value = getDefaultPayment();
}

// ─── Export ───────────────────────────────────

function exportData() {
  getAllExpenses().then(expenses => {
    const blob = new Blob([JSON.stringify(expenses, null, 2)], { type: 'application/json' });
    downloadBlob(blob, `账本_${todayStr()}.json`);
    showToast('✅ 已导出 JSON');
  });
}

function exportCSV() {
  getAllExpenses().then(expenses => {
    const headers = ['日期', '商家', '金额', '分类', '支付方式', '备注', '创建时间'];
    const rows = expenses.map(e => [
      e.date,
      `"${(e.merchant || '').replace(/"/g, '""')}"`,
      e.amount,
      e.category,
      e.payment || '',
      `"${(e.note || '').replace(/"/g, '""')}"`,
      e.createdAt || ''
    ]);
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const bom = '\uFEFF';
    const blob = new Blob([bom + csv], { type: 'text/csv;charset=utf-8' });
    downloadBlob(blob, `账本_${todayStr()}.csv`);
    showToast('✅ 已导出 CSV (可用 Excel 打开)');
  });
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function confirmClearAll() {
  const overlay = document.getElementById('overlay');
  const sheet = document.getElementById('actionSheet');
  const body = document.getElementById('actionBody');

  document.getElementById('actionTitle').textContent = '⚠️ 确认清除';
  body.innerHTML = `
    <p style="text-align:center;color:var(--text-tertiary);margin-bottom:16px;font-size:14px;">
      这将永久删除所有账本数据，无法恢复。
    </p>
    <button class="danger" onclick="doClearAll();closeActionSheet();">确认清除所有数据</button>
  `;

  overlay.classList.add('visible');
  sheet.classList.add('visible');
}

async function doClearAll() {
  try {
    await clearAllExpenses();
    showToast('🗑️ 所有数据已清除');
    renderDashboard();
  } catch (e) {
    showToast('⚠️ 清除失败');
  }
}

// ─── Init ─────────────────────────────────────

async function init() {
  try {
    await openDB();
    renderDashboard();
    loadSettings();
  } catch (e) {
    console.error('Init error:', e);
  }

  // Register service worker
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  }
}

document.addEventListener('DOMContentLoaded', init);

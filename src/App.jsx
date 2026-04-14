import { useState, useEffect, useCallback } from "react";

// ─── Storage helpers ───────────────────────────────────────────────────────
const STORAGE_KEY = "milo_budget_v1";

function loadData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function saveData(data) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {}
}

// ─── Defaults ─────────────────────────────────────────────────────────────
function defaultState() {
  const now = new Date();
  return {
    accounts: [
      { id: "acc1", name: "Checking", balance: 0 },
      { id: "acc2", name: "Savings", balance: 0 },
    ],
    budgetCategories: [
      { id: "bc1", name: "Groceries", monthlyLimit: 400, type: "expense" },
      { id: "bc2", name: "Gas", monthlyLimit: 150, type: "expense" },
      { id: "bc3", name: "Dining Out", monthlyLimit: 200, type: "expense" },
    ],
    bills: [
      { id: "bi1", name: "Rent", monthlyLimit: 1200, type: "bill" },
      { id: "bi2", name: "Electric", monthlyLimit: 100, type: "bill" },
    ],
    subscriptions: [
      { id: "su1", name: "Netflix", monthlyLimit: 18, type: "subscription" },
      { id: "su2", name: "Spotify", monthlyLimit: 11, type: "subscription" },
    ],
    incomeCategories: [
      { id: "ic1", name: "Salary", type: "income" },
      { id: "ic2", name: "Freelance", type: "income" },
    ],
    savingsGoals: [
      {
        id: "sg1",
        name: "Emergency Fund",
        targetAmount: 5000,
        currentAmount: 0,
      },
    ],
    transactions: [],
  };
}

// ─── Utilities ────────────────────────────────────────────────────────────
function uid() {
  return Math.random().toString(36).slice(2, 10);
}

function monthKey(date) {
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function monthLabel(key) {
  if (!key) return "";
  const [y, m] = key.split("-");
  return new Date(+y, +m - 1, 1).toLocaleString("default", {
    month: "long",
    year: "numeric",
  });
}

function currentMonthKey() {
  return monthKey(new Date());
}

function getAllMonths(transactions) {
  const keys = new Set(transactions.map((t) => monthKey(t.date)));
  keys.add(currentMonthKey());
  return [...keys].sort().reverse();
}

function txForMonth(transactions, mk) {
  return transactions.filter((t) => monthKey(t.date) === mk);
}

// ─── Icons (SVG inline) ───────────────────────────────────────────────────
const icons = {
  dashboard: (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
    </svg>
  ),
  budget: (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M12 6v6l4 2" />
    </svg>
  ),
  income: (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
    </svg>
  ),
  bills: (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="8" y1="13" x2="16" y2="13" />
      <line x1="8" y1="17" x2="16" y2="17" />
    </svg>
  ),
  subscriptions: (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <polyline points="17 1 21 5 17 9" />
      <path d="M3 11V9a4 4 0 0 1 4-4h14" />
      <polyline points="7 23 3 19 7 15" />
      <path d="M21 13v2a4 4 0 0 1-4 4H3" />
    </svg>
  ),
  savings: (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path d="M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1" />
      <path d="M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4" />
    </svg>
  ),
  accounts: (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <rect x="1" y="4" width="22" height="16" rx="2" />
      <line x1="1" y1="10" x2="23" y2="10" />
    </svg>
  ),
  aggregate: (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <line x1="18" y1="20" x2="18" y2="10" />
      <line x1="12" y1="20" x2="12" y2="4" />
      <line x1="6" y1="20" x2="6" y2="14" />
    </svg>
  ),
  plus: (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
    >
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  ),
  trash: (
    <svg
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
      <path d="M10 11v6" />
      <path d="M14 11v6" />
      <path d="M9 6V4h6v2" />
    </svg>
  ),
  chevronDown: (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <polyline points="6 9 12 15 18 9" />
    </svg>
  ),
  arrowUp: (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
    >
      <line x1="12" y1="19" x2="12" y2="5" />
      <polyline points="5 12 12 5 19 12" />
    </svg>
  ),
  arrowDown: (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
    >
      <line x1="12" y1="5" x2="12" y2="19" />
      <polyline points="19 12 12 19 5 12" />
    </svg>
  ),
};

// ─── Styles ───────────────────────────────────────────────────────────────
const css = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Mono:ital,wght@0,300;0,400;0,500;1,400&family=Syne:wght@400;500;600;700;800&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  :root {
    --bg: #0a0a0f;
    --surface: #111118;
    --surface2: #18181f;
    --surface3: #1f1f28;
    --border: #2a2a38;
    --border2: #363648;
    --text: #e8e8f0;
    --text2: #8888a8;
    --text3: #555570;
    --accent: #7c6bff;
    --accent2: #a598ff;
    --accent-glow: rgba(124,107,255,0.15);
    --green: #4ade80;
    --green-dim: rgba(74,222,128,0.12);
    --red: #f87171;
    --red-dim: rgba(248,113,113,0.12);
    --amber: #fbbf24;
    --amber-dim: rgba(251,191,36,0.12);
    --blue: #60a5fa;
    --blue-dim: rgba(96,165,250,0.12);
    --cyan: #22d3ee;
  }

  body { background: var(--bg); color: var(--text); font-family: 'Syne', sans-serif; min-height: 100vh; }

  #budget-app {
    display: flex;
    min-height: 100vh;
  }

  /* Sidebar */
  .sidebar {
    width: 220px;
    min-height: 100vh;
    background: var(--surface);
    border-right: 1px solid var(--border);
    display: flex;
    flex-direction: column;
    padding: 24px 0;
    flex-shrink: 0;
    position: sticky;
    top: 0;
    height: 100vh;
    overflow-y: auto;
  }

  .sidebar-logo {
    padding: 0 20px 24px;
    border-bottom: 1px solid var(--border);
    margin-bottom: 16px;
  }
  .sidebar-logo h1 {
    font-family: 'Syne', sans-serif;
    font-size: 18px;
    font-weight: 800;
    letter-spacing: -0.5px;
    color: var(--text);
  }
  .sidebar-logo span { color: var(--accent2); }
  .sidebar-logo p {
    font-family: 'DM Mono', monospace;
    font-size: 10px;
    color: var(--text3);
    margin-top: 2px;
    letter-spacing: 0.5px;
  }

  .nav-group-label {
    font-family: 'DM Mono', monospace;
    font-size: 9px;
    letter-spacing: 1.5px;
    color: var(--text3);
    padding: 8px 20px 4px;
    text-transform: uppercase;
  }

  .nav-item {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 9px 20px;
    cursor: pointer;
    color: var(--text2);
    font-size: 13px;
    font-weight: 500;
    border-left: 2px solid transparent;
    transition: all 0.15s;
    user-select: none;
  }
  .nav-item:hover { color: var(--text); background: var(--surface2); }
  .nav-item.active {
    color: var(--accent2);
    border-left-color: var(--accent);
    background: var(--accent-glow);
  }
  .nav-item svg { flex-shrink: 0; }

  /* Main content */
  .main {
    flex: 1;
    padding: 32px;
    overflow-y: auto;
    max-width: calc(100vw - 220px);
  }

  .page-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 28px;
  }
  .page-title {
    font-size: 22px;
    font-weight: 700;
    letter-spacing: -0.5px;
  }
  .page-subtitle {
    font-family: 'DM Mono', monospace;
    font-size: 11px;
    color: var(--text3);
    margin-top: 3px;
    letter-spacing: 0.3px;
  }

  /* Cards */
  .card {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 10px;
    padding: 20px;
  }
  .card-sm {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 10px;
    padding: 16px;
  }

  .grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
  .grid3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 16px; }
  .grid4 { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; }

  .stat-label {
    font-family: 'DM Mono', monospace;
    font-size: 10px;
    letter-spacing: 1px;
    color: var(--text3);
    text-transform: uppercase;
  }
  .stat-value {
    font-size: 26px;
    font-weight: 700;
    letter-spacing: -1px;
    margin-top: 6px;
  }
  .stat-change {
    font-family: 'DM Mono', monospace;
    font-size: 11px;
    margin-top: 5px;
    display: flex;
    align-items: center;
    gap: 3px;
  }
  .pos { color: var(--green); }
  .neg { color: var(--red); }

  /* Progress bar */
  .progress-wrap { margin-top: 10px; }
  .progress-bar-bg {
    height: 4px;
    background: var(--surface3);
    border-radius: 99px;
    overflow: hidden;
  }
  .progress-bar-fill {
    height: 100%;
    border-radius: 99px;
    transition: width 0.4s ease;
  }
  .progress-meta {
    display: flex;
    justify-content: space-between;
    font-family: 'DM Mono', monospace;
    font-size: 10px;
    color: var(--text3);
    margin-top: 5px;
  }

  /* Category row */
  .cat-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 14px 0;
    border-bottom: 1px solid var(--border);
  }
  .cat-row:last-child { border-bottom: none; }
  .cat-name { font-size: 13px; font-weight: 600; }
  .cat-meta { font-family: 'DM Mono', monospace; font-size: 10px; color: var(--text3); margin-top: 2px; }
  .cat-amounts { text-align: right; }
  .cat-spent { font-size: 14px; font-weight: 700; }
  .cat-limit { font-family: 'DM Mono', monospace; font-size: 10px; color: var(--text3); }

  /* Buttons */
  .btn {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 8px 16px;
    border-radius: 7px;
    font-family: 'Syne', sans-serif;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    border: none;
    transition: all 0.15s;
  }
  .btn-primary {
    background: var(--accent);
    color: #fff;
  }
  .btn-primary:hover { background: var(--accent2); }
  .btn-ghost {
    background: transparent;
    color: var(--text2);
    border: 1px solid var(--border2);
  }
  .btn-ghost:hover { background: var(--surface2); color: var(--text); }
  .btn-danger {
    background: transparent;
    color: var(--red);
    border: 1px solid rgba(248,113,113,0.3);
    padding: 5px 10px;
    font-size: 12px;
  }
  .btn-danger:hover { background: var(--red-dim); }
  .btn-icon {
    background: transparent;
    color: var(--text3);
    border: none;
    padding: 4px;
    cursor: pointer;
    border-radius: 4px;
    display: inline-flex;
    transition: all 0.15s;
  }
  .btn-icon:hover { color: var(--red); background: var(--red-dim); }

  /* Form */
  .form-row { display: flex; gap: 10px; flex-wrap: wrap; align-items: flex-end; }
  .form-group { display: flex; flex-direction: column; gap: 5px; }
  .form-label {
    font-family: 'DM Mono', monospace;
    font-size: 10px;
    letter-spacing: 0.8px;
    color: var(--text3);
    text-transform: uppercase;
  }
  .form-input {
    background: var(--surface2);
    border: 1px solid var(--border2);
    border-radius: 7px;
    padding: 9px 12px;
    color: var(--text);
    font-family: 'Syne', sans-serif;
    font-size: 13px;
    outline: none;
    transition: border-color 0.15s;
    min-width: 0;
  }
  .form-input:focus { border-color: var(--accent); }
  .form-input option { background: var(--surface2); }

  /* Modal */
  .modal-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0,0,0,0.7);
    z-index: 100;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .modal {
    background: var(--surface);
    border: 1px solid var(--border2);
    border-radius: 14px;
    padding: 28px;
    width: 480px;
    max-width: 95vw;
  }
  .modal-title {
    font-size: 17px;
    font-weight: 700;
    margin-bottom: 20px;
    letter-spacing: -0.3px;
  }
  .modal-actions { display: flex; gap: 10px; justify-content: flex-end; margin-top: 20px; }

  /* Month picker */
  .month-picker {
    display: flex;
    align-items: center;
    gap: 8px;
    background: var(--surface2);
    border: 1px solid var(--border);
    border-radius: 7px;
    padding: 6px 12px;
    cursor: pointer;
    font-family: 'DM Mono', monospace;
    font-size: 12px;
    color: var(--text2);
    position: relative;
  }
  .month-dropdown {
    position: absolute;
    top: calc(100% + 4px);
    right: 0;
    background: var(--surface2);
    border: 1px solid var(--border2);
    border-radius: 8px;
    overflow: hidden;
    z-index: 50;
    min-width: 180px;
    box-shadow: 0 8px 32px rgba(0,0,0,0.4);
  }
  .month-option {
    padding: 9px 16px;
    cursor: pointer;
    font-family: 'DM Mono', monospace;
    font-size: 12px;
    color: var(--text2);
    transition: background 0.1s;
  }
  .month-option:hover { background: var(--surface3); color: var(--text); }
  .month-option.selected { color: var(--accent2); background: var(--accent-glow); }

  /* Transaction list */
  .tx-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 11px 0;
    border-bottom: 1px solid var(--border);
  }
  .tx-row:last-child { border-bottom: none; }
  .tx-name { font-size: 13px; font-weight: 600; }
  .tx-meta { font-family: 'DM Mono', monospace; font-size: 10px; color: var(--text3); margin-top: 2px; }
  .tx-amount { font-family: 'DM Mono', monospace; font-size: 14px; font-weight: 500; }
  .tx-right { display: flex; align-items: center; gap: 10px; }

  /* Aggregate */
  .agg-row {
    display: grid;
    grid-template-columns: 1fr auto auto;
    gap: 12px;
    align-items: center;
    padding: 12px 0;
    border-bottom: 1px solid var(--border);
  }
  .agg-row:last-child { border-bottom: none; }
  .agg-count {
    font-family: 'DM Mono', monospace;
    font-size: 11px;
    color: var(--text3);
    background: var(--surface3);
    border-radius: 4px;
    padding: 3px 8px;
    white-space: nowrap;
  }

  /* Savings goal */
  .goal-card {
    background: var(--surface2);
    border: 1px solid var(--border);
    border-radius: 10px;
    padding: 18px;
    margin-bottom: 12px;
  }
  .goal-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 12px;
  }
  .goal-name { font-size: 14px; font-weight: 700; }
  .goal-pct {
    font-family: 'DM Mono', monospace;
    font-size: 20px;
    font-weight: 400;
    color: var(--accent2);
  }

  /* Account cards */
  .acc-card {
    background: var(--surface2);
    border: 1px solid var(--border);
    border-radius: 10px;
    padding: 16px;
  }
  .acc-name { font-size: 13px; font-weight: 700; margin-bottom: 4px; }
  .acc-balance { font-size: 22px; font-weight: 700; letter-spacing: -1px; color: var(--cyan); }

  /* Section spacing */
  .section { margin-bottom: 28px; }
  .section-title {
    font-family: 'DM Mono', monospace;
    font-size: 11px;
    letter-spacing: 1.5px;
    color: var(--text3);
    text-transform: uppercase;
    margin-bottom: 14px;
  }

  .divider { border: none; border-top: 1px solid var(--border); margin: 20px 0; }

  .tag {
    display: inline-block;
    padding: 2px 8px;
    border-radius: 4px;
    font-family: 'DM Mono', monospace;
    font-size: 10px;
    letter-spacing: 0.5px;
  }
  .tag-green { background: var(--green-dim); color: var(--green); }
  .tag-red { background: var(--red-dim); color: var(--red); }
  .tag-amber { background: var(--amber-dim); color: var(--amber); }
  .tag-blue { background: var(--blue-dim); color: var(--blue); }
  .tag-purple { background: var(--accent-glow); color: var(--accent2); }

  .empty-state {
    text-align: center;
    padding: 40px 20px;
    font-family: 'DM Mono', monospace;
    font-size: 12px;
    color: var(--text3);
  }

  .flex { display: flex; }
  .flex-col { display: flex; flex-direction: column; }
  .items-center { align-items: center; }
  .justify-between { justify-content: space-between; }
  .gap-2 { gap: 8px; }
  .gap-3 { gap: 12px; }
  .mt-1 { margin-top: 4px; }
  .mt-2 { margin-top: 8px; }
  .mt-3 { margin-top: 12px; }
  .mb-3 { margin-bottom: 12px; }
  .w-full { width: 100%; }

  @media (max-width: 768px) {
    .sidebar { width: 56px; }
    .sidebar-logo, .nav-group-label, .nav-item span { display: none; }
    .main { padding: 16px; max-width: calc(100vw - 56px); }
    .grid4 { grid-template-columns: 1fr 1fr; }
    .grid3 { grid-template-columns: 1fr 1fr; }
  }
`;

// ─── Sub-components ────────────────────────────────────────────────────────

function MonthPicker({ months, selected, onChange }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ position: "relative" }}>
      <div className="month-picker" onClick={() => setOpen(!open)}>
        <span>{monthLabel(selected)}</span>
        {icons.chevronDown}
      </div>
      {open && (
        <div className="month-dropdown">
          {months.map((m) => (
            <div
              key={m}
              className={`month-option ${m === selected ? "selected" : ""}`}
              onClick={() => {
                onChange(m);
                setOpen(false);
              }}
            >
              {monthLabel(m)}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ProgressBar({ spent, limit, color = "var(--accent)" }) {
  const pct = limit > 0 ? Math.min((spent / limit) * 100, 100) : 0;
  const barColor =
    pct >= 100 ? "var(--red)" : pct >= 80 ? "var(--amber)" : color;
  return (
    <div className="progress-wrap">
      <div className="progress-bar-bg">
        <div
          className="progress-bar-fill"
          style={{ width: `${pct}%`, background: barColor }}
        />
      </div>
      <div className="progress-meta">
        <span>${(limit - spent).toFixed(2)} left</span>
        <span>{pct.toFixed(0)}%</span>
      </div>
    </div>
  );
}

function Modal({ title, onClose, children }) {
  return (
    <div
      className="modal-overlay"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="modal">
        <div className="modal-title">{title}</div>
        {children}
      </div>
    </div>
  );
}

// ─── Tabs ─────────────────────────────────────────────────────────────────

function Dashboard({ data, setData }) {
  const allMonths = getAllMonths(data.transactions);
  const [selectedMonth, setSelectedMonth] = useState(currentMonthKey());
  const [showAddTx, setShowAddTx] = useState(false);

  const txs = txForMonth(data.transactions, selectedMonth);
  const prevMk = allMonths[allMonths.indexOf(selectedMonth) + 1] || null;
  const prevTxs = prevMk ? txForMonth(data.transactions, prevMk) : [];

  const totalSpent = txs
    .filter(
      (t) =>
        t.kind === "expense" || t.kind === "bill" || t.kind === "subscription",
    )
    .reduce((s, t) => s + t.amount, 0);
  const totalIncome = txs
    .filter((t) => t.kind === "income")
    .reduce((s, t) => s + t.amount, 0);
  const netBalance = totalIncome - totalSpent;

  const prevSpent = prevTxs
    .filter(
      (t) =>
        t.kind === "expense" || t.kind === "bill" || t.kind === "subscription",
    )
    .reduce((s, t) => s + t.amount, 0);
  const prevIncome = prevTxs
    .filter((t) => t.kind === "income")
    .reduce((s, t) => s + t.amount, 0);

  const spentChange =
    prevSpent > 0 ? ((totalSpent - prevSpent) / prevSpent) * 100 : null;
  const incomeChange =
    prevIncome > 0 ? ((totalIncome - prevIncome) / prevIncome) * 100 : null;

  // All categories for budget overview
  const allCats = [
    ...data.budgetCategories,
    ...data.bills,
    ...data.subscriptions,
  ];

  function getCatSpent(catId) {
    return txs
      .filter((t) => t.categoryId === catId)
      .reduce((s, t) => s + t.amount, 0);
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Dashboard</div>
          <div className="page-subtitle">
            overview / {monthLabel(selectedMonth).toLowerCase()}
          </div>
        </div>
        <div className="flex gap-2 items-center">
          <MonthPicker
            months={allMonths}
            selected={selectedMonth}
            onChange={setSelectedMonth}
          />
          <button
            className="btn btn-primary"
            onClick={() => setShowAddTx(true)}
          >
            {icons.plus} Add Transaction
          </button>
        </div>
      </div>

      <div className="grid4 section">
        {[
          {
            label: "Total Income",
            value: `$${totalIncome.toFixed(2)}`,
            change: incomeChange,
            color: "var(--green)",
            positive: true,
          },
          {
            label: "Total Spending",
            value: `$${totalSpent.toFixed(2)}`,
            change: spentChange,
            color: "var(--red)",
            positive: false,
          },
          {
            label: "Net Balance",
            value: `$${netBalance.toFixed(2)}`,
            change: null,
            color: netBalance >= 0 ? "var(--green)" : "var(--red)",
            positive: netBalance >= 0,
          },
          {
            label: "Transactions",
            value: txs.length,
            change: null,
            color: "var(--accent2)",
            positive: true,
          },
        ].map((s) => (
          <div className="card" key={s.label}>
            <div className="stat-label">{s.label}</div>
            <div className="stat-value" style={{ color: s.color }}>
              {s.value}
            </div>
            {s.change !== null && (
              <div
                className={`stat-change ${s.positive ? (s.change <= 0 ? "pos" : "neg") : s.change <= 0 ? "pos" : "neg"}`}
              >
                {s.change > 0 ? icons.arrowUp : icons.arrowDown}
                {Math.abs(s.change).toFixed(1)}% vs last month
              </div>
            )}
            {s.change === null && (
              <div className="stat-change" style={{ color: "var(--text3)" }}>
                vs {prevMk ? monthLabel(prevMk) : "—"}
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="section">
        <div className="section-title">Budget Overview</div>
        <div className="card">
          {allCats.length === 0 ? (
            <div className="empty-state">No budget categories yet</div>
          ) : (
            allCats.map((cat) => {
              const spent = getCatSpent(cat.id);
              const prevSpentCat = prevTxs
                .filter((t) => t.categoryId === cat.id)
                .reduce((s, t) => s + t.amount, 0);
              const diff = spent - prevSpentCat;
              return (
                <div className="cat-row" key={cat.id}>
                  <div>
                    <div className="cat-name">{cat.name}</div>
                    <div className="cat-meta">
                      {cat.type} •{" "}
                      {prevMk && (
                        <span
                          className={diff > 0 ? "neg" : diff < 0 ? "pos" : ""}
                        >
                          {diff > 0 ? "+" : ""}
                          {diff !== 0
                            ? `$${Math.abs(diff).toFixed(2)} vs last mo`
                            : "same as last mo"}
                        </span>
                      )}
                    </div>
                    <ProgressBar spent={spent} limit={cat.monthlyLimit || 0} />
                  </div>
                  <div
                    className="cat-amounts"
                    style={{ marginLeft: 20, minWidth: 90 }}
                  >
                    <div
                      className="cat-spent"
                      style={{
                        color:
                          spent > (cat.monthlyLimit || 0)
                            ? "var(--red)"
                            : "var(--text)",
                      }}
                    >
                      ${spent.toFixed(2)}
                    </div>
                    <div className="cat-limit">
                      / ${(cat.monthlyLimit || 0).toFixed(2)}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      <div className="section">
        <div className="section-title">Recent Transactions</div>
        <div className="card">
          {txs.length === 0 ? (
            <div className="empty-state">No transactions this month</div>
          ) : (
            [...txs]
              .sort((a, b) => new Date(b.date) - new Date(a.date))
              .slice(0, 10)
              .map((tx) => (
                <TxRow key={tx.id} tx={tx} data={data} setData={setData} />
              ))
          )}
        </div>
      </div>

      {showAddTx && (
        <AddTransactionModal
          data={data}
          setData={setData}
          onClose={() => setShowAddTx(false)}
          defaultMonth={selectedMonth}
        />
      )}
    </div>
  );
}

function TxRow({ tx, data, setData }) {
  const allCats = [
    ...data.budgetCategories,
    ...data.bills,
    ...data.subscriptions,
    ...data.incomeCategories,
  ];
  const cat = allCats.find((c) => c.id === tx.categoryId);
  const acc = data.accounts.find((a) => a.id === tx.accountId);
  const toAcc = data.accounts.find((a) => a.id === tx.toAccountId);
  const goal = data.savingsGoals.find((g) => g.id === tx.savingsGoalId);

  function remove() {
    setData((d) => {
      const updated = {
        ...d,
        transactions: d.transactions.filter((t) => t.id !== tx.id),
      };
      // reverse account balance changes
      if (tx.accountId) {
        updated.accounts = updated.accounts.map((a) => {
          if (a.id === tx.accountId) {
            return {
              ...a,
              balance:
                a.balance + (tx.kind === "income" ? -tx.amount : tx.amount),
            };
          }
          if (a.id === tx.toAccountId) {
            return { ...a, balance: a.balance - tx.amount };
          }
          return a;
        });
      }
      if (tx.savingsGoalId) {
        updated.savingsGoals = updated.savingsGoals.map((g) =>
          g.id === tx.savingsGoalId
            ? { ...g, currentAmount: Math.max(0, g.currentAmount - tx.amount) }
            : g,
        );
      }
      return updated;
    });
  }

  const kindColors = {
    income: "var(--green)",
    expense: "var(--text)",
    bill: "var(--amber)",
    subscription: "var(--blue)",
    transfer: "var(--cyan)",
    savings: "var(--accent2)",
  };

  return (
    <div className="tx-row">
      <div>
        <div className="tx-name">{tx.name}</div>
        <div className="tx-meta">
          {cat?.name ||
            (tx.kind === "transfer"
              ? `Transfer → ${toAcc?.name || "?"}`
              : tx.kind)}{" "}
          • {acc?.name || "?"} • {new Date(tx.date).toLocaleDateString()}
          {goal ? ` • Goal: ${goal.name}` : ""}
        </div>
      </div>
      <div className="tx-right">
        <div
          className="tx-amount"
          style={{ color: kindColors[tx.kind] || "var(--text)" }}
        >
          {tx.kind === "income" ? "+" : tx.kind === "transfer" ? "↔" : "-"}$
          {tx.amount.toFixed(2)}
        </div>
        <button className="btn-icon" onClick={remove}>
          {icons.trash}
        </button>
      </div>
    </div>
  );
}

function AddTransactionModal({ data, setData, onClose, defaultMonth }) {
  const todayStr = defaultMonth
    ? `${defaultMonth}-${String(new Date().getDate()).padStart(2, "0")}`
    : new Date().toISOString().slice(0, 10);

  const [form, setForm] = useState({
    name: "",
    amount: "",
    kind: "expense",
    categoryId: "",
    accountId: data.accounts[0]?.id || "",
    toAccountId: "",
    savingsGoalId: "",
    date: todayStr,
  });

  const allCats = {
    expense: data.budgetCategories,
    bill: data.bills,
    subscription: data.subscriptions,
    income: data.incomeCategories,
    transfer: [],
    savings: data.savingsGoals.map((g) => ({ ...g, type: "savings" })),
  };

  function set(k, v) {
    setForm((f) => ({
      ...f,
      [k]: v,
      ...(k === "kind"
        ? { categoryId: "", savingsGoalId: "", toAccountId: "" }
        : {}),
    }));
  }

  function submit() {
    const amt = parseFloat(form.amount);
    if (!form.name.trim() || isNaN(amt) || amt <= 0) return;
    const tx = {
      id: uid(),
      name: form.name.trim(),
      amount: amt,
      kind: form.kind,
      categoryId:
        form.kind === "savings" ? form.savingsGoalId : form.categoryId || null,
      accountId: form.accountId || null,
      toAccountId: form.toAccountId || null,
      savingsGoalId: form.kind === "savings" ? form.savingsGoalId : null,
      date: form.date || todayStr,
    };

    setData((d) => {
      let accounts = d.accounts.map((a) => {
        if (a.id === tx.accountId) {
          const delta = tx.kind === "income" ? tx.amount : -tx.amount;
          return { ...a, balance: a.balance + delta };
        }
        if (tx.kind === "transfer" && a.id === tx.toAccountId) {
          return { ...a, balance: a.balance + tx.amount };
        }
        return a;
      });
      let savingsGoals = d.savingsGoals;
      if (tx.savingsGoalId) {
        savingsGoals = savingsGoals.map((g) =>
          g.id === tx.savingsGoalId
            ? { ...g, currentAmount: g.currentAmount + tx.amount }
            : g,
        );
      }
      return {
        ...d,
        transactions: [...d.transactions, tx],
        accounts,
        savingsGoals,
      };
    });
    onClose();
  }

  const catList = allCats[form.kind] || [];

  return (
    <Modal title="Add Transaction" onClose={onClose}>
      <div className="flex-col gap-3">
        <div className="form-row">
          <div className="form-group" style={{ flex: 2 }}>
            <label className="form-label">Description</label>
            <input
              className="form-input"
              placeholder="e.g. Costco Gasoline"
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
            />
          </div>
          <div className="form-group" style={{ flex: 1 }}>
            <label className="form-label">Amount ($)</label>
            <input
              className="form-input"
              type="number"
              min="0"
              step="0.01"
              placeholder="0.00"
              value={form.amount}
              onChange={(e) => set("amount", e.target.value)}
            />
          </div>
        </div>

        <div className="form-row">
          <div className="form-group" style={{ flex: 1 }}>
            <label className="form-label">Type</label>
            <select
              className="form-input"
              value={form.kind}
              onChange={(e) => set("kind", e.target.value)}
            >
              <option value="expense">Expense</option>
              <option value="income">Income</option>
              <option value="bill">Bill</option>
              <option value="subscription">Subscription</option>
              <option value="transfer">Transfer</option>
              <option value="savings">Savings</option>
            </select>
          </div>
          <div className="form-group" style={{ flex: 1 }}>
            <label className="form-label">Date</label>
            <input
              className="form-input"
              type="date"
              value={form.date}
              onChange={(e) => set("date", e.target.value)}
            />
          </div>
        </div>

        {form.kind !== "transfer" && catList.length > 0 && (
          <div className="form-group">
            <label className="form-label">
              {form.kind === "savings" ? "Savings Goal" : "Category"}
            </label>
            <select
              className="form-input"
              value={form.categoryId || form.savingsGoalId}
              onChange={(e) => {
                if (form.kind === "savings")
                  set("savingsGoalId", e.target.value);
                else set("categoryId", e.target.value);
              }}
            >
              <option value="">Select...</option>
              {catList.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="form-row">
          <div className="form-group" style={{ flex: 1 }}>
            <label className="form-label">
              {form.kind === "transfer" ? "From Account" : "Account"}
            </label>
            <select
              className="form-input"
              value={form.accountId}
              onChange={(e) => set("accountId", e.target.value)}
            >
              {data.accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </div>
          {form.kind === "transfer" && (
            <div className="form-group" style={{ flex: 1 }}>
              <label className="form-label">To Account</label>
              <select
                className="form-input"
                value={form.toAccountId}
                onChange={(e) => set("toAccountId", e.target.value)}
              >
                <option value="">Select...</option>
                {data.accounts
                  .filter((a) => a.id !== form.accountId)
                  .map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
              </select>
            </div>
          )}
        </div>
      </div>
      <div className="modal-actions">
        <button className="btn btn-ghost" onClick={onClose}>
          Cancel
        </button>
        <button className="btn btn-primary" onClick={submit}>
          Add Transaction
        </button>
      </div>
    </Modal>
  );
}

function CategoryManager({
  data,
  setData,
  catKey,
  title,
  catType,
  color = "var(--accent2)",
}) {
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ name: "", monthlyLimit: "" });
  const allMonths = getAllMonths(data.transactions);
  const [selectedMonth, setSelectedMonth] = useState(currentMonthKey());
  const [showAddTx, setShowAddTx] = useState(false);
  const txs = txForMonth(data.transactions, selectedMonth);
  const prevMk = allMonths[allMonths.indexOf(selectedMonth) + 1] || null;
  const prevTxs = prevMk ? txForMonth(data.transactions, prevMk) : [];

  function addCat() {
    if (!form.name.trim()) return;
    const cat = {
      id: uid(),
      name: form.name.trim(),
      monthlyLimit: parseFloat(form.monthlyLimit) || 0,
      type: catType,
    };
    setData((d) => ({ ...d, [catKey]: [...d[catKey], cat] }));
    setForm({ name: "", monthlyLimit: "" });
    setShowAdd(false);
  }

  function removeCat(id) {
    setData((d) => ({ ...d, [catKey]: d[catKey].filter((c) => c.id !== id) }));
  }

  function getCatSpent(catId) {
    return txs
      .filter((t) => t.categoryId === catId)
      .reduce((s, t) => s + t.amount, 0);
  }
  function getPrevSpent(catId) {
    return prevTxs
      .filter((t) => t.categoryId === catId)
      .reduce((s, t) => s + t.amount, 0);
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">{title}</div>
          <div className="page-subtitle">
            {catType} categories / {monthLabel(selectedMonth).toLowerCase()}
          </div>
        </div>
        <div className="flex gap-2 items-center">
          <MonthPicker
            months={allMonths}
            selected={selectedMonth}
            onChange={setSelectedMonth}
          />
          <button className="btn btn-ghost" onClick={() => setShowAddTx(true)}>
            {icons.plus} Add Transaction
          </button>
          <button className="btn btn-primary" onClick={() => setShowAdd(true)}>
            {icons.plus} New Category
          </button>
        </div>
      </div>

      {showAdd && (
        <div className="card mb-3">
          <div className="form-row">
            <div className="form-group" style={{ flex: 2 }}>
              <label className="form-label">Category Name</label>
              <input
                className="form-input"
                placeholder="e.g. Utilities"
                value={form.name}
                onChange={(e) =>
                  setForm((f) => ({ ...f, name: e.target.value }))
                }
              />
            </div>
            <div className="form-group" style={{ flex: 1 }}>
              <label className="form-label">Monthly Budget ($)</label>
              <input
                className="form-input"
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                value={form.monthlyLimit}
                onChange={(e) =>
                  setForm((f) => ({ ...f, monthlyLimit: e.target.value }))
                }
              />
            </div>
            <div className="flex gap-2 items-center" style={{ paddingTop: 20 }}>
              <button className="btn btn-primary" onClick={addCat}>
                Save
              </button>
              <button
                className="btn btn-ghost"
                onClick={() => setShowAdd(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="card">
        {data[catKey].length === 0 ? (
          <div className="empty-state">No {catType} categories yet</div>
        ) : (
          data[catKey].map((cat) => {
            const spent = getCatSpent(cat.id);
            const prev = getPrevSpent(cat.id);
            const diff = spent - prev;
            const catTxs = txs.filter((t) => t.categoryId === cat.id);
            return (
              <div
                key={cat.id}
                style={{
                  borderBottom: "1px solid var(--border)",
                  paddingBottom: 16,
                  marginBottom: 16,
                }}
              >
                <div className="flex justify-between items-center">
                  <div>
                    <div className="cat-name">{cat.name}</div>
                    <div className="cat-meta">
                      {catTxs.length} transaction
                      {catTxs.length !== 1 ? "s" : ""} •{" "}
                      {prevMk && diff !== 0 && (
                        <span className={diff > 0 ? "neg" : "pos"}>
                          {diff > 0 ? "+" : ""}${diff.toFixed(2)} vs{" "}
                          {monthLabel(prevMk).split(" ")[0]}
                        </span>
                      )}
                      {prevMk && diff === 0 && (
                        <span style={{ color: "var(--text3)" }}>
                          same as last month
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="cat-amounts">
                      <div
                        className="cat-spent"
                        style={{
                          color:
                            spent > cat.monthlyLimit ? "var(--red)" : color,
                        }}
                      >
                        ${spent.toFixed(2)}
                      </div>
                      <div className="cat-limit">
                        / ${cat.monthlyLimit.toFixed(2)}
                      </div>
                    </div>
                    <button
                      className="btn-icon"
                      onClick={() => removeCat(cat.id)}
                    >
                      {icons.trash}
                    </button>
                  </div>
                </div>
                <ProgressBar
                  spent={spent}
                  limit={cat.monthlyLimit}
                  color={color}
                />
                {catTxs.length > 0 && (
                  <div style={{ marginTop: 8 }}>
                    {catTxs.slice(0, 3).map((tx) => (
                      <div
                        key={tx.id}
                        className="flex justify-between"
                        style={{
                          padding: "4px 0",
                          fontSize: 12,
                          color: "var(--text2)",
                        }}
                      >
                        <span>{tx.name}</span>
                        <span style={{ fontFamily: "DM Mono, monospace" }}>
                          ${tx.amount.toFixed(2)} ·{" "}
                          {new Date(tx.date).toLocaleDateString()}
                        </span>
                      </div>
                    ))}
                    {catTxs.length > 3 && (
                      <div
                        style={{
                          fontSize: 11,
                          color: "var(--text3)",
                          fontFamily: "DM Mono, monospace",
                          marginTop: 2,
                        }}
                      >
                        +{catTxs.length - 3} more
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {showAddTx && (
        <AddTransactionModal
          data={data}
          setData={setData}
          onClose={() => setShowAddTx(false)}
          defaultMonth={selectedMonth}
        />
      )}
    </div>
  );
}

function IncomePage({ data, setData }) {
  const allMonths = getAllMonths(data.transactions);
  const [selectedMonth, setSelectedMonth] = useState(currentMonthKey());
  const [showAddCat, setShowAddCat] = useState(false);
  const [showAddTx, setShowAddTx] = useState(false);
  const [form, setForm] = useState({ name: "" });
  const txs = txForMonth(data.transactions, selectedMonth).filter(
    (t) => t.kind === "income",
  );
  const prevMk = allMonths[allMonths.indexOf(selectedMonth) + 1] || null;
  const prevTxs = prevMk
    ? txForMonth(data.transactions, prevMk).filter((t) => t.kind === "income")
    : [];

  const totalIncome = txs.reduce((s, t) => s + t.amount, 0);
  const prevIncome = prevTxs.reduce((s, t) => s + t.amount, 0);
  const diff = totalIncome - prevIncome;

  function addCat() {
    if (!form.name.trim()) return;
    setData((d) => ({
      ...d,
      incomeCategories: [
        ...d.incomeCategories,
        { id: uid(), name: form.name.trim(), type: "income" },
      ],
    }));
    setForm({ name: "" });
    setShowAddCat(false);
  }

  function removeCat(id) {
    setData((d) => ({
      ...d,
      incomeCategories: d.incomeCategories.filter((c) => c.id !== id),
    }));
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Income</div>
          <div className="page-subtitle">
            deposits & earnings / {monthLabel(selectedMonth).toLowerCase()}
          </div>
        </div>
        <div className="flex gap-2 items-center">
          <MonthPicker
            months={allMonths}
            selected={selectedMonth}
            onChange={setSelectedMonth}
          />
          <button className="btn btn-ghost" onClick={() => setShowAddTx(true)}>
            {icons.plus} Log Income
          </button>
          <button
            className="btn btn-primary"
            onClick={() => setShowAddCat(true)}
          >
            {icons.plus} New Source
          </button>
        </div>
      </div>

      <div className="grid2 section">
        <div className="card">
          <div className="stat-label">Total Income</div>
          <div className="stat-value" style={{ color: "var(--green)" }}>
            ${totalIncome.toFixed(2)}
          </div>
          {prevMk && (
            <div className={`stat-change ${diff >= 0 ? "pos" : "neg"}`}>
              {diff >= 0 ? icons.arrowUp : icons.arrowDown}$
              {Math.abs(diff).toFixed(2)} vs {monthLabel(prevMk).split(" ")[0]}
            </div>
          )}
        </div>
        <div className="card">
          <div className="stat-label">Income Sources</div>
          <div className="stat-value" style={{ color: "var(--accent2)" }}>
            {data.incomeCategories.length}
          </div>
          <div className="stat-change" style={{ color: "var(--text3)" }}>
            {txs.length} transactions this month
          </div>
        </div>
      </div>

      {showAddCat && (
        <div className="card mb-3">
          <div className="form-row">
            <div className="form-group" style={{ flex: 1 }}>
              <label className="form-label">Income Source</label>
              <input
                className="form-input"
                placeholder="e.g. Salary, Freelance"
                value={form.name}
                onChange={(e) => setForm({ name: e.target.value })}
              />
            </div>
            <div className="flex gap-2 items-center" style={{ paddingTop: 20 }}>
              <button className="btn btn-primary" onClick={addCat}>
                Save
              </button>
              <button
                className="btn btn-ghost"
                onClick={() => setShowAddCat(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="section">
        <div className="section-title">Income Sources</div>
        <div className="card">
          {data.incomeCategories.length === 0 ? (
            <div className="empty-state">No income sources yet</div>
          ) : (
            data.incomeCategories.map((cat) => {
              const catTxs = txs.filter((t) => t.categoryId === cat.id);
              const total = catTxs.reduce((s, t) => s + t.amount, 0);
              return (
                <div className="cat-row" key={cat.id}>
                  <div>
                    <div className="cat-name">{cat.name}</div>
                    <div className="cat-meta">
                      {catTxs.length} deposit{catTxs.length !== 1 ? "s" : ""}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div
                      className="tx-amount"
                      style={{ color: "var(--green)" }}
                    >
                      +${total.toFixed(2)}
                    </div>
                    <button
                      className="btn-icon"
                      onClick={() => removeCat(cat.id)}
                    >
                      {icons.trash}
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      <div className="section">
        <div className="section-title">All Income Transactions</div>
        <div className="card">
          {txs.length === 0 ? (
            <div className="empty-state">No income recorded this month</div>
          ) : (
            [...txs]
              .sort((a, b) => new Date(b.date) - new Date(a.date))
              .map((tx) => (
                <TxRow key={tx.id} tx={tx} data={data} setData={setData} />
              ))
          )}
        </div>
      </div>

      {showAddTx && (
        <AddTransactionModal
          data={data}
          setData={setData}
          onClose={() => setShowAddTx(false)}
          defaultMonth={selectedMonth}
        />
      )}
    </div>
  );
}

function AggregatePage({ data, setData }) {
  const allMonths = getAllMonths(data.transactions);
  const [selectedMonth, setSelectedMonth] = useState(currentMonthKey());
  const txs = txForMonth(data.transactions, selectedMonth);

  // Group by name (case-insensitive)
  const groups = {};
  txs.forEach((tx) => {
    const key = tx.name.toLowerCase().trim();
    if (!groups[key]) groups[key] = { name: tx.name, txs: [], total: 0 };
    groups[key].txs.push(tx);
    groups[key].total += tx.amount;
  });

  const sorted = Object.values(groups).sort(
    (a, b) => b.txs.length - a.txs.length,
  );

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Aggregate View</div>
          <div className="page-subtitle">
            grouped transactions / {monthLabel(selectedMonth).toLowerCase()}
          </div>
        </div>
        <MonthPicker
          months={allMonths}
          selected={selectedMonth}
          onChange={setSelectedMonth}
        />
      </div>

      <div className="card">
        {sorted.length === 0 ? (
          <div className="empty-state">
            No transactions to aggregate this month
          </div>
        ) : (
          sorted.map((g) => (
            <div className="agg-row" key={g.name}>
              <div>
                <div className="cat-name">{g.name}</div>
                <div className="cat-meta">{monthLabel(selectedMonth)}</div>
              </div>
              <div className="agg-count">
                {g.txs.length} transaction{g.txs.length !== 1 ? "s" : ""}
              </div>
              <div
                className="tx-amount"
                style={{
                  color:
                    g.txs[0]?.kind === "income"
                      ? "var(--green)"
                      : "var(--text)",
                }}
              >
                ${g.total.toFixed(2)}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function SavingsPage({ data, setData }) {
  const [showAddGoal, setShowAddGoal] = useState(false);
  const [showAddTx, setShowAddTx] = useState(false);
  const [form, setForm] = useState({ name: "", targetAmount: "" });
  const allMonths = getAllMonths(data.transactions);
  const [selectedMonth, setSelectedMonth] = useState(currentMonthKey());
  const txs = txForMonth(data.transactions, selectedMonth).filter(
    (t) => t.kind === "savings",
  );

  function addGoal() {
    if (!form.name.trim() || !form.targetAmount) return;
    setData((d) => ({
      ...d,
      savingsGoals: [
        ...d.savingsGoals,
        {
          id: uid(),
          name: form.name.trim(),
          targetAmount: parseFloat(form.targetAmount),
          currentAmount: 0,
        },
      ],
    }));
    setForm({ name: "", targetAmount: "" });
    setShowAddGoal(false);
  }

  function removeGoal(id) {
    setData((d) => ({
      ...d,
      savingsGoals: d.savingsGoals.filter((g) => g.id !== id),
    }));
  }

  const totalSaved = data.savingsGoals.reduce((s, g) => s + g.currentAmount, 0);
  const totalTarget = data.savingsGoals.reduce((s, g) => s + g.targetAmount, 0);

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Savings Goals</div>
          <div className="page-subtitle">track your progress</div>
        </div>
        <div className="flex gap-2 items-center">
          <MonthPicker
            months={allMonths}
            selected={selectedMonth}
            onChange={setSelectedMonth}
          />
          <button className="btn btn-ghost" onClick={() => setShowAddTx(true)}>
            {icons.plus} Log Transfer
          </button>
          <button
            className="btn btn-primary"
            onClick={() => setShowAddGoal(true)}
          >
            {icons.plus} New Goal
          </button>
        </div>
      </div>

      <div className="grid2 section">
        <div className="card">
          <div className="stat-label">Total Saved</div>
          <div className="stat-value" style={{ color: "var(--accent2)" }}>
            ${totalSaved.toFixed(2)}
          </div>
          <div className="stat-change" style={{ color: "var(--text3)" }}>
            across {data.savingsGoals.length} goal
            {data.savingsGoals.length !== 1 ? "s" : ""}
          </div>
        </div>
        <div className="card">
          <div className="stat-label">Total Target</div>
          <div className="stat-value" style={{ color: "var(--text)" }}>
            ${totalTarget.toFixed(2)}
          </div>
          <ProgressBar
            spent={totalSaved}
            limit={totalTarget}
            color="var(--accent2)"
          />
        </div>
      </div>

      {showAddGoal && (
        <div className="card mb-3">
          <div className="form-row">
            <div className="form-group" style={{ flex: 2 }}>
              <label className="form-label">Goal Name</label>
              <input
                className="form-input"
                placeholder="e.g. Emergency Fund"
                value={form.name}
                onChange={(e) =>
                  setForm((f) => ({ ...f, name: e.target.value }))
                }
              />
            </div>
            <div className="form-group" style={{ flex: 1 }}>
              <label className="form-label">Target Amount ($)</label>
              <input
                className="form-input"
                type="number"
                min="0"
                step="0.01"
                placeholder="5000.00"
                value={form.targetAmount}
                onChange={(e) =>
                  setForm((f) => ({ ...f, targetAmount: e.target.value }))
                }
              />
            </div>
            <div className="flex gap-2 items-center" style={{ paddingTop: 20 }}>
              <button className="btn btn-primary" onClick={addGoal}>
                Save
              </button>
              <button
                className="btn btn-ghost"
                onClick={() => setShowAddGoal(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="section">
        {data.savingsGoals.length === 0 ? (
          <div className="card">
            <div className="empty-state">
              No savings goals yet — create one above!
            </div>
          </div>
        ) : (
          data.savingsGoals.map((goal) => {
            const pct =
              goal.targetAmount > 0
                ? Math.min((goal.currentAmount / goal.targetAmount) * 100, 100)
                : 0;
            const goalTxs = txs.filter((t) => t.savingsGoalId === goal.id);
            return (
              <div className="goal-card" key={goal.id}>
                <div className="goal-header">
                  <div>
                    <div className="goal-name">{goal.name}</div>
                    <div className="cat-meta">
                      {goalTxs.length} transfer{goalTxs.length !== 1 ? "s" : ""}{" "}
                      this month
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="goal-pct">{pct.toFixed(0)}%</div>
                    <button
                      className="btn-icon"
                      onClick={() => removeGoal(goal.id)}
                    >
                      {icons.trash}
                    </button>
                  </div>
                </div>
                <div className="progress-bar-bg" style={{ height: 8 }}>
                  <div
                    className="progress-bar-fill"
                    style={{
                      width: `${pct}%`,
                      background: "var(--accent)",
                      height: "100%",
                    }}
                  />
                </div>
                <div className="progress-meta">
                  <span
                    style={{
                      color: "var(--accent2)",
                      fontFamily: "DM Mono, monospace",
                      fontSize: 12,
                    }}
                  >
                    ${goal.currentAmount.toFixed(2)} saved
                  </span>
                  <span>Goal: ${goal.targetAmount.toFixed(2)}</span>
                </div>
              </div>
            );
          })
        )}
      </div>

      {txs.length > 0 && (
        <div className="section">
          <div className="section-title">
            Savings Transactions — {monthLabel(selectedMonth)}
          </div>
          <div className="card">
            {txs.map((tx) => (
              <TxRow key={tx.id} tx={tx} data={data} setData={setData} />
            ))}
          </div>
        </div>
      )}

      {showAddTx && (
        <AddTransactionModal
          data={data}
          setData={setData}
          onClose={() => setShowAddTx(false)}
          defaultMonth={selectedMonth}
        />
      )}
    </div>
  );
}

function AccountsPage({ data, setData }) {
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ name: "", balance: "" });
  const allMonths = getAllMonths(data.transactions);
  const [selectedMonth, setSelectedMonth] = useState(currentMonthKey());
  const txs = txForMonth(data.transactions, selectedMonth);
  const [showAddTx, setShowAddTx] = useState(false);

  function addAcc() {
    if (!form.name.trim()) return;
    setData((d) => ({
      ...d,
      accounts: [
        ...d.accounts,
        {
          id: uid(),
          name: form.name.trim(),
          balance: parseFloat(form.balance) || 0,
        },
      ],
    }));
    setForm({ name: "", balance: "" });
    setShowAdd(false);
  }

  function removeAcc(id) {
    setData((d) => ({ ...d, accounts: d.accounts.filter((a) => a.id !== id) }));
  }

  function getAccTxs(accId) {
    return txs.filter((t) => t.accountId === accId || t.toAccountId === accId);
  }

  const totalBalance = data.accounts.reduce((s, a) => s + a.balance, 0);

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Accounts</div>
          <div className="page-subtitle">money movement tracker</div>
        </div>
        <div className="flex gap-2 items-center">
          <MonthPicker
            months={allMonths}
            selected={selectedMonth}
            onChange={setSelectedMonth}
          />
          <button className="btn btn-ghost" onClick={() => setShowAddTx(true)}>
            {icons.plus} Log Transfer
          </button>
          <button className="btn btn-primary" onClick={() => setShowAdd(true)}>
            {icons.plus} New Account
          </button>
        </div>
      </div>

      <div className="card section" style={{ marginBottom: 16 }}>
        <div className="stat-label">Total Balance Across All Accounts</div>
        <div
          className="stat-value"
          style={{ color: totalBalance >= 0 ? "var(--cyan)" : "var(--red)" }}
        >
          ${totalBalance.toFixed(2)}
        </div>
      </div>

      {showAdd && (
        <div className="card mb-3">
          <div className="form-row">
            <div className="form-group" style={{ flex: 2 }}>
              <label className="form-label">Account Name</label>
              <input
                className="form-input"
                placeholder="e.g. Chase Checking"
                value={form.name}
                onChange={(e) =>
                  setForm((f) => ({ ...f, name: e.target.value }))
                }
              />
            </div>
            <div className="form-group" style={{ flex: 1 }}>
              <label className="form-label">Starting Balance ($)</label>
              <input
                className="form-input"
                type="number"
                step="0.01"
                placeholder="0.00"
                value={form.balance}
                onChange={(e) =>
                  setForm((f) => ({ ...f, balance: e.target.value }))
                }
              />
            </div>
            <div className="flex gap-2 items-center" style={{ paddingTop: 20 }}>
              <button className="btn btn-primary" onClick={addAcc}>
                Save
              </button>
              <button
                className="btn btn-ghost"
                onClick={() => setShowAdd(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="grid2 section">
        {data.accounts.map((acc) => {
          const accTxs = getAccTxs(acc.id);
          return (
            <div className="acc-card" key={acc.id}>
              <div className="flex justify-between items-center mb-3">
                <div className="acc-name">{acc.name}</div>
                <button className="btn-icon" onClick={() => removeAcc(acc.id)}>
                  {icons.trash}
                </button>
              </div>
              <div className="acc-balance">${acc.balance.toFixed(2)}</div>
              <div style={{ marginTop: 12 }}>
                <div className="section-title" style={{ marginBottom: 8 }}>
                  This Month ({accTxs.length} tx)
                </div>
                {accTxs.slice(0, 4).map((tx) => (
                  <div
                    key={tx.id}
                    className="flex justify-between"
                    style={{
                      fontSize: 12,
                      padding: "3px 0",
                      color: "var(--text2)",
                    }}
                  >
                    <span>{tx.name}</span>
                    <span
                      style={{
                        fontFamily: "DM Mono, monospace",
                        color:
                          tx.kind === "income"
                            ? "var(--green)"
                            : tx.kind === "transfer" &&
                                tx.toAccountId === acc.id
                              ? "var(--cyan)"
                              : "var(--red)",
                      }}
                    >
                      {tx.kind === "income"
                        ? "+"
                        : tx.kind === "transfer" && tx.toAccountId === acc.id
                          ? "+"
                          : "-"}
                      ${tx.amount.toFixed(2)}
                    </span>
                  </div>
                ))}
                {accTxs.length > 4 && (
                  <div
                    style={{
                      fontSize: 11,
                      color: "var(--text3)",
                      marginTop: 4,
                      fontFamily: "DM Mono, monospace",
                    }}
                  >
                    +{accTxs.length - 4} more
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {showAddTx && (
        <AddTransactionModal
          data={data}
          setData={setData}
          onClose={() => setShowAddTx(false)}
          defaultMonth={selectedMonth}
        />
      )}
    </div>
  );
}

// ─── Main App ──────────────────────────────────────────────────────────────

const TABS = [
  { id: "dashboard", label: "Dashboard", icon: "dashboard", group: "overview" },
  { id: "budget", label: "Budget", icon: "budget", group: "spending" },
  { id: "bills", label: "Bills", icon: "bills", group: "spending" },
  {
    id: "subscriptions",
    label: "Subscriptions",
    icon: "subscriptions",
    group: "spending",
  },
  { id: "income", label: "Income", icon: "income", group: "money" },
  { id: "savings", label: "Savings", icon: "savings", group: "money" },
  { id: "accounts", label: "Accounts", icon: "accounts", group: "money" },
  { id: "aggregate", label: "Aggregate", icon: "aggregate", group: "reports" },
];

export default function App() {
  const [data, setDataRaw] = useState(() => loadData() || defaultState());
  const [tab, setTab] = useState("dashboard");

  const setData = useCallback((updater) => {
    setDataRaw((prev) => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      saveData(next);
      return next;
    });
  }, []);

  // Auto-save on any change
  useEffect(() => {
    saveData(data);
  }, [data]);

  const groups = [...new Set(TABS.map((t) => t.group))];

  return (
    <>
      <style>{css}</style>
      <div id="budget-app">
        <nav className="sidebar">
          <div className="sidebar-logo">
            <h1>
              fin<span>.</span>track
            </h1>
            <p>personal finance</p>
          </div>
          {groups.map((g) => (
            <div key={g}>
              <div className="nav-group-label">{g}</div>
              {TABS.filter((t) => t.group === g).map((t) => (
                <div
                  key={t.id}
                  className={`nav-item ${tab === t.id ? "active" : ""}`}
                  onClick={() => setTab(t.id)}
                >
                  {icons[t.icon]}
                  <span>{t.label}</span>
                </div>
              ))}
            </div>
          ))}
        </nav>

        <main className="main">
          {tab === "dashboard" && <Dashboard data={data} setData={setData} />}
          {tab === "budget" && (
            <CategoryManager
              data={data}
              setData={setData}
              catKey="budgetCategories"
              title="Budget Categories"
              catType="expense"
              color="var(--accent2)"
            />
          )}
          {tab === "bills" && (
            <CategoryManager
              data={data}
              setData={setData}
              catKey="bills"
              title="Bills"
              catType="bill"
              color="var(--amber)"
            />
          )}
          {tab === "subscriptions" && (
            <CategoryManager
              data={data}
              setData={setData}
              catKey="subscriptions"
              title="Subscriptions"
              catType="subscription"
              color="var(--blue)"
            />
          )}
          {tab === "income" && <IncomePage data={data} setData={setData} />}
          {tab === "savings" && <SavingsPage data={data} setData={setData} />}
          {tab === "accounts" && <AccountsPage data={data} setData={setData} />}
          {tab === "aggregate" && (
            <AggregatePage data={data} setData={setData} />
          )}
        </main>
      </div>
    </>
  );
}

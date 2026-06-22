import { useState, useEffect, useCallback, useRef } from "react";
import {
  BarChart, Bar, LineChart, Line, AreaChart, Area,
  PieChart, Pie, Cell, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine, ReferenceDot
} from "recharts";
import Papa from "papaparse";

// ─────────────────────────────────────────────
// デザイントークン（iOS純正アプリ風 / ライトテーマ）
// Apple Wallet・Stocks・Health を参照。資産管理アプリとしての落ち着きを重視。
// ─────────────────────────────────────────────
const C = {
  bg:       "#F2F2F7", // システム背景
  surface:  "#FFFFFF", // カード背景
  panel:    "#F7F7FA", // カード内の薄いブロック
  border:   "#E5E5EA", // セパレーター
  sun:      "#FF9F0A", // アクセントオレンジ（売電・注意系）
  sunLight: "#FFD60A",
  green:    "#34C759", // アクセントグリーン（メリット・正の値）
  greenDim: "#E8F8EC", // グリーンの薄い背景
  blue:     "#0A84FF", // システムブルー（情報・リンク）
  red:      "#FF3B30", // アクセントレッド（コスト・警告）
  // iOSのUILabel.label相当：完全な#000000ではなく、わずかに調整された黒（rgba(0,0,0,0.92)相当）。
  // 純粋な黒は薄いグレー背景に対して硬すぎる印象になるため、Apple純正アプリの見た目に合わせる。
  textPrimary:   "#1C1C1E",
  textSecondary: "#3C3C43", // やや薄い本文
  textMuted:     "#8E8E93", // 補助文字
};

const STYLES = `
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  body, #root {
    min-height: 100vh;
    background: ${C.bg};
    color: ${C.textPrimary};
    font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", "SF Pro Display", "Hiragino Sans", "Hiragino Kaku Gothic ProN", "Yu Gothic", sans-serif;
    font-size: 15px;
    line-height: 1.45;
  }

  .mono { font-feature-settings: "tnum"; font-variant-numeric: tabular-nums; }

  /* ── スクロールバー ── */
  ::-webkit-scrollbar { width: 6px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: ${C.border}; border-radius: 3px; }

  /* ── レイアウト ── */
  .app-shell {
    display: flex;
    flex-direction: column;
    min-height: 100vh;
  }

  /* ── トップバー（大見出し型。iOS純正アプリの大型ナビゲーションタイトルを参照） ── */
  .topbar {
    position: sticky;
    top: 0;
    z-index: 100;
    background: ${C.bg}EE;
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
    border-bottom: 1px solid ${C.border};
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 0 20px;
    height: 52px;
  }

  .topbar-logo {
    display: flex;
    align-items: center;
    gap: 10px;
    flex: 1;
  }

  .topbar-logo-text {
    font-size: 17px;
    font-weight: 700;
    letter-spacing: -0.4px;
    color: ${C.textPrimary};
    line-height: 1.2;
  }

  .topbar-logo-sub {
    font-size: 11px;
    color: ${C.textMuted};
    font-weight: 400;
  }

  .topbar-divider {
    width: 1px;
    height: 24px;
    background: ${C.border};
    margin: 0 4px;
  }

  /* ── デスクトップ用 上部タブ ── */
  .nav-tabs-top {
    display: flex;
    gap: 2px;
    flex: 1;
    overflow-x: auto;
  }

  .nav-tab-top {
    display: flex;
    align-items: center;
    gap: 7px;
    padding: 8px 14px;
    border-radius: 8px;
    border: none;
    background: transparent;
    color: ${C.textSecondary};
    font-family: inherit;
    font-size: 13px;
    font-weight: 500;
    cursor: pointer;
    white-space: nowrap;
    transition: background 0.15s, color 0.15s;
  }

  .nav-tab-top:hover { background: ${C.panel}; color: ${C.textPrimary}; }

  .nav-tab-top.active {
    background: ${C.blue}14;
    color: ${C.blue};
  }

  /* ── モバイル用 ボトムナビ（iOS純正TabBar） ── */
  .bottom-nav {
    display: none;
    position: fixed;
    bottom: 0; left: 0; right: 0;
    z-index: 200;
    background: ${C.bg}F2;
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
    border-top: 0.5px solid ${C.border};
    padding-bottom: max(2px, env(safe-area-inset-bottom));
  }

  .bottom-nav-inner {
    display: flex;
    justify-content: space-around;
    align-items: stretch;
  }

  .bottom-nav-tab {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 2px;
    padding: 6px 2px 4px;
    border: none;
    background: transparent;
    color: ${C.textMuted};
    font-family: inherit;
    font-size: 10px;
    font-weight: 500;
    cursor: pointer;
    flex: 1;
    transition: color 0.15s;
    -webkit-tap-highlight-color: transparent;
  }

  .bottom-nav-tab.active { color: ${C.blue}; font-weight: 600; }

  .bottom-nav-icon { font-size: 22px; line-height: 1; }
  .bottom-nav-label { line-height: 1; }

  @media (max-width: 700px) {
    .nav-tabs-top, .topbar-divider, .topbar-status { display: none !important; }
    .bottom-nav { display: block; }
    .app-shell { padding-bottom: 74px; }
    .main-content { padding: 12px 16px; }
  }

  /* ── メインコンテンツ ── */
  .main-content {
    flex: 1;
    padding: 20px 24px;
    max-width: 720px;
    width: 100%;
    margin: 0 auto;
  }

  /* ── ページヘッダー（大見出し） ── */
  .page-header {
    margin-bottom: 28px;
    padding-top: 8px;
  }

  .page-title {
    display: flex;
    align-items: center;
    gap: 10px;
    font-size: 32px;
    font-weight: 700;
    color: ${C.textPrimary};
    letter-spacing: -0.2px;
    line-height: 1.2;
  }

  .page-title-icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 38px;
    height: 38px;
    border-radius: 10px;
    background: ${C.blue};
    flex-shrink: 0;
    box-shadow: 0 2px 6px ${C.blue}55;
  }

  .page-subtitle {
    font-size: 14px;
    color: ${C.textMuted};
    margin-top: 6px;
    font-weight: 500;
  }

  /* ── カード（Apple Wallet風：影は極めて弱く） ── */
  .card {
    background: ${C.surface};
    border-radius: 16px;
    padding: 18px;
    box-shadow: 0 1px 2px rgba(0,0,0,0.04);
  }

  .card-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 14px;
  }

  .card-title {
    font-size: 13px;
    font-weight: 600;
    color: ${C.textMuted};
    letter-spacing: 0.02em;
  }

  /* ── KPIカード ── */
  .kpi-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
    gap: 10px;
    margin-bottom: 16px;
  }

  @media (max-width: 700px) {
    .kpi-grid {
      grid-template-columns: 1fr 1fr;
      gap: 10px;
    }
  }

  .kpi-card {
    background: ${C.surface};
    border-radius: 14px;
    padding: 14px;
    box-shadow: 0 1px 2px rgba(0,0,0,0.04);
  }

  .kpi-label {
    font-size: 11px;
    font-weight: 500;
    color: ${C.textMuted};
    margin-bottom: 6px;
  }

  .kpi-value {
    font-size: 22px;
    font-weight: 700;
    color: ${C.textPrimary};
    letter-spacing: -0.4px;
    line-height: 1.1;
    font-feature-settings: "tnum";
  }

  .kpi-unit {
    font-size: 12px;
    color: ${C.textMuted};
    margin-left: 3px;
    font-weight: 500;
  }

  .kpi-sub {
    font-size: 11px;
    color: ${C.textMuted};
    margin-top: 6px;
  }

  .kpi-badge {
    display: inline-block;
    padding: 2px 8px;
    border-radius: 99px;
    font-size: 11px;
    font-weight: 600;
    margin-top: 6px;
  }

  .badge-green { background: ${C.greenDim}; color: ${C.green}; }
  .badge-sun   { background: #FFF3E0; color: ${C.sun}; }
  .badge-red   { background: #FFEBEE; color: ${C.red}; }

  /* ── 大きなヒーロー数値（投資回収率など最重要指標） ── */
  .hero-stat {
    text-align: left;
  }

  .hero-stat-label {
    font-size: 13px;
    color: ${C.textMuted};
    font-weight: 500;
    margin-bottom: 4px;
  }

  .hero-stat-value {
    font-size: 52px;
    font-weight: 700;
    letter-spacing: -1.5px;
    line-height: 1;
    font-feature-settings: "tnum";
  }

  .hero-stat-unit {
    font-size: 22px;
    font-weight: 600;
    margin-left: 4px;
    color: ${C.textMuted};
  }

  /* ── グリッドレイアウト ── */
  .grid-2 {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
  }

  @media (max-width: 700px) {
    .grid-2 { grid-template-columns: 1fr; }
  }

  /* ── プログレスバー（iOS風：細く控えめ） ── */
  .progress-track {
    height: 6px;
    background: ${C.border};
    border-radius: 99px;
    overflow: hidden;
    margin: 10px 0;
  }

  .progress-fill {
    height: 100%;
    border-radius: 99px;
    transition: width 0.6s cubic-bezier(.4,0,.2,1);
  }

  /* ── 空状態 ── */
  .empty-state {
    text-align: center;
    padding: 56px 20px;
    color: ${C.textMuted};
  }

  .empty-icon {
    font-size: 36px;
    margin-bottom: 12px;
    opacity: 0.4;
  }

  .empty-title {
    font-size: 15px;
    font-weight: 600;
    color: ${C.textSecondary};
    margin-bottom: 6px;
  }

  .empty-desc {
    font-size: 13px;
    line-height: 1.6;
    color: ${C.textMuted};
  }

  /* ── ボタン（iOS純正風：角丸大きめ、塗り or テキストのみ） ── */
  .btn {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 10px 16px;
    border-radius: 12px;
    border: none;
    font-family: inherit;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    transition: opacity 0.15s, transform 0.1s;
    white-space: nowrap;
  }

  .btn:active { transform: scale(0.97); opacity: 0.8; }
  .btn:disabled { opacity: 0.35; cursor: not-allowed; }

  .btn-primary {
    background: ${C.blue};
    color: #FFFFFF;
  }

  .btn-secondary {
    background: ${C.panel};
    color: ${C.blue};
  }

  .btn-danger {
    background: transparent;
    color: ${C.red};
  }

  .btn-sm { padding: 6px 12px; font-size: 13px; border-radius: 10px; }

  /* ── フォーム ── */
  .form-group {
    margin-bottom: 14px;
  }

  .form-label {
    display: block;
    font-size: 12px;
    font-weight: 500;
    color: ${C.textMuted};
    margin-bottom: 6px;
  }

  .form-input, .form-select {
    width: 100%;
    padding: 11px 14px;
    background: ${C.panel};
    border: none;
    border-radius: 10px;
    color: ${C.textPrimary};
    font-family: inherit;
    font-size: 15px;
    outline: none;
    transition: background 0.15s;
  }

  .form-input:focus, .form-select:focus {
    background: ${C.blue}0D;
    box-shadow: 0 0 0 2px ${C.blue}44;
  }

  .form-select option { background: ${C.surface}; }

  .form-hint {
    font-size: 11px;
    color: ${C.textMuted};
    margin-top: 4px;
  }

  /* ── リストセル（Apple設定アプリ風：これがメインの情報表示形式） ── */
  .list-group {
    background: ${C.surface};
    border-radius: 14px;
    overflow: hidden;
    box-shadow: 0 1px 2px rgba(0,0,0,0.04);
  }

  .list-cell {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 14px 16px;
    border-bottom: 0.5px solid ${C.border};
    cursor: pointer;
    transition: background 0.1s;
    -webkit-tap-highlight-color: transparent;
  }

  .list-cell:last-child { border-bottom: none; }
  .list-cell:active { background: ${C.panel}; }
  .list-cell.no-tap { cursor: default; }
  .list-cell.no-tap:active { background: transparent; }

  .list-cell-main {
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 0;
  }

  .list-cell-title {
    font-size: 15px;
    color: ${C.textPrimary};
    font-weight: 500;
  }

  .list-cell-subtitle {
    font-size: 12px;
    color: ${C.textMuted};
  }

  .list-cell-value {
    font-size: 16px;
    font-weight: 600;
    color: ${C.textPrimary};
    font-feature-settings: "tnum";
    text-align: right;
    flex-shrink: 0;
  }

  .list-cell-chevron {
    color: ${C.border};
    font-size: 13px;
    margin-left: 8px;
    transition: transform 0.2s;
    flex-shrink: 0;
  }

  .list-cell-chevron.expanded { transform: rotate(90deg); color: ${C.textMuted}; }

  .list-cell-detail {
    padding: 0 16px 16px 16px;
    background: ${C.panel};
  }

  .list-cell-detail-row {
    display: flex;
    justify-content: space-between;
    padding: 8px 0;
    font-size: 13px;
    border-bottom: 0.5px solid ${C.border};
  }

  .list-cell-detail-row:last-child { border-bottom: none; }

  /* ── テーブル（一部の詳細データのみ。基本はリスト形式に置き換え） ── */
  .data-table {
    width: 100%;
    border-collapse: collapse;
  }

  .data-table th {
    font-size: 11px;
    font-weight: 600;
    color: ${C.textMuted};
    padding: 8px 10px;
    text-align: left;
    border-bottom: 0.5px solid ${C.border};
  }

  .data-table td {
    padding: 10px 10px;
    border-bottom: 0.5px solid ${C.border};
    font-size: 13px;
    color: ${C.textSecondary};
  }

  .data-table tr:last-child td { border-bottom: none; }

  .data-table .num {
    color: ${C.textPrimary};
    text-align: right;
    font-feature-settings: "tnum";
  }

  /* ── 太陽アイコン（控えめなパルス。デザイン仕様により発電監視感は排除するため使用頻度を下げる） ── */
  .sun-icon { display: inline-block; }

  /* ── トースト通知 ── */
  .toast-container {
    position: fixed;
    bottom: 90px;
    left: 50%;
    transform: translateX(-50%);
    z-index: 9999;
    display: flex;
    flex-direction: column;
    gap: 8px;
    pointer-events: none;
    width: calc(100% - 32px);
    max-width: 380px;
  }

  .toast {
    background: #1C1C1EE6;
    backdrop-filter: blur(10px);
    border-radius: 14px;
    padding: 12px 18px;
    font-size: 13px;
    color: #FFFFFF;
    pointer-events: auto;
    display: flex;
    align-items: center;
    gap: 10px;
    animation: toastIn 0.25s ease;
  }

  @keyframes toastIn {
    from { opacity: 0; transform: translateY(10px); }
    to   { opacity: 1; transform: translateY(0); }
  }

  /* ── タグ/ステータス ── */
  .status-dot {
    width: 7px; height: 7px;
    border-radius: 50%;
    display: inline-block;
    margin-right: 5px;
  }

  .status-dot.green { background: ${C.green}; }
  .status-dot.sun   { background: ${C.sun}; }
  .status-dot.red   { background: ${C.red}; }

  /* ── 設定画面・リスト内の行 ── */
  .settings-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px 16px;
    border-bottom: 0.5px solid ${C.border};
    gap: 12px;
  }

  .settings-row:last-child { border-bottom: none; }

  .settings-row-label {
    font-size: 14px;
    color: ${C.textPrimary};
  }

  .settings-row-hint {
    font-size: 11px;
    color: ${C.textMuted};
    margin-top: 2px;
  }

  /* ── セクションラベル（リストグループの上に出す小見出し） ── */
  .section-label {
    font-size: 12px;
    font-weight: 600;
    color: ${C.textMuted};
    text-transform: uppercase;
    letter-spacing: 0.02em;
    margin: 20px 4px 8px;
  }

  .section-label:first-child { margin-top: 0; }

  /* ── タップで展開する説明文（仕様③：長文はすべてこの形式） ── */
  .disclosure {
    background: ${C.surface};
    border-radius: 14px;
    overflow: hidden;
  }

  .disclosure-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 14px 16px;
    cursor: pointer;
    -webkit-tap-highlight-color: transparent;
  }

  .disclosure-title {
    font-size: 14px;
    font-weight: 600;
    color: ${C.textPrimary};
  }

  .disclosure-icon {
    color: ${C.blue};
    font-size: 12px;
    transition: transform 0.2s;
  }

  .disclosure-icon.open { transform: rotate(180deg); }

  .disclosure-body {
    padding: 0 16px 16px;
    font-size: 12px;
    color: ${C.textMuted};
    line-height: 1.7;
  }
`;

// ─────────────────────────────────────────────
// ユーティリティ
// ─────────────────────────────────────────────

// タップで開閉する説明文コンポーネント（仕様③：長い説明文はすべてこの形式に統一）
function Disclosure({ title, icon, children, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="disclosure">
      <div className="disclosure-header" onClick={() => setOpen(v => !v)}>
        <span className="disclosure-title">{icon ? `${icon} ` : ""}{title}</span>
        <span className={`disclosure-icon${open ? " open" : ""}`}>▼</span>
      </div>
      {open && <div className="disclosure-body">{children}</div>}
    </div>
  );
}

const fmt = {
  yen:  (v) => `¥${Math.round(v ?? 0).toLocaleString()}`,
  kwh:  (v) => `${(v ?? 0).toFixed(1)} kWh`,
  pct:  (v) => `${(v ?? 0).toFixed(1)}%`,
  num:  (v) => (v ?? 0).toLocaleString(),
  month:(ym) => {
    if (!ym) return "—";
    const [y, m] = ym.split("-");
    return `${y}年${parseInt(m)}月`;
  },
  // グラフのX軸ラベル用：年は下2桁、月とスラッシュで短く表記（例: "25/1"）。
  // 1月だけ年を強調表示し、年の切り替わりが視認しやすいようにする。
  monthAxis: (ym) => {
    if (!ym) return "";
    const [y, m] = ym.split("-");
    const shortYear = y.slice(2);
    return `'${shortYear}/${parseInt(m)}`;
  },
};

// ローカル開発環境向け: claude.ai専用のwindow.storage APIではなく
// 標準のlocalStorageを使用する（同期APIだがPromiseでラップして互換性を保つ）
async function storageGet(key) {
  try {
    const raw = localStorage.getItem(key);
    return raw != null ? JSON.parse(raw) : null;
  } catch { return null; }
}

async function storageSet(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch { return false; }
}

async function storageDelete(key) {
  try {
    localStorage.removeItem(key);
    return true;
  } catch { return false; }
}

// ─────────────────────────────────────────────
// 共通計算ヘルパー
// ─────────────────────────────────────────────

// 売電収入を取得: 実際の振込額(soldIncome)があれば最優先、なければ kWh×FIT単価で推定
function getSellIncome(record, fitRate) {
  if (record.soldIncome != null && record.soldIncome !== "") {
    return { value: record.soldIncome, isActual: true };
  }
  return { value: (record.sold ?? 0) * (fitRate ?? 16), isActual: false };
}

// 指定した月(YYYY-MM)に適用される単価を、単価履歴から検索する
// historyは effectiveFrom 昇順でなくても良い（内部でソートする）
function findApplicableTariff(history, month) {
  if (!history || history.length === 0) return null;
  const sorted = [...history].sort((a, b) => a.effectiveFrom.localeCompare(b.effectiveFrom));
  // month以前で最も新しいeffectiveFromを探す
  let applicable = sorted[0];
  for (const h of sorted) {
    if (h.effectiveFrom <= month) applicable = h;
    else break;
  }
  return applicable;
}

// 月別の燃料調整費・再エネ賦課金を検索する（addonHistory: { "2025-01": {fuel, levy}, ... }）
// 完全一致する月が無い場合は、month以前で最も新しい記録にフォールバックする
function findApplicableAddon(addonHistory, month) {
  if (!addonHistory) return { fuel: 0, levy: 0 };
  if (addonHistory[month]) return addonHistory[month];
  const keys = Object.keys(addonHistory).filter(k => k <= month).sort();
  if (keys.length === 0) {
    const allKeys = Object.keys(addonHistory).sort();
    return allKeys.length ? addonHistory[allKeys[0]] : { fuel: 0, levy: 0 };
  }
  return addonHistory[keys[keys.length - 1]];
}

// 出光でんき（現契約）は北陸電力プランを踏襲し、基本料金のみEV割引を適用する連動構造。
// tariffCompareの値をベースに、現契約用のtariffオブジェクトを動的に生成する。
function deriveCurrentTariffFromCompare(compareTariff, evDiscount) {
  return {
    ...compareTariff,
    name: "出光でんき（北陸プラン踏襲・EV割）",
    basicFee: Math.max(0, (compareTariff.basicFee ?? 0) - (evDiscount ?? 0)),
    note: `北陸電力プランをベースに基本料金からEV割${evDiscount ?? 0}円を割引（時間帯単価・燃料調整費・賦課金は北陸電力と同額）`,
  };
}

// ─────────────────────────────────────────────
// CSV解析（北陸電力 30分値実績フォーマット）
// ─────────────────────────────────────────────
//
// 期待するヘッダー列: 年月日, 0:00-0:30, 0:30-1:00, ... 23:30-24:00, 合計使用量,
//                     ≪夏季昼間≫, ≪その他季昼間≫, ≪ウィークエンド≫, ≪夜間≫
// 各日について「夏季昼間/その他季昼間/ウィークエンド/夜間」のいずれか1列に
// その日の該当時間帯使用量が入る（排他的）構造。
//
// この関数は、CSVのテキスト内容を受け取り、月別・時間帯区分別の使用量(kWh)を集計する。
function parseHokurikuCSV(csvText) {
  const parsed = Papa.parse(csvText, { skipEmptyLines: true });
  const rows = parsed.data;

  // ヘッダー行（"年月日"を含む行）を探す
  let headerIdx = rows.findIndex(r => r[0] && r[0].replace(/"/g, "").trim() === "年月日");
  if (headerIdx === -1) {
    throw new Error("CSVの形式を認識できませんでした（「年月日」列が見つかりません）");
  }
  const header = rows[headerIdx].map(h => (h ?? "").replace(/"/g, "").trim());

  const idxDate    = header.indexOf("年月日");
  const idxTotal   = header.indexOf("合計使用量");
  const idxSummer  = header.indexOf("≪夏季昼間≫");
  const idxOther   = header.indexOf("≪その他季昼間≫");
  const idxWeekend = header.indexOf("≪ウィークエンド≫");
  const idxNight   = header.indexOf("≪夜間≫");

  if (idxDate === -1) throw new Error("「年月日」列が見つかりません");

  // 30分値の列インデックス（0:00-0:30 〜 23:30-24:00）を収集
  const halfHourCols = [];
  header.forEach((h, i) => {
    if (/^\d{1,2}:\d{2}-\d{1,2}:\d{2}$/.test(h)) halfHourCols.push(i);
  });

  const dataRows = rows.slice(headerIdx + 1).filter(r => r[idxDate] && r[idxDate].replace(/"/g, "").trim());

  const num = (v) => {
    const n = parseFloat((v ?? "").toString().replace(/"/g, ""));
    return isNaN(n) ? 0 : n;
  };

  // 月別 × 時間帯区分別の集計
  const monthly = {}; // { "2025-01": { summer, other, weekend, night, total, days } }
  const dailyRecords = [];

  for (const row of dataRows) {
    const dateStr = (row[idxDate] ?? "").replace(/"/g, "").trim(); // "2024/12/26"
    const m = dateStr.match(/^(\d{4})\/(\d{2})\/(\d{2})$/);
    if (!m) continue;
    const monthKey = `${m[1]}-${m[2]}`;

    const summer  = idxSummer  !== -1 ? num(row[idxSummer])  : 0;
    const other   = idxOther   !== -1 ? num(row[idxOther])   : 0;
    const weekend = idxWeekend !== -1 ? num(row[idxWeekend]) : 0;
    const night   = idxNight   !== -1 ? num(row[idxNight])   : 0;
    const total   = idxTotal   !== -1 ? num(row[idxTotal])   : (summer + other + weekend + night);

    if (!monthly[monthKey]) {
      monthly[monthKey] = { summer: 0, other: 0, weekend: 0, night: 0, total: 0, days: 0 };
    }
    monthly[monthKey].summer  += summer;
    monthly[monthKey].other   += other;
    monthly[monthKey].weekend += weekend;
    monthly[monthKey].night   += night;
    monthly[monthKey].total   += total;
    monthly[monthKey].days    += 1;

    dailyRecords.push({ date: dateStr, monthKey, summer, other, weekend, night, total });
  }

  const months = Object.keys(monthly).sort();
  if (months.length === 0) {
    throw new Error("CSVから有効な日付データを読み取れませんでした");
  }

  return {
    fileName: null,
    parsedAt: new Date().toISOString(),
    dateRange: { from: dailyRecords[0]?.date, to: dailyRecords[dailyRecords.length - 1]?.date },
    totalDays: dailyRecords.length,
    monthly,    // 月別の時間帯区分別合計
    months,     // 月キー一覧（昇順）
  };
}

// CSV分析結果を使って「くつろぎナイト12」継続時の月別料金を精密計算する
// tariffCompareHistory: 単価履歴配列。各月のtiersは[夏季昼間, その他季昼間, ウィークエンド, 夜間]の順を期待
// CSVの時間帯別データから「比率」だけを抽出し、実際の総消費量（太陽光ありの記録 = 本来必要だった総使用量）に
// その比率を当てはめて「導入なしの場合の電気代」を計算する。
//
// 重要な前提：CSVの使用量自体（kWh）は太陽光稼働後の「買電のみ」の実績であり、自家消費分は含まれていない。
// そのため、CSVの絶対量をそのまま使うと「太陽光がなかった場合」の電気代が過小評価されてしまう。
// CSVは「夜間・昼間・夏季・ウィークエンドの生活パターン（時間帯別の使用比率）」を知るためだけに使い、
// 実際の計算には records 側の総消費量（太陽光の有無に関わらず生活で必要だった総使用量）を用いる。
function calcCompareePlanFromCSV(csvAnalysis, tariffCompareHistory, records) {
  if (!csvAnalysis) return [];

  // recordsから月→総消費量のマップを作成
  const consumedByMonth = {};
  (records ?? []).forEach(r => { consumedByMonth[r.month] = r.consumed ?? 0; });

  return csvAnalysis.months.map(monthKey => {
    const usage = csvAnalysis.monthly[monthKey];
    const tariff = findApplicableTariff(tariffCompareHistory, monthKey);
    if (!tariff) return null;

    // CSVの実績から「時間帯別の使用比率」を算出（絶対量ではなく比率のみ採用）
    const csvTotal = usage.summer + usage.other + usage.weekend + usage.night;
    if (csvTotal <= 0) return null;
    const ratioSummer  = usage.summer  / csvTotal;
    const ratioOther   = usage.other   / csvTotal;
    const ratioWeekend = usage.weekend / csvTotal;
    const ratioNight   = usage.night   / csvTotal;

    // 実際の総消費量（records側。太陽光の有無に関わらず生活で必要だった使用量）に比率を当てはめる
    const actualConsumed = consumedByMonth[monthKey] ?? csvTotal;
    const allocSummer  = actualConsumed * ratioSummer;
    const allocOther   = actualConsumed * ratioOther;
    const allocWeekend = actualConsumed * ratioWeekend;
    const allocNight   = actualConsumed * ratioNight;

    // tiers配列から該当ラベルの単価を取得（ラベルに部分一致で対応）
    const findRate = (keyword) => {
      const tier = tariff.tiers.find(t => t.label.includes(keyword));
      return tier ? tier.rate : 0;
    };
    const rateSummer  = findRate("夏季");
    const rateOther   = findRate("その他季");
    const rateWeekend = findRate("ウィークエンド");
    const rateNight   = findRate("夜間");

    const levy = tariff.renewableLevy  ?? 0;
    const fuel = tariff.fuelAdjustment ?? 0;
    const addOn = levy + fuel; // 全時間帯共通で加算

    const energyCost =
      allocSummer  * (rateSummer  + addOn) +
      allocOther   * (rateOther   + addOn) +
      allocWeekend * (rateWeekend + addOn) +
      allocNight   * (rateNight   + addOn);

    const billTotal = tariff.basicFee + energyCost;

    return {
      month: monthKey,
      label: fmt.monthAxis(monthKey),
      usage,
      actualConsumed,
      csvTotal,
      basicFee: tariff.basicFee,
      energyCost: Math.round(energyCost),
      billTotal: Math.round(billTotal),
      tariffUsed: tariff.effectiveFrom,
      // CSV精密版の内訳（タップ詳細表示用）：比率をactualConsumedに当てはめた配分量を表示
      breakdown4: {
        basicFee: tariff.basicFee,
        summerKwh: Math.round(allocSummer * 10) / 10,
        otherKwh:  Math.round(allocOther  * 10) / 10,
        weekendKwh:Math.round(allocWeekend* 10) / 10,
        nightKwh:  Math.round(allocNight  * 10) / 10,
        summerRate: Math.round((rateSummer + addOn) * 100) / 100,
        otherRate:  Math.round((rateOther  + addOn) * 100) / 100,
        weekendRate:Math.round((rateWeekend+ addOn) * 100) / 100,
        nightRate:  Math.round((rateNight  + addOn) * 100) / 100,
        summerCost: Math.round(allocSummer  * (rateSummer  + addOn)),
        otherCost:  Math.round(allocOther   * (rateOther   + addOn)),
        weekendCost:Math.round(allocWeekend * (rateWeekend + addOn)),
        nightCost:  Math.round(allocNight   * (rateNight   + addOn)),
        // 参考情報：CSV実測の比率（生活パターンの根拠として表示）
        csvRatioSummer:  Math.round(ratioSummer  * 1000) / 10,
        csvRatioOther:   Math.round(ratioOther   * 1000) / 10,
        csvRatioWeekend: Math.round(ratioWeekend * 1000) / 10,
        csvRatioNight:   Math.round(ratioNight   * 1000) / 10,
      },
    };
  }).filter(Boolean);
}

// ─────────────────────────────────────────────
// デフォルトデータ
// ─────────────────────────────────────────────
const DEFAULT_SETTINGS = {
  installCost:    2404000,  // 導入費用（円）※補助金はすでに反映済みの実質負担額
  subsidy:               0,  // 補助金（導入費用に含まれているため0扱い）
  fitRate:             8,   // 売電単価（円/kWh）※実績検証済み: 全期間8円/kWhで一致
  fitEndYear:       2033,   // FIT終了年
  installedAt:   "2025-01", // 導入月（実績データの開始月と一致）
  systemCapacity:    8.010, // 太陽光容量（kW）
  batteryCapacity:   15.0,  // 蓄電池容量（kWh）
  co2Factor:        0.439,  // CO2係数（kg/kWh）
  evDiscount:        200,   // 出光でんきのEV割引（円/月・基本料金から減額）
};

// 比較プラン: 北陸電力「くつろぎナイト12」。2025年1〜6月に実際に契約していたプラン。
// 2025年7月に出光でんきへ切替したため、これ以降は「継続していた場合の仮想シナリオ」として使用する。
// EV割は適用されない（くつろぎナイト12はEV割対象外のプラン）。
const DEFAULT_TARIFF_COMPARE = {
  effectiveFrom: "2025-01",
  name: "北陸電力「くつろぎナイト12」",
  basicFee: 2255,   // 実績通り（EV割なし）
  // tiersのlabelはCSV分析ロジックの列名と紐付けるため固定文字列を使用
  tiers: [
    { label: "夏季昼間",     rate: 39.87 },
    { label: "その他季昼間", rate: 39.87 },
    { label: "ウィークエンド", rate: 33.80 },
    { label: "夜間",         rate: 26.98 },
  ],
  renewableLevy:   3.49,   // 再エネ発電促進賦課金（円/kWh）2025年度実績値
  fuelAdjustment:  -6.85,  // 燃料費調整単価（円/kWh）2025年1月実績値（月別変動はaddonHistoryで管理）
  note: "実績Excel（太陽光記録）の単価推移シートに基づく。2025年1〜6月に実際に契約していたプラン。",
  updatedAt: "2026-06",
};

// 現契約: 出光でんき。2025年7月に北陸電力から切替。
// 時間帯単価・燃料調整費・賦課金は北陸電力と同一だが、基本料金のみEV割(200円)が適用される独立したプラン。
const DEFAULT_TARIFF_CURRENT = {
  effectiveFrom: "2025-07",
  name: "出光でんき（EV割適用）",
  basicFee: 1945,   // 基本料金2145円 - EV割200円
  tiers: [
    { label: "夏季昼間",     rate: 39.87 },
    { label: "その他季昼間", rate: 39.87 },
    { label: "ウィークエンド", rate: 33.80 },
    { label: "夜間",         rate: 26.98 },
  ],
  renewableLevy:   3.98,
  fuelAdjustment:  -7.43,
  note: "2025年7月に北陸電力から切替。基本料金2,145円からEV割200円を割引し1,945円。時間帯単価・燃料調整費・賦課金は北陸電力と同額。",
  updatedAt: "2026-06",
};

// 現契約の2025年1〜6月期間用エントリ：この期間は北陸電力と直接契約していたため、
// 比較プランと同一条件（基本料金2,255円・EV割なし）。
const DEFAULT_TARIFF_CURRENT_BEFORE_SWITCH = {
  effectiveFrom: "2025-01",
  name: "北陸電力（直接契約・出光切替前）",
  basicFee: 2255,
  tiers: [
    { label: "夏季昼間",     rate: 39.87 },
    { label: "その他季昼間", rate: 39.87 },
    { label: "ウィークエンド", rate: 33.80 },
    { label: "夜間",         rate: 26.98 },
  ],
  renewableLevy:   3.49,
  fuelAdjustment:  -6.85,
  note: "2025年1〜6月は北陸電力「くつろぎナイト12」と直接契約（EV割なし）。2025年7月に出光でんきへ切替。",
  updatedAt: "2026-06",
};

// 月別の燃料調整費・再エネ賦課金の実績履歴（円/kWh）
// 出光でんき・北陸電力で共通（時間帯単価・付加的単価は両社で同一のため）
const DEFAULT_ADDON_HISTORY = {
  "2025-01": { fuel: -6.85,  levy: 3.49 },
  "2025-02": { fuel: -9.35,  levy: 3.49 },
  "2025-03": { fuel: -9.23,  levy: 3.49 },
  "2025-04": { fuel: -7.95,  levy: 3.49 },
  "2025-05": { fuel: -6.77,  levy: 3.98 },
  "2025-06": { fuel: -7.00,  levy: 3.98 },
  "2025-07": { fuel: -7.43,  levy: 3.98 },
  "2025-08": { fuel: -9.77,  levy: 3.98 },
  "2025-09": { fuel: -10.42, levy: 3.98 },
  "2025-10": { fuel: -10.15, levy: 3.98 },
  "2025-11": { fuel: -8.10,  levy: 3.98 },
  "2025-12": { fuel: -8.05,  levy: 3.98 },
  "2026-01": { fuel: -7.95,  levy: 3.98 },
  "2026-02": { fuel: -12.45, levy: 3.98 },
  "2026-03": { fuel: -12.37, levy: 3.98 },
  "2026-04": { fuel: -9.29,  levy: 3.98 },
  "2026-05": { fuel: -7.74,  levy: 4.18 },
};

// 月（01〜12）ごとの時間帯別使用比率（夏季昼間／その他季昼間／ウィークエンド／夜間）。
// 実測CSV（北陸電力30分値、2024年12月〜2025年6月）から算出した比率を採用し、
// 実測のない7〜11月は季節の連続性を考慮して補完している。
//
// 北陸電力「くつろぎナイト12」の時間帯定義（公式情報に基づく）：
//   ・夜間時間　　　　：20:00〜翌8:00（平日・休日問わず、年間共通の12時間）
//   ・昼間時間(夏季)　：7/1〜9/30 の 平日 8:00〜20:00
//   ・昼間時間(その他季)：10/1〜翌6/30 の 平日 8:00〜20:00
//   ・ウィークエンド　：土・日・祝日等の 8:00〜20:00（季節問わず共通）
//
// 「太陽光・蓄電池なしの場合の電気代」を推定する際、総消費量のうちどの時間帯にどれだけ
// 使用していたかを見積もるために使用する。蓄電池により冬季は夜間使用比率が高くなる傾向が実測されている。
const SEASONAL_USAGE_RATIO = {
  "01": { summer: 0.000, other: 0.126, weekend: 0.181, night: 0.693 }, // 実測
  "02": { summer: 0.000, other: 0.053, weekend: 0.076, night: 0.871 }, // 実測
  "03": { summer: 0.000, other: 0.036, weekend: 0.068, night: 0.895 }, // 実測
  "04": { summer: 0.000, other: 0.131, weekend: 0.088, night: 0.781 }, // 実測
  "05": { summer: 0.000, other: 0.144, weekend: 0.121, night: 0.735 }, // 実測
  "06": { summer: 0.000, other: 0.164, weekend: 0.075, night: 0.761 }, // 実測
  "07": { summer: 0.164, other: 0.000, weekend: 0.075, night: 0.761 }, // 補完：7月から夏季区分に切替（その他季比率を夏季へ付け替え）
  "08": { summer: 0.150, other: 0.000, weekend: 0.090, night: 0.760 }, // 補完：盛夏期の傾向で補完
  "09": { summer: 0.130, other: 0.000, weekend: 0.110, night: 0.760 }, // 補完：残暑〜初秋の傾向で補完
  "10": { summer: 0.000, other: 0.140, weekend: 0.150, night: 0.710 }, // 補完：その他季に復帰、12月へ向け漸移
  "11": { summer: 0.000, other: 0.090, weekend: 0.250, night: 0.660 }, // 補完：12月の傾向へ近づける
  "12": { summer: 0.000, other: 0.036, weekend: 0.368, night: 0.596 }, // 実測（2024年12月分）
};

function getSeasonalUsageRatio(month) {
  const mm = month.slice(5, 7);
  return SEASONAL_USAGE_RATIO[mm] ?? { summer: 0, other: 0.25, weekend: 0.15, night: 0.60 };
}

// 後方互換：夜間比率のみが必要な箇所向け
function getNightRatio(month) {
  return getSeasonalUsageRatio(month).night;
}

// 実績Excel（太陽光記録）からインポートした月次実績データ（2025-01〜2026-05）
const IMPORTED_RECORDS = [
  { month: "2025-01", generated: 129.79, sold: 27,  soldIncome: 216,  consumed: 1225.00, electricBill: 32202.20, boughtKwh: 1121 },
  { month: "2025-02", generated: 20.30,  sold: 9,   soldIncome: 72,   consumed: 1415.00, electricBill: 33839.00, boughtKwh: 1415 },
  { month: "2025-03", generated: 703.73, sold: 133, soldIncome: 1064, consumed: 882.13,  electricBill: 10757.00, boughtKwh: 386 },
  { month: "2025-04", generated: 848.03, sold: 280, soldIncome: 2240, consumed: 606.73,  electricBill: 4296.00,  boughtKwh: 82 },
  { month: "2025-05", generated: 977.75, sold: 529, soldIncome: 4232, consumed: 464.91,  electricBill: 3045.00,  boughtKwh: 30 },
  { month: "2025-06", generated: 919.59, sold: 463, soldIncome: 3704, consumed: 532.68,  electricBill: 3087.00,  boughtKwh: 31 },
  { month: "2025-07", generated: 1196.68,sold: 534, soldIncome: 4272, consumed: 734.41,  electricBill: 3012.22, boughtKwh: 41 },
  { month: "2025-08", generated: 1011.28,sold: 357, soldIncome: 2856, consumed: 733.19,  electricBill: 3502.09, boughtKwh: 68 },
  { month: "2025-09", generated: 786.28, sold: 295, soldIncome: 2360, consumed: 573.84,  electricBill: 3120.70, boughtKwh: 49 },
  { month: "2025-10", generated: 494.99, sold: 127, soldIncome: 1016, consumed: 488.51,  electricBill: 3560.87, boughtKwh: 73 },
  { month: "2025-11", generated: 452.22, sold: 32,  soldIncome: 256,  consumed: 725.10,  electricBill: 8586.00,  boughtKwh: 276 },
  { month: "2025-12", generated: 282.90, sold: 22,  soldIncome: 176,  consumed: 993.75,  electricBill: 15281.00, boughtKwh: 558 },
  { month: "2026-01", generated: 99.62,  sold: 14,  soldIncome: 112,  consumed: 1262.24, electricBill: 33625.00, boughtKwh: 1303 },
  { month: "2026-02", generated: 238.94, sold: 23,  soldIncome: 184,  consumed: 1053.04, electricBill: 22354.00, boughtKwh: 1048 },
  { month: "2026-03", generated: 781.16, sold: 125, soldIncome: 1000, consumed: 935.64,  electricBill: 9083.00,  boughtKwh: 366 },
  { month: "2026-04", generated: 847.39, sold: 364, soldIncome: 2912, consumed: 609.91,  electricBill: 5298.00,  boughtKwh: 135 },
  { month: "2026-05", generated: 1067.31,sold: 536, soldIncome: 4288, consumed: 519.42,  electricBill: 2702.00,  boughtKwh: 29 },
];

// ─────────────────────────────────────────────
// Toast システム
// ─────────────────────────────────────────────
let _toastId = 0;
let _setToasts = null;

function toast(msg, type = "info") {
  if (!_setToasts) return;
  const id = ++_toastId;
  _setToasts(prev => [...prev, { id, msg, type }]);
  setTimeout(() => {
    _setToasts(prev => prev.filter(t => t.id !== id));
  }, 3000);
}

function ToastContainer() {
  const [toasts, setToasts] = useState([]);
  useEffect(() => { _setToasts = setToasts; }, []);
  const icons = { success: "✓", error: "✕", info: "☀" };
  return (
    <div className="toast-container">
      {toasts.map(t => (
        <div key={t.id} className={`toast ${t.type}`}>
          <span>{icons[t.type] ?? "•"}</span>
          <span>{t.msg}</span>
        </div>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────
// 確認モーダル（window.confirmはアーティファクト内で機能しないため自作）
// ─────────────────────────────────────────────
let _setConfirmState = null;

function askConfirm(message, { danger = false, confirmLabel = "削除する" } = {}) {
  return new Promise((resolve) => {
    if (!_setConfirmState) { resolve(window.confirm ? false : false); return; }
    _setConfirmState({
      open: true, message, danger, confirmLabel,
      onResolve: resolve,
    });
  });
}

function ConfirmDialog() {
  const [state, setState] = useState({ open: false, message: "", danger: false, confirmLabel: "削除する", onResolve: null });
  useEffect(() => { _setConfirmState = setState; }, []);

  if (!state.open) return null;

  const close = (result) => {
    state.onResolve?.(result);
    setState(s => ({ ...s, open: false }));
  };

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 9998,
      background: "rgba(0,0,0,0.6)",
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: 20,
    }} onClick={() => close(false)}>
      <div style={{
        background: C.surface, border: `1px solid ${C.border}`,
        borderRadius: 14, padding: 22, maxWidth: 360, width: "100%",
        boxShadow: "0 16px 48px #000000aa",
      }} onClick={e => e.stopPropagation()}>
        <div style={{ fontSize: 14, color: C.textPrimary, lineHeight: 1.6, marginBottom: 20, whiteSpace: "pre-line" }}>
          {state.message}
        </div>
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button className="btn btn-secondary" onClick={() => close(false)}>キャンセル</button>
          <button className={state.danger ? "btn btn-danger" : "btn btn-primary"}
            style={state.danger ? { background: C.red, color: "#fff", border: "none" } : {}}
            onClick={() => close(true)}>
            {state.confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// ナビゲーション定義
// ─────────────────────────────────────────────
const TABS = [
  { id: "dashboard",   label: "ホーム",   icon: "house" },
  { id: "records",     label: "実績",     icon: "list.bullet" },
  { id: "tariff",      label: "料金",     icon: "yen" },
  { id: "simulation",  label: "分析",     icon: "chart.bar" },
  { id: "recovery",    label: "回収",     icon: "target" },
  { id: "settings",    label: "設定",     icon: "gear" },
];

// SF Symbols風アウトラインアイコン（絵文字を避け、線画ベースの統一感あるアイコンに置き換え）
function TabIcon({ name, active, color: colorOverride, size = 24 }) {
  const color = colorOverride ?? (active ? C.blue : C.textMuted);
  const common = { width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: color, strokeWidth: 1.7, strokeLinecap: "round", strokeLinejoin: "round" };
  switch (name) {
    case "house":
      return <svg {...common}><path d="M3 11.5 12 4l9 7.5" /><path d="M5.5 10v9a1 1 0 0 0 1 1H9a1 1 0 0 0 1-1v-4a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v4a1 1 0 0 0 1 1h2.5a1 1 0 0 0 1-1v-9" /></svg>;
    case "list.bullet":
      return <svg {...common}><circle cx="4.5" cy="6" r="1" fill={color} /><circle cx="4.5" cy="12" r="1" fill={color} /><circle cx="4.5" cy="18" r="1" fill={color} /><path d="M9 6h11M9 12h11M9 18h11" /></svg>;
    case "yen":
      return <svg {...common}><path d="M7 4l5 8 5-8" /><path d="M12 12v8" /><path d="M8 13h8M8 16h8" /></svg>;
    case "chart.bar":
      return <svg {...common}><path d="M5 19V10M12 19V5M19 19v-6" /><path d="M3 19h18" /></svg>;
    case "target":
      return <svg {...common}><circle cx="12" cy="12" r="8.5" /><circle cx="12" cy="12" r="4.5" /><circle cx="12" cy="12" r="0.8" fill={color} /></svg>;
    case "gear":
      return <svg {...common}><circle cx="12" cy="12" r="3" /><path d="M12 3.5v2.3M12 18.2v2.3M5.4 6.6l1.7 1.6M16.9 15.8l1.7 1.6M3.5 12h2.3M18.2 12h2.3M5.4 17.4l1.7-1.6M16.9 8.2l1.7-1.6" /></svg>;
    default:
      return null;
  }
}

// ─────────────────────────────────────────────
// 画面コンポーネント（Step1はプレースホルダー）
// ─────────────────────────────────────────────

// --- ダッシュボード ---
// ─────────────────────────────────────────────
// Excel実績データのインポート案内バナー
// ─────────────────────────────────────────────
function ImportBanner({ onImport, onDismiss }) {
  const [importing, setImporting] = useState(false);
  const [showDetail, setShowDetail] = useState(false);
  return (
    <div className="card" style={{
      marginBottom: 20, borderLeft: `3px solid ${C.sun}`,
      background: `linear-gradient(135deg, ${C.surface}, ${C.panel})`
    }}>
      <div className="card-header" style={{ marginBottom: 10, cursor: "pointer" }}
        onClick={() => setShowDetail(v => !v)}>
        <span className="card-title">📥 実績Excelのデータを取り込めます</span>
        <span style={{ fontSize: 11, color: C.textMuted }}>{showDetail ? "▲ 閉じる" : "▼ 詳しく"}</span>
      </div>
      {showDetail && (
        <div style={{ fontSize: 12, color: C.textSecondary, lineHeight: 1.7, marginBottom: 14 }}>
          アップロードされた「太陽光記録」Excelから、2025年1月〜2026年5月の17ヶ月分の実績（発電量・売電量・売電金額・電気代・買電量）と、
          北陸電力「くつろぎナイト12」の単価改定履歴・燃料調整費・再エネ賦課金の実績値を取り込めます。
          現契約（出光でんき）は北陸電力プランをベースに基本料金からEV割200円を割引した連動設定になります。
        </div>
      )}
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <button className="btn btn-primary" disabled={importing} onClick={async () => {
          setImporting(true);
          await onImport(true);
          setImporting(false);
        }}>
          {importing ? "取り込み中…" : "📥 データを取り込む"}
        </button>
        <button className="btn btn-secondary" onClick={onDismiss}>今はしない</button>
      </div>
    </div>
  );
}

function DashboardScreen({ records, settings, monthlyComparison }) {
  // 経済メリットは calcMonthlyComparison（シミュレーション・回収管理と共通）の結果を集計する
  const totalBenefit = monthlyComparison.reduce((sum, m) => sum + m.月次メリット, 0);
  const totalSellIncome = monthlyComparison.reduce((sum, m) => sum + m.売電収入, 0);
  const totalSaving = monthlyComparison.reduce((sum, m) => sum + m.節電効果, 0);
  const totalNetCost = monthlyComparison.reduce((sum, m) => sum + m.実質コスト, 0);

  const netCost = (settings.installCost ?? 0) - (settings.subsidy ?? 0);
  const recovered = Math.min(totalBenefit, netCost);
  const remaining = Math.max(netCost - recovered, 0);
  const recoveryPct = netCost > 0 ? (recovered / netCost) * 100 : 0;

  const lastRecord = records.length > 0 ? records[records.length - 1] : null;

  return (
    <div>
      <div className="page-header">
        <div className="page-title">
          <span className="page-title-icon" style={{ background: C.blue }}><TabIcon name="house" color="#fff" size={20} /></span>
          ホーム
        </div>
        <div className="page-subtitle">
          {fmt.month(settings.installedAt)}導入 ／ 太陽光 {settings.systemCapacity ?? "—"} kW ／ 蓄電池 {settings.batteryCapacity ?? "—"} kWh
        </div>
      </div>

      {/* ── 投資回収率（最重要指標：ヒーロー表示） ── */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
          <div className="hero-stat">
            <div className="hero-stat-label">投資回収率</div>
            <div>
              <span className="hero-stat-value" style={{ color: C.green }}>{recoveryPct.toFixed(1)}</span>
              <span className="hero-stat-unit">%</span>
            </div>
            <div style={{ marginTop: 14 }}>
              <div className="hero-stat-label">残り回収額</div>
              <div style={{ fontSize: 17, fontWeight: 700, color: C.textPrimary }}>{fmt.yen(remaining)}</div>
            </div>
          </div>
          <div style={{ position: "relative", width: 88, height: 88, flexShrink: 0 }}>
            <svg width="88" height="88" viewBox="0 0 88 88">
              <circle cx="44" cy="44" r="38" fill="none" stroke={C.border} strokeWidth="8" />
              <circle cx="44" cy="44" r="38" fill="none" stroke={C.green} strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={`${2 * Math.PI * 38}`}
                strokeDashoffset={`${2 * Math.PI * 38 * (1 - Math.min(recoveryPct, 100) / 100)}`}
                transform="rotate(-90 44 44)" />
            </svg>
          </div>
        </div>
      </div>

      {/* ── KPIエリア ── */}
      <div className="kpi-grid">
        <div className="kpi-card">
          <div className="kpi-label">累計メリット</div>
          <div className="kpi-value">{(totalBenefit / 10000).toFixed(1)}<span className="kpi-unit">万円</span></div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">累計売電収入</div>
          <div className="kpi-value" style={{ color: C.sun }}>{(totalSellIncome / 10000).toFixed(1)}<span className="kpi-unit">万円</span></div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">累計節電効果</div>
          <div className="kpi-value" style={{ color: C.green }}>{(totalSaving / 10000).toFixed(1)}<span className="kpi-unit">万円</span></div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">累計実質コスト</div>
          <div className="kpi-value">{(totalNetCost / 10000).toFixed(1)}<span className="kpi-unit">万円</span></div>
        </div>
      </div>

      {/* ── 最新月の実績 ── */}
      <div className="section-label">最新の実績</div>
      <div className="list-group">
        {lastRecord ? (
          <>
            <div className="list-cell no-tap">
              <div className="list-cell-main">
                <span className="list-cell-title">対象月</span>
              </div>
              <span className="list-cell-value">{fmt.month(lastRecord.month)}</span>
            </div>
            <div className="list-cell no-tap">
              <div className="list-cell-main"><span className="list-cell-title">発電量</span></div>
              <span className="list-cell-value">{fmt.kwh(lastRecord.generated)}</span>
            </div>
            <div className="list-cell no-tap">
              <div className="list-cell-main"><span className="list-cell-title">売電量</span></div>
              <span className="list-cell-value">{fmt.kwh(lastRecord.sold)}</span>
            </div>
            <div className="list-cell no-tap">
              <div className="list-cell-main"><span className="list-cell-title">売電収入</span></div>
              <span className="list-cell-value" style={{ color: C.sun }}>
                {fmt.yen(getSellIncome(lastRecord, settings.fitRate).value)}
              </span>
            </div>
          </>
        ) : (
          <div className="empty-state">
            <div className="empty-icon">📋</div>
            <div className="empty-desc">実績データがありません<br/>「実績」タブから入力してください</div>
          </div>
        )}
      </div>

      {records.length === 0 && (
        <div className="card" style={{ marginTop: 16 }}>
          <div className="empty-state">
            <div className="empty-title">データを入力して投資回収状況を確認しましょう</div>
            <div className="empty-desc">
              「実績」タブから月次の発電量・売電量・消費量を入力すると、<br/>
              投資回収率と回収予測が表示されます。
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// Step 2: 実績管理画面
// ─────────────────────────────────────────────

// ── カスタム Tooltip ──
function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: C.surface, border: `1px solid ${C.border}`,
      borderRadius: 8, padding: "10px 14px", fontSize: 12,
    }}>
      <div style={{ color: C.textMuted, marginBottom: 6, fontWeight: 600 }}>{label}</div>
      {payload.map(p => (
        <div key={p.dataKey} style={{ color: p.color, marginBottom: 2 }}>
          {p.name}：<span style={{ fontFamily: "JetBrains Mono, monospace" }}>
            {typeof p.value === "number" ? p.value.toFixed(1) : p.value} kWh
          </span>
        </div>
      ))}
    </div>
  );
}

// ── 空フォームの初期値 ──
const EMPTY_RECORD_FORM = {
  month: "", generated: "", sold: "", soldIncome: "", consumed: "", boughtKwh: "",
  electricBill: "", memo: "",
};

// ─────────────────────────────────────────────
// スクリーンショットからの自動入力（Claude API画像解析）
// 対応フォーマット：
//  ① 出光でんき「でんきMYページ」料金情報詳細画面
//  ② 太陽光モニタリング画面（運転状況・発電量/消費電量の月次サマリー）
// ─────────────────────────────────────────────
// 画像をCanvas経由でリサイズ・JPEG圧縮してbase64化する。
// iPhoneのスクリーンショットは数MBになることがあり、そのまま送るとAPIのペイロード制限に
// 引っかかったり、解析が不安定になることがあるため、長辺1600pxを上限に縮小する。
// blob: スキームのURLはこのアーティファクト実行環境（iframeサンドボックス）では
// 画像として読み込めないことが確認されたため、FileReaderでdata: URL（base64）に変換して
// プレビュー表示する。data: URLは制限を受けず確実に表示できる。
function fileToPreviewUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error("画像の読み込みに失敗しました"));
    reader.readAsDataURL(file);
  });
}

// ─────────────────────────────────────────────
// 画像メモ機能（旧：AI自動入力）
//
// 以前はClaude APIに画像を送って金額・使用量を自動抽出していたが、
// このアーティファクト実行環境ではAPI呼び出しが安定せず
//（"Invalid response format" エラーが繰り返し発生）、信頼できる機能として
// 提供できなかったため撤回。
//
// 代わりに「請求書・モニタリング画面のスクリーンショットをその場で見ながら
// 手入力する」ための画像プレビュー機能に切り替えた。読み取りはしない。
// ─────────────────────────────────────────────
// ─────────────────────────────────────────────
// 画像メモ機能
//
// 過去にClaude APIへ画像を送って金額・使用量を自動抽出する機能を複数回試したが、
// このアーティファクト実行環境では外部API（api.anthropic.com）へのfetch自体が機能せず
//（画像なしのテキストのみの最小テストでも "Invalid response format" で失敗することを確認済み）、
// 環境側の制約によるものと判断し、自動読み取り機能は実装しないこととした。
//
// 代わりに「請求書・モニタリング画面のスクリーンショットをその場で見ながら
// 手入力する」ための画像プレビュー機能のみを提供する。
// ─────────────────────────────────────────────
function ScreenshotMemoPanel() {
  const [images, setImages] = useState([]); // [{file, preview}]
  const [activeIndex, setActiveIndex] = useState(null); // 全画面表示中の画像インデックス
  const fileInputRef = useRef(null);

  const handleFiles = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    try {
      const loaded = await Promise.all(
        files.map(async (file) => ({ file, preview: await fileToPreviewUrl(file) }))
      );
      setImages(prev => [...prev, ...loaded]);
    } catch (err) {
      toast("画像の読み込みに失敗しました。別の画像でお試しください。", "error");
    }
    // 同じファイルを連続で選択した場合も再度changeイベントが発火するようリセット
    e.target.value = "";
  };

  const handleRemove = (idx) => {
    setImages(prev => prev.filter((_, i) => i !== idx));
  };

  const handleClear = () => {
    setImages([]);
  };

  return (
    <div style={{
      background: C.panel, borderRadius: 10, padding: 14, marginBottom: 18,
      border: `1px dashed ${C.border}`
    }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: C.textPrimary }}>
          📸 請求書・モニタリング画面を見ながら入力
        </span>
      </div>
      <div style={{ fontSize: 11, color: C.textMuted, marginBottom: 10, lineHeight: 1.6 }}>
        出光でんきの請求書や太陽光モニタリング画面のスクリーンショットを貼っておくと、下のフォームに数値を入力する際にすぐ見比べられます（自動読み取りは行いません。数値はご自身で入力してください）。
      </div>

      <input type="file" accept="image/*" multiple ref={fileInputRef}
        onChange={handleFiles} style={{ display: "none" }} />

      {images.length === 0 ? (
        <button className="btn btn-secondary btn-sm" onClick={() => fileInputRef.current?.click()}>
          🖼 画像を追加（複数可）
        </button>
      ) : (
        <div>
          <div style={{ display: "flex", gap: 8, marginBottom: 10, flexWrap: "wrap" }}>
            {images.map((img, i) => (
              <div key={i} style={{ position: "relative" }}>
                <img src={img.preview} alt={`screenshot-${i}`}
                  onClick={() => setActiveIndex(i)}
                  style={{
                    width: 76, height: 76, objectFit: "cover", borderRadius: 8,
                    border: `1px solid ${C.border}`, cursor: "pointer"
                  }} />
                <button onClick={() => handleRemove(i)} style={{
                  position: "absolute", top: -6, right: -6,
                  width: 20, height: 20, borderRadius: "50%",
                  background: C.red, color: "#fff", border: "none",
                  fontSize: 12, lineHeight: 1, cursor: "pointer",
                }}>✕</button>
              </div>
            ))}
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button className="btn btn-secondary btn-sm" onClick={() => fileInputRef.current?.click()}>
              + 追加する
            </button>
            <button className="btn btn-secondary btn-sm" onClick={handleClear}>すべて削除</button>
          </div>
        </div>
      )}

      {/* 全画面表示モーダル（タップで拡大確認） */}
      {activeIndex != null && images[activeIndex] && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 9996,
          background: "rgba(0,0,0,0.85)",
          display: "flex", alignItems: "center", justifyContent: "center", padding: 20,
        }} onClick={() => setActiveIndex(null)}>
          <img src={images[activeIndex].preview} alt="拡大表示"
            style={{ maxWidth: "100%", maxHeight: "85vh", borderRadius: 10, objectFit: "contain" }}
            onClick={e => e.stopPropagation()} />
          <button onClick={() => setActiveIndex(null)} style={{
            position: "absolute", top: 24, right: 24,
            width: 36, height: 36, borderRadius: "50%",
            background: "rgba(255,255,255,0.15)", color: "#fff", border: "none",
            fontSize: 18, cursor: "pointer",
          }}>✕</button>
        </div>
      )}
    </div>
  );
}

function RecordsScreen({
  records, setRecords, settings, tariffCurrentHistory,
  form, setForm, editId, setEditId, showForm, setShowForm,
}) {
  const [chartMode,  setChartMode]  = useState("kwh");  // "kwh" | "yen"
  const [sortOrder,  setSortOrder]  = useState("desc");
  const [yearFilter, setYearFilter] = useState("all"); // "all" または "2025" のような年文字列
  const [expandedRecordId, setExpandedRecordId] = useState(null); // タップで展開中のレコードID

  // ── フォームリセット ──
  const resetForm = () => {
    setForm({ ...EMPTY_RECORD_FORM });
    setEditId(null);
    setShowForm(false);
  };

  // ── 編集開始 ──
  const startEdit = (rec) => {
    setForm({
      month:           rec.month           ?? "",
      generated:       rec.generated       ?? "",
      sold:            rec.sold            ?? "",
      soldIncome:      rec.soldIncome      ?? "",
      consumed:        rec.consumed        ?? "",
      boughtKwh:       rec.boughtKwh       ?? "",
      electricBill:    rec.electricBill    ?? "",
      memo:            rec.memo            ?? "",
    });
    setEditId(rec.id);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // ── 保存 ──
  const handleSave = () => {
    if (!form.month) { toast("年月を入力してください", "error"); return; }
    const num = (v) => v === "" || v === undefined ? null : parseFloat(v) || 0;

    // 重複チェック（編集時は自身を除外）
    const dup = records.find(r => r.month === form.month && r.id !== editId);
    if (dup) { toast(`${fmt.month(form.month)} はすでに登録されています`, "error"); return; }

    const rec = {
      id:              editId ?? `rec-${Date.now()}`,
      month:           form.month,
      generated:       num(form.generated),
      sold:            num(form.sold),
      soldIncome:      num(form.soldIncome),   // 実際の振込額（円）。あれば最優先で使用
      consumed:        num(form.consumed),
      boughtKwh:       num(form.boughtKwh),    // 買電量（実績Excelとの整合・精密計算に使用）
      electricBill:    num(form.electricBill),
      memo:            form.memo,
      updatedAt:       new Date().toISOString(),
    };

    let next;
    if (editId) {
      next = records.map(r => r.id === editId ? rec : r);
      toast(`${fmt.month(form.month)} の実績を更新しました`, "success");
    } else {
      next = [...records, rec];
      toast(`${fmt.month(form.month)} の実績を追加しました`, "success");
    }
    setRecords(next);
    resetForm();
  };

  // ── 削除 ──
  const handleDelete = async (id) => {
    const rec = records.find(r => r.id === id);
    const ok = await askConfirm(`${fmt.month(rec?.month)} のデータを削除しますか？\nこの操作は取り消せません。`, { danger: true });
    if (!ok) return;
    setRecords(records.filter(r => r.id !== id));
    toast("削除しました", "info");
  };

  // ── 利用可能な年の一覧（フィルタ用） ──
  const availableYears = [...new Set(records.map(r => r.month.slice(0, 4)))].sort((a, b) => b.localeCompare(a));

  // ── フィルタ＋ソート済みレコード ──
  const sorted = [...records]
    .filter(r => yearFilter === "all" || r.month.slice(0, 4) === yearFilter)
    .sort((a, b) =>
      sortOrder === "desc"
        ? b.month.localeCompare(a.month)
        : a.month.localeCompare(b.month)
    );

  // ── グラフ用データ（時系列昇順） ──
  const chartData = [...records]
    .sort((a, b) => a.month.localeCompare(b.month))
    .map(r => {
      const selfUse   = (r.generated ?? 0) - (r.sold ?? 0);
      const { value: sellIncome } = getSellIncome(r, settings?.fitRate);
      const savingEst  = Math.max(0, selfUse) * 30;
      return {
        month:    fmt.monthAxis(r.month),
        発電量:   r.generated ?? 0,
        売電量:   r.sold       ?? 0,
        自家消費: selfUse      < 0 ? 0 : selfUse,
        総消費:   r.consumed   ?? 0,
        売電収入: Math.round(sellIncome),
        節電効果: Math.round(savingEst),
        経済効果: Math.round(sellIncome + savingEst),
        実電気代: r.electricBill ?? 0,
      };
    });

  // ── 集計サマリー ──
  const totalGen  = records.reduce((s, r) => s + (r.generated ?? 0), 0);
  const totalSold = records.reduce((s, r) => s + (r.sold ?? 0), 0);
  const totalCons = records.reduce((s, r) => s + (r.consumed ?? 0), 0);
  const totalSelf = totalGen - totalSold;
  const totalSellIncome = records.reduce((s, r) => s + getSellIncome(r, settings?.fitRate).value, 0);
  const actualIncomeCount = records.filter(r => r.soldIncome != null).length;

  // フォーム入力中の月に適用される現契約単価をプレビュー表示
  const previewTariff = form.month ? findApplicableTariff(tariffCurrentHistory, form.month) : null;

  return (
    <div>
      <div className="page-header">
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
          <div>
            <div className="page-title">
              <span className="page-title-icon" style={{ background: C.textMuted }}><TabIcon name="list.bullet" color="#fff" size={20} /></span>
              実績
            </div>
            <div className="page-subtitle">月ごとの発電量・売電量・総消費電力量を記録します</div>
          </div>
          <button className="btn btn-primary" onClick={() => {
            if (showForm && !editId) { resetForm(); return; }
            setForm({ ...EMPTY_RECORD_FORM });
            setEditId(null);
            setShowForm(true);
          }}>
            {showForm && !editId ? "✕ 閉じる" : "+ 月次データを追加"}
          </button>
        </div>
      </div>

      {/* ── 入力フォーム ── */}
      {showForm && (
        <div className="card" style={{ marginBottom: 20 }}>
          <div className="card-header">
            <span className="card-title">
              {editId ? `✏ 編集: ${fmt.month(form.month)}` : "新規データ入力"}
            </span>
            <button className="btn btn-secondary btn-sm" onClick={resetForm}>キャンセル</button>
          </div>

          {/* 請求書・モニタリング画面のスクリーンショットを見ながら入力するためのメモ機能 */}
          <ScreenshotMemoPanel />

          {/* 年月（独立行：グリッドのフィット計算でinput[type=month]のネイティブUIがはみ出すのを防ぐ） */}
          <div className="form-group" style={{ marginBottom: 12, maxWidth: 220 }}>
            <label className="form-label">年月 *</label>
            <input type="month" className="form-input"
              style={{ width: "100%", boxSizing: "border-box" }}
              value={form.month}
              onChange={e => setForm(p => ({ ...p, month: e.target.value }))}
            />
          </div>

          {/* 行1: 発電量・売電量・消費量 */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12, marginBottom: 12 }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">発電量 (kWh)</label>
              <input type="number" min="0" step="0.1" className="form-input"
                placeholder="例: 850.0"
                value={form.generated}
                onChange={e => setForm(p => ({ ...p, generated: e.target.value }))}
              />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">売電量 (kWh)</label>
              <input type="number" min="0" step="0.1" className="form-input"
                placeholder="例: 420.0"
                value={form.sold}
                onChange={e => setForm(p => ({ ...p, sold: e.target.value }))}
              />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">総消費電力量 (kWh)</label>
              <input type="number" min="0" step="0.1" className="form-input"
                placeholder="例: 600.0"
                value={form.consumed}
                onChange={e => setForm(p => ({ ...p, consumed: e.target.value }))}
              />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">買電量 (kWh)</label>
              <input type="number" min="0" step="0.1" className="form-input"
                placeholder="検針票の買電量"
                value={form.boughtKwh}
                onChange={e => setForm(p => ({ ...p, boughtKwh: e.target.value }))}
              />
            </div>
          </div>

          {/* 売電収入（実額）の入力 — 改善① */}
          <div style={{
            background: C.greenDim, borderRadius: 8, padding: 12, marginBottom: 12,
            border: `1px solid ${C.green}44`
          }}>
            <label className="form-label" style={{ color: C.green }}>
              ⚡ 売電収入（電力会社からの実際の振込額・円） — 推奨入力
            </label>
            <input type="number" min="0" step="1" className="form-input" style={{ maxWidth: 240 }}
              placeholder="例: 6720（検針票・振込通知の金額）"
              value={form.soldIncome}
              onChange={e => setForm(p => ({ ...p, soldIncome: e.target.value }))}
            />
            <div className="form-hint">
              入力すると、こちらの実額を経済メリット計算に最優先で使用します。未入力の場合は売電量×FIT単価({settings?.fitRate ?? 16}円)で推定します。
            </div>
          </div>

          {/* 行2: 電気代・メモ */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 12, marginBottom: 16 }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">実際の電気代 (円)</label>
              <input type="number" min="0" step="1" className="form-input"
                placeholder="検針票の請求額"
                value={form.electricBill}
                onChange={e => setForm(p => ({ ...p, electricBill: e.target.value }))}
              />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">メモ</label>
              <input type="text" className="form-input"
                placeholder="例: 天候不良で低め"
                value={form.memo}
                onChange={e => setForm(p => ({ ...p, memo: e.target.value }))}
              />
            </div>
          </div>

          {/* 自家消費・適用単価プレビュー */}
          {(form.generated !== "" || form.sold !== "" || form.month) && (
            <div style={{
              background: C.panel, borderRadius: 8, padding: "10px 14px",
              fontSize: 12, color: C.textSecondary, marginBottom: 14,
              display: "flex", gap: 24, flexWrap: "wrap"
            }}>
              {form.generated !== "" && form.sold !== "" && (
                <span>自家消費量（自動計算）:&ensp;
                  <strong style={{ color: C.green, fontFamily: "JetBrains Mono" }}>
                    {Math.max(0, parseFloat(form.generated || 0) - parseFloat(form.sold || 0)).toFixed(1)} kWh
                  </strong>
                </span>
              )}
              {previewTariff && (
                <span>この月に適用される単価:&ensp;
                  <strong style={{ color: C.sun, fontFamily: "JetBrains Mono" }}>
                    {previewTariff.name}（{previewTariff.effectiveFrom}〜）
                  </strong>
                </span>
              )}
            </div>
          )}

          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
            <button className="btn btn-secondary" onClick={resetForm}>キャンセル</button>
            <button className="btn btn-primary" onClick={handleSave}>
              {editId ? "更新する" : "保存する"}
            </button>
          </div>
        </div>
      )}

      {/* ── サマリーKPI ── */}
      {records.length > 0 && (
        <div className="kpi-grid" style={{ marginBottom: 20 }}>
          {[
            { label: "累計 発電量",   value: `${(totalGen/1000).toFixed(2)}`,  unit: "MWh",  color: C.sun },
            { label: "累計 売電量",   value: `${(totalSold/1000).toFixed(2)}`, unit: "MWh",  color: C.blue },
            { label: "累計 自家消費", value: `${(totalSelf/1000).toFixed(2)}`, unit: "MWh",  color: C.green },
            { label: "累計 売電収入", value: `${Math.round(totalSellIncome/10000)}`, unit: "万円", color: C.green },
          ].map(k => (
            <div key={k.label} className="kpi-card">
              <div className="kpi-label">{k.label}</div>
              <div className="kpi-value" style={{ color: k.color }}>{k.value}<span className="kpi-unit">{k.unit}</span></div>
              <div className="kpi-sub">
                {k.label === "累計 売電収入"
                  ? `実額${actualIncomeCount}件 / 推定${records.length - actualIncomeCount}件`
                  : `${records.length} ヶ月分`}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── グラフ ── */}
      {chartData.length > 0 && (
        <div className="card" style={{ marginBottom: 20 }}>
          <div className="card-header">
            <span className="card-title">月別グラフ</span>
            <div style={{ display: "flex", gap: 6 }}>
              {[["kwh","電力量 (kWh)"],["yen","経済効果 (円)"]].map(([m, label]) => (
                <button key={m}
                  className={`btn btn-sm ${chartMode === m ? "btn-primary" : "btn-secondary"}`}
                  onClick={() => setChartMode(m)}
                >{label}</button>
              ))}
            </div>
          </div>

          <ResponsiveContainer width="100%" height={280}>
            {chartMode === "kwh" ? (
              <BarChart data={chartData} barGap={2} barCategoryGap="25%">
                <CartesianGrid strokeDasharray="3 3" stroke={C.border} vertical={false} />
                <XAxis dataKey="month" tick={{ fill: C.textMuted, fontSize: 9 }} axisLine={false} tickLine={false} angle={-40} textAnchor="end" height={50} interval="preserveStartEnd" />
                <YAxis tick={{ fill: C.textMuted, fontSize: 11 }} axisLine={false} tickLine={false} unit=" kWh" />
                <Tooltip content={<ChartTooltip />} />
                <Legend wrapperStyle={{ fontSize: 12, color: C.textSecondary }} />
                <Bar dataKey="発電量"   fill={C.sun}   radius={[4,4,0,0]} name="発電量" />
                <Bar dataKey="売電量"   fill={C.blue}  radius={[4,4,0,0]} name="売電量" />
                <Bar dataKey="自家消費" fill={C.green} radius={[4,4,0,0]} name="自家消費" />
                <Bar dataKey="総消費"   fill={C.textMuted} radius={[4,4,0,0]} name="総消費" opacity={0.6} />
              </BarChart>
            ) : (
              <BarChart data={chartData} barGap={2} barCategoryGap="30%">
                <CartesianGrid strokeDasharray="3 3" stroke={C.border} vertical={false} />
                <XAxis dataKey="month" tick={{ fill: C.textMuted, fontSize: 9 }} axisLine={false} tickLine={false} angle={-40} textAnchor="end" height={50} interval="preserveStartEnd" />
                <YAxis tick={{ fill: C.textMuted, fontSize: 11 }} axisLine={false} tickLine={false}
                  tickFormatter={v => `¥${(v/1000).toFixed(0)}k`} />
                <Tooltip content={({ active, payload, label }) => {
                  if (!active || !payload?.length) return null;
                  return (
                    <div style={{
                      background: C.surface, border: `1px solid ${C.border}`,
                      borderRadius: 8, padding: "10px 14px", fontSize: 12,
                    }}>
                      <div style={{ color: C.textMuted, marginBottom: 6, fontWeight: 600 }}>{label}</div>
                      {payload.map(p => (
                        <div key={p.dataKey} style={{ color: p.color, marginBottom: 2 }}>
                          {p.name}：<span style={{ fontFamily: "JetBrains Mono" }}>
                            {fmt.yen(p.value)}
                          </span>
                        </div>
                      ))}
                    </div>
                  );
                }} />
                <Legend wrapperStyle={{ fontSize: 12, color: C.textSecondary }} />
                <Bar dataKey="売電収入" fill={C.sun}   radius={[4,4,0,0]} name="売電収入" />
                <Bar dataKey="節電効果" fill={C.green} radius={[4,4,0,0]} name="節電効果（推定）" />
                <Bar dataKey="実電気代" fill={C.blue}  radius={[4,4,0,0]} name="実際の電気代" opacity={0.7} />
              </BarChart>
            )}
          </ResponsiveContainer>
        </div>
      )}

      {/* ── 実績一覧（リスト形式：カードタップで詳細展開） ── */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8, marginTop: 20 }}>
        <div className="section-label" style={{ margin: 0 }}>月次実績一覧</div>
        <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
          {availableYears.length > 1 && (
            <select className="form-select" style={{ width: "auto", padding: "5px 10px", fontSize: 12 }}
              value={yearFilter} onChange={e => setYearFilter(e.target.value)}>
              <option value="all">全年度</option>
              {availableYears.map(y => (
                <option key={y} value={y}>{y}年</option>
              ))}
            </select>
          )}
          <button className={`btn btn-sm ${sortOrder==="desc"?"btn-primary":"btn-secondary"}`}
            onClick={() => setSortOrder("desc")}>新しい順</button>
          <button className={`btn btn-sm ${sortOrder==="asc"?"btn-primary":"btn-secondary"}`}
            onClick={() => setSortOrder("asc")}>古い順</button>
        </div>
      </div>

      {sorted.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <div className="empty-icon">📋</div>
            <div className="empty-title">
              {records.length === 0 ? "実績データがありません" : `${yearFilter}年の実績データがありません`}
            </div>
            <div className="empty-desc">
              {records.length === 0 ? (
                <>上の「月次データを追加」ボタンから、<br />月ごとの発電量・売電量・消費量を入力してください。</>
              ) : (
                <>別の年度を選択するか、<button className="btn btn-secondary btn-sm" style={{marginTop:8}} onClick={() => setYearFilter("all")}>全年度を表示</button></>
              )}
            </div>
          </div>
        </div>
      ) : (
        <>
          {/* 合計カード */}
          <div className="card" style={{ marginBottom: 10 }}>
            <div style={{ fontSize: 12, color: C.textMuted, marginBottom: 8 }}>合計（{sorted.length}ヶ月）</div>
            <div className="grid-2" style={{ gap: 8 }}>
              <div>
                <div style={{ fontSize: 11, color: C.textMuted }}>発電量</div>
                <div style={{ fontSize: 16, fontWeight: 700 }}>
                  {fmt.kwh(sorted.reduce((s, r) => s + (r.generated ?? 0), 0))}
                </div>
              </div>
              <div>
                <div style={{ fontSize: 11, color: C.textMuted }}>売電収入</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: C.sun }}>
                  {fmt.yen(sorted.reduce((s, r) => s + getSellIncome(r, settings?.fitRate).value, 0))}
                </div>
              </div>
            </div>
          </div>

          {/* 月別リスト */}
          <div className="list-group">
            {sorted.map((r, idx) => {
              const selfUse = (r.generated ?? 0) - (r.sold ?? 0);
              const { value: sellIncome, isActual } = getSellIncome(r, settings?.fitRate);
              const isOpen = expandedRecordId === r.id;
              return (
                <div key={r.id}>
                  <div className="list-cell" onClick={() => setExpandedRecordId(isOpen ? null : r.id)}>
                    <div className="list-cell-main">
                      <span className="list-cell-title">{fmt.month(r.month)}</span>
                      <span className="list-cell-subtitle">発電 {fmt.kwh(r.generated)} ／ 売電 {fmt.kwh(r.sold)}</span>
                    </div>
                    <span className="list-cell-value" style={{ color: C.sun }}>{fmt.yen(sellIncome)}</span>
                    <span className={`list-cell-chevron${isOpen ? " expanded" : ""}`}>▸</span>
                  </div>
                  {isOpen && (
                    <div className="list-cell-detail">
                      <div className="list-cell-detail-row">
                        <span style={{ color: C.textMuted }}>自家消費</span>
                        <span style={{ fontWeight: 600 }}>{fmt.kwh(Math.max(0, selfUse))}</span>
                      </div>
                      <div className="list-cell-detail-row">
                        <span style={{ color: C.textMuted }}>総消費</span>
                        <span style={{ fontWeight: 600 }}>{r.consumed != null ? fmt.kwh(r.consumed) : "—"}</span>
                      </div>
                      <div className="list-cell-detail-row">
                        <span style={{ color: C.textMuted }}>買電量</span>
                        <span style={{ fontWeight: 600 }}>{r.boughtKwh != null ? fmt.kwh(r.boughtKwh) : "—"}</span>
                      </div>
                      <div className="list-cell-detail-row">
                        <span style={{ color: C.textMuted }}>
                          売電収入{isActual ? "（実績）" : "（推定）"}
                        </span>
                        <span style={{ fontWeight: 600, color: C.sun }}>{fmt.yen(sellIncome)}</span>
                      </div>
                      <div className="list-cell-detail-row">
                        <span style={{ color: C.textMuted }}>実際の電気代</span>
                        <span style={{ fontWeight: 600 }}>{r.electricBill != null ? fmt.yen(r.electricBill) : "—"}</span>
                      </div>
                      {r.memo && (
                        <div className="list-cell-detail-row">
                          <span style={{ color: C.textMuted }}>メモ</span>
                          <span style={{ fontWeight: 500, textAlign: "right" }}>{r.memo}</span>
                        </div>
                      )}
                      <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                        <button className="btn btn-secondary btn-sm" style={{ flex: 1 }}
                          onClick={() => startEdit(r)}>編集</button>
                        <button className="btn btn-danger btn-sm" style={{ flex: 1 }}
                          onClick={() => handleDelete(r.id)}>削除</button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// Step 3: 料金単価設定画面
// ─────────────────────────────────────────────
function TariffEditor({ tariff, onUpdate, accentColor, label, isNew, onCancelNew, onDelete, canDelete }) {
  const [local, setLocal] = useState(() => ({
    ...tariff,
    tiers: tariff.tiers.map(t => ({ ...t })),
  }));
  const [dirty, setDirty] = useState(isNew);

  // 親から自動取得などで値が更新された場合に追従（未編集時のみ）
  useEffect(() => {
    if (!dirty) {
      setLocal({ ...tariff, tiers: tariff.tiers.map(t => ({ ...t })) });
    }
  }, [tariff.renewableLevy, tariff.fuelAdjustment, tariff.updatedAt, tariff.effectiveFrom]);

  const update = (fn) => { setLocal(prev => { const n = fn(prev); return n; }); setDirty(true); };

  const handleSave = () => {
    if (!local.effectiveFrom) { toast("適用開始月を入力してください", "error"); return; }
    const parsed = {
      ...local,
      basicFee:       parseFloat(local.basicFee)       || 0,
      renewableLevy:  parseFloat(local.renewableLevy)  || 0,
      fuelAdjustment: parseFloat(local.fuelAdjustment) || 0,
      tiers: local.tiers.map(t => ({ ...t, rate: parseFloat(t.rate) || 0 })),
      updatedAt: new Date().toISOString().slice(0, 7),
    };
    onUpdate(parsed);
    setDirty(false);
    toast(`${label}（${local.effectiveFrom}〜）の単価を保存しました`, "success");
  };

  const addTier = () => {
    update(p => ({ ...p, tiers: [...p.tiers, { label: "新しい時間帯", rate: 0 }] }));
  };

  const removeTier = (i) => {
    update(p => ({ ...p, tiers: p.tiers.filter((_, idx) => idx !== i) }));
  };

  const levy = parseFloat(local.renewableLevy)  || 0;
  const fuel = parseFloat(local.fuelAdjustment) || 0;

  return (
    <div className="card" style={{ borderTop: `3px solid ${accentColor}` }}>
      <div className="card-header" style={{ flexWrap: "wrap", gap: 8 }}>
        <span className="card-title" style={{ color: accentColor, minWidth: 0, flex: "1 1 100%" }}>
          {label}{isNew ? "（新規）" : ""}
        </span>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginLeft: "auto" }}>
          {isNew && onCancelNew && (
            <button className="btn btn-secondary btn-sm" onClick={onCancelNew}>キャンセル</button>
          )}
          {dirty && (
            <button className="btn btn-primary btn-sm" onClick={handleSave}>保存する</button>
          )}
          {!isNew && canDelete && onDelete && (
            <button className="btn btn-danger btn-sm" onClick={onDelete}>この単価を削除</button>
          )}
        </div>
      </div>

      {/* 適用開始月 */}
      <div className="form-group">
        <label className="form-label">適用開始月（この月以降の実績に適用）</label>
        <input type="month" className="form-input" style={{ maxWidth: 200 }}
          value={local.effectiveFrom ?? ""}
          onChange={e => update(p => ({ ...p, effectiveFrom: e.target.value }))} />
        <div className="form-hint">単価改定があった月を入力すると、その月以降の実績に自動で適用されます</div>
      </div>

      {/* プラン名 */}
      <div className="form-group">
        <label className="form-label">プラン名</label>
        <input className="form-input" value={local.name}
          onChange={e => update(p => ({ ...p, name: e.target.value }))} />
      </div>

      {/* 基本料金 */}
      <div className="form-group">
        <label className="form-label">基本料金（円/月）</label>
        <input type="number" className="form-input" style={{ maxWidth: 200 }}
          value={local.basicFee}
          onChange={e => update(p => ({ ...p, basicFee: e.target.value }))} />
      </div>

      {/* 時間帯別単価（従量料金） */}
      <div style={{ marginBottom: 12 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
          <label className="form-label" style={{ margin: 0 }}>時間帯別 従量単価（円/kWh）</label>
          <button className="btn btn-secondary btn-sm" onClick={addTier}>+ 追加</button>
        </div>
        {local.tiers.map((tier, i) => (
          <div key={i} style={{
            display: "grid", gridTemplateColumns: "1fr 120px 36px",
            gap: 8, marginBottom: 8, alignItems: "center"
          }}>
            <input className="form-input" placeholder="時間帯の説明"
              value={tier.label}
              onChange={e => update(p => {
                const tiers = p.tiers.map((t, idx) => idx === i ? { ...t, label: e.target.value } : t);
                return { ...p, tiers };
              })} />
            <input type="number" step="0.01" className="form-input" style={{ textAlign: "right" }}
              value={tier.rate}
              onChange={e => update(p => {
                const tiers = p.tiers.map((t, idx) => idx === i ? { ...t, rate: e.target.value } : t);
                return { ...p, tiers };
              })} />
            <button className="btn btn-danger btn-sm" onClick={() => removeTier(i)}
              style={{ padding: "5px 8px" }}>✕</button>
          </div>
        ))}
      </div>

      {/* 再エネ賦課金・燃料調整費 */}
      <div style={{
        background: C.panel, borderRadius: 8, padding: 12, marginBottom: 14
      }}>
        <div className="form-label" style={{ marginBottom: 10 }}>付加的単価（全国一律・月変動）</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div>
            <label style={{ fontSize: 11, color: C.textSecondary }}>再エネ発電促進賦課金</label>
            <input type="number" step="0.01" className="form-input" style={{ marginTop: 4 }}
              value={local.renewableLevy ?? ""}
              onChange={e => update(p => ({ ...p, renewableLevy: e.target.value }))} />
            <div className="form-hint">円/kWh（経産省が毎年度公表）</div>
          </div>
          <div>
            <label style={{ fontSize: 11, color: C.textSecondary }}>燃料費調整単価</label>
            <input type="number" step="0.01" className="form-input" style={{ marginTop: 4 }}
              value={local.fuelAdjustment ?? ""}
              onChange={e => update(p => ({ ...p, fuelAdjustment: e.target.value }))} />
            <div className="form-hint">円/kWh（電力会社が毎月公表・±変動あり）</div>
          </div>
        </div>
      </div>

      {/* 実質単価プレビュー */}
      <div style={{
        display: "flex", gap: 16, flexWrap: "wrap",
        fontSize: 12, color: C.textSecondary, marginBottom: 14,
        borderTop: `1px solid ${C.border}`, paddingTop: 10
      }}>
        <span>実質単価（例：従量+賦課金+調整費）:</span>
        {local.tiers.slice(0, 1).map((t, i) => (
          <strong key={i} style={{ color: accentColor, fontFamily: "JetBrains Mono" }}>
            {t.label.split("（")[0]} {((parseFloat(t.rate) || 0) + levy + fuel).toFixed(2)} 円/kWh
          </strong>
        ))}
      </div>

      {/* メモ */}
      <div className="form-group" style={{ marginBottom: 0 }}>
        <label className="form-label">備考</label>
        <input className="form-input" value={local.note}
          onChange={e => update(p => ({ ...p, note: e.target.value }))} />
        <div className="form-hint">最終更新: {local.updatedAt ?? "—"}</div>
      </div>
    </div>
  );
}


function TariffScreen({ tariffCurrentHistory, tariffCompareHistory, updateTariffHistory, deleteTariffHistoryEntry, addonHistory, settings }) {
  const [addingNew, setAddingNew] = useState(null); // "current" | "compare" | null

  const sortedCurrent  = [...tariffCurrentHistory].sort((a, b) => b.effectiveFrom.localeCompare(a.effectiveFrom));
  const sortedCompare  = [...tariffCompareHistory].sort((a, b) => b.effectiveFrom.localeCompare(a.effectiveFrom));
  const latestCurrent  = sortedCurrent[0];
  const latestCompare  = sortedCompare[0];
  const isLinked = latestCurrent?.linkedToCompare;
  const hasSwitchHistory = tariffCurrentHistory.length > 1;

  const addonMonths = addonHistory ? Object.keys(addonHistory).sort() : [];

  // 両プラン共通の付加的単価を最新エントリに一括反映
  const applyToBoth = (field, value) => {
    updateTariffHistory("current", { ...latestCurrent, [field]: value });
    updateTariffHistory("compare", { ...latestCompare, [field]: value });
    toast(`両プランの${field === "renewableLevy" ? "再エネ賦課金" : "燃料調整費"}を更新しました`, "success");
  };

  const startAddNew = (which) => setAddingNew(which);
  const cancelAddNew = () => setAddingNew(null);

  const makeNewEntry = (base) => ({
    ...base,
    tiers: base.tiers.map(t => ({ ...t })),
    effectiveFrom: new Date().toISOString().slice(0, 7),
    updatedAt: new Date().toISOString().slice(0, 7),
  });

  const handleDeleteEntry = async (which, effectiveFrom, historyLen) => {
    if (historyLen <= 1) { toast("最低1件の単価設定が必要です", "error"); return; }
    const ok = await askConfirm(`適用開始月 ${effectiveFrom} の単価設定を削除しますか？\nこの単価が適用されていた期間の実績は、別の単価設定にフォールバックされます。`, { danger: true });
    if (!ok) return;
    deleteTariffHistoryEntry(which, effectiveFrom);
    toast("単価設定を削除しました", "info");
  };

  return (
    <div>
      <div className="page-header">
        <div className="page-title">
          <span className="page-title-icon" style={{ background: C.sun }}><TabIcon name="yen" color="#fff" size={20} /></span>
          料金
        </div>
        <div className="page-subtitle">適用開始月ごとに単価を管理できます</div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 16 }}>
        {/* 契約切替の説明 */}
        {hasSwitchHistory && !isLinked && (
          <Disclosure title="2025年7月に北陸電力から出光でんきへ切替" icon="🔄">
            2025年1〜6月は北陸電力「くつろぎナイト12」と直接契約（基本料金2,255円・EV割なし）。
            2025年7月に出光でんきへ切替し、同プランの時間帯単価・燃料調整費・賦課金を踏襲しつつ、
            基本料金からEV割200円を割引した1,945円になりました。
            「分析」タブの比較プランは、切替後も北陸電力と契約し続けていた場合（基本料金2,255円のまま）を仮定して算出しています。
          </Disclosure>
        )}

        {/* 連動構造の説明（linkedToCompareフラグを使う場合のみ表示） */}
        {isLinked && (
          <Disclosure title="現契約は北陸電力プランに連動しています" icon="🔗">
            出光でんき（現契約）は北陸電力「くつろぎナイト12」の時間帯単価・燃料調整費・再エネ賦課金をそのまま踏襲し、
            基本料金のみEV割（現在 {settings?.evDiscount ?? 200}円/月）を割引した契約です。
            そのため、下の「比較：北陸電力」側で単価を更新すると、現契約側にも自動的に反映されます
            （現契約の基本料金は常に「北陸電力の基本料金 − EV割」で計算されます）。
            EV割の金額は「設定」タブで変更できます。
          </Disclosure>
        )}

        {/* 最新情報の取得方法ガイド */}
        <Disclosure title="再エネ賦課金・燃料調整費の最新情報" icon="🔍">
          <div style={{
            background: C.surface, borderRadius: 8, padding: 12, marginBottom: 12
          }}>
            <strong style={{ color: C.textPrimary }}>現在判明している最新値（参考）</strong>
            <div style={{ marginTop: 6 }}>
              ・再エネ発電促進賦課金：<strong style={{ color: C.textPrimary }}>4.18円/kWh</strong>　（2026年度・経済産業省発表／全国一律・2026年5月検針分〜2027年4月検針分）<br />
              ・燃料費調整単価：北陸電力は<strong>毎月</strong>変動するため、検針票または公式PDFで都度ご確認ください
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <div>📄 <strong>再エネ賦課金</strong>：経済産業省・資源エネルギー庁が毎年3月頃に翌年度単価を公表（全電力会社共通）</div>
            <div>📄 <strong>燃料費調整単価</strong>：北陸電力が毎月末頃に翌々月分を公表
              （<a href="https://www.rikuden.co.jp/asset/electric_price/" target="_blank" rel="noopener noreferrer" style={{ color: C.blue }}>北陸電力 公式ページ</a>）
            </div>
            <div>💬 このチャットで「再エネ賦課金と北陸電力の燃料調整費の最新値を調べて」と聞くと、Claudeがその場でWeb検索して最新値をお伝えします。確認した値は下のフォームに直接入力してください。</div>
          </div>
        </Disclosure>

        {/* 月別 燃料調整費・賦課金 実績履歴 */}
        {addonMonths.length > 0 && (
          <Disclosure title={`月別 燃料調整費・再エネ賦課金（実績）${addonMonths.length}ヶ月`} icon="📅">
            <div style={{ overflowX: "auto" }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>年月</th>
                    <th style={{ textAlign: "right" }}>燃料調整費</th>
                    <th style={{ textAlign: "right" }}>再エネ賦課金</th>
                    <th style={{ textAlign: "right" }}>合計加算額</th>
                  </tr>
                </thead>
                <tbody>
                  {[...addonMonths].reverse().map(m => {
                    const a = addonHistory[m];
                    return (
                      <tr key={m}>
                        <td style={{ color: C.textPrimary, fontWeight: 600 }}>{fmt.month(m)}</td>
                        <td className="num" style={{ color: a.fuel < 0 ? C.green : C.red }}>
                          {a.fuel >= 0 ? "+" : ""}{a.fuel.toFixed(2)} 円/kWh
                        </td>
                        <td className="num">{a.levy.toFixed(2)} 円/kWh</td>
                        <td className="num" style={{ fontWeight: 600 }}>
                          {(a.fuel + a.levy).toFixed(2)} 円/kWh
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <div style={{ fontSize: 11, color: C.textMuted, marginTop: 10 }}>
                出光でんき・北陸電力で共通の値として、月次比較計算に自動適用されます。
              </div>
            </div>
          </Disclosure>
        )}
      </div>

      {/* 一括反映ツール */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-header">
          <span className="card-title">付加的単価の一括更新（最新設定に反映）</span>
        </div>
        <div style={{ fontSize: 12, color: C.textMuted, marginBottom: 12 }}>
          再エネ賦課金・燃料調整費は両プランで同額（全国一律 or 同一電力会社）になることが多いため、ここで入力すると両方の最新設定に反映されます。
          上の「月別実績」が登録されている月はそちらが優先されるため、ここでの入力は主に最新月以降の見込み値として使われます。
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
          <div>
            <label className="form-label">再エネ発電促進賦課金（円/kWh）</label>
            <div style={{ display: "flex", gap: 8 }}>
              <input type="number" step="0.01" className="form-input" id="bulk-levy"
                defaultValue={latestCurrent.renewableLevy ?? 4.18} />
              <button className="btn btn-secondary btn-sm" onClick={() => {
                const v = parseFloat(document.getElementById("bulk-levy").value) || 0;
                applyToBoth("renewableLevy", v);
              }}>反映</button>
            </div>
          </div>
          <div>
            <label className="form-label">燃料費調整単価（円/kWh）</label>
            <div style={{ display: "flex", gap: 8 }}>
              <input type="number" step="0.01" className="form-input" id="bulk-fuel"
                defaultValue={latestCurrent.fuelAdjustment ?? 0.8} />
              <button className="btn btn-secondary btn-sm" onClick={() => {
                const v = parseFloat(document.getElementById("bulk-fuel").value) || 0;
                applyToBoth("fuelAdjustment", v);
              }}>反映</button>
            </div>
          </div>
        </div>
      </div>

      {/* 現契約：履歴一覧 + 新規追加 */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: C.sun }}>
            ☀ 現契約：出光でんき（北陸・オール電化10kVA）— 単価履歴 {sortedCurrent.length}件
          </span>
          {!addingNew && (
            <button className="btn btn-secondary btn-sm" onClick={() => startAddNew("current")}>
              + 新しい単価を追加
            </button>
          )}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {addingNew === "current" && (
            <TariffEditor
              tariff={makeNewEntry(latestCurrent)}
              onUpdate={(v) => { updateTariffHistory("current", v); setAddingNew(null); }}
              accentColor={C.sun}
              label="現契約：出光でんき"
              isNew
              onCancelNew={cancelAddNew}
            />
          )}
          {sortedCurrent.map(t => (
            <TariffEditor
              key={t.effectiveFrom}
              tariff={t}
              onUpdate={(v) => updateTariffHistory("current", v)}
              accentColor={C.sun}
              label={`現契約：出光でんき（${t.effectiveFrom}〜${t === sortedCurrent[0] ? "現在" : sortedCurrent[sortedCurrent.indexOf(t) - 1]?.effectiveFrom ?? ""}）`}
              canDelete={sortedCurrent.length > 1}
              onDelete={() => handleDeleteEntry("current", t.effectiveFrom, sortedCurrent.length)}
            />
          ))}
        </div>
      </div>

      {/* 比較プラン：履歴一覧 + 新規追加 */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: C.blue }}>
            🌙 比較：北陸電力「くつろぎナイト12」— 単価履歴 {sortedCompare.length}件
          </span>
          {!addingNew && (
            <button className="btn btn-secondary btn-sm" onClick={() => startAddNew("compare")}>
              + 新しい単価を追加
            </button>
          )}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {addingNew === "compare" && (
            <TariffEditor
              tariff={makeNewEntry(latestCompare)}
              onUpdate={(v) => { updateTariffHistory("compare", v); setAddingNew(null); }}
              accentColor={C.blue}
              label="比較：くつろぎナイト12"
              isNew
              onCancelNew={cancelAddNew}
            />
          )}
          {sortedCompare.map(t => (
            <TariffEditor
              key={t.effectiveFrom}
              tariff={t}
              onUpdate={(v) => updateTariffHistory("compare", v)}
              accentColor={C.blue}
              label={`比較：くつろぎナイト12（${t.effectiveFrom}〜${t === sortedCompare[0] ? "現在" : sortedCompare[sortedCompare.indexOf(t) - 1]?.effectiveFrom ?? ""}）`}
              canDelete={sortedCompare.length > 1}
              onDelete={() => handleDeleteEntry("compare", t.effectiveFrom, sortedCompare.length)}
            />
          ))}
        </div>
      </div>

      {/* 単価比較テーブル（最新設定同士） */}
      <div className="card">
        <div className="card-header">
          <span className="card-title">単価クイック比較（最新設定・従量単価のみ）</span>
        </div>
        <div style={{ overflowX: "auto" }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>項目</th>
                <th style={{ textAlign: "right", color: C.sun }}>出光でんき</th>
                <th style={{ textAlign: "right", color: C.blue }}>くつろぎナイト12</th>
                <th style={{ textAlign: "right" }}>差額</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style={{ color: C.textSecondary }}>基本料金（月）</td>
                <td className="num">{fmt.yen(latestCurrent.basicFee)}</td>
                <td className="num">{fmt.yen(latestCompare.basicFee)}</td>
                <td className="num" style={{
                  color: (latestCurrent.basicFee - latestCompare.basicFee) <= 0 ? C.green : C.red
                }}>
                  {fmt.yen(latestCurrent.basicFee - latestCompare.basicFee)}
                </td>
              </tr>
              {latestCurrent.tiers.map((tier, i) => {
                const compTier = latestCompare.tiers[i];
                const diff = tier.rate - (compTier?.rate ?? 0);
                return (
                  <tr key={i}>
                    <td style={{ color: C.textSecondary }}>{tier.label}</td>
                    <td className="num">{tier.rate.toFixed(2)} 円/kWh</td>
                    <td className="num">{compTier ? `${compTier.rate.toFixed(2)} 円/kWh` : "—"}</td>
                    <td className="num" style={{ color: diff <= 0 ? C.green : C.red }}>
                      {compTier ? `${diff >= 0 ? "+" : ""}${diff.toFixed(2)} 円` : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}


// ─────────────────────────────────────────────
// Step 4: 回収管理画面
// ─────────────────────────────────────────────
function RecoveryScreen({ records, settings, addonHistory, monthlyComparison }) {
  const fitRate      = settings.fitRate     ?? 8;
  const netCost       = (settings.installCost ?? 0) - (settings.subsidy ?? 0);
  const installedAt  = settings.installedAt ?? "2024-01";
  const fitEndYear   = settings.fitEndYear  ?? 2033;

  // ── 月次経済メリット ──
  // calcMonthlyComparison（シミュレーション・ダッシュボードと共通のロジック）の結果をそのまま使う。
  // 月次メリット = 導入なし推定電気代 − 実質コスト（電気代 − 売電収入）
  const monthlyBenefits = [...monthlyComparison]
    .sort((a, b) => a.month.localeCompare(b.month))
    .map(m => ({
      month: m.month,
      benefit: m.月次メリット,
      sellIncome: m.売電収入,
      savingEst: m.節電効果,
    }));

  // 累積メリット
  let cumulative = 0;
  const cumulData = monthlyBenefits.map(m => {
    cumulative += m.benefit;
    return {
      month: fmt.monthAxis(m.month),
      累積メリット: Math.round(cumulative),
      実質負担額:   Math.round(netCost),
    };
  });

  // 月平均メリット（将来予測用）
  // 全期間の単純平均ではなく、直近12ヶ月（データが12ヶ月未満なら全期間）の平均を使う。
  // 導入直後の数ヶ月（特に厳冬期）はシステムがまだ本来の性能を発揮しておらず、
  // この期間を将来予測にそのまま引き延ばすと回収期間を不当に長く見積もってしまうため。
  const recentMonths = monthlyBenefits.slice(-12);
  const avgMonthlyBenefit = recentMonths.length > 0
    ? recentMonths.reduce((s, m) => s + m.benefit, 0) / recentMonths.length
    : 0;
  // 参考: 全期間の単純平均（比較表示用）
  const avgMonthlyBenefitAllTime = monthlyBenefits.length > 0
    ? monthlyBenefits.reduce((s, m) => s + m.benefit, 0) / monthlyBenefits.length
    : 0;

  // 回収済み・残額
  const totalBenefit = cumulative;
  const recovered    = Math.min(totalBenefit, netCost);
  const remaining    = Math.max(0, netCost - totalBenefit);
  const recoveryPct  = netCost > 0 ? Math.min(100, (totalBenefit / netCost) * 100) : 0;

  // ── 回収完了予測 ──
  // 「導入月」から「回収完了月」までの総月数で年数を算出する
  const installedDate = (() => {
    const parts = (installedAt ?? "2024-01").split("-").map(Number);
    return new Date(parts[0], (parts[1] || 1) - 1, 1);
  })();

  // 現時点で既に経過した月数（導入月→現在）
  const now = new Date();
  const elapsedMonths =
    (now.getFullYear() - installedDate.getFullYear()) * 12 +
    (now.getMonth() - installedDate.getMonth());

  // 残り月数 = remaining ÷ 月平均メリット
  const recoveryMonthsLeft = avgMonthlyBenefit > 0 ? Math.ceil(remaining / avgMonthlyBenefit) : null;

  // 回収完了予定年月（現在から残り月数後）
  const recoveryDate = (() => {
    if (!recoveryMonthsLeft) return null;
    const d = new Date(now.getFullYear(), now.getMonth() + recoveryMonthsLeft, 1);
    return `${d.getFullYear()}年${d.getMonth() + 1}月`;
  })();

  // 導入月から回収完了月までの総月数 = 経過月数 + 残り月数
  const totalMonthsToRecovery = recoveryMonthsLeft != null
    ? elapsedMonths + recoveryMonthsLeft
    : null;

  const recoveryYearsLabel = (() => {
    if (totalMonthsToRecovery == null) return null;
    const years  = Math.floor(totalMonthsToRecovery / 12);
    const months = totalMonthsToRecovery % 12;
    if (years === 0) return `約${months}ヶ月`;
    if (months === 0) return `約${years}年`;
    return `約${years}年${months}ヶ月`;
  })();
  const recoveryYearNumber = totalMonthsToRecovery != null ? totalMonthsToRecovery / 12 : null;

  // 「残り期間」表示用：現時点から回収完了までの残り月数のみを年月表記に変換
  // （recoveryYearsLabelは「導入から完了まで」の全期間なので、用途が異なる）
  const remainingPeriodLabel = (() => {
    if (recoveryMonthsLeft == null) return null;
    const years  = Math.floor(recoveryMonthsLeft / 12);
    const months = recoveryMonthsLeft % 12;
    if (years === 0) return `約${months}ヶ月`;
    if (months === 0) return `約${years}年`;
    return `約${years}年${months}ヶ月`;
  })();

  // 将来予測（回収完了が見込まれる月まで動的に延長する。
  // 固定2年では実際の回収期間（10年超）に対してグラフ上に交差点が映らないため、
  // 「実際に交差するまで」を予測期間として確保する）
  const FUTURE_MONTHS = recoveryMonthsLeft != null
    ? Math.max(24, recoveryMonthsLeft + 12) // 交差点の少し先まで表示
    : 24;
  const futureData = [...cumulData];
  let lastCum = cumulative;
  let breakEvenIndex = null; // 損益分岐点（交差）に達したインデックス
  for (let i = 1; i <= FUTURE_MONTHS; i++) {
    const d = new Date();
    d.setMonth(d.getMonth() + i);
    const label = `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, "0")}`;
    const prevCum = lastCum;
    lastCum += avgMonthlyBenefit;
    if (breakEvenIndex == null && prevCum < netCost && lastCum >= netCost) {
      breakEvenIndex = cumulData.length + i - 1;
    }
    futureData.push({
      month: label,
      累積メリット: null,
      予測累積:     Math.round(lastCum),
      実質負担額:   Math.round(netCost),
      isBreakEven:  false,
    });
  }
  // 実績分にも予測列をnullで
  const chartData = futureData.map((d, i) => ({
    ...d,
    予測累積: i < cumulData.length ? null : d.予測累積,
    isBreakEven: i === breakEvenIndex,
  }));

  // 損益分岐点のグラフ上のラベル（年表示を間引くため、何年何ヶ月後かを算出）
  const breakEvenLabel = breakEvenIndex != null ? chartData[breakEvenIndex]?.month : null;

  // FIT終了後シナリオ
  const currentYear = new Date().getFullYear();
  const yearsToFitEnd = fitEndYear - currentYear;

  return (
    <div>
      <div className="page-header">
        <div className="page-title">
          <span className="page-title-icon" style={{ background: C.green }}><TabIcon name="target" color="#fff" size={20} /></span>
          回収
        </div>
        <div className="page-subtitle">導入費用の回収進捗と損益分岐点の見通し</div>
      </div>

      {/* 投資情報カード（仕様書：回収管理画面） */}
      <div className="list-group" style={{ marginBottom: 16 }}>
        <div className="list-cell no-tap">
          <span className="list-cell-title">初期投資額</span>
          <span className="list-cell-value">{fmt.yen(settings.installCost)}</span>
        </div>
        <div className="list-cell no-tap">
          <span className="list-cell-title">投資開始日</span>
          <span className="list-cell-value">{fmt.month(installedAt)}</span>
        </div>
        <div className="list-cell no-tap">
          <span className="list-cell-title">回収予定日</span>
          <span className="list-cell-value">{recoveryDate ?? "—"}</span>
        </div>
        <div className="list-cell no-tap">
          <span className="list-cell-title">回収率</span>
          <span className="list-cell-value" style={{ color: C.green }}>{recoveryPct.toFixed(1)}%</span>
        </div>
        <div className="list-cell no-tap">
          <span className="list-cell-title">残り回収額</span>
          <span className="list-cell-value">{fmt.yen(remaining)}</span>
        </div>
        <div className="list-cell no-tap">
          <span className="list-cell-title">残り期間</span>
          <span className="list-cell-value">{remainingPeriodLabel ?? "—"}</span>
        </div>
      </div>

      {/* KPIカード */}
      <div className="kpi-grid">
        <div className="kpi-card">
          <div className="kpi-label">回収進捗</div>
          <div className="kpi-value" style={{ color: C.green }}>{recoveryPct.toFixed(1)}<span className="kpi-unit">%</span></div>
          <div className="progress-track">
            <div className="progress-fill"
              style={{ width: `${recoveryPct}%`, background: C.green }} />
          </div>
          <div className="kpi-sub">{fmt.yen(Math.round(recovered))} 回収済み</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">残り回収額</div>
          <div className="kpi-value"
            style={{ fontSize: remaining > 999999 ? 20 : 22 }}>
            {Math.round(remaining / 10000)}<span className="kpi-unit">万円</span>
          </div>
          <div className="kpi-sub">実質負担額 {fmt.yen(netCost)}</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">月平均メリット（直近）</div>
          <div className="kpi-value">{Math.round(avgMonthlyBenefit / 100) * 100 === 0
            ? "—" : Math.round(avgMonthlyBenefit).toLocaleString()}
            <span className="kpi-unit">円</span>
          </div>
          <div className="kpi-sub">直近{recentMonths.length}ヶ月の平均</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">回収完了見込み</div>
          <div className="kpi-value" style={{ fontSize: 18, paddingTop: 4 }}>
            {recoveryDate ?? (monthlyBenefits.length === 0 ? "実績待ち" : "計算中")}
          </div>
          {recoveryMonthsLeft && (
            <div className="kpi-sub">あと約 {recoveryMonthsLeft} ヶ月</div>
          )}
        </div>
      </div>

      {/* 累積メリットグラフ */}
      {chartData.length > 0 && (
        <div className="card" style={{ marginBottom: 16 }}>
          <div className="card-header">
            <span className="card-title">
              累積メリット推移（実績 + {breakEvenLabel ? "損益分岐点まで" : "2年予測"}）
            </span>
          </div>
          <ResponsiveContainer width="100%" height={340}>
            <LineChart data={chartData} margin={{ top: 36, right: 16, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={C.border} vertical={false} />
              <XAxis dataKey="month" tick={{ fill: C.textMuted, fontSize: 9 }}
                axisLine={false} tickLine={false}
                angle={-40} textAnchor="end" height={50}
                interval={Math.floor(chartData.length / 8)} />
              <YAxis tick={{ fill: C.textMuted, fontSize: 11 }} axisLine={false} tickLine={false}
                tickFormatter={v => `¥${(v / 10000).toFixed(0)}万`} />
              <Tooltip content={({ active, payload, label }) => {
                if (!active || !payload?.length) return null;
                return (
                  <div style={{
                    background: C.surface, border: `1px solid ${C.border}`,
                    borderRadius: 8, padding: "10px 14px", fontSize: 12
                  }}>
                    <div style={{ color: C.textMuted, marginBottom: 6, fontWeight: 600 }}>{label}</div>
                    {payload.filter(p => p.value != null).map(p => (
                      <div key={p.dataKey} style={{ color: p.color, marginBottom: 2 }}>
                        {p.name}：<span style={{ fontFamily: "JetBrains Mono" }}>{fmt.yen(p.value)}</span>
                      </div>
                    ))}
                  </div>
                );
              }} />
              <Legend wrapperStyle={{ fontSize: 12, color: C.textSecondary }} />
              {/* 損益分岐線 */}
              <Line type="monotone" dataKey="実質負担額"
                stroke={C.red} strokeWidth={1.5} strokeDasharray="6 3"
                dot={false} name="実質負担額（目標）" />
              <Line type="monotone" dataKey="累積メリット"
                stroke={C.green} strokeWidth={2.5} dot={false} name="累積メリット（実績）" />
              <Line type="monotone" dataKey="予測累積"
                stroke={C.sun} strokeWidth={2} strokeDasharray="4 4"
                dot={false} name="予測累積メリット" />
              {breakEvenLabel && (
                <ReferenceLine x={breakEvenLabel} stroke={C.green} strokeWidth={1.5}
                  label={(props) => {
                    const { viewBox } = props;
                    const x = viewBox?.x ?? 0;
                    const y = (viewBox?.y ?? 0) + 2;
                    const text = "損益分岐点";
                    const boxWidth = text.length * 11 + 14;
                    // ラベルがグラフ右端を超えないよう、左寄せ/右寄せを自動調整
                    const chartWidth = viewBox?.width ?? 0;
                    const goLeft = x + boxWidth > chartWidth;
                    const rectX = goLeft ? x - boxWidth - 4 : x + 4;
                    return (
                      <g>
                        <rect x={rectX} y={y} width={boxWidth} height={20} rx={4}
                          fill={C.greenDim} stroke={C.green} strokeWidth={1} />
                        <text x={rectX + boxWidth / 2} y={y + 14} textAnchor="middle"
                          fill={C.green} fontSize={11} fontWeight={700}>
                          {text}
                        </text>
                      </g>
                    );
                  }} />
              )}
            </LineChart>
          </ResponsiveContainer>
          <div style={{ fontSize: 11, color: C.textMuted, textAlign: "center", marginTop: 4 }}>
            {breakEvenLabel
              ? `緑の縦線（${breakEvenLabel}頃）が、累積メリットが導入費用に到達する損益分岐点です`
              : "赤破線（実質負担額）と緑線（累積メリット）が交差した時点が損益分岐点（回収完了）"}
          </div>
        </div>
      )}

      {/* 月別メリット内訳 */}
      {monthlyBenefits.length > 0 && (
        <div className="card" style={{ marginBottom: 16 }}>
          <div className="card-header">
            <span className="card-title">月別メリット内訳</span>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={monthlyBenefits.map(m => ({
              month: fmt.monthAxis(m.month),
              売電収入: Math.round(m.sellIncome),
              節電効果: Math.round(m.savingEst),
            }))}>
              <CartesianGrid strokeDasharray="3 3" stroke={C.border} vertical={false} />
              <XAxis dataKey="month" tick={{ fill: C.textMuted, fontSize: 9 }} axisLine={false} tickLine={false}
                angle={-40} textAnchor="end" height={50} interval="preserveStartEnd" />
              <YAxis tick={{ fill: C.textMuted, fontSize: 11 }} axisLine={false} tickLine={false}
                tickFormatter={v => `¥${(v/1000).toFixed(0)}k`} />
              <Tooltip content={({ active, payload, label }) => {
                if (!active || !payload?.length) return null;
                const total = payload.reduce((s, p) => s + (p.value ?? 0), 0);
                return (
                  <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, padding: "10px 14px", fontSize: 12 }}>
                    <div style={{ color: C.textMuted, marginBottom: 6, fontWeight: 600 }}>{label}</div>
                    {payload.map(p => (
                      <div key={p.dataKey} style={{ color: p.color, marginBottom: 2 }}>
                        {p.name}：<span style={{ fontFamily: "JetBrains Mono" }}>{fmt.yen(p.value)}</span>
                      </div>
                    ))}
                    <div style={{ color: C.textPrimary, marginTop: 4, fontWeight: 600 }}>
                      合計：<span style={{ fontFamily: "JetBrains Mono" }}>{fmt.yen(total)}</span>
                    </div>
                  </div>
                );
              }} />
              <Legend wrapperStyle={{ fontSize: 12, color: C.textSecondary }} />
              <Bar dataKey="売電収入" stackId="a" fill={C.sun}   radius={[0,0,0,0]} name="売電収入" />
              <Bar dataKey="節電効果" stackId="a" fill={C.green} radius={[4,4,0,0]} name="節電効果（推定）" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* FIT終了後シナリオ */}
      <Disclosure title={`FIT終了後のシナリオ（終了予定: ${fitEndYear}年・あと約${yearsToFitEnd}年）`} icon="🔋">
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {[
            {
              title: "シナリオA: 自家消費シフト",
              color: C.green,
              desc: "FIT終了後は蓄電池を活用して昼間発電分をすべて自家消費。売電収入はなくなるが、買電量が減少することで月2,000〜4,000円程度の節約継続を見込む。",
            },
            {
              title: "シナリオB: 卒FIT買取活用",
              color: C.blue,
              desc: "卒FIT後も新電力等の余剰買取（8〜11円/kWh程度）に切り替えて売電継続。売電単価は下がるが収入はゼロにならない。",
            },
            {
              title: "シナリオC: EV活用",
              color: C.sun,
              desc: "EVを導入し、余剰電力を充電（V2H）。実質的な燃料費削減として経済メリットを継続。EVの導入タイミングと組み合わせると効果的。",
            },
          ].map(s => (
            <div key={s.title} style={{
              background: C.surface, borderRadius: 10, padding: 14,
              borderLeft: `3px solid ${s.color}`
            }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: s.color, marginBottom: 6 }}>{s.title}</div>
              <div style={{ fontSize: 12, color: C.textMuted, lineHeight: 1.7 }}>{s.desc}</div>
            </div>
          ))}
        </div>
      </Disclosure>

      {records.length === 0 && (
        <div className="card" style={{ marginTop: 16 }}>
          <div className="empty-state">
            <div className="empty-icon">📋</div>
            <div className="empty-title">実績データを入力するとグラフが表示されます</div>
            <div className="empty-desc">「実績」タブから月次データを入力してください</div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// Step 5: 経済効果シミュレーション画面
// ─────────────────────────────────────────────

// 月次比較計算ロジック（単価履歴対応・月ごとに適切な単価を自動選択）
// ─────────────────────────────────────────────
// 月次比較計算ロジック
//
// 3種類の「電気代」を並べて導入効果を多角的に見せる：
//
//   A) 現在の実電気代（実績値優先）
//      = 実際に支払った電気代（出光でんきの検針票の金額）
//      ※ electricBill があればそれを使う
//
//   B) 太陽光・蓄電池なし＆北陸電力継続だった場合の推定電気代（導入効果の本質）
//      = 総消費量をすべて買電していた場合の電気代
//      = 基本料金(2,255円) + 総消費量 × 夜間単価 × (大半が夜間という実績に基づく仮定)
//      ※ 導入しなかった場合と比べることで「年間いくら得しているか」が明確になる
//
//   C) 実質コスト（現在の実電気代 - 売電収入）
//      = 売電で相殺した後の実質的な支出
//
//   月次メリット = B(導入なし推定) - C(実質コスト)
//              = （導入なし電気代）-（現電気代）+（売電収入）
// ─────────────────────────────────────────────
// ─────────────────────────────────────────────
// 月次比較計算ロジック
//
//   A) 現在の実電気代（実績値優先）= 実際に支払った電気代
//
//   B) 太陽光・蓄電池なし＆北陸電力継続だった場合の推定電気代
//      = 基本料金 + 総消費量を「夜間比率」で昼夜に分配し、それぞれの単価を適用
//      ※ 夜間比率は実測CSV（2025年1〜6月）から判明した月別の値を使用。
//        蓄電池がない場合は夜間の安い時間帯にまとめて使う生活パターン自体が成立しないため、
//        実際の夜間比率をそのまま使うのは厳密には保守的（やや高めに出る）が、
//        生活パターン自体は変わらない前提として、実測比率を採用する。
//      ※ CSV分析（calcCompareePlanFromCSV）がある月は、そちらの精密値を優先採用する（呼び出し側で統合）。
//
//   C) 実質コスト = 現在の実電気代 - 売電収入（0未満にはならない）
//
//   月次メリット = B(導入なし推定) - C(実質コスト)
// ─────────────────────────────────────────────
function calcMonthlyComparison(records, tariffCurrentHistory, tariffCompareHistory, settings, addonHistory, csvAnalysis) {
  const fitRate    = settings.fitRate ?? 8;
  const evDiscount = settings.evDiscount ?? 200;

  // CSV分析結果から月→精密値のマップを作成（CSVがある場合のみ）
  const csvComparePlan = csvAnalysis ? calcCompareePlanFromCSV(csvAnalysis, tariffCompareHistory, records) : [];
  const csvByMonth = {};
  csvComparePlan.forEach(c => { csvByMonth[c.month] = c; });

  return [...records].sort((a, b) => a.month.localeCompare(b.month)).map(r => {
    const tariffCurrentBase = findApplicableTariff(tariffCurrentHistory, r.month) ?? tariffCurrentHistory[0];
    const tariffCompareBase = findApplicableTariff(tariffCompareHistory, r.month) ?? tariffCompareHistory[0];
    const tariffCurrent = tariffCurrentBase.linkedToCompare
      ? deriveCurrentTariffFromCompare(tariffCompareBase, evDiscount)
      : tariffCurrentBase;

    // 月別の燃料調整費・再エネ賦課金を実績値で取得
    const addon    = findApplicableAddon(addonHistory, r.month);
    const addOnVal = (addon.levy ?? 0) + (addon.fuel ?? 0);

    const nightRateCur = tariffCurrent.tiers.find(t => t.label.includes("夜間"))?.rate ?? 26.98;
    const effRateCur    = nightRateCur + addOnVal; // 実効夜間単価（現契約・燃料調整・賦課金込み）

    const consumed = r.consumed ?? 0;
    const selfUse   = Math.max(0, (r.generated ?? 0) - (r.sold ?? 0));
    const { value: sellIncome, isActual: sellIsActual } = getSellIncome(r, fitRate);

    // A) 現在の実電気代
    let actualBill;
    if (r.electricBill != null) {
      actualBill = r.electricBill;
    } else if (r.boughtKwh != null) {
      actualBill = tariffCurrent.basicFee + r.boughtKwh * effRateCur;
    } else {
      actualBill = tariffCurrent.basicFee + Math.max(0, consumed - selfUse) * effRateCur;
    }

    // B) 太陽光・蓄電池なし＆北陸電力継続だった場合
    //    CSV実測データがある月はそちらを精密値として優先採用し、なければ
    //    総消費量を「夏季昼間／その他季昼間／ウィークエンド／夜間」の4区分比率で分配した簡易推定を使う
    //    （北陸電力の正式な時間帯定義に基づく）
    const csvC = csvByMonth[r.month];
    const findRate = (keyword) => tariffCompareBase.tiers.find(t => t.label.includes(keyword))?.rate;
    const rateSummerComp  = (findRate("夏季") ?? 39.87) + addOnVal;
    const rateOtherComp   = (findRate("その他季") ?? 39.87) + addOnVal;
    const rateWeekendComp = (findRate("ウィークエンド") ?? 33.80) + addOnVal;
    const rateNightComp   = (findRate("夜間") ?? 26.98) + addOnVal;

    const ratio = getSeasonalUsageRatio(r.month);
    const summerKwh  = consumed * ratio.summer;
    const otherKwh   = consumed * ratio.other;
    const weekendKwh = consumed * ratio.weekend;
    const nightKwh   = consumed * ratio.night;

    const noSolarBillEstimated = tariffCompareBase.basicFee
      + summerKwh  * rateSummerComp
      + otherKwh   * rateOtherComp
      + weekendKwh * rateWeekendComp
      + nightKwh   * rateNightComp;

    const noSolarBill = csvC ? csvC.billTotal : noSolarBillEstimated;
    const csvBased = !!csvC;

    // C) 実質コスト = 現電気代 - 売電収入
    //    売電収入が電気代を上回る場合はマイナス（＝その月は電気代を払うどころか手元に現金が残る）になり得る。
    //    これを0円で打ち切ると、その分のメリットが計算から消えてしまうため、マイナスのまま扱う。
    const netBill = Math.max(0, actualBill) - sellIncome;

    // 月次メリット = 導入なし推定 - 実質コスト
    //   実質コストがマイナスの月は、そのマイナス分がそのまま月次メリットに加算される
    const monthlyBenefit = noSolarBill - netBill;

    // 節電効果の内訳（自家消費した分だけ買電しなかった、現契約の実効単価ベース）
    const savingEst = selfUse * Math.max(0, effRateCur);

    return {
      month:              r.month,
      label:              fmt.monthAxis(r.month),
      現在の電気代:       Math.round(Math.max(0, actualBill)),
      導入なし推定電気代: Math.round(Math.max(0, noSolarBill)),
      実質コスト:         Math.round(netBill),
      売電収入:           Math.round(sellIncome),
      売電収入実績:       sellIsActual,
      節電効果:           Math.round(savingEst),
      月次メリット:       Math.round(monthlyBenefit),
      発電量:             r.generated ?? 0,
      自家消費:           selfUse,
      総消費:             consumed,
      買電量精密:         r.boughtKwh != null,
      csvBased,
      夜間比率:           ratio.night,
      // 「導入なし推定」の内訳（タップ詳細表示用）
      // CSV精密値がある月は4区分の実測ベース内訳(noSolarBreakdown4)を、ない月は簡易推定内訳(noSolarBreakdown)を持つ
      noSolarBreakdown: csvC ? null : {
        basicFee:    tariffCompareBase.basicFee,
        summerKwh:   Math.round(summerKwh  * 10) / 10,
        otherKwh:    Math.round(otherKwh   * 10) / 10,
        weekendKwh:  Math.round(weekendKwh * 10) / 10,
        nightKwh:    Math.round(nightKwh   * 10) / 10,
        summerRate:  Math.round(rateSummerComp  * 100) / 100,
        otherRate:   Math.round(rateOtherComp   * 100) / 100,
        weekendRate: Math.round(rateWeekendComp * 100) / 100,
        nightRate:   Math.round(rateNightComp   * 100) / 100,
        summerCost:  Math.round(summerKwh  * rateSummerComp),
        otherCost:   Math.round(otherKwh   * rateOtherComp),
        weekendCost: Math.round(weekendKwh * rateWeekendComp),
        nightCost:   Math.round(nightKwh   * rateNightComp),
        ratioPct: {
          summer:  Math.round(ratio.summer  * 1000) / 10,
          other:   Math.round(ratio.other   * 1000) / 10,
          weekend: Math.round(ratio.weekend * 1000) / 10,
          night:   Math.round(ratio.night   * 1000) / 10,
        },
      },
      noSolarBreakdown4: csvC ? csvC.breakdown4 : null,
      effRate: effRateCur,
    };
  });
}

// 円グラフ・パレット
const PIE_COLORS = [C.sun, C.green, C.blue, C.red, "#A78BFA", "#F472B6"];

function SimulationScreen({ records, tariffCurrentHistory, tariffCompareHistory, settings, csvAnalysis, setCsvAnalysis, addonHistory, monthlyComparison }) {
  const [mode, setMode]   = useState("monthly"); // "monthly" | "annual"
  const [chartTab, setChartTab] = useState("compare"); // compare | breakdown | pie | radar
  const [csvUploading, setCsvUploading] = useState(false);
  const [csvError, setCsvError] = useState(null);
  const [breakdownMonth, setBreakdownMonth] = useState(null); // タップで内訳表示する月
  const [monthDetailOpen, setMonthDetailOpen] = useState(false); // 月次リストの展開状態
  const [showBreakdownModal, setShowBreakdownModal] = useState(false); // 時間帯別内訳モーダルの表示
  const fileInputRef = useRef(null);

  // 経済メリットの計算は App から渡される monthlyComparison（calcMonthlyComparisonの結果）を使う。
  // CSV分析結果もApp側のcalcMonthlyComparison呼び出し時に統合済みなので、ここで再計算はしない。
  // ダッシュボード・回収管理と完全に同じ値を使うことで、画面間の不一致を防ぐ。
  const monthly = monthlyComparison;
  const monthlyMerged = monthly; // 互換性のため別名を維持（テーブル・グラフ表示で使用）

  // CSVアップロード済みの月数（案内表示用）
  const csvAnalyzedMonthCount = monthlyMerged.filter(m => m.csvBased).length;

  const annualData = (() => {
    const byYear = {};
    monthlyMerged.forEach(m => {
      const year = m.month.slice(0, 4);
      if (!byYear[year]) byYear[year] = {
        year, 現在の電気代: 0, 導入なし推定電気代: 0, 実質コスト: 0,
        売電収入: 0, 節電効果: 0, 月次メリット: 0, months: 0
      };
      byYear[year].現在の電気代       += m.現在の電気代;
      byYear[year].導入なし推定電気代  += m.導入なし推定電気代;
      byYear[year].実質コスト          += m.実質コスト;
      byYear[year].売電収入    += m.売電収入;
      byYear[year].節電効果    += m.節電効果;
      byYear[year].月次メリット += m.月次メリット;
      byYear[year].months++;
    });
    return Object.values(byYear).sort((a, b) => a.year.localeCompare(b.year));
  })();

  const totalSellIncome   = monthlyMerged.reduce((s, m) => s + m.売電収入, 0);
  const totalSaving       = monthlyMerged.reduce((s, m) => s + m.節電効果, 0);
  const totalBenefit      = monthlyMerged.reduce((s, m) => s + m.月次メリット, 0);
  const totalNoSolarBill  = monthlyMerged.reduce((s, m) => s + m.導入なし推定電気代, 0);
  const totalNetCost      = monthlyMerged.reduce((s, m) => s + m.実質コスト, 0);

  const chartData = mode === "monthly" ? monthlyMerged : annualData.map(d => ({
    ...d, label: `${d.year}年`
  }));

  // 円グラフ用データ：経済メリットの内訳（売電 vs 節電）
  const pieData = [
    { name: "売電収入",   value: Math.max(0, totalSellIncome) },
    { name: "節電効果",   value: Math.max(0, totalSaving) },
  ].filter(d => d.value > 0);

  // 円グラフ用データ：実質コスト vs 経済メリット
  const pieCompareData = [
    { name: "実質コスト（電気代 - 売電収入）", value: Math.max(0, totalNetCost) },
    { name: "導入による経済メリット",           value: Math.max(0, totalBenefit) },
  ].filter(d => d.value > 0);

  // レーダーチャート用：月別パターンを正規化して多角的に見る（直近12ヶ月）
  const recentForRadar = monthlyMerged.slice(-12);
  const maxGen  = Math.max(1, ...recentForRadar.map(m => m.発電量));
  const maxSelf = Math.max(1, ...recentForRadar.map(m => m.自家消費));
  const maxSell = Math.max(1, ...recentForRadar.map(m => m.売電収入));
  const maxBen  = Math.max(1, ...recentForRadar.map(m => m.月次メリット));
  const radarData = recentForRadar.map(m => ({
    label: m.label,
    発電量: Math.round((m.発電量 / maxGen) * 100),
    自家消費: Math.round((m.自家消費 / maxSelf) * 100),
    売電収入: Math.round((m.売電収入 / maxSell) * 100),
    経済メリット: Math.round((m.月次メリット / maxBen) * 100),
  }));

  // ── CSVアップロード処理 ──
  const handleCsvUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCsvUploading(true);
    setCsvError(null);

    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        // Shift-JIS/CP932で書かれていることが多いため、まずUTF-8として軽く検証し、
        // 文字化けが疑われる場合はShift-JISとして再デコードする
        const buffer = ev.target.result;
        let text;
        try {
          const decoderUtf8 = new TextDecoder("utf-8", { fatal: true });
          text = decoderUtf8.decode(buffer);
        } catch {
          text = null;
        }
        if (!text || !text.includes("年月日")) {
          const decoderSjis = new TextDecoder("shift-jis");
          text = decoderSjis.decode(buffer);
        }
        const result = parseHokurikuCSV(text);
        result.fileName = file.name;
        setCsvAnalysis(result);
        toast(`CSVを解析しました（${result.totalDays}日分・${result.months.length}ヶ月）`, "success");
      } catch (err) {
        setCsvError(err.message || "CSVの解析に失敗しました");
        toast("CSVの解析に失敗しました", "error");
      } finally {
        setCsvUploading(false);
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    };
    reader.onerror = () => {
      setCsvError("ファイルの読み込みに失敗しました");
      setCsvUploading(false);
    };
    reader.readAsArrayBuffer(file);
  };

  const handleClearCsv = async () => {
    const ok = await askConfirm("アップロード済みのCSV分析データを削除しますか？", { danger: true });
    if (!ok) return;
    setCsvAnalysis(null);
    toast("CSV分析データを削除しました", "info");
  };

  return (
    <div>
      <div className="page-header">
        <div className="page-title">
          <span className="page-title-icon" style={{ background: "#AF52DE" }}><TabIcon name="chart.bar" color="#fff" size={20} /></span>
          分析
        </div>
        <div className="page-subtitle">累積メリット推移と導入効果を分析します</div>
      </div>

      {/* ── CSVアップロード ── */}
      <div style={{ marginBottom: 16 }}>
        <Disclosure title="時間帯別利用実績CSVによる精密分析" icon="🔬">
          電力会社からダウンロードした30分値の利用実績CSV（北陸電力フォーマット：年月日 + 時間帯別使用量 + 夏季昼間/その他季昼間/ウィークエンド/夜間の区分）をアップロードすると、
          「くつろぎナイト12」を継続していた場合の電気代を、実際の利用時間帯まで考慮して精密に計算します。
        </Disclosure>
        <div className="card" style={{ marginTop: 8 }}>
          {!csvAnalysis ? (
            <div>
              <input type="file" accept=".csv" ref={fileInputRef}
                onChange={handleCsvUpload} style={{ display: "none" }} id="csv-upload-input" />
              <button className="btn btn-primary" disabled={csvUploading}
                onClick={() => fileInputRef.current?.click()}>
                {csvUploading ? "解析中…" : "📁 CSVファイルを選択"}
              </button>
              {csvError && (
                <div style={{ color: C.red, fontSize: 12, marginTop: 10 }}>⚠ {csvError}</div>
              )}
            </div>
          ) : (
            <div>
              <div style={{
                background: C.panel, borderRadius: 8, padding: 12,
                display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10
              }}>
                <div style={{ fontSize: 12, color: C.textSecondary }}>
                  <span className="status-dot green" />
                  <strong style={{ color: C.textPrimary }}>{csvAnalysis.fileName ?? "CSVデータ"}</strong>　
                  期間: {csvAnalysis.dateRange?.from} 〜 {csvAnalysis.dateRange?.to}　
                  ({csvAnalysis.totalDays}日 / {csvAnalysis.months.length}ヶ月分)
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button className="btn btn-secondary btn-sm" onClick={() => fileInputRef.current?.click()}>
                    再アップロード
                  </button>
                  <button className="btn btn-danger btn-sm" onClick={handleClearCsv}>削除</button>
                </div>
              </div>
              <input type="file" accept=".csv" ref={fileInputRef}
                onChange={handleCsvUpload} style={{ display: "none" }} />
              <div style={{ fontSize: 11, color: C.textMuted, marginTop: 8 }}>
                ✓ {csvAnalyzedMonthCount}ヶ月分の月次比較に、CSVベースの精密な「くつろぎナイト12」料金を反映済み
              </div>
            </div>
          )}
        </div>
      </div>

      {/* サマリーKPI */}
      <div className="kpi-grid">
        <div className="kpi-card">
          <div className="kpi-label">累計 経済メリット</div>
          <div className="kpi-value" style={{ color: C.green, fontSize: totalBenefit > 999999 ? 20 : 22 }}>
            {Math.round(totalBenefit / 10000)}<span className="kpi-unit">万円</span>
          </div>
          <div className="kpi-sub">導入なし場合との差額（売電＋節電）</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">累計 売電収入</div>
          <div className="kpi-value" style={{ color: C.sun }}>{Math.round(totalSellIncome / 10000)}<span className="kpi-unit">万円</span></div>
          <div className="kpi-sub">実績振込額を優先集計</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">累計 節電効果</div>
          <div className="kpi-value" style={{ color: C.green }}>{Math.round(totalSaving / 10000)}<span className="kpi-unit">万円</span></div>
          <div className="kpi-sub">自家消費量 ×（夜間単価+燃料調整費+賦課金）</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">累計 実質コスト</div>
          <div className="kpi-value">{Math.round(totalNetCost / 10000)}<span className="kpi-unit">万円</span></div>
          <div className="kpi-sub">電気代合計 - 売電収入</div>
        </div>
      </div>

      {/* グラフタブ切替（改善⑤：多角的グラフ） */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-header" style={{ flexWrap: "wrap", gap: 8 }}>
          <span className="card-title">経済効果グラフ</span>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {[
              ["compare",   "電気代比較"],
              ["breakdown", "メリット内訳"],
              ["pie",       "円グラフ"],
              ["radar",     "多角分析"],
            ].map(([k, label]) => (
              <button key={k}
                className={`btn btn-sm ${chartTab === k ? "btn-primary" : "btn-secondary"}`}
                onClick={() => setChartTab(k)}>{label}</button>
            ))}
          </div>
        </div>

        {/* ① 電気代比較（月次/年次） */}
        {chartTab === "compare" && (
          <>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 6, marginBottom: 8 }}>
              <button className={`btn btn-sm ${mode === "monthly" ? "btn-primary" : "btn-secondary"}`}
                onClick={() => setMode("monthly")}>月次</button>
              <button className={`btn btn-sm ${mode === "annual" ? "btn-primary" : "btn-secondary"}`}
                onClick={() => setMode("annual")}>年次</button>
            </div>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={chartData} barCategoryGap="30%">
                <CartesianGrid strokeDasharray="3 3" stroke={C.border} vertical={false} />
                <XAxis dataKey="label" tick={{ fill: C.textMuted, fontSize: 9 }} axisLine={false} tickLine={false} angle={-40} textAnchor="end" height={50} interval="preserveStartEnd" />
                <YAxis tick={{ fill: C.textMuted, fontSize: 11 }} axisLine={false} tickLine={false}
                  tickFormatter={v => `¥${(v/1000).toFixed(0)}k`} />
                <Tooltip content={({ active, payload, label }) => {
                  if (!active || !payload?.length) return null;
                  return (
                    <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, padding: "10px 14px", fontSize: 12 }}>
                      <div style={{ color: C.textMuted, marginBottom: 6, fontWeight: 600 }}>{label}</div>
                      {payload.map(p => (
                        <div key={p.dataKey} style={{ color: p.color, marginBottom: 2 }}>
                          {p.name}：<span style={{ fontFamily: "JetBrains Mono" }}>{fmt.yen(p.value)}</span>
                        </div>
                      ))}
                    </div>
                  );
                }} />
                <Legend wrapperStyle={{ fontSize: 12, color: C.textSecondary }} />
                <Bar dataKey="導入なし推定電気代" fill={C.red}   radius={[4,4,0,0]} name="導入なし（全量買電）推定" opacity={0.75} />
                <Bar dataKey="現在の電気代"       fill={C.sun}   radius={[4,4,0,0]} name="現在の電気代（実績）" />
                <Bar dataKey="実質コスト"         fill={C.green} radius={[4,4,0,0]} name="実質コスト（電気代－売電収入）" />
              </BarChart>
            </ResponsiveContainer>
          </>
        )}

        {/* ② メリット内訳（積み上げ＋累積エリア） */}
        {chartTab === "breakdown" && monthlyMerged.length > 0 && (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={monthlyMerged} barCategoryGap="30%">
              <CartesianGrid strokeDasharray="3 3" stroke={C.border} vertical={false} />
              <XAxis dataKey="label" tick={{ fill: C.textMuted, fontSize: 9 }} axisLine={false} tickLine={false} angle={-40} textAnchor="end" height={50} interval="preserveStartEnd" />
              <YAxis tick={{ fill: C.textMuted, fontSize: 11 }} axisLine={false} tickLine={false}
                tickFormatter={v => `¥${(v/1000).toFixed(0)}k`} />
              <Tooltip content={({ active, payload, label }) => {
                if (!active || !payload?.length) return null;
                const total = payload.reduce((s, p) => s + (p.value ?? 0), 0);
                return (
                  <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, padding: "10px 14px", fontSize: 12 }}>
                    <div style={{ color: C.textMuted, marginBottom: 6, fontWeight: 600 }}>{label}</div>
                    {payload.map(p => (
                      <div key={p.dataKey} style={{ color: p.color, marginBottom: 2 }}>
                        {p.name}：<span style={{ fontFamily: "JetBrains Mono" }}>{fmt.yen(p.value)}</span>
                      </div>
                    ))}
                    <div style={{ color: C.textPrimary, marginTop: 4, fontWeight: 600, borderTop: `1px solid ${C.border}`, paddingTop: 4 }}>
                      合計：<span style={{ fontFamily: "JetBrains Mono" }}>{fmt.yen(total)}</span>
                    </div>
                  </div>
                );
              }} />
              <Legend wrapperStyle={{ fontSize: 12, color: C.textSecondary }} />
              <Bar dataKey="売電収入" stackId="a" fill={C.sun}   name="売電収入" />
              <Bar dataKey="節電効果" stackId="a" fill={C.green} radius={[4,4,0,0]} name="節電効果（推定）" />
            </BarChart>
          </ResponsiveContainer>
        )}

        {/* ③ 円グラフ：経済メリットの構成比 */}
        {chartTab === "pie" && pieData.length > 0 && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 16 }}>
            <div>
              <div style={{ fontSize: 12, color: C.textMuted, textAlign: "center", marginBottom: 6 }}>経済メリットの構成</div>
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%"
                    outerRadius={85} innerRadius={45}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    labelLine={false}>
                    {pieData.map((entry, i) => (
                      <Cell key={entry.name} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v) => fmt.yen(v)}
                    contentStyle={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div>
              <div style={{ fontSize: 12, color: C.textMuted, textAlign: "center", marginBottom: 6 }}>実質コスト vs 経済メリット</div>
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie data={pieCompareData} dataKey="value" nameKey="name" cx="50%" cy="50%"
                    outerRadius={85} innerRadius={45}
                    label={({ name, percent }) => `${(percent * 100).toFixed(0)}%`}
                    labelLine={false}>
                    {pieCompareData.map((entry, i) => (
                      <Cell key={entry.name} fill={[C.red, C.green][i % 2]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v) => fmt.yen(v)}
                    contentStyle={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, fontSize: 12 }} />
                  <Legend wrapperStyle={{ fontSize: 11, color: C.textSecondary }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* ④ レーダーチャート：直近12ヶ月の多角分析 */}
        {chartTab === "radar" && radarData.length >= 3 && (
          <>
            <div style={{ fontSize: 11, color: C.textMuted, textAlign: "center", marginBottom: 6 }}>
              直近{radarData.length}ヶ月（各指標を期間内最大値=100として正規化）
            </div>
            <ResponsiveContainer width="100%" height={320}>
              <RadarChart data={radarData}>
                <PolarGrid stroke={C.border} />
                <PolarAngleAxis dataKey="label" tick={{ fill: C.textMuted, fontSize: 10 }} />
                <PolarRadiusAxis tick={{ fill: C.textMuted, fontSize: 9 }} angle={30} domain={[0, 100]} />
                <Radar name="発電量"     dataKey="発電量"   stroke={C.sun}   fill={C.sun}   fillOpacity={0.15} />
                <Radar name="自家消費"   dataKey="自家消費" stroke={C.green} fill={C.green} fillOpacity={0.15} />
                <Radar name="経済メリット" dataKey="経済メリット" stroke={C.blue} fill={C.blue} fillOpacity={0.15} />
                <Legend wrapperStyle={{ fontSize: 12, color: C.textSecondary }} />
                <Tooltip contentStyle={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, fontSize: 12 }} />
              </RadarChart>
            </ResponsiveContainer>
          </>
        )}
        {chartTab === "radar" && radarData.length < 3 && (
          <div className="empty-state" style={{ padding: "30px 0" }}>
            <div className="empty-desc">多角分析には3ヶ月以上の実績データが必要です</div>
          </div>
        )}
      </div>

      {/* 計算方法の説明 */}
      <div style={{ marginBottom: 10 }}>
        <Disclosure title="計算方法" icon="📐">
          「導入なし推定」= 太陽光・蓄電池がなかった場合に総消費量を全て買電していた想定の電気代。北陸電力「くつろぎナイト12」の4つの時間帯区分（夏季昼間=7/1〜9/30の平日8-20時／その他季昼間=10/1〜翌6/30の平日8-20時／ウィークエンド=土日祝等の8-20時／夜間=20-翌8時）の使用比率を月別に推定し、それぞれの単価＋燃料調整費＋再エネ賦課金を適用（タップで内訳表示）。<br /><br />
          「実質コスト」= 実際の電気代 − 売電収入（売電収入が電気代を上回る月はマイナス＝その分も含めて月次メリットに反映）。<br /><br />
          「月次メリット」= 導入なし推定 − 実質コスト。
        </Disclosure>
      </div>

      {/* 月次比較詳細（リスト形式） */}
      {monthlyMerged.length > 0 && (
        <>
          <div className="section-label">月次比較詳細</div>

          {/* 合計カード */}
          <div className="card" style={{ marginBottom: 10 }}>
            <div style={{ fontSize: 12, color: C.textMuted, marginBottom: 8 }}>合計（{monthlyMerged.length}ヶ月）</div>
            <div className="grid-2" style={{ gap: 8 }}>
              <div>
                <div style={{ fontSize: 11, color: C.textMuted }}>月次メリット合計</div>
                <div style={{ fontSize: 18, fontWeight: 700, color: C.green }}>
                  {fmt.yen(monthlyMerged.reduce((s, m) => s + m.月次メリット, 0))}
                </div>
              </div>
              <div>
                <div style={{ fontSize: 11, color: C.textMuted }}>導入なし推定合計</div>
                <div style={{ fontSize: 18, fontWeight: 700, color: C.red }}>
                  {fmt.yen(monthlyMerged.reduce((s, m) => s + m.導入なし推定電気代, 0))}
                </div>
              </div>
            </div>
          </div>

          <div className="list-group">
            {[...monthlyMerged].reverse().map(m => {
              const isOpen = breakdownMonth?.month === m.month && monthDetailOpen;
              return (
                <div key={m.month}>
                  <div className="list-cell" onClick={() => {
                    if (monthDetailOpen && breakdownMonth?.month === m.month) {
                      setMonthDetailOpen(false);
                    } else {
                      setBreakdownMonth(m);
                      setMonthDetailOpen(true);
                    }
                  }}>
                    <div className="list-cell-main">
                      <span className="list-cell-title">{fmt.month(m.month)}</span>
                      <span className="list-cell-subtitle">
                        導入なし推定 {fmt.yen(m.導入なし推定電気代)}
                        {m.csvBased && <span style={{ color: C.green }}> ・CSV精密</span>}
                      </span>
                    </div>
                    <span className="list-cell-value" style={{ color: C.green }}>
                      {fmt.yen(m.月次メリット)}
                    </span>
                    <span className={`list-cell-chevron${isOpen ? " expanded" : ""}`}>▸</span>
                  </div>
                  {isOpen && (
                    <div className="list-cell-detail">
                      <div className="list-cell-detail-row">
                        <span style={{ color: C.textMuted }}>導入なし推定</span>
                        <span style={{ fontWeight: 600, color: C.red, cursor: (m.noSolarBreakdown || m.noSolarBreakdown4) ? "pointer" : "default" }}
                          onClick={() => (m.noSolarBreakdown || m.noSolarBreakdown4) && setShowBreakdownModal(true)}>
                          {fmt.yen(m.導入なし推定電気代)} {(m.noSolarBreakdown || m.noSolarBreakdown4) && "🔍"}
                        </span>
                      </div>
                      <div className="list-cell-detail-row">
                        <span style={{ color: C.textMuted }}>現在の電気代</span>
                        <span style={{ fontWeight: 600 }}>{fmt.yen(m.現在の電気代)}</span>
                      </div>
                      <div className="list-cell-detail-row">
                        <span style={{ color: C.textMuted }}>
                          売電収入{m.売電収入実績 ? "（実績）" : "（推定）"}
                        </span>
                        <span style={{ fontWeight: 600, color: C.sun }}>{fmt.yen(m.売電収入)}</span>
                      </div>
                      <div className="list-cell-detail-row">
                        <span style={{ color: C.textMuted }}>実質コスト</span>
                        <span style={{ fontWeight: 600, color: m.実質コスト < 0 ? C.green : C.textPrimary }}>
                          {m.実質コスト < 0 ? `+${fmt.yen(Math.abs(m.実質コスト))}（売電が上回り得）` : fmt.yen(m.実質コスト)}
                        </span>
                      </div>
                      <div className="list-cell-detail-row">
                        <span style={{ color: C.textMuted }}>節電効果</span>
                        <span style={{ fontWeight: 600, color: C.green }}>{fmt.yen(m.節電効果)}</span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* 「導入なし推定」の内訳モーダル */}
      {showBreakdownModal && breakdownMonth && (breakdownMonth.noSolarBreakdown || breakdownMonth.noSolarBreakdown4) && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 9997,
          background: "rgba(0,0,0,0.4)",
          display: "flex", alignItems: "center", justifyContent: "center", padding: 20,
        }} onClick={() => setShowBreakdownModal(false)}>
          <div style={{
            background: C.surface, borderRadius: 16,
            padding: 22, maxWidth: 380, width: "100%", boxShadow: "0 16px 48px rgba(0,0,0,0.2)",
            maxHeight: "85vh", overflowY: "auto",
          }} onClick={e => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <span style={{ fontSize: 14, fontWeight: 700, color: C.red }}>
                {fmt.month(breakdownMonth.month)}の導入なし推定 内訳
              </span>
              <button className="btn btn-secondary btn-sm" onClick={() => setShowBreakdownModal(false)}>✕</button>
            </div>

            {breakdownMonth.noSolarBreakdown4 ? (
              // CSV精密版：4区分（夏季昼間・その他季昼間・ウィークエンド・夜間）の内訳
              (() => {
                const b = breakdownMonth.noSolarBreakdown4;
                const rows = [
                  ["夏季昼間",       b.summerKwh,  b.summerRate,  b.summerCost, b.csvRatioSummer,  "7/1〜9/30の平日 8:00-20:00"],
                  ["その他季昼間",   b.otherKwh,   b.otherRate,   b.otherCost,  b.csvRatioOther,   "10/1〜翌6/30の平日 8:00-20:00"],
                  ["ウィークエンド", b.weekendKwh, b.weekendRate, b.weekendCost, b.csvRatioWeekend, "土・日・祝日等 8:00-20:00（季節共通）"],
                  ["夜間",           b.nightKwh,   b.nightRate,   b.nightCost,  b.csvRatioNight,   "20:00〜翌8:00（年間共通12時間）"],
                ];
                return (
                  <div style={{ fontSize: 13, color: C.textSecondary, lineHeight: 1.8 }}>
                    <div style={{
                      background: C.greenDim, borderRadius: 8, padding: 12, marginBottom: 12,
                      fontSize: 12, color: C.green, lineHeight: 1.7
                    }}>
                      ✓ アップロードしたCSVから「時間帯別の使用比率」を算出し、その月の実際の総消費量に当てはめて計算しています（CSVの絶対量は太陽光導入後の買電分のみのため、比率の参考にのみ使用）。
                    </div>
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>時間帯</th>
                          <th style={{ textAlign: "right" }}>配分量</th>
                          <th style={{ textAlign: "right" }}>単価</th>
                          <th style={{ textAlign: "right" }}>小計</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td colSpan={3} style={{ color: C.textMuted }}>基本料金</td>
                          <td className="num">{fmt.yen(b.basicFee)}</td>
                        </tr>
                        {rows.map(([label, kwh, rate, cost, ratio, timeDef]) => (
                          <tr key={label}>
                            <td style={{ color: C.textMuted }}>
                              {label}<span style={{fontSize:9, marginLeft:4, color:C.textMuted}}>({ratio}%)</span>
                              <div style={{ fontSize: 9, color: C.textMuted, opacity: 0.7 }}>{timeDef}</div>
                            </td>
                            <td className="num">{kwh} kWh</td>
                            <td className="num">{rate} 円</td>
                            <td className="num">{fmt.yen(cost)}</td>
                          </tr>
                        ))}
                        <tr>
                          <td colSpan={3} style={{ color: C.red, fontWeight: 700, borderTop: `1px solid ${C.border}`, paddingTop: 10 }}>合計</td>
                          <td className="num" style={{ color: C.red, fontWeight: 700, borderTop: `1px solid ${C.border}`, paddingTop: 10 }}>
                            {fmt.yen(breakdownMonth.導入なし推定電気代)}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                );
              })()
            ) : (
              // 簡易推定版：4区分（夏季昼間・その他季昼間・ウィークエンド・夜間）の内訳
              (() => {
                const b = breakdownMonth.noSolarBreakdown;
                const pct = b.ratioPct;
                const rows = [
                  ["夏季昼間",       b.summerKwh,  b.summerRate,  b.summerCost,  pct.summer,  "7/1〜9/30の平日 8:00-20:00"],
                  ["その他季昼間",   b.otherKwh,   b.otherRate,   b.otherCost,   pct.other,   "10/1〜翌6/30の平日 8:00-20:00"],
                  ["ウィークエンド", b.weekendKwh, b.weekendRate, b.weekendCost, pct.weekend, "土・日・祝日等 8:00-20:00（季節共通）"],
                  ["夜間",           b.nightKwh,   b.nightRate,   b.nightCost,   pct.night,   "20:00〜翌8:00（年間共通12時間）"],
                ];
                return (
                  <div style={{ fontSize: 13, color: C.textSecondary, lineHeight: 1.8 }}>
                    <div style={{
                      background: C.panel, borderRadius: 8, padding: 12, marginBottom: 12,
                      fontSize: 12, color: C.textMuted, lineHeight: 1.7
                    }}>
                      総消費量を、北陸電力「くつろぎナイト12」の4つの時間帯区分の比率で分配して計算しています（実測CSVデータに基づく月別の生活パターン）。CSVをアップロードすると、この月も実測の時間帯別データで精密計算できます。
                    </div>
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>時間帯</th>
                          <th style={{ textAlign: "right" }}>配分量</th>
                          <th style={{ textAlign: "right" }}>単価</th>
                          <th style={{ textAlign: "right" }}>小計</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td colSpan={3} style={{ color: C.textMuted }}>基本料金</td>
                          <td className="num">{fmt.yen(b.basicFee)}</td>
                        </tr>
                        {rows.map(([label, kwh, rate, cost, ratioPct, timeDef]) => (
                          <tr key={label}>
                            <td style={{ color: C.textMuted }}>
                              {label}<span style={{fontSize:9, marginLeft:4, color:C.textMuted}}>({ratioPct}%)</span>
                              <div style={{ fontSize: 9, color: C.textMuted, opacity: 0.7 }}>{timeDef}</div>
                            </td>
                            <td className="num">{kwh} kWh</td>
                            <td className="num">{rate} 円</td>
                            <td className="num">{fmt.yen(cost)}</td>
                          </tr>
                        ))}
                        <tr>
                          <td colSpan={3} style={{ color: C.red, fontWeight: 700, borderTop: `1px solid ${C.border}`, paddingTop: 10 }}>合計</td>
                          <td className="num" style={{ color: C.red, fontWeight: 700, borderTop: `1px solid ${C.border}`, paddingTop: 10 }}>
                            {fmt.yen(breakdownMonth.導入なし推定電気代)}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                );
              })()
            )}
          </div>
        </div>
      )}

      {records.length === 0 && (
        <div className="card">
          <div className="empty-state">
            <div className="empty-icon">📊</div>
            <div className="empty-title">実績データを入力するとシミュレーションが表示されます</div>
            <div className="empty-desc">「実績管理」タブから月次データを入力してください</div>
          </div>
        </div>
      )}
    </div>
  );
}

// --- 設定 ---
function SettingsScreen({ settings, setSettings, onSave, setRecords, onFullReset, onImportExcel }) {
  const [form, setForm] = useState({ ...settings });

  useEffect(() => { setForm({ ...settings }); }, [settings]);

  const handleChange = (key, val) => {
    setForm(prev => ({ ...prev, [key]: val }));
  };

  const handleSave = () => {
    const parsed = {
      ...form,
      installCost:      parseFloat(form.installCost) || 0,
      subsidy:          parseFloat(form.subsidy)     || 0,
      fitRate:          parseFloat(form.fitRate)      || 0,
      fitEndYear:       parseInt(form.fitEndYear)     || 2033,
      systemCapacity:   parseFloat(form.systemCapacity) || 0,
      batteryCapacity:  parseFloat(form.batteryCapacity) || 0,
      co2Factor:        parseFloat(form.co2Factor)    || 0.439,
      evDiscount:       parseFloat(form.evDiscount)   || 0,
    };
    setSettings(parsed);
    onSave(parsed);
    toast("設定を保存しました", "success");
  };

  const fields = [
    { key:"installCost",     label:"導入費用（円）",           hint:"太陽光 + 蓄電池の総設置費用（補助金込みの実質負担額）" },
    { key:"subsidy",         label:"補助金（円）",             hint:"受領済みの国・自治体補助金（導入費用に含まれている場合は0）" },
    { key:"fitRate",         label:"FIT売電単価（円/kWh）",    hint:"固定価格買取制度の単価（実績: 8円/kWh）" },
    { key:"fitEndYear",      label:"FIT終了年",                hint:"FIT契約の満了年（例: 2033）" },
    { key:"systemCapacity",  label:"太陽光パネル容量（kW）",   hint:"公称最大出力（例: 8.010）" },
    { key:"batteryCapacity", label:"蓄電池容量（kWh）",        hint:"蓄電池の定格容量（例: 15）" },
    { key:"co2Factor",       label:"CO₂排出係数（kg/kWh）",   hint:"電力会社の係数（北陸電力: 0.439）" },
    { key:"evDiscount",      label:"EV割引額（円/月）",        hint:"出光でんきの基本料金から割引される金額（200円）" },
  ];

  return (
    <div>
      <div className="page-header">
        <div className="page-title">
          <span className="page-title-icon" style={{ background: "#8E8E93" }}><TabIcon name="gear" color="#fff" size={20} /></span>
          設定
        </div>
        <div className="page-subtitle">導入情報と基本パラメータ</div>
      </div>

      <div className="section-label">基本設定</div>
      <div className="list-group" style={{ marginBottom: 16 }}>
        {/* 導入年月だけ専用のmonth inputで表示 */}
        <div className="settings-row">
          <div>
            <div className="settings-row-label">導入年月</div>
            <div className="settings-row-hint">太陽光システムの運転開始月</div>
          </div>
          <input
            type="month"
            className="form-input"
            style={{width:160}}
            value={form.installedAt ?? ""}
            onChange={e => setForm(p => ({ ...p, installedAt: e.target.value }))}
          />
        </div>

        {fields.map(f => (
          <div key={f.key} className="settings-row">
            <div>
              <div className="settings-row-label">{f.label}</div>
              <div className="settings-row-hint">{f.hint}</div>
            </div>
            <input
              className="form-input"
              style={{width:140, textAlign:"right"}}
              value={form[f.key] ?? ""}
              onChange={e => handleChange(f.key, e.target.value)}
            />
          </div>
        ))}
      </div>

      <button className="btn btn-primary" style={{ width: "100%", justifyContent: "center", marginBottom: 24 }} onClick={handleSave}>
        保存する
      </button>

      <div className="section-label">データ管理</div>
      <Disclosure title="実績Excelの再取り込み・初期化" icon="🗂">
        {onImportExcel && (
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 12, color: C.textMuted, marginBottom: 10, lineHeight: 1.6 }}>
              実績Excel（太陽光記録）のデータで実績・単価・燃料調整費を上書きします。
            </div>
            <button className="btn btn-secondary btn-sm" onClick={async () => {
              const ok = await askConfirm("実績Excelのデータで現在の実績・単価設定を上書きします。\nよろしいですか？", { confirmLabel: "取り込む" });
              if (!ok) return;
              await onImportExcel(true);
            }}>
              📥 実績Excelを再取り込み（上書き）
            </button>
          </div>
        )}
        <div style={{display:"flex", gap:10, flexWrap:"wrap"}}>
          <button className="btn btn-secondary btn-sm" onClick={async () => {
            const ok = await askConfirm("すべての実績データを削除します。\nよろしいですか？", { danger: true, confirmLabel: "削除する" });
            if (!ok) return;
            await storageSet("monthly-records", []);
            setRecords([]);
            toast("実績データをリセットしました", "info");
          }}>
            🗑 実績データをリセット
          </button>
          <button className="btn btn-danger btn-sm" onClick={async () => {
            const ok = await askConfirm("設定・実績・単価データをすべて初期化します。\nこの操作は取り消せません。よろしいですか？", { danger: true, confirmLabel: "初期化する" });
            if (!ok) return;
            const keys = ["settings","monthly-records","tariff-current","tariff-compare","tariff-current-history","tariff-compare-history","addon-history","csv-analysis","excel-import-done"];
            for (const k of keys) await storageDelete(k).catch(()=>{});
            onFullReset?.();
            toast("全データを初期化しました", "info");
          }}>
            ⚠ 全データを初期化
          </button>
        </div>
      </Disclosure>
    </div>
  );
}


// ─────────────────────────────────────────────
// メインアプリ
// ─────────────────────────────────────────────
export default function App() {
  const [activeTab,     setActiveTab]     = useState("dashboard");
  const [loading,       setLoading]       = useState(true);
  const [settings,      setSettings]      = useState(DEFAULT_SETTINGS);
  const [records,       setRecords]       = useState([]);
  const [tariffCurrent, setTariffCurrent] = useState(DEFAULT_TARIFF_CURRENT);
  const [tariffCompare, setTariffCompare] = useState(DEFAULT_TARIFF_COMPARE);
  // 単価履歴（月ごとに異なる単価を適用するため）
  const [tariffCurrentHistory, setTariffCurrentHistory] = useState([
    DEFAULT_TARIFF_CURRENT_BEFORE_SWITCH,
    DEFAULT_TARIFF_CURRENT,
  ]);
  const [tariffCompareHistory, setTariffCompareHistory] = useState([DEFAULT_TARIFF_COMPARE]);
  // 月別の燃料調整費・再エネ賦課金（実績に基づく細かい変動を管理）
  const [addonHistory, setAddonHistory] = useState({ ...DEFAULT_ADDON_HISTORY });
  // CSV分析結果のキャッシュ
  const [csvAnalysis, setCsvAnalysis] = useState(null);
  // 初回のみ表示するインポート案内（既にインポート済み/データがある場合は出さない）
  const [showImportBanner, setShowImportBanner] = useState(false);

  // 実績フォームの状態をここで保持（タブ切替で消えないようにする）
  const [recordForm,     setRecordForm]     = useState({ ...EMPTY_RECORD_FORM });
  const [recordEditId,   setRecordEditId]   = useState(null);
  const [recordShowForm, setRecordShowForm] = useState(false);

  // ── 初期ロード ──
  useEffect(() => {
    (async () => {
      const [s, r, tch, tcomph, ah, imported] = await Promise.all([
        storageGet("settings"),
        storageGet("monthly-records"),
        storageGet("tariff-current-history"),
        storageGet("tariff-compare-history"),
        storageGet("addon-history"),
        storageGet("excel-import-done"),
      ]);
      if (s) setSettings(s);
      if (r) setRecords(r);
      if (tch && tch.length) {
        setTariffCurrentHistory(tch);
        setTariffCurrent(tch[tch.length - 1]);
      } else {
        // 旧バージョンからの移行: 単一tariffがあれば履歴の先頭に
        const legacy = await storageGet("tariff-current");
        if (legacy) {
          const hist = [{ ...legacy, effectiveFrom: legacy.effectiveFrom ?? "2024-01" }];
          setTariffCurrentHistory(hist);
          setTariffCurrent(legacy);
        }
      }
      if (tcomph && tcomph.length) {
        setTariffCompareHistory(tcomph);
        setTariffCompare(tcomph[tcomph.length - 1]);
      } else {
        const legacy = await storageGet("tariff-compare");
        if (legacy) {
          const hist = [{ ...legacy, effectiveFrom: legacy.effectiveFrom ?? "2024-01" }];
          setTariffCompareHistory(hist);
          setTariffCompare(legacy);
        }
      }
      if (ah) setAddonHistory(ah);
      const csv = await storageGet("csv-analysis");
      if (csv) setCsvAnalysis(csv);
      // 実績データが空で、まだExcelインポートを実行していない場合のみ案内バナーを表示
      if ((!r || r.length === 0) && !imported) {
        setShowImportBanner(true);
      }
      setLoading(false);
    })();
  }, []);

  // ── 保存ヘルパー ──
  const saveSettings   = useCallback((v) => storageSet("settings", v), []);
  const saveRecords    = useCallback((v) => storageSet("monthly-records", v), []);
  const saveTariffCurrentHistory = useCallback((v) => storageSet("tariff-current-history", v), []);
  const saveTariffCompareHistory = useCallback((v) => storageSet("tariff-compare-history", v), []);
  const saveCsvAnalysis = useCallback((v) => storageSet("csv-analysis", v), []);
  const saveAddonHistory = useCallback((v) => storageSet("addon-history", v), []);

  // 単価履歴に新しいエントリを追加/更新するヘルパー（最新を末尾、effectiveFromでソート）
  const updateTariffHistory = (which, newTariff) => {
    const isCurrent = which === "current";
    const history = isCurrent ? tariffCurrentHistory : tariffCompareHistory;
    const existingIdx = history.findIndex(h => h.effectiveFrom === newTariff.effectiveFrom);
    let next;
    if (existingIdx >= 0) {
      next = history.map((h, i) => i === existingIdx ? newTariff : h);
    } else {
      next = [...history, newTariff];
    }
    next.sort((a, b) => a.effectiveFrom.localeCompare(b.effectiveFrom));
    if (isCurrent) {
      setTariffCurrentHistory(next);
      saveTariffCurrentHistory(next);
      setTariffCurrent(next[next.length - 1]);
    } else {
      setTariffCompareHistory(next);
      saveTariffCompareHistory(next);
      setTariffCompare(next[next.length - 1]);
    }
  };

  const deleteTariffHistoryEntry = (which, effectiveFrom) => {
    const isCurrent = which === "current";
    const history = isCurrent ? tariffCurrentHistory : tariffCompareHistory;
    const next = history.filter(h => h.effectiveFrom !== effectiveFrom);
    if (next.length === 0) return; // 最低1件は残す
    if (isCurrent) {
      setTariffCurrentHistory(next);
      saveTariffCurrentHistory(next);
      setTariffCurrent(next[next.length - 1]);
    } else {
      setTariffCompareHistory(next);
      saveTariffCompareHistory(next);
      setTariffCompare(next[next.length - 1]);
    }
  };

  // Excel実績データを取り込む（既存データとマージ。同じ月は実績Excel側で上書き）
  const handleImportExcelData = async (overwrite) => {
    let nextRecords;
    if (overwrite) {
      nextRecords = IMPORTED_RECORDS.map(r => ({ ...r, id: `rec-${r.month}` }));
    } else {
      const existingMonths = new Set(records.map(r => r.month));
      const toAdd = IMPORTED_RECORDS
        .filter(r => !existingMonths.has(r.month))
        .map(r => ({ ...r, id: `rec-${r.month}` }));
      nextRecords = [...records, ...toAdd];
    }
    nextRecords.sort((a, b) => a.month.localeCompare(b.month));
    setRecords(nextRecords);
    saveRecords(nextRecords);

    // 比較プラン（北陸電力「くつろぎナイト12」）: 全期間 基本料金2,255円固定（EV割なし）
    const newCompareHistory = [{ ...DEFAULT_TARIFF_COMPARE, effectiveFrom: "2025-01" }];
    setTariffCompareHistory(newCompareHistory);
    saveTariffCompareHistory(newCompareHistory);
    setTariffCompare(newCompareHistory[newCompareHistory.length - 1]);

    // 現契約: 2025-01〜06は北陸電力直接契約(2,255円)、2025-07以降は出光でんき(EV割適用1,945円)
    const newCurrentHistory = [
      { ...DEFAULT_TARIFF_CURRENT_BEFORE_SWITCH },
      { ...DEFAULT_TARIFF_CURRENT },
    ];
    setTariffCurrentHistory(newCurrentHistory);
    saveTariffCurrentHistory(newCurrentHistory);
    setTariffCurrent(newCurrentHistory[newCurrentHistory.length - 1]);

    setAddonHistory({ ...DEFAULT_ADDON_HISTORY });
    saveAddonHistory({ ...DEFAULT_ADDON_HISTORY });

    const newSettings = { ...settings, ...DEFAULT_SETTINGS };
    setSettings(newSettings);
    saveSettings(newSettings);

    await storageSet("excel-import-done", true);
    setShowImportBanner(false);
    toast(`実績Excelから${IMPORTED_RECORDS.length}ヶ月分のデータを取り込みました`, "success");
  };

  const dismissImportBanner = async () => {
    await storageSet("excel-import-done", true);
    setShowImportBanner(false);
  };

  const handleFullReset = () => {
    setSettings(DEFAULT_SETTINGS);
    setRecords([]);
    setTariffCurrentHistory([DEFAULT_TARIFF_CURRENT_BEFORE_SWITCH, DEFAULT_TARIFF_CURRENT]);
    setTariffCompareHistory([DEFAULT_TARIFF_COMPARE]);
    setTariffCurrent(DEFAULT_TARIFF_CURRENT);
    setTariffCompare(DEFAULT_TARIFF_COMPARE);
    setAddonHistory({ ...DEFAULT_ADDON_HISTORY });
    setCsvAnalysis(null);
  };

  if (loading) {
    return (
      <div style={{
        minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center",
        background: C.bg, color: C.textSecondary, fontFamily:"'Inter',sans-serif",
        flexDirection:"column", gap:16
      }}>
        <div className="sun-icon" style={{fontSize:40}}>☀</div>
        <div>データを読み込んでいます…</div>
      </div>
    );
  }

  // すべてのタブを常時マウントし、display:noneで切り替える
  // → タブ切替でコンポーネントがアンマウントされず、入力中の値が消えない

  // 経済メリットの計算は calcMonthlyComparison を「唯一の正」として一度だけ実行し、
  // ダッシュボード・シミュレーション・回収管理の3画面で同じ結果を共有する。
  // CSV分析結果（csvAnalysis）も一緒に渡し、CSVがある月は精密値が自動的に使われるようにする。
  // （以前は各画面が独自の簡易計算式を持っていたり、CSV精密化がSimulationScreen内だけで
  //   行われていたりしたため、画面間で表示金額が矛盾していた）
  const monthlyComparison = calcMonthlyComparison(
    records, tariffCurrentHistory, tariffCompareHistory, settings, addonHistory, csvAnalysis
  );

  const screens = [
    { id: "dashboard", node: (
      <div>
        {showImportBanner && (
          <ImportBanner onImport={handleImportExcelData} onDismiss={dismissImportBanner} />
        )}
        <DashboardScreen records={records} settings={settings} monthlyComparison={monthlyComparison} />
      </div>
    )},
    { id: "records", node: (
      <RecordsScreen
        records={records}
        setRecords={(v) => { setRecords(v); saveRecords(v); }}
        settings={settings}
        tariffCurrentHistory={tariffCurrentHistory}
        form={recordForm} setForm={setRecordForm}
        editId={recordEditId} setEditId={setRecordEditId}
        showForm={recordShowForm} setShowForm={setRecordShowForm}
      />
    )},
    { id: "tariff", node: (
      <TariffScreen
        tariffCurrentHistory={tariffCurrentHistory}
        tariffCompareHistory={tariffCompareHistory}
        updateTariffHistory={updateTariffHistory}
        deleteTariffHistoryEntry={deleteTariffHistoryEntry}
        addonHistory={addonHistory}
        settings={settings}
      />
    )},
    { id: "simulation", node: (
      <SimulationScreen
        records={records}
        tariffCurrentHistory={tariffCurrentHistory}
        tariffCompareHistory={tariffCompareHistory}
        settings={settings}
        csvAnalysis={csvAnalysis}
        setCsvAnalysis={(v) => { setCsvAnalysis(v); saveCsvAnalysis(v); }}
        addonHistory={addonHistory}
        monthlyComparison={monthlyComparison}
      />
    )},
    { id: "recovery", node: (
      <RecoveryScreen records={records} settings={settings} addonHistory={addonHistory} monthlyComparison={monthlyComparison} />
    )},
    { id: "settings", node: (
      <SettingsScreen
        settings={settings}
        setSettings={setSettings}
        onSave={saveSettings}
        setRecords={(v) => { setRecords(v); saveRecords(v); }}
        onFullReset={handleFullReset}
        onImportExcel={handleImportExcelData}
      />
    )},
  ];

  return (
    <>
      <style>{STYLES}</style>
      <div className="app-shell">

        {/* ── トップバー ── */}
        <header className="topbar">
          <div className="topbar-logo">
            <div>
              <div className="topbar-logo-text">SolarManager</div>
              <div className="topbar-logo-sub">太陽光・蓄電池 投資回収管理</div>
            </div>
          </div>

          {/* デスクトップ: 上部タブ */}
          <div className="topbar-divider" />
          <nav className="nav-tabs-top">
            {TABS.map(t => (
              <button
                key={t.id}
                className={`nav-tab-top${activeTab === t.id ? " active" : ""}`}
                onClick={() => setActiveTab(t.id)}
              >
                <TabIcon name={t.icon} active={activeTab === t.id} />
                {t.label}
              </button>
            ))}
          </nav>

          {/* ステータス */}
          <div className="topbar-status" style={{display:"flex", alignItems:"center", gap:8, flexShrink:0}}>
            <span className="status-dot green" />
            <span style={{fontSize:12, color:C.textMuted}}>
              {records.length}件の実績
            </span>
          </div>
        </header>

        {/* ── コンテンツ（全タブ常時マウント） ── */}
        <main className="main-content">
          {screens.map(s => (
            <div key={s.id} style={{ display: activeTab === s.id ? "block" : "none" }}>
              {s.node}
            </div>
          ))}
        </main>

        {/* ── モバイル: ボトムナビゲーション（iOS純正TabBar） ── */}
        <nav className="bottom-nav">
          <div className="bottom-nav-inner">
            {TABS.map(t => (
              <button
                key={t.id}
                className={`bottom-nav-tab${activeTab === t.id ? " active" : ""}`}
                onClick={() => setActiveTab(t.id)}
              >
                <span className="bottom-nav-icon"><TabIcon name={t.icon} active={activeTab === t.id} /></span>
                <span className="bottom-nav-label">{t.label}</span>
              </button>
            ))}
          </div>
        </nav>

        <ToastContainer />
        <ConfirmDialog />
      </div>
    </>
  );
}

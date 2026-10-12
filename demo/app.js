/**
 * CrowdFund3 Protocol — bộ điều khiển mô phỏng
 *
 * Nguyên tắc: mô phỏng phải chạy ĐÚNG LUẬT của Crowdfunding.sol, không phải
 * một bản gần giống. Hai bất biến của hợp đồng được vẽ thẳng ra giao diện
 * dưới dạng phép so sánh sống, nên mọi lệch pha giữa mô phỏng và hợp đồng
 * đều hiện ra thành một dòng "lệch" trên màn hình.
 */

const INITIAL_DURATION = 604800; // 7 ngày, tính bằng giây
const INITIAL_GOAL = 10.0;       // 10.00 ETH
const DISPLAY_WINDOW_DAYS = 10;  // dải trục thời gian: 0–10 ngày (hạn chót ở 7)

/** Ngưỡng hạn chót, tính theo ngày, dùng chung cho mọi phép so sánh. */
const DEADLINE_DAYS = INITIAL_DURATION / 86400;

const SIM_WALLETS = {
  creator: {
    id: 'creator',
    name: 'Chủ dự án',
    address: '0x90F79bf6EB2c4f870365E785982E1f101E93b906',
    balance: 1.50,
    role: 'creator'
  },
  alice: {
    id: 'alice',
    name: 'Alice',
    address: '0x71C637C245000019b0Ec5736383EFE73A3C008B3',
    balance: 12.50,
    role: 'backer'
  },
  bob: {
    id: 'bob',
    name: 'Bob',
    address: '0x29E3065b2636B424213F9335808796122d261e4A',
    balance: 8.00,
    role: 'backer'
  },
  charlie: {
    id: 'charlie',
    name: 'Charlie',
    address: '0x8F3b5087F869A8F6d8b2dF9142145eE4268e3678',
    balance: 15.00,
    role: 'backer'
  }
};

let appState = {
  activePersonaId: 'alice',
  goalEth: INITIAL_GOAL,
  pledgedEth: 0.0,
  startAt: Math.floor(Date.now() / 1000),
  duration: INITIAL_DURATION,
  simulatedTimeOffset: 0,
  claimed: false,
  contributions: {},
  eventLogs: []
};

// ====================================================================
//                            BIỂU TƯỢNG
// Nét mảnh, vẽ bằng SVG. Không dùng emoji: ở cỡ 10–14px emoji khoá cứng
// vào bảng màu riêng của hệ điều hành, không theo được theme của trang.
// ====================================================================

const ICON = {
  lock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>',
  unlock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V7a4 4 0 0 1 7.4-1.4"/></svg>',
  check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>',
  alert: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="M12 7.5v5M12 16.2v.1"/></svg>',
  info: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 7.8v.1"/></svg>',
  sun: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>',
  moon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z"/></svg>'
};

// ====================================================================
//                       THÔNG BÁO TRONG TRANG
// Thay cho alert(): hộp thoại của trình duyệt chặn luồng trình bày và
// xuống dòng rất xấu với chuỗi tiếng Việt dài kèm địa chỉ ví.
// ====================================================================

const TOAST_META = {
  error: { cls: 'is-error', icon: ICON.alert, title: 'Không thực hiện được' },
  warn: { cls: 'is-warn', icon: ICON.alert, title: 'Chú ý' },
  ok: { cls: 'is-ok', icon: ICON.check, title: 'Thành công' },
  info: { cls: 'is-info', icon: ICON.info, title: 'Thông tin' }
};

function notify(kind, message, title) {
  const stack = document.getElementById('toastStack');
  if (!stack) return;

  const meta = TOAST_META[kind] || TOAST_META.info;
  const el = document.createElement('div');
  el.className = `toast ${meta.cls}`;
  el.innerHTML =
    `<span class="toast-icon" aria-hidden="true">${meta.icon}</span>` +
    `<div class="toast-body">` +
      `<div class="toast-title"></div>` +
      `<div class="toast-msg"></div>` +
    `</div>`;
  el.querySelector('.toast-title').textContent = title || meta.title;
  el.querySelector('.toast-msg').textContent = message;

  stack.appendChild(el);

  const dismiss = () => {
    el.classList.add('is-leaving');
    el.addEventListener('animationend', () => el.remove(), { once: true });
  };
  const timer = setTimeout(dismiss, kind === 'error' ? 6500 : 4500);
  el.addEventListener('click', () => { clearTimeout(timer); dismiss(); });
}

// ====================================================================
//              CHẾ ĐỘ TRÌNH CHIẾU / MÁY CHIẾU LỚP HỌC
// ====================================================================

function initTheme() {
  applyTheme(localStorage.getItem('cf3_theme') || 'dark');

  window.addEventListener('keydown', (e) => {
    const t = e.target;
    if (t && (t.tagName === 'INPUT' || t.tagName === 'SELECT' || t.tagName === 'TEXTAREA')) return;
    if (e.key === 't' || e.key === 'T') toggleTheme();
  });
}

function toggleTheme() {
  const isLight = document.documentElement.getAttribute('data-theme') === 'light';
  const next = isLight ? 'dark' : 'light';
  applyTheme(next);
  localStorage.setItem('cf3_theme', next);
}

function applyTheme(theme) {
  const icon = document.getElementById('themeIcon');
  const label = document.getElementById('themeLabel');

  if (theme === 'light') {
    document.documentElement.setAttribute('data-theme', 'light');
    if (icon) icon.innerHTML = ICON.moon;
    if (label) label.textContent = 'Giao diện tối';
  } else {
    document.documentElement.removeAttribute('data-theme');
    if (icon) icon.innerHTML = ICON.sun;
    if (label) label.textContent = 'Trình chiếu';
  }
}

// ====================================================================
//                            KHỞI TẠO
// ====================================================================

window.addEventListener('DOMContentLoaded', () => {
  initTheme();
  resetCampaign();
  addLog('Khởi tạo', 'Hợp đồng được triển khai',
    `Mục tiêu ${appState.goalEth.toFixed(2)} ETH · Thời hạn 7 ngày (604.800 giây)`, 'event-pledge');
  const pledgeInput = document.getElementById('pledgeInput');
  if (pledgeInput) {
    pledgeInput.addEventListener('input', (e) => {
      const val = parseFloat(e.target.value);
      document.querySelectorAll('.btn-chip').forEach(chip => {
        chip.classList.toggle('active', parseFloat(chip.dataset.val) === val);
      });
    });
  }
  render();
});

// ====================================================================
//                          TRẠNG THÁI
// ====================================================================

function selectPersona(personaId) {
  appState.activePersonaId = personaId;
  const select = document.getElementById('walletSelect');
  if (select && select.value !== personaId) select.value = personaId;
  render();
}

function switchModeTab(mode) {
  const sandboxView = document.getElementById('sandboxView');
  const web3View = document.getElementById('web3View');
  const tabSandbox = document.getElementById('tabBtnSandbox');
  const tabWeb3 = document.getElementById('tabBtnWeb3');
  const toSandbox = mode === 'sandbox';

  if (sandboxView) sandboxView.style.display = toSandbox ? 'grid' : 'none';
  if (web3View) web3View.style.display = toSandbox ? 'none' : 'block';
  if (tabSandbox) tabSandbox.classList.toggle('active', toSandbox);
  if (tabWeb3) tabWeb3.classList.toggle('active', !toSandbox);
}

function switchRightTab(tabName) {
  const tabs = document.querySelectorAll('.right-tab-item');
  const panes = document.querySelectorAll('.right-tab-pane');
  tabs.forEach(tab => tab.classList.toggle('active', tab.dataset.tab === tabName));
  panes.forEach(pane => pane.classList.toggle('active', pane.id === `pane-${tabName}`));
}

function setPledgeAmount(val) {
  const input = document.getElementById('pledgeInput');
  if (input) input.value = val;
  document.querySelectorAll('.btn-chip').forEach(chip => {
    chip.classList.toggle('active', parseFloat(chip.dataset.val) === parseFloat(val));
  });
}

function setPledgeMax() {
  const wallet = getActiveWallet();
  const needed = Math.max(0, appState.goalEth - appState.pledgedEth);
  let maxVal = needed > 0 && wallet.balance >= needed ? needed : wallet.balance;
  maxVal = Math.round(maxVal * 100) / 100;
  if (maxVal <= 0) maxVal = 1.0;
  setPledgeAmount(maxVal);
  document.querySelectorAll('.btn-chip').forEach(chip => {
    chip.classList.toggle('active', chip.dataset.val === 'max');
  });
}

function getEffectiveTime() {
  return Math.floor(Date.now() / 1000) + appState.simulatedTimeOffset;
}

function getDeadline() {
  return appState.startAt + appState.duration;
}

function getCampaignState() {
  if (appState.claimed) return 'Claimed';
  if (getEffectiveTime() < getDeadline()) return 'Active';
  return appState.pledgedEth >= appState.goalEth ? 'Successful' : 'Failed';
}

/** Số ngày đã trôi qua theo đồng hồ mô phỏng. */
function daysPassed() {
  return appState.simulatedTimeOffset / 86400;
}

/** Tổng các khoản góp riêng lẻ — vế phải của bất biến `pledged == Σ pledgedAmount`. */
function sumContributions() {
  return Object.values(appState.contributions).reduce((a, b) => a + b, 0);
}

// ====================================================================
//                    TRỤC THỜI GIAN (MÁY THỜI GIAN)
// ====================================================================

function handleTimeSlider(val) {
  appState.simulatedTimeOffset = Math.floor(parseFloat(val) * 86400);
  render();
}

function setTimeByDays(days) {
  const slider = document.getElementById('timeSlider');
  if (slider) slider.value = days;
  handleTimeSlider(days);
  addLog('Tua thời gian', `Đưa đồng hồ chuỗi tới ngày ${days}`,
    `Bù giờ EVM: +${appState.simulatedTimeOffset} giây`, 'event-time');
}

// ====================================================================
//                        HÀNH ĐỘNG HỢP ĐỒNG
// Mỗi hàm kiểm tra đúng thứ tự và đúng điều kiện như hàm tương ứng
// trong Crowdfunding.sol, rồi báo lỗi bằng thông báo trong trang.
// ====================================================================

function handlePledge() {
  const state = getCampaignState();
  if (state !== 'Active') {
    notify('error', `Chiến dịch đang ở trạng thái ${stateLabel(state)}. Hàm pledge() sẽ hoàn tác vì block.timestamp >= endAt.`);
    return;
  }

  const input = document.getElementById('pledgeInput');
  const amount = parseFloat(input.value);

  if (isNaN(amount) || amount <= 0) {
    notify('error', 'Số ETH đóng góp phải lớn hơn 0. Hợp đồng hoàn tác với ZeroPledge().');
    return;
  }

  const wallet = SIM_WALLETS[appState.activePersonaId];
  if (wallet.balance < amount) {
    notify('error', `Ví ${wallet.name} chỉ còn ${wallet.balance.toFixed(2)} ETH, không đủ để góp ${amount.toFixed(2)} ETH.`);
    return;
  }

  wallet.balance -= amount;
  appState.pledgedEth += amount;
  appState.contributions[wallet.address] = (appState.contributions[wallet.address] || 0) + amount;

  notify('ok', `${wallet.name} đã góp ${amount.toFixed(2)} ETH. Quỹ hiện có ${appState.pledgedEth.toFixed(2)} ETH.`);
  addLog('Pledge', `${wallet.name} góp ${amount.toFixed(2)} ETH`,
    `Tổng quỹ ${appState.pledgedEth.toFixed(2)} / ${appState.goalEth.toFixed(2)} ETH`, 'event-pledge');
  render();
}

function handleUnpledge() {
  const state = getCampaignState();
  if (state !== 'Active') {
    notify('error', `Chỉ rút cọc được khi chiến dịch còn hạn. Hiện tại: ${stateLabel(state)}.`);
    return;
  }

  const wallet = SIM_WALLETS[appState.activePersonaId];
  const contrib = appState.contributions[wallet.address] || 0;
  if (contrib <= 0) {
    notify('error', `Ví ${wallet.name} không có khoản góp nào trong chiến dịch.`);
    return;
  }

  const input = document.getElementById('pledgeInput');
  let retract = parseFloat(input.value);
  if (isNaN(retract) || retract <= 0 || retract > contrib) retract = contrib;

  // CEI: sổ sách ghi trước, chuyển tiền sau.
  appState.pledgedEth -= retract;
  appState.contributions[wallet.address] -= retract;
  if (appState.contributions[wallet.address] <= 0) delete appState.contributions[wallet.address];
  wallet.balance += retract;

  notify('ok', `${wallet.name} đã rút lại ${retract.toFixed(2)} ETH về ví.`);
  addLog('Unpledge', `${wallet.name} rút cọc ${retract.toFixed(2)} ETH`,
    `Còn lại trong chiến dịch: ${(appState.contributions[wallet.address] || 0).toFixed(2)} ETH`, 'event-refund');
  render();
}

function handleClaim() {
  const state = getCampaignState();
  if (state !== 'Successful') {
    notify('error', `Hàm claim() chỉ chạy khi đã qua hạn 7 ngày VÀ đạt đủ 10 ETH. Hiện tại: ${stateLabel(state)}.`);
    return;
  }

  const wallet = SIM_WALLETS[appState.activePersonaId];
  if (wallet.id !== 'creator') {
    notify('error', `Hợp đồng hoàn tác với Unauthorized(). Chỉ địa chỉ creator (${SIM_WALLETS.creator.address.slice(0, 10)}…) được rút quỹ.`);
    return;
  }
  if (appState.claimed) {
    notify('error', 'Quỹ đã được giải ngân trước đó. Hợp đồng hoàn tác với AlreadyClaimed().');
    return;
  }

  const amount = appState.pledgedEth;
  appState.claimed = true;
  wallet.balance += amount;

  notify('ok', `Chủ dự án đã nhận ${amount.toFixed(2)} ETH. Quỹ trong hợp đồng nay bằng 0.`);
  addLog('Claim', `Chủ dự án rút ${amount.toFixed(2)} ETH`,
    `Chuyển về ví thụ hưởng ${wallet.address.slice(0, 10)}…`, 'event-claim');
  render();
}

function handleRefund() {
  const state = getCampaignState();
  if (state !== 'Failed') {
    notify('error', `Hoàn tiền chỉ mở khi chiến dịch THẤT BẠI (qua hạn mà không đủ mục tiêu). Hiện tại: ${stateLabel(state)}.`);
    return;
  }

  const wallet = SIM_WALLETS[appState.activePersonaId];
  const contrib = appState.contributions[wallet.address] || 0;
  if (contrib <= 0) {
    notify('error', `Ví ${wallet.name} không có khoản góp nào để hoàn. Hợp đồng hoàn tác với NothingToRefund().`);
    return;
  }

  // CEI, và giống hệt hợp đồng: refund() xoá số dư cá nhân RỒI trừ `pledged`.
  // Thiếu vế thứ hai thì bất biến `pledged == Σ pledgedAmount` vỡ ngay.
  appState.contributions[wallet.address] = 0;
  delete appState.contributions[wallet.address];
  appState.pledgedEth -= contrib;
  wallet.balance += contrib;

  notify('ok', `${wallet.name} đã nhận hoàn tiền ${contrib.toFixed(2)} ETH. Quỹ còn ${appState.pledgedEth.toFixed(2)} ETH.`);
  addLog('Refund', `${wallet.name} hoàn tiền ${contrib.toFixed(2)} ETH`,
    'Pull-over-Push: số dư về 0 trước khi chuyển ETH (mẫu CEI)', 'event-refund');
  render();
}

function stateLabel(state) {
  return {
    Active: 'ĐANG MỞ',
    Successful: 'THÀNH CÔNG (chờ rút)',
    Failed: 'THẤT BẠI',
    Claimed: 'ĐÃ GIẢI NGÂN'
  }[state] || state;
}

// ====================================================================
//                          KỊCH BẢN DẪN SẴN
// ====================================================================

function resetCampaign() {
  appState.pledgedEth = 0.0;
  appState.startAt = Math.floor(Date.now() / 1000);
  appState.simulatedTimeOffset = 0;
  appState.claimed = false;
  appState.contributions = {};
  appState.eventLogs = [];

  SIM_WALLETS.creator.balance = 1.50;
  SIM_WALLETS.alice.balance = 12.50;
  SIM_WALLETS.bob.balance = 8.00;
  SIM_WALLETS.charlie.balance = 15.00;

  const slider = document.getElementById('timeSlider');
  if (slider) slider.value = 0;

  selectPersona('alice');
  renderLogs();
  render();
}

function pledgeFor(wallet, amount) {
  wallet.balance -= amount;
  appState.pledgedEth += amount;
  appState.contributions[wallet.address] = (appState.contributions[wallet.address] || 0) + amount;
  addLog('Pledge', `${wallet.name} góp ${amount.toFixed(2)} ETH`,
    `Tiến độ ${appState.pledgedEth.toFixed(2)} / ${appState.goalEth.toFixed(2)} ETH`, 'event-pledge');
}

function runSuccessScenario() {
  resetCampaign();
  pledgeFor(SIM_WALLETS.alice, 4.0);
  pledgeFor(SIM_WALLETS.bob, 4.0);
  pledgeFor(SIM_WALLETS.charlie, 3.0);

  const slider = document.getElementById('timeSlider');
  if (slider) slider.value = 7.2;
  handleTimeSlider(7.2);
  addLog('Tua thời gian', 'Đồng hồ chuỗi vượt hạn chót ngày 7',
    'Đủ 11.00 ETH, thành công, chuyển sang chờ chủ dự án rút', 'event-time');

  selectPersona('creator');
  render();
  notify('info', 'Kịch bản đạt mục tiêu: quỹ 11.00 ETH, đã qua hạn. Đã tự động kết nối ví Chủ dự án để rút vốn.');
}

function runOversubscribedScenario() {
  resetCampaign();
  pledgeFor(SIM_WALLETS.alice, 4.0);
  pledgeFor(SIM_WALLETS.bob, 4.0);
  pledgeFor(SIM_WALLETS.charlie, 4.0);

  const slider = document.getElementById('timeSlider');
  if (slider) slider.value = 7.2;
  handleTimeSlider(7.2);
  addLog('Kịch bản', 'Vượt mục tiêu 120%',
    'Góp 12.00 ETH / 10.00 ETH mục tiêu. Hợp đồng bảo toàn trọn vẹn 12 ETH cho Chủ dự án rút.', 'event-claim');

  selectPersona('creator');
  render();
  notify('success', 'Mô phỏng Góp vượt mục tiêu (12.00 ETH / 10.00 ETH). Chủ dự án sẽ rút toàn bộ 12.00 ETH mà không thất thoát quỹ.');
}

function runFailScenario() {
  resetCampaign();
  pledgeFor(SIM_WALLETS.alice, 3.0);

  const slider = document.getElementById('timeSlider');
  if (slider) slider.value = 7.2;
  handleTimeSlider(7.2);
  addLog('Tua thời gian', 'Đồng hồ chuỗi vượt hạn chót ngày 7',
    'Chỉ đạt 3.00 / 10.00 ETH, thất bại, mở hoàn tiền', 'event-time');

  selectPersona('alice');
  render();
  notify('info', 'Kịch bản thất bại: chỉ đạt 3.00/10.00 ETH và đã qua hạn. Rút vốn bị khoá, hoàn tiền mở cho từng người góp.');
}

// ====================================================================
//                            VẼ GIAO DIỆN
// ====================================================================

function render() {
  const state = getCampaignState();
  const wallet = SIM_WALLETS[appState.activePersonaId];
  const days = daysPassed();
  const pastDeadline = days >= DEADLINE_DAYS;

  // ---- 1. Viên trạng thái & Huy hiệu vai trò ví
  const roleBadge = document.getElementById('roleBadge');
  if (roleBadge) {
    const isCreator = wallet.id === 'creator';
    roleBadge.className = `role-badge ${isCreator ? 'role-creator' : 'role-backer'}`;
    roleBadge.textContent = isCreator ? 'Creator' : 'Backer';
  }

  const pill = document.getElementById('campaignStatusPill');
  const pillText = document.getElementById('campaignStatusText');
  if (pill && pillText) {
    pill.className = 'state-pill ' + {
      Active: 'state-active',
      Successful: 'state-successful',
      Failed: 'state-failed',
      Claimed: 'state-claimed'
    }[state];
    pillText.textContent = stateLabel(state).replace(/\s*\(.*\)$/, '');
  }

  // ---- 2. Bất biến 1: vốn.  pledged >= goal
  const goalMet = appState.pledgedEth >= appState.goalEth;
  const isOversubscribed = appState.pledgedEth > appState.goalEth;
  setText('goalCurrent', `${appState.pledgedEth.toFixed(2)} ETH`);
  setText('goalTarget', `${appState.goalEth.toFixed(2)} ETH`);
  const goalLabel = !goalMet
    ? 'chưa thoả'
    : (isOversubscribed ? `đã thoả (+${(appState.pledgedEth - appState.goalEth).toFixed(2)} ETH)` : 'đã thoả');
  setInvariant('invGoal', 'condGoal', 'condGoalText', goalMet, goalLabel);

  const goalBadge = document.getElementById('condGoal');
  if (goalBadge) goalBadge.classList.toggle('is-oversubscribed', isOversubscribed);

  const goalFill = document.getElementById('boltGoalFill');
  if (goalFill) goalFill.classList.toggle('is-oversubscribed', isOversubscribed);
  setFill('boltGoalFill', Math.min(1, appState.pledgedEth / appState.goalEth));

  setExpr('exprGoal',
    `pledged >= goal`,
    `${appState.pledgedEth.toFixed(2)} >= ${appState.goalEth.toFixed(2)} ETH`,
    goalMet);

  // ---- 3. Bất biến 2: thời gian.  block.timestamp >= endAt
  setText('timeCurrent', `Ngày ${days.toFixed(1)}`);
  setText('timeTarget', `Ngày ${DEADLINE_DAYS.toFixed(1)}`);
  setInvariant('invTime', 'condTime', 'condTimeText', pastDeadline,
    pastDeadline ? 'đã thoả' : 'chưa thoả');
  setFill('boltTimeFill', Math.min(1, days / DISPLAY_WINDOW_DAYS));
  setExpr('exprTime',
    `block.timestamp >= endAt`,
    `Ngày ${days.toFixed(1)} >= Ngày ${DEADLINE_DAYS.toFixed(1)}`,
    pastDeadline);

  // ---- 4. Số liệu
  const backers = Object.keys(appState.contributions).filter(a => appState.contributions[a] > 0);
  setText('displayBackersCount', backers.length);
  setText('backersBadge', `${backers.length} người`);
  setText('contractEscrowBalance', `${(appState.claimed ? 0 : appState.pledgedEth).toFixed(2)} ETH`);

  const mine = appState.contributions[wallet.address] || 0;
  setText('myCurrentPledge', `${mine.toFixed(2)} ETH`);
  setText('activeWalletBalance', `${wallet.balance.toFixed(2)} ETH`);

  // ---- 5. Bất biến sống: pledged == Σ pledgedAmount
  const total = sumContributions();
  const matches = Math.abs(total - appState.pledgedEth) < 1e-9;
  setText('pledgedTotal', appState.pledgedEth.toFixed(2));
  setText('pledgeSum', total.toFixed(2));
  setInvariant('invLive', 'invLiveBadge', 'invLiveText', matches,
    matches ? 'khớp' : 'lệch');
  const liveNote = document.getElementById('invLive');
  if (liveNote) liveNote.classList.toggle('is-true', matches);

  // ---- 6. Trạng thái nút, suy thẳng từ hai bất biến ở trên
  setDisabled('btnPledge', state !== 'Active');
  setDisabled('btnUnpledge', state !== 'Active' || mine <= 0);
  setDisabled('btnClaim', !(state === 'Successful' && wallet.id === 'creator'));
  setDisabled('btnRefund', !(state === 'Failed' && mine > 0));

  // ---- 7. Gợi ý điều kiện: chỉ nêu cái CÒN THIẾU, không nhắc lại trạng thái
  const claimHint = document.getElementById('claimConditionHint');
  if (claimHint) {
    claimHint.className = 'condition-hint';
    if (appState.claimed) {
      claimHint.classList.add('hint-ready');
      claimHint.textContent = 'Đã giải ngân xong cho chủ dự án.';
    } else if (wallet.id !== 'creator') {
      claimHint.textContent = `Chỉ Chủ dự án mới có quyền rút vốn khi đủ điều kiện. Bạn đang kết nối: ${wallet.name} (Backer).`;
    } else if (state === 'Successful') {
      claimHint.classList.add('hint-ready');
      claimHint.textContent = `Đủ điều kiện. Rút được ${appState.pledgedEth.toFixed(2)} ETH.`;
    } else if (!pastDeadline) {
      // Nêu đích danh điều kiện đang chặn, và tình trạng của điều kiện còn lại —
      // hai nút kết toán chờ ở hai cửa khác nhau nên không được nói cùng một câu.
      const goalPart = goalMet
        ? `Điều kiện vốn đã thoả (${appState.pledgedEth.toFixed(2)}/${appState.goalEth.toFixed(2)} ETH).`
        : `Điều kiện vốn cũng chưa thoả (${appState.pledgedEth.toFixed(2)}/${appState.goalEth.toFixed(2)} ETH).`;
      claimHint.textContent =
        `Chặn bởi điều kiện thời gian — còn ${(DEADLINE_DAYS - days).toFixed(1)} ngày. ${goalPart}`;
    } else {
      claimHint.textContent = `Qua hạn rồi nhưng chỉ đạt ${appState.pledgedEth.toFixed(2)}/${appState.goalEth.toFixed(2)} ETH — claim() hoàn tác.`;
    }
  }

  const refundHint = document.getElementById('refundConditionHint');
  if (refundHint) {
    refundHint.className = 'condition-hint';
    if (state === 'Failed') {
      if (mine > 0) {
        refundHint.classList.add('hint-ready');
        refundHint.textContent = `Đủ điều kiện. Ví này nhận lại ${mine.toFixed(2)} ETH.`;
      } else {
        refundHint.textContent = `Ví ${wallet.name} không có khoản góp nào trong chiến dịch.`;
      }
    } else if (!pastDeadline) {
      // Cùng bị điều kiện thời gian chặn, nhưng nói rõ hoàn tiền còn cần
      // chiến dịch THẤT BẠI — thiếu mục tiêu — chứ không chỉ hết hạn.
      refundHint.textContent =
        `Chặn bởi điều kiện thời gian — còn ${(DEADLINE_DAYS - days).toFixed(1)} ngày. Hoàn tiền chỉ mở khi hết hạn mà không đủ mục tiêu.`;
    } else {
      refundHint.textContent = `Chiến dịch đã đạt mục tiêu — không mở hoàn tiền.`;
    }
  }

  // ---- 8. Gợi ý điều kiện cho Hủy góp (Unpledge)
  const unpledgeHint = document.getElementById('unpledgeConditionHint');
  if (unpledgeHint) {
    unpledgeHint.className = 'condition-hint';
    if (mine > 0 && !pastDeadline) {
      unpledgeHint.classList.add('hint-ready');
      unpledgeHint.textContent = `Khả dụng: Bạn có thể hủy góp và nhận lại ${mine.toFixed(2)} ETH trước deadline.`;
    } else if (pastDeadline) {
      unpledgeHint.textContent = 'Đã hết hạn: Không thể hủy góp (dùng Hoàn tiền nếu dự án thất bại).';
    } else {
      unpledgeHint.textContent = 'Chỉ mở khi bạn đã đóng góp (> 0 ETH) và chiến dịch còn hạn.';
    }
  }

  // ---- 9. Highlight nút mốc thời gian đang trùng khớp
  const jumps = [
    { id: 'timeJump0', day: 0 },
    { id: 'timeJump3', day: 3.5 },
    { id: 'timeJump6', day: 6.9 },
    { id: 'timeJump7', day: 7.1 }
  ];
  jumps.forEach(j => {
    const el = document.getElementById(j.id);
    if (el) el.classList.toggle('active', Math.abs(days - j.day) < 0.1);
  });

  // ---- 10. Bảng sổ cái
  renderBackersTable(backers);
}

function setText(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
}

function setDisabled(id, disabled) {
  const el = document.getElementById(id);
  if (el) el.disabled = disabled;
}

function setFill(id, ratio) {
  const el = document.getElementById(id);
  if (!el) return;
  // Thanh đo chạy bằng transform, không đụng tới width.
  el.style.setProperty('--p', String(Math.max(0, Math.min(1, ratio))));
}

/** Sao chép nội dung vào Clipboard kèm fallback và thông báo Toast */
function copyToClipboard(text, label) {
  if (!text) return;
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(() => {
      notify('ok', `Đã sao chép ${label || 'địa chỉ'}: ${text.slice(0, 6)}…${text.slice(-4)} vào clipboard.`);
    }).catch(() => {
      fallbackCopy(text, label);
    });
  } else {
    fallbackCopy(text, label);
  }
}

function fallbackCopy(text, label) {
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.style.position = 'fixed';
  ta.style.opacity = '0';
  document.body.appendChild(ta);
  ta.select();
  try {
    document.execCommand('copy');
    notify('ok', `Đã sao chép ${label || 'địa chỉ'}: ${text.slice(0, 6)}…${text.slice(-4)}`);
  } catch (err) {
    notify('warn', `Không thể tự động sao chép: ${text}`);
  }
  document.body.removeChild(ta);
}

function copyActiveWallet() {
  const wallet = SIM_WALLETS[appState.activePersonaId] || SIM_WALLETS.alice;
  copyToClipboard(wallet.address, `ví ${wallet.name}`);
}

/**
 * Bật/tắt một bất biến và huy hiệu của nó.
 * Huy hiệu luôn mang cả biểu tượng lẫn nhãn chữ — màu không bao giờ
 * là kênh duy nhất truyền đạt trạng thái.
 */
function setInvariant(rootId, badgeId, textId, isTrue, text) {
  const root = document.getElementById(rootId);
  const badge = document.getElementById(badgeId);
  const label = document.getElementById(textId);

  if (root) root.classList.toggle('is-true', isTrue);
  // Chỉ đổi lớp và chữ — không bao giờ ghi đè innerHTML của huy hiệu, vì
  // làm vậy sẽ xoá mất chính ô nhãn mà hàm này cần cập nhật ở lần gọi sau.
  if (badge) badge.classList.toggle('is-met', isTrue);
  if (label) label.textContent = text;
}

/** In câu điều kiện của hợp đồng kèm giá trị đang xét. */
function setExpr(id, expr, evaluated, isTrue) {
  const el = document.getElementById(id);
  if (!el) return;
  el.innerHTML = `${isTrue ? '✓' : '·'} <b>${expr}</b> → ${evaluated}`;
}

function renderBackersTable(backers) {
  const tbody = document.getElementById('backersTableBody');
  if (!tbody) return;

  if (backers.length === 0) {
    tbody.innerHTML = `
      <tr class="empty-placeholder">
        <td colspan="3">
          <div class="empty-state-box">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" class="empty-icon" aria-hidden="true">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
            </svg>
            <div class="empty-title">Sổ cái on-chain chưa có bản ghi</div>
            <div class="empty-desc">Chọn số ETH và bấm "Đóng góp ETH" ở bảng bên trái để ghi nhận giao dịch đầu tiên vào Smart Contract.</div>
          </div>
        </td>
      </tr>`;
    return;
  }

  const total = appState.pledgedEth || 1;
  tbody.innerHTML = backers.map(addr => {
    const amt = appState.contributions[addr];
    const share = ((amt / total) * 100).toFixed(1);
    const who = Object.values(SIM_WALLETS).find(w => w.address === addr);
    const name = who ? who.name : null;
    const short = `${addr.slice(0, 6)}…${addr.slice(-4)}`;
    return `
      <tr>
        <td class="addr-cell">
          ${name ? `<span class="who-cell">${name}</span><br>` : ''}
          <button type="button" class="btn-inline-copy" onclick="copyToClipboard('${addr}', '${name || short}')" title="Sao chép địa chỉ ví ${addr}">
            <code>${short}</code>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="inline-copy-icon" aria-hidden="true">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
            </svg>
          </button>
        </td>
        <td class="amt-cell">${amt.toFixed(2)} ETH</td>
        <td><span class="share-pill">${share}%</span></td>
      </tr>`;
  }).join('');
}

// ====================================================================
//                            NHẬT KÝ
// ====================================================================

function addLog(event, title, detail, typeClass = 'event-pledge') {
  appState.eventLogs.unshift({ event, title, detail, typeClass });
  if (appState.eventLogs.length > 20) appState.eventLogs.pop();
  renderLogs();
}

function renderLogs() {
  const container = document.getElementById('eventLogContainer');
  if (!container) return;

  container.innerHTML = appState.eventLogs.map(log => `
    <div class="feed-item ${log.typeClass}">
      <div class="feed-top">
        <span class="feed-name">${log.event}</span>
      </div>
      <div class="feed-desc">${log.title}</div>
      <div class="feed-desc">${log.detail}</div>
    </div>
  `).join('');
}

function clearEventLogs() {
  appState.eventLogs = [];
  renderLogs();
}

// ====================================================================
//     KẾT NỐI METAMASK — CHẾ ĐỘ ON-CHAIN THẬT (ETHERS V6)
// ====================================================================

const CROWDFUNDING_ABI = [
  "function pledge() external payable",
  "function unpledge(uint256 _amount) external",
  "function claim() external",
  "function refund() external",
  "function sweepExcessEther() external returns (uint256)",
  "function creator() external view returns (address)",
  "function goal() external view returns (uint256)",
  "function pledged() external view returns (uint256)",
  "function startAt() external view returns (uint64)",
  "function endAt() external view returns (uint64)",
  "function claimed() external view returns (bool)",
  "function contributorCount() external view returns (uint256)",
  "function pledgedAmount(address) external view returns (uint256)",
  "function state() external view returns (uint8)",
  "function timeLeft() external view returns (uint256)",
  "event Pledge(address indexed backer, uint256 amount, uint256 totalPledged)",
  "event Unpledge(address indexed backer, uint256 amount, uint256 totalPledged)",
  "event Claim(address indexed creator, uint256 totalAmount)",
  "event Refund(address indexed backer, uint256 amount)"
];

const WEB3 = {
  provider: null,
  signer: null,
  contract: null,
  address: null,
  chainId: null,
  connected: false,
  balance: 0n,
  _listenersAttached: false
};

const WEB3_CHAIN_NAMES = {
  1: 'Ethereum Mainnet',
  11155111: 'Sepolia Testnet',
  31337: 'Hardhat / Anvil local',
  1337: 'Ganache local'
};

/**
 * Trợ giúp chọn số ETH nhanh cho Web3
 */
function setWeb3Pledge(val) {
  const inp = document.getElementById('web3PledgeAmount');
  if (inp) {
    inp.value = val;
  }
  document.querySelectorAll('.web3-pledge-box .preset-chips .btn-chip[data-w3val]').forEach(btn => {
    btn.classList.toggle('active', btn.getAttribute('data-w3val') === String(val));
  });
}

async function setWeb3PledgeMax() {
  if (!WEB3.connected || !WEB3.provider || !WEB3.address) {
    notify('error', 'Vui lòng kết nối ví MetaMask trước.');
    return;
  }
  try {
    const bal = await WEB3.provider.getBalance(WEB3.address);
    WEB3.balance = bal;
    // Trừ 0.005 ETH để dự phòng phí gas mạng
    const reserve = ethers.parseEther('0.005');
    const usable = bal > reserve ? bal - reserve : 0n;
    const ethNum = parseFloat(ethers.formatEther(usable));
    const ethStr = ethNum > 0 ? ethNum.toFixed(4) : '0';
    const inp = document.getElementById('web3PledgeAmount');
    if (inp) inp.value = ethStr;
    document.querySelectorAll('.web3-pledge-box .preset-chips .btn-chip[data-w3val]').forEach(btn => {
      btn.classList.toggle('active', btn.getAttribute('data-w3val') === 'max');
    });
    notify('info', `Đã điền số dư khả dụng (trừ 0.005 ETH gas): ${ethStr} ETH`);
  } catch (err) {
    notify('error', `Không đọc được số dư ví: ${web3DecodeError(err)}`);
  }
}

/**
 * Lấy link Sepolia Etherscan hoặc Explorer tương ứng
 */
function getExplorerTxUrl(txHash, chainId) {
  const cid = Number(chainId);
  if (cid === 11155111) return `https://sepolia.etherscan.io/tx/${txHash}`;
  if (cid === 1) return `https://etherscan.io/tx/${txHash}`;
  if (cid === 17000) return `https://holesky.etherscan.io/tx/${txHash}`;
  return null;
}

function formatTxLink(txHash, chainId) {
  const url = getExplorerTxUrl(txHash, chainId);
  const shortHash = `${txHash.slice(0, 10)}…${txHash.slice(-8)}`;
  if (url) {
    return `<a href="${url}" target="_blank" rel="noopener noreferrer" class="etherscan-link" title="Mở trên Sepolia Etherscan Explorer">
      <span>${shortHash}</span>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="etherscan-icon" aria-hidden="true">
        <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14L21 3"/>
      </svg>
    </a>`;
  }
  return `<code class="tx-hash-code">${shortHash}</code>`;
}

/**
 * Bảng chọn hàm lỗi (4 byte) — thông báo tiếng Việt.
 * Dựng lười để trang không vỡ nếu CDN ethers.js bị chặn.
 */
let _errorMap = null;
function getCustomErrorMap() {
  if (!_errorMap && typeof ethers !== 'undefined') {
    const table = {
      'Unauthorized()': 'Không có quyền thực hiện thao tác này.',
      'CampaignActive()': 'Chiến dịch chưa hết hạn nên chưa thể kết toán.',
      'CampaignEnded()': 'Chiến dịch đã hết hạn, cổng góp vốn đã đóng.',
      'GoalNotReached()': 'Chưa đạt mục tiêu nên chủ dự án không được rút vốn.',
      'GoalAlreadyReached()': 'Chiến dịch đã đạt mục tiêu nên không mở hoàn tiền.',
      'GoalCannotBeZero()': 'Mục tiêu vốn phải lớn hơn 0.',
      'InvalidDuration()': 'Thời hạn không hợp lệ (bằng 0 hoặc vượt 365 ngày).',
      'ZeroPledge()': 'Số ETH đóng góp phải lớn hơn 0.',
      'AlreadyClaimed()': 'Quỹ đã được rút trước đó.',
      'NothingToRefund()': 'Không có khoản góp nào để hoàn.',
      'TransferFailed()': 'Chuyển ETH thất bại, giao dịch đã hoàn tác an toàn.',
      'ReentrancyGuardTriggered()': 'Phát hiện lời gọi tái nhập, đã bị khoá chặn.'
    };
    _errorMap = {};
    for (const [sig, msg] of Object.entries(table)) {
      _errorMap[ethers.id(sig).slice(0, 10).toLowerCase()] = msg;
    }
  }
  return _errorMap || {};
}

function web3DecodeError(err) {
  if (err?.code === 4001 || err?.code === 'ACTION_REJECTED' || err?.info?.error?.code === 4001) {
    return 'Bạn đã hủy yêu cầu ký giao dịch trên MetaMask.';
  }
  const raw = err?.data ?? err?.error?.data ?? err?.info?.error?.data ?? '';
  if (typeof raw === 'string' && raw.startsWith('0x') && raw.length >= 10) {
    const vi = getCustomErrorMap()[raw.slice(0, 10).toLowerCase()];
    if (vi) return vi;
  }
  return err?.reason || err?.shortMessage || err?.message || 'Lỗi không xác định.';
}

function web3Log(html) {
  const box = document.getElementById('web3Log');
  if (box) box.innerHTML = `<div class="feed-desc">${html}</div>`;
}

function web3StateLabel(id) {
  return ['Active', 'Successful', 'Failed', 'Claimed'][id] ?? `Unknown(${id})`;
}

function web3SetButtonsDisabled(disabled) {
  ['btnW3Pledge', 'btnW3Unpledge', 'btnW3Claim', 'btnW3Refund', 'btnW3Refresh']
    .forEach(id => { const b = document.getElementById(id); if (b) b.disabled = disabled; });
}

function setTxLoading(btnId, isLoading, loadingText) {
  const btn = document.getElementById(btnId);
  if (!btn) return;
  if (isLoading) {
    btn.classList.add('is-loading');
    btn.dataset.origHtml = btn.innerHTML;
    btn.innerHTML = `<span>${loadingText || 'Đang xử lý…'}</span>`;
    web3SetButtonsDisabled(true);
  } else {
    btn.classList.remove('is-loading');
    if (btn.dataset.origHtml) {
      btn.innerHTML = btn.dataset.origHtml;
    }
    web3SetButtonsDisabled(false);
  }
}

async function connectMetaMask() {
  if (typeof ethers === 'undefined') {
    notify('error', 'Ethers.js chưa tải được. Kiểm tra kết nối CDN trong index.html.');
    return;
  }
  if (!window.ethereum) {
    notify('error', 'Không phát hiện MetaMask. Cài extension MetaMask rồi thử lại.');
    return;
  }

  const address = (document.getElementById('web3ContractAddress')?.value || '').trim();
  if (!/^0x[0-9a-fA-F]{40}$/.test(address)) {
    notify('error', 'Địa chỉ hợp đồng không hợp lệ. Cần dạng 0x kèm đúng 40 ký tự hex.');
    return;
  }

  try {
    WEB3.provider = new ethers.BrowserProvider(window.ethereum);
    await WEB3.provider.send('eth_requestAccounts', []);
    WEB3.signer = await WEB3.provider.getSigner();
    WEB3.address = await WEB3.signer.getAddress();
    const net = await WEB3.provider.getNetwork();
    WEB3.chainId = Number(net.chainId);
    WEB3.contract = new ethers.Contract(address, CROWDFUNDING_ABI, WEB3.signer);

    // Xác nhận địa chỉ đích đúng là hợp đồng Crowdfunding, không phải ví thường.
    await WEB3.contract.goal();

    // Gợi ý chuyển Sepolia nếu đang ở mạng khác ngoài Sepolia hoặc Localhost
    if (WEB3.chainId !== 11155111 && WEB3.chainId !== 31337 && WEB3.chainId !== 1337) {
      notify('info', 'Khuyên dùng mạng Sepolia Testnet (Chain ID 11155111).');
      try {
        await window.ethereum.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: '0xaa36a7' }]
        });
        const updatedNet = await WEB3.provider.getNetwork();
        WEB3.chainId = Number(updatedNet.chainId);
      } catch (switchErr) {
        console.warn('Switch chain optional or rejected:', switchErr);
      }
    }

    // Đăng ký lắng nghe sự kiện đổi ví / đổi chain một lần duy nhất
    if (window.ethereum.on && !WEB3._listenersAttached) {
      WEB3._listenersAttached = true;
      window.ethereum.on('accountsChanged', async (accounts) => {
        if (!accounts || accounts.length === 0) {
          WEB3.connected = false;
          web3SetButtonsDisabled(true);
          notify('info', 'Ví MetaMask đã ngắt kết nối.');
          web3Log('Ví MetaMask đã ngắt kết nối.');
        } else {
          WEB3.address = accounts[0];
          notify('info', `Đã chuyển sang ví: ${WEB3.address.slice(0, 6)}…${WEB3.address.slice(-4)}`);
          await refreshOnChainState();
        }
      });
      window.ethereum.on('chainChanged', () => {
        window.location.reload();
      });
    }

    WEB3.connected = true;
    const badge = document.getElementById('web3NetworkBadge');
    if (badge) {
      badge.textContent = WEB3_CHAIN_NAMES[WEB3.chainId] ?? `Chain ${WEB3.chainId}`;
      badge.style.color = 'var(--good)';
      badge.style.borderColor = 'color-mix(in srgb, var(--good) 45%, transparent)';
    }
    web3SetButtonsDisabled(false);

    notify('ok', `Đã kết nối ${WEB3.address.slice(0, 6)}…${WEB3.address.slice(-4)} tới hợp đồng ${address.slice(0, 6)}…${address.slice(-4)}.`);
    web3Log(`Đã kết nối ví <b>${WEB3.address.slice(0, 6)}…${WEB3.address.slice(-4)}</b> tới hợp đồng <b>${address.slice(0, 6)}…${address.slice(-4)}</b> trên mạng <b>${WEB3_CHAIN_NAMES[WEB3.chainId] || 'Chain ' + WEB3.chainId}</b>`);
    await refreshOnChainState();
  } catch (err) {
    notify('error', `Kết nối thất bại: ${web3DecodeError(err)}`);
  }
}

function web3RequireConnected() {
  if (!WEB3.connected) {
    notify('error', 'Dán địa chỉ hợp đồng rồi bấm Kết nối MetaMask trước đã.');
    return false;
  }
  return true;
}

async function refreshOnChainState() {
  if (!WEB3.connected) return;
  const refreshBtn = document.getElementById('btnW3Refresh');
  if (refreshBtn) refreshBtn.classList.add('is-loading');
  try {
    const c = WEB3.contract;
    const [pledged, goal, stateId, timeLeft, myPledge, count, creator, balance] = await Promise.all([
      c.pledged(), c.goal(), c.state(), c.timeLeft(),
      c.pledgedAmount(WEB3.address), c.contributorCount(), c.creator(),
      WEB3.provider.getBalance(WEB3.address)
    ]);
    WEB3.balance = balance;

    setText('w3State', web3StateLabel(Number(stateId)));
    setText('w3Pledged', `${ethers.formatEther(pledged)} / ${ethers.formatEther(goal)} ETH`);
    const secs = Number(timeLeft);
    setText('w3TimeLeft', secs === 0 ? 'Đã hết hạn' : `${(secs / 86400).toFixed(1)} ngày`);
    setText('w3MyPledge', `${ethers.formatEther(myPledge)} ETH`);

    const balEl = document.getElementById('w3WalletBalance');
    if (balEl) balEl.textContent = `Số dư ví: ${parseFloat(ethers.formatEther(balance)).toFixed(4)} ETH`;

    // Phân quyền nút theo trạng thái on-chain và vai trò của ví đang nối.
    const isCreator = creator.toLowerCase() === WEB3.address.toLowerCase();
    const st = Number(stateId);
    setDisabled('btnW3Pledge', st !== 0);
    setDisabled('btnW3Unpledge', !(st === 0 && myPledge > 0n));
    setDisabled('btnW3Claim', !(st === 1 && isCreator));
    setDisabled('btnW3Refund', !(st === 2 && myPledge > 0n));

    // Cập nhật hint phân quyền
    const hintEl = document.getElementById('web3ActionHint');
    if (hintEl) {
      if (st === 0) {
        hintEl.textContent = `Chiến dịch đang mở. Ví của bạn đã góp ${ethers.formatEther(myPledge)} ETH.${myPledge > 0n ? ' Bạn có thể đóng góp thêm hoặc Hủy góp (Unpledge).' : ' Bạn có thể nhập số ETH và bấm Đóng góp.'}`;
      } else if (st === 1) {
        hintEl.textContent = isCreator ? 'Mục tiêu đã đạt. Bạn là chủ dự án: Bấm "Rút vốn" để giải ngân quỹ về ví.' : 'Chiến dịch thành công. Toàn bộ quỹ thuộc quyền giải ngân của chủ dự án.';
      } else if (st === 2) {
        hintEl.textContent = myPledge > 0n ? 'Chiến dịch hết hạn không đạt mục tiêu: Bấm "Hoàn tiền" để rút lại 100% ETH theo chuẩn Pull-over-Push.' : 'Chiến dịch không đạt mục tiêu. Ví này không có khoản đóng góp nào để hoàn lại.';
      } else if (st === 3) {
        hintEl.textContent = 'Quỹ đã được chủ dự án rút thành công (Claimed).';
      }
    }

    web3Log(`On-chain: <b>${web3StateLabel(st)}</b> · ${ethers.formatEther(pledged)}/${ethers.formatEther(goal)} ETH · ${count} người góp · Bạn đã góp <b>${ethers.formatEther(myPledge)} ETH</b>`);
  } catch (err) {
    web3Log(`Không đọc được trạng thái on-chain: ${web3DecodeError(err)}`);
  } finally {
    if (refreshBtn) refreshBtn.classList.remove('is-loading');
  }
}

async function web3Pledge() {
  if (!web3RequireConnected()) return;
  const valStr = document.getElementById('web3PledgeAmount')?.value || '0';
  const amount = parseFloat(valStr);
  if (isNaN(amount) || amount <= 0) {
    notify('error', 'Nhập số ETH hợp lệ vào ô "Số ETH muốn đóng góp on-chain".');
    return;
  }
  const wei = ethers.parseEther(String(amount));
  if (WEB3.balance > 0n && wei > WEB3.balance) {
    notify('error', `Số dư ví không đủ (${ethers.formatEther(WEB3.balance)} ETH < ${amount} ETH).`);
    return;
  }

  setTxLoading('btnW3Pledge', true, 'Đang chờ ký…');
  try {
    web3Log('Đang chờ MetaMask ký giao dịch pledge…');
    const tx = await WEB3.contract.pledge({ value: wei });
    const txLink = formatTxLink(tx.hash, WEB3.chainId);
    web3Log(`Đã phát giao dịch: ${txLink}. Đang chờ xác nhận khối…`);
    const btn = document.getElementById('btnW3Pledge');
    if (btn) btn.innerHTML = '<span>Đang đào khối…</span>';

    const receipt = await tx.wait();
    notify('ok', `Đã góp ${amount} ETH on-chain tại block #${receipt.blockNumber}.`);
    web3Log(`✅ Pledge ${amount} ETH thành công tại block <b>#${receipt.blockNumber}</b>. Minh chứng: ${txLink}`);
  } catch (err) {
    const msg = web3DecodeError(err);
    notify('error', `Pledge thất bại: ${msg}`);
    web3Log(`❌ Pledge thất bại: ${msg}`);
  } finally {
    setTxLoading('btnW3Pledge', false);
    await refreshOnChainState();
  }
}

async function web3Unpledge() {
  if (!web3RequireConnected()) return;
  setTxLoading('btnW3Unpledge', true, 'Đang chờ ký…');
  try {
    const mine = await WEB3.contract.pledgedAmount(WEB3.address);
    if (mine === 0n) {
      notify('error', 'Bạn chưa đóng góp khoản nào để hủy góp.');
      return;
    }
    web3Log('Đang chờ MetaMask ký giao dịch unpledge (hủy toàn bộ cọc)…');
    const tx = await WEB3.contract.unpledge(mine);
    const txLink = formatTxLink(tx.hash, WEB3.chainId);
    web3Log(`Đã phát giao dịch: ${txLink}. Đang chờ xác nhận khối…`);
    const btn = document.getElementById('btnW3Unpledge');
    if (btn) btn.innerHTML = '<span>Đang đào khối…</span>';

    const receipt = await tx.wait();
    notify('ok', `Đã hủy góp ${ethers.formatEther(mine)} ETH về ví tại block #${receipt.blockNumber}.`);
    web3Log(`✅ Hủy góp ${ethers.formatEther(mine)} ETH thành công tại block <b>#${receipt.blockNumber}</b>. Minh chứng: ${txLink}`);
  } catch (err) {
    const msg = web3DecodeError(err);
    notify('error', `Hủy góp thất bại: ${msg}`);
    web3Log(`❌ Hủy góp thất bại: ${msg}`);
  } finally {
    setTxLoading('btnW3Unpledge', false);
    await refreshOnChainState();
  }
}

async function web3Claim() {
  if (!web3RequireConnected()) return;
  setTxLoading('btnW3Claim', true, 'Đang chờ ký…');
  try {
    web3Log('Đang chờ MetaMask ký giao dịch claim (rút vốn chủ dự án)…');
    const tx = await WEB3.contract.claim();
    const txLink = formatTxLink(tx.hash, WEB3.chainId);
    web3Log(`Đã phát giao dịch: ${txLink}. Đang chờ xác nhận khối…`);
    const btn = document.getElementById('btnW3Claim');
    if (btn) btn.innerHTML = '<span>Đang đào khối…</span>';

    const receipt = await tx.wait();
    notify('ok', `Đã giải ngân toàn bộ quỹ về ví tại block #${receipt.blockNumber}.`);
    web3Log(`✅ Giải ngân thành công tại block <b>#${receipt.blockNumber}</b>. Minh chứng: ${txLink}`);
  } catch (err) {
    const msg = web3DecodeError(err);
    notify('error', `Rút vốn thất bại: ${msg}`);
    web3Log(`❌ Rút vốn thất bại: ${msg}`);
  } finally {
    setTxLoading('btnW3Claim', false);
    await refreshOnChainState();
  }
}

async function web3Refund() {
  if (!web3RequireConnected()) return;
  setTxLoading('btnW3Refund', true, 'Đang chờ ký…');
  try {
    web3Log('Đang chờ MetaMask ký giao dịch refund (Pull-over-Push)…');
    const tx = await WEB3.contract.refund();
    const txLink = formatTxLink(tx.hash, WEB3.chainId);
    web3Log(`Đã phát giao dịch: ${txLink}. Đang chờ xác nhận khối…`);
    const btn = document.getElementById('btnW3Refund');
    if (btn) btn.innerHTML = '<span>Đang đào khối…</span>';

    const receipt = await tx.wait();
    notify('ok', `Đã hoàn tiền về ví tại block #${receipt.blockNumber}.`);
    web3Log(`✅ Hoàn tiền thành công tại block <b>#${receipt.blockNumber}</b>. Minh chứng: ${txLink}`);
  } catch (err) {
    const msg = web3DecodeError(err);
    notify('error', `Hoàn tiền thất bại: ${msg}`);
    web3Log(`❌ Hoàn tiền thất bại: ${msg}`);
  } finally {
    setTxLoading('btnW3Refund', false);
    await refreshOnChainState();
  }
}

// Gán toàn cục cho HTML handlers
window.setWeb3Pledge = setWeb3Pledge;
window.setWeb3PledgeMax = setWeb3PledgeMax;
window.connectMetaMask = connectMetaMask;
window.refreshOnChainState = refreshOnChainState;
window.web3Pledge = web3Pledge;
window.web3Unpledge = web3Unpledge;
window.web3Claim = web3Claim;
window.web3Refund = web3Refund;
window.copyToClipboard = copyToClipboard;
window.copyActiveWallet = copyActiveWallet;
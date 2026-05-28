import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyCsarv8R9l6S2QDc-a0gIWC2qvaFoNNvD4",
  authDomain: "kongjuuniversity.firebaseapp.com",
  databaseURL: "https://kongjuuniversity-default-rtdb.firebaseio.com",
  projectId: "kongjuuniversity",
  storageBucket: "kongjuuniversity.firebasestorage.app",
  messagingSenderId: "849101630489",
  appId: "1:849101630489:web:e2a604b9474a8aeab7ce88",
  measurementId: "G-SZX9JN7B4Y"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// State
let isAdmin = false;
let settings = {
  monthlyDues: 10000,
  annualDiscount: 20000,
  expenseCategories: ["결혼", "부고", "개업", "출산", "기타"],
  logoData: null,
  logoWidth: 150,
  avatarSize: 40
};

// Pending image uploads (temporary state during modal interaction)
let pendingAddPhoto = null;
let pendingEditPhoto = null;

// Data
let members = [
  { id: '1', name: '홍길동', level: 'Admin', phone: '010-1234-5678', joinDate: '2025-01-01', photo: null },
  { id: '2', name: '김철수', level: 'Member', phone: '010-9876-5432', joinDate: '2025-02-15', photo: null },
  { id: '3', name: '이영희', level: 'VIP', phone: '010-5555-4444', joinDate: '2024-11-20', photo: null },
];

let transactions = [
  { id: '1', kind: 'income', type: '연납', desc: '홍길동', amount: 100000, date: '2026-05-28', badge: 'admin' },
  { id: '2', kind: 'income', type: '월납', desc: '김철수', amount: 10000, date: '2026-05-27', badge: 'member' },
  { id: '3', kind: 'expense', type: '결혼', desc: '이영희 장녀 결혼 축의금', amount: -50000, date: '2026-05-25', badge: 'vip' }
];

document.addEventListener('DOMContentLoaded', () => {
  // Load local mock persistence
  const savedSettings = localStorage.getItem('erp_settings');
  if (savedSettings) settings = { ...settings, ...JSON.parse(savedSettings) };
  
  const savedMembers = localStorage.getItem('erp_members');
  if (savedMembers) members = JSON.parse(savedMembers);

  const savedTx = localStorage.getItem('erp_transactions');
  if (savedTx) transactions = JSON.parse(savedTx);

  lucide.createIcons();
  
  document.getElementById('tx-date').valueAsDate = new Date();
  document.getElementById('member-joindate').valueAsDate = new Date();

  // Navigation Logic
  const links = document.querySelectorAll('.nav-links-container .nav-link');
  const views = document.querySelectorAll('.view');
  links.forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const targetId = link.getAttribute('data-target');
      links.forEach(l => l.classList.remove('active'));
      link.classList.add('active');
      views.forEach(v => v.classList.remove('active-view'));
      document.getElementById(targetId).classList.add('active-view');
    });
  });

  // Auth Toggle
  const authBtn = document.getElementById('auth-btn');
  authBtn.addEventListener('click', (e) => {
    e.preventDefault();
    if (isAdmin) {
      isAdmin = false;
      document.body.classList.remove('admin-mode');
      document.getElementById('mode-badge').innerText = '일반 모드 (조회 전용)';
      document.getElementById('auth-btn-text').innerText = '관리자 로그인';
      if (document.getElementById('settings').classList.contains('active-view')) {
        document.querySelector('[data-target="dashboard"]').click();
      }
      alert('일반 모드로 전환되었습니다.');
    } else {
      const password = prompt("관리자 비밀번호를 입력하세요: (힌트: 1234)");
      if (password === "1234") {
        isAdmin = true;
        document.body.classList.add('admin-mode');
        document.getElementById('mode-badge').innerText = '관리자 모드';
        document.getElementById('auth-btn-text').innerText = '로그아웃';
        alert('관리자로 로그인되었습니다.');
      } else if (password !== null) {
        alert('비밀번호가 틀렸습니다.');
      }
    }
  });

  // Transaction Form Toggle (Income vs Expense)
  const txRadios = document.querySelectorAll('input[name="tx-kind"]');
  txRadios.forEach(radio => {
    radio.addEventListener('change', (e) => {
      if (e.target.value === 'income') {
        document.getElementById('income-fields').style.display = 'block';
        document.getElementById('expense-fields').style.display = 'none';
        document.getElementById('tx-member').required = true;
        document.getElementById('tx-expense-desc').required = false;
        document.getElementById('tx-expense-amount').required = false;
      } else {
        document.getElementById('income-fields').style.display = 'none';
        document.getElementById('expense-fields').style.display = 'block';
        document.getElementById('tx-member').required = false;
        document.getElementById('tx-expense-desc').required = true;
        document.getElementById('tx-expense-amount').required = true;
      }
    });
  });

  // --- SETTINGS (Policy & Design) ---
  document.getElementById('setting-monthly-dues').value = settings.monthlyDues;
  document.getElementById('setting-annual-discount').value = settings.annualDiscount;
  document.getElementById('setting-expense-categories').value = settings.expenseCategories.join(', ');
  
  document.getElementById('setting-logo-width').value = settings.logoWidth;
  document.getElementById('setting-avatar-size').value = settings.avatarSize;
  document.getElementById('label-logo-width').innerText = settings.logoWidth + 'px';
  document.getElementById('label-avatar-size').innerText = settings.avatarSize + 'px';

  document.getElementById('settings-form').addEventListener('submit', (e) => {
    e.preventDefault();
    settings.monthlyDues = parseInt(document.getElementById('setting-monthly-dues').value);
    settings.annualDiscount = parseInt(document.getElementById('setting-annual-discount').value);
    const catStr = document.getElementById('setting-expense-categories').value;
    settings.expenseCategories = catStr.split(',').map(s => s.trim()).filter(s => s);
    saveAllToLocal();
    alert('정책 설정이 저장되었습니다.');
    updateFormOptions();
  });

  // Design Sliders Realtime
  document.getElementById('setting-logo-width').addEventListener('input', (e) => {
    document.getElementById('label-logo-width').innerText = e.target.value + 'px';
  });
  document.getElementById('setting-avatar-size').addEventListener('input', (e) => {
    document.getElementById('label-avatar-size').innerText = e.target.value + 'px';
  });

  document.getElementById('design-settings-form').addEventListener('submit', (e) => {
    e.preventDefault();
    settings.logoWidth = parseInt(document.getElementById('setting-logo-width').value);
    settings.avatarSize = parseInt(document.getElementById('setting-avatar-size').value);
    
    const fileInput = document.getElementById('setting-logo-file');
    if (fileInput.files && fileInput.files[0]) {
      resizeImageToDataUrl(fileInput.files[0], 300, (base64) => {
        settings.logoData = base64;
        saveAllToLocal();
        renderAll();
        alert('디자인 설정이 저장되었습니다.');
      });
    } else {
      saveAllToLocal();
      renderAll();
      alert('디자인 설정이 저장되었습니다.');
    }
  });

  document.getElementById('btn-remove-logo').addEventListener('click', () => {
    settings.logoData = null;
    document.getElementById('setting-logo-file').value = "";
    saveAllToLocal();
    renderAll();
    alert("로고 이미지가 삭제되었습니다.");
  });


  // --- MODALS & PHOTO PREVIEWS ---
  document.getElementById('btn-open-add-member').addEventListener('click', () => {
    pendingAddPhoto = null;
    document.getElementById('add-photo-preview').innerHTML = `<i data-lucide="user" style="color:var(--text-secondary); width:32px; height:32px;"></i>`;
    lucide.createIcons();
    document.getElementById('modal-add-member').style.display = 'flex';
  });
  
  document.querySelectorAll('.btn-close-modal').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const modalId = btn.getAttribute('data-modal');
      document.getElementById(modalId).style.display = 'none';
    });
  });

  // Photo uploads
  document.getElementById('member-photo').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
      resizeImageToDataUrl(file, 200, (base64) => {
        pendingAddPhoto = base64;
        document.getElementById('add-photo-preview').innerHTML = `<img src="${base64}" style="width:100%; height:100%; object-fit:cover;">`;
      });
    }
  });

  document.getElementById('edit-member-photo').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
      resizeImageToDataUrl(file, 200, (base64) => {
        pendingEditPhoto = base64;
        document.getElementById('edit-photo-preview').innerHTML = `<img src="${base64}" style="width:100%; height:100%; object-fit:cover;">`;
      });
    }
  });

  // ADD MEMBER Logic
  document.getElementById('form-add-member').addEventListener('submit', (e) => {
    e.preventDefault();
    const newMember = {
      id: Date.now().toString(),
      name: document.getElementById('member-name').value,
      level: document.getElementById('member-level').value,
      phone: document.getElementById('member-phone').value,
      joinDate: document.getElementById('member-joindate').value,
      photo: pendingAddPhoto
    };
    members.push(newMember);
    saveAllToLocal();
    renderAll();
    document.getElementById('modal-add-member').style.display = 'none';
    e.target.reset();
    alert(`[${newMember.name}] 회원이 추가되었습니다!`);
  });

  // EDIT MEMBER Logic
  document.getElementById('form-edit-member').addEventListener('submit', (e) => {
    e.preventDefault();
    const id = document.getElementById('edit-member-id').value;
    const memberIndex = members.findIndex(m => m.id === id);
    if(memberIndex > -1) {
      members[memberIndex].name = document.getElementById('edit-member-name').value;
      members[memberIndex].level = document.getElementById('edit-member-level').value;
      members[memberIndex].phone = document.getElementById('edit-member-phone').value;
      members[memberIndex].joinDate = document.getElementById('edit-member-joindate').value;
      if (pendingEditPhoto) {
        members[memberIndex].photo = pendingEditPhoto;
      }
      saveAllToLocal();
      renderAll();
      document.getElementById('modal-edit-member').style.display = 'none';
      alert('회원 정보가 수정되었습니다.');
    }
  });

  // ADD TRANSACTION Logic
  document.getElementById('add-transaction-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const kind = document.querySelector('input[name="tx-kind"]:checked').value;
    const date = document.getElementById('tx-date').value;
    
    let newTx = {
      id: Date.now().toString(),
      kind: kind,
      date: date
    };

    if (kind === 'income') {
      const name = document.getElementById('tx-member').value;
      const member = members.find(m => m.name === name);
      if(!member) {
        alert("등록된 회원이 아닙니다. 드롭다운에서 선택하거나 먼저 회원을 추가해주세요.");
        return;
      }
      
      const typeValue = document.getElementById('tx-income-type').value;
      const isAnnual = typeValue === 'annual';
      const amount = isAnnual ? (settings.monthlyDues * 12) - settings.annualDiscount : settings.monthlyDues;

      newTx.type = isAnnual ? '연납' : '월납';
      newTx.desc = name;
      newTx.amount = amount;
      newTx.badge = member.level.toLowerCase();
      alert(`[${name}]님의 회비 수입 처리가 완료되었습니다.`);

    } else {
      // Expense
      const desc = document.getElementById('tx-expense-desc').value;
      const category = document.getElementById('tx-expense-category').value;
      const amountStr = document.getElementById('tx-expense-amount').value;
      
      newTx.type = category;
      newTx.desc = desc;
      newTx.amount = -Math.abs(parseInt(amountStr)); // Ensure negative
      newTx.badge = 'member';
      alert(`경조사(지출) 내역이 정상적으로 등록되었습니다.`);
    }
    
    transactions.unshift(newTx);
    saveAllToLocal();
    renderAll();
    
    document.getElementById('tx-member').value = '';
    document.getElementById('tx-expense-desc').value = '';
    document.getElementById('tx-expense-amount').value = '';
  });

  // Excel
  document.getElementById('export-excel-btn').addEventListener('click', exportToExcel);
  document.getElementById('import-excel-btn').addEventListener('click', importFromExcel);

  renderAll();
});

// Edit/Delete globals
window.editMember = function(id) {
  const member = members.find(m => m.id === id);
  if(!member) return;
  document.getElementById('edit-member-id').value = member.id;
  document.getElementById('edit-member-name').value = member.name;
  document.getElementById('edit-member-level').value = member.level;
  document.getElementById('edit-member-phone').value = member.phone || '';
  document.getElementById('edit-member-joindate').value = member.joinDate;
  
  pendingEditPhoto = null; // Clear pending
  const preview = document.getElementById('edit-photo-preview');
  if (member.photo) {
    preview.innerHTML = `<img src="${member.photo}" style="width:100%; height:100%; object-fit:cover;">`;
  } else {
    preview.innerHTML = `<i data-lucide="user" style="color:var(--text-secondary); width:32px; height:32px;"></i>`;
    lucide.createIcons();
  }
  
  document.getElementById('modal-edit-member').style.display = 'flex';
};

window.deleteMember = function(id) {
  if(confirm("정말로 이 회원을 삭제하시겠습니까?")) {
    members = members.filter(m => m.id !== id);
    saveAllToLocal(); renderAll();
  }
};
window.deleteTx = function(id) {
  if(confirm("이 재무 내역을 삭제하시겠습니까?")) {
    transactions = transactions.filter(t => t.id !== id);
    saveAllToLocal(); renderAll();
  }
};

function saveAllToLocal() {
  localStorage.setItem('erp_settings', JSON.stringify(settings));
  localStorage.setItem('erp_members', JSON.stringify(members));
  localStorage.setItem('erp_transactions', JSON.stringify(transactions));
}

// Image Compression Helper
function resizeImageToDataUrl(file, maxWidth, callback) {
  if (!file) { callback(null); return; }
  const reader = new FileReader();
  reader.onload = (e) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let w = img.width;
      let h = img.height;
      if (w > maxWidth || h > maxWidth) {
        if (w > h) {
          h = Math.floor(h * (maxWidth / w));
          w = maxWidth;
        } else {
          w = Math.floor(w * (maxWidth / h));
          h = maxWidth;
        }
      }
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, w, h);
      // Compress as JPEG 80% quality to save space
      callback(canvas.toDataURL('image/jpeg', 0.8));
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}

function renderAll() {
  renderLogo();
  updateFormOptions();
  renderMembers();
  renderTransactions();
}

function renderLogo() {
  const container = document.getElementById('app-logo-container');
  if (settings.logoData) {
    container.innerHTML = `<img src="${settings.logoData}" style="width: ${settings.logoWidth}px; max-width:100%;">`;
  } else {
    container.innerHTML = `박사모임 ERP`;
  }
}

function updateFormOptions() {
  const datalist = document.getElementById('members-datalist');
  datalist.innerHTML = members.map(m => `<option value="${m.name}">`).join('');

  const incomeSelect = document.getElementById('tx-income-type');
  const monthly = settings.monthlyDues;
  const annualTotal = (monthly * 12) - settings.annualDiscount;
  incomeSelect.innerHTML = `
    <option value="monthly">월납 (${monthly.toLocaleString()}원)</option>
    <option value="annual">연납 (${annualTotal.toLocaleString()}원) - 할인적용</option>
  `;

  const expenseSelect = document.getElementById('tx-expense-category');
  expenseSelect.innerHTML = settings.expenseCategories.map(cat => `<option value="${cat}">${cat}</option>`).join('');
}

function renderMembers() {
  const tbody = document.getElementById('members-list');
  const s = settings.avatarSize;
  
  tbody.innerHTML = members.map(m => {
    let avatarHtml = `<div style="width:${s}px; height:${s}px; border-radius:50%; background:rgba(255,255,255,0.05); display:inline-flex; align-items:center; justify-content:center; border:1px solid var(--border-color);"><i data-lucide="user" style="width:${s*0.6}px; color:var(--text-secondary)"></i></div>`;
    if (m.photo) {
      avatarHtml = `<img src="${m.photo}" class="member-avatar" style="width:${s}px; height:${s}px;">`;
    }

    return `
    <tr>
      <td>
        <div class="name-with-avatar">
          ${avatarHtml}
          <span style="font-weight:500;">${m.name}</span>
        </div>
      </td>
      <td><span class="badge badge-${(m.level||'member').toLowerCase()}">${m.level}</span></td>
      <td style="color:var(--text-secondary)">${m.phone}</td>
      <td style="color:var(--text-secondary)">${m.joinDate}</td>
      <td>
        <button class="btn btn-ghost" style="padding:0.25rem 0.5rem; font-size:0.875rem;" onclick="editMember('${m.id}')">수정</button>
        <button class="btn btn-ghost admin-only" style="padding:0.25rem 0.5rem; font-size:0.875rem; color:var(--danger-color)" onclick="deleteMember('${m.id}')">삭제</button>
      </td>
    </tr>
  `}).join('');
  
  lucide.createIcons(); // To render the user icon if no photo
}

function formatCurrency(amount) {
  if(typeof amount === 'number') return amount.toLocaleString() + '원';
  return amount || '0원';
}

function renderTransactions() {
  const incomes = transactions.filter(t => t.kind === 'income');
  const expenses = transactions.filter(t => t.kind === 'expense');

  const currentMonthPrefix = new Date().toISOString().substring(0, 7);
  const monthlyIncome = incomes.filter(t => t.date.startsWith(currentMonthPrefix)).reduce((acc, t) => acc + t.amount, 0);
  const monthlyExpense = expenses.filter(t => t.date.startsWith(currentMonthPrefix)).reduce((acc, t) => acc + Math.abs(t.amount), 0);
  
  document.getElementById('stat-total-income').innerText = formatCurrency(monthlyIncome);
  document.getElementById('stat-total-expense').innerText = formatCurrency(monthlyExpense);

  const txTbody = document.getElementById('transactions-list');
  txTbody.innerHTML = transactions.map(t => {
    const isInc = t.kind === 'income';
    return `
    <tr>
      <td><span class="badge badge-${isInc ? 'success' : 'danger'}" style="${!isInc ? 'background:rgba(239,68,68,0.2); color:var(--danger-color);' : ''}">${isInc ? '수입' : '지출'}</span></td>
      <td>
        <div style="font-weight:500;">${t.desc}</div>
        <div style="font-size:0.8rem; color:var(--text-secondary)">${t.type}</div>
      </td>
      <td style="color: ${isInc ? 'var(--success-color)' : 'var(--danger-color)'}; font-weight:600;">
        ${formatCurrency(t.amount)}
      </td>
      <td>${t.date}</td>
      <td class="admin-only">
        <button class="btn btn-ghost" style="padding:0.25rem 0.5rem; font-size:0.875rem; color:var(--danger-color)" onclick="deleteTx('${t.id}')">삭제</button>
      </td>
    </tr>
  `}).join('');

  document.getElementById('dashboard-recent-income').innerHTML = incomes.slice(0, 5).map(t => `
    <tr>
      <td style="font-weight:500;">${t.desc}</td>
      <td><span class="badge badge-${t.badge || 'member'}">${t.type}</span></td>
      <td style="color:var(--success-color)">${formatCurrency(t.amount)}</td>
      <td>${t.date}</td>
    </tr>
  `).join('');

  const expHtml = expenses.map(t => `
    <tr>
      <td><span class="badge badge-danger" style="background:rgba(239,68,68,0.2); color:var(--danger-color);">${t.type}</span></td>
      <td style="font-weight:500;">${t.desc}</td>
      <td style="color:var(--danger-color); font-weight:600;">${formatCurrency(Math.abs(t.amount))}</td>
      <td>${t.date}</td>
    </tr>
  `).join('');
  
  document.getElementById('dashboard-recent-expense').innerHTML = expHtml;
  document.getElementById('events-list').innerHTML = expHtml;
}

// === EXCEL EXPORT & IMPORT ===
function exportToExcel() {
  if (typeof XLSX === 'undefined') { alert("SheetJS 오류"); return; }
  const wb = XLSX.utils.book_new();
  
  // Clone members and remove photo data to prevent huge excel files
  const membersForExcel = members.map(m => {
    const clone = { ...m };
    if (clone.photo) clone.photo = '사진등록됨';
    else clone.photo = '사진없음';
    return clone;
  });

  // Settings without logoData
  const settingsForExcel = { ...settings };
  delete settingsForExcel.logoData;

  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(membersForExcel), "회원목록");
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(transactions), "재무장부");
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet([settingsForExcel]), "환경설정");
  XLSX.writeFile(wb, `박사모임_ERP_데이터백업_${new Date().toISOString().split('T')[0]}.xlsx`);
}

function importFromExcel() {
  if (typeof XLSX === 'undefined') return;
  const fileInput = document.getElementById('import-excel-file');
  const file = fileInput.files[0];
  if (!file || !confirm("엑셀 데이터로 완전히 덮어씁니다. (경고: 엑셀에서 복원 시 기존에 브라우저에 저장된 회원 사진은 초기화될 수 있습니다.) 진행하시겠습니까?")) return;

  const reader = new FileReader();
  reader.onload = function(e) {
    try {
      const data = new Uint8Array(e.target.result);
      const workbook = XLSX.read(data, {type: 'array'});
      
      if(workbook.Sheets["회원목록"]) {
        const parsedMembers = XLSX.utils.sheet_to_json(workbook.Sheets["회원목록"]).map(m => ({...m, id: m.id ? String(m.id) : Date.now().toString()}));
        // Try to preserve existing photos if names match
        members = parsedMembers.map(pm => {
          const existing = members.find(em => em.name === pm.name);
          if (existing && existing.photo) pm.photo = existing.photo;
          else pm.photo = null;
          return pm;
        });
      }

      if(workbook.Sheets["재무장부"]) transactions = XLSX.utils.sheet_to_json(workbook.Sheets["재무장부"]).map(t => ({...t, id: t.id ? String(t.id) : Date.now().toString()}));
      
      if(workbook.Sheets["환경설정"]) {
        const parsedSettings = XLSX.utils.sheet_to_json(workbook.Sheets["환경설정"]);
        if(parsedSettings.length > 0) {
          const newSettings = parsedSettings[0];
          // Preserve logoData
          newSettings.logoData = settings.logoData;
          if(typeof newSettings.expenseCategories === 'string') {
             newSettings.expenseCategories = newSettings.expenseCategories.split(',');
          }
          settings = { ...settings, ...newSettings };
        }
      }
      saveAllToLocal(); renderAll();
      alert("데이터 복원이 완료되었습니다!");
      fileInput.value = ""; 
    } catch(err) {
      console.error(err); alert("오류 발생. 엑셀 형식을 확인하세요.");
    }
  };
  reader.readAsArrayBuffer(file);
}

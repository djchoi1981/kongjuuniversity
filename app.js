// Firebase Config & Initialization (using CDN compat scripts)
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

let db = null;
try {
  if (typeof firebase !== 'undefined') {
    firebase.initializeApp(firebaseConfig);
    db = firebase.database();
  }
} catch (e) {
  console.warn("Firebase initialization skipped:", e);
}

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

// Pagination & Sorting State
let duesPage = 1;
const duesPageSize = 10;
let duesSortMode = 'date-desc';

let eventsPage = 1;
const eventsPageSize = 10;
let eventsSortMode = 'date-desc';

// Pending image uploads (temporary state during modal interaction)
let pendingAddPhoto = null;
let pendingEditPhoto = null;

// Cropper State
let cropper = null;
let currentCropTarget = null; // 'add' or 'edit'

// Data
let members = [
  { id: '1', name: '홍길동', job: '교수', level: 'Admin', phone: '010-1234-5678', joinDate: '2025-01-01', photo: null },
  { id: '2', name: '김철수', job: '연구원', level: 'Member', phone: '010-9876-5432', joinDate: '2025-02-15', photo: null },
  { id: '3', name: '이영희', job: '대표', level: 'VIP', phone: '010-5555-4444', joinDate: '2024-11-20', photo: null },
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
  const nowStr = new Date().toISOString().substring(0, 7);
  document.getElementById('tx-date').value = nowStr;
  document.getElementById('member-joindate').valueAsDate = new Date();

  // Update dynamic income options when date changes
  document.getElementById('tx-date').addEventListener('change', (e) => {
    updateIncomeOptions(e.target.value);
  });
  
  document.getElementById('stat-year').value = new Date().getFullYear().toString();
  document.getElementById('tx-income-type').addEventListener('change', (e) => {
    const dateStr = document.getElementById('tx-date').value;
    const dues = getDuesForDate(dateStr);
    const amountInput = document.getElementById('tx-income-amount');
    if(amountInput) {
      amountInput.value = e.target.value === 'annual' ? dues.annual : dues.monthly;
    }
  });

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

  // Dues Pagination & Sorting Event Listeners
  document.getElementById('dues-sort').addEventListener('change', (e) => {
    duesSortMode = e.target.value;
    duesPage = 1;
    renderTransactions();
  });
  document.getElementById('dues-prev-btn').addEventListener('click', () => {
    if (duesPage > 1) {
      duesPage--;
      renderTransactions();
    }
  });
  document.getElementById('dues-next-btn').addEventListener('click', () => {
    const sorted = sortTransactions(transactions, duesSortMode);
    const totalPages = Math.max(1, Math.ceil(sorted.length / duesPageSize));
    if (duesPage < totalPages) {
      duesPage++;
      renderTransactions();
    }
  });

  // Events Pagination & Sorting Event Listeners
  document.getElementById('events-sort').addEventListener('change', (e) => {
    eventsSortMode = e.target.value;
    eventsPage = 1;
    renderTransactions();
  });
  document.getElementById('events-prev-btn').addEventListener('click', () => {
    if (eventsPage > 1) {
      eventsPage--;
      renderTransactions();
    }
  });
  document.getElementById('events-next-btn').addEventListener('click', () => {
    const expenses = transactions.filter(t => t.kind === 'expense');
    const sorted = sortTransactions(expenses, eventsSortMode);
    const totalPages = Math.max(1, Math.ceil(sorted.length / eventsPageSize));
    if (eventsPage < totalPages) {
      eventsPage++;
      renderTransactions();
    }
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
        document.getElementById('group-income-amount').style.display = 'block';
        document.getElementById('expense-fields').style.display = 'none';
        document.getElementById('tx-income-amount').required = true;
        document.getElementById('tx-expense-desc').required = false;
        document.getElementById('tx-expense-amount').required = false;
      } else {
        document.getElementById('income-fields').style.display = 'none';
        document.getElementById('group-income-amount').style.display = 'none';
        document.getElementById('expense-fields').style.display = 'block';
        document.getElementById('tx-income-amount').required = false;
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
    renderAll();
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


  // --- MODALS & PHOTO CROPPER ---
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

  // Open Cropper
  function openCropper(file, target) {
    currentCropTarget = target;
    const reader = new FileReader();
    reader.onload = (e) => {
      document.getElementById('cropper-image').src = e.target.result;
      document.getElementById('modal-crop-image').style.display = 'flex';
      
      if(cropper) { cropper.destroy(); }
      cropper = new Cropper(document.getElementById('cropper-image'), {
        aspectRatio: 1, // Circular crop (1:1 ratio)
        viewMode: 1,
        autoCropArea: 0.8,
        dragMode: 'move',
        cropBoxMovable: true,
        cropBoxResizable: true,
      });
    };
    reader.readAsDataURL(file);
  }

  // File Inputs Trigger Cropper
  document.getElementById('member-photo').addEventListener('change', (e) => {
    if(e.target.files[0]) {
      openCropper(e.target.files[0], 'add');
      e.target.value = ''; // Reset input to allow re-selection
    }
  });

  document.getElementById('edit-member-photo').addEventListener('change', (e) => {
    if(e.target.files[0]) {
      openCropper(e.target.files[0], 'edit');
      e.target.value = ''; 
    }
  });

  // Cropper Action Buttons
  document.getElementById('btn-cancel-crop').addEventListener('click', () => {
    document.getElementById('modal-crop-image').style.display = 'none';
    if(cropper) { cropper.destroy(); cropper = null; }
  });

  document.getElementById('btn-apply-crop').addEventListener('click', () => {
    if(!cropper) return;
    
    // Get cropped canvas (resized down to 250x250 to save storage space)
    const canvas = cropper.getCroppedCanvas({
      width: 250,
      height: 250,
      imageSmoothingEnabled: true,
      imageSmoothingQuality: 'high',
    });
    
    const base64 = canvas.toDataURL('image/jpeg', 0.8); // Compress
    
    if (currentCropTarget === 'add') {
      pendingAddPhoto = base64;
      document.getElementById('add-photo-preview').innerHTML = `<img src="${base64}" style="width:100%; height:100%; object-fit:cover;">`;
    } else if (currentCropTarget === 'edit') {
      pendingEditPhoto = base64;
      document.getElementById('edit-photo-preview').innerHTML = `<img src="${base64}" style="width:100%; height:100%; object-fit:cover;">`;
    }
    
    document.getElementById('modal-crop-image').style.display = 'none';
    cropper.destroy(); cropper = null;
  });


  // ADD MEMBER Logic
  function renderMatrix() {
    const year = document.getElementById('matrix-year').value;
    const tbody = document.getElementById('matrix-tbody');
    
    const sortedMembers = [...members].sort((a,b) => a.name.localeCompare(b.name));
    
    let html = '';
    sortedMembers.forEach(m => {
      let row = `<tr><td style="position: sticky; left: 0; background: var(--surface-color); font-weight:500; border-right: 1px solid var(--border-color); z-index: 11;">${m.name}</td>`;
      const joinYm = m.joinDate ? m.joinDate.substring(0, 7) : '0000-00';
      
      // Find annual payment for this member in this year
      const annualTx = transactions.find(t => t.kind === 'income' && t.desc === m.name && t.type === '연납' && t.date.startsWith(year));

      for(let i=1; i<=12; i++) {
        const mm = i.toString().padStart(2, '0');
        const cellYm = `${year}-${mm}`;
        
        if (cellYm < joinYm) {
          row += `<td style="background: var(--surface-hover); color: var(--text-secondary); font-size: 0.8rem;">해당없음</td>`;
        } else {
          const tx = transactions.find(t => t.kind === 'income' && t.desc === m.name && t.date === cellYm && t.type !== '연납');
          
          let cellHtml = '';
          let cellClass = 'matrix-cell';
          let statusAttr = '';
          
          if (tx) {
            statusAttr = `data-txid="${tx.id}" data-status="${tx.status || 'paid'}"`;
            if (tx.status === 'exempt') {
              cellHtml = `<span class="badge" style="background:var(--surface-hover); color:var(--text-secondary)">공제</span>`;
            } else if (tx.status === 'unpaid') {
              cellHtml = `<span class="badge" style="background:rgba(239,68,68,0.1); color:var(--danger-color)">미납</span>`;
            } else {
              cellHtml = `<span class="badge badge-success">완료</span>`;
            }
          } else if (annualTx) {
            // Covered by annual payment
            statusAttr = `data-txid="${annualTx.id}" data-status="annual-paid"`;
            cellHtml = `<span class="badge" style="background:rgba(59,130,246,0.1); color:var(--primary-color)">연납</span>`;
          } else {
            statusAttr = `data-txid="" data-status="none"`;
          }
          
          row += `<td class="${cellClass}" data-member="${m.name}" data-ym="${cellYm}" ${statusAttr} style="cursor:pointer; transition: background 0.2s;" onmouseover="this.style.background='var(--surface-hover)'" onmouseout="this.style.background=''">
            ${cellHtml}
          </td>`;
        }
      }
      
      // Render the annual column cell
      let annualCellHtml = '';
      let annualStatusAttr = '';
      if (annualTx) {
        annualStatusAttr = `data-txid="${annualTx.id}" data-status="paid"`;
        annualCellHtml = `<span class="badge badge-success">완료</span>`;
      } else {
        annualStatusAttr = `data-txid="" data-status="none"`;
        annualCellHtml = `<span class="badge" style="background:rgba(239,68,68,0.05); color:var(--text-secondary); cursor:pointer;">미납</span>`;
      }
      
      row += `<td class="matrix-annual-cell" data-member="${m.name}" data-year="${year}" ${annualStatusAttr} style="cursor:pointer; border-left:1px solid var(--border-color); transition: background 0.2s;" onmouseover="this.style.background='var(--surface-hover)'" onmouseout="this.style.background=''">
        ${annualCellHtml}
      </td>`;

      row += `</tr>`;
      html += row;
    });
    tbody.innerHTML = html;
    
    // Bind click events for monthly cells
    document.querySelectorAll('.matrix-cell').forEach(cell => {
      cell.addEventListener('click', () => {
        const member = cell.getAttribute('data-member');
        const ym = cell.getAttribute('data-ym');
        const status = cell.getAttribute('data-status');
        const txid = cell.getAttribute('data-txid');
        
        document.getElementById('modal-cell-action').removeAttribute('data-is-annual');
        
        document.getElementById('cell-action-title').innerText = `[${member}] ${ym} 납부 상태`;
        document.getElementById('cell-action-member').value = member;
        document.getElementById('cell-action-month').value = ym;
        
        if (status === 'none') {
          document.getElementById('cell-action-status').value = 'paid';
          document.getElementById('cell-action-amount').value = getDuesForDate(ym).monthly;
          document.getElementById('btn-cell-delete').style.display = 'none';
        } else if (status === 'annual-paid') {
          // Editing the underlying annual transaction
          document.getElementById('cell-action-title').innerText = `[${member}] ${ym.substring(0,4)}년 연납 상태 수정`;
          document.getElementById('cell-action-status').value = 'paid';
          document.getElementById('btn-cell-delete').style.display = 'block';
          document.getElementById('btn-cell-delete').setAttribute('data-txid', txid);
          
          const existingTx = transactions.find(t => t.id === txid);
          if (existingTx) {
            document.getElementById('cell-action-amount').value = existingTx.amount;
          }
          document.getElementById('modal-cell-action').setAttribute('data-is-annual', 'true');
        } else {
          document.getElementById('cell-action-status').value = status;
          document.getElementById('btn-cell-delete').style.display = 'block';
          document.getElementById('btn-cell-delete').setAttribute('data-txid', txid);
          
          const existingTx = transactions.find(t => t.id === txid);
          if (existingTx) {
            document.getElementById('cell-action-amount').value = existingTx.amount;
          }
        }
        
        document.getElementById('modal-cell-action').style.display = 'flex';
      });
    });

    // Bind click events for annual column cells
    document.querySelectorAll('.matrix-annual-cell').forEach(cell => {
      cell.addEventListener('click', () => {
        const member = cell.getAttribute('data-member');
        const targetYear = cell.getAttribute('data-year');
        const status = cell.getAttribute('data-status');
        const txid = cell.getAttribute('data-txid');
        
        document.getElementById('cell-action-title').innerText = `[${member}] ${targetYear}년 연납 등록/수정`;
        document.getElementById('cell-action-member').value = member;
        document.getElementById('cell-action-month').value = `${targetYear}-01`;
        
        if (status === 'none') {
          document.getElementById('cell-action-status').value = 'paid';
          document.getElementById('cell-action-amount').value = getDuesForDate(`${targetYear}-01`).annual;
          document.getElementById('btn-cell-delete').style.display = 'none';
        } else {
          document.getElementById('cell-action-status').value = 'paid';
          document.getElementById('btn-cell-delete').style.display = 'block';
          document.getElementById('btn-cell-delete').setAttribute('data-txid', txid);
          
          const existingTx = transactions.find(t => t.id === txid);
          if (existingTx) {
            document.getElementById('cell-action-amount').value = existingTx.amount;
          }
        }
        
        document.getElementById('modal-cell-action').setAttribute('data-is-annual', 'true');
        document.getElementById('modal-cell-action').style.display = 'flex';
      });
    });
  }

  document.getElementById('matrix-year').addEventListener('change', renderMatrix);

  document.getElementById('btn-open-matrix').addEventListener('click', () => {
    document.getElementById('matrix-year').value = new Date().getFullYear().toString();
    renderMatrix();
    document.getElementById('modal-matrix').style.display = 'flex';
  });

  document.getElementById('btn-cell-cancel').addEventListener('click', () => {
    document.getElementById('modal-cell-action').removeAttribute('data-is-annual');
    document.getElementById('modal-cell-action').style.display = 'none';
  });

  document.getElementById('btn-cell-save').addEventListener('click', () => {
    const memberName = document.getElementById('cell-action-member').value;
    const targetMonth = document.getElementById('cell-action-month').value;
    const status = document.getElementById('cell-action-status').value;
    const amountPaid = parseInt(document.getElementById('cell-action-amount').value, 10);
    
    const isAnnualAction = document.getElementById('modal-cell-action').getAttribute('data-is-annual') === 'true';
    
    let txIndex = -1;
    if (isAnnualAction) {
      const targetYear = targetMonth.substring(0, 4);
      txIndex = transactions.findIndex(t => t.kind === 'income' && t.desc === memberName && t.type === '연납' && t.date.startsWith(targetYear));
    } else {
      txIndex = transactions.findIndex(t => t.kind === 'income' && t.desc === memberName && t.date === targetMonth && t.type !== '연납');
    }
    
    let amount = 0;
    let statusDesc = isAnnualAction ? '연납' : '월납';
    if (status === 'paid') {
      amount = amountPaid || 0;
    } else if (status === 'exempt') {
      amount = 0;
      statusDesc = '공제';
    } else if (status === 'unpaid') {
      amount = 0;
      statusDesc = '미납';
    }
    
    if (txIndex > -1) {
      transactions[txIndex].status = status;
      transactions[txIndex].amount = amount;
      transactions[txIndex].type = statusDesc;
    } else {
      const mem = members.find(m => m.name === memberName);
      const newTx = {
        id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
        kind: 'income',
        type: statusDesc,
        status: status,
        desc: memberName,
        amount: amount,
        date: targetMonth,
        badge: mem ? mem.level.toLowerCase() : 'member'
      };
      transactions.unshift(newTx);
    }
    
    saveAllToLocal();
    renderAll();
    renderMatrix();
    document.getElementById('modal-cell-action').removeAttribute('data-is-annual');
    document.getElementById('modal-cell-action').style.display = 'none';
  });

  document.getElementById('btn-cell-delete').addEventListener('click', (e) => {
    const txid = e.target.getAttribute('data-txid');
    if (txid) {
      transactions = transactions.filter(t => t.id !== txid);
      saveAllToLocal();
      renderAll();
      renderMatrix();
      document.getElementById('modal-cell-action').removeAttribute('data-is-annual');
      document.getElementById('modal-cell-action').style.display = 'none';
    }
  });

  document.getElementById('form-add-member').addEventListener('submit', (e) => {
    e.preventDefault();
    const newMember = {
      id: Date.now().toString(),
      name: document.getElementById('member-name').value,
      job: document.getElementById('member-job').value,
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
      members[memberIndex].job = document.getElementById('edit-member-job').value;
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
      const mem = members.find(m => m.name === name);
      if(!mem) {
        alert("등록된 회원이 아닙니다. 드롭다운에서 선택하거나 먼저 회원을 추가해주세요.");
        return;
      }
      
      const typeValue = document.getElementById('tx-income-type').value;
      const isAnnual = typeValue === 'annual';
      const amount = parseInt(document.getElementById('tx-income-amount').value, 10) || 0;

      const newTx = {
        id: Date.now().toString(),
        kind: 'income',
        type: isAnnual ? '연납' : '월납',
        status: 'paid',
        desc: name,
        amount: amount,
        date: date,
        badge: mem.level.toLowerCase()
      };
      
      transactions.unshift(newTx);
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
      transactions.unshift(newTx);
      alert(`경조사(지출) 내역이 정상적으로 등록되었습니다.`);
    }
    
    saveAllToLocal();
    duesPage = 1;
    eventsPage = 1;
    renderAll();
    
    document.getElementById('tx-member').value = '';
    document.getElementById('tx-expense-desc').value = '';
    document.getElementById('tx-expense-amount').value = '';
  });

  // Excel
  document.getElementById('export-excel-btn').addEventListener('click', exportToExcel);
  document.getElementById('import-excel-btn').addEventListener('click', importFromExcel);

  renderAll();
  document.getElementById('stat-total-members').innerText = members.length + '명';

  // Load from Database in the background
  loadDataFromDatabase();
});

// Edit/Delete globals
window.editMember = function(id) {
  const member = members.find(m => m.id === id);
  if(!member) return;
  document.getElementById('edit-member-id').value = member.id;
  document.getElementById('edit-member-name').value = member.name;
  document.getElementById('edit-member-job').value = member.job || '';
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
  const now = new Date();
  const pad = (n) => n.toString().padStart(2, '0');
  settings.lastModified = `${now.getFullYear()}-${pad(now.getMonth()+1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}`;
  
  localStorage.setItem('erp_settings', JSON.stringify(settings));
  localStorage.setItem('erp_members', JSON.stringify(members));
  localStorage.setItem('erp_transactions', JSON.stringify(transactions));
  renderLogo();

  // Background Cloud Sync
  syncAllToDatabase();
}

async function syncAllToDatabase() {
  if (!db) return;
  try {
    await db.ref("/").set({
      settings: settings,
      members: members,
      transactions: transactions
    });
    console.log("Cloud sync successful.");
  } catch (error) {
    console.error("Cloud sync failed:", error);
    alert(`클라우드 동기화 실패: ${error.message || error.code || error}`);
  }
}

async function loadDataFromDatabase() {
  if (!db) return;
  try {
    const snapshot = await db.ref("/").once("value");
    const data = snapshot.val();
    if (data) {
      if (data.settings) {
        settings = { ...settings, ...data.settings };
        localStorage.setItem('erp_settings', JSON.stringify(settings));
      }
      if (data.members) {
        members = data.members;
        localStorage.setItem('erp_members', JSON.stringify(members));
      }
      if (data.transactions) {
        transactions = data.transactions;
        localStorage.setItem('erp_transactions', JSON.stringify(transactions));
      }
      renderAll();
      // Refresh payment matrix if open
      const matrixModal = document.getElementById('modal-matrix');
      if (matrixModal && matrixModal.style.display === 'flex') {
        renderMatrix();
      }
    } else {
      // Database is empty (null). Initialize with local data if it exists.
      const hasLocalMembers = localStorage.getItem('erp_members');
      const hasLocalTx = localStorage.getItem('erp_transactions');
      if (hasLocalMembers || hasLocalTx) {
        console.log("Database is empty, but local data exists. Initializing cloud database with local data...");
        syncAllToDatabase();
      }
    }
    console.log("Cloud data loaded successfully.");
  } catch (error) {
    console.error("Cloud load failed:", error);
    const modeBadge = document.getElementById('mode-badge');
    if (modeBadge) {
      modeBadge.innerText = `클라우드 연동 실패 (${error.message || error.code || error})`;
      modeBadge.style.backgroundColor = 'rgba(239,68,68,0.15)';
      modeBadge.style.color = 'var(--danger-color)';
    }
  }
}

// Logo Compression Helper (We still need this purely for Logo resizing without crop UI)
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
  renderDashboard();
  document.getElementById('stat-total-members').innerText = members.length + '명';
}

function renderLogo() {
  const container = document.getElementById('app-logo-container');
  let dateText = settings.lastModified ? `(최종수정: ${settings.lastModified})` : '';
  const versionBadge = `<span class="version-badge">v1.2</span><span style="font-size:0.75rem; color:var(--text-secondary); margin-left:0.5rem; font-weight:normal;">${dateText}</span>`;
  if (settings.logoData) {
    container.innerHTML = `<img src="${settings.logoData}" style="width: ${settings.logoWidth}px; max-width:100%;"> ${versionBadge}`;
  } else {
    container.innerHTML = `<span>박사모임 ERP</span> ${versionBadge}`;
  }
}

function updateFormOptions() {
  const datalist = document.getElementById('members-datalist');
  datalist.innerHTML = members.map(m => `<option value="${m.name}">`).join('');

  const dateStr = document.getElementById('tx-date')?.value || new Date().toISOString().substring(0, 7);
  updateIncomeOptions(dateStr);

  const expenseSelect = document.getElementById('tx-expense-category');
  expenseSelect.innerHTML = settings.expenseCategories.map(cat => `<option value="${cat}">${cat}</option>`).join('');
}

function getDuesForDate(dateStr) {
  if (dateStr && dateStr <= '2025-12') {
    return { monthly: 20000, annual: 240000, hasDiscount: false };
  } else {
    const monthly = settings.monthlyDues;
    const annual = (monthly * 12) - settings.annualDiscount;
    return { monthly, annual, hasDiscount: settings.annualDiscount > 0 };
  }
}

function updateIncomeOptions(dateStr) {
  const incomeSelect = document.getElementById('tx-income-type');
  if (!incomeSelect) return;
  const dues = getDuesForDate(dateStr);
  
  let annualText = `연납 (${dues.annual.toLocaleString()}원)`;
  if (dues.hasDiscount) annualText += ` - 할인적용`;

  incomeSelect.innerHTML = `
    <option value="monthly">월납 (${dues.monthly.toLocaleString()}원)</option>
    <option value="annual">${annualText}</option>
  `;
  
  const amountInput = document.getElementById('tx-income-amount');
  if(amountInput && incomeSelect) {
    amountInput.value = incomeSelect.value === 'annual' ? dues.annual : dues.monthly;
  }
}

function renderMembers() {
  const tbody = document.getElementById('members-list');
  const s = settings.avatarSize;
  
  tbody.innerHTML = members.map(m => {
    let avatarHtml = `<div style="width:${s}px; height:${s}px; border-radius:50%; background:var(--surface-hover); display:inline-flex; align-items:center; justify-content:center; border:1px solid var(--border-color); flex-shrink:0;"><i data-lucide="user" style="width:${s*0.6}px; color:var(--text-secondary)"></i></div>`;
    if (m.photo) {
      avatarHtml = `<img src="${m.photo}" class="member-avatar" style="width:${s}px; height:${s}px; flex-shrink:0;">`;
    }

    return `
    <tr>
      <td>
        <div class="name-with-avatar">
          ${avatarHtml}
          <span style="font-weight:500;">${m.name}</span>
        </div>
      </td>
      <td style="color:var(--text-secondary)">${m.job || '-'}</td>
      <td><span class="badge badge-${(m.level||'member').toLowerCase()}">${m.level}</span></td>
      <td style="color:var(--text-secondary)">${m.phone}</td>
      <td style="color:var(--text-secondary)">${m.joinDate}</td>
      <td>
        <button class="btn btn-ghost" style="padding:0.25rem 0.5rem; font-size:0.875rem;" onclick="editMember('${m.id}')">수정</button>
        <button class="btn btn-ghost admin-only" style="padding:0.25rem 0.5rem; font-size:0.875rem; color:var(--danger-color)" onclick="deleteMember('${m.id}')">삭제</button>
      </td>
    </tr>
  `}).join('');
  
  lucide.createIcons();
}

function formatCurrency(amount) {
  if(typeof amount === 'number') return amount.toLocaleString() + '원';
  return amount || '0원';
}

function renderDashboard() {
  const currentMonthPrefix = new Date().toISOString().substring(0, 7);
  
  let accumIncome = 0;
  let accumExpense = 0;
  
  const incomes = transactions.filter(t => t.kind === 'income');
  const expenses = transactions.filter(t => t.kind === 'expense');
  
  incomes.forEach(t => accumIncome += t.amount);
  expenses.forEach(t => accumExpense += Math.abs(t.amount));
  
  const monthlyIncome = incomes.filter(t => t.date.startsWith(currentMonthPrefix)).reduce((acc, t) => acc + t.amount, 0);
  const monthlyExpense = expenses.filter(t => t.date.startsWith(currentMonthPrefix)).reduce((acc, t) => acc + Math.abs(t.amount), 0);
  
  document.getElementById('stat-total-members').innerText = `${members.length}명`;
  document.getElementById('stat-accum-income').innerText = formatCurrency(accumIncome);
  document.getElementById('stat-accum-expense').innerText = formatCurrency(accumExpense);
  document.getElementById('stat-accum-balance').innerText = formatCurrency(accumIncome - accumExpense);
  document.getElementById('stat-total-income').innerText = formatCurrency(monthlyIncome);
  document.getElementById('stat-total-expense').innerText = formatCurrency(monthlyExpense);

  const recentIncomes = incomes.slice(0, 5);
  const recentExpenses = expenses.slice(0, 5);
  
  document.getElementById('dashboard-recent-income').innerHTML = recentIncomes.map(t => `
    <tr>
      <td style="font-weight:500;">${t.desc}</td>
      <td><span class="badge badge-${t.badge || 'member'}">${t.type}</span></td>
      <td style="color:var(--success-color)">${formatCurrency(t.amount)}</td>
      <td>${t.date}</td>
    </tr>
  `).join('');

  document.getElementById('dashboard-recent-expense').innerHTML = recentExpenses.map(t => `
    <tr>
      <td><span class="badge" style="background:rgba(239,68,68,0.1); color:var(--danger-color)">${t.type}</span></td>
      <td>${t.desc}</td>
      <td style="color:var(--danger-color); font-weight:600;">${formatCurrency(Math.abs(t.amount))}</td>
      <td>${t.date}</td>
    </tr>
  `).join('');

  renderStatTable();
}

function renderStatTable() {
  const year = document.getElementById('stat-year').value;
  const tbody = document.getElementById('stat-table-body');
  
  let yearIncome = 0;
  let yearExpense = 0;
  let html = '';
  
  for(let i=1; i<=12; i++) {
    const mm = i.toString().padStart(2, '0');
    const ym = `${year}-${mm}`;
    
    let monthIncome = 0;
    let monthExpense = 0;
    
    transactions.forEach(t => {
      if(t.date.startsWith(ym)) {
        if(t.kind === 'income') monthIncome += t.amount;
        if(t.kind === 'expense') monthExpense += Math.abs(t.amount);
      }
    });
    
    yearIncome += monthIncome;
    yearExpense += monthExpense;
    const monthBalance = monthIncome - monthExpense;
    
    html += `
      <tr>
        <td style="text-align:center;">${i}월</td>
        <td style="color:var(--success-color); font-weight:500;">${formatCurrency(monthIncome)}</td>
        <td style="color:var(--danger-color); font-weight:500;">${formatCurrency(monthExpense)}</td>
        <td style="font-weight:600;">${formatCurrency(monthBalance)}</td>
      </tr>
    `;
  }
  
  tbody.innerHTML = html;
  
  document.getElementById('stat-year-income').innerText = formatCurrency(yearIncome);
  document.getElementById('stat-year-expense').innerText = formatCurrency(yearExpense);
  document.getElementById('stat-year-balance').innerText = formatCurrency(yearIncome - yearExpense);
}

document.getElementById('stat-year').addEventListener('change', renderStatTable);

function sortTransactions(list, sortMode) {
  return [...list].sort((a, b) => {
    if (sortMode === 'date-desc') {
      return b.date.localeCompare(a.date) || b.id.localeCompare(a.id);
    } else if (sortMode === 'date-asc') {
      return a.date.localeCompare(b.date) || a.id.localeCompare(b.id);
    } else if (sortMode === 'amount-desc') {
      return Math.abs(b.amount) - Math.abs(a.amount);
    } else if (sortMode === 'amount-asc') {
      return Math.abs(a.amount) - Math.abs(b.amount);
    }
    return 0;
  });
}

function renderTransactions() {
  // 1. Render Dues (Transactions List)
  const txTbody = document.getElementById('transactions-list');
  const sortedDues = sortTransactions(transactions, duesSortMode);
  const totalDuesItems = sortedDues.length;
  const totalDuesPages = Math.max(1, Math.ceil(totalDuesItems / duesPageSize));
  
  if (duesPage > totalDuesPages) duesPage = totalDuesPages;
  if (duesPage < 1) duesPage = 1;
  
  const startDuesIdx = (duesPage - 1) * duesPageSize;
  const paginatedDues = sortedDues.slice(startDuesIdx, startDuesIdx + duesPageSize);

  txTbody.innerHTML = paginatedDues.map(t => {
    const isInc = t.kind === 'income';
    let typeHtml = t.type;
    let badgeHtml = t.badge ? `<span class="badge badge-${t.badge}">${t.badge}</span>` : '';
    
    let amountHtml = formatCurrency(t.amount);
    if (isInc && t.status === 'exempt') {
      amountHtml = `<span style="color:var(--text-secondary); font-size:0.85rem;">[공제]</span> 0원`;
    } else if (isInc && t.status === 'unpaid') {
      amountHtml = `<span style="color:var(--danger-color); font-size:0.85rem;">[미납]</span> 0원`;
    }

    return `
    <tr>
      <td><span class="badge badge-${isInc ? 'success' : 'danger'}" style="${!isInc ? 'background:rgba(239,68,68,0.2); color:var(--danger-color);' : ''}">${isInc ? '수입' : '지출'}</span></td>
      <td>${t.date}</td>
      <td>${typeHtml}</td>
      <td>
        <div style="display:flex; align-items:center; gap:0.5rem;">
          ${t.desc}
          ${badgeHtml}
        </div>
      </td>
      <td style="color: ${isInc ? 'var(--success-color)' : 'var(--danger-color)'}; font-weight:600;">
        ${amountHtml}
      </td>
      <td>${t.date}</td>
      <td class="admin-only">
        <button class="btn btn-ghost" style="padding:0.25rem 0.5rem; font-size:0.875rem; color:var(--danger-color)" onclick="deleteTx('${t.id}')">삭제</button>
      </td>
    </tr>
  `}).join('');

  document.getElementById('dues-page-info').innerText = `페이지 ${duesPage} / ${totalDuesPages} (총 ${totalDuesItems}건)`;
  document.getElementById('dues-prev-btn').disabled = (duesPage === 1);
  document.getElementById('dues-next-btn').disabled = (duesPage === totalDuesPages);

  // 2. Render Events (Expenses List)
  const expenses = transactions.filter(t => t.kind === 'expense');
  const sortedEvents = sortTransactions(expenses, eventsSortMode);
  const totalEventsItems = sortedEvents.length;
  const totalEventsPages = Math.max(1, Math.ceil(totalEventsItems / eventsPageSize));
  
  if (eventsPage > totalEventsPages) eventsPage = totalEventsPages;
  if (eventsPage < 1) eventsPage = 1;
  
  const startEventsIdx = (eventsPage - 1) * eventsPageSize;
  const paginatedEvents = sortedEvents.slice(startEventsIdx, startEventsIdx + eventsPageSize);

  const expHtml = paginatedEvents.map(t => `
    <tr>
      <td><span class="badge badge-danger" style="background:rgba(239,68,68,0.2); color:var(--danger-color);">${t.type}</span></td>
      <td style="font-weight:500;">${t.desc}</td>
      <td style="color:var(--danger-color); font-weight:600;">${formatCurrency(Math.abs(t.amount))}</td>
      <td>${t.date}</td>
    </tr>
  `).join('');
  
  document.getElementById('events-list').innerHTML = expHtml;

  document.getElementById('events-page-info').innerText = `페이지 ${eventsPage} / ${totalEventsPages} (총 ${totalEventsItems}건)`;
  document.getElementById('events-prev-btn').disabled = (eventsPage === 1);
  document.getElementById('events-next-btn').disabled = (eventsPage === totalEventsPages);
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

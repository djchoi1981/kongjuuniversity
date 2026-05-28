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

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// State
let isAdmin = false;
let settings = {
  monthlyDues: 10000,
  annualDiscount: 20000
};

// Data
let members = [
  { id: '1', name: '홍길동', level: 'Admin', phone: '010-1234-5678', joinDate: '2025-01-01' },
  { id: '2', name: '김철수', level: 'Member', phone: '010-9876-5432', joinDate: '2025-02-15' },
  { id: '3', name: '이영희', level: 'VIP', phone: '010-5555-4444', joinDate: '2024-11-20' },
];

let payments = [
  { id: '1', name: '홍길동', type: '연납', amount: 100000, discount: 20000, date: '2026-05-28', badge: 'admin' },
  { id: '2', name: '김철수', type: '월납', amount: 10000, discount: 0, date: '2026-05-27', badge: 'member' },
  { id: '3', name: '이영희', type: '월납', amount: 10000, discount: 0, date: '2026-05-26', badge: 'vip' }
];

let eventsData = [
  { id: '1', type: '결혼', target: '김철수 회원 장남', details: '서울 JS웨딩홀 2층', date: '2026-06-15', badge: 'member' },
  { id: '2', type: '개업', target: '이영희 회원', details: '데이터 분석 회사 창업 (강남구)', date: '2026-05-20', badge: 'vip' },
  { id: '3', type: '부고', target: '박지성 회원 빙부상', details: '대전 충남대병원 장례식장 3호실', date: '2026-06-01', badge: 'member' }
];

// Initialize UI
document.addEventListener('DOMContentLoaded', () => {
  // Load data from localStorage (Mock persistence)
  const savedSettings = localStorage.getItem('erp_settings');
  if (savedSettings) settings = JSON.parse(savedSettings);
  
  const savedMembers = localStorage.getItem('erp_members');
  if (savedMembers) members = JSON.parse(savedMembers);

  const savedPayments = localStorage.getItem('erp_payments');
  if (savedPayments) payments = JSON.parse(savedPayments);

  const savedEvents = localStorage.getItem('erp_events');
  if (savedEvents) eventsData = JSON.parse(savedEvents);
  
  // Init Lucide Icons
  lucide.createIcons();
  
  document.getElementById('payment-date').valueAsDate = new Date();

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

  // Auth (Admin Toggle) Logic
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

  // Settings Save Logic
  document.getElementById('setting-monthly-dues').value = settings.monthlyDues;
  document.getElementById('setting-annual-discount').value = settings.annualDiscount;
  
  document.getElementById('settings-form').addEventListener('submit', (e) => {
    e.preventDefault();
    settings.monthlyDues = parseInt(document.getElementById('setting-monthly-dues').value);
    settings.annualDiscount = parseInt(document.getElementById('setting-annual-discount').value);
    
    saveAllToLocal();
    alert('설정이 저장되었습니다.');
    updatePaymentOptions();
  });

  // Excel Logic
  document.getElementById('export-excel-btn').addEventListener('click', exportToExcel);
  document.getElementById('import-excel-btn').addEventListener('click', importFromExcel);

  // Init Data Rendering
  renderAll();
});

function saveAllToLocal() {
  localStorage.setItem('erp_settings', JSON.stringify(settings));
  localStorage.setItem('erp_members', JSON.stringify(members));
  localStorage.setItem('erp_payments', JSON.stringify(payments));
  localStorage.setItem('erp_events', JSON.stringify(eventsData));
}

function renderAll() {
  updatePaymentOptions();
  renderMembers();
  renderPayments();
  renderEvents();
  
  document.getElementById('stat-total-members').innerText = `${members.length}명`;
  document.getElementById('stat-paid-members').innerText = `${payments.length}명`;
}

function updatePaymentOptions() {
  const select = document.getElementById('payment-type');
  const monthly = settings.monthlyDues;
  const annualTotal = (monthly * 12) - settings.annualDiscount;
  
  select.innerHTML = `
    <option value="monthly">월납 (${monthly.toLocaleString()}원)</option>
    <option value="annual">연납 (${annualTotal.toLocaleString()}원) - ${settings.annualDiscount.toLocaleString()}원 할인</option>
  `;
}

function renderMembers() {
  const tbody = document.getElementById('members-list');
  tbody.innerHTML = members.map(m => `
    <tr>
      <td style="font-weight:500;">${m.name}</td>
      <td><span class="badge badge-${(m.level||'member').toLowerCase()}">${m.level}</span></td>
      <td style="color:var(--text-secondary)">${m.phone}</td>
      <td style="color:var(--text-secondary)">${m.joinDate}</td>
      <td class="admin-only">
        <button class="btn btn-ghost" style="padding:0.25rem 0.5rem; font-size:0.875rem;" onclick="alert('수정')">수정</button>
        <button class="btn btn-ghost" style="padding:0.25rem 0.5rem; font-size:0.875rem; color:var(--danger-color)" onclick="alert('삭제')">삭제</button>
      </td>
    </tr>
  `).join('');
}

function formatCurrency(amount) {
  if(typeof amount === 'number') return amount.toLocaleString() + '원';
  return amount || '0원';
}

function renderPayments() {
  const trHtml = payments.map(p => `
    <tr>
      <td>${p.name}</td>
      <td><span class="badge badge-${p.badge || 'member'}">${p.type}</span></td>
      <td>${formatCurrency(p.amount)}</td>
      <td style="${p.discount > 0 ? 'color:var(--success-color)' : ''}">${formatCurrency(p.discount)}</td>
      <td>${p.date}</td>
    </tr>
  `).join('');

  document.getElementById('dashboard-recent-payments').innerHTML = trHtml;
  document.getElementById('dues-recent-payments').innerHTML = trHtml;
}

function renderEvents() {
  // Sort events by date descending for simple view
  const sortedEvents = [...eventsData].sort((a, b) => new Date(b.date) - new Date(a.date));
  
  const trHtml = sortedEvents.map(e => `
    <tr>
      <td><span class="badge badge-${e.badge || 'member'}">${e.type}</span></td>
      <td style="font-weight:500;">${e.target}</td>
      <td style="color:var(--text-secondary)">${e.details}</td>
      <td>${e.date}</td>
      <td class="admin-only">
        <button class="btn btn-ghost" style="padding:0.25rem 0.5rem; font-size:0.875rem; color:var(--danger-color)" onclick="alert('삭제')">삭제</button>
      </td>
    </tr>
  `).join('');

  document.getElementById('events-list').innerHTML = trHtml;
  
  // Dashboard view excludes management buttons
  const dashHtml = sortedEvents.map(e => `
    <tr>
      <td><span class="badge badge-${e.badge || 'member'}">${e.type}</span></td>
      <td style="font-weight:500;">${e.target}</td>
      <td style="color:var(--text-secondary)">${e.details}</td>
      <td>${e.date}</td>
    </tr>
  `).join('');
  document.getElementById('dashboard-recent-events').innerHTML = dashHtml;
}

// === EXCEL EXPORT & IMPORT ===

function exportToExcel() {
  if (typeof XLSX === 'undefined') {
    alert("SheetJS 라이브러리가 로드되지 않았습니다.");
    return;
  }
  
  const wb = XLSX.utils.book_new();

  // Sheet 1: Members
  const wsMembers = XLSX.utils.json_to_sheet(members);
  XLSX.utils.book_append_sheet(wb, wsMembers, "회원목록");

  // Sheet 2: Payments
  const wsPayments = XLSX.utils.json_to_sheet(payments);
  XLSX.utils.book_append_sheet(wb, wsPayments, "납부내역");

  // Sheet 3: Events
  const wsEvents = XLSX.utils.json_to_sheet(eventsData);
  XLSX.utils.book_append_sheet(wb, wsEvents, "경조사");

  // Sheet 4: Settings
  const wsSettings = XLSX.utils.json_to_sheet([settings]);
  XLSX.utils.book_append_sheet(wb, wsSettings, "환경설정");

  // Download
  XLSX.writeFile(wb, `박사모임_ERP_데이터백업_${new Date().toISOString().split('T')[0]}.xlsx`);
}

function importFromExcel() {
  if (typeof XLSX === 'undefined') {
    alert("SheetJS 라이브러리가 로드되지 않았습니다.");
    return;
  }

  const fileInput = document.getElementById('import-excel-file');
  const file = fileInput.files[0];
  if (!file) {
    alert("먼저 업로드할 엑셀 파일을 선택해주세요.");
    return;
  }

  if(!confirm("엑셀 데이터로 기존 데이터를 완전히 덮어씁니다. 진행하시겠습니까?")) {
    return;
  }

  const reader = new FileReader();
  reader.onload = function(e) {
    try {
      const data = new Uint8Array(e.target.result);
      const workbook = XLSX.read(data, {type: 'array'});

      // Parse Members
      if(workbook.Sheets["회원목록"]) {
        members = XLSX.utils.sheet_to_json(workbook.Sheets["회원목록"]);
      }
      
      // Parse Payments
      if(workbook.Sheets["납부내역"]) {
        payments = XLSX.utils.sheet_to_json(workbook.Sheets["납부내역"]);
      }
      
      // Parse Events
      if(workbook.Sheets["경조사"]) {
        eventsData = XLSX.utils.sheet_to_json(workbook.Sheets["경조사"]);
      }

      // Parse Settings
      if(workbook.Sheets["환경설정"]) {
        const parsedSettings = XLSX.utils.sheet_to_json(workbook.Sheets["환경설정"]);
        if(parsedSettings.length > 0) {
          settings = { ...settings, ...parsedSettings[0] };
        }
      }

      saveAllToLocal();
      renderAll();
      alert("엑셀 데이터 덮어쓰기가 완료되었습니다!");
      fileInput.value = ""; // clear input
      
    } catch(err) {
      console.error(err);
      alert("엑셀 파일을 읽는 도중 오류가 발생했습니다. 파일 형식을 확인해주세요.");
    }
  };
  reader.readAsArrayBuffer(file);
}

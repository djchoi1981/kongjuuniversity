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

// Dummy Data
const members = [
  { id: '1', name: '홍길동', level: 'Admin', phone: '010-1234-5678', joinDate: '2025-01-01' },
  { id: '2', name: '김철수', level: 'Member', phone: '010-9876-5432', joinDate: '2025-02-15' },
  { id: '3', name: '이영희', level: 'VIP', phone: '010-5555-4444', joinDate: '2024-11-20' },
];

const payments = [
  { id: '1', name: '홍길동', type: '연납', amount: '100,000원', discount: '20,000원', date: '2026-05-28', badge: 'admin' },
  { id: '2', name: '김철수', type: '월납', amount: '10,000원', discount: '0원', date: '2026-05-27', badge: 'member' },
  { id: '3', name: '이영희', type: '월납', amount: '10,000원', discount: '0원', date: '2026-05-26', badge: 'vip' }
];

// Initialize UI
document.addEventListener('DOMContentLoaded', () => {
  // Load settings from localStorage
  const savedSettings = localStorage.getItem('erp_settings');
  if (savedSettings) {
    settings = JSON.parse(savedSettings);
  }
  
  // Init Lucide Icons
  lucide.createIcons();
  
  // Set default date to today
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
      // Logout
      isAdmin = false;
      document.body.classList.remove('admin-mode');
      document.getElementById('mode-badge').innerText = '일반 모드 (조회 전용)';
      document.getElementById('auth-btn-text').innerText = '관리자 로그인';
      
      // If currently on settings tab, go back to dashboard
      if (document.getElementById('settings').classList.contains('active-view')) {
        document.querySelector('[data-target="dashboard"]').click();
      }
      
      // Re-create icons to switch lock -> unlock (optional, using simple text instead)
      alert('일반 모드로 전환되었습니다.');
    } else {
      // Login
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
    
    localStorage.setItem('erp_settings', JSON.stringify(settings));
    alert('설정이 저장되었습니다.');
    
    updatePaymentOptions();
  });

  // Init Data
  renderMembers();
  renderPayments();
  updatePaymentOptions();
});

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
      <td><span class="badge badge-${m.level.toLowerCase()}">${m.level}</span></td>
      <td style="color:var(--text-secondary)">${m.phone}</td>
      <td style="color:var(--text-secondary)">${m.joinDate}</td>
      <td class="admin-only">
        <button class="btn btn-ghost" style="padding:0.25rem 0.5rem; font-size:0.875rem;" onclick="alert('수정')">수정</button>
        <button class="btn btn-ghost" style="padding:0.25rem 0.5rem; font-size:0.875rem; color:var(--danger-color)" onclick="alert('삭제')">삭제</button>
      </td>
    </tr>
  `).join('');
}

function renderPayments() {
  // Dashboard Payments
  const dashTbody = document.getElementById('dashboard-recent-payments');
  dashTbody.innerHTML = payments.map(p => `
    <tr>
      <td>${p.name}</td>
      <td><span class="badge badge-${p.badge}">${p.type}</span></td>
      <td>${p.amount}</td>
      <td>${p.date}</td>
    </tr>
  `).join('');

  // Dues Payments
  const duesTbody = document.getElementById('dues-recent-payments');
  duesTbody.innerHTML = payments.map(p => `
    <tr>
      <td>${p.name}</td>
      <td><span class="badge badge-${p.badge}">${p.type}</span></td>
      <td>${p.amount}</td>
      <td style="${p.discount !== '0원' ? 'color:var(--success-color)' : ''}">${p.discount}</td>
      <td>${p.date}</td>
    </tr>
  `).join('');
}

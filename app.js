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
  // Init Lucide Icons
  lucide.createIcons();
  
  // Set default date to today
  document.getElementById('payment-date').valueAsDate = new Date();

  // Navigation Logic
  const links = document.querySelectorAll('.nav-link');
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

  renderMembers();
  renderPayments();
});

function renderMembers() {
  const tbody = document.getElementById('members-list');
  tbody.innerHTML = members.map(m => `
    <tr>
      <td style="font-weight:500;">${m.name}</td>
      <td><span class="badge badge-${m.level.toLowerCase()}">${m.level}</span></td>
      <td style="color:var(--text-secondary)">${m.phone}</td>
      <td style="color:var(--text-secondary)">${m.joinDate}</td>
      <td>
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

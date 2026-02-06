import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-app.js";
import {
  getDatabase,
  ref,
  push,
  onChildAdded,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/9.22.2/firebase-database.js";

const firebaseConfig = {
  apiKey: "PASTE_YOUR_API_KEY",
  authDomain: "PASTE_YOUR_AUTH_DOMAIN",
  databaseURL: "PASTE_YOUR_DATABASE_URL",
  projectId: "PASTE_YOUR_PROJECT_ID",
  storageBucket: "PASTE_YOUR_STORAGE_BUCKET",
  messagingSenderId: "PASTE_YOUR_SENDER_ID",
  appId: "PASTE_YOUR_APP_ID",
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const messagesRef = ref(db, "catty_chat/messages");

const roleScreen = document.getElementById("role-screen");
const chatScreen = document.getElementById("chat-screen");
const roleButtons = document.querySelectorAll(".icon");
const currentRoleEl = document.getElementById("current-role");
const messagesEl = document.getElementById("messages");
const chatForm = document.getElementById("chat-form");
const messageInput = document.getElementById("message-input");
const clearRoleBtn = document.getElementById("clear-role");
const switchRoleBtn = document.getElementById("switch-role");

const allowedRoles = new Set(["小猫", "中猫"]);
const params = new URLSearchParams(window.location.search);
const roleFromUrl = params.get("role");
const roleFromPage = document.body?.dataset?.role;
let currentRole = localStorage.getItem("catty_role");
if (roleFromPage && allowedRoles.has(roleFromPage)) {
  currentRole = roleFromPage;
} else if (roleFromUrl && allowedRoles.has(roleFromUrl)) {
  currentRole = roleFromUrl;
}

const formatTime = (timestamp) => {
  if (!timestamp) return "现在";
  const date = new Date(timestamp);
  return `${date.getHours().toString().padStart(2, "0")}:${date
    .getMinutes()
    .toString()
    .padStart(2, "0")}`;
};

const showChat = () => {
  if (chatScreen) chatScreen.classList.remove("hidden");
  if (roleScreen) roleScreen.classList.add("hidden");
  if (currentRoleEl) currentRoleEl.textContent = currentRole || "—";
};

const showRoleScreen = () => {
  if (chatScreen) chatScreen.classList.add("hidden");
  if (roleScreen) roleScreen.classList.remove("hidden");
};

const setRole = (role) => {
  if (!allowedRoles.has(role)) return;
  currentRole = role;
  localStorage.setItem("catty_role", role);
  if (window.location.pathname.endsWith("xiaomao.html") || window.location.pathname.endsWith("zhongmao.html")) {
    showChat();
  } else {
    const target = role === "小猫" ? "xiaomao.html" : "zhongmao.html";
    window.location.href = target;
  }
};

roleButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    const role = btn.dataset.role;
    if (!allowedRoles.has(role)) {
      window.location.href = "empty.html";
      return;
    }
    setRole(role);
  });
});

if (clearRoleBtn) {
  clearRoleBtn.addEventListener("click", () => {
    localStorage.removeItem("catty_role");
    currentRole = null;
    showRoleScreen();
  });
}

if (switchRoleBtn) {
  switchRoleBtn.addEventListener("click", () => {
    window.location.href = "index.html";
  });
}

const appendMessage = (message) => {
  if (!messagesEl) return;
  const wrapper = document.createElement("div");
  wrapper.className = "message";
  if (message.role === currentRole) wrapper.classList.add("mine");

  const meta = document.createElement("div");
  meta.className = "meta";
  meta.textContent = `${message.role} · ${formatTime(message.createdAt)}`;

  const text = document.createElement("div");
  text.textContent = message.text;

  wrapper.appendChild(meta);
  wrapper.appendChild(text);
  messagesEl.appendChild(wrapper);
  messagesEl.scrollTop = messagesEl.scrollHeight;
};

if (messagesEl) {
  onChildAdded(messagesRef, (snapshot) => {
    const message = snapshot.val();
    appendMessage(message);
  });
}

if (chatForm) {
  chatForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const text = messageInput.value.trim();
    if (!text || !currentRole) return;

    await push(messagesRef, {
      role: currentRole,
      text,
      createdAt: serverTimestamp(),
    });

    messageInput.value = "";
  });
}

if (
  window.location.pathname.endsWith("xiaomao.html") ||
  window.location.pathname.endsWith("zhongmao.html") ||
  window.location.pathname.endsWith("chat.html")
) {
  if (currentRole && allowedRoles.has(currentRole)) {
    localStorage.setItem("catty_role", currentRole);
    showChat();
  } else {
    window.location.href = "index.html";
  }
} else {
  showRoleScreen();
}

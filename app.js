import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-app.js";
import {
  getDatabase,
  ref,
  push,
  onChildAdded,
  onChildChanged,
  onChildRemoved,
  update,
  remove,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/9.22.2/firebase-database.js";
import {
  getAuth,
  signInAnonymously,
  onAuthStateChanged,
} from "https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyDRZYo7G58N7LbXCD3S_eZctVUbb7nH_f0",
  authDomain: "project-for-storing.firebaseapp.com",
  databaseURL: "https://project-for-storing-default-rtdb.firebaseio.com",
  projectId: "project-for-storing",
  storageBucket: "project-for-storing.firebasestorage.app",
  messagingSenderId: "253098125450",
  appId: "1:253098125450:web:27a52b2e6aee30efabe573",
  measurementId: "G-6QY24NVQCM",
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const auth = getAuth(app);

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

const roleScreen = document.getElementById("role-screen");
const roleButtons = document.querySelectorAll(".icon");
const clearRoleBtn = document.getElementById("clear-role");
const currentRoleEl = document.getElementById("current-role");

const stickerWall = document.getElementById("sticker-wall");
const stickerForm = document.getElementById("sticker-form");
const stickerInput = document.getElementById("sticker-input");

const isOnOperationPage = window.location.pathname.endsWith("operation.html");

const setRole = (role) => {
  if (!allowedRoles.has(role)) return;
  currentRole = role;
  localStorage.setItem("catty_role", role);
  if (!isOnOperationPage) {
    window.location.href = `operation.html?role=${encodeURIComponent(role)}`;
  } else if (currentRoleEl) {
    currentRoleEl.textContent = currentRole;
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
  });
}


const ensureRole = () => {
  if (currentRole && allowedRoles.has(currentRole)) {
    localStorage.setItem("catty_role", currentRole);
    if (currentRoleEl) currentRoleEl.textContent = currentRole;
    return true;
  }
  window.location.href = "index.html";
  return false;
};

const randomColor = () => {
  const palette = [
    "#fff3b0",
    "#fde2e4",
    "#dfe7fd",
    "#e2f0cb",
    "#f8edeb",
    "#fff1e6",
  ];
  return palette[Math.floor(Math.random() * palette.length)];
};

const createStickerNode = (id, data) => {
  const node = document.createElement("div");
  node.className = "sticker";
  node.dataset.id = id;
  node.style.left = `${data.x ?? 20}px`;
  node.style.top = `${data.y ?? 20}px`;
  node.style.background = data.color || randomColor();

  const meta = document.createElement("div");
  meta.className = "sticker-meta";
  meta.textContent = data.role || "—";

  const text = document.createElement("div");
  text.className = "sticker-text";
  text.contentEditable = "true";
  text.spellcheck = false;
  text.textContent = data.text || "";

  node.appendChild(meta);
  node.appendChild(text);

  text.addEventListener("blur", () => {
    const updatedText = text.textContent.trim();
    update(ref(db, `catty_stickers/${id}`), {
      text: updatedText,
      updatedAt: serverTimestamp(),
    });
  });

  node.addEventListener("dblclick", () => {
    remove(ref(db, `catty_stickers/${id}`));
  });

  let dragging = false;
  let startX = 0;
  let startY = 0;
  let originX = 0;
  let originY = 0;

  const onPointerMove = (event) => {
    if (!dragging) return;
    const dx = event.clientX - startX;
    const dy = event.clientY - startY;
    node.style.left = `${originX + dx}px`;
    node.style.top = `${originY + dy}px`;
  };

  const onPointerUp = () => {
    if (!dragging) return;
    dragging = false;
    node.releasePointerCapture(pointerId);
    document.removeEventListener("pointermove", onPointerMove);
    document.removeEventListener("pointerup", onPointerUp);

    const finalX = parseFloat(node.style.left) || 0;
    const finalY = parseFloat(node.style.top) || 0;
    update(ref(db, `catty_stickers/${id}`), {
      x: Math.max(0, finalX),
      y: Math.max(0, finalY),
      updatedAt: serverTimestamp(),
    });
  };

  let pointerId = null;
  node.addEventListener("pointerdown", (event) => {
    if (event.target === text) return;
    dragging = true;
    pointerId = event.pointerId;
    node.setPointerCapture(pointerId);
    startX = event.clientX;
    startY = event.clientY;
    originX = parseFloat(node.style.left) || 0;
    originY = parseFloat(node.style.top) || 0;
    document.addEventListener("pointermove", onPointerMove);
    document.addEventListener("pointerup", onPointerUp);
  });

  return node;
};

const mountStickerWall = () => {
  if (!stickerWall) return;
  const stickersRef = ref(db, "catty_stickers");

  onChildAdded(stickersRef, (snapshot) => {
    const data = snapshot.val();
    const node = createStickerNode(snapshot.key, data);
    stickerWall.appendChild(node);
  });

  onChildChanged(stickersRef, (snapshot) => {
    const data = snapshot.val();
    const existing = stickerWall.querySelector(`[data-id="${snapshot.key}"]`);
    if (!existing) return;
    existing.style.left = `${data.x ?? 20}px`;
    existing.style.top = `${data.y ?? 20}px`;
    existing.style.background = data.color || existing.style.background;
    const text = existing.querySelector(".sticker-text");
    if (text && text.textContent !== data.text) {
      text.textContent = data.text || "";
    }
    const meta = existing.querySelector(".sticker-meta");
    if (meta) meta.textContent = data.role || "—";
  });

  onChildRemoved(stickersRef, (snapshot) => {
    const existing = stickerWall.querySelector(`[data-id="${snapshot.key}"]`);
    if (existing) existing.remove();
  });

  if (stickerForm) {
    stickerForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      const text = stickerInput.value.trim();
      if (!text || !currentRole) return;

      const rect = stickerWall.getBoundingClientRect();
      const x = Math.max(20, rect.width * 0.5 - 80 + (Math.random() * 60 - 30));
      const y = Math.max(20, rect.height * 0.1 + (Math.random() * 40));

      await push(stickersRef, {
        role: currentRole,
        text,
        x,
        y,
        color: randomColor(),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      stickerInput.value = "";
    });
  }
};

if (isOnOperationPage) {
  if (!ensureRole()) {
    // redirected
  } else {
    signInAnonymously(auth).catch((error) => {
      console.error("Anonymous sign-in failed", error);
    });

    onAuthStateChanged(auth, (user) => {
      if (user) mountStickerWall();
    });
  }
}

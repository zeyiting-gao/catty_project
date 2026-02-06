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
  getStorage,
  ref as storageRef,
  uploadBytes,
  getDownloadURL,
  deleteObject,
} from "https://www.gstatic.com/firebasejs/9.22.2/firebase-storage.js";
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
const storage = getStorage(app);
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
const iconGrid = document.querySelector(".icon-grid");

const stickerWall = document.getElementById("sticker-wall");
const stickerForm = document.getElementById("sticker-form");
const stickerInput = document.getElementById("sticker-input");
const stickerImageInput = document.getElementById("sticker-image");

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

const shuffleIcons = () => {
  if (!iconGrid) return;
  const items = Array.from(iconGrid.children);
  for (let i = items.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [items[i], items[j]] = [items[j], items[i]];
  }
  items.forEach((item) => iconGrid.appendChild(item));
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

const MAX_IMAGE_SIZE = 5 * 1024 * 1024;

const createStickerImage = (url) => {
  const image = document.createElement("img");
  image.className = "sticker-media";
  image.src = url;
  image.alt = "贴纸照片";
  image.loading = "lazy";
  return image;
};

const createStickerNode = (id, data) => {
  const node = document.createElement("div");
  node.className = "sticker";
  node.dataset.id = id;
  node.dataset.imagePath = data.imagePath || "";
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
  if (data.imageUrl) {
    node.appendChild(createStickerImage(data.imageUrl));
  }
  node.appendChild(text);

  text.addEventListener("blur", () => {
    const updatedText = text.textContent.trim();
    update(ref(db, `catty_stickers/${id}`), {
      text: updatedText,
      updatedAt: serverTimestamp(),
    });
  });

  node.addEventListener("dblclick", async () => {
    const imagePath = node.dataset.imagePath;
    if (imagePath) {
      try {
        await deleteObject(storageRef(storage, imagePath));
      } catch (error) {
        console.error("Failed to delete sticker image", error);
      }
    }
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
    existing.dataset.imagePath = data.imagePath || "";
    const text = existing.querySelector(".sticker-text");
    if (text && text.textContent !== data.text) {
      text.textContent = data.text || "";
    }
    const meta = existing.querySelector(".sticker-meta");
    if (meta) meta.textContent = data.role || "—";

    const existingImage = existing.querySelector(".sticker-media");
    if (data.imageUrl) {
      if (existingImage) {
        existingImage.src = data.imageUrl;
      } else {
        const textNode = existing.querySelector(".sticker-text");
        const image = createStickerImage(data.imageUrl);
        if (textNode) {
          existing.insertBefore(image, textNode);
        } else {
          existing.appendChild(image);
        }
      }
    } else if (existingImage) {
      existingImage.remove();
    }
  });

  onChildRemoved(stickersRef, (snapshot) => {
    const existing = stickerWall.querySelector(`[data-id="${snapshot.key}"]`);
    if (existing) existing.remove();
  });

  if (stickerForm) {
    const submitButton = stickerForm.querySelector('button[type="submit"]');
    stickerForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      const text = stickerInput.value.trim();
      const file = stickerImageInput?.files?.[0] ?? null;
      if ((!text && !file) || !currentRole) return;

      if (file) {
        if (!file.type.startsWith("image/")) {
          alert("请选择图片文件（JPG/PNG）。");
          return;
        }
        if (file.size > MAX_IMAGE_SIZE) {
          alert("图片大小请小于 5MB。");
          return;
        }
      }

      const rect = stickerWall.getBoundingClientRect();
      const x = Math.max(20, rect.width * 0.5 - 80 + (Math.random() * 60 - 30));
      const y = Math.max(20, rect.height * 0.1 + (Math.random() * 40));

      let imageUrl = "";
      let imagePath = "";

      try {
        if (file) {
          if (submitButton) {
            submitButton.disabled = true;
            submitButton.textContent = "上传中…";
          }
          const extension = file.name?.split(".").pop() || "jpg";
          const imageId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
          imagePath = `catty_stickers_images/${imageId}.${extension}`;
          const imageRef = storageRef(storage, imagePath);
          await uploadBytes(imageRef, file);
          imageUrl = await getDownloadURL(imageRef);
        }

        const payload = {
          role: currentRole,
          text,
          x,
          y,
          color: randomColor(),
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        };

        if (imageUrl) {
          payload.imageUrl = imageUrl;
          payload.imagePath = imagePath;
        }

        await push(stickersRef, payload);
      } catch (error) {
        console.error("Failed to create sticker", error);
        alert("上传失败，请稍后再试。");
        return;
      } finally {
        if (submitButton) {
          submitButton.disabled = false;
          submitButton.textContent = "贴上";
        }
      }

      stickerInput.value = "";
      if (stickerImageInput) stickerImageInput.value = "";
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

if (roleScreen) {
  shuffleIcons();
}

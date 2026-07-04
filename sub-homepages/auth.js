/**
 * auth.js — AltiLearn Shared Auth Module
 * Single source of truth for Firebase config, auth state, nav updates.
 * Import this from every page that needs auth awareness.
 */

import { initializeApp, getApps } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getAuth, onAuthStateChanged, signOut, GoogleAuthProvider
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  getFirestore, doc, getDoc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

/* ── Instant nav pre-render from sessionStorage (no Firebase wait) ── */
(function instantNav() {
  const cached = sessionStorage.getItem("al_auth_state");
  const navRoot = document.getElementById("al-nav-root");
  if (!navRoot || !cached) return;
  try {
    const u = JSON.parse(cached);
    const root = window.location.pathname.includes("/sub-homepages/") ? "../" : "./";
    const isSubPage = root === "../";
    const pfx = isSubPage ? "./" : "sub-homepages/";
    const firstName = u.displayName?.split(" ")[0] || u.email?.split("@")[0] || "Hey";
    const initials = (u.displayName || "AL").split(" ").map(w=>w[0]).join("").slice(0,2).toUpperCase();
    // Quick nav inject — full version replaced when Firebase resolves
    navRoot.innerHTML = `<nav id="al-nav" style="position:fixed;top:0;left:0;right:0;z-index:100;border-bottom:1px solid rgba(255,255,255,.07);background:rgba(11,12,16,.92);backdrop-filter:blur(18px)">
      <div style="display:flex;align-items:center;justify-content:space-between;height:68px;max-width:1100px;margin:0 auto;padding:0 24px">
        <a href="${root}index.html" style="font-family:'Plus Jakarta Sans',sans-serif;font-weight:800;font-size:21px;color:#F2F0EB;text-decoration:none;display:flex;align-items:center;gap:10px">AltiLearn</a>
        <div style="display:flex;align-items:center;gap:12px">
          <div style="width:34px;height:34px;border-radius:50%;background:linear-gradient(135deg,#7B5EFF,#00E5B0);display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:800;color:#07140F;font-family:'Plus Jakarta Sans',sans-serif">${initials}</div>
          <span style="font-size:14px;color:#F2F0EB;font-weight:500">Hi, ${firstName}</span>
          <button id="al-quick-logout" style="background:none;border:none;cursor:pointer;font-size:14px;color:#00E5B0;font-weight:600;padding:6px 12px;border-radius:100px;font-family:inherit">Log out</button>
        </div>
      </div>
    </nav>`;
  } catch(e) {}
})();

/* ── Single Firebase config ── */
export const firebaseConfig = {
  apiKey:            "AIzaSyDPpvSSDrnhoepDgf_ZgI5lSCgTEawljAA",
  authDomain:        "codevent-digital.firebaseapp.com",
  projectId:         "codevent-digital",
  storageBucket:     "codevent-digital.firebasestorage.app",
  messagingSenderId: "840016876762",
  appId:             "1:840016876762:web:16f9228d926fc99a5681e3"
};

/* ── Init once — guard against duplicate app error ── */
const app  = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
export const auth           = getAuth(app);
export const db             = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();

/* ── getCurrentUser ── */
export function getCurrentUser() {
  return auth.currentUser;
}

/* ── onAuthChange wrapper ── */
export function onAuthChange(callback) {
  return onAuthStateChanged(auth, callback);
}

/* ── logout → clears cache → home ── */
export async function logout() {
  sessionStorage.removeItem("al_user");
  await signOut(auth);
  window.location.href = rootPath() + "index.html";
}

/* ── getUserProfile — sessionStorage first, then Firestore ── */
export async function getUserProfile(uid) {
  const cached = sessionStorage.getItem("al_user");
  if (cached) {
    try { return JSON.parse(cached); } catch(_) {}
  }
  try {
    const snap = await getDoc(doc(db, "users", uid));
    if (snap.exists()) {
      const data = snap.data();
      sessionStorage.setItem("al_user", JSON.stringify(data));
      return data;
    }
  } catch(e) { console.warn("Profile fetch:", e); }
  return null;
}

/* ── Detect relative root path (works from any depth) ── */
function rootPath() {
  const path = window.location.pathname;
  return path.includes("/sub-homepages/") ? "../" : "./";
}

/* ── NAV LOGO SVG (shared) ── */
const LOGO_SVG = `<svg width="36" height="36" viewBox="0 0 36 36" fill="none" aria-hidden="true" style="flex-shrink:0">
  <rect width="36" height="36" rx="10" fill="#13141A"/>
  <rect width="36" height="36" rx="10" fill="url(#alg)" opacity=".18"/>
  <path d="M8 27L14.5 9h1.2L22 27" stroke="#F2F0EB" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
  <line x1="10.8" y1="21" x2="19.2" y2="21" stroke="#00E5B0" stroke-width="2.2" stroke-linecap="round"/>
  <path d="M22 9v18h6" stroke="#F2F0EB" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
  <circle cx="28" cy="27" r="1.6" fill="#00E5B0"/>
  <defs><linearGradient id="alg" x1="0" y1="0" x2="36" y2="36" gradientUnits="userSpaceOnUse">
    <stop offset="0%" stop-color="#7B5EFF"/><stop offset="100%" stop-color="#00E5B0"/>
  </linearGradient></defs>
</svg>`;

/* ── CodeVent badge HTML — shown ONLY on auth pages (login / signup) ── */
const CV_BADGE = `
<style>
  .cv-footer {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    padding: 20px 16px 12px;
    border-top: 1px solid rgba(255,255,255,0.1);
    margin-top: 28px;
  }
  .cv-footer-badge {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 5px 12px 5px 7px;
    border-radius: 8px;
    border: 1px solid rgba(255,255,255,0.15);
    background: rgba(255,255,255,0.06);
  }
  .cv-footer-logo {
    width: 24px;
    height: 24px;
    border-radius: 5px;
    object-fit: cover;
    filter: brightness(1.2);
    display: block;
  }
  .cv-footer-dot {
    width: 3px; height: 3px;
    border-radius: 50%;
    background: rgba(255,255,255,0.3);
    flex-shrink: 0;
  }
  .cv-footer-powered {
    font-size: 11.5px;
    color: #C8C6D4;
    letter-spacing: 0.01em;
  }
  .cv-footer-wordmark {
    font-size: 12px;
    font-weight: 600;
    color: #F2F0EB;
    letter-spacing: 0.01em;
  }
  .cv-footer-wordmark b {
    color: #009ce5;
    font-weight: 600;
  }
  .cv-footer-copy {
    font-size: 11px;
    color: #9B99A8;
    text-align: center;
    max-width: 300px;
    line-height: 1.6;
    margin: 0;
  }
</style>
<footer class="cv-footer">
  <div class="cv-footer-badge">
    
  
    <span class="cv-footer-dot"></span>
    <span class="cv-footer-powered">Platform powered by</span>
    <span class="cv-footer-dot"></span>
    <span class="cv-footer-wordmark">Code<b>Vent</b> Digital</span>
  </div>
  <p class="cv-footer-copy">
    AltiLearn is a product of CodeVent Digital, powered by secure Firebase infrastructure.
  </p>
</footer>`;

/* ── Returns true when current page is login.html or signup.html ── */
function isAuthPage() {
  const p = window.location.pathname;
  return p.endsWith("login.html") || p.endsWith("signup.html");
}

/* ── Inject shared nav CSS (called once per page) ── */
function injectNavCSS() {
  if (document.getElementById("al-nav-css")) return;
  const s = document.createElement("style");
  s.id = "al-nav-css";
  s.textContent = `
    #al-nav{position:fixed;top:0;left:0;right:0;z-index:100;border-bottom:1px solid transparent;transition:background .3s,border-color .3s}
    #al-nav.scrolled{background:rgba(11,12,16,.92);backdrop-filter:blur(18px);border-color:rgba(255,255,255,.07)}
    .al-nav-inner{display:flex;align-items:center;justify-content:space-between;height:68px;max-width:1100px;margin:0 auto;padding:0 24px}
    .al-logo{font-family:'Plus Jakarta Sans',sans-serif;font-weight:800;font-size:21px;color:#F2F0EB;text-decoration:none;letter-spacing:-.03em;display:flex;align-items:center;gap:10px}
    .al-nav-links{display:flex;align-items:center;gap:4px;list-style:none}
    .al-nav-links a{font-size:14px;color:#9B99A8;text-decoration:none;padding:6px 12px;border-radius:100px;transition:color .15s,background .15s}
    .al-nav-links a:hover{color:#F2F0EB;background:rgba(255,255,255,.06)}
    .al-nav-ctas{display:flex;align-items:center;gap:10px}
    .al-btn-primary{display:inline-flex;align-items:center;gap:6px;padding:9px 20px;border-radius:100px;background:#00E5B0;color:#07140F;font-weight:700;font-size:14px;text-decoration:none;border:none;cursor:pointer;font-family:inherit;transition:box-shadow .2s,transform .2s;will-change:transform}
    .al-btn-primary:hover{box-shadow:0 0 22px rgba(0,229,176,0.35);transform:translateY(-1px)}
    .al-btn-ghost{display:inline-flex;align-items:center;padding:9px 20px;border-radius:100px;background:transparent;color:#F2F0EB;border:1px solid rgba(255,255,255,.15);font-size:14px;font-weight:500;text-decoration:none;transition:border-color .15s,transform .18s;will-change:transform}
    .al-btn-ghost:hover{border-color:rgba(255,255,255,.3);transform:translateY(-1px)}
    .al-user-wrap{display:flex;align-items:center;gap:12px}
    .al-avatar{width:34px;height:34px;border-radius:50%;background:linear-gradient(135deg,#7B5EFF,#00E5B0);display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:800;color:#07140F;font-family:'Plus Jakarta Sans',sans-serif;flex-shrink:0;cursor:default}
    .al-hi{font-size:14px;color:#F2F0EB;font-weight:500}
    .al-logout{background:none;border:none;cursor:pointer;font-size:14px;color:#00E5B0;font-weight:600;padding:6px 14px;border-radius:100px;transition:background .15s,opacity .15s;font-family:inherit;display:inline-flex;align-items:center;gap:8px}
    .al-logout:hover{background:rgba(0,229,176,0.1)}
    .al-logout:disabled{opacity:.55;cursor:not-allowed}
    .al-logout-sp{display:none;width:13px;height:13px;border:2px solid rgba(0,229,176,0.3);border-top-color:#00E5B0;border-radius:50%;animation:al-spin .6s linear infinite;flex-shrink:0}
    .al-logout.loading .al-logout-sp{display:block}
    .al-logout.loading .al-logout-label{opacity:.7}
    @keyframes al-spin{to{transform:rotate(360deg)}}
    .al-mob-toggle{display:none;background:none;border:none;cursor:pointer;color:#F2F0EB;padding:4px}
    .al-mob-nav{display:none;position:fixed;top:68px;left:0;right:0;background:rgba(11,12,16,.97);backdrop-filter:blur(18px);border-bottom:1px solid rgba(255,255,255,.07);z-index:99;padding:20px 24px;flex-direction:column;gap:4px}
    .al-mob-nav.open{display:flex}
    .al-mob-nav a,.al-mob-nav button{color:#9B99A8;text-decoration:none;font-size:15px;padding:11px 0;border-bottom:1px solid rgba(255,255,255,.07);background:none;border-left:none;border-right:none;border-top:none;cursor:pointer;font-family:inherit;text-align:left;display:block;width:100%}
    .al-mob-nav a:last-child,.al-mob-nav button:last-child{border-bottom:none}
    @media(max-width:860px){.al-nav-links{display:none}.al-mob-toggle{display:block}}
  `;
  document.head.appendChild(s);
}

/**
 * updateNavForAuth(user)
 * Injects the nav into any element with id="al-nav-root"
 * Call once per page after DOM ready.
 */
export async function updateNavForAuth(user) {
  const _user = user;
  injectNavCSS();

  const root = rootPath();
  const isSubPage = root === "../";
  const pfx = isSubPage ? "./" : "sub-homepages/";

  const links = [
    { label: "Courses",  href: pfx + "courses.html" },
    { label: "Paths",    href: pfx + "paths.html" },
    { label: "Teach",    href: pfx + "teach.html" },
    { label: "Pricing",  href: pfx + "pricing.html" },
  ];

  const navLinks = links.map(l =>
    `<li><a href="${l.href}">${l.label}</a></li>`
  ).join("");

  let ctaHTML = "";
  let mobExtra = "";

  if (user) {
    let firstName = user.displayName?.split(" ")[0] || user.email?.split("@")[0] || "Hey";
    const initials = (user.displayName || "AL").split(" ").map(w => w[0]).join("").slice(0,2).toUpperCase();

    const cached = sessionStorage.getItem("al_user");
    if (cached) {
      try {
        const p = JSON.parse(cached);
        if (p.firstName) firstName = p.firstName;
      } catch(_) {}
    }

    ctaHTML = `
      <div class="al-user-wrap">
        <div class="al-avatar" title="${user.email}">${initials}</div>
        <span class="al-hi">Hi, ${firstName}</span>
        <button class="al-logout" id="al-logout-btn" aria-label="Log out">
          <span class="al-logout-label">Log out</span>
          <span class="al-logout-sp" aria-hidden="true"></span>
        </button>
      </div>`;
    mobExtra = `<button id="al-mob-logout">Log out</button>`;
  } else {
    const authPfx = isSubPage ? "./" : "sub-homepages/";
    ctaHTML = `
      <a href="${authPfx}login.html" class="al-btn-ghost">Log in</a>
      <a href="${authPfx}signup.html" class="al-btn-primary">Start free</a>`;
    mobExtra = `
      <a href="${authPfx}login.html">Log in</a>
      <a href="${authPfx}signup.html" style="color:#00E5B0;font-weight:600">Start learning →</a>`;
  }

  /* CodeVent badge — only on login.html and signup.html */
  const cvBadge = isAuthPage() ? CV_BADGE : "";

  const navHTML = `
    <nav id="al-nav">
      <div class="al-nav-inner">
        <a href="${root}index.html" class="al-logo" aria-label="AltiLearn home">${LOGO_SVG}AltiLearn</a>
        <ul class="al-nav-links">${navLinks}</ul>
        <div class="al-nav-ctas">${ctaHTML}</div>
        <button class="al-mob-toggle" id="al-mob-toggle" aria-label="Menu" aria-expanded="false">
          <svg width="22" height="16" viewBox="0 0 22 16" fill="none">
            <rect y="0" width="22" height="2" rx="1" fill="currentColor"/>
            <rect y="7" width="16" height="2" rx="1" fill="currentColor"/>
            <rect y="14" width="22" height="2" rx="1" fill="currentColor"/>
          </svg>
        </button>
      </div>
    </nav>
    <nav class="al-mob-nav" id="al-mob-nav">
      <a href="${pfx}courses.html">Browse Courses</a>
      <a href="${pfx}paths.html">Learning Paths</a>
      <a href="${pfx}teach.html">Teach on AltiLearn</a>
      <a href="${pfx}pricing.html">Pricing</a>
      ${mobExtra}
    </nav>
    ${cvBadge}`;

  /* Inject nav */
  const navRoot = document.getElementById("al-nav-root");
  if (navRoot) navRoot.innerHTML = navHTML;

  /* Persist auth state */
  if (user) {
    sessionStorage.setItem("al_auth_state", JSON.stringify({
      uid: user.uid,
      displayName: user.displayName,
      email: user.email
    }));
  } else {
    sessionStorage.removeItem("al_auth_state");
  }

  /* Wire instant logout */
  document.getElementById("al-quick-logout")?.addEventListener("click", async () => {
    const btn = document.getElementById("al-quick-logout");
    if (btn) { btn.textContent = "Logging out..."; btn.disabled = true; }
    await logout();
  });

  /* Wire scroll */
  window.addEventListener("scroll", () => {
    document.getElementById("al-nav")?.classList.toggle("scrolled", window.scrollY > 40);
  }, { passive: true });

  /* Wire mobile toggle */
  document.getElementById("al-mob-toggle")?.addEventListener("click", () => {
    const mn = document.getElementById("al-mob-nav");
    const open = mn.classList.toggle("open");
    document.getElementById("al-mob-toggle").setAttribute("aria-expanded", open);
  });

  /* Update page CTAs based on auth state */
  function updatePageCTAs(user) {
    if (!user) return;
    document.querySelectorAll('a[href*="signup.html"]').forEach(btn => {
      if (btn.closest("#al-nav-root")) return;
      btn.href = (rootPath() === "../" ? "./" : "sub-homepages/") + "courses.html";
      if (btn.textContent.includes("Start Pro trial")) btn.textContent = "Browse courses";
      if (btn.textContent.includes("Get started free")) btn.textContent = "Continue learning";
      if (btn.textContent.includes("Start learning free")) btn.textContent = "Continue learning →";
      if (btn.textContent.includes("Start for free")) btn.textContent = "Continue learning →";
    });
  }

  /* Wire logout */
  async function doLogout(btn) {
    if (!btn || btn.disabled) return;
    btn.disabled = true;
    btn.classList.add("loading");
    if (!btn.querySelector(".al-logout-sp")) btn.textContent = "Logging out...";
    await logout();
  }

  updatePageCTAs(user);
  document.getElementById("al-logout-btn")?.addEventListener("click", function(){ doLogout(this); });
  document.getElementById("al-mob-logout")?.addEventListener("click", function(){ doLogout(this); });
}
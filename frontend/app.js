/* ============================================================
   NEBULA ANIME — Core Application
   ============================================================ */

// ── API Config ──────────────────────────────────────────────
const BACKEND_BASE_URL = (window.location.hostname === '127.0.0.1' || window.location.hostname === 'localhost' || window.location.hostname === '')
  ? 'http://127.0.0.1:8000'
  : 'https://animerecdevbackend.lemonflower-23acd856.southindia.azurecontainerapps.io';

const API_URL = `${BACKEND_BASE_URL}/api/anime`;

// ── Mock Data ────────────────────────────────────────────────
// MAL CDN blocks hotlinking — images are proxied through the Jikan API's
// image endpoint which serves them with permissive CORS headers.
// Format: https://api.jikan.moe/v4/anime/{mal_id}/pictures  (we use the
// direct image path that Jikan itself exposes, which is the same CDN URL
// but requested server-side). For the static mock we use the Jikan-hosted
// copies via their media proxy at:  https://cdn.myanimelist.net  with the
// correct Referer — since we can't set Referer from JS we instead use the
// publicly available image mirrors from the Jikan v4 REST responses.
// The cleanest zero-dependency fix for a static frontend is to use the
// Jikan /anime/{id} endpoint to get a fresh image URL at runtime.

const MAL_IDS = {
  1:  52991,   // Frieren
  2:  5114,    // FMA Brotherhood
  3:  9253,    // Steins;Gate
  4:  16498,   // Attack on Titan
  5:  1535,    // Death Note
  6:  11061,   // HxH 2011
  7:  19,      // Monster
  8:  30,      // NGE
  9:  199,     // Spirited Away
  10: 32281,   // Your Name
};

const MOCK_DATA = [
  { id:1,  mal_id:52991, title:'Frieren: Beyond Journey\'s End',    genres:'Adventure, Drama, Fantasy',          score:9.3, episodes:28,  synopsis:'An elven mage and her former party members successfully defeat the Demon King and bring peace to the land. As an elf with a near-immortal lifespan, Frieren goes on a journey to learn more about humans after her dear companions pass away.',                                                                                    image_url:'https://cdn.myanimelist.net/images/anime/1015/138025.jpg' },
  { id:2,  mal_id:5114,  title:'Fullmetal Alchemist: Brotherhood',  genres:'Action, Adventure, Drama, Fantasy',  score:9.1, episodes:64,  synopsis:'Two brothers lose their mother and attempt a forbidden alchemical ritual to bring her back, losing their own body parts in the process. They embark on a quest to find the legendary Philosopher\'s Stone to restore their bodies.',                                                                                              image_url:'https://cdn.myanimelist.net/images/anime/1208/94745.jpg' },
  { id:3,  mal_id:9253,  title:'Steins;Gate',                       genres:'Drama, Sci-Fi, Suspense',            score:9.0, episodes:24,  synopsis:'A self-proclaimed mad scientist and his eccentric laboratory club accidentally discover a method of sending text messages to the past, altering their present and triggering a desperate race against time to prevent a dystopian future.',                                                                                    image_url:'https://cdn.myanimelist.net/images/anime/1935/127974.jpg' },
  { id:4,  mal_id:16498, title:'Attack on Titan',                   genres:'Action, Drama, Suspense',            score:8.8, episodes:25,  synopsis:'Humanity is forced to live inside three massive concentric walls to protect themselves from giant, man-eating humanoids called Titans. When a colossal Titan breaches the outermost wall, young Eren Yeager vows to eradicate every single Titan.',                                                                          image_url:'https://cdn.myanimelist.net/images/anime/10/47347.jpg' },
  { id:5,  mal_id:1535,  title:'Death Note',                        genres:'Drama, Suspense, Thriller',          score:8.6, episodes:37,  synopsis:'High school student Light Yagami discovers a supernatural notebook that grants him the power to kill anyone whose name and face he knows. He begins a global vigilante crusade to rid the world of criminals, pursued by the genius detective L.',                                                                            image_url:'https://cdn.myanimelist.net/images/anime/9/9453.jpg' },
  { id:6,  mal_id:11061, title:'Hunter x Hunter (2011)',            genres:'Action, Adventure, Fantasy',         score:9.0, episodes:148, synopsis:'Gon Freecss aspires to become a Hunter, an exceptional individual licensed to trace treasures, beasts, and individuals. He embarks on a journey to find his father, facing extreme challenges alongside his loyal friends.',                                                                                              image_url:'https://cdn.myanimelist.net/images/anime/1337/99013.jpg' },
  { id:7,  mal_id:19,    title:'Monster',                           genres:'Drama, Mystery, Thriller',           score:8.9, episodes:74,  synopsis:'Brilliant neurosurgeon Dr. Kenzou Tenma saves the life of a young boy over that of a prominent politician. Years later, Tenma discovers that the boy he saved has grown up to become a charismatic and ruthless serial killer.',                                                                                          image_url:'https://cdn.myanimelist.net/images/anime/10/18740.jpg' },
  { id:8,  mal_id:30,    title:'Neon Genesis Evangelion',           genres:'Action, Drama, Sci-Fi, Mecha',       score:8.3, episodes:26,  synopsis:'In a futuristic world threatened by giant alien beings known as Angels, teenager Shinji Ikari is recruited by his estranged father to pilot a colossal bio-mechanical mecha called Evangelion to defend humanity.',                                                                                                  image_url:'https://cdn.myanimelist.net/images/anime/10/19083.jpg' },
  { id:9,  mal_id:199,   title:'Spirited Away',                     genres:'Adventure, Fantasy',                 score:8.8, episodes:1,   synopsis:'Ten-year-old Chihiro and her parents stumble upon an abandoned amusement park. After her parents are turned into pigs by a mysterious curse, Chihiro must work in a spiritual bathhouse to free them and find a way back home.',                                                                                          image_url:'https://cdn.myanimelist.net/images/anime/6/79597.jpg' },
  { id:10, mal_id:32281, title:'Your Name.',                        genres:'Drama, Romance, Supernatural',       score:8.8, episodes:1,   synopsis:'Two high school teenagers, Mitsuha in the countryside and Taki in Tokyo, suddenly and inexplicably begin to swap bodies. As they learn to adapt, they attempt to meet in person, uncovering a profound secret.',                                                                                                        image_url:'https://cdn.myanimelist.net/images/anime/5/87048.jpg' },
];

// Fetch fresh image URLs from Jikan API (bypasses MAL hotlink block)
async function enrichImagesFromJikan(data) {
  const updated = await Promise.allSettled(
    data.map(async anime => {
      try {
        const res = await fetch(`https://api.jikan.moe/v4/anime/${anime.mal_id}`);
        if (!res.ok) return anime;
        const json = await res.json();
        const img  = json?.data?.images?.jpg?.large_image_url
                  || json?.data?.images?.jpg?.image_url;
        return img ? { ...anime, image_url: img } : anime;
      } catch {
        return anime;
      }
    })
  );
  return updated.map((r, i) => r.status === 'fulfilled' ? r.value : data[i]);
}

let animeData = [];

// ── DOM refs ─────────────────────────────────────────────────
const $ = id => document.getElementById(id);
const track        = $('anime-track');
const statusBadge  = $('backend-status');
const navRight     = document.querySelector('.nav-right');
const loginBtn     = $('btn-login');
const signupBtn    = $('btn-signup');
let userGreeting   = $('user-greeting');
const heroBackdrop = $('hero-backdrop');
const heroPoster   = $('hero-poster');
const heroTitle    = $('hero-title');
const heroScore    = $('hero-score');
const heroEp       = $('hero-episodes');
const heroGenres   = $('hero-genres');
const heroSynopsis = $('hero-synopsis');
const heroInfoBtn  = $('hero-info-btn');
const modalOverlay = $('modal-overlay');
const modalClose   = $('modal-close');

// ============================================================
// AUTH STATE
// ============================================================

const AUTH_KEY = 'nebula_token';
const USER_KEY = 'nebula_user';

function getStoredUser() {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

function storeSession(token, user) {
  localStorage.setItem(AUTH_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

function clearSession() {
  localStorage.removeItem(AUTH_KEY);
  localStorage.removeItem(USER_KEY);
}

function setAuthNavState(user) {
  const guestEl   = $('nav-auth-guest');
  const userEl    = $('nav-auth-user');
  const greetEl   = $('nav-greeting');
  const bannerEl  = $('user-hero-banner');
  const bannerGreet = $('user-hero-greeting');
  const bannerAvatar = $('user-hero-avatar');

  if (user) {
    guestEl.classList.add('hidden');
    userEl.classList.remove('hidden');
    greetEl.textContent = `Hi, ${user.username}`;

    // Show personalised banner below hero
    if (bannerEl) {
      bannerEl.classList.remove('hidden');
      bannerGreet.textContent = `Welcome back, ${user.username}!`;
      bannerAvatar.textContent = user.username.charAt(0).toUpperCase();
    }
  } else {
    guestEl.classList.remove('hidden');
    userEl.classList.add('hidden');
    if (bannerEl) bannerEl.classList.add('hidden');
  }
}

// ============================================================
// STARFIELD CANVAS
// ============================================================
function initStarfield() {
  const canvas = $('starfield');
  const ctx    = canvas.getContext('2d');

  let W, H, stars = [], shootingStars = [];

  // Star class
  class Star {
    constructor() { this.reset(true); }
    reset(initial = false) {
      this.x     = Math.random() * W;
      this.y     = initial ? Math.random() * H : -2;
      this.r     = Math.random() * 1.4 + 0.2;
      this.alpha = Math.random() * 0.7 + 0.2;
      this.speed = Math.random() * 0.08 + 0.01;
      this.twinkleSpeed = Math.random() * 0.02 + 0.005;
      this.twinkleDir   = Math.random() > 0.5 ? 1 : -1;
      this.baseAlpha    = this.alpha;
    }
    update() {
      this.alpha += this.twinkleSpeed * this.twinkleDir;
      if (this.alpha > this.baseAlpha + 0.3 || this.alpha < this.baseAlpha - 0.3) {
        this.twinkleDir *= -1;
      }
      this.alpha = Math.max(0.05, Math.min(1, this.alpha));
    }
    draw() {
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255,255,255,${this.alpha})`;
      ctx.fill();
    }
  }

  // Shooting star class
  class ShootingStar {
    constructor() {
      this.x     = Math.random() * W * 0.7 + W * 0.1;
      this.y     = Math.random() * H * 0.4;
      this.len   = Math.random() * 120 + 60;
      this.speed = Math.random() * 8 + 6;
      this.angle = Math.PI / 4 + (Math.random() - 0.5) * 0.3;
      this.alpha = 1;
      this.decay = Math.random() * 0.015 + 0.012;
      this.active = true;
    }
    update() {
      this.x    += Math.cos(this.angle) * this.speed;
      this.y    += Math.sin(this.angle) * this.speed;
      this.alpha -= this.decay;
      if (this.alpha <= 0) this.active = false;
    }
    draw() {
      const tailX = this.x - Math.cos(this.angle) * this.len;
      const tailY = this.y - Math.sin(this.angle) * this.len;
      const grad  = ctx.createLinearGradient(tailX, tailY, this.x, this.y);
      grad.addColorStop(0, `rgba(255,255,255,0)`);
      grad.addColorStop(0.6, `rgba(200,220,255,${this.alpha * 0.4})`);
      grad.addColorStop(1, `rgba(255,255,255,${this.alpha})`);
      ctx.beginPath();
      ctx.moveTo(tailX, tailY);
      ctx.lineTo(this.x, this.y);
      ctx.strokeStyle = grad;
      ctx.lineWidth   = 1.5;
      ctx.stroke();
      // bright tip
      ctx.beginPath();
      ctx.arc(this.x, this.y, 1.5, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255,255,255,${this.alpha})`;
      ctx.fill();
    }
  }

  function resize() {
    W = canvas.width  = window.innerWidth;
    H = canvas.height = window.innerHeight;
    // Rebuild stars on resize
    const count = Math.floor((W * H) / 5000);
    stars = Array.from({ length: Math.min(count, 280) }, () => new Star());
  }

  // Spawn shooting stars periodically
  let shootTimer = 0;
  function spawnShootingStar() {
    shootingStars.push(new ShootingStar());
  }

  function loop(ts) {
    ctx.clearRect(0, 0, W, H);

    // Draw & update stars
    stars.forEach(s => { s.update(); s.draw(); });

    // Shooting stars
    shootTimer++;
    if (shootTimer > 220) {
      spawnShootingStar();
      if (Math.random() > 0.6) spawnShootingStar(); // occasional double
      shootTimer = 0;
    }
    shootingStars = shootingStars.filter(s => s.active);
    shootingStars.forEach(s => { s.update(); s.draw(); });

    requestAnimationFrame(loop);
  }

  window.addEventListener('resize', resize);
  resize();
  requestAnimationFrame(loop);
}

// ============================================================
// NAVBAR SCROLL EFFECT
// ============================================================
function initNavbar() {
  const navbar = document.getElementById('navbar');
  window.addEventListener('scroll', () => {
    navbar.classList.toggle('scrolled', window.scrollY > 20);
  }, { passive: true });
}

// ============================================================
// ANIME FUN FACTS
// ============================================================
const ANIME_FACTS = [
  "Dragon Ball Z was so popular in France during the 90s that it was broadcast twice a day, making Goku a bigger cultural icon there than Mickey Mouse.",
  "The word 'anime' is simply the Japanese abbreviation of the English word 'animation' — in Japan it refers to all animation, not just Japanese cartoons.",
  "One Piece has been running since 1997 and holds the Guinness World Record for the most copies published for the same comic book series by a single author.",
  "Hayao Miyazaki came out of retirement at least four times. His studio, Studio Ghibli, was founded in 1985 and has never made a film that lost money theatrically.",
  "Neon Genesis Evangelion was originally cancelled mid-production due to budget cuts, which is why the final two episodes are almost entirely still frames and monologues.",
  "Attack on Titan's creator Hajime Isayama drew the entire manga himself — no assistants — which is almost unheard of for a series of that scale.",
  "The Pokémon anime episode 'Dennō Senshi Porygon' triggered seizures in 685 Japanese children in 1997 due to rapidly flashing red and blue lights.",
  "Fullmetal Alchemist: Brotherhood was completed in just 64 episodes, yet covers more story than the original 51-episode series which ran simultaneously.",
  "Spirited Away became the first anime film to win an Academy Award for Best Animated Feature in 2003, beating Ice Age and Lilo & Stitch.",
  "Death Note's writer Tsugumi Ohba originally planned for Light Yagami to be a detective who uses the Death Note to catch criminals — not a villain.",
  "Steins;Gate is based on real physics theories. The 'divergence meter' references John Titor, a famous internet figure who claimed to be a time traveller from 2036.",
  "Hunter x Hunter has been on hiatus so many times that its author Yoshihiro Togashi is a meme — the manga has been running since 1998 with over 40 hiatuses.",
  "The iconic Naruto run — arms back, leaning forward — was designed to make Naruto look like he was carrying a heavy scroll on his back at all times.",
  "Cowboy Bebop's soundtrack was composed before the animation was made. Director Shinichiro Watanabe told composer Yoko Kanno the mood, and animated to her music.",
  "My Hero Academia's author Kohei Horikoshi drew the entire first chapter in just one week as a pitch, and it was approved immediately by Weekly Shonen Jump.",
];

function getRandomFact() {
  return ANIME_FACTS[Math.floor(Math.random() * ANIME_FACTS.length)];
}

// ============================================================
// ERROR SCREEN
// ============================================================
function showErrorScreen() {
  const screen = document.getElementById('error-screen');
  const factEl = document.getElementById('error-fact-text');
  factEl.textContent = getRandomFact();
  screen.classList.add('visible');
  document.getElementById('hero').style.display    = 'none';
  document.querySelector('.main-content').style.display = 'none';
}

function hideErrorScreen() {
  document.getElementById('error-screen').classList.remove('visible');
  document.getElementById('hero').style.display    = '';
  document.querySelector('.main-content').style.display = '';
}

function initErrorScreen() {
  document.getElementById('error-retry-btn').addEventListener('click', () => {
    hideErrorScreen();
    fetchData();
  });
  document.getElementById('error-demo-btn').addEventListener('click', () => {
    hideErrorScreen();
    loadDemoMode();
  });
}

async function loadDemoMode() {
  animeData = await enrichImagesFromJikan(MOCK_DATA);
  setStatus(false);
  renderHero(animeData[0]);
  renderCards(animeData);
}

// ============================================================
// DATA FETCHING
// ============================================================
async function fetchData() {
  // Show skeletons while loading
  track.innerHTML = Array(6).fill('<div class="skeleton-card"></div>').join('');

  try {
    const controller = new AbortController();
    const timeout    = setTimeout(() => controller.abort(), 6000); // 6s timeout
    const res = await fetch(API_URL, { signal: controller.signal });
    clearTimeout(timeout);

    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    animeData = await res.json();
    setStatus(true);
    animeData = await enrichImagesFromJikan(animeData);
    renderHero(animeData[0]);
    renderCards(animeData);
  } catch (err) {
    // Show error screen — user can retry or continue in demo mode
    showErrorScreen();
  }
}

function setStatus(online) {
  statusBadge.textContent = online ? '● Local Dev Mode' : '● Demo Mode';
  statusBadge.className   = `status-badge ${online ? 'online' : 'offline'}`;
}

// ============================================================
// HERO
// ============================================================
function renderHero(anime) {
  if (!anime) return;
  heroBackdrop.style.backgroundImage = `url('${anime.image_url}')`;
  heroPoster.src    = anime.image_url;
  heroPoster.alt    = anime.title;
  heroPoster.onerror = () => {
    heroPoster.onerror = null;
    heroPoster.src = `https://placehold.co/240x340/0b0d17/7c3aed?text=${encodeURIComponent(anime.title.slice(0,12))}`;
  };
  heroTitle.textContent    = anime.title;
  heroScore.textContent    = `⭐ ${anime.score}/10`;
  heroEp.textContent       = `${anime.episodes} Episodes`;
  heroGenres.textContent   = anime.genres;
  heroSynopsis.textContent = anime.synopsis;
  heroInfoBtn.onclick = () => openModal(anime);
}

// ============================================================
// CARDS
// ============================================================
function renderCards(list) {
  track.innerHTML = '';
  list.forEach(anime => {
    const card = document.createElement('div');
    card.className = 'anime-card';
    card.innerHTML = `
      <img src="${anime.image_url}" alt="${anime.title}" class="card-img" loading="lazy"
           onerror="this.onerror=null;this.src='https://placehold.co/185x275/0b0d17/7c3aed?text=${encodeURIComponent(anime.title.slice(0,12))}'">
      <div class="card-overlay">
        <h3 class="card-title">${anime.title}</h3>
        <div class="card-bottom">
          <span class="card-score">⭐ ${anime.score}</span>
          <span class="card-genre">${anime.genres.split(',')[0].trim()}</span>
        </div>
      </div>`;
    card.addEventListener('click', () => openModal(anime));
    track.appendChild(card);
  });
}

// ============================================================
// SCROLL BUTTONS
// ============================================================
function initScroll() {
  $('slide-left').addEventListener('click',  () => track.scrollBy({ left: -460, behavior: 'smooth' }));
  $('slide-right').addEventListener('click', () => track.scrollBy({ left:  460, behavior: 'smooth' }));
}

// ============================================================
// MODAL
// ============================================================
function openModal(anime) {
  const modalImg = $('modal-img');
  modalImg.src = anime.image_url;
  modalImg.alt = anime.title;
  modalImg.onerror = () => {
    modalImg.onerror = null;
    modalImg.src = `https://placehold.co/220x380/0b0d17/7c3aed?text=${encodeURIComponent(anime.title.slice(0,12))}`;
  };
  $('modal-title').textContent = anime.title;
  $('modal-score').textContent = `⭐ ${anime.score}/10`;
  $('modal-episodes').textContent = `${anime.episodes} Episodes`;
  $('modal-synopsis-text').textContent = anime.synopsis;

  // Genre tags
  const genreWrap = $('modal-genres');
  genreWrap.innerHTML = anime.genres.split(',')
    .map(g => `<span class="genre-tag">${g.trim()}</span>`)
    .join('');

  modalOverlay.classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeModal() {
  modalOverlay.classList.remove('open');
  document.body.style.overflow = '';
}

function initModal() {
  modalClose.addEventListener('click', closeModal);
  modalOverlay.addEventListener('click', e => { if (e.target === modalOverlay) closeModal(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });
}

// ============================================================
// AUTH MODALS
// ============================================================
function initAuth() {
  const overlay    = $('auth-overlay');
  const closeBtn   = $('auth-close');
  const loginBtn   = $('btn-login');
  const signupBtn  = $('btn-signup');
  const logoutBtn  = $('btn-logout');
  const tabLogin   = $('tab-login');
  const tabSignup  = $('tab-signup');
  const formLogin  = $('form-login');
  const formSignup = $('form-signup');

  // Restore session on load
  const storedUser = getStoredUser();
  if (storedUser) setAuthNavState(storedUser);

  // ── Tab switching ──
  function showTab(tab) {
    const isLogin = tab === 'login';
    tabLogin.classList.toggle('active', isLogin);
    tabSignup.classList.toggle('active', !isLogin);
    formLogin.classList.toggle('hidden', !isLogin);
    formSignup.classList.toggle('hidden', isLogin);
    $('login-error').classList.add('hidden');
    $('signup-error').classList.add('hidden');
  }

  tabLogin.addEventListener('click',  () => showTab('login'));
  tabSignup.addEventListener('click', () => showTab('signup'));

  // Switch links inside forms
  document.querySelectorAll('.auth-switch-link').forEach(el => {
    el.addEventListener('click', () => showTab(el.dataset.target));
  });

  // ── Open / close ──
  function openModal(tab = 'login') {
    showTab(tab);
    overlay.classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  function closeModal() {
    overlay.classList.remove('open');
    document.body.style.overflow = '';
  }

  loginBtn.addEventListener('click',  () => openModal('login'));
  signupBtn.addEventListener('click', () => openModal('signup'));
  closeBtn.addEventListener('click',  closeModal);
  overlay.addEventListener('click', e => { if (e.target === overlay) closeModal(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && overlay.classList.contains('open')) closeModal(); });

  // ── Logout ──
  logoutBtn.addEventListener('click', () => {
    clearSession();
    setAuthNavState(null);
  });

  // ── Login submit ──
  formLogin.addEventListener('submit', async e => {
    e.preventDefault();
    const errEl  = $('login-error');
    const btn    = $('login-submit');
    const email  = $('login-email').value.trim();
    const pass   = $('login-password').value;

    errEl.classList.add('hidden');
    btn.disabled = true;
    btn.textContent = 'Logging in…';

    try {
      const res  = await fetch(`${BACKEND_BASE_URL}/api/auth/login`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ email, password: pass }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Login failed.');

      storeSession(data.token, { username: data.username, email: data.email });
      setAuthNavState({ username: data.username, email: data.email });
      closeModal();
    } catch (err) {
      errEl.textContent = err.message;
      errEl.classList.remove('hidden');
    } finally {
      btn.disabled = false;
      btn.textContent = 'Log In';
    }
  });

  // ── Signup submit ──
  formSignup.addEventListener('submit', async e => {
    e.preventDefault();
    const errEl    = $('signup-error');
    const btn      = $('signup-submit');
    const username = $('signup-username').value.trim();
    const email    = $('signup-email').value.trim();
    const pass     = $('signup-password').value;

    errEl.classList.add('hidden');
    btn.disabled = true;
    btn.textContent = 'Creating account…';

    try {
      const res  = await fetch(`${BACKEND_BASE_URL}/api/auth/register`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ email, password: pass, username: username || undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Registration failed.');

      storeSession(data.token, { username: data.username, email: data.email });
      setAuthNavState({ username: data.username, email: data.email });
      closeModal();
    } catch (err) {
      errEl.textContent = err.message;
      errEl.classList.remove('hidden');
    } finally {
      btn.disabled = false;
      btn.textContent = 'Create Account';
    }
  });
}

// ============================================================
// FLOATING CHAT WIDGET LOGIC
// ============================================================
const CHAT_API_URL = `${BACKEND_BASE_URL}/api/chat`;
const ME_API_URL = `${BACKEND_BASE_URL}/api/me`;
const FRONTEND_AUTH_URL = '/.auth/me';

let chatHistory = [
  {
    role: 'ai',
    message: 'Hello! I am your Nebula AI assistant. 🌌 Ask me anything about anime, ratings, genres, or for personalized recommendations!',
    timestamp: new Date()
  }
];

// Local Dev Mode does not require fetchCurrentUser or normalizeClientPrincipal.

function formatMarkdown(text) {
  if (!text) return '';
  
  // Escape HTML tags to prevent XSS
  let html = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
    
  // Format code blocks / inline code
  html = html.replace(/`([^`]+)`/g, '<code>$1</code>');
  
  // Format bold text
  html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/__([^_]+)__/g, '<strong>$1</strong>');
  
  // Format italic text
  html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>');
  html = html.replace(/_([^_]+)_/g, '<em>$1</em>');
  
  // Format bullet and numbered lists
  const lines = html.split('\n');
  let inList = false;
  let inNumList = false;
  let formattedLines = [];
  
  for (let i = 0; i < lines.length; i++) {
    let line = lines[i].trim();
    
    // Bullet list item
    if (line.startsWith('- ') || line.startsWith('* ')) {
      if (!inList) {
        if (inNumList) {
          formattedLines.push('</ol>');
          inNumList = false;
        }
        formattedLines.push('<ul>');
        inList = true;
      }
      formattedLines.push(`<li>${line.substring(2)}</li>`);
    } 
    // Numbered list item
    else if (/^\d+\.\s+/.test(line)) {
      if (!inNumList) {
        if (inList) {
          formattedLines.push('</ul>');
          inList = false;
        }
        formattedLines.push('<ol>');
        inNumList = true;
      }
      const matchLength = line.match(/^\d+\.\s+/)[0].length;
      formattedLines.push(`<li>${line.substring(matchLength)}</li>`);
    } 
    // Regular paragraph line
    else {
      if (inList) {
        formattedLines.push('</ul>');
        inList = false;
      }
      if (inNumList) {
        formattedLines.push('</ol>');
        inNumList = false;
      }
      if (line !== '') {
        formattedLines.push(`<p>${line}</p>`);
      }
    }
  }
  
  if (inList) formattedLines.push('</ul>');
  if (inNumList) formattedLines.push('</ol>');
  
  return formattedLines.join('');
}

function scrollToBottom() {
  const container = $('chat-messages');
  if (container) {
    container.scrollTop = container.scrollHeight;
  }
}

function renderChatMessages() {
  const container = $('chat-messages');
  if (!container) return;
  
  container.innerHTML = '';
  
  chatHistory.forEach(msg => {
    const timeStr = msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const msgEl = document.createElement('div');
    msgEl.className = `chat-msg chat-msg-${msg.role}`;
    
    msgEl.innerHTML = `
      <div class="chat-msg-content">${formatMarkdown(msg.message)}</div>
      <span class="chat-msg-timestamp">${timeStr}</span>
    `;
    container.appendChild(msgEl);
  });
  
  scrollToBottom();
}

function showTypingIndicator() {
  const container = $('chat-messages');
  if (!container || $('chat-typing-indicator')) return;
  
  const typingEl = document.createElement('div');
  typingEl.id = 'chat-typing-indicator';
  typingEl.className = 'chat-typing-bubble';
  typingEl.innerHTML = `
    <span class="chat-typing-dot"></span>
    <span class="chat-typing-dot"></span>
    <span class="chat-typing-dot"></span>
  `;
  
  container.appendChild(typingEl);
  scrollToBottom();
}

function removeTypingIndicator() {
  const indicator = $('chat-typing-indicator');
  if (indicator) {
    indicator.remove();
  }
}

async function handleChatSubmit(e) {
  e.preventDefault();
  const inputEl = $('chat-input');
  if (!inputEl) return;
  
  const message = inputEl.value.trim();
  if (!message) return;
  
  // Add user message
  chatHistory.push({
    role: 'user',
    message: message,
    timestamp: new Date()
  });
  
  inputEl.value = '';
  renderChatMessages();
  showTypingIndicator();
  
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    
    const response = await fetch(CHAT_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ message: message }),
      signal: controller.signal
    });
    
    clearTimeout(timeout);
    removeTypingIndicator();
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    
    chatHistory.push({
      role: 'ai',
      message: data.reply || 'Sorry, I did not receive a proper response from the assistant.',
      timestamp: new Date()
    });
  } catch (err) {
    removeTypingIndicator();
    console.error('Chat error:', err);
    chatHistory.push({
      role: 'ai',
      message: '⚠️ Sorry, I am having trouble connecting to the Nebula AI service right now. Please verify that the backend is running and try again.',
      timestamp: new Date()
    });
  }
  
  renderChatMessages();
}

function initChatWidget() {
  const chatFab = $('chat-fab');
  const chatBox = $('chat-box');
  const chatCloseBtn = $('chat-close-btn');
  const chatForm = $('chat-input-form');
  const heroAskBtn = $('hero-ask-btn');
  const promptContainer = $('floating-prompt-container');
  const promptForm = $('floating-prompt-form');
  const promptInput = $('floating-prompt-input');
  
  if (!chatFab || !chatBox || !chatCloseBtn || !chatForm) return;
  
  const openChat = () => {
    chatBox.classList.add('open');
    chatFab.classList.add('hidden');
    if (promptContainer) promptContainer.classList.add('hidden');
    scrollToBottom();
    const inputEl = $('chat-input');
    if (inputEl) inputEl.focus();
  };
  
  const closeChat = () => {
    chatBox.classList.remove('open');
    chatFab.classList.remove('hidden');
    if (promptContainer) promptContainer.classList.remove('hidden');
  };
  
  chatFab.addEventListener('click', openChat);
  chatCloseBtn.addEventListener('click', closeChat);
  
  if (heroAskBtn) {
    heroAskBtn.addEventListener('click', openChat);
  }
  
  // Close chat when clicking outside
  document.addEventListener('click', (e) => {
    const container = document.querySelector('.chat-widget-container');
    const pContainer = $('floating-prompt-container');
    if (
      container && 
      !container.contains(e.target) && 
      (!pContainer || !pContainer.contains(e.target)) && 
      chatBox.classList.contains('open')
    ) {
      closeChat();
    }
  });
  
  chatForm.addEventListener('submit', handleChatSubmit);
  
  if (promptForm && promptInput) {
    promptForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const val = promptInput.value.trim();
      if (!val) return;
      
      const chatInput = $('chat-input');
      if (chatInput) {
        chatInput.value = val;
        promptInput.value = '';
        openChat();
        handleChatSubmit(new Event('submit'));
      }
    });
  }
  
  renderChatMessages();
}

// ============================================================
// BOOT
// ============================================================
document.addEventListener('DOMContentLoaded', () => {
  initStarfield();
  initNavbar();
  initScroll();
  initModal();
  initAuth();
  initErrorScreen();
  initChatWidget();
  fetchData();
});

import { useState, useEffect, useRef } from 'react';
import { Sparkles, Play, Info, ChevronLeft, ChevronRight, Search, Bot } from 'lucide-react';
import Starfield from './components/Starfield';
import ChatWidget from './components/ChatWidget';
import AuthOverlay from './components/AuthOverlay';
import AnimeDetailModal from './components/AnimeDetailModal';

// API Configurations
const BACKEND_BASE_URL = (
  window.location.hostname === '127.0.0.1' ||
  window.location.hostname === 'localhost' ||
  window.location.hostname === ''
)
  ? 'http://127.0.0.1:8000'
  : 'https://animerecdevbackend.lemonflower-23acd856.southindia.azurecontainerapps.io';

const API_URL = `${BACKEND_BASE_URL}/api/anime`;

// Mock data fallback in case backend is completely offline
const MOCK_DATA = [
  { id: 1, mal_id: 52991, title: "Frieren: Beyond Journey's End", genres: 'Adventure, Drama, Fantasy', score: 9.3, episodes: 28, synopsis: 'An elven mage and her former party members successfully defeat the Demon King and bring peace to the land. As an elf with a near-immortal lifespan, Frieren goes on a journey to learn more about humans after her dear companions pass away.', image_url: 'https://cdn.myanimelist.net/images/anime/1015/138025.jpg' },
  { id: 2, mal_id: 5114, title: 'Fullmetal Alchemist: Brotherhood', genres: 'Action, Adventure, Drama, Fantasy', score: 9.1, episodes: 64, synopsis: "Two brothers lose their mother and attempt a forbidden alchemical ritual to bring her back, losing their own body parts in the process. They embark on a quest to find the legendary Philosopher's Stone to restore their bodies.", image_url: 'https://cdn.myanimelist.net/images/anime/1208/94745.jpg' },
  { id: 3, mal_id: 9253, title: 'Steins;Gate', genres: 'Drama, Sci-Fi, Suspense', score: 9.0, episodes: 24, synopsis: 'A self-proclaimed mad scientist and his eccentric laboratory club accidentally discover a method of sending text messages to the past, altering their present and triggering a desperate race against time to prevent a dystopian future.', image_url: 'https://cdn.myanimelist.net/images/anime/1935/127974.jpg' },
  { id: 4, mal_id: 16498, title: 'Attack on Titan', genres: 'Action, Drama, Suspense', score: 8.8, episodes: 25, synopsis: 'Humanity is forced to live inside three massive concentric walls to protect themselves from giant, man-eating humanoids called Titans. When a colossal Titan breaches the outermost wall, young Eren Yeager vows to eradicate every single Titan.', image_url: 'https://cdn.myanimelist.net/images/anime/10/47347.jpg' },
  { id: 5, mal_id: 1535, title: 'Death Note', genres: 'Drama, Suspense, Thriller', score: 8.6, episodes: 37, synopsis: 'High school student Light Yagami discovers a supernatural notebook that grants him the power to kill anyone whose name and face he knows. He begins a global vigilante crusade to rid the world of criminals, pursued by the genius detective L.', image_url: 'https://cdn.myanimelist.net/images/anime/9/9453.jpg' },
  { id: 6, mal_id: 11061, title: 'Hunter x Hunter (2011)', genres: 'Action, Adventure, Fantasy', score: 9.0, episodes: 148, synopsis: 'Gon Freecss aspires to become a Hunter, an exceptional individual licensed to trace treasures, beasts, and individuals. He embarks on a journey to find his father, facing extreme challenges alongside his loyal friends.', image_url: 'https://cdn.myanimelist.net/images/anime/1337/99013.jpg' },
  { id: 7, mal_id: 19, title: 'Monster', genres: 'Drama, Mystery, Thriller', score: 8.9, episodes: 74, synopsis: 'Brilliant neurosurgeon Dr. Kenzou Tenma saves the life of a young boy over that of a prominent politician. Years later, Tenma discovers that the boy he saved has grown up to become a charismatic and ruthless serial killer.', image_url: 'https://cdn.myanimelist.net/images/anime/10/18740.jpg' },
  { id: 8, mal_id: 30, title: 'Neon Genesis Evangelion', genres: 'Action, Drama, Sci-Fi, Mecha', score: 8.3, episodes: 26, synopsis: 'In a futuristic world threatened by giant alien beings known as Angels, teenager Shinji Ikari is recruited by his estranged father to pilot a colossal bio-mechanical mecha called Evangelion to defend humanity.', image_url: 'https://cdn.myanimelist.net/images/anime/10/19083.jpg' },
  { id: 9, mal_id: 199, title: 'Spirited Away', genres: 'Adventure, Fantasy', score: 8.8, episodes: 1, synopsis: 'Ten-year-old Chihiro and her parents stumble upon an abandoned amusement park. After her parents are turned into pigs by a mysterious curse, Chihiro must work in a spiritual bathhouse to free them and find a way back home.', image_url: 'https://cdn.myanimelist.net/images/anime/6/79597.jpg' },
  { id: 10, mal_id: 32281, title: 'Your Name.', genres: 'Drama, Romance, Supernatural', score: 8.8, episodes: 1, synopsis: 'Two high school teenagers, Mitsuha in the countryside and Taki in Tokyo, suddenly and inexplicably begin to swap bodies. As they learn to adapt, they attempt to meet in person, uncovering a profound secret.', image_url: 'https://cdn.myanimelist.net/images/anime/5/87048.jpg' },
];

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

export default function App() {
  // App States
  const [animeList, setAnimeList] = useState([]);
  const [activeHero, setActiveHero] = useState(null);
  const [apiStatus, setApiStatus] = useState('checking'); // 'checking', 'online', 'demo'
  const [loading, setLoading] = useState(true);
  const [errorVisible, setErrorVisible] = useState(false);
  const [randomFact, setRandomFact] = useState('');

  // Modals Toggles
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedModalAnime, setSelectedModalAnime] = useState(null);
  const [authOverlayOpen, setAuthOverlayOpen] = useState(false);
  const [authTabMode, setAuthTabMode] = useState('login');

  // Chat States
  const [chatOpen, setChatOpen] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [chatHistory, setChatHistory] = useState([
    {
      role: 'ai',
      message: 'Hello! I am your Nebula AI assistant. 🌌 Ask me anything about anime, ratings, genres, or for personalized recommendations!',
      timestamp: new Date()
    }
  ]);

  // Auth States
  const [user, setUser] = useState(null);
  const [authToken, setAuthToken] = useState('');

  // Scrolling Parallax States
  const [scrollY, setScrollY] = useState(0);
  const [navbarScrolled, setNavbarScrolled] = useState(false);
  const trackRef = useRef(null);

  // 1. Initial configuration load (Session checks & Caches)
  useEffect(() => {
    // Restore User Auth Session
    try {
      const storedToken = localStorage.getItem('nebula_token');
      const storedUser = localStorage.getItem('nebula_user');
      if (storedToken && storedUser) {
        setAuthToken(storedToken);
        setUser(JSON.parse(storedUser));
      }
    } catch (e) {
      console.error('Session restore error:', e);
    }

    // Load recommendations from Local Cache immediately (instant first paint)
    try {
      const cachedData = localStorage.getItem('nebula_recommendations_cache');
      if (cachedData) {
        const parsed = JSON.parse(cachedData);
        setAnimeList(parsed);
        setActiveHero(parsed[0]);
        setLoading(false);
      }
    } catch (e) {
      console.error('Recommendations cache load error:', e);
    }

    fetchRecommendations();
  }, []);

  // 2. Hardware-accelerated Scroll Parallax calculation (runs passively)
  useEffect(() => {
    let ticking = false;
    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const currentScroll = window.scrollY;
          setScrollY(currentScroll);
          setNavbarScrolled(currentScroll > 20);
          ticking = false;
        });
        ticking = true;
      }
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Caching: local Jikan image caching to prevent HTTP 429 errors
  const getJikanImageCache = () => {
    try {
      const cache = localStorage.getItem('nebula_jikan_image_cache');
      return cache ? JSON.parse(cache) : {};
    } catch {
      return {};
    }
  };

  const saveJikanImageCache = (malId, imageUrl) => {
    try {
      const cache = getJikanImageCache();
      cache[malId] = imageUrl;
      localStorage.setItem('nebula_jikan_image_cache', JSON.stringify(cache));
    } catch (err) {
      console.error('Jikan cache write failed:', err);
    }
  };

  // Enrich items with Jikan API images to bypass MAL CDN hotlinking blocking
  const enrichImagesFromJikan = async (data) => {
    const imageCache = getJikanImageCache();

    const updated = await Promise.allSettled(
      data.map(async (anime) => {
        // Return instantly if cached
        if (imageCache[anime.mal_id]) {
          return { ...anime, image_url: imageCache[anime.mal_id] };
        }

        // Fetch Jikan API if not in cache
        try {
          const res = await fetch(`https://api.jikan.moe/v4/anime/${anime.mal_id}`);
          if (!res.ok) return anime;
          const json = await res.json();
          const imgUrl =
            json?.data?.images?.jpg?.large_image_url ||
            json?.data?.images?.jpg?.image_url;

          if (imgUrl) {
            saveJikanImageCache(anime.mal_id, imgUrl);
            return { ...anime, image_url: imgUrl };
          }
          return anime;
        } catch {
          return anime;
        }
      })
    );

    return updated.map((result, idx) =>
      result.status === 'fulfilled' ? result.value : data[idx]
    );
  };

  // 3. Fetch from FastAPI server
  const fetchRecommendations = async () => {
    setLoading(true);
    setErrorVisible(false);

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000); // 6s timeout

      const res = await fetch(API_URL, { signal: controller.signal });
      clearTimeout(timeoutId);

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const data = await res.json();
      setApiStatus('online');

      // Fetch images from Jikan (CORS-friendly mirror urls)
      const enrichedData = await enrichImagesFromJikan(data);

      setAnimeList(enrichedData);
      setActiveHero(enrichedData[0]);
      setErrorVisible(false);

      // Cache recommendations locally
      try {
        localStorage.setItem('nebula_recommendations_cache', JSON.stringify(enrichedData));
      } catch (err) {
        console.error('Recommendations cache save failed:', err);
      }
    } catch (err) {
      console.error('Fetch failed, searching for local fallback:', err);
      // If we have cached recommendations already, keep them and set status to online (or fallback cached mode)
      const cachedData = localStorage.getItem('nebula_recommendations_cache');
      if (cachedData) {
        setApiStatus('online');
        setErrorVisible(false);
      } else {
        // Complete offline fallback trigger
        setRandomFact(ANIME_FACTS[Math.floor(Math.random() * ANIME_FACTS.length)]);
        setErrorVisible(true);
      }
    } finally {
      setLoading(false);
    }
  };

  // 4. Force Demo Mode fallback manually
  const loadDemoMode = async () => {
    setLoading(true);
    setErrorVisible(false);
    setApiStatus('demo');

    const enrichedMock = await enrichImagesFromJikan(MOCK_DATA);
    setAnimeList(enrichedMock);
    setActiveHero(enrichedMock[0]);
    setLoading(false);
  };

  // 5. Auth Action Handler
  const handleAuthSuccess = (userData, token) => {
    setUser(userData);
    setAuthToken(token);
    localStorage.setItem('nebula_token', token);
    localStorage.setItem('nebula_user', JSON.stringify(userData));
  };

  const handleLogout = () => {
    setUser(null);
    setAuthToken('');
    localStorage.removeItem('nebula_token');
    localStorage.removeItem('nebula_user');
  };

  const showAuthModal = (tab = 'login') => {
    setAuthTabMode(tab);
    setAuthOverlayOpen(true);
  };

  // 6. Chat Action Handler (hoisted state)
  const handleSendMessage = async (messageText) => {
    // Append user message immediately
    const userMsg = { role: 'user', message: messageText, timestamp: new Date() };
    setChatHistory((prev) => [...prev, userMsg]);
    setChatOpen(true);
    setIsTyping(true);

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000); // 15s timeout

      const headers = {
        'Content-Type': 'application/json',
      };
      if (authToken) {
        headers['Authorization'] = `Bearer ${authToken}`;
      }

      const res = await fetch(`${BACKEND_BASE_URL}/api/chat`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ message: messageText }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      setIsTyping(false);

      if (!res.ok) throw new Error(`HTTP status ${res.status}`);

      const data = await res.json();
      const aiMsg = {
        role: 'ai',
        message: data.reply || 'Sorry, I did not receive a proper response from the assistant.',
        timestamp: new Date(),
      };
      setChatHistory((prev) => [...prev, aiMsg]);
    } catch (err) {
      setIsTyping(false);
      console.error('Chat AI query error:', err);
      const errMsg = {
        role: 'ai',
        message: '⚠️ Sorry, I am having trouble connecting to the Nebula AI service right now. Please verify that the backend is running and try again.',
        timestamp: new Date(),
      };
      setChatHistory((prev) => [...prev, errMsg]);
    }
  };

  // Floating prompt submission from main page bottom input bar
  const handlePromptSubmit = (e) => {
    e.preventDefault();
    const promptInput = e.target.elements.promptInputText;
    const val = promptInput.value.trim();
    if (!val) return;

    handleSendMessage(val);
    promptInput.value = '';
  };

  // 7. Modal Actions
  const handleOpenDetailModal = (anime) => {
    setSelectedModalAnime(anime);
    setDetailModalOpen(true);
  };

  // 8. Horizontal scroller navigation
  const handleScrollTrack = (direction) => {
    if (trackRef.current) {
      const offset = direction === 'left' ? -460 : 460;
      trackRef.current.scrollBy({ left: offset, behavior: 'smooth' });
    }
  };

  // Planet Parallax Multipliers (to avoid marginTop layout reflows)
  const planetConfig = [
    { className: 'planet-ring', speed: -0.15 },
    { className: 'planet-small', speed: 0.1 },
    { className: 'planet-tiny', speed: -0.05 },
    { className: 'planet-gas-giant', speed: 0.2 },
    { className: 'planet-moon', speed: -0.25 },
  ];

  // Upright Hero Poster scroll calculations (rotation REMOVED, straight only)
  const heroPosterTranslationY = scrollY * 0.4;
  const heroPosterScale = Math.max(0.8, 1 - scrollY * 0.0003);

  // Content render helpers
  const renderingBadgeText = () => {
    if (apiStatus === 'checking') return '● Checking API';
    if (apiStatus === 'online') return '● Local Dev Mode';
    return '● Demo Mode';
  };

  return (
    <>
      {/* ── Starfield Canvas ── */}
      <Starfield />

      {/* ── Nebula Ambient Layers ── */}
      <div className="nebula-layer nebula-a"></div>
      <div className="nebula-layer nebula-b"></div>
      <div className="nebula-layer nebula-c"></div>

      {/* ── Floating Planets with hardware-accelerated translations ── */}
      {planetConfig.map((planet, idx) => (
        <div
          key={idx}
          className="planet-parallax-wrap"
          style={{
            transform: `translateY(${scrollY * planet.speed}px)`,
            position: 'fixed',
            inset: 0,
            pointerEvents: 'none',
            zIndex: 1,
            willChange: 'transform',
          }}
        >
          <div className={`planet ${planet.className}`}>
            <div className="planet-surface" />
            {planet.className === 'planet-ring' && <div className="planet-rings" />}
          </div>
        </div>
      ))}

      {/* ── NAVBAR ── */}
      <nav className={`navbar ${navbarScrolled ? 'scrolled' : ''}`} id="navbar">
        <div className="nav-logo">
          <span className="logo-nebula">NEBULA</span>
          <span className="logo-anime">ANIME</span>
        </div>
        <ul className="nav-links">
          <li>
            <a href="#" className="active">Home</a>
          </li>
          <li>
            <a href="#anime-section" onClick={(e) => {
              e.preventDefault();
              document.getElementById('anime-section')?.scrollIntoView({ behavior: 'smooth' });
            }}>Anime</a>
          </li>
          <li>
            <a href="#anime-section" onClick={(e) => {
              e.preventDefault();
              if (!user) {
                showAuthModal('login');
              } else {
                document.getElementById('anime-section')?.scrollIntoView({ behavior: 'smooth' });
              }
            }}>My List</a>
          </li>
        </ul>
        <div className="nav-right">
          <span className={`status-badge ${apiStatus === 'checking' ? 'checking' : apiStatus === 'online' ? 'online' : 'offline'}`}>
            {renderingBadgeText()}
          </span>

          {/* Logged-out state */}
          {!user ? (
            <div className="nav-auth-guest">
              <button className="nav-btn-ghost" onClick={() => showAuthModal('login')}>Log In</button>
              <button className="nav-btn-primary" onClick={() => showAuthModal('signup')}>Sign Up</button>
            </div>
          ) : (
            /* Logged-in state */
            <div className="nav-auth-user">
              <span className="nav-greeting">Hi, {user.username}</span>
              <button className="nav-btn-ghost" onClick={handleLogout}>Log Out</button>
            </div>
          )}

          <button className="nav-search-btn" aria-label="Search">
            <Search size={18} />
          </button>
        </div>
      </nav>

      {/* ── ERROR SCREEN (graceful api retry fallback) ── */}
      {errorVisible ? (
        <div className="error-screen visible">
          <div className="error-card">
            <div className="error-icon">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                <path d="M12 2L2 19h20L12 2z" />
                <line x1="12" y1="9" x2="12" y2="13" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
            </div>
            <h2 className="error-title">Sorry, there seems to be an issue</h2>
            <p className="error-sub">
              We couldn't reach the recommendation engine right now.
              <br />
              Here's something to keep you entertained while we fix things.
            </p>
            <div className="error-fact-card">
              <p className="error-fact-label">✨ Anime Fun Fact</p>
              <p className="error-fact-text">{randomFact}</p>
            </div>
            <div className="error-actions">
              <button className="btn-primary" onClick={fetchRecommendations}>
                Try Again
              </button>
              <button className="btn-secondary" onClick={loadDemoMode}>
                Continue in Demo Mode
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* ── MAIN CONTENT LAYER ── */
        <>
          {/* ── HERO ── */}
          {activeHero && (
            <section className="hero" id="hero">
              {/* Static background backdrop prevents scaling repaints */}
              <div
                className="hero-backdrop"
                style={{
                  backgroundImage: `url(${activeHero.image_url})`,
                  willChange: 'auto',
                }}
              />
              <div className="hero-vignette" />

              <div
                className="hero-content"
                style={{
                  transform: `translateY(${scrollY * 0.2}px)`,
                  opacity: Math.max(0, 1 - scrollY / 400),
                  willChange: 'transform, opacity',
                }}
              >
                <p className="hero-eyebrow">#1 IN RECOMMENDATIONS TODAY</p>
                <h1 className="hero-title">{activeHero.title}</h1>
                <div className="hero-meta">
                  <span className="meta-score">⭐ {activeHero.score}/10</span>
                  <span className="meta-dot"></span>
                  <span className="meta-ep">{activeHero.episodes} Episodes</span>
                  <span className="meta-dot"></span>
                  <span className="meta-genre">{activeHero.genres}</span>
                </div>
                <p className="hero-synopsis">{activeHero.synopsis}</p>
                <div className="hero-actions">
                  <button className="btn-primary" onClick={() => setChatOpen(true)}>
                    <Bot size={16} />
                    Ask Agent
                  </button>
                  <button className="btn-secondary" onClick={() => handleOpenDetailModal(activeHero)}>
                    <Info size={16} />
                    More Info
                  </button>
                </div>
              </div>

              {/* Straight, upright Frieren poster container (tilt removed) */}
              <div
                className="hero-poster-wrap"
                style={{
                  transform: `translateY(calc(-50% + ${heroPosterTranslationY}px)) scale(${heroPosterScale})`,
                  willChange: 'transform',
                }}
              >
                <img
                  id="hero-poster"
                  src={activeHero.image_url}
                  alt={activeHero.title}
                  className="hero-poster"
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.src = `https://placehold.co/240x340/0b0d17/7c3aed?text=${encodeURIComponent(
                      activeHero.title.slice(0, 12)
                    )}`;
                  }}
                />
                <div className="hero-poster-glow" />
              </div>
            </section>
          )}

          {/* ── USER GREETING BANNER ── */}
          {user && (
            <div className="user-hero-banner" id="user-hero-banner">
              <div className="user-hero-inner">
                <div className="user-hero-avatar">
                  {user.username.charAt(0).toUpperCase()}
                </div>
                <div className="user-hero-text">
                  <p className="user-hero-greeting">Welcome back, {user.username}!</p>
                  <p className="user-hero-sub">
                    Your watchlist is waiting. Ask the AI for what's next.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* ── RECOMMENDATIONS TRACK SCROLLER ── */}
          <main className="main-content" id="anime-section">
            <section className="row-section">
              <div className="row-header">
                <h2 className="row-title">Trending Recommendations</h2>
                <a href="#" className="row-see-all" onClick={(e) => e.preventDefault()}>
                  See all →
                </a>
              </div>
              <div className="scroller-wrap">
                <button
                  className="scroll-arrow left"
                  onClick={() => handleScrollTrack('left')}
                  aria-label="Slide Left"
                >
                  <ChevronLeft size={20} strokeWidth={2.5} />
                </button>

                <div className="anime-track" ref={trackRef}>
                  {loading
                    ? Array(6)
                        .fill(0)
                        .map((_, idx) => <div key={idx} className="skeleton-card" />)
                    : animeList.map((anime) => (
                        <div
                          key={anime.id || anime.mal_id}
                          className="anime-card"
                          onClick={() => handleOpenDetailModal(anime)}
                        >
                          <img
                            src={anime.image_url}
                            alt={anime.title}
                            className="card-img"
                            loading="lazy"
                            onError={(e) => {
                              e.target.onerror = null;
                              e.target.src = `https://placehold.co/185x275/0b0d17/7c3aed?text=${encodeURIComponent(
                                anime.title.slice(0, 12)
                              )}`;
                            }}
                          />
                          <div className="card-overlay">
                            <h3 className="card-title">{anime.title}</h3>
                            <div className="card-bottom">
                              <span className="card-score">⭐ {anime.score}</span>
                              <span className="card-genre">
                                {anime.genres.split(',')[0].trim()}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                </div>

                <button
                  className="scroll-arrow right"
                  onClick={() => handleScrollTrack('right')}
                  aria-label="Slide Right"
                >
                  <ChevronRight size={20} strokeWidth={2.5} />
                </button>
              </div>
            </section>
          </main>
        </>
      )}

      {/* ── FOOTER ── */}
      <footer className="site-footer">
        <div className="footer-inner">
          <div className="footer-logo">
            <span className="logo-nebula">NEBULA</span>
            <span className="logo-anime">ANIME</span>
          </div>
          <p className="footer-tagline">Made with AI &nbsp;·&nbsp; Charged with AI</p>
          <p className="footer-copy">© 2026 Nebula Anime. All rights reserved.</p>
        </div>
      </footer>

      {/* ── FLOATING PROMPT BAR (type to submit message, opens chat widget) ── */}
      {!errorVisible && (
        <div className={`floating-prompt-container ${chatOpen ? 'hidden' : ''}`}>
          <div className="prompt-glow"></div>
          <form className="floating-prompt-bar" onSubmit={handlePromptSubmit}>
            <div className="prompt-shimmer"></div>
            <div className="prompt-icon-wrap">
              <Sparkles size={20} className="prompt-sparkle-icon" />
            </div>
            <input
              type="text"
              name="promptInputText"
              className="prompt-input"
              placeholder="Ask Nebulous"
              autoComplete="off"
            />
            <button
              type="submit"
              className="prompt-submit-btn"
              aria-label="Send to Nebulous"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="22" y1="2" x2="11" y2="13"></line>
                <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
              </svg>
            </button>
          </form>
        </div>
      )}

      {/* ── ACTIVE MODAL INTERLACES ── */}
      <AnimeDetailModal
        isOpen={detailModalOpen}
        onClose={() => setDetailModalOpen(false)}
        anime={selectedModalAnime}
        user={user}
        authToken={authToken}
        backendBaseUrl={BACKEND_BASE_URL}
        onShowAuth={showAuthModal}
      />

      <AuthOverlay
        isOpen={authOverlayOpen}
        onClose={() => setAuthOverlayOpen(false)}
        onAuthSuccess={handleAuthSuccess}
        backendBaseUrl={BACKEND_BASE_URL}
      />

      <ChatWidget
        isOpen={chatOpen}
        onClose={() => setChatOpen(false)}
        chatHistory={chatHistory}
        onSendMessage={handleSendMessage}
        isTyping={isTyping}
      />
    </>
  );
}

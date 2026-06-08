import { useState, useEffect, useRef } from 'react';
import { Sparkles, Play, Info, ChevronLeft, ChevronRight, Search, Bot, SearchX, Volume2, VolumeX, Menu, X } from 'lucide-react';
import Starfield from './components/Starfield';
import ChatWidget from './components/ChatWidget';
import AuthOverlay from './components/AuthOverlay';
import AnimeDetailModal from './components/AnimeDetailModal';
import SplashScreen from './components/SplashScreen';
const logoImg = "https://nebulaanimeblob.blob.core.windows.net/imgandvids/logo.png";
import { audioSystem } from './utils/audio';
import { motion, AnimatePresence } from 'framer-motion';

// High-performance 3D perspective tilt hover tracking
const handleCardMouseMove = (e) => {
  const card = e.currentTarget;
  const rect = card.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;
  const xc = rect.width / 2;
  const yc = rect.height / 2;
  const dx = x - xc;
  const dy = y - yc;
  
  // Dynamic 3D rotation angles (clamped to max 12deg)
  const rx = -(dy / yc) * 12;
  const ry = (dx / xc) * 12;

  card.style.setProperty('--rx', `${rx}deg`);
  card.style.setProperty('--ry', `${ry}deg`);
  card.style.setProperty('--mx', `${(x / rect.width) * 100}%`);
  card.style.setProperty('--my', `${(y / rect.height) * 100}%`);
};

const handleCardMouseEnter = () => {
  audioSystem.playTick();
};

const handleCardMouseLeave = (e) => {
  const card = e.currentTarget;
  card.style.setProperty('--rx', '0deg');
  card.style.setProperty('--ry', '0deg');
  card.style.setProperty('--mx', '50%');
  card.style.setProperty('--my', '50%');
};


// API Configurations
// In production the React bundle is served by FastAPI itself (same origin),
// so we use relative URLs (''). Only local dev needs an explicit host.
const BACKEND_BASE_URL = (
  window.location.hostname === '127.0.0.1' ||
  window.location.hostname === 'localhost' ||
  window.location.hostname === ''
)
  ? 'http://127.0.0.1:8000'
  : '';   // ← same-origin: FastAPI serves both the frontend AND the API

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
  // Splash screen — always show on startup as requested
  const [splashDone, setSplashDone] = useState(false);
  
  const handleSplashDone = () => {
    setSplashDone(true);
  };

  // Auth Loading Stall State
  const [authDataLoading, setAuthDataLoading] = useState(false);

  // App States
  const [animeList, setAnimeList] = useState([]);
  const [activeHero, setActiveHero] = useState(null);
  const [heroIndex, setHeroIndex] = useState(0);
  const [apiStatus, setApiStatus] = useState('checking'); // 'checking', 'online', 'demo'
  const [loading, setLoading] = useState(true);
  const [errorVisible, setErrorVisible] = useState(false);
  const [randomFact, setRandomFact] = useState('');

  // Immersive Fluidity & Gamification States
  const [sfxMuted, setSfxMuted] = useState(() => audioSystem.getMuteState());
  const [isWarping, setIsWarping] = useState(false);

  const toggleSfx = () => {
    const nextMuted = !sfxMuted;
    audioSystem.setMuted(nextMuted);
    setSfxMuted(nextMuted);
  };

  const handleNebulaWarp = () => {
    if (isWarping) return;
    setIsWarping(true);
    
    // Play pitch-rising warp engine synthesis SFX
    audioSystem.playWarp();
    
    // Dispatch event to accelerate canvas Starfield stars radially
    window.dispatchEvent(new Event('nebula-warp-start'));
    
    // Shake the main application layer for rich tactile feedback
    document.body.classList.add('warp-shake-active');

    setTimeout(() => {
      // Pick a random anime from available selection or mock fallbacks
      const list = filteredAnime.length > 0 ? filteredAnime : (animeList.length > 0 ? animeList : MOCK_DATA);
      const randomAnime = list[Math.floor(Math.random() * list.length)];

      // Decelerate stars and stop console screenshake
      window.dispatchEvent(new Event('nebula-warp-end'));
      document.body.classList.remove('warp-shake-active');
      setIsWarping(false);

      // Play celestial success chime
      audioSystem.playSuccess();

      // Open detail modal for the randomly selected recommendation
      if (randomAnime) {
        handleOpenDetailModal(randomAnime);
      }
    }, 1400); // 1.4s duration matching procedural warp SFX length
  };

  const handleNextHero = () => {
    const list = animeList.length > 0 ? animeList : MOCK_DATA;
    const listToUse = list.slice(0, 10);
    if (listToUse.length === 0) return;
    setHeroIndex((prev) => {
      const nextIdx = (prev + 1) % listToUse.length;
      setActiveHero(listToUse[nextIdx]);
      return nextIdx;
    });
  };

  const handlePrevHero = () => {
    const list = animeList.length > 0 ? animeList : MOCK_DATA;
    const listToUse = list.slice(0, 10);
    if (listToUse.length === 0) return;
    setHeroIndex((prev) => {
      const nextIdx = (prev - 1 + listToUse.length) % listToUse.length;
      setActiveHero(listToUse[nextIdx]);
      return nextIdx;
    });
  };

  // Modals Toggles
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedModalAnime, setSelectedModalAnime] = useState(null);
  const [authOverlayOpen, setAuthOverlayOpen] = useState(false);
  const [authTabMode, setAuthTabMode] = useState('login');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Auto-rotate hero slideshow
  useEffect(() => {
    if (detailModalOpen || isWarping || loading) return;
    const interval = setInterval(() => {
      handleNextHero();
    }, 8000); // 8 seconds per slide

    return () => clearInterval(interval);
  }, [animeList, detailModalOpen, isWarping, loading]);

  // Chat States
  const [chatOpen, setChatOpen] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [chatHistory, setChatHistory] = useState([
    {
      role: 'ai',
      message: 'Hello, Sir. I am **Nebulous**, your dedicated AI companion. 🌌 I am highly specialized in anime curation and database search, but I am also quite happy to assist with general conversation. How may I be of service to you today?',
      timestamp: new Date()
    }
  ]);

  // Mobile check
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const checkMobile = () => {
      const mobileRegex = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i;
      const isMobileDevice = mobileRegex.test(navigator.userAgent) || window.innerWidth < 1024;
      setIsMobile(isMobileDevice);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Auth States
  const [user, setUser] = useState(null);
  const [authToken, setAuthToken] = useState('');
  const [favoritesCount, setFavoritesCount] = useState(0);
  const [favoritesList, setFavoritesList] = useState([]);
  const [userRatings, setUserRatings] = useState({});
  const [watchHistory, setWatchHistory] = useState([]);

  // Navigation & Filtering States
  const [currentView, setCurrentView] = useState('home'); // 'home' | 'explorer' | 'mylist'
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGenre, setSelectedGenre] = useState('All');

  // Scrolling Parallax States
  const [navbarScrolled, setNavbarScrolled] = useState(false);
  const trackRef = useRef(null);

  // Dynamic debounced on-the-fly Jikan API search fallback
  useEffect(() => {
    if (!searchQuery || searchQuery.trim().length < 3) return;

    const delayDebounce = setTimeout(async () => {
      const localMatches = animeList.filter(a => a.title.toLowerCase().includes(searchQuery.toLowerCase()));
      if (localMatches.length < 3) {
        try {
          const res = await fetch(`${BACKEND_BASE_URL}/api/anime/search?q=${encodeURIComponent(searchQuery)}`);
          if (res.ok) {
            const newAnimes = await res.json();
            if (newAnimes.length > 0) {
              setAnimeList(prev => {
                const existingIds = new Set(prev.map(a => a.mal_id));
                const filteredNew = newAnimes.filter(a => !existingIds.has(a.mal_id));
                return [...prev, ...filteredNew];
              });
            }
          }
        } catch (e) {
          console.error("Dynamic search sync failed:", e);
        }
      }
    }, 600); // 600ms debounce

    return () => clearTimeout(delayDebounce);
  }, [searchQuery, animeList]);

  // 1. Initial configuration load (Session checks & Caches)
  useEffect(() => {
    // Restore User Auth Session
    try {
      const storedToken = localStorage.getItem('nebula_token');
      const storedUser = localStorage.getItem('nebula_user');
      if (storedToken && storedUser) {
        setAuthDataLoading(true);
        setAuthToken(storedToken);
        setUser(JSON.parse(storedUser));
        
        // Await personal user data to prevent UI pop-in
        Promise.allSettled([
          fetchFavoritesCount(storedToken),
          fetchFavoritesList(storedToken),
          fetchWatchHistory(storedToken)
        ]).finally(() => {
          setAuthDataLoading(false);
        });

        // Check if this is a fresh browser session (e.g. browser was closed and reopened)
        if (!sessionStorage.getItem('nebula_session_active')) {
          fetch(`${BACKEND_BASE_URL}/api/chat/clear`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${storedToken}` }
          }).catch(console.error);
          
          setChatHistory([{
            role: 'ai',
            message: 'Hello, Sir. I am **Nebulous**, your dedicated AI companion. 🌌 I am highly specialized in anime curation and database search, but I am also quite happy to assist with general conversation. How may I be of service to you today?',
            timestamp: new Date()
          }]);
          
          sessionStorage.setItem('nebula_session_active', 'true');
        }
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
          document.documentElement.style.setProperty('--scroll-y', currentScroll);
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
  const fetchFavoritesCount = async (token) => {
    if (!token) return;
    try {
      const res = await fetch(`${BACKEND_BASE_URL}/api/anime/favorites/count`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setFavoritesCount(data.count ?? 0);
      }
    } catch {
      // silently ignore — badge just won't update
    }
  };

  const fetchFavoritesList = async (token) => {
    if (!token) return;
    try {
      const res = await fetch(`${BACKEND_BASE_URL}/api/anime/favorites/list`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        const enriched = await enrichImagesFromJikan(data);
        setFavoritesList(enriched);
      }
    } catch {
      // silently ignore
    }
  };

  useEffect(() => {
    const handleFavUpdate = () => {
      if (authToken) {
        fetchFavoritesCount(authToken);
        fetchFavoritesList(authToken);
      }
    };
    window.addEventListener('favorites-updated', handleFavUpdate);
    return () => window.removeEventListener('favorites-updated', handleFavUpdate);
  }, [authToken]);

  const fetchWatchHistory = async (token) => {
    if (!token) return;
    try {
      const res = await fetch(`${BACKEND_BASE_URL}/api/anime/history`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        const enriched = await enrichImagesFromJikan(data);
        setWatchHistory(enriched);
      }
    } catch {
      // silently ignore
    }
  };

  const handleAuthSuccess = (userData, token) => {
    setUser(userData);
    setAuthToken(token);
    localStorage.setItem('nebula_token', token);
    localStorage.setItem('nebula_user', JSON.stringify(userData));
    fetchFavoritesCount(token);
    fetchFavoritesList(token);
    fetchWatchHistory(token);
  };

  const handleLogout = () => {
    if (authToken) {
      fetch(`${BACKEND_BASE_URL}/api/chat/clear`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${authToken}` }
      }).catch(console.error);
    }
    
    setChatHistory([{
      role: 'ai',
      message: 'Hello, Sir. I am **Nebulous**, your dedicated AI companion. 🌌 I am highly specialized in anime curation and database search, but I am also quite happy to assist with general conversation. How may I be of service to you today?',
      timestamp: new Date()
    }]);

    setUser(null);
    setAuthToken('');
    setFavoritesCount(0);
    setFavoritesList([]);
    setWatchHistory([]);
    localStorage.removeItem('nebula_token');
    localStorage.removeItem('nebula_user');
    sessionStorage.removeItem('nebula_session_active');
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
      const timeoutId = setTimeout(() => controller.abort(), 90000); // 90s timeout (generous for local Ollama)

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
        metrics: data.metrics || null,
        timestamp: new Date(),
      };
      setChatHistory((prev) => [...prev, aiMsg]);

      // Automatically refresh UI lists in case the AI modified the database
      if (authToken) {
        fetchFavoritesCount(authToken);
        fetchFavoritesList(authToken);
        fetchWatchHistory(authToken);
      }
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
  const handleScrollTrack = (e, direction) => {
    const wrap = e.currentTarget.closest('.scroller-wrap');
    if (wrap) {
      const track = wrap.querySelector('.anime-track');
      if (track) {
        const offset = direction === 'left' ? -460 : 460;
        track.scrollBy({ left: offset, behavior: 'smooth' });
      }
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

  // Content render helpers
  const renderingBadgeText = () => {
    if (apiStatus === 'checking') return '● Checking API';
    if (apiStatus === 'online') return '● Local Dev Mode';
    return '● Demo Mode';
  };

  // 9. Extract unique genres dynamically from the anime list
  const allGenres = ['All'];
  animeList.forEach((anime) => {
    if (anime.genres) {
      anime.genres.split(',').forEach((g) => {
        const trimmed = g.trim();
        if (trimmed && !allGenres.includes(trimmed)) {
          allGenres.push(trimmed);
        }
      });
    }
  });
  // Sort genres alphabetically, but keep 'All' at the beginning
  allGenres.sort((a, b) => {
    if (a === 'All') return -1;
    if (b === 'All') return 1;
    return a.localeCompare(b);
  });

  // 10. Filter anime by selected genre and search query
  const filteredAnime = animeList.filter((anime) => {
    const matchesSearch = anime.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesGenre =
      selectedGenre === 'All' ||
      (anime.genres &&
        anime.genres
          .split(',')
          .map((g) => g.trim())
          .includes(selectedGenre));
    return matchesSearch && matchesGenre;
  });

  // 11. Seed-based shuffle for consistent random rows without re-rendering jumps
  const shuffleArray = (array, seed) => {
    let m = array.length, t, i;
    const result = [...array];
    let s = seed;
    const random = () => {
      const x = Math.sin(s++) * 10000;
      return x - Math.floor(x);
    };
    while (m) {
      i = Math.floor(random() * m--);
      t = result[m];
      result[m] = result[i];
      result[i] = t;
    }
    return result;
  };

  const cosmicRows = [
    { title: 'Trending in the Nebula', data: animeList },
    { title: 'Cosmic Classics', data: shuffleArray(animeList, 1) },
    { title: 'New Stars Rising', data: shuffleArray(animeList, 2) },
    { title: 'Hidden in the Void', data: shuffleArray(animeList, 3) },
    { title: 'Popular Across the Galaxy', data: shuffleArray(animeList, 4) },
  ];

  if (isMobile) {
    return (
      <div className="mobile-blocker-overlay">
        <Starfield />
        <div className="mobile-blocker-content">
          <div className="mobile-blocker-icon">🌌</div>
          <h1 className="mobile-blocker-title">Desktop Experience Only</h1>
          <p className="mobile-blocker-text">
            Nebula Anime is optimized exclusively for desktop screens to preserve its high-fidelity 3D effects, immersive starfields, and cinematic animations.
          </p>
          <p className="mobile-blocker-sub">
            Please open this web application on a desktop computer or laptop.
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* ── CINEMATIC SPLASH SCREEN (once per session) ── */}
      {!splashDone && <SplashScreen onDone={handleSplashDone} isStalled={authDataLoading} />}
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
            transform: `translateY(calc(var(--scroll-y, 0) * 1px * ${planet.speed}))`,
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

      {/* ── COLLAPSIBLE SIDEBAR DRAWER ── */}
      <AnimatePresence>
        {sidebarOpen && (
          <>
            {/* Backdrop Blur Overlay */}
            <motion.div
              className="sidebar-overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSidebarOpen(false)}
            />

            {/* Sidebar Slide Panel */}
            <motion.aside
              className="sidebar-panel"
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 26, stiffness: 190 }}
            >
              <div className="sidebar-header">
                <div className="sidebar-logo">
                  <img src={logoImg} alt="Nebula Anime" className="sidebar-logo-img" />
                  <span className="sidebar-logo-text">NEBULA</span>
                </div>
                <button className="sidebar-close-btn" onClick={() => setSidebarOpen(false)}>
                  <X size={20} />
                </button>
              </div>

              {/* User Profile Info inside sidebar */}
              {user && (
                <div className="sidebar-profile">
                  <div className="sidebar-avatar">
                    {user.username.substring(0, 2).toUpperCase()}
                  </div>
                  <div className="sidebar-profile-info">
                    <p className="sidebar-username">{user.username}</p>
                    <p className="sidebar-email">{user.email || 'Cosmic Explorer'}</p>
                  </div>
                </div>
              )}

              {/* Navigation Links inside sidebar */}
              <nav className="sidebar-nav">
                <p className="sidebar-section-title">Navigation</p>
                <ul className="sidebar-links">
                  <li>
                    <a
                      href="#"
                      className={currentView === 'home' ? 'active' : ''}
                      onClick={(e) => {
                        e.preventDefault();
                        setCurrentView('home');
                        setSidebarOpen(false);
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
                    >
                      Home
                    </a>
                  </li>
                  <li>
                    <a
                      href="#"
                      className={currentView === 'explorer' ? 'active' : ''}
                      onClick={(e) => {
                        e.preventDefault();
                        setCurrentView('explorer');
                        setSidebarOpen(false);
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
                    >
                      Anime Explorer
                    </a>
                  </li>
                  {user && (
                    <li>
                      <a
                        href="#"
                        className={currentView === 'mylist' ? 'active' : ''}
                        onClick={(e) => {
                          e.preventDefault();
                          setCurrentView('mylist');
                          setSidebarOpen(false);
                          window.scrollTo({ top: 0, behavior: 'smooth' });
                        }}
                      >
                        My Anime List
                        {favoritesCount > 0 && (
                          <span className="mylist-badge">{favoritesCount}</span>
                        )}
                      </a>
                    </li>
                  )}
                </ul>
              </nav>

              {/* Auth actions inside sidebar */}
              <div className="sidebar-footer">
                {!user ? (
                  <div className="sidebar-auth-guest">
                    <button className="sidebar-btn-login" onClick={() => { setSidebarOpen(false); showAuthModal('login'); }}>Log In</button>
                    <button className="sidebar-btn-signup" onClick={() => { setSidebarOpen(false); showAuthModal('signup'); }}>Sign Up</button>
                  </div>
                ) : (
                  <button className="sidebar-btn-logout" onClick={() => { setSidebarOpen(false); handleLogout(); }}>
                    Log Out
                  </button>
                )}
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* ── NAVBAR ── */}
      <nav className={`navbar ${navbarScrolled ? 'scrolled' : ''}`} id="navbar">
        <div className="nav-left-section">
          <button 
            className="nav-sidebar-toggle" 
            onClick={() => setSidebarOpen(true)}
            aria-label="Open navigation menu"
            onMouseEnter={() => audioSystem.playTick()}
          >
            <Menu size={22} />
          </button>
          <div 
            className="nav-logo" 
            onClick={() => {
              setCurrentView('home');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
          >
            <img src={logoImg} alt="Nebula Anime" className="nav-logo-img" />
          </div>
        </div>

        {/* Global Miruro-style centered search bar */}
        <div className="nav-search-global">
          <Search size={16} className="nav-search-global-icon" />
          <input
            type="text"
            placeholder="Search anime by title..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              if (currentView !== 'explorer') {
                setCurrentView('explorer');
              }
            }}
            className="nav-search-global-input"
          />
        </div>

        <div className="nav-right">
          {/* Quick Hyperdrive Warp Button */}
          <button
            className="nav-warp-btn"
            onClick={handleNebulaWarp}
            title="Hyperdrive Surprise Randomizer"
            disabled={isWarping}
            onMouseEnter={() => audioSystem.playTick()}
          >
            <Sparkles size={16} className="warp-sparkle" />
            <span>Warp</span>
          </button>

          {/* Procedural Audio SFX Toggle */}
          <button 
            className={`nav-audio-btn ${sfxMuted ? 'muted' : 'active'}`} 
            onClick={toggleSfx}
            title={sfxMuted ? 'Unmute Space SFX' : 'Mute Space SFX'}
            onMouseEnter={() => audioSystem.playTick()}
          >
            {sfxMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
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
        <AnimatePresence mode="wait">
          {currentView === 'home' ? (
            <motion.div
              key="home-view"
              initial={{ opacity: 0, x: -35, scale: 0.98 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 35, scale: 0.98 }}
              transition={{ duration: 0.45, ease: [0.34, 1.3, 0.64, 1] }}
            >
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

                  {/* Hero Slideshow Navigation Controls (Miruro inspired) */}
                  <div className="hero-carousel-controls">
                    <button className="hero-carousel-arrow" onClick={handlePrevHero} aria-label="Previous Slide">
                      <ChevronLeft size={16} />
                    </button>
                    <span className="hero-carousel-index">
                      {heroIndex + 1} / {Math.min(10, animeList.length > 0 ? animeList.length : MOCK_DATA.length)}
                    </span>
                    <button className="hero-carousel-arrow" onClick={handleNextHero} aria-label="Next Slide">
                      <ChevronRight size={16} />
                    </button>
                  </div>

                  <div
                    className="hero-content"
                    style={{
                      transform: `translateY(calc(var(--scroll-y, 0) * 0.2px))`,
                      opacity: `max(0, calc(1 - (var(--scroll-y, 0) / 400)))`,
                      willChange: 'transform, opacity',
                    }}
                  >
                    <p className="hero-eyebrow">#1 IN RECOMMENDATIONS TODAY</p>
                    <h1 className="hero-title">{activeHero.title}</h1>
                    <div className="hero-meta">
                      <span className="meta-score">⭐ {Number(activeHero.score).toFixed(1)}/10</span>
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
                      <button className="btn-primary btn-warp" onClick={handleNebulaWarp} disabled={isWarping}>
                        <Sparkles size={16} className="warp-sparkle" />
                        Nebula Warp
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
                      transform: `translateY(calc(-50% + calc(var(--scroll-y, 0) * 0.4px))) scale(max(0.8, calc(1 - (var(--scroll-y, 0) * 0.0003))))`,
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


              {/* ── RECOMMENDATIONS TRACK SCROLLERS ── */}
              <main className="main-content" id="anime-section">
                {user && watchHistory.length > 0 && (
                  <section className="row-section">
                    <div className="row-header">
                      <h2 className="row-title">Continue Watching for {user.username}</h2>
                    </div>
                    <div className="scroller-wrap">
                      <button
                        className="scroll-arrow left"
                        onClick={(e) => handleScrollTrack(e, 'left')}
                        aria-label="Slide Left"
                      >
                        <ChevronLeft size={20} strokeWidth={2.5} />
                      </button>

                      <div className="anime-track continue-watching-track">
                        {watchHistory.map((anime, index) => {
                          // Assume an average episode is ~24 mins (1440 seconds) to calculate %
                          const progressPercent = Math.min(100, Math.max(0, (anime.progress_seconds / 1440) * 100));
                          
                          return (
                            <div
                              key={`history-${anime.mal_id}-${index}`}
                              className="landscape-card"
                              onClick={() => handleOpenDetailModal(anime)}
                            >
                              <img
                                src={anime.image_url}
                                alt={anime.title}
                                className="landscape-card-img"
                                loading="lazy"
                                onError={(e) => {
                                  e.target.onerror = null;
                                  e.target.src = `https://placehold.co/280x157/0b0d17/8B5CF6?text=${encodeURIComponent(
                                    anime.title.slice(0, 12)
                                  )}`;
                                }}
                              />
                              <div className="landscape-card-overlay">
                                <h3 className="landscape-card-title">{anime.title}</h3>
                                <div className="landscape-card-ep">
                                  S1:E{anime.episode_number}
                                </div>
                              </div>
                              <div className="progress-bar-bg">
                                <div 
                                  className="progress-bar-fill" 
                                  style={{ width: `${progressPercent}%` }} 
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      <button
                        className="scroll-arrow right"
                        onClick={(e) => handleScrollTrack(e, 'right')}
                        aria-label="Slide Right"
                      >
                        <ChevronRight size={20} strokeWidth={2.5} />
                      </button>
                    </div>
                  </section>
                )}
                {cosmicRows.map((row, rowIdx) => (
                  <section className="row-section" key={rowIdx}>
                    <div className="row-header">
                      <h2 className="row-title">{row.title}</h2>
                      <a href="#" className="row-see-all" onClick={(e) => e.preventDefault()}>
                        See all →
                      </a>
                    </div>
                    <div className="scroller-wrap">
                      <button
                        className="scroll-arrow left"
                        onClick={(e) => handleScrollTrack(e, 'left')}
                        aria-label="Slide Left"
                      >
                        <ChevronLeft size={20} strokeWidth={2.5} />
                      </button>

                      <div className="anime-track">
                        {loading
                          ? Array(6)
                              .fill(0)
                              .map((_, idx) => <div key={idx} className="skeleton-card" />)
                          : row.data.map((anime) => (
                              <div
                                key={`${rowIdx}-${anime.id || anime.mal_id}`}
                                className="anime-card"
                                onClick={() => handleOpenDetailModal(anime)}
                                onMouseMove={handleCardMouseMove}
                                onMouseEnter={handleCardMouseEnter}
                                onMouseLeave={handleCardMouseLeave}
                              >
                                <div className="card-shine" />
                                <img
                                  src={anime.image_url}
                                  alt={anime.title}
                                  className="card-img"
                                  loading="lazy"
                                  onError={(e) => {
                                    e.target.onerror = null;
                                    e.target.src = `https://placehold.co/185x275/0b0d17/8B5CF6?text=${encodeURIComponent(
                                      anime.title.slice(0, 12)
                                    )}`;
                                  }}
                                />
                                <div className="card-overlay">
                                  <h3 className="card-title">{anime.title}</h3>
                                  <div className="card-bottom">
                                    <span className="card-score">⭐ {Number(anime.score).toFixed(1)}</span>
                                    <span className="card-genre">
                                      {anime.genres ? anime.genres.split(',')[0].trim() : ''}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            ))}
                      </div>

                      <button
                        className="scroll-arrow right"
                        onClick={(e) => handleScrollTrack(e, 'right')}
                        aria-label="Slide Right"
                      >
                        <ChevronRight size={20} strokeWidth={2.5} />
                      </button>
                    </div>
                  </section>
                ))}
              </main>
            </motion.div>
          ) : currentView === 'mylist' ? (
            /* ── MY ANIME LIST PAGE ── */
            <motion.div
              key="mylist-view"
              initial={{ opacity: 0, x: 35, scale: 0.98 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: -35, scale: 0.98 }}
              transition={{ duration: 0.45, ease: [0.34, 1.3, 0.64, 1] }}
              className="mylist-container"
            >
              <div className="mylist-header">
                <div className="mylist-header-left">
                  <h1 className="mylist-title">My Anime List</h1>
                  <p className="mylist-subtitle">
                    {favoritesList.length > 0
                      ? `${favoritesList.length} anime in your collection`
                      : 'Your personal anime collection lives here'}
                  </p>
                </div>
                <div className="mylist-header-badge">
                  <span className="mylist-count-badge">{favoritesList.length}</span>
                </div>
              </div>

              {favoritesList.length === 0 ? (
                <div className="mylist-empty">
                  <div className="mylist-empty-icon">🌌</div>
                  <h2 className="mylist-empty-title">Your list is empty</h2>
                  <p className="mylist-empty-text">
                    Start adding anime to your list by clicking the <strong>+ Add to List</strong> button on any anime.
                  </p>
                  <button
                    className="btn-primary"
                    style={{ marginTop: '24px' }}
                    onClick={() => { setCurrentView('explorer'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                  >
                    Browse Anime
                  </button>
                </div>
              ) : (
                <div className="mylist-grid">
                  {favoritesList.map((anime) => (
                    <div
                      key={anime.mal_id || anime.id}
                      className="anime-card mylist-card"
                      onClick={() => handleOpenDetailModal(anime)}
                      onMouseMove={handleCardMouseMove}
                      onMouseEnter={handleCardMouseEnter}
                      onMouseLeave={handleCardMouseLeave}
                    >
                      <div className="card-shine" />
                      <img
                        src={anime.image_url}
                        alt={anime.title}
                        className="card-img"
                        loading="lazy"
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.src = `https://placehold.co/185x275/0b0d17/8B5CF6?text=${encodeURIComponent(
                            anime.title.slice(0, 12)
                          )}`;
                        }}
                      />
                      <div className="card-overlay">
                        <h3 className="card-title">{anime.title}</h3>
                        <div className="card-bottom">
                          <span className="card-score">⭐ {Number(anime.score).toFixed(1)}</span>
                          <span className="card-genre">
                            {anime.genres ? anime.genres.split(',')[0].trim() : ''}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          ) : (
            /* ── DEDICATED ANIME EXPLORER PAGE ── */
            <motion.div
              key="explorer-view"
              initial={{ opacity: 0, x: 35, scale: 0.98 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: -35, scale: 0.98 }}
              transition={{ duration: 0.45, ease: [0.34, 1.3, 0.64, 1] }}
              className="explorer-container"
            >
              <div className="explorer-header">
                <h1 className="explorer-title">Nebula Anime Explorer</h1>
                <p className="explorer-subtitle">
                  Browse, search, and discover the complete anime catalogue in our database.
                  Use filters to find recommendations tailored for your next watch.
                </p>
              </div>

              <div className="explorer-filters">
                <div className="explorer-search-wrapper">
                  <input
                    type="text"
                    className="explorer-search-input"
                    placeholder="Search anime by title..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                  <Search className="explorer-search-icon" size={20} />
                </div>

                <div className="explorer-genres-section">
                  <h3 className="explorer-genres-label">Filter by Genre</h3>
                  <div className="explorer-genres-list">
                    {allGenres.map((genre) => (
                      <button
                        key={genre}
                        className={`genre-chip ${selectedGenre === genre ? 'active' : ''}`}
                        onClick={() => setSelectedGenre(genre)}
                      >
                        {genre}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="explorer-grid">
                {filteredAnime.length > 0 ? (
                  filteredAnime.map((anime) => (
                    <div
                      key={anime.id || anime.mal_id}
                      className="anime-card"
                      onClick={() => handleOpenDetailModal(anime)}
                      onMouseMove={handleCardMouseMove}
                      onMouseEnter={handleCardMouseEnter}
                      onMouseLeave={handleCardMouseLeave}
                    >
                      <div className="card-shine" />
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
                          <span className="card-score">⭐ {Number(anime.score).toFixed(1)}</span>
                          <span className="card-genre">
                            {anime.genres.split(',')[0].trim()}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="no-results-card">
                    <div className="no-results-icon">
                      <SearchX size={32} />
                    </div>
                    <h2 className="no-results-title">No Anime Found</h2>
                    <p className="no-results-text">
                      We couldn't find any anime matching "{searchQuery}" in category "{selectedGenre}".
                      Try adjusting your keywords or selecting another filter.
                    </p>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      )}

      {/* ── FOOTER ── */}
      <footer className="site-footer">
        <div className="footer-inner">
          <div className="footer-logo">
            <img src={logoImg} alt="Nebula Anime" className="footer-logo-img" />
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
        onClose={() => {
          setDetailModalOpen(false);
          if (authToken) {
            fetchWatchHistory(authToken);
          }
        }}
        anime={selectedModalAnime}
        user={user}
        authToken={authToken}
        backendBaseUrl={BACKEND_BASE_URL}
        onShowAuth={showAuthModal}
        favoritesList={favoritesList}
        userRatings={userRatings}
        onFavoriteAdded={(favAnime) => {
          setFavoritesCount((c) => c + 1);
          setFavoritesList((prev) => {
            const exists = prev.some(f => (f.mal_id || f.id) === (favAnime.mal_id || favAnime.id));
            if (exists) return prev;
            return [...prev, favAnime];
          });
        }}
        onRatingChanged={(animeId, newRating) => {
          setUserRatings((prev) => ({ ...prev, [animeId]: newRating }));
        }}
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

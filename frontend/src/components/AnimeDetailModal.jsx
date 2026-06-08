import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Play, ThumbsUp, ThumbsDown, Plus, Check, Tv, Info, Loader2 } from 'lucide-react';
import VideoPlayer from './VideoPlayer';

export default function AnimeDetailModal({
  isOpen,
  onClose,
  anime,
  user,
  authToken,
  backendBaseUrl,
  onShowAuth,
  onFavoriteAdded,
  favoritesList = [],
  userRatings = {},
  onRatingChanged,
}) {
  const [rating, setRating] = useState(0);
  const [isFavorite, setIsFavorite] = useState(false);

  // Tab state: 'info' | 'episodes'
  const [activeTab, setActiveTab] = useState('info');

  // Episode list state
  const [episodes, setEpisodes] = useState([]);
  const [episodesLoading, setEpisodesLoading] = useState(false);
  const [episodesError, setEpisodesError] = useState(null);

  // Streaming state
  const [streamingEp, setStreamingEp] = useState(null); // { number, title }
  const [streamLoading, setStreamLoading] = useState(false);
  const [streamError, setStreamError] = useState(null);
  const [streamData, setStreamData] = useState(null); // { stream_url, quality, referer }

  const animeId = anime ? (anime.mal_id || anime.id) : null;

  // 1. Reset state when modal opens/anime changes
  useEffect(() => {
    if (!isOpen || !animeId) return;

    // Load from cache instantly so user gets 0ms response time
    const cachedFavorite = favoritesList.some(f => (f.mal_id || f.id) === animeId);
    const cachedRating = userRatings[animeId] || 0;

    setRating(cachedRating);
    setIsFavorite(cachedFavorite);
    setActiveTab('info');
    setEpisodes([]);
    setEpisodesError(null);
    setStreamingEp(null);
    setStreamData(null);
    setStreamError(null);

    if (!user || !authToken) return;

    const headers = { Authorization: `Bearer ${authToken}` };

    fetch(`${backendBaseUrl}/api/anime/ratings/${animeId}`, { headers })
      .then((res) => (res.ok ? res.json() : { rating: 0 }))
      .then((data) => {
        const r = data.rating || 0;
        setRating(r);
        onRatingChanged?.(animeId, r);
      })
      .catch(() => {});

    fetch(`${backendBaseUrl}/api/anime/favorites/check/${animeId}`, { headers })
      .then((res) => (res.ok ? res.json() : { is_favorite: false }))
      .then((data) => setIsFavorite(data.is_favorite || false))
      .catch(() => setIsFavorite(false));
  }, [isOpen, animeId, user, authToken, backendBaseUrl, favoritesList, userRatings]);

  // 2. Load episodes immediately to get accurate count
  useEffect(() => {
    if (!animeId || episodes.length > 0) return;

    setEpisodesLoading(true);
    setEpisodesError(null);

    fetch(`${backendBaseUrl}/api/anime/${animeId}/episodes`)
      .then((res) => (res.ok ? res.json() : Promise.reject(res.statusText)))
      .then((data) => {
        let fetchedEpisodes = data.episodes || [];
        // Fallback: Generate generic episode list if cache is empty but we know the count
        if (fetchedEpisodes.length === 0 && anime.episodes > 0) {
          fetchedEpisodes = Array.from({ length: anime.episodes }, (_, i) => ({
            episode_number: i + 1,
            title: `Episode ${i + 1}`,
            is_filler: false,
          }));
        }
        setEpisodes(fetchedEpisodes);
      })
      .catch((err) => {
        console.error('Episode fetch error:', err);
        setEpisodesError('Could not load episode list. Please try again.');
      })
      .finally(() => setEpisodesLoading(false));
  }, [activeTab, animeId, backendBaseUrl, episodes.length]);

  if (!anime) return null;

  const getHeaders = () => (authToken ? { Authorization: `Bearer ${authToken}` } : {});

  // 3. Stream an episode
  const handlePlayEpisode = async (ep) => {
    setStreamingEp(ep);
    setStreamLoading(true);
    setStreamError(null);
    setStreamData(null);

    // Log to watch history
    if (user && authToken) {
      fetch(`${backendBaseUrl}/api/anime/history/add`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getHeaders() },
        body: JSON.stringify({ anime_id: animeId, anime_title: anime.title, episode_number: ep.episode_number }),
      }).catch(() => {});
    }

    try {
      const res = await fetch(
        `${backendBaseUrl}/api/stream/${animeId}/${ep.episode_number}`
      );
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail || `HTTP ${res.status}`);
      }
      const data = await res.json();
      setStreamData(data);
    } catch (err) {
      console.error('Stream fetch error:', err);
      setStreamError(err.message || 'Could not fetch stream. Please try again.');
    } finally {
      setStreamLoading(false);
    }
  };

  const handleClosePlayer = () => {
    setStreamData(null);
    setStreamingEp(null);
    setStreamError(null);
  };

  // 4. Favorites
  const handleAddToFavorites = async () => {
    if (!user || !authToken) { onShowAuth('login'); return; }
    // Optimistic update — instant UI response, no loading state
    setIsFavorite(true);
    onFavoriteAdded?.(anime);
    try {
      const res = await fetch(`${backendBaseUrl}/api/anime/favorites/add`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getHeaders() },
        body: JSON.stringify({ anime_id: animeId, anime_title: anime.title }),
      });
      if (!res.ok) setIsFavorite(false); // rollback
    } catch (err) {
      console.error('Favorites add error:', err);
      setIsFavorite(false); // rollback
    }
  };

  // 5. Ratings
  const handleSetRating = async (newRating) => {
    if (!user || !authToken) { onShowAuth('login'); return; }
    const finalRating = rating === newRating ? 0 : newRating;
    const previousRating = rating;
    // Optimistic update — instant UI response
    setRating(finalRating);
    onRatingChanged?.(animeId, finalRating);
    try {
      const res = await fetch(`${backendBaseUrl}/api/anime/rate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getHeaders() },
        body: JSON.stringify({ anime_id: animeId, rating: finalRating }),
      });
      if (!res.ok) {
        setRating(previousRating); // rollback
        onRatingChanged?.(animeId, previousRating);
      }
    } catch (err) {
      console.error('Rating error:', err);
      setRating(previousRating); // rollback
      onRatingChanged?.(animeId, previousRating);
    }
  };

  return (
    <>
      {/* Video Player Overlay */}
      <AnimatePresence>
        {(streamLoading || streamData || streamError) && streamingEp && (
          <motion.div
            key="player-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
          >
            {streamLoading ? (
              /* Nebulous Fetching Overlay */
              <div className="stream-fetch-overlay">
                <div className="stream-fetch-card">
                  <div className="stream-fetch-nebula-ring">
                    <Loader2 size={36} className="stream-fetch-spinner" />
                  </div>
                  <p className="stream-fetch-title">Nebulous is fetching your stream…</p>
                  <p className="stream-fetch-sub">
                    Resolving Episode {streamingEp.episode_number} · {streamingEp.title || ''}
                  </p>
                  <div className="stream-fetch-dots">
                    <span /><span /><span />
                  </div>
                </div>
              </div>
            ) : streamError ? (
              /* Error Overlay */
              <div className="stream-fetch-overlay">
                <div className="stream-fetch-card stream-error-card">
                  <p className="stream-fetch-title" style={{ color: '#f87171' }}>
                    ⚠ Stream Unavailable
                  </p>
                  <p className="stream-fetch-sub">{streamError}</p>
                  <button
                    className="btn-primary"
                    style={{ marginTop: '20px' }}
                    onClick={handleClosePlayer}
                  >
                    ← Back to Episodes
                  </button>
                </div>
              </div>
            ) : streamData ? (
              /* Full Video Player */
              <VideoPlayer
                streamUrl={streamData.stream_url}
                isHls={streamData.is_hls}
                episodeTitle={`Ep ${streamingEp.episode_number}${streamingEp.title ? ` — ${streamingEp.title}` : ''}`}
                animeTitle={anime.title}
                posterUrl={anime.image_url}
                animeId={animeId}
                episodeNumber={streamingEp.episode_number}
                user={user}
                authToken={authToken}
                backendBaseUrl={backendBaseUrl}
                onClose={handleClosePlayer}
              />
            ) : null}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Detail Modal */}
      <AnimatePresence>
        {isOpen && (
          <div className="modal-overlay open" onClick={onClose}>
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.97, y: 8 }}
              transition={{ duration: 0.15, ease: [0.22, 1, 0.36, 1] }}
              className="modal-box"
              onClick={(e) => e.stopPropagation()}
            >
              <button className="modal-close" onClick={onClose}>
                <X size={20} />
              </button>

              <div className="modal-inner">
                {/* Left: Poster */}
                <div className="modal-left">
                  <img
                    src={anime.image_url}
                    alt={anime.title}
                    className="modal-poster"
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src = `https://placehold.co/220x380/0b0d17/7c3aed?text=${encodeURIComponent(
                        anime.title.slice(0, 12)
                      )}`;
                    }}
                  />
                </div>

                {/* Right: Content */}
                <div className="modal-right">
                  <h2 className="modal-title">{anime.title}</h2>
                    <div className="modal-meta-row">
                      <span className="modal-score">⭐ {Number(anime.score).toFixed(1)}/10</span>
                      {episodesLoading ? (
                        <span className="modal-ep modal-ep-loading">
                          <span className="ep-count-shimmer" />
                        </span>
                      ) : (
                        <span className="modal-ep">
                          {episodes.length > 0
                            ? Math.max(anime.episodes || 0, episodes.length)
                            : (anime.episodes || '?')} Episodes
                        </span>
                      )}
                    </div>

                  {/* Tab Bar */}
                  <div className="modal-tabs">
                    <button
                      className={`modal-tab ${activeTab === 'info' ? 'active' : ''}`}
                      onClick={() => setActiveTab('info')}
                    >
                      <Info size={14} />
                      Info
                    </button>
                    <button
                      className={`modal-tab ${activeTab === 'episodes' ? 'active' : ''}`}
                      onClick={() => setActiveTab('episodes')}
                    >
                      <Tv size={14} />
                      Episodes
                    </button>
                  </div>

                  {/* ── TAB: INFO ── */}
                  {activeTab === 'info' && (
                    <div className="modal-tab-content">
                      <div className="modal-genres">
                        {anime.genres.split(',').map((genre, idx) => (
                          <span key={idx} className="genre-tag">
                            {genre.trim()}
                          </span>
                        ))}
                      </div>

                      <div className="modal-divider" />
                      <h4 className="modal-synopsis-label">Synopsis</h4>
                      <p className="modal-synopsis-text">{anime.synopsis}</p>

                      <div className="modal-actions">
                        <div className="rating-controls">
                          <button
                            className={`btn-rating ${rating === 1 ? 'active-like' : ''}`}
                            onClick={() => handleSetRating(1)}
                            title="Like"
                          >
                            <ThumbsUp size={20} />
                          </button>
                          <button
                            className={`btn-rating ${rating === -1 ? 'active-dislike' : ''}`}
                            onClick={() => handleSetRating(-1)}
                            title="Dislike"
                          >
                            <ThumbsDown size={20} />
                          </button>
                        </div>

                        {isFavorite ? (
                          <button className="btn-ghost btn-success" disabled>
                            <Check size={16} />
                            Added to List
                          </button>
                        ) : (
                          <button
                            className="btn-ghost"
                            onClick={handleAddToFavorites}
                                          >
                            <Plus size={16} />
                            Add to List
                          </button>
                        )}
                      </div>
                    </div>
                  )}

                  {/* ── TAB: EPISODES ── */}
                  {activeTab === 'episodes' && (
                    <div className="modal-tab-content">
                      {episodesLoading ? (
                        <div className="ep-loading">
                          <Loader2 size={28} className="ep-spinner" />
                          <p>Loading episode list…</p>
                        </div>
                      ) : episodesError ? (
                        <div className="ep-error">
                          <p>{episodesError}</p>
                          <button
                            className="btn-ghost"
                            style={{ marginTop: '12px' }}
                            onClick={() => { setEpisodes([]); setEpisodesError(null); setActiveTab('info'); setTimeout(() => setActiveTab('episodes'), 50); }}
                          >
                            Retry
                          </button>
                        </div>
                      ) : episodes.length === 0 ? (
                        <div className="ep-empty">
                          <Tv size={32} style={{ opacity: 0.35, marginBottom: '12px' }} />
                          <p>No episode data cached yet.</p>
                          <p style={{ fontSize: '12px', opacity: 0.5, marginTop: '6px' }}>
                            Try re-running the backfill script.
                          </p>
                        </div>
                      ) : (
                        <div className="ep-list">
                          {episodes.map((ep) => (
                            <div
                              key={ep.episode_number}
                              className="ep-row"
                            >
                              <div className="ep-info">
                                <span className="ep-number">Ep {ep.episode_number}</span>
                                {ep.is_filler && (
                                  <span className="ep-filler-badge">Filler</span>
                                )}
                                <span className="ep-title">
                                  {ep.title || `Episode ${ep.episode_number}`}
                                </span>
                              </div>
                              <button
                                className="ep-play-btn"
                                onClick={() => handlePlayEpisode(ep)}
                                title={`Play Episode ${ep.episode_number}`}
                              >
                                <Play size={14} fill="currentColor" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}

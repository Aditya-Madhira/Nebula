import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Play, ThumbsUp, ThumbsDown, Plus, Check } from 'lucide-react';

export default function AnimeDetailModal({
  isOpen,
  onClose,
  anime,
  user,
  authToken,
  backendBaseUrl,
  onShowAuth,
}) {
  const [rating, setRating] = useState(0); // 1 (Like), -1 (Dislike), 0 (None)
  const [isFavorite, setIsFavorite] = useState(false);
  const [favoriteLoading, setFavoriteLoading] = useState(false);

  const animeId = anime ? (anime.mal_id || anime.id) : null;

  // 1. Fetch rating and favorite state when active anime changes
  useEffect(() => {
    if (!isOpen || !animeId) return;

    // Reset local UI states first
    setRating(0);
    setIsFavorite(false);

    if (!user || !authToken) return;

    const headers = { Authorization: `Bearer ${authToken}` };

    // Fetch user rating
    fetch(`${backendBaseUrl}/api/anime/ratings/${animeId}`, { headers })
      .then((res) => (res.ok ? res.json() : { rating: 0 }))
      .then((data) => setRating(data.rating || 0))
      .catch(() => setRating(0));

    // Fetch watchlist status
    fetch(`${backendBaseUrl}/api/anime/favorites/check/${animeId}`, { headers })
      .then((res) => (res.ok ? res.json() : { is_favorite: false }))
      .then((data) => setIsFavorite(data.is_favorite || false))
      .catch(() => setIsFavorite(false));
  }, [isOpen, animeId, user, authToken, backendBaseUrl]);

  if (!anime) return null;

  const getHeaders = () => (authToken ? { Authorization: `Bearer ${authToken}` } : {});

  // 2. Add to viewing history on backend
  const handleWatchNow = async () => {
    window.open(`https://myanimelist.net/anime/${animeId}`, '_blank');
    if (!user || !authToken) return;

    try {
      await fetch(`${backendBaseUrl}/api/anime/history/add`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getHeaders(),
        },
        body: JSON.stringify({
          anime_id: animeId,
          anime_title: anime.title,
        }),
      });
    } catch (err) {
      console.error('History logging error:', err);
    }
  };

  // 3. Add to Watchlist (Favorites)
  const handleAddToFavorites = async () => {
    if (!user || !authToken) {
      onShowAuth('login');
      return;
    }

    setFavoriteLoading(true);
    try {
      const res = await fetch(`${backendBaseUrl}/api/anime/favorites/add`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getHeaders(),
        },
        body: JSON.stringify({
          anime_id: animeId,
          anime_title: anime.title,
        }),
      });
      if (res.ok) {
        setIsFavorite(true);
      }
    } catch (err) {
      console.error('Favorites add error:', err);
    } finally {
      setFavoriteLoading(false);
    }
  };

  // 4. Rate Anime
  const handleSetRating = async (newRating) => {
    if (!user || !authToken) {
      onShowAuth('login');
      return;
    }

    // Toggle back to 0 if clicking the same rating again
    const finalRating = rating === newRating ? 0 : newRating;

    try {
      const res = await fetch(`${backendBaseUrl}/api/anime/rate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getHeaders(),
        },
        body: JSON.stringify({
          anime_id: animeId,
          rating: finalRating,
        }),
      });
      if (res.ok) {
        setRating(finalRating);
      }
    } catch (err) {
      console.error('Rating update error:', err);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="modal-overlay open" onClick={onClose}>
          {/* Animated Modal Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 30 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 30 }}
            transition={{ type: 'spring', damping: 22, stiffness: 220 }}
            className="modal-box"
            onClick={(e) => e.stopPropagation()} // Prevent close on inner clicks
          >
            <button className="modal-close" onClick={onClose}>
              <X size={20} />
            </button>

            <div className="modal-inner">
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

              <div className="modal-right">
                <h2 className="modal-title">{anime.title}</h2>
                <div className="modal-meta-row">
                  <span className="modal-score">⭐ {anime.score}/10</span>
                  <span className="modal-ep">{anime.episodes} Episodes</span>
                </div>

                <div className="modal-genres">
                  {anime.genres.split(',').map((genre, idx) => (
                    <span key={idx} className="genre-tag">
                      {genre.trim()}
                    </span>
                  ))}
                </div>

                <div className="modal-divider"></div>
                <h4 className="modal-synopsis-label">Synopsis</h4>
                <p className="modal-synopsis-text">{anime.synopsis}</p>

                <div className="modal-actions">
                  <button className="btn-primary" onClick={handleWatchNow}>
                    <Play size={16} fill="currentColor" />
                    Watch Now
                  </button>

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
                      Already Added
                    </button>
                  ) : (
                    <button
                      className="btn-ghost"
                      onClick={handleAddToFavorites}
                      disabled={favoriteLoading}
                    >
                      <Plus size={16} />
                      Add to List
                    </button>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

import re

CSS_FILE = "c:/Users/adity/Desktop/Anime_rec_local/frontend/src/index.css"
MODAL_FILE = "c:/Users/adity/Desktop/Anime_rec_local/frontend/src/components/AnimeDetailModal.jsx"

# ─────────────────────────────────────────────
# 1. CSS PERFORMANCE PATCHES
# ─────────────────────────────────────────────
with open(CSS_FILE, 'r', encoding='utf-8') as f:
    css = f.read()

# 1a. Card: faster, snappier transform + contain: layout for isolation
old_card = """.anime-card {
  flex: 0 0 185px;
  height: 275px;
  border-radius: var(--radius-md);
  overflow: hidden;
  position: relative;
  cursor: pointer;
  background: var(--surface);
  border: 1px solid var(--border);
  transform-style: preserve-3d;
  transform: perspective(1000px) rotateX(var(--rx, 0deg)) rotateY(var(--ry, 0deg)) translateY(0) scale(1);
  transition: 
    transform 0.15s cubic-bezier(0.25, 0.8, 0.25, 1),
    box-shadow 0.35s var(--ease),
    border-color 0.25s;
  animation: cardIn 0.5s var(--ease) backwards;
  will-change: transform;
}"""

new_card = """.anime-card {
  flex: 0 0 185px;
  height: 275px;
  border-radius: var(--radius-md);
  overflow: hidden;
  position: relative;
  cursor: pointer;
  background: var(--surface);
  border: 1px solid var(--border);
  transform-style: preserve-3d;
  transform: perspective(1000px) rotateX(var(--rx, 0deg)) rotateY(var(--ry, 0deg)) translateY(0) scale(1);
  transition:
    transform 0.08s cubic-bezier(0.22, 1, 0.36, 1),
    box-shadow 0.12s ease,
    border-color 0.1s;
  animation: cardIn 0.4s var(--ease) backwards;
  will-change: transform, box-shadow;
  contain: layout style;
}"""

css = css.replace(old_card, new_card)

# 1b. Card hover: tighter lift, faster
old_hover = """.anime-card:hover {
  transform: perspective(1000px) rotateX(var(--rx, 0deg)) rotateY(var(--ry, 0deg)) translateY(-10px) scale(1.06);
  border-color: rgba(139,92,246,0.7);
  box-shadow:
    0 20px 50px rgba(0,0,0,0.65),
    0 0 0 1px rgba(139,92,246,0.35),
    0 0 25px rgba(139,92,246,0.6);
  z-index: 5;
}"""

new_hover = """.anime-card:hover {
  transform: perspective(1000px) rotateX(var(--rx, 0deg)) rotateY(var(--ry, 0deg)) translateY(-6px) scale(1.04);
  border-color: rgba(139,92,246,0.7);
  box-shadow:
    0 14px 35px rgba(0,0,0,0.6),
    0 0 0 1px rgba(139,92,246,0.3),
    0 0 18px rgba(139,92,246,0.5);
  z-index: 5;
}"""

css = css.replace(old_hover, new_hover)

# 1c. Card image: faster scale
old_img = ".card-img {\n  width: 100%; height: 100%;\n  object-fit: cover;\n  transition: transform 0.5s var(--ease);\n}"
new_img = ".card-img {\n  width: 100%; height: 100%;\n  object-fit: cover;\n  transition: transform 0.1s ease;\n}"
css = css.replace(old_img, new_img)

# 1d. Card shine: faster fade
old_shine_t = "  transition: opacity 0.35s ease;"
new_shine_t = "  transition: opacity 0.12s ease;"
css = css.replace(old_shine_t, new_shine_t)

# 1e. Card overlay: faster fade
old_overlay_t = "  transition: opacity 0.3s var(--ease);"
new_overlay_t = "  transition: opacity 0.1s ease;"
css = css.replace(old_overlay_t, new_overlay_t)

# 1f. Modal overlay: faster, cheaper blur
old_modal_overlay = """  background: rgba(4,5,10,0.8);
  backdrop-filter: blur(20px);"""
new_modal_overlay = """  background: rgba(4,5,10,0.82);
  backdrop-filter: blur(8px);"""
css = css.replace(old_modal_overlay, new_modal_overlay)

# 1g. Modal box: faster animation
old_modal_anim = """  animation: modalIn 0.3s var(--ease-spring);"""
new_modal_anim = """  animation: modalIn 0.18s cubic-bezier(0.22, 1, 0.36, 1);"""
css = css.replace(old_modal_anim, new_modal_anim)

old_modal_keyframes = """@keyframes modalIn {
  from { opacity:0; transform: scale(0.94) translateY(20px); }
  to   { opacity:1; transform: scale(1) translateY(0); }
}"""
new_modal_keyframes = """@keyframes modalIn {
  from { opacity:0; transform: scale(0.96) translateY(12px); }
  to   { opacity:1; transform: scale(1) translateY(0); }
}"""
css = css.replace(old_modal_keyframes, new_modal_keyframes)

# 1h. Modal overlay fade: faster
old_modal_fade = """  animation: fadeIn 0.2s ease;"""
new_modal_fade = """  animation: fadeIn 0.12s ease;"""
css = css.replace(old_modal_fade, new_modal_fade)

with open(CSS_FILE, 'w', encoding='utf-8') as f:
    f.write(css)

print("CSS patched.")

# ─────────────────────────────────────────────
# 2. OPTIMISTIC UI IN AnimeDetailModal.jsx
# ─────────────────────────────────────────────
with open(MODAL_FILE, 'r', encoding='utf-8') as f:
    modal = f.read()

# 2a. Optimistic rating - update UI first, rollback on failure
old_rating = """  const handleSetRating = async (newRating) => {
    if (!user || !authToken) { onShowAuth('login'); return; }
    const finalRating = rating === newRating ? 0 : newRating;
    try {
      const res = await fetch(`${backendBaseUrl}/api/anime/rate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getHeaders() },
        body: JSON.stringify({ anime_id: animeId, rating: finalRating }),
      });
      if (res.ok) setRating(finalRating);
    } catch (err) {
      console.error('Rating error:', err);
    }
  };"""

new_rating = """  const handleSetRating = async (newRating) => {
    if (!user || !authToken) { onShowAuth('login'); return; }
    const finalRating = rating === newRating ? 0 : newRating;
    const previousRating = rating;
    // Optimistic update — instant UI response
    setRating(finalRating);
    try {
      const res = await fetch(`${backendBaseUrl}/api/anime/rate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getHeaders() },
        body: JSON.stringify({ anime_id: animeId, rating: finalRating }),
      });
      if (!res.ok) setRating(previousRating); // rollback
    } catch (err) {
      console.error('Rating error:', err);
      setRating(previousRating); // rollback
    }
  };"""

modal = modal.replace(old_rating, new_rating)

# 2b. Optimistic favorites - no loading spinner, instant toggle
old_fav = """  const handleAddToFavorites = async () => {
    if (!user || !authToken) { onShowAuth('login'); return; }
    setFavoriteLoading(true);
    try {
      const res = await fetch(`${backendBaseUrl}/api/anime/favorites/add`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getHeaders() },
        body: JSON.stringify({ anime_id: animeId, anime_title: anime.title }),
      });
      if (res.ok) { setIsFavorite(true); onFavoriteAdded?.(); }
    } catch (err) {
      console.error('Favorites add error:', err);
    } finally {
      setFavoriteLoading(false);
    }
  };"""

new_fav = """  const handleAddToFavorites = async () => {
    if (!user || !authToken) { onShowAuth('login'); return; }
    // Optimistic update — instant UI response, no loading state
    setIsFavorite(true);
    onFavoriteAdded?.();
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
  };"""

modal = modal.replace(old_fav, new_fav)

# 2c. Remove favoriteLoading state (no longer needed)
modal = modal.replace(
    "  const [favoriteLoading, setFavoriteLoading] = useState(false);\n",
    ""
)

# 2d. Remove disabled={favoriteLoading} from button
modal = modal.replace(
    "            disabled={favoriteLoading}\n",
    ""
)

with open(MODAL_FILE, 'w', encoding='utf-8') as f:
    f.write(modal)

print("AnimeDetailModal.jsx patched with optimistic UI.")

import os

app_file = "c:/Users/adity/Desktop/Anime_rec_local/frontend/src/App.jsx"
modal_file = "c:/Users/adity/Desktop/Anime_rec_local/frontend/src/components/AnimeDetailModal.jsx"

with open(app_file, 'r', encoding='utf-8') as f:
    app_content = f.read()

# 1. Add selectedType state
app_content = app_content.replace(
    "const [selectedGenre, setSelectedGenre] = useState('All');",
    "const [selectedGenre, setSelectedGenre] = useState('All');\n  const [selectedType, setSelectedType] = useState('All');"
)

# 2. Update cosmicRows definition
app_content = app_content.replace(
    "const cosmicRows = [\n    { title: 'Trending in the Nebula', data: animeList },\n    { title: 'Cosmic Classics', data: shuffleArray(animeList, 1) },\n    { title: 'New Stars Rising', data: shuffleArray(animeList, 2) },\n    { title: 'Hidden in the Void', data: shuffleArray(animeList, 3) },\n    { title: 'Popular Across the Galaxy', data: shuffleArray(animeList, 4) },\n  ];",
    "const cosmicRows = [\n    { title: 'Top TV Series', data: animeList.filter(a => a.anime_type !== 'Movie'), type: 'TV' },\n    { title: 'Top Anime Movies', data: animeList.filter(a => a.anime_type === 'Movie'), type: 'Movie' },\n    { title: 'New Stars Rising', data: shuffleArray(animeList, 2) },\n    { title: 'Hidden in the Void', data: shuffleArray(animeList, 3) },\n    { title: 'Popular Across the Galaxy', data: shuffleArray(animeList, 4) },\n  ];"
)

# 3. Update matches filters
target_matches = """    const matchesGenre =
      selectedGenre === 'All' ||
      (anime.genres &&
        anime.genres
          .split(',')
          .map((g) => g.trim())
          .includes(selectedGenre));

    return matchesSearch && matchesGenre;"""
replacement_matches = """    const matchesGenre =
      selectedGenre === 'All' ||
      (anime.genres &&
        anime.genres
          .split(',')
          .map((g) => g.trim())
          .includes(selectedGenre));
    const matchesType =
      selectedType === 'All' ||
      (selectedType === 'Movie' ? anime.anime_type === 'Movie' : anime.anime_type !== 'Movie');

    return matchesSearch && matchesGenre && matchesType;"""
app_content = app_content.replace(target_matches, replacement_matches)

# 4. See all logic
target_see_all = """                      <a href="#" className="row-see-all" onClick={(e) => e.preventDefault()}>
                        See all →
                      </a>"""
replacement_see_all = """                      <a href="#" className="row-see-all" onClick={(e) => {
                        e.preventDefault();
                        if (row.type === 'Movie') setSelectedType('Movie');
                        else if (row.type === 'TV') setSelectedType('TV');
                        else setSelectedType('All');
                        setCurrentView('explorer');
                      }}>
                        See all →
                      </a>"""
app_content = app_content.replace(target_see_all, replacement_see_all)

# 5. Type Badge on Home Row Cards
target_card_overlay = """                                />
                                <div className="card-overlay">
                                  <h3 className="card-title">{anime.title}</h3>"""
replacement_card_overlay = """                                />
                                {anime.anime_type === 'Movie' ? (
                                  <span className="card-type-badge type-badge-movie">MOVIE</span>
                                ) : (
                                  <span className="card-type-badge type-badge-tv">TV</span>
                                )}
                                <div className="card-overlay">
                                  <h3 className="card-title">{anime.title}</h3>"""
app_content = app_content.replace(target_card_overlay, replacement_card_overlay)

# 6. Type Filter in Explorer
target_explorer_search = """                    </div>

                    <div className="genre-filters">
                      {genres.map((genre) => ("""
replacement_explorer_search = """                    </div>

                    <div className="genre-filters" style={{ marginBottom: '16px' }}>
                      {['All', 'TV', 'Movie'].map((type) => (
                        <button
                          key={type}
                          className={`genre-chip ${selectedType === type ? 'active' : ''}`}
                          onClick={() => setSelectedType(type)}
                          style={{ borderColor: selectedType === type ? 'var(--cyan)' : '', color: selectedType === type ? 'var(--cyan)' : '' }}
                        >
                          {type === 'All' ? 'All Types' : type === 'TV' ? 'TV Series' : 'Movies'}
                        </button>
                      ))}
                    </div>

                    <div className="genre-filters">
                      {genres.map((genre) => ("""
app_content = app_content.replace(target_explorer_search, replacement_explorer_search)

# 7. Type Badge in Explorer Cards
target_explorer_card = """                        />
                        <div className="card-overlay">
                          <h3 className="card-title">{anime.title}</h3>"""
replacement_explorer_card = """                        />
                        {anime.anime_type === 'Movie' ? (
                          <span className="card-type-badge type-badge-movie">MOVIE</span>
                        ) : (
                          <span className="card-type-badge type-badge-tv">TV</span>
                        )}
                        <div className="card-overlay">
                          <h3 className="card-title">{anime.title}</h3>"""
app_content = app_content.replace(target_explorer_card, replacement_explorer_card)

with open(app_file, 'w', encoding='utf-8') as f:
    f.write(app_content)

# Update Modal
with open(modal_file, 'r', encoding='utf-8') as f:
    modal_content = f.read()

target_modal_meta = """                    <div className="modal-meta-row">
                      <span className="modal-score">⭐ {Number(anime.score).toFixed(1)}/10</span>
                      {episodesLoading ? ("""
replacement_modal_meta = """                    <div className="modal-meta-row">
                      <span className="modal-score">⭐ {Number(anime.score).toFixed(1)}/10</span>
                      <span className="modal-score" style={{ marginLeft: '12px' }}>
                        {anime.anime_type === 'Movie' ? '🎬 Movie' : '📺 TV Series'}
                      </span>
                      {episodesLoading ? ("""
modal_content = modal_content.replace(target_modal_meta, replacement_modal_meta)

with open(modal_file, 'w', encoding='utf-8') as f:
    f.write(modal_content)

print("Updated App.jsx and AnimeDetailModal.jsx")

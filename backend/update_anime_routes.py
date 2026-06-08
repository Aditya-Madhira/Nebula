import os

file_path = "c:/Users/adity/Desktop/Anime_rec_local/backend/routes/anime.py"
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

target1 = """                    anime_entry = {
                        "mal_id": mal_id,
                        "title": item.get("title"),
                        "genres": genres,
                        "score": item.get("score") or 0.0,
                        "episodes": item.get("episodes") or 12,
                        "synopsis": item.get("synopsis") or "No synopsis available.",
                        "image_url": image_url
                    }
                    
                    conn.execute(
                        \"\"\"INSERT INTO anime (mal_id, title, genres, score, episodes, synopsis, image_url)
                           VALUES (?, ?, ?, ?, ?, ?, ?)\"\"\",
                        (mal_id, anime_entry["title"], genres, anime_entry["score"], anime_entry["episodes"], anime_entry["synopsis"], image_url)
                    )"""

replacement1 = """                    anime_entry = {
                        "mal_id": mal_id,
                        "title": item.get("title"),
                        "genres": genres,
                        "score": item.get("score") or 0.0,
                        "episodes": item.get("episodes") or 12,
                        "synopsis": item.get("synopsis") or "No synopsis available.",
                        "image_url": image_url,
                        "anime_type": item.get("type") or "TV"
                    }
                    
                    conn.execute(
                        \"\"\"INSERT INTO anime (mal_id, title, genres, score, episodes, synopsis, image_url, anime_type)
                           VALUES (?, ?, ?, ?, ?, ?, ?, ?)\"\"\",
                        (mal_id, anime_entry["title"], genres, anime_entry["score"], anime_entry["episodes"], anime_entry["synopsis"], image_url, anime_entry["anime_type"])
                    )"""

content = content.replace(target1, replacement1)

target2 = """            SELECT TOP 20
                   h.anime_id as mal_id, a.title, a.image_url, a.genres, a.score, a.episodes, a.synopsis,
                   h.episode_number, h.progress_seconds, h.watched_at"""
replacement2 = """            SELECT TOP 20
                   h.anime_id as mal_id, a.title, a.image_url, a.genres, a.score, a.episodes, a.synopsis, a.anime_type,
                   h.episode_number, h.progress_seconds, h.watched_at"""

content = content.replace(target2, replacement2)

target3 = """            SELECT f.anime_id as mal_id, a.title, a.image_url, a.genres, a.score, a.episodes, a.synopsis,
                   f.created_at"""
replacement3 = """            SELECT f.anime_id as mal_id, a.title, a.image_url, a.genres, a.score, a.episodes, a.synopsis, a.anime_type,
                   f.created_at"""

content = content.replace(target3, replacement3)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Updated anime.py")

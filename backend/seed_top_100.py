import os
import json
import time
import requests

ANIME_JSON_PATH = os.path.join(os.path.dirname(__file__), "anime.json")

def fetch_top_100():
    print("Starting seeding process from Jikan API...")
    anime_list = []
    
    # Fetch 4 pages of top anime (25 per page = 100 entries)
    for page in range(1, 5):
        url = f"https://api.jikan.moe/v4/top/anime?page={page}"
        print(f"Fetching page {page} of top anime...")
        
        try:
            res = requests.get(url, timeout=15)
            if res.status_code != 200:
                print(f"Error fetching page {page}: HTTP {res.status_code}")
                time.sleep(2)
                continue
                
            data = res.json()
            items = data.get("data", [])
            
            for item in items:
                # Format to match local database schema
                genres = ", ".join([g.get("name", "") for g in item.get("genres", [])])
                
                # Try to resolve image url
                images = item.get("images", {})
                image_url = images.get("jpg", {}).get("large_image_url") or images.get("jpg", {}).get("image_url")
                
                anime_entry = {
                    "mal_id": item.get("mal_id"),
                    "title": item.get("title"),
                    "genres": genres,
                    "score": item.get("score") or 0.0,
                    "episodes": item.get("episodes") or 12,
                    "synopsis": item.get("synopsis") or "No synopsis available.",
                    "image_url": image_url or ""
                }
                anime_list.append(anime_entry)
                
            # Rate limit friendly wait
            time.sleep(1.2)
            
        except Exception as e:
            print(f"Exception on page {page}: {e}")
            time.sleep(2)
            
    if len(anime_list) > 0:
        with open(ANIME_JSON_PATH, "w", encoding="utf-8") as f:
            json.dump(anime_list, f, indent=2, ensure_ascii=False)
        print(f"Successfully seeded {len(anime_list)} anime entries in {ANIME_JSON_PATH}!")
    else:
        print("Failed to fetch any anime entries. Local anime.json was not updated.")

if __name__ == "__main__":
    fetch_top_100()

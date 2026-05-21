import sys
import os
from dotenv import load_dotenv

# Add backend to path
sys.path.append(os.path.join(os.getcwd(), "backend"))

from agno.agent import Agent
from agno.models.ollama import Ollama
from agent import build_agent

load_dotenv()

def test_nebula_agent():
    print("--- Testing Nebula Agent (User ID: 1) ---")
    
    # 1. Build the agent for our test user (ID: 1)
    # This uses the same logic as the real app, including tools and storage
    agent = build_agent("1")
    
    # 2. Ask a question that requires database access
    # Should see it querying user_ratings and the anime table
    print("\n[Test 1: Personalized Recommendations]")
    agent.print_response("Based on my ratings, what should I watch next? Mention what I already liked.")
    
    # 3. Ask about identity (calls get_user_profile tool)
    print("\n[Test 2: Profile Check]")
    agent.print_response("Who am I according to your records?")
    
    # 4. Persistence check (Agno will pull from agent_sessions)
    print("\n[Test 3: Memory Check]")
    agent.print_response("What was the first thing I asked you just now?")

if __name__ == "__main__":
    test_nebula_agent()

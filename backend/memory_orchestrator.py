import os
os.environ["ANONYMIZED_TELEMETRY"] = "False"
import chromadb
from chromadb.config import Settings
import json
from config import load_config
import httpx

# Use google-genai or standard requests for embedding. We use standard requests to keep it simple and dependency-light.
# External Embedding API is strictly enforced. No local models.

IAM_MIA_DIR = os.path.join(os.path.dirname(__file__), "iam_mia")
CHROMA_DB_DIR = os.path.join(IAM_MIA_DIR, "chroma_db")

class MemoryOrchestrator:
    def __init__(self):
        os.makedirs(CHROMA_DB_DIR, exist_ok=True)
        # Initialize ChromaDB persistent client
        self.client = chromadb.PersistentClient(path=CHROMA_DB_DIR)
        
        # We explicitly DO NOT use Chroma's default embedding function (which downloads local models).
        # We will pass embeddings manually.
        self.collection = self.client.get_or_create_collection(name="mia_episodic_memory")

    def _get_gemini_api_key(self):
        config = load_config()
        gemini = config.providers.get("Gemini")
        if gemini and gemini.api_key:
            return gemini.api_key
        return None

    async def get_embedding(self, text: str) -> list[float]:
        """
        Get embedding from external API (Gemini text-embedding-004).
        Strictly adhering to: NO LOCAL MODELS.
        """
        api_key = self._get_gemini_api_key()
        if not api_key:
            print("[Warning] No Gemini API Key found. Memory Embedding skipped.")
            # Return dummy vector if no API key to prevent crashing, 
            # though in production you'd want to handle this gracefully in the UI.
            return [0.0] * 768 
            
        url = f"https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent?key={api_key}"
        headers = {'Content-Type': 'application/json'}
        payload = {
            "model": "models/text-embedding-004",
            "content": {
                "parts": [{"text": text}]
            }
        }
        
        async with httpx.AsyncClient() as client:
            try:
                response = await client.post(url, headers=headers, json=payload, timeout=10.0)
                response.raise_for_status()
                data = response.json()
                return data['embedding']['values']
            except Exception as e:
                print(f"[Error] Failed to get embedding from Gemini: {e}")
                return [0.0] * 768

    async def add_memory(self, text: str, metadata: dict = None):
        """Add a new episodic memory to the Vector DB."""
        if not text.strip(): return
        
        import uuid
        doc_id = str(uuid.uuid4())
        embedding = await self.get_embedding(text)
        
        self.collection.add(
            ids=[doc_id],
            documents=[text],
            embeddings=[embedding],
            metadatas=[metadata or {"source": "conversation"}]
        )

    async def search_memory(self, query: str, n_results: int = 3):
        """Search the Vector DB for semantically similar memories."""
        embedding = await self.get_embedding(query)
        if sum(embedding) == 0.0:
            return [] # Skip search if embedding failed
            
        try:
            results = self.collection.query(
                query_embeddings=[embedding],
                n_results=n_results
            )
            
            if results and 'documents' in results and results['documents']:
                return results['documents'][0]
            return []
        except Exception as e:
            print(f"[Error] Search failed: {e}")
            return []

    def read_tier_1_memory(self) -> str:
        """Read SOUL.md, USER.md, and MEMORY.md."""
        core_files = ["SOUL.md", "USER.md", "MEMORY.md"]
        context = ""
        for file in core_files:
            filepath = os.path.join(IAM_MIA_DIR, file)
            if os.path.exists(filepath):
                with open(filepath, "r", encoding="utf-8") as f:
                    content = f.read().strip()
                    if content:
                        context += f"\n\n--- Content of {file} ---\n{content}"
        return context

    async def assemble_context(self, current_query: str, injected_files: list[str] = None) -> str:
        """
        Assemble the ultimate flagship prompt context:
        Tier 1 (Core) + Tier 3 (RAG) + Injected Files (@mentions).
        """
        context = "You are an autonomous AI Agent responding to the user based on the following context:\n"
        
        # 1. Tier 1 Core Identity
        context += self.read_tier_1_memory()
        
        # 2. Injected Files (@ Mentions)
        if injected_files:
            for file in injected_files:
                filepath = os.path.join(IAM_MIA_DIR, file)
                if os.path.exists(filepath):
                    with open(filepath, "r", encoding="utf-8") as f:
                        context += f"\n\n--- Content of {file} (Injected via @mention) ---\n{f.read()}"
        
        # 3. Tier 3 RAG Search
        past_memories = await self.search_memory(current_query)
        if past_memories:
            context += "\n\n--- Relevant Past Memories (Semantic Search) ---\n"
            for mem in past_memories:
                context += f"- {mem}\n"
                
        return context

# Singleton instance
memory_orchestrator = MemoryOrchestrator()

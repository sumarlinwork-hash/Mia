import os
os.environ["ANONYMIZED_TELEMETRY"] = "False"
import chromadb
from chromadb.config import Settings
import json
from config import load_config
from core.mode_hub import mode_hub, MIAMode
import httpx

# Use google-genai or standard requests for embedding. We use standard requests to keep it simple and dependency-light.
# External Embedding API is strictly enforced. No local models.

IAM_MIA_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "iam_mia")
CHROMA_DB_DIR = os.path.join(IAM_MIA_DIR, "chroma_db")
MEMORY_LOG_DIR = os.path.join(IAM_MIA_DIR, "memory")
CHAT_LOG_FILE = os.path.join(MEMORY_LOG_DIR, "chat_log.md")

class MemoryOrchestrator:
    def __init__(self):
        os.makedirs(CHROMA_DB_DIR, exist_ok=True)
        # Initialize ChromaDB persistent client with telemetry disabled
        self.client = chromadb.PersistentClient(
            path=CHROMA_DB_DIR,
            settings=Settings(anonymized_telemetry=False)
        )
        
        # DUAL-COLLECTION ARCHITECTURE: Isolating NSFW from General context
        self.collection_general = self.client.get_or_create_collection(name="mia_general")
        self.collection_intimate = self.client.get_or_create_collection(name="mia_intimate")
        
        # Legacy fallback/migration handle (optional, but good for stability)
        self.collection = self.collection_general

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

    async def add_memory(self, text: str, metadata: dict = None, is_intimate: bool = False):
        """Add a new episodic memory to the appropriate Vector DB namespace."""
        if not text.strip(): return
        
        import uuid
        doc_id = str(uuid.uuid4())
        embedding = await self.get_embedding(text)
        
        target_collection = self.collection_intimate if is_intimate else self.collection_general
        
        target_collection.add(
            ids=[doc_id],
            documents=[text],
            embeddings=[embedding],
            metadatas=[metadata or {"source": "conversation"}]
        )

    async def search_memory(self, query: str, n_results: int = 3, is_intimate: bool = False):
        """Search the appropriate Vector DB namespace for semantically similar memories."""
        embedding = await self.get_embedding(query)
        if sum(embedding) == 0.0:
            return [] # Skip search if embedding failed
            
        try:
            target_collection = self.collection_intimate if is_intimate else self.collection_general
            
            results = target_collection.query(
                query_embeddings=[embedding],
                n_results=n_results
            )
            
            if results and 'documents' in results and results['documents']:
                return results['documents'][0]
            return []
        except Exception as e:
            print(f"[Error] Search failed in {'intimate' if is_intimate else 'general'} namespace: {e}")
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

    async def assemble_context(self, current_query: str, injected_files: list[str] = None, is_intimate: bool = False) -> str:
        """
        Assemble the ultimate flagship prompt context:
        Tier 1 (Core) + Tier 3 (RAG) + Injected Files (@mentions).
        """
        context = "You are an autonomous AI Agent responding to the user based on the following context:\n"
        
        # 1. Tier 1 Core Identity
        context += self.read_tier_1_memory()
        
        # 2. Injected Files (@ Mentions)
        all_injected = injected_files or []
        
        # MODE-AWARE AUTO-LOADING (Contract 5.1/6.0 Alignment)
        current_mode = mode_hub.get_mode()
        if current_mode == MIAMode.POWER_MODE:
            # Auto-load technical/agentic context in Expert Mode
            if "TOOLS.md" not in all_injected: all_injected.append("TOOLS.md")
            if "AGENTS.md" not in all_injected: all_injected.append("AGENTS.md")
        
        if all_injected:
            for file in all_injected:
                filepath = os.path.join(IAM_MIA_DIR, file)
                if os.path.exists(filepath):
                    with open(filepath, "r", encoding="utf-8") as f:
                        context += f"\n\n--- Content of {file} (Injected) ---\n{f.read()}"
        
        # 3. Tier 3 RAG Search (Namespace Aware)
        past_memories = await self.search_memory(current_query, is_intimate=is_intimate)
        if past_memories:
            context += f"\n\n--- Relevant Past Memories ({'Intimate' if is_intimate else 'General'} Namespace) ---\n"
            for mem in past_memories:
                context += f"- {mem}\n"

        # 4. Tier 2 Episodic Memory (Recent Chat Log) - SSOT
        if os.path.exists(CHAT_LOG_FILE):
            try:
                with open(CHAT_LOG_FILE, "r", encoding="utf-8") as f:
                    chat_log = f.read().strip()
                    if chat_log:
                        context += f"\n\n--- Recent Conversation Log (Tier 2) ---\n{chat_log}"
            except Exception as e:
                print(f"[MemoryOrchestrator] Failed to read chat_log.md: {e}")
                
        return context

    async def clear_memory(self):
        """Wipe all episodic memories from both namespaces."""
        try:
            self.client.delete_collection(name="mia_general")
            self.client.delete_collection(name="mia_intimate")
            self.collection_general = self.client.get_or_create_collection(name="mia_general")
            self.collection_intimate = self.client.get_or_create_collection(name="mia_intimate")
            self.collection = self.collection_general
        except Exception as e:
            print(f"[Error] Failed to clear memory: {e}")

# Singleton instance
memory_orchestrator = MemoryOrchestrator()

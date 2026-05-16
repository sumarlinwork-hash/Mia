# Local LLM Integration Specification (SSOT)

This document serves as the Single Source of Truth for the integration of Local Large Language Models (LLMs) into the MIA system, focusing on **GPT4All** as the primary engine for private, offline intelligence.

## 1. Architectural Vision
MIA aims to achieve total cognitive autonomy. By integrating GPT4All, MIA can function without an internet connection, ensuring 100% privacy and zero dependency on external API providers.

### Key Objectives:
- **Zero-Latency Privacy**: No data leaves the local machine.
- **Hardware Agnostic**: Optimized for CPU-based inference (Intel Core i3+ / Ivy Bridge compatible).
- **OpenAI Compatibility**: Leveraging GPT4All's local API server to fit MIA's existing provider architecture.

---

## 2. Technical Strategy: Local LLM Integration (Ollama, GPT4All, LM Studio)

MIA provides a "Local LLM" umbrella provider designed to integrate with any OpenAI-compatible local engine (Ollama, GPT4All, LM Studio, etc.).

### Connectivity Details:
- **Protocol**: OpenAI Compatible (Local)
- **Base URL**: `http://localhost:11434/v1` (Ollama) or `http://localhost:4891/v1` (GPT4All)
- **Model Target**: User-defined (e.g., `llama3`, `deepseek-r1`, `mistral`).
- **API Key**: Optional for local endpoints (`localhost` or `127.0.0.1`).

### Provider Mapping in MIA (Manual Registration):
| Field | Value |
|-------|-------|
| `display_name` | "Local LLM" |
| `protocol` | `openai_compatible` |
| `base_url` | `http://localhost:11434/v1` |
| `model_id` | `llama3` |
| `purpose` | "Inti Logika & Pikiran (Private)" |
| `cost_label` | "Gratis (Offline)" |

---

## 3. Implementation Roadmap

### Phase 1: Preparation (Manual Setup)
1. User installs [GPT4All Desktop](https://gpt4all.io/).
2. User downloads the desired model (e.g., DeepSeek-R1 Distill).
3. User enables "Enable API Server" in GPT4All settings.

### Phase 2: Backend Integration
1. Update `backend/config.py` to include GPT4All in default providers (optional).
2. Modify `backend/main.py` test-connection logic to handle local timeouts gracefully.
3. Ensure `brain_orchestrator` correctly routes requests to the local port.

### Phase 3: Frontend UI Enhancements
1. Add a "Private/Offline Mode" badge in Provider Settings.
2. Implement auto-detection for local GPT4All instance (ping `localhost:4891`).

---

## 4. Hardware Optimization (Ivy Bridge Focus)
To ensure smooth performance on older hardware:
- **Quantization**: Use 4-bit quantized models (GGUF format) to minimize RAM usage.
- **Thread Control**: Limit GPT4All threads to N-1 (where N is physical cores) to prevent UI freezing.
- **Context Management**: Implement aggressive context pruning in `brain_orchestrator` for local models to maintain response speed.

---

## 5. Privacy Invariants
When GPT4All is selected as the active provider:
1. MIA must disable any external telemetry (if any).
2. All context and history processing remains strictly within the GPT4All local process.
3. File/Studio analysis is performed locally via GPT4All's local file embedding (if supported).

---

> [!NOTE]
> This document will be updated as the implementation progresses. Any deviation from this plan must be documented here first.

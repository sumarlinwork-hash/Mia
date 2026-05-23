# MIA Docs Index

Dokumen canonical app-level saat ini:

- `docs/1App5Kernell.md`

Semua dokumen lain bersifat module spec, audit report, atau historical implementation note. Jika ada konflik arsitektur, routing, kernel, market, automation, Studio UX, Creator, atau permission policy, ikuti `1App5Kernell.md`.

## Status Dokumen

| Dokumen | Status | Catatan |
| :--- | :--- | :--- |
| `1App5Kernell.md` | Canonical SSOT | Arah flagship: 1 Shell, 5 Kernel, Automation Orchestrator, implementation contracts, TODO fact-check. |
| `mia_studio/mia_studio_spec.md` | Module spec aligned | Detail Studio lama sudah diselaraskan ke agent cockpit + activity stream + Review Changes. |
| `mia_studio/mia_studio_master_plan.md` | Historical/module plan | Local IDE ditafsirkan sebagai optional integration, bukan pusat workflow. |
| `mia_studio/mia_studio_execution_contract.md` | Module contract aligned | Berlaku untuk keamanan Studio backend, patch/review, sandbox, Git guard. |
| `discovery/02.1_NextLevel_DiscoveryMarketplace.md` | Historical/module spec | Berguna untuk state machine dan setup flow; Market final mengikuti 3 domain: Companion, Studio, Creator. |
| `local_llm/local_llm.md` | Module spec | Bagian dari LLM Warehouse. |
| `provider_setting/provider_setting.md` | Module spec | Bagian dari LLM Warehouse; state provider melalui config/state abstraction. |
| `mia_memory/mia_memory_system.md` | Module spec | SSOT di dokumen ini hanya untuk subsistem memory. |
| `MEMORY_SYSTEM_DRIFT_ANALYSIS.md` | Audit report | Audit memory historis. |
| `ARE_v2_0_COMPLETE_IMPLEMENTATION.md` | Historical report | Laporan ARE/Companion emotion. |
| `CODE_CHANGES.md` | Historical report | Catatan perubahan ARE. |
| `IMPLEMENTATION_SUMMARY.md` | Historical report | Ringkasan implementasi ARE. |
| `KERNEL_SEPARATION_AUDIT.md` | Historical audit | Valid untuk scope Companion/Studio lama, bukan 5-kernel final. |
| `LLMPAGE_HEALTH_DASHBOARD.md` | Historical/module report | Laporan fitur LLM health dashboard. |
| `neural_core/MIA_NEURAL_CORE.md` | Module spec | Komunikasi/resiliensi, subordinate ke SSOT app. |
| `skill_bawaan/skill_bawaan.md` | Historical blueprint | Bukan SSOT app-level. |

## Cleanup Rules

- Jangan membuat dokumen baru yang mengklaim SSOT app-level selain `1App5Kernell.md`.
- Jika membuat module spec baru, tulis statusnya sebagai module spec dan rujuk `1App5Kernell.md`.
- Jangan menghidupkan kembali paradigma `1App4Kernell.md`.
- Jangan menjadikan Monaco/browser IDE sebagai fondasi Studio.
- Jangan menjadikan Local IDE sebagai pusat workflow Studio; Local IDE hanya optional integration.
- Jangan menambah Market baru yang tidak memetakan skill ke Companion, Studio, Creator, atau shared.
- Jangan menambah automation real-life tanpa `Review First` / `Always Execute` policy, audit log, dan emergency stop.

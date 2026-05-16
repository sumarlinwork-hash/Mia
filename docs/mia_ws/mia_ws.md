# MIA WebSocket & Synchronization Architecture (v2.0)

MIA menggunakan **Hybrid Three-Tier Sync Strategy** untuk memastikan performa tinggi, skalabilitas, dan sinkronisasi data yang akurat antara Backend dan Frontend.

## 1. Filosofi: Signal + Fetch
MIA tidak menggunakan WebSocket untuk mengirimkan payload data besar (seperti riwayat chat lengkap). Sebaliknya, MIA mengikuti pola:
1. **Transport (Real-time)**: WebSocket mengirimkan **sinyal kecil** (misalnya: `"history_updated"`).
2. **Data (State)**: Frontend (TanStack Query) menerima sinyal tersebut dan melakukan *invalidasi* cache.
3. **API (Source of Truth)**: TanStack Query mengambil data terbaru via **REST HTTP API**.

### Keuntungan:
- **Scalability**: Mengurangi beban bandwidth pada koneksi WebSocket yang *persistent*.
- **Consistency**: Menghindari *race conditions* dan memastikan UI selalu sinkron dengan Database.
- **Reliability**: Jika WebSocket terputus, TanStack Query secara otomatis akan melakukan *refetch* saat koneksi kembali atau saat jendela aplikasi difokuskan.

---

## 2. Struktur Event WebSocket

### Global Event Bus (`WS_EVENT_BUS`)
Semua pesan WebSocket diproses melalui `WebSocketContext.tsx` dan dipublikasikan ke `WS_EVENT_BUS` dengan prefix `ws:`.

### Daftar Sinyal Utama:
| Tipe Event | Deskripsi | Aksi Frontend |
|------------|-----------|---------------|
| `history_updated` | Ada pesan baru (User/MIA) atau riwayat dihapus. | `invalidateQueries(['history'])` |
| `config_update` | Pengaturan sistem berubah. | `invalidateQueries(['config'])` |
| `skills_updated` | Daftar skill/aplikasi terinstal berubah. | `invalidateQueries(['skills'])` |
| `intimacy_updated` | Status/pengaturan keintiman berubah. | `invalidateQueries(['intimacy'])` |
| `status` | Update tahap eksekusi (Thinking, Speaking, dll). | Update UI Thinking Indicator |
| `audio_chunk` | Potongan suara (TTS) untuk diputar real-time. | `playAudio(chunk)` |
| `health` | Status kesehatan koneksi Backend & Brain. | Update LED Status (LNK/BRN) |
| `intimacy_offer_active` | MIA menawarkan/membuka pintu fase keintiman (soulmate). | Tampilkan toast penawaran & `invalidateQueries(['intimacy'])` |

---

## 3. Implementasi Teknis

### Frontend: WebSocketContext.tsx
Koneksi utama diarahkan ke endpoint `/ws/chat/heartbeat`. MIA menggunakan validasi pada dispatcher:
```tsx
WS_EVENT_BUS.dispatchEvent(new CustomEvent('ws:message', { detail: data }));
if (data.type && data.type !== 'message') {
  WS_EVENT_BUS.dispatchEvent(new CustomEvent(`ws:${data.type}`, { detail: data }));
}
```

### Frontend: TanStack Query Integration (`Home.tsx`)
Pesan tidak lagi disimpan dalam state lokal `useState`, melainkan diatur oleh query:
```tsx
const { data: messages = [] } = useChatHistory();

useWebSocketEvent('history_updated', () => {
  queryClient.invalidateQueries({ queryKey: ['history'] });
});
```

### Backend: Broadcast Signal (`crone_daemon.py` & `main.py`)
Setiap perubahan data yang persisten harus diikuti oleh broadcast signal:
```python
await crone_daemon.broadcast_event("history_updated")
```

---

## 4. Penanganan Real-time (Pacing)
Meskipun teks dikirim via REST (optimistic/fetch), **Status** dan **Audio** tetap dikirim via WebSocket untuk meminimalkan latensi:
1. Backend mengirim sinyal `history_updated`.
2. Backend secara paralel mengirimkan `audio_chunk` secara streaming.
3. Frontend mengambil teks via REST (atau update optimis) sambil memutar audio yang masuk via WS.

---
*Dokumen ini bersifat Living Document dan harus diperbarui setiap ada perubahan arsitektur komunikasi.*

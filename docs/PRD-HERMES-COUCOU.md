# PRD: Hermes Agent Telemetry & Visual Companion HUD (Coucou-Hermes)

> **Document Status:** Complete / Architectural Baseline  
> **Authors:** janfdev & Hermes Agent Engine  
> **Target Repositories:** `/root/coucou-clone` (masdevv edition) & `~/.hermes/plugins/coucou`  
> **Methodology:** Superpowers Architecture Planning & Matt Pocock Grilling Refinement  

---

## 1. Executive Summary & Vision

Proyek ini bertujuan menghubungkan **Hermes AI Agent** (baik yang berjalan di VPS cloud maupun laptop lokal via 9router) dengan antarmuka desktop **Coucou HUD (Dynamic Island)** dan notifikasi mobile Telegram.

Setiap kali pengguna berinteraksi melalui Telegram:
1. Perintah diproses oleh Hermes di cloud/lokal.
2. Status eksekusi ditransmisikan secara instan (*zero-latency*) ke Coucou HUD di desktop laptop.
3. Maskot **Mochi** bereaksi secara visual dan ekspresif dengan animasi unik di Dynamic Island.
4. Rangkuman hasil akhir dikirimkan kembali ke pengguna via Telegram (disertai feedback visual kelulusan tugas di Coucou).

---

## 2. Decision Tree & Architectural Grounding (Hasil Grilling)

Berdasarkan hasil pengujian *design tree* (Grilling Round 1):

1. **Jalur Transmisi Jaringan (Q1 ➔ Opsi A):**
   * **Coucou Local Relay:** Tauri/Rust membuka HTTP Webhook server lokal pada `http://127.0.0.1:4040/api/hook`.
   * **VPS Connection:** Hermes VPS mengirimkan event ke port 4040 melalui SSH Reverse Tunnel (`ssh -R 4040:127.0.0.1:4040`) atau private overlay network (Tailscale / wireguard). Tidak ada port publik terbuka di internet.
2. **Notifikasi Mobile & Animasi (Q2 ➔ Opsi A):**
   * Notifikasi hasil ke HP pengguna dikirimkan langsung melalui bot Telegram.
   * Di saat yang sama, Coucou di desktop memicu animasi ekspresi selebrasi / feedback visual.
3. **Spektrum Ekspresi & Situasi Mochi (Q3 ➔ Opsi A Enhanced):**
   * Menambahkan state ekspresi yang membedakan Coucou-Hermes dengan versi upstream (Claude Code):
     * **Idle:** Santai, bernapas, sesekali berkedip.
     * **PromptReceived (Alert):** Telinga/headphone menyala, mata membelalak ceria, speech bubble *"Siap, perintah diterima!"*.
     * **Thinking / Reasoning:** Mata berbentuk spiral/konsentrasi, aura ungu berpendar lembut (*Tokyo Night glow*).
     * **ToolExecution (Coding / Bash):** Memakai headphone studio menyala, mengetik cepat, suara *thock* keyboard mekanikal.
     * **WebBrowsing / Research:** Mata berbentuk *star* / kacamata pemindai radar, radar scanner menyala.
     * **Error / Blocker:** Mochi berkeringat (*sweat drop*), mata cemas, aura merah berkedip.
     * **Success / Done:** Mochi tersenyum lebar (*heart/happy eyes*), konfeti mikro, speech bubble *"Beres bro! Cek Telegram ya"*.

---

## 3. End-to-End System Flow

```text
┌─────────────────┐       Telegram API       ┌────────────────────────┐
│  Pengguna (HP)  │ ───────────────────────> │  Hermes Agent (VPS)    │
└─────────────────┘                          └────────────────────────┘
        ▲                                                │
        │                                        Emit Lifecycle Hooks:
        │                                        - UserPromptSubmit
        │                                        - PreToolUse / PostToolUse
        │                                        - AgentComplete / Error
        │                                                │
        │                                                ▼
        │                                    ┌────────────────────────┐
        │                                    │  Hermes Coucou Plugin  │
        │                                    │  (~/.hermes/plugins/)  │
        │                                    └────────────────────────┘
        │                                                │
        │                                       HTTP POST (JSON Event)
        │                                     via SSH Reverse Tunnel
        │                                                │
        │                                                ▼
        │ Telegram Bot Chat                  ┌────────────────────────┐
        │ (Laporan Akhir)                    │  Coucou Rust Backend   │
        │                                    │  (Tauri HTTP Relay)    │
        │                                    │  127.0.0.1:4040/api    │
        │                                    └────────────────────────┘
        │                                                │
        │                                            Tauri IPC
        │                                                │
        │                                                ▼
┌─────────────────┐                          ┌────────────────────────┐
│ Notifikasi HP   │ <─────────────────────── │  Coucou Island HUD     │
│ (Chat Telegram) │   (Kondisi Selesai)      │  (Mochi Dynamic Island)│
└─────────────────┘                          └────────────────────────┘
```

---

## 4. Technical Specifications & Payload Contract

### 4.1. Event Schema (Wire Format)
Endpoint `POST http://127.0.0.1:4040/api/hook` menerima JSON payload standar:

```json
{
  "source": "hermes-agent",
  "instance_id": "vps-main",
  "event_type": "USER_PROMPT_SUBMIT | TOOL_USE | REASONING | COMPLETED | ERROR",
  "session_id": "session-2026-10-13",
  "timestamp": 1791892000,
  "data": {
    "prompt_preview": "Refactor sidebar dan deploy ke Coolify...",
    "tool_name": "terminal | write_file | web_search",
    "tool_input_preview": "git commit -m '...'",
    "message": "Menjalankan kompilasi TypeScript...",
    "status": "IN_PROGRESS | SUCCESS | FAILED"
  }
}
```

### 4.2. Mochi State Mapping (Frontend `engine.ts` & `island.ts`)

| Event Type Hermes | Bot State (`engine.ts`) | Eye Shape | Warna Aura (RGB) | Animasi / Partikel |
|---|---|---|---|---|
| `USER_PROMPT_SUBMIT` | `question` | `wide` | Cyan (`#38bdf8`) | Pop-up speech bubble |
| `REASONING` | `thinking` | `spiral` | Violet (`#a855f7`) | Pulse aura perlahan |
| `TOOL_USE` (Bash/Code) | `working` | `line` | Blue (`#2563eb`) | Headphone LED menyala + audio switch |
| `TOOL_USE` (Web/Research)| `searching` | `star` | Amber (`#f59e0b`) | Scanning radar |
| `ERROR` | `error` | `tired` | Red (`#ef4444`) | Sweat particle |
| `COMPLETED` | `finished` | `happy` | Emerald (`#10b981`) | Heart particle + sound "done" |

---

## 5. Implementation Roadmap & Milestones

### Fase 1: Tauri Rust HTTP Relay Server
- Tambahkan modul `windows/src-tauri/src/http_relay.rs` menggunakan `axum` atau `tiny_http`.
- Bind ke `127.0.0.1:4040`.
- Terima payload POST dan pancarkan event Tauri `emit("hermes-hook", payload)`.

### Fase 2: Island Frontend State Handler
- Tambahkan listener di `windows/src/island/island.ts` untuk event `"hermes-hook"`.
- Hubungkan event ke transisi pose Mochi (`BotEngine.setEmote()` / `BotEngine.setState()`).
- Tampilkan quote bubble singkat di pulau (misal: *"Menjalankan Git Commit..."*).

### Fase 3: Hermes Plugin (`~/.hermes/plugins/coucou/`)
- Buat plugin Hermes ringan berbasis Python/TypeScript yang mengaitkan event lifecycle:
  - `on_user_prompt`
  - `on_pre_tool_call`
  - `on_session_complete`
- Mengirim HTTP POST non-blocking (asinkron) ke `http://127.0.0.1:4040/api/hook`.

---

## 6. Success Metrics & Verification Gate
1. **Latensi Transmisi:** Waktu dari Hermes menerima chat di Telegram hingga Mochi di layar laptop berubah pose < 300 ms.
2. **Kestabilan:** Coucou tidak pernah crash jika koneksi Hermes terputus (graceful failure).
3. **Zero Resource Overhead:** Penggunaan RAM Coucou tetap stabil di bawah 45 MB saat menerima stream event.

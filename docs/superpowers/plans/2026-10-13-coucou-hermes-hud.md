# [Coucou-Hermes] Telemetry & Visual Companion HUD Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Menghubungkan Hermes AI Agent ke Coucou HUD (Mochi Dynamic Island) melalui HTTP Webhook relay lokal dan plugin Hermes, menampilkan 6 variasi reaksi visual Mochi saat agent bekerja dari Telegram, dan mengembalikan notifikasi hasil ke Telegram.

**Architecture:** 
1. Di backend Coucou (Rust/Tauri), jalankan embedded HTTP relay server (`http_relay.rs`) pada `127.0.0.1:4040/api/hook` yang memancarkan event `tauri::Emitter::emit("hermes-event")`.
2. Di frontend Coucou (TypeScript/Canvas), tangani event `"hermes-event"` di `island.ts` dan petakan ke 6 ekspresi unik Mochi (`engine.ts`), quote bubble, dan audio thock.
3. Di Hermes Agent (`~/.hermes/plugins/coucou`), buat plugin Python (`coucou_telemetry.py`) yang memancarkan hook `on_user_prompt`, `on_pre_tool_call`, `on_post_tool_call`, dan `on_complete` ke port 4040 melalui HTTP async non-blocking.

**Tech Stack:** Rust (Tokio, Tauri v2), TypeScript, HTML5 Canvas 2D, Python 3 (Hermes Plugin API).

**Spec:** `/root/coucou-clone/docs/PRD-HERMES-COUCOU.md`

## Global Constraints

- No em-dash (`—`) dalam teks pesan atau UI (Anti-slop R-02).
- Zero latency & Non-blocking: Hermes plugin tidak boleh memperlambat respon agen jika port 4040 tidak aktif (timeout max 250ms).
- Port default: `127.0.0.1:4040` (khusus loopback, aman tanpa paparan internet publik).
- Tetap kompatibel dengan Claude Code hooks yang sudah ada di pipe.rs.

## Review Focus

1. Koneksi HTTP terputus / Coucou belum running: Plugin Hermes harus mengabaikan error tanpa crash.
2. Kecepatan event beruntun (burst tool calls): Island frontend harus menerapkan debouncing agar animasi Mochi tidak berkedip liar.
3. Kontras warna Tokyo Night: Aura dan quote bubble harus memenuhi standar WCAG AA.
4. Parsing payload malformed: Rust HTTP relay menolak request invalid dengan HTTP 400 tanpa menghentikan thread server.
5. Format event types: Menangani mapping 6 state secara aman dengan fallback ke state IDLE.

---

### Task 1: Rust HTTP Relay Server in Tauri (`windows/src-tauri`)

**Files:**
- Create: `/root/coucou-clone/windows/src-tauri/src/http_relay.rs`
- Modify: `/root/coucou-clone/windows/src-tauri/src/lib.rs`
- Test: `/root/coucou-clone/windows/src-tauri/tests/http_relay_test.rs`

**Interfaces:**
- Produces: `http_relay::start(app: AppHandle)`
- Emits: Tauri event `"hermes-event"` dengan payload `serde_json::Value`.

- [ ] **Step 1:** Buat modul `http_relay.rs` menggunakan `tokio::net::TcpListener` murni standar stdlib/tokio (tanpa perlu menambah dependency framework berat).
- [ ] **Step 2:** Tangani endpoint `POST /api/hook` dan `GET /api/health`.
- [ ] **Step 3:** Pancarkan payload JSON yang diterima via `app.emit("hermes-event", payload)`.
- [ ] **Step 4:** Daftarkan modul di `lib.rs` dan panggil `http_relay::start(handle.clone())` di dalam `setup()`.
- [ ] **Step 5:** Commit perubahan Rust backend.

---

### Task 2: Mochi Multi-State Visual Engine Mapping (`windows/src`)

**Files:**
- Modify: `/root/coucou-clone/windows/src/mochi/engine.ts`
- Modify: `/root/coucou-clone/windows/src/island/island.ts`

**Interfaces:**
- Consumes: Tauri event `"hermes-event"`
- Produces: Visual reaction di Canvas (`setEmote`, `setState`, speech bubble, sound)

- [ ] **Step 1:** Daftarkan state baru di `BotEngine` untuk 6 ekspresi unik Hermes (PromptReceived, Reasoning, ToolBash, ToolResearch, ErrorBlocker, Completed).
- [ ] **Step 2:** Di `island.ts`, tambahkan `listen("hermes-event", ...)` untuk menerima sinyal real-time.
- [ ] **Step 3:** Tampilkan speech bubble dinamis sesuai pesan data dari Hermes (misal: *"Menjalankan Git Commit..."*).
- [ ] **Step 4:** Bunyikan audio switch keyboard mekanikal (*thock*) saat tool execution dimulai.
- [ ] **Step 5:** Commit perubahan frontend TypeScript.

---

### Task 3: Hermes Telemetry Plugin (`~/.hermes/plugins/coucou`)

**Files:**
- Create: `/root/.hermes/plugins/coucou/plugin.py`
- Create: `/root/.hermes/plugins/coucou/manifest.json`
- Test: `/root/coucou-clone/scripts/test-hermes-relay.sh`

**Interfaces:**
- Consumes: Hermes Agent hook events (`UserPromptSubmit`, `PreToolUse`, `PostToolUse`, `AgentComplete`, `AgentError`)
- Produces: HTTP POST JSON ke `http://127.0.0.1:4040/api/hook`

- [ ] **Step 1:** Buat `manifest.json` plugin Hermes dengan izin network loopback.
- [ ] **Step 2:** Tulis `plugin.py` menggunakan `urllib.request` asinkron/thread daemon dengan timeout 250ms (zero blocking).
- [ ] **Step 3:** Buat script verifikasi pengujian `test-hermes-relay.sh` menggunakan `curl` untuk menguji respon relay.
- [ ] **Step 4:** Verifikasi transmisi data dan commit artefak.

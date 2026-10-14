<div align="center">

<img src="NotchBuddy/Assets.xcassets/AppIcon.appiconset/icon_256x256.png" width="96" alt="Coucou icon">

# Coucou by janfdev · mas ojan edition 🎧✨
### `coucou-by-janfdev`

**A customized, cyberpunk-themed desktop dynamic island AI companion & developer HUD for Windows, Linux, and macOS.**

*Supercharged by [@janfdev](https://github.com/janfdev) with Hermes Agent integration and Mochi reactive companion, based on the open-source Coucou project.*

[![GitHub](https://img.shields.io/badge/GitHub-janfdev%2Fcoucou--by--janfdev-blue?logo=github)](https://github.com/janfdev/coucou-by-janfdev)
[![Windows 10/11](https://img.shields.io/badge/Windows-Tauri%20Ready-0078D4?logo=windows&logoColor=white)](https://github.com/janfdev/coucou-by-janfdev)
[![Tauri 2](https://img.shields.io/badge/Tauri-2-FFC131?logo=tauri&logoColor=black)](https://tauri.app)
[![Hermes Agent](https://img.shields.io/badge/AI%20Engine-Hermes%20Agent-38BDF8?logo=robot&logoColor=white)](https://hermes-agent.nousresearch.com)
[![Rust](https://img.shields.io/badge/Rust-Backend-dea584?logo=rust&logoColor=black)](https://www.rust-lang.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-Frontend-3178c6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![License: MIT](https://img.shields.io/badge/license-MIT-green)](LICENSE)

</div>

---

## 🚀 Apa itu Coucou · mas ojan edition?

Coucou adalah teman AI mungil (**Mochi**) yang hidup di bagian atas layar desktop kamu (Dynamic Island) untuk memantau sesi AI coding agents, notifikasi, dan status sistem secara real-time.

Di edisi **`coucou-by-janfdev`**, tampilannya dirombak total agar ramah developer, estetik cyberpunk, dan langsung terintegrasi dengan ekosistem **Hermes Agent**:

### ✨ Fitur Unggulan Edisi mas ojan:

- 🧠 **Native Hermes Agent Integration**: Dynamic Island terhubung langsung dengan Hermes Agent via HTTP Relay lokal port `4040` — memunculkan status thinking, working, step progress, dan selebrasi finished secara otomatis.
- 🎧 **Cyberpunk Studio Headphones**: Mochi memakai headphone studio developer dengan aksen LED RGB neon menyala (cyan `#38bdf8` & violet `#a855f7`).
- 💬 **Interactive Speech Bubbles & Quotes**: Mochi menyapa kamu secara interaktif (*"Halo mas ojan!"*, *"Ngoding apa kita hari ini bray?"*, *"Jangan lupa git commit & push!"*) dan bereaksi lucu dengan ekspresi wajah dan partikel efek (love, star, blush).
- ⚡ **Real-Time Developer System HUD**: Monitor CPU & RAM secara real-time langsung di bilah header notch (`🟢 19% CPU · 3.6G RAM`).
- 🛠️ **Custom Integrations System**: Bebas menambahkan shortcut aplikasi atau URL kustom (Telegram, GitHub, Discord, Web server lokal, dll.) langsung di pill island dengan tombol aksi cepat.
- 🔊 **Mechanical Keyboard "Thock" Audio**: Efek suara tactile mechanical switch saat berpindah tab atau berinteraksi dengan Mochi, disintesis langsung via Web Audio API.
- 🌌 **Tokyo Night & Neon Glassmorphism**: Tampilan pulau bernuansa gelap elegan dengan rim glow lembut dan padding presisi tanpa tabrakan teks.
- 🤖 **Hermes Agent & Multi-Tool Monitoring**: Integrasi langsung dengan Hermes Agent, VS Code, Cursor, n8n, Vercel, Resend, dll.

---

## 🧠 Bagaimana Sistem Antigravity Bekerja?

Di versi ini, kamu **TIDAK PERLU** memasukkan API key pihak ketiga (seperti Anthropic `sk-ant-...` atau OpenAI):

```
┌─────────────────┐       Tauri IPC        ┌─────────────────┐       Subprocess       ┌──────────────────────┐
│  Mochi Frontend │ ─────────────────────> │  Rust Backend   │ ─────────────────────> │   Antigravity CLI    │
│  (Chat / Drop)  │ <───────────────────── │  (claude.rs)    │ <───────────────────── │   (~/.local/bin/agy) │
└─────────────────┘                        └─────────────────┘                        └──────────────────────┘
                                                                                                 │
                                                                                       OAuth Google Session
                                                                                                 │
                                                                                                 ▼
                                                                                      Google Gemini AI Cloud
```

1. **OAuth / Sesi Otomatis**:  
   Backend Rust (`windows/src-tauri/src/claude.rs`) otomatis mendeteksi binary Antigravity CLI (`agy`) di sistem kamu (`~/.local/bin/agy` atau PATH). Karena `agy` sudah login dengan akun Google Antigravity kamu di OS, Coucou langsung meminjam sesi autentikasi tersebut.
2. **Model Cerdas**:  
   Secara default, percakapan diproses menggunakan model Gemini terbaru berkecepatan tinggi (`gemini-3.8-flash-high`) dengan konteks cerdas.
3. **Privasi & Keamanan**:  
   Tidak ada API key yang disimpan di file plain text atau dikirim ke server luar yang tidak dikenal. Semua instruksi dieksekusi secara lokal melalui terminal sandbox Antigravity.

---

## 📖 Panduan Penggunaan Fitur AI & Mochi

### 1. 💬 Chatting dengan Mochi
1. Buka pulau Coucou dengan mengarahkan kursor atau mengklik notch di atas layar.
2. Klik tab balon obrolan (**💬**) di header bar.
3. Ketik pertanyaan, diskusi kodingan, atau minta review kode di kolom `Ask me anything…` lalu tekan **Enter**.
4. Mochi akan masuk ke mode *thinking* (aura berpendar ungu) dan memberikan jawaban lengkap beserta format blok kode syntax highlighting.

### 2. 📎 Menganalisis File (Drag & Drop)
1. Tarik file apa saja dari file manager (kode program, log error, dokumen teks) ke notch Coucou.
2. Mochi akan berubah bentuk (*mailbox morph*) dan menelan file kamu (*gulp!*).
3. Klik untuk membuka chat — konteks file tersebut otomatis terlampir, dan kamu bisa langsung bertanya:  
   *"Tolong cek apakah ada bug di file ini"* atau *"Jelaskan fungsi utama dari file ini"*.

### 3. 🖱️ Interaksi & Easter Egg Mochi
- **Klik 1x / Poke**: Mochi akan tersenyum, berkedip, atau memberi tanda hati ❤️ sambil mengeluarkan quote developer santai.
- **Klik 3x Cepat**: Mochi akan pusing (*slap reaction*) dan protes: *"Aduh pusing bray! 😵"*.
- **Klik Tab & Tombol**: Menghasilkan feedback suara switch keyboard mechanical (*thock*).

### 4. ⚡ Memantau Status Sistem (Developer HUD)
- Di sebelah kanan logo `Coucou [mas ojan]`, kamu bisa melihat indikator status CPU dan RAM secara live:
  - 🟢 Hijau: Beban kerja ringan.
  - 🟡 Kuning: Beban kerja sedang (> 40%).
  - 🔴 Merah: Beban kerja tinggi (> 70%).

---

## 💻 Panduan Instalasi & Menjalankan (Linux)

Versi ini diuji dan berjalan mulus secara native di **Linux (Wayland / Hyprland / Sway / X11)**.

### 1. Prasyarat (Dependencies)

Pastikan dependensi berikut sudah terpasang di sistem kamu:

* **Antigravity CLI (`agy`)**:  
  Pastikan `agy` sudah terpasang dan login di terminal:
  ```bash
  agy --version
  ```
* **Node.js** (v18+) & **npm**:
  ```bash
  node -v
  ```
* **Rust & Cargo**:
  ```bash
  curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
  source "$HOME/.cargo/env"
  ```
* **Paket GTK & WebKit (Ubuntu / Debian)**:
  ```bash
  sudo apt update
  sudo apt install -y libgtk-3-dev libwebkit2gtk-4.1-dev libgtk-layer-shell-dev libssl-dev build-essential pkg-config
  ```

---

### 2. Clone & Build dari Source

```bash
# 1. Clone repository ini
git clone https://github.com/janfdev/coucou-by-janfdev.git
cd coucou-by-janfdev/windows

# 2. Install dependensi Node.js
npm install

# 3. Build frontend dan compile binary Tauri
npm run build
npx tauri build --no-bundle
```

Hasil kompilasi binary akan berada di:  
`target/release/coucou`

---

### 3. Menjalankan Coucou

Kamu bisa langsung menyalin binary tersebut ke folder lokal agar bisa dijalankan dari mana saja:

```bash
mkdir -p ~/.local/bin
cp target/release/coucou ~/.local/bin/coucou
chmod +x ~/.local/bin/coucou

# Jalankan Coucou di background:
coucou &
```

> 💡 **Tips Pengguna Hyprland**: Kamu bisa menambahkan baris ini ke `~/.config/hypr/hyprland.conf` agar Coucou otomatis berjalan saat login:
> ```ini
> exec-once = ~/.local/bin/coucou
> ```

---

## 🪟 Dukungan Windows

Source code berbasis **Tauri (Rust + TS)** dan memiliki implementasi Win32 API di dalamnya (`windows/src-tauri/src/platform/windows.rs`).  
Untuk mengompilasi file `.exe` di Windows:
1. Buka PowerShell di Windows dengan Node.js dan Rust terinstall.
2. `cd windows`
3. `npm install`
4. `npm run build && npx tauri build`

Binary `.exe` akan tersedia di `target/release/coucou.exe`.

---

## ⚙️ Menambahkan Custom Integration

Kamu bisa menambahkan shortcut kustom kamu sendiri di `~/.config/coucou/settings.json` atau lewat jendela Settings (ikon gerigi ⚙️):

```json
{
  "customIntegrations": [
    {
      "id": "custom_telegram",
      "name": "Telegram",
      "target": "https://web.telegram.org/a/",
      "color": "#24A1DE",
      "description": "Buka Telegram Web"
    },
    {
      "id": "custom_github",
      "name": "GitHub",
      "target": "https://github.com",
      "color": "#A855F7",
      "description": "Buka Dashboard GitHub"
    }
  ]
}
```

---

## 👏 Credits & Attribution

- Dimodifikasi dan diintegrasikan oleh **[@janfdev (mas ojan)](https://github.com/janfdev)**.
- Base modding oleh **[@1dimas](https://github.com/1dimas)**.
- Original project by **[Louis Raille (Louis-CFM)](https://github.com/Louis-CFM/coucou)**.
- Licensed under the **MIT License**.

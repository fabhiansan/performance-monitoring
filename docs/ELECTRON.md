# Electron Desktop App

Aplikasi Employee Performance Analyzer telah berhasil dikonfigurasi sebagai aplikasi desktop menggunakan Electron.

## Cara Menjalankan

### Development Mode
```bash
npm run electron:dev
```

### Production Mode
```bash
# Build frontend terlebih dahulu
npm run build

# Rebuild native modules untuk Electron
npm run electron:rebuild

# Jalankan aplikasi Electron
npm run electron:build
```

## Cara Membuat Distributable Package

### Untuk macOS
```bash
npm run dist:mac
```

### Untuk Windows
```bash
npm run dist:win
```

### Untuk Linux
```bash
npm run dist:linux
```

### Untuk semua platform
```bash
npm run dist
```

File hasil packaging akan tersimpan di folder `release/`.

## Konfigurasi untuk Teman Anda

### 1. API Key Gemini
- Saat pertama kali menjalankan aplikasi, buat file config di: 
  - **macOS**: `~/Library/Application Support/Employee Performance Analyzer/config.json`
  - **Windows**: `%APPDATA%/Employee Performance Analyzer/config.json`
  - **Linux**: `~/.config/Employee Performance Analyzer/config.json`

- Isi config.json:
```json
{
  "geminiApiKey": "YOUR_GEMINI_API_KEY_HERE",
  "serverPort": 3002,
  "version": "1.0.0"
}
```

### 2. Database
Database SQLite akan otomatis dibuat di folder userData aplikasi, sehingga data akan persistent antar session.

## Cara Distribusi ke Teman

1. **Build aplikasi**:
   ```bash
   npm run dist:mac  # atau sesuai OS teman Anda
   ```

2. **Share file installer**:
   - **macOS**: Share file `.dmg` dari folder `release/`
   - **Windows**: Share file `.exe` dari folder `release/`
   - **Linux**: Share file `.AppImage` dari folder `release/`

3. **Instruksi untuk teman**:
   - Download dan install aplikasi
   - Jalankan aplikasi (icon akan muncul di Applications/Start Menu)
   - Jika ingin menggunakan AI features, tambahkan Gemini API key di config file

## Features yang Sudah Terintegrasi

✅ **Frontend**: React dashboard dengan semua fitur UI
✅ **Backend**: Express server terintegrasi di dalam aplikasi
✅ **Database**: SQLite database di userData folder 
✅ **Configuration**: System config untuk API keys
✅ **Cross-platform**: Support macOS, Windows, Linux
✅ **Single executable**: Tidak perlu install Node.js atau dependencies
✅ **Persistent data**: Database otomatis tersimpan

## Troubleshooting

### Native Module Issues
Jika ada error terkait better-sqlite3:
```bash
npm run electron:rebuild
```

### Build Issues
Pastikan build frontend berhasil dulu:
```bash
npm run build
```

### Permission Issues
Pastikan aplikasi memiliki permission untuk menulis di userData directory.

## Keuntungan untuk User Non-Technical

1. **Single Click**: Double-click file aplikasi langsung jalan
2. **No Setup**: Tidak perlu install Node.js, dependencies, atau setup server
3. **Auto Database**: Database otomatis terbuat dan tersimpan
4. **Desktop Integration**: Aplikasi muncul seperti software desktop biasa
5. **Offline**: Bisa jalan tanpa internet (kecuali untuk AI features)
6. **Cross Platform**: Satu codebase, jalan di semua OS

Aplikasi siap untuk didistribusikan! 🎉
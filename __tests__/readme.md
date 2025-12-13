# 🧪 Panduan Pengujian (Testing Guide)

Aplikasi ini menggunakan **Jest** untuk semua kebutuhan pengujian, yang dibagi menjadi Tes Unit (Service Layer) dan Tes Integrasi (API/Controller Layer).

## Skrip Pengujian

Anda dapat menjalankan pengujian menggunakan `npm test` (untuk semua) atau `npm run <skrip-tes>` (untuk spesifik).

| Perintah | Tujuan | Target File |
| :--- | :--- | :--- |
| **`npm test`** | Menjalankan **Semua Tes** (Unit dan Integrasi). | `*.test.js` dan `*.service.test.js` |
| **`npm run test:unit`** | Hanya menjalankan **Tes Unit** (Service Layer). | File dengan pola: `*.service.test.js` |
| **`npm run test:api`** | Hanya menjalankan **Tes Integrasi** (API/Controller Layer). | File dengan pola: `*.test.js` **kecuali** `*.service.test.js` |

---

### Detail Implementasi Skrip

Berikut adalah perintah Jest yang digunakan dalam `package.json`:

```bash
# Untuk menjalankan semua tes
npm test
# Skrip: "test": "jest"

# Untuk menjalankan Tes Unit (Service Layer)
npm run test:unit
# Skrip: "test:unit": "jest --testMatch \"**/*.service.test.js\""

# Untuk menjalankan Tes Integrasi (API/Controller)
npm run test:api
# Skrip: "test:api": "jest --testMatch \"**/*.test.js\" --testPathIgnorePatterns \"service\\.test\\.js\""
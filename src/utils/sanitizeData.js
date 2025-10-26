/**
 * Utility untuk membersihkan data update sebelum dikirim ke Prisma.
 * Fungsinya:
 * - Hanya update field yang dikirim & tidak kosong
 * - Konversi tipe sesuai swaggerTypes (jika disediakan)
 * - Aman terhadap data campuran (misal "2 - 4 Hari" tetap string)
 *
 * @param {Object} data - data dari req.body
 * @param {Object} swaggerTypes - optional, map dari nama field ke tipe swagger (integer, number, string, boolean)
 * @returns {Object} - data yang sudah dibersihkan & dikonversi
 */

// src/utils/sanitizeData.js

function sanitizeData(input) {
  if (!input || typeof input !== 'object') return {};

  const sanitized = {};

  for (const [key, value] of Object.entries(input)) {
    // 1️⃣ Lewatkan kalau null/undefined
    if (value === null || value === undefined) continue;

    // 2️⃣ Jika string kosong → ubah jadi null
    if (typeof value === 'string' && value.trim() === '') {
      sanitized[key] = null;
      continue;
    }

    // 3️⃣ Normalisasi tipe otomatis
    let newValue = value;

    // "123" → 123
    if (typeof value === 'string' && /^\d+$/.test(value)) {
      newValue = Number(value);
    }

    // "true" / "false" → boolean
    else if (typeof value === 'string' && /^(true|false)$/i.test(value)) {
      newValue = value.toLowerCase() === 'true';
    }

    // {} kosong → skip
    else if (typeof value === 'object' && Object.keys(value).length === 0) {
      continue;
    }

    sanitized[key] = newValue;
  }

  return sanitized;
}

module.exports = { sanitizeData };
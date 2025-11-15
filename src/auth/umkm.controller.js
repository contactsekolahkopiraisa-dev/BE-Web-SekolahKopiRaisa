const express = require('express');
const { upload } = require('../middleware/multer'); // memory storage multer
const { multerErrorHandler, authMiddleware } = require('../middleware/middleware');
const ApiError = require('../utils/apiError');
const nodemailer = require('nodemailer');
const dotenv = require('dotenv');
dotenv.config();
const bcrypt = require('bcryptjs');
const { createUser } = require('./user.service'); // [`createUser`](src/auth/user.service.js)
const {
  createUMKM,
  getUMKMByUserId,
  getUMKMById,
  updateUMKM,
  verifyUMKM
} = require('./umkm.service'); // [`createUMKM`](src/auth/umkm.service.js)

const { validateCreateUMKM, validateUpdateUMKM, validateLogin, validateVerifyUMKM } = require('../validation/validation');
const { loginUser } = require('./user.service'); // [`loginUser`](src/auth/user.service.js)
const { findUMKMByUserId } = require('./umkm.repository'); // [`findUMKMByUserId`](src/auth/umkm.repository.js)
const { validationResult } = require('express-validator');

const router = express.Router();

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : 587,
  secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  }
});

async function sendEmail({ to, subject, html, text }) {
  const info = await transporter.sendMail({
    from: process.env.SMTP_FROM || `"Kopi Raisa" <${process.env.SMTP_USER}>`,
    to,
    subject,
    text: text || undefined,
    html: html || undefined,
  });
  return info;
}

/**
 * POST /umkm
 * Create UMKM (if not logged in, create user first)
 * file: sertifikatHalal (optional)
 */
router.post(
  '/',
  // do NOT require authMiddleware here so frontend can register user+umkm in one request
  upload.array('sertifikatHalal', 3), // bisa upload sampai 3 gambar
  multerErrorHandler,
  validateCreateUMKM,
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          message: 'Validasi gagal!',
          errors: errors.array().reduce((acc, curr) => {
            if (!acc[curr.path]) acc[curr.path] = curr.msg;
            return acc;
          }, {}),
        });
      }

      let userId;
      // if user already authenticated, use that user
      if (req.user && req.user.id) {
        userId = Number(req.user.id);
      } else {
        // create new user from provided fields
        const { name, email, password, phone_number } = req.body;

        // hash password before creating (consistent with /daftar)
        const hashed = await bcrypt.hash(String(password), 10);

        const newUser = await createUser({
          name: String(name).trim(),
          email: String(email).trim(),
          password: hashed,
          phone_number: String(phone_number).trim()
        }); // [`createUser`](src/auth/user.service.js)

        userId = newUser.id;
      }

      const payload = {
        idUser: Number(userId),
        namaUmkm: req.body.namaUmkm,
        ktp: req.body.ktp || null,
        addresses: req.body.addresses ? (Array.isArray(req.body.addresses) ? req.body.addresses : JSON.parse(req.body.addresses)) : undefined,
        file: req.file || [],
      };

      const created = await createUMKM(payload); // [`createUMKM`](src/auth/umkm.service.js)

      return res.status(201).json({
        message: 'Registrasi UMKM berhasil',
        data: created,
      });
    } catch (error) {
      console.error('Error create UMKM:', error);
      const status = error instanceof ApiError ? error.statusCode : 500;
      return res.status(status).json({ message: error.message });
    }
  }
);

/**
 * POST /umkm/login — autentikasi sebagai UMKM (email/password)
 * menerima { emailOrPhone, password } sesuai validateLogin
 */
router.post('/login', validateLogin, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: 'Validasi gagal!', errors: errors.array() });
    }

    const { emailOrPhone, password } = req.body;

    // Reuse existing login helper
    const { loginUser } = require('./user.service'); // [`loginUser`](src/auth/user.service.js)
    const loginResult = await loginUser({ emailOrPhone, password });
    const user = loginResult.user;

    // Periksa role UMKM dulu, fallback cek record VerifikasiUMKM
    const isUmkmRole = user.role && String(user.role).toUpperCase() === 'UMKM';
    const umkmRecord = await findUMKMByUserId(user.id); // [`findUMKMByUserId`](src/auth/umkm.repository.js)
    if (!isUmkmRole && !umkmRecord) {
      return res.status(403).json({ message: 'Akses ditolak — akun ini bukan UMKM.' });
    }

    // set cookie/token sama seperti login biasa
    res.cookie('token', loginResult.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'None' : 'Lax',
      maxAge: 24 * 60 * 60 * 1000,
    });

    return res.status(200).json({ message: 'Login UMKM berhasil', data: { user, umkm: umkmRecord || null, token: loginResult.token } });
  } catch (error) {
    console.error('Error UMKM login:', error);
    const status = error instanceof ApiError ? error.statusCode : 500;
    return res.status(status).json({ message: error.message || 'Terjadi kesalahan saat login UMKM' });
  }
});

/**
 * GET /umkm
 * Admin-only: list all UMKM
 */
router.get('/', authMiddleware, async (req, res) => {
  try {
    const currentUser = req.user;
    if (!currentUser.admin) {
      return res.status(403).json({ message: 'Access denied. Hanya admin yang boleh mengakses daftar UMKM.' });
    }

    // Reuse service: get all by admin - if service doesn't have a "getAll", we can call repository directly,
    // but assume service exposes a method or we can fetch via getUMKMByUserId for each user.
    // Here we'll call getUMKMByUserId for all users isn't feasible; prefer service exposes getAll.
    // To be safe, call prisma directly only if needed — but per instruksi, keep controller only.
    // So expect service to support getAll (if not, add getAllUMKM in service/repo).
    if (typeof require('./umkm.service').getAllUMKM === 'function') {
      const all = await require('./umkm.service').getAllUMKM();
      return res.status(200).json({ data: all });
    } else {
      // graceful fallback: return error to indicate service missing
      return res.status(500).json({ message: 'Service belum menyediakan method getAllUMKM. Tambahkan getAllUMKM di umkm.service.' });
    }
  } catch (error) {
    console.error('Error get all UMKM:', error);
    const status = error instanceof ApiError ? error.statusCode : 500;
    return res.status(status).json({ message: error.message });
  }
});

/**
 * GET /umkm/user/:userId
 * Get UMKM by userId --- accessible to owner (same user) or admin
 */
router.get('/user/:userId', authMiddleware, async (req, res) => {
  try {
    const currentUser = req.user;
    const userId = Number(req.params.userId || req.query.userId);
    if (!userId) return res.status(400).json({ message: 'userId dibutuhkan' });

    // owner or admin?
    if (!currentUser.admin && currentUser.id !== userId) {
      return res.status(403).json({ message: 'Access denied. Hanya pemilik atau admin yang boleh mengakses data ini.' });
    }

    const data = await getUMKMByUserId(userId);
    if (!data) return res.status(404).json({ message: 'Data UMKM tidak ditemukan' });

    return res.status(200).json({ data });
  } catch (error) {
    console.error('Error get UMKM by user:', error);
    const status = error instanceof ApiError ? error.statusCode : 500;
    return res.status(status).json({ message: error.message });
  }
});

/**
 * GET /umkm/:idUmkm
 * Get UMKM by id - accessible to owner or admin
 */
router.get('/:idUmkm', authMiddleware, async (req, res) => {
  try {
    const currentUser = req.user;
    const idUmkm = Number(req.params.idUmkm);
    if (!idUmkm) return res.status(400).json({ message: 'idUmkm dibutuhkan' });

    const data = await getUMKMById(idUmkm);
    if (!data) return res.status(404).json({ message: 'Data UMKM tidak ditemukan' });

    // check ownership: data.idUser is owner
    if (!currentUser.admin && currentUser.id !== data.idUser) {
      return res.status(403).json({ message: 'Access denied. Hanya pemilik atau admin yang boleh mengakses data ini.' });
    }

    return res.status(200).json({ data });
  } catch (error) {
    console.error('Error get UMKM by id:', error);
    const status = error instanceof ApiError ? error.statusCode : 500;
    return res.status(status).json({ message: error.message });
  }
});

/**
 * PUT /umkm/:idUmkm
 * Update UMKM (owner or admin)
 */
router.put(
  '/:idUmkm',
  authMiddleware,
  validateUpdateUMKM,
  upload.array('sertifikatHalal', 3), // bisa upload sampai 3 gambar
  multerErrorHandler,
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          message: 'Validasi gagal!',
          errors: errors.array().reduce((acc, curr) => {
            if (!acc[curr.path]) acc[curr.path] = curr.msg;
            return acc;
          }, {}),
        });
      }

      const currentUser = req.user;
      const idUmkm = Number(req.params.idUmkm);
      if (!idUmkm) return res.status(400).json({ message: 'idUmkm dibutuhkan' });

      // fetch existing to check ownership
      const existing = await getUMKMById(idUmkm);
      if (!existing) return res.status(404).json({ message: 'Data UMKM tidak ditemukan' });

      if (!currentUser.admin && currentUser.id !== existing.idUser) {
        return res.status(403).json({ message: 'Access denied. Hanya pemilik atau admin yang boleh mengubah data ini.' });
      }

      const updatePayload = {
        namaUmkm: req.body.namaUmkm,
        ktp: req.body.ktp,
        addresses: req.body.addresses ? (Array.isArray(req.body.addresses) ? req.body.addresses : JSON.parse(req.body.addresses)) : undefined,
        file: req.file || [],
      };

      const updated = await updateUMKM(idUmkm, updatePayload);

      return res.status(200).json({
        message: 'Update UMKM berhasil',
        data: updated,
      });
    } catch (error) {
      console.error('Error update UMKM:', error);
      const status = error instanceof ApiError ? error.statusCode : 500;
      return res.status(status).json({ message: error.message });
    }
  }
);

/**
 * POST /umkm/:idUmkm/verify
 * Admin-only: approve/reject UMKM verification
 * body: { approved: boolean, reason?: string }
 */
router.post('/:idUmkm/verify', authMiddleware, validateVerifyUMKM, async (req, res) => {
  try {
    if (!req.user || !req.user.admin) {
      return res.status(403).json({ message: 'Akses ditolak! Hanya admin yang dapat melakukan verifikasi.' });
    }

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: 'Validasi gagal!',
        errors: errors.array().reduce((acc, curr) => {
          if (!acc[curr.path]) acc[curr.path] = curr.msg;
          return acc;
        }, {}),
      });
    }

    const idUmkm = Number(req.params.idUmkm);
    if (!idUmkm) return res.status(400).json({ message: 'idUmkm dibutuhkan' });

    // coerce approved to boolean if front-end sends "true"/"false" strings
    const rawApproved = req.body.approved;
    const approved = (rawApproved === true) || (rawApproved === 'true') || (String(rawApproved).toLowerCase() === '1');

    const { reason } = req.body;

    const updated = await verifyUMKM(idUmkm, { approved, reason, adminId: req.user.id });

    return res.status(200).json({
      message: approved ? 'UMKM berhasil disetujui' : 'UMKM ditolak',
      data: updated
    });
  } catch (error) {
    console.error('Error verify UMKM:', error);
    const status = error instanceof ApiError ? error.statusCode : 500;
    return res.status(status).json({ message: error.message });
  }
});

module.exports = router;

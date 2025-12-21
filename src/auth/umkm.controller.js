const express = require('express');
const { uploadUMKM } = require('../middleware/multer');
const { multerErrorHandler, authMiddleware, normalizeUmkmFiles } = require('../middleware/middleware');
const ApiError = require('../utils/apiError');
const nodemailer = require('nodemailer');
const dotenv = require('dotenv');
dotenv.config();
const bcrypt = require('bcryptjs');
const { createUser } = require('./user.service');
const {
  createUMKM,
  getUMKMByUserId,
  getUMKMById,
  updateUMKM,
  verifyUMKM
} = require('./umkm.service');

const { validateCreateUMKM, validateUpdateUMKM, validateLogin, validateVerifyUMKM } = require('../validation/validation');
const { loginUser } = require('./user.service');
const { findUMKMByUserId } = require('./umkm.repository');
const { validationResult } = require('express-validator');

const router = express.Router();

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : 587,
  secure: process.env.SMTP_SECURE === 'true',
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
 */
router.post(
  '/',
  uploadUMKM.fields([
    { name: 'sertifikatHalal', maxCount: 20 },
    { name: 'sertifikasiHalal', maxCount: 20 },
  ]),
  multerErrorHandler,
  normalizeUmkmFiles,
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
      if (req.user && req.user.id) {
        userId = Number(req.user.id);
      } else {
        const { name, email, password, phone_number } = req.body;
        const hashed = await bcrypt.hash(String(password), 10);
        const newUser = await createUser({
          name: String(name).trim(),
          email: String(email).trim(),
          password: hashed,
          phone_number: String(phone_number).trim()
        });
        userId = newUser.id;
      }

      const payload = {
        idUser: Number(userId),
        namaUmkm: req.body.namaUmkm,
        ktp: req.body.ktp || null,
        addresses: req.body.addresses ? (Array.isArray(req.body.addresses) ? req.body.addresses : JSON.parse(req.body.addresses)) : undefined,
        files: req.files || [],
      };

      const created = await createUMKM(payload);

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
 * POST /umkm/login – autentikasi sebagai UMKM
 */
router.post('/login', validateLogin, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: 'Validasi gagal!', errors: errors.array() });
    }

    const { emailOrPhone, password } = req.body;

    const { loginUser } = require('./user.service');
    const loginResult = await loginUser({ emailOrPhone, password });
    const user = loginResult.user;

    const isUmkmRole = user.role && String(user.role).toUpperCase() === 'UMKM';
    const umkmRecord = await findUMKMByUserId(user.id);
    if (!isUmkmRole && !umkmRecord) {
      return res.status(403).json({ message: 'Akses ditolak – akun ini bukan UMKM.' });
    }

    res.cookie('token', loginResult.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'None' : 'Lax',
      maxAge: 24 * 60 * 60 * 1000,
    });

    return res.status(200).json({ 
      message: 'Login UMKM berhasil', 
      data: { user, umkm: umkmRecord || null, token: loginResult.token } 
    });
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

    if (typeof require('./umkm.service').getAllUMKM === 'function') {
      const all = await require('./umkm.service').getAllUMKM();
      return res.status(200).json({ data: all });
    } else {
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
 * Get UMKM by userId - accessible to owner or admin
 */
router.get('/user/:userId', authMiddleware, async (req, res) => {
  try {
    const currentUser = req.user;
    const userId = Number(req.params.userId || req.query.userId);
    if (!userId) return res.status(400).json({ message: 'userId dibutuhkan' });

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
 * Get UMKM by id - accessible to owner (UMKM) or admin
 */
router.get('/:idUmkm', authMiddleware, async (req, res) => {
  try {
    const currentUser = req.user;
    const idUmkm = Number(req.params.idUmkm);
    if (!idUmkm) return res.status(400).json({ message: 'idUmkm dibutuhkan' });

    const data = await getUMKMById(idUmkm);
    if (!data) return res.status(404).json({ message: 'Data UMKM tidak ditemukan' });

    // ✅ IZINKAN: admin ATAU pemilik UMKM (data.id_user === currentUser.id)
    const isOwner = currentUser.id === data.id_user;
    if (!currentUser.admin && !isOwner) {
      return res.status(403).json({ 
        message: 'Access denied. Hanya pemilik atau admin yang boleh mengakses data ini.' 
      });
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
 * Update UMKM - accessible to owner (UMKM) or admin
 */
router.put(
  '/:idUmkm',
  authMiddleware,
  uploadUMKM.fields([
    { name: 'sertifikatHalal', maxCount: 20 },
    { name: 'sertifikasiHalal', maxCount: 20 },
  ]),
  multerErrorHandler,
  normalizeUmkmFiles,
  validateUpdateUMKM,
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

      const existing = await getUMKMById(idUmkm);
      if (!existing) return res.status(404).json({ message: 'Data UMKM tidak ditemukan' });

      // ✅ IZINKAN: admin ATAU pemilik UMKM (existing.id_user === currentUser.id)
      const isOwner = currentUser.id === existing.id_user;
      if (!currentUser.admin && !isOwner) {
        return res.status(403).json({ 
          message: 'Access denied. Hanya pemilik atau admin yang boleh mengubah data ini.' 
        });
      }

      const updatePayload = {
        namaUmkm: req.body.namaUmkm,
        ktp: req.body.ktp,
        addresses: req.body.addresses ? (Array.isArray(req.body.addresses) ? req.body.addresses : JSON.parse(req.body.addresses)) : undefined,
        files: req.files || [],
        userData: {}
      };

      if (req.body.name) updatePayload.userData.name = String(req.body.name).trim();
      if (req.body.email) updatePayload.userData.email = String(req.body.email).trim();
      if (req.body.phone_number) updatePayload.userData.phone_number = String(req.body.phone_number).trim();
      
      if (req.body.password && req.body.password.trim() !== '') {
        const bcrypt = require('bcryptjs');
        updatePayload.userData.password = await bcrypt.hash(String(req.body.password), 10);
      }

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
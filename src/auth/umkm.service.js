const prisma = require('../db');
const {
  insertUMKM,
  isUMKMRegistered,
  findUMKMById,
  findUMKMByUserId,
  updateUMKMById,
  updateVerificationStatus
} = require('./umkm.repository');

const dotenv = require('dotenv');
const { deleteFromCloudinaryByUrl } = require('../utils/cloudinary');
const { uploadToCloudinary } = require('../services/cloudinaryUpload.service');
const ApiError = require('../utils/apiError');
const { sendEmail } = require('../utils/email');

dotenv.config();

// Validasi apakah desa ada di database Tapal Kuda
async function validateTapalKudaAddress(id_desa) {
  const desa = await prisma.desa.findUnique({
    where: { id_desa: parseInt(id_desa) },
    include: {
      kecamatan: {
        include: {
          kabupaten: true
        }
      }
    }
  });

  if (!desa) {
    throw new ApiError(400, `Desa dengan ID ${id_desa} tidak ditemukan di wilayah Tapal Kuda`);
  }

  return desa;
}

// Create UMKM
const createUMKM = async (newUmkmData) => {
  const existingUMKM = await isUMKMRegistered(newUmkmData.idUser);
  if (existingUMKM) throw new ApiError(400, 'User sudah memiliki data UMKM!');

  // Validasi alamat - pastikan desa ada di database Tapal Kuda
  if (newUmkmData.addresses && Array.isArray(newUmkmData.addresses)) {
    for (const addr of newUmkmData.addresses) {
      if (!addr.id_desa) {
        throw new ApiError(400, 'ID Desa harus diisi untuk setiap alamat');
      }
      await validateTapalKudaAddress(addr.id_desa);
    }
  }

  let sertifikatUrl = [];

  if (newUmkmData.file && array.isArray(newUmkmData.file) && newUmkmData.file.length > 0) {
    // validasi maksimal 3 file yg diupload
    if (newUmkmData.file.length > 3) {
      throw new ApiError(400, 'Maksimal 3 file sertifikat halal yang diunggah!');
    }

      // Upload semua file ke Cloudinary secara paralel
    const uploadPromises = newUmkmData.files.map(file => 
      uploadToCloudinary(file.buffer, file.originalname)
    );
    const uploadResults = await Promise.all(uploadPromises);
    sertifikatUrls = uploadResults.map(result => result.url);
  }

  const umkmData = await insertUMKM({
    ...newUmkmData,
    sertifikat_halal: sertifikatUrl,
    sertifikatHalal: sertifikatUrl
  });

  return umkmData;
};

// Get all UMKM (admin)
const getAllUMKM = async () => {
  const all = await prisma.verifikasiUMKM.findMany({
    include: { 
      addresses: {
        include: {
          desa: {
            include: {
              kecamatan: {
                include: {
                  kabupaten: {
                    include: {
                      provinsi: true
                    }
                  }
                }
              }
            }
          }
        }
      }, 
      User: true 
    }
  });
  if (!all || all.length === 0) throw new ApiError(404, 'Tidak ada data UMKM ditemukan!');
  return all;
};

// Get UMKM by id
const getUMKMById = async (idUmkm) => {
  const umkm = await findUMKMById(idUmkm);
  if (!umkm) throw new ApiError(404, 'Data UMKM tidak ditemukan!');
  return umkm;
};

// // Get UMKM by user id
// const getUMKMByUserId = async (userId) => {
//   const umkm = await findUMKMByUserId(userId);
//   if (!umkm) throw new ApiError(404, 'Data UMKM untuk user ini tidak ditemukan!');
//   return umkm;
// };

// Update UMKM
const updateUMKM = async (idUmkm, updateData) => {
  const existing = await findUMKMById(idUmkm);
  if (!existing) throw new ApiError(404, 'Data UMKM tidak ditemukan!');

  // Validasi alamat jika ada update
  if (updateData.addresses && Array.isArray(updateData.addresses)) {
    for (const addr of updateData.addresses) {
      if (!addr.id_desa) {
        throw new ApiError(400, 'ID Desa harus diisi untuk setiap alamat');
      }
      await validateTapalKudaAddress(addr.id_desa);
    }
  }

  const payload = {
    nama_umkm: updateData.namaUmkm || existing.nama_umkm,
    ktp: updateData.ktp || existing.ktp
  };

  // Handle file sertifikat halal
  if (updateData.files && updateData.files.length > 0) {
    // Hapus sertifikat lama dari Cloudinary
    if (existing.sertifikat_halal && Array.isArray(existing.sertifikat_halal)) {
      for (const url of existing.sertifikat_halal) {
        await deleteFromCloudinaryByUrl(url);
      }
    }
    
    // Upload yang baru
    const uploadPromises = updateData.files.map(f => 
      uploadToCloudinary(f.buffer, f.originalname)
    );
    const results = await Promise.all(uploadPromises);
    payload.sertifikat_halal = results.map(r => r.url);
  }

  // Include addresses dalam payload jika ada
  if (updateData.addresses) {
    payload.addresses = updateData.addresses;
  }

  const updated = await updateUMKMById(idUmkm, payload);
  return updated;
};

// Verify UMKM (approve/reject) - sets role and sends email
const verifyUMKM = async (idUmkm, { approved, reason, adminId }) => {
  const existing = await findUMKMById(idUmkm);
  if (!existing) throw new ApiError(404, 'Data UMKM tidak ditemukan!');

  const isApproved = (approved === true) || (approved === 'true') || (String(approved).toLowerCase() === '1');
  const status = isApproved ? 'Verified' : 'Rejected';

  // Transaction: update verifikasi_umkm, and if approved set user.role = 'UMKM'
  const updated = await prisma.$transaction(async (tx) => {
    const u = await tx.verifikasiUMKM.update({
      where: { id_umkm: Number(idUmkm) },
      data: {
        status_verifikasi: status,
        alasan_penolakan: reason || null
      },
      include: { 
        addresses: {
          include: {
            desa: {
              include: {
                kecamatan: {
                  include: {
                    kabupaten: {
                      include: {
                        provinsi: true
                      }
                    }
                  }
                }
              }
            }
          }
        }, 
        User: true 
      }
    });

    if (isApproved && u?.id_user) {
      try {
        await tx.user.update({
          where: { id: Number(u.id_user) },
          data: { role: 'UMKM' }
        });
      } catch (e) {
        console.warn('verifyUMKM: gagal set role UMKM pada user dalam transaction:', e.message || e);
      }
    }

    return u;
  });

  // Send notification email (outside transaction)
  const userEmail = updated.User?.email || null;
  if (userEmail) {
    try {
      if (isApproved) {
        const subject = 'Verifikasi UMKM Disetujui';
        const html = `<p>Halo ${updated.User?.name || ''},</p>
          <p>Pengajuan verifikasi UMKM Anda telah <strong>disetujui</strong>.</p>
          <p>Nama UMKM: <strong>${updated.nama_umkm}</strong></p>`;
        await sendEmail({ to: userEmail, subject, html });
      } else {
        const subject = 'Verifikasi UMKM Ditolak';
        const html = `<p>Halo ${updated.User?.name || ''},</p>
          <p>Pengajuan verifikasi UMKM Anda <strong>ditolak</strong>.</p>
          <p>Nama UMKM: <strong>${updated.nama_umkm}</strong></p>
          <p>Alasan: ${reason || '-'}</p>`;
        await sendEmail({ to: userEmail, subject, html });
      }
    } catch (err) {
      console.error('verifyUMKM: gagal kirim email notifikasi:', err.message || err);
    }
  } else {
    console.warn('verifyUMKM: email user tidak ditemukan, email tidak dikirim');
  }

  return updated;
};

module.exports = {
  createUMKM,
  getAllUMKM,
  getUMKMById,
  // getUMKMByUserId,
  updateUMKM,
  verifyUMKM
};
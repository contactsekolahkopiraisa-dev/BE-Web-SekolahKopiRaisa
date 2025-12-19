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

  let sertifikatUrls = []; // FIX: nama variable yang konsisten

  if (newUmkmData.files && Array.isArray(newUmkmData.files) && newUmkmData.files.length > 0) {
    // Upload semua file ke Cloudinary secara paralel (unlimited)
    const uploadPromises = newUmkmData.files.map(file => 
      uploadToCloudinary(file.buffer, file.originalname)
    );
    const uploadResults = await Promise.all(uploadPromises);
    sertifikatUrls = uploadResults.map(result => result.url);
  }

  const umkmData = await insertUMKM({
    ...newUmkmData,
    sertifikat_halal: sertifikatUrls, 
    sertifikatHalal: sertifikatUrls   
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

// Get UMKM by user id
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

  // Prepare payload untuk update UMKM
  const umkmPayload = {
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
    umkmPayload.sertifikat_halal = results.map(r => r.url);
  }

  // Include addresses dalam payload jika ada
  if (updateData.addresses) {
    umkmPayload.addresses = updateData.addresses;
  }

  // ============================================
  // TRANSACTION: Update UMKM + User Data
  // ============================================
  const updated = await prisma.$transaction(async (tx) => {
    // 1. Update data UMKM
    const updatedUMKM = await tx.verifikasiUMKM.update({
      where: { id_umkm: Number(idUmkm) },
      data: umkmPayload,
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

    // 2. Update data User jika ada
    if (updateData.userData && Object.keys(updateData.userData).length > 0) {
      await tx.user.update({
        where: { id: Number(existing.id_user) },
        data: updateData.userData
      });

      // Refresh data User setelah update
      const refreshedUser = await tx.user.findUnique({
        where: { id: Number(existing.id_user) }
      });
      updatedUMKM.User = refreshedUser;
    }

    // 3. Update Partner name jika nama UMKM berubah
    if (updateData.namaUmkm && updateData.namaUmkm !== existing.nama_umkm) {
      try {
        await tx.partner.updateMany({
          where: { user_id: Number(existing.id_user) },
          data: { name: updateData.namaUmkm }
        });
        console.log(`✅ Partner name updated to: ${updateData.namaUmkm}`);
      } catch (e) {
        console.warn('⚠️ Gagal update partner name:', e.message);
        // Don't throw, partner update is optional
      }
    }

    return updatedUMKM;
  });

  return updated;
};

// Verify UMKM (approve/reject) - sets role and sends email
const verifyUMKM = async (idUmkm, { approved, reason, adminId }) => {
  const existing = await findUMKMById(idUmkm);
  if (!existing) throw new ApiError(404, 'Data UMKM tidak ditemukan!');

  const isApproved = (approved === true) || (approved === 'true') || (String(approved).toLowerCase() === '1');
  const status = isApproved ? 'Verified' : 'Rejected';

  // Transaction: update verifikasi_umkm, set user.role = 'UMKM', and create Partner
  const updated = await prisma.$transaction(async (tx) => {
    // 1. Update status verifikasi UMKM
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

    // 2. Jika approved, set role UMKM dan create Partner
    if (isApproved && u?.id_user) {
      try {
        // Set role user jadi UMKM
        await tx.user.update({
          where: { id: Number(u.id_user) },
          data: { role: 'UMKM' }
        });

        // Cek apakah Partner sudah ada untuk user ini
        const existingPartner = await tx.partner.findUnique({
          where: { user_id: Number(u.id_user) }
        });

        // Auto-create Partner jika belum ada
        if (!existingPartner) {
          await tx.partner.create({
            data: {
              name: u.nama_umkm,
              owner_name: u.User.name,
              phone_number: u.User.phone_number || '-',
              user_id: Number(u.id_user)
            }
          });
          console.log(`✅ Partner berhasil dibuat untuk UMKM: ${u.nama_umkm}`);
        } else {
          console.log(`ℹ️  Partner sudah ada untuk user_id: ${u.id_user}`);
        }
      } catch (e) {
        console.error('❌ verifyUMKM: gagal set role UMKM atau create Partner:', e.message || e);
        throw e; // Rollback transaction jika gagal
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
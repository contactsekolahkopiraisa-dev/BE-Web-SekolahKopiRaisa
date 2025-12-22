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

/**
 * Validasi apakah desa ada di database Tapal Kuda
 */
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

/**
 * Create UMKM
 */
const createUMKM = async (newUmkmData) => {
  const existingUMKM = await isUMKMRegistered(newUmkmData.idUser);
  if (existingUMKM) throw new ApiError(400, 'User sudah memiliki data UMKM!');

  if (newUmkmData.addresses && Array.isArray(newUmkmData.addresses)) {
    for (const addr of newUmkmData.addresses) {
      if (!addr.id_desa) {
        throw new ApiError(400, 'ID Desa harus diisi untuk setiap alamat');
      }
      await validateTapalKudaAddress(addr.id_desa);
    }
  }

  let suratIzinEdarUrls = []; 

  if (newUmkmData.files && Array.isArray(newUmkmData.files) && newUmkmData.files.length > 0) {
    const uploadPromises = newUmkmData.files.map(file => 
      uploadToCloudinary(file.buffer, file.originalname)
    );
    const uploadResults = await Promise.all(uploadPromises);
    suratIzinEdarUrls = uploadResults.map(result => result.url);
  }

  const umkmData = await insertUMKM({
    ...newUmkmData,
    surat_izin_edar: suratIzinEdarUrls,  
    suratIzinEdar: suratIzinEdarUrls     
  });

  return umkmData;
};

/**
 * Get all UMKM (admin)
 */
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

/**
 * Get UMKM by id
 */
const getUMKMById = async (idUmkm) => {
  const umkm = await findUMKMById(idUmkm);
  if (!umkm) throw new ApiError(404, 'Data UMKM tidak ditemukan!');
  return umkm;
};

/**
 * ✅ Get UMKM by user id
 */
const getUMKMByUserId = async (userId) => {
  const umkm = await findUMKMByUserId(userId);
  if (!umkm) throw new ApiError(404, 'Data UMKM untuk user ini tidak ditemukan!');
  return umkm;
};

/**
 * Update UMKM
 */
const updateUMKM = async (idUmkm, updateData) => {
  const existing = await findUMKMById(idUmkm);
  if (!existing) throw new ApiError(404, 'Data UMKM tidak ditemukan!');

  if (updateData.addresses && Array.isArray(updateData.addresses)) {
    for (const addr of updateData.addresses) {
      if (!addr.id_desa) {
        throw new ApiError(400, 'ID Desa harus diisi untuk setiap alamat');
      }
      await validateTapalKudaAddress(addr.id_desa);
    }
  }

  const umkmPayload = {
    nama_umkm: updateData.namaUmkm || existing.nama_umkm,
    ktp: updateData.ktp || existing.ktp
  };

  if (updateData.files && updateData.files.length > 0) {
    // ✅ Hapus file lama dari Cloudinary
    if (existing.surat_izin_edar && Array.isArray(existing.surat_izin_edar)) {
      for (const url of existing.surat_izin_edar) {
        await deleteFromCloudinaryByUrl(url);
      }
    }
    
    // ✅ Upload file baru
    const uploadPromises = updateData.files.map(f => 
      uploadToCloudinary(f.buffer, f.originalname)
    );
    const results = await Promise.all(uploadPromises);
    umkmPayload.surat_izin_edar = results.map(r => r.url); 
  }

  if (updateData.addresses) {
    umkmPayload.addresses = updateData.addresses;
  }

  const updated = await prisma.$transaction(async (tx) => {
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

    if (updateData.userData && Object.keys(updateData.userData).length > 0) {
      await tx.user.update({
        where: { id: Number(existing.id_user) },
        data: updateData.userData
      });

      const refreshedUser = await tx.user.findUnique({
        where: { id: Number(existing.id_user) }
      });
      updatedUMKM.User = refreshedUser;
    }

    if (updateData.namaUmkm && updateData.namaUmkm !== existing.nama_umkm) {
      try {
        await tx.partner.updateMany({
          where: { user_id: Number(existing.id_user) },
          data: { name: updateData.namaUmkm }
        });
        console.log(`✅ Partner name updated to: ${updateData.namaUmkm}`);
      } catch (e) {
        console.warn('⚠️ Gagal update partner name:', e.message);
      }
    }

    return updatedUMKM;
  });

  return updated;
};

/**
 * Verify UMKM (approve/reject) - sets role and sends email
 */
const verifyUMKM = async (idUmkm, { approved, reason, adminId }) => {
  const existing = await findUMKMById(idUmkm);
  if (!existing) throw new ApiError(404, 'Data UMKM tidak ditemukan!');

  const isApproved = (approved === true) || (approved === 'true') || (String(approved).toLowerCase() === '1');
  const status = isApproved ? 'Verified' : 'Rejected';

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

        const existingPartner = await tx.partner.findUnique({
          where: { user_id: Number(u.id_user) }
        });

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
          console.log(`ℹ️ Partner sudah ada untuk user_id: ${u.id_user}`);
        }
      } catch (e) {
        console.error('❌ verifyUMKM: gagal set role UMKM atau create Partner:', e.message || e);
        throw e;
      }
    }

    return u;
  });

  const userEmail = updated.User?.email || null;
  if (userEmail) {
    try {
      if (isApproved) {
        const subject = 'Verifikasi UMKM Anda Telah Disetujui';
        const html = `
          <!DOCTYPE html>
          <html>
          <head>
            <style>
              body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; background: #f9f9f9; }
              .header { background: #2c3e50; color: white; padding: 25px; text-align: center; border-radius: 8px 8px 0 0; }
              .content { background: #ffffff; padding: 30px; border: 1px solid #e0e0e0; }
              .umkm-name { color: #2c3e50; font-size: 1.2em; font-weight: bold; margin: 15px 0; padding: 10px; background: #ecf0f1; border-radius: 4px; }
              .info-box { background: #e8f5e9; border-left: 4px solid #4caf50; padding: 15px; margin: 20px 0; border-radius: 4px; }
              .footer { background: #ecf0f1; padding: 20px; text-align: center; font-size: 0.9em; color: #666; border-radius: 0 0 8px 8px; }
              .button { display: inline-block; padding: 12px 30px; background: #2c3e50; color: white; text-decoration: none; border-radius: 4px; margin: 20px 0; }
              ul { padding-left: 20px; }
              li { margin: 8px 0; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1 style="margin: 0; font-size: 1.6em;">Verifikasi UMKM Disetujui</h1>
              </div>
              <div class="content">
                <p>Kepada Yth. <strong>${updated.User?.name || ''}</strong>,</p>
                
                <p>Dengan ini kami informasikan bahwa pengajuan verifikasi UMKM Anda telah <strong>disetujui</strong> oleh tim kami.</p>
                
                <div class="info-box">
                  <p style="margin: 0 0 5px 0;"><strong>Nama UMKM:</strong></p>
                  <div class="umkm-name">${updated.nama_umkm}</div>
                </div>
                
                <p><strong>Langkah Selanjutnya:</strong></p>
                <ul>
                  <li>Anda dapat mengakses seluruh fitur sebagai UMKM terverifikasi</li>
                  <li>Kelola produk dan layanan melalui dashboard</li>
                  <li>Akses laporan penjualan dan keuangan</li>
                </ul>
                
                <p>Terima kasih atas kepercayaan Anda menggunakan platform kami.</p>
                
                <p style="margin-top: 25px;">Hormat kami,<br><strong>Tim Sekolah Kopi Raisa</strong></p>
              </div>
              <div class="footer">
                <p style="margin: 5px 0;">Email: <a href="mailto:contact.sekolahkopiraisa@gmail.com" style="color: #2c3e50;">contact.sekolahkopiraisa@gmail.com</a></p>
                <p style="margin: 5px 0;">WhatsApp: <a href="https://wa.me/6285172252910" style="color: #25D366;">+62 851-7225-2910</a></p>
                <p style="margin: 10px 0 5px 0; color: #999; font-size: 0.85em;">Email otomatis, mohon tidak membalas langsung.</p>
              </div>
            </div>
          </body>
          </html>
        `;
        await sendEmail({ to: userEmail, subject, html });
      } else {
        const subject = 'Informasi Verifikasi UMKM';
        const html = `
          <!DOCTYPE html>
          <html>
          <head>
            <style>
              body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; background: #f9f9f9; }
              .header { background: #c0392b; color: white; padding: 25px; text-align: center; border-radius: 8px 8px 0 0; }
              .content { background: #ffffff; padding: 30px; border: 1px solid #e0e0e0; }
              .umkm-name { color: #c0392b; font-size: 1.2em; font-weight: bold; margin: 10px 0; padding: 10px; background: #fadbd8; border-radius: 4px; }
              .reason-box { background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; border-radius: 4px; }
              .info-box { background: #e3f2fd; border-left: 4px solid #2196F3; padding: 15px; margin: 20px 0; border-radius: 4px; }
              .footer { background: #ecf0f1; padding: 20px; text-align: center; font-size: 0.9em; color: #666; border-radius: 0 0 8px 8px; }
              .button { display: inline-block; padding: 12px 30px; background: #2196F3; color: white; text-decoration: none; border-radius: 4px; margin: 20px 0; }
              ul { padding-left: 20px; }
              li { margin: 8px 0; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1 style="margin: 0; font-size: 1.6em;">Informasi Verifikasi UMKM</h1>
              </div>
              <div class="content">
                <p>Kepada Yth. <strong>${updated.User?.name || ''}</strong>,</p>
                
                <p>Terima kasih telah mengajukan verifikasi UMKM. Setelah meninjau dokumen dan informasi yang disampaikan, saat ini pengajuan verifikasi Anda <strong>belum dapat disetujui</strong>.</p>
                
                <div class="umkm-name">${updated.nama_umkm}</div>
                
                <div class="reason-box">
                  <p style="margin: 0 0 8px 0;"><strong>Alasan:</strong></p>
                  <p style="margin: 0;">${reason || 'Tidak disebutkan'}</p>
                </div>
                
                <p><strong>Yang Perlu Dilakukan:</strong></p>
                <ul>
                  <li>Periksa kembali dokumen yang diupload (Surat Izin Edar, KTP)</li>
                  <li>Pastikan seluruh informasi sudah lengkap dan akurat</li>
                  <li>Pastikan file yang diupload jelas dan terbaca dengan baik</li>
                  <li>Tinjau kembali persyaratan yang diminta</li>
                </ul>
                
                <div class="info-box">
                  <p style="margin: 0;">Jika memerlukan bantuan atau penjelasan lebih lanjut, silakan hubungi tim kami melalui kontak yang tersedia.</p>
                </div>
                
                <p>Kami berharap dapat segera memproses verifikasi UMKM Anda. Terima kasih atas kerjasamanya.</p>
                
                <p style="margin-top: 25px;">Hormat kami,<br><strong>Tim Sekolah Kopi Raisa</strong></p>
              </div>
              <div class="footer">
                <p style="margin: 5px 0;">Email: <a href="mailto:contact.sekolahkopiraisa@gmail.com" style="color: #2c3e50;">contact.sekolahkopiraisa@gmail.com</a></p>
                <p style="margin: 5px 0;">WhatsApp: <a href="https://wa.me/6285172252910" style="color: #25D366;">+62 851-7225-2910</a></p>
                <p style="margin: 10px 0 5px 0; color: #999; font-size: 0.85em;">Email otomatis, mohon tidak membalas langsung.</p>
              </div>
            </div>
          </body>
          </html>
        `;
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
  getUMKMByUserId,
  updateUMKM,
  verifyUMKM
};
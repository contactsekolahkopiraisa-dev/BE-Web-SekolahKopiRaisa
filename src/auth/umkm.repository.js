// src/auth/umkm.repository.js
const prismaImport = require('../db');
const { PrismaClient } = require('@prisma/client');
const { sendEmail } = require('../utils/email');

const prisma = (prismaImport && (prismaImport.prisma || prismaImport)) || new PrismaClient();

function verifikasiModel() {
  const model = prisma.verifikasiUMKM || prisma.verifikasiUmkm || prisma.VerifikasiUMKM;
  if (!model) {
    throw new Error('Prisma model VerifikasiUMKM tidak ditemukan. Cek export di src/db dan schema.prisma');
  }
  return model;
}

const _truncate = (v, max) => {
  if (v === null || v === undefined) return null;
  const s = String(v);
  return s.length > max ? s.slice(0, max) : s;
};

/**
 * Insert data UMKM baru
 */
const insertUMKM = async (newUmkmData) => {
  const model = verifikasiModel();

  const data = {
    id_user: newUmkmData.id_user || newUmkmData.idUser,
    nama_umkm: _truncate(newUmkmData.nama_umkm || newUmkmData.namaUmkm || '', 150),
    ktp: _truncate(newUmkmData.ktp || null, 16),
    surat_izin_edar: newUmkmData.surat_izin_edar || newUmkmData.suratIzinEdar || null, 
  };

  if (Array.isArray(newUmkmData.addresses) && newUmkmData.addresses.length > 0) {
    const addressesCreate = newUmkmData.addresses.map(addr => ({
      id_desa: parseInt(addr.id_desa),
      alamat: _truncate(addr.alamat || '', 255),
      kode_pos: addr.kode_pos ? _truncate(addr.kode_pos, 10) : null
    }));
    data.addresses = { create: addressesCreate };
  }

  try {
    const umkmData = await model.create({
      data,
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
    return umkmData;
  } catch (err) {
    if (err && err.code === 'P2000') {
      throw new Error('Salah satu nilai input terlalu panjang untuk kolom DB. Periksa panjang namaUmkm/ktp/alamat.');
    }
    if (err && err.code === 'P2003') {
      throw new Error('ID Desa tidak valid atau tidak ditemukan di database Tapal Kuda.');
    }
    throw err;
  }
};

/**
 * Cek apakah user sudah punya data UMKM
 */
const isUMKMRegistered = async (idUser) => {
  const model = verifikasiModel();
  const umkm = await model.findFirst({
    where: { id_user: idUser }
  });
  return !!umkm;
};

/**
 * Cari UMKM berdasarkan ID UMKM
 */
const findUMKMById = async (idUmkm) => {
  const model = verifikasiModel();
  const umkm = await model.findUnique({
    where: { id_umkm: Number(idUmkm) },
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
  return umkm;
};

/**
 * ✅ Cari UMKM berdasarkan user ID
 */
const findUMKMByUserId = async (idUser) => {
  const model = verifikasiModel();
  const umkm = await model.findFirst({
    where: { id_user: Number(idUser) },
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
  return umkm;
};

/**
 * Update data UMKM (partial update)
 */
const updateUMKMById = async (idUmkm, updateData) => {
  const model = verifikasiModel();

  const data = { ...updateData };
  if (data.idUser) { data.id_user = data.idUser; delete data.idUser; }
  if (data.namaUmkm) { data.nama_umkm = data.namaUmkm; delete data.namaUmkm; }
  if (data.suratIzinEdar) { data.surat_izin_edar = data.suratIzinEdar; delete data.suratIzinEdar; } 
  
  if (data.addresses) {
    await prisma.address.deleteMany({ where: { id_umkm: Number(idUmkm) } });
    
    const addressesCreate = data.addresses.map(addr => ({
      id_desa: parseInt(addr.id_desa),
      alamat: _truncate(addr.alamat || '', 255),
      kode_pos: addr.kode_pos ? _truncate(addr.kode_pos, 10) : null
    }));
    
    delete data.addresses;
    
    return await model.update({ 
      where: { id_umkm: Number(idUmkm) }, 
      data: { 
        ...data, 
        addresses: { create: addressesCreate } 
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
  }
  
  const umkm = await model.update({ 
    where: { id_umkm: Number(idUmkm) }, 
    data, 
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
  return umkm;
};

/**
 * helper: update status verifikasi
 */
const updateVerificationStatus = async (idUmkm, { status, reason }) => {
  const normalized = (status && String(status).toLowerCase() === 'verified') ? 'Verified'
    : (status && String(status).toLowerCase() === 'rejected') ? 'Rejected'
    : status;

  const model = verifikasiModel();
  const updated = await model.update({
    where: { id_umkm: Number(idUmkm) },
    data: {
      status_verifikasi: normalized,
      alasan_penolakan: reason || null
    },
    include: { User: true, addresses: true }
  });
  return updated;
};

/**
 * Verifikasi UMKM oleh admin (kirim email)
 */
const verifyUMKM = async (idUmkm, { approved, reason, adminId }) => {
  const existing = await findUMKMById(idUmkm);
  if (!existing) {
    throw new Error('Data UMKM tidak ditemukan!');
  }

  const status = approved ? 'Verified' : 'Rejected';
  const updated = await updateVerificationStatus(idUmkm, { status, reason });

  const userEmail = updated.User && updated.User.email ? updated.User.email : null;
  if (userEmail) {
    if (approved) {
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
              <p>Kepada Yth. <strong>${updated.User.name || ''}</strong>,</p>
              
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
              <p>Kepada Yth. <strong>${updated.User.name || ''}</strong>,</p>
              
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
  } else {
    console.warn('verifyUMKM: user email tidak ditemukan, email tidak dikirim');
  }

  return updated;
};

module.exports = {
  insertUMKM,
  isUMKMRegistered,
  findUMKMById,
  findUMKMByUserId,
  updateUMKMById,
  updateVerificationStatus,
  verifyUMKM
};
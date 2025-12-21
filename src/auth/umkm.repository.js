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
    sertifikat_halal: newUmkmData.sertifikat_halal || newUmkmData.sertifikatHalal || null,
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
  if (data.sertifikatHalal) { data.sertifikat_halal = data.sertifikatHalal; delete data.sertifikatHalal; }
  
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
      const subject = 'Verifikasi UMKM Disetujui';
      const html = `<p>Halo ${updated.User.name || ''},</p>
        <p>Pengajuan verifikasi UMKM Anda telah <strong>disetujui</strong> oleh admin.</p>
        <p>Nama UMKM: <strong>${updated.nama_umkm}</strong></p>
        <p>Terima kasih.</p>`;
      await sendEmail({ to: userEmail, subject, html });
    } else {
      const subject = 'Verifikasi UMKM Ditolak';
      const html = `<p>Halo ${updated.User.name || ''},</p>
        <p>Pengajuan verifikasi UMKM Anda <strong>ditolak</strong> oleh admin.</p>
        <p>Nama UMKM: <strong>${updated.nama_umkm}</strong></p>
        <p>Alasan penolakan: <em>${reason || '-'}</em></p>
        <p>Silakan perbaiki data dan ajukan kembali jika perlu.</p>`;
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
  findUMKMByUserId,  // ✅ Export fungsi ini
  updateUMKMById,
  updateVerificationStatus,
  verifyUMKM
};
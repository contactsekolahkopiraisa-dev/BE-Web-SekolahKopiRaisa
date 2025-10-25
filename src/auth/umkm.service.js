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

const wilayahService = require('../utils/wilayah.service');
const rajaOngkirApi = require('../utils/rajaOngkir');
const { sendEmail } = require('../utils/email');

dotenv.config();

// Normalisasi helper
function normalize(s) {
  if (s === null || s === undefined) return '';
  return String(s).toLowerCase().normalize('NFKD').replace(/\p{Diacritic}/gu, '').trim();
}

// Enrich & validate alamat memakai Wilayah ID + RajaOngkir (kode pos)
async function enrichAndValidateAddresses(addresses = []) {
  if (!Array.isArray(addresses)) return addresses;
  const enriched = [];

  for (const addr of addresses) {
    const a = { ...addr };
    try {
      const provinceInput = a.provinceId || a.provinceCode || a.provinsi || a.province;
      const regencyInput = a.regencyId || a.regencyCode || a.kabupaten || a.regency;
      const districtInput = a.districtId || a.districtCode || a.kecamatan || a.district;
      const villageInput = a.villageId || a.villageCode || a.desa || a.village;

      const qProvince = normalize(provinceInput);
      const qRegency = normalize(regencyInput);
      const qDistrict = normalize(districtInput);
      const qVillage = normalize(villageInput);

      // Provinsi
      if (qProvince) {
        try {
          const provinces = await wilayahService.getProvinces({ useCache: true });
          const p = provinces.find(pv => {
            const id = normalize(pv.id || pv.code);
            const name = normalize(pv.name || pv.nama || pv.province);
            return id === qProvince || name === qProvince || name.includes(qProvince) || qProvince.includes(name);
          });
          if (p) {
            a.provinceId = p.id || p.code;
            a.provinsi = p.name || p.nama || a.provinsi;
          }
        } catch (e) {
          console.warn('Wilayah: gagal ambil provinsi', e.message);
        }
      }

      // Kabupaten / regency
      if (qRegency && a.provinceId) {
        try {
          const regencies = await wilayahService.getRegencies(a.provinceId, { useCache: true });
          const r = regencies.find(rv => {
            const id = normalize(rv.id || rv.code);
            const name = normalize(rv.name || rv.nama || rv.regency);
            return id === qRegency || name === qRegency || name.includes(qRegency) || qRegency.includes(name);
          });
          if (r) {
            a.regencyId = r.id || r.code;
            a.kabupaten = r.name || r.nama || a.kabupaten;
          }
        } catch (e) {
          console.warn('Wilayah: gagal ambil kabupaten', e.message);
        }
      } else if (qRegency && !a.provinceId) {
        // fallback search tanpa provinsi
        try {
          const regencies = await wilayahService.searchRegencies(qRegency, { useCache: true }).catch(() => []);
          const r = regencies.find(rv => {
            const id = normalize(rv.id || rv.code);
            const name = normalize(rv.name || rv.nama || rv.regency);
            return id === qRegency || name === qRegency || name.includes(qRegency) || qRegency.includes(name);
          });
          if (r) {
            a.regencyId = r.id || r.code;
            a.kabupaten = r.name || r.nama || a.kabupaten;
            a.provinceId = r.province_id || r.provinceId || a.provinceId;
          }
        } catch (e) {
          console.warn('Wilayah: fallback kabupaten search gagal', e.message);
        }
      }

      // Kecamatan / district
      if (qDistrict && a.regencyId) {
        try {
          const districts = await wilayahService.getDistricts(a.regencyId, { useCache: true });
          const d = districts.find(dv => {
            const id = normalize(dv.id || dv.code);
            const name = normalize(dv.name || dv.nama || dv.district);
            return id === qDistrict || name === qDistrict || name.includes(qDistrict) || qDistrict.includes(name);
          });
          if (d) {
            a.districtId = d.id || d.code;
            a.kecamatan = d.name || d.nama || a.kecamatan;
          }
        } catch (e) {
          console.warn('Wilayah: gagal ambil kecamatan', e.message);
        }
      }

      // Desa / village
      if (qVillage && a.districtId) {
        try {
          const villages = await wilayahService.getVillages(a.districtId, { useCache: true });
          const v = villages.find(vv => {
            const id = normalize(vv.id || vv.code);
            const name = normalize(vv.name || vv.nama || vv.village);
            return id === qVillage || name === qVillage || name.includes(qVillage) || qVillage.includes(name);
          });
          if (v) {
            a.villageId = v.id || v.code;
            a.desa = v.name || v.nama || a.desa;
          }
        } catch (e) {
          console.warn('Wilayah: gagal ambil desa', e.message);
        }
      }

      // Validasi kode pos via RajaOngkir (jika ada)
      const kode = a.kodePos || a.kode_pos || a.postcode || a.zip;
      if (kode) {
        try {
          const resp = await rajaOngkirApi.get('/destination/domestic-destination', {
            params: { search: kode, limit: 1, offset: 0 }
          });
          const found = resp?.data?.data;
          if (!found || found.length === 0) {
            throw new ApiError(400, `Kode pos tidak valid: ${kode}`);
          }
          a.kodePos = kode;
        } catch (err) {
          if (err instanceof ApiError) throw err;
          console.warn('RajaOngkir: gagal validasi kodepos', err.message || err);
        }
      }
    } catch (err) {
      console.warn('Enrich address error:', err.message || err);
    }

    // map ke shape yang sesuai schema Address (Prisma)
    const clean = {
      alamat: a.alamat || a.address || a.addressLine || a.street || null,
      desa: a.desa || a.village || a.villageName || null,
      kecamatan: a.kecamatan || a.district || a.districtName || null,
      kabupaten: a.kabupaten || a.regency || a.regencyName || null,
      provinsi: a.provinsi || a.province || a.provinceName || null,
      kode_pos: a.kode_pos || a.kodePos || a.postcode || a.zip || null
    };

    enriched.push(clean);
  }

  return enriched;
}


// Create UMKM
const createUMKM = async (newUmkmData) => {
  const existingUMKM = await isUMKMRegistered(newUmkmData.idUser);
  if (existingUMKM) throw new ApiError(400, 'User sudah memiliki data UMKM!');

  if (newUmkmData.addresses) {
    newUmkmData.addresses = await enrichAndValidateAddresses(newUmkmData.addresses);
  }

  let sertifikatUrl = null;
  if (newUmkmData.file) {
    sertifikatUrl = await uploadToCloudinary(newUmkmData.file.buffer, newUmkmData.file.originalname);
  }

  const umkmData = await insertUMKM({
    ...newUmkmData,
    sertifikat_halal: sertifikatUrl,
    sertifikatHalal: sertifikatUrl
  });

  // role assigned only after admin verification in verifyUMKM
  return umkmData;
};

// Get all UMKM (admin)
const getAllUMKM = async () => {
  const all = await prisma.verifikasiUMKM.findMany({
    include: { addresses: true, User: true }
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
const getUMKMByUserId = async (userId) => {
  const umkm = await findUMKMByUserId(userId);
  if (!umkm) throw new ApiError(404, 'Data UMKM untuk user ini tidak ditemukan!');
  return umkm;
};

// Update UMKM
const updateUMKM = async (idUmkm, updateData) => {
  const existing = await findUMKMById(idUmkm);
  if (!existing) throw new ApiError(404, 'Data UMKM tidak ditemukan!');

  if (updateData.addresses) {
    updateData.addresses = await enrichAndValidateAddresses(updateData.addresses);
  }

  const payload = {
    nama_umkm: updateData.namaUmkm || existing.nama_umkm,
    ktp: updateData.ktp || existing.ktp
  };

  if (updateData.file) {
    if (existing.sertifikat_halal) await deleteFromCloudinaryByUrl(existing.sertifikat_halal);
    const url = await uploadToCloudinary(updateData.file.buffer, updateData.file.originalname);
    payload.sertifikat_halal = url;
  }

  const updated = await updateUMKMById(idUmkm, payload);
  return updated;
};

// Verify UMKM (approve/reject) - sets role and sends email
const verifyUMKM = async (idUmkm, { approved, reason, adminId }) => {
  const existing = await findUMKMById(idUmkm);
  if (!existing) throw new ApiError(404, 'Data UMKM tidak ditemukan!');

  // normalize approved in case it's string
  const isApproved = (approved === true) || (approved === 'true') || (String(approved).toLowerCase() === '1');

  const status = isApproved ? 'Verified' : 'Rejected';

  // transaction: update verifikasi_umkm, and if approved set user.role = 'UMKM'
  const updated = await prisma.$transaction(async (tx) => {
    const u = await tx.verifikasiUMKM.update({
      where: { id_umkm: Number(idUmkm) },
      data: {
        status_verifikasi: status,
        alasan_penolakan: reason || null
      },
      include: { User: true, addresses: true }
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

  // send notification email (outside transaction)
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
  getUMKMByUserId,
  updateUMKM,
  verifyUMKM
};
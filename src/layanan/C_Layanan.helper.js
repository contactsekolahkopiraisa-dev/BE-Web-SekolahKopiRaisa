const ApiError = require("../utils/apiError.js");
const {
  uploadToCloudinary,
} = require("../services/cloudinaryUpload.service.js");
const { STATUS } = require("../utils/constant/enum.js");

const formatLayanan = (l) => ({
  id: l.id,
  nama_kegiatan: l.nama_kegiatan,
  tempat_kegiatan: l.tempat_kegiatan,
  jumlah_peserta: l.jumlah_peserta,
  instansi_asal: l.instansi_asal,
  tanggal_mulai: l.tanggal_mulai,
  tanggal_selesai: l.tanggal_selesai,
  durasi_dalam_bulan: l.durasi_dalam_bulan,
  link_logbook: l.link_logbook,
  file_proposal: l.file_proposal,
  file_surat_permohonan: l.file_surat_permohonan,
  file_surat_pengantar: l.file_surat_pengantar,
  file_surat_undangan: l.file_surat_undangan,
  created_at: l.created_at,
  jenis_layanan: l.jenisLayanan,
  pemohon: l.user,
  peserta: l.pesertas,
  // ✅ FIX: Use direct field access to get actual DB status instead of default
  pengajuan: l.statusKodePengajuan,
  pelaksanaan: l.statusKodePelaksanaan,
  // ✅ Keep injectStatus for optional relations (MOU, Sertifikat, Laporan)
  mou: injectStatus(l.mou, STATUS.BELUM_TERLAKSANA.nama_status_kode),
  sertifikat: injectStatus(
    l.sertifikat,
    STATUS.BELUM_TERSEDIA.nama_status_kode
  ),
  laporan: injectStatus(l.laporan, STATUS.BELUM_TERSEDIA.nama_status_kode),
  layananRejection: l.layananRejection,
  kegiatan: [
    ...new Map(
      l.konfigurasiLayanan.detailKonfigurasis
        .map((d) => d.kegiatan)
        .map((k) => [k.id, k])
    ).values(),
  ],
});

const buildFilter = (query) => {
  const filterOptions = {
    where: {},
  };

  // Example filtering
  if (query.status) {
    filterOptions.where.status = query.status;
  }

  if (query.ongoing === "true") {
    filterOptions.where.tanggal_selesai = { gte: new Date() };
  }

  // Sorting
  const allowedSortFields = [
    "nama",
    "created_at",
    "tanggal_mulai",
    "tanggal_selesai",
  ];
  if (query.sort_by && allowedSortFields.includes(query.sort_by)) {
    filterOptions.orderBy = {
      [query.sort_by]: query.order === "asc" ? "asc" : "desc",
    };
  } else {
    filterOptions.orderBy = { created_at: "desc" }; // default
  }

  return filterOptions;
};

// FUNGSI HITUNG PESERTA BERDASARKAN JENIS LAYANAN
const hitungPeserta = async (pesertas, rule) => {
  switch (rule.mode) {
    case "single":
      return 1;
    case "zero":
      return 0;
    case "multiple":
      if (!Array.isArray(pesertas)) {
        throw new ApiError(400, "Format peserta tidak valid");
      }
      return pesertas.length;
    default:
      throw new ApiError(500, "Rule peserta tidak dikenali");
  }
};

const injectStatus = (relationData, defaultStatus) => {
  if (!relationData) {
    return { nama_status_kode: defaultStatus };
  }
  return {
    ...relationData,
    nama_status_kode: relationData.status,
  };
};

async function uploadFilesBySchema(schemaFiles, files) {
  const uploaded = {};
  const requiredFiles = schemaFiles.required || [];
  const map = schemaFiles.map || {};

  for (const field of requiredFiles) {
    const fileArr = files[field];
    if (!fileArr || fileArr.length === 0) {
      throw new ApiError(400, `File ${field} wajib diupload.`);
    }
    const file = fileArr[0];

    const upload = await uploadToCloudinary(file.buffer, file.originalname, {
      folder: "layanan",
      mimetype: file.mimetype,
    });

    // nama yang disimpan di DB
    const dbField = map[field] || field;
    uploaded[dbField] = upload.url;
  }

  return uploaded;
}


module.exports = {
  uploadFilesBySchema,
  buildFilter,
  injectStatus,
  formatLayanan,
  hitungPeserta,
};

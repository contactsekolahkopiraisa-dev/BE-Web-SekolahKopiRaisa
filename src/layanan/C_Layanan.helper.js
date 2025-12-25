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
  // // SEMUA WHERE FILTERING DISINI MASIH BELUM DITERAPKAN KARENA BELUM DIMINTA, BISA DITERAPKAN DI DEV SELANJUTNYA
  // const allowedQueryFields = [
  //   "nama_kegiatan",
  //   "created_at",
  //   "tanggal_mulai",
  //   "tanggal_selesai",
  // ];
  // // filtering pakai where status, masih beluym jalan
  // if (query.status) {
  //   filterOptions.where.status = query.status;
  // }

  // if (query.ongoing === "true") {
  //   filterOptions.where.tanggal_selesai = { gte: new Date() };
  // }

  // Sorting
  const allowedSortFields = [
    "nama_kegiatan",
    "created_at",
    "tanggal_mulai",
    "tanggal_selesai",
  ];

  // cari field sorting dari query param

  // mode normal (seperti /api/v1/layanan?orderBy=asc)
  for (const field of allowedSortFields) {
    if (query[field]) {
      const direction = query[field].toLowerCase();
      if (direction === "asc" || direction === "desc") {
        filterOptions.orderBy = { [field]: direction, };
        console.log(query); console.log("FILTER: "); console.log(filterOptions)
        return filterOptions;
      }
    }
  }
  // mode swagger (swagger tidak support langsung sttring '=' sehingga dipisah by dan ordinal nya)
  if (query.orderBy && allowedSortFields.includes(query.orderBy)) {
    filterOptions.orderBy = {
      [query.orderBy]: query.orderOrdinal || "desc",
    };
    console.log(query); console.log("FILTER SWAG: "); console.log(filterOptions)
    return filterOptions;
  }
  // default sorting
  filterOptions.orderBy = { created_at: "desc" };
  console.log(query); console.log("FILTER DEF: "); console.log(filterOptions)
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

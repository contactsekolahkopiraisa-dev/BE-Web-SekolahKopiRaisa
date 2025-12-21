const Joi = require("joi");
const ApiError = require("../utils/apiError");
const { query } = require("express-validator");

// POST AJUKAN LAYANAN
const layananGlobalSchema = Joi.object({
  body: Joi.object({
    id_jenis_layanan: Joi.number().required(),
    instansi_asal: Joi.string().required(),
    tanggal_mulai: Joi.date().required(),
    tanggal_selesai: Joi.date().required(),
  }).custom((value, helpers) => {
    const mulai = new Date(value.tanggal_mulai);
    const selesai = new Date(value.tanggal_selesai);

    if (mulai > selesai) {
      return helpers.error("any.invalid", {
        message: "Tanggal mulai tidak boleh lebih besar dari tanggal selesai.",
      });
    }
    if (mulai.getTime() === selesai.getTime()) {
      return helpers.error("any.invalid", {
        message: "Tanggal mulai dan tanggal selesai tidak boleh sama persis.",
      });
    }
    return value;
  }),
  params: Joi.object({}),
  query: Joi.object({}),
}).messages({
  "any.required": "Field '{{#label}}' wajib diisi.",
  "date.base": "Field '{{#label}}' harus berupa tanggal valid.",
  "any.invalid": "{{#message}}",
});
// PUT ADD LOGBOOK INTO LAYANAN
const uploadLogbookSchema = Joi.object({
  body: Joi.object({
    link_logbook: Joi.string().min(3).required(),
  }),
  params: Joi.object({
    id: Joi.number().required(),
  }),
  query: Joi.object({}), // kosong
});
// PUT REJECT PENGAJUAN LAYANAN
const rejectSchema = Joi.object({
  body: Joi.object({
    alasan: Joi.string().min(3).required(),
  }),
  params: Joi.object({
    id: Joi.number().required(),
  }),
  query: Joi.object({}), // kosong
});
// PUT UPDATE JENIS_LAYANAN
const updateScema = Joi.object({
  body: Joi.object({
    nama_jenis_layanan: Joi.string().trim().min(3),
    deskripsi_singkat: Joi.string().trim().min(3),
    deskripsi_lengkap: Joi.string().trim().min(3),
    estimasi_waktu: Joi.string().trim().min(3),
    id_target_peserta: Joi.number(),
    is_active: Joi.boolean(),
  }).or(
    "nama_jenis_layanan",
    "deskripsi_singkat",
    "deskripsi_lengkap",
    "estimasi_waktu",
    "id_target_peserta",
    "is_active"
  ),
  params: Joi.object({
    id: Joi.number().required(),
  }),
  query: Joi.object({}),
});

// PEMBAGIAN FILE&FIELD MANA YANG WAJIB DAN MANA YANG TIDAK BOLEH
const JENIS_SCHEMA = {
  Magang: {
    fields: {
      required: ["isi_konfigurasi_layanan", "nim", "fakultas", "prodi"],
      forbidden: ["nama_kegiatan", "tempat_kegiatan", "pesertas"],
    },
    files: {
      required: ["file_proposal", "file_surat_pengantar"],
      map: {
        file_proposal: "proposal",
        file_surat_pengantar: "surat_pengantar",
      },
    },
    peserta: { mode: "single" },
  },
  "Praktek Kerja Lapangan (PKL)": {
    fields: {
      required: ["isi_konfigurasi_layanan", "nim", "fakultas", "prodi"],
      forbidden: ["nama_kegiatan", "tempat_kegiatan", "pesertas"],
    },
    files: {
      required: ["file_proposal", "file_surat_pengantar"],
      map: {
        file_proposal: "proposal",
        file_surat_pengantar: "surat_pengantar",
      },
    },
    peserta: { mode: "single" },
  },
  "Undangan Narasumber": {
    fields: {
      required: ["nama_kegiatan", "tempat_kegiatan"],
      forbidden: [],
    },
    files: {
      required: ["file_proposal", "file_surat_undangan"],
      map: {
        file_proposal: "proposal",
        file_surat_undangan: "surat_undangan",
      },
    },
    peserta: { mode: "zero" },
  },
  Pelatihan: {
    fields: {
      required: ["pesertas", "isi_konfigurasi_layanan"],
      forbidden: ["nama_kegiatan", "tempat_kegiatan"],
    },
    files: {
      required: ["file_surat_permohonan"],
      map: {
        file_surat_permohonan: "surat_permohonan",
      },
    },
    peserta: { mode: "multiple" },
  },
  Kunjungan: {
    fields: {
      required: ["pesertas", "isi_konfigurasi_layanan"],
      forbidden: ["nama_kegiatan", "tempat_kegiatan"],
    },
    files: {
      required: ["file_surat_permohonan"],
      map: {
        file_surat_permohonan: "surat_permohonan",
      },
    },
    peserta: { mode: "multiple" },
  },
};

// VALIDASI FIELDS WAJIB DAN DILARANG SESUAI JENIS_LAYANAN
function validateFields(data, rule) {
  const { required = [], forbidden = [] } = rule;
  required.forEach((f) => {
    if (!data[f] || String(data[f]).trim() === "") {
      throw new ApiError(400, `Field "${f}" wajib diisi.`);
    }
  });
  forbidden.forEach((f) => {
    if (data[f] != null && String(data[f]).trim() !== "") {
      throw new ApiError(400, `Field "${f}" TIDAK boleh diisi.`);
    }
  });
}
// VALIDASI FILES YANG AKAN DI UPLOAD
function validateFiles(files, rule) {
  const { required = [] } = rule;
  required.forEach((f) => {
    if (!files[f]) {
      throw new ApiError(400, `File "${f}" wajib diupload.`);
    }
  });
}

// PEMANGGIL SEMUA VALIDASI
async function validateData(data, jenisLayanan, files) {
  const schema = JENIS_SCHEMA[jenisLayanan.nama_jenis_layanan];
  if (!schema) {
    throw new ApiError(
      500,
      `Tidak ada aturan validasi untuk layanan "${jenisLayanan.nama_jenis_layanan}"`
    );
  }

  // Validate required / forbidden fields
  validateFields(data, schema.fields);
  // Validate required files
  validateFiles(files, schema.files);

  return schema;
}

module.exports = {
  validateData,
  JENIS_SCHEMA,
  layananGlobalSchema,
  rejectSchema,
  uploadLogbookSchema,
  updateScema,
};

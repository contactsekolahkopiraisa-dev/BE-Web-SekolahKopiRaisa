const ApiError = require("../utils/apiError.js");
const { jenisLayananRepository } = require("./C_Layanan.repository.js");

const JENIS_SCHEMA = {
    globalRequired: ["id_jenis_layanan", "instansi_asal", "tanggal_mulai", "tanggal_selesai"],
    "Magang": {
        fields: {
            required: ["link_logbook", "isi_konfigurasi_layanan"],
            forbidden: ["nama_kegiatan", "tempat_kegiatan"],
        },
        files: {
            required: ["file_proposal", "file_surat_pengantar"],
            map: {
                file_proposal: "proposal",
                file_surat_pengantar: "surat_pengantar"
            }
        },
        peserta: { mode: "single" },
        logbook: true
    },

    "Praktek Kerja Lapangan (PKL)": {
        fields: {
            required: ["link_logbook", "isi_konfigurasi_layanan"],
            forbidden: ["nama_kegiatan", "tempat_kegiatan"]
        },
        files: {
            required: ["file_proposal", "file_surat_pengantar"],
            map: {
                file_proposal: "proposal",
                file_surat_pengantar: "surat_pengantar"
            }
        },
        peserta: { mode: "single" },
        logbook: true
    },

    "Undangan Narasumber": {
        fields: {
            required: ["nama_kegiatan", "tempat_kegiatan"],
            forbidden: []
        },
        files: {
            required: ["file_surat_undangan"],
            map: {
                file_surat_undangan: "surat_undangan"
            }
        },
        peserta: { mode: "zero" },
        logbook: false
    },

    "Pelatihan": {
        fields: {
            required: ["pesertas", "isi_konfigurasi_layanan"],
            forbidden: ["nama_kegiatan", "tempat_kegiatan"]
        },
        files: {
            required: ["file_surat_permohonan"],
            map: {
                file_surat_permohonan: "surat_permohonan"
            }
        },
        peserta: { mode: "multiple" },
        logbook: false
    },

    "Kunjungan": {
        fields: {
            required: ["pesertas", "isi_konfigurasi_layanan"],
            forbidden: ["nama_kegiatan", "tempat_kegiatan"]
        },
        files: {
            required: ["file_surat_permohonan"],
            map: {
                file_surat_permohonan: "surat_permohonan"
            }
        },
        peserta: { mode: "multiple" },
        logbook: false
    }
};

// VALIDASI FIELDS WAJIB GLOBAL
function validateGlobalFields(data, schema) {
    for (const field of schema.globalRequired) {
        if (!data[field] || data[field] === "") {
            throw new ApiError(400, `Field global "${field}" wajib diisi untuk semua layanan.`);
        }
    }
}
// VALIDASI FIELDS WAJIB DAN DILARANG SESUAI JENIS_LAYANAN
function validateFields(data, fieldsRule) {
    const { required = [], forbidden = [] } = fieldsRule;
    // required
    for (const field of required) {
        if (!data[field] || data[field].trim() === "") { throw new ApiError(400, `Field "${field}" wajib diisi.`); }
    }
    // forbidden
    for (const field of forbidden) {
        if (data[field] != null && String(data[field]).trim() !== "") { throw new ApiError(400, `Field "${field}" TIDAK boleh diisi.`); }
    }
}
// VALIDASI FILES YANG AKAN DI UPLOAD
function validateFiles(files, fileRule) {
    const { required = [] } = fileRule;

    for (const field of required) {
        if (!files[field]) { throw new ApiError(400, `File "${field}" wajib diupload.`); }
    }
}
// VALIDASI APAKAH LOGBOOK DISERTAKAN ATAU TIDAK
function validateLogbookRule(data, schema) {
    if (schema.logbook === true) {
        if (!data.link_logbook || data.link_logbook.trim() === "") { throw new ApiError(400, `Link logbook wajib diisi.`); }
        return data.link_logbook;
    }
    return null; // hapus jika tidak berlaku
}
// VALIDASI WAKTU MULAI DAN SELESAI
function validateWaktu(data) {
    if (!data.tanggal_mulai || !data.tanggal_selesai) {
        throw new ApiError(400, "Tanggal mulai dan tanggal selesai wajib diisi.");
    }
    const tanggalMulai = new Date(data.tanggal_mulai);
    const tanggalSelesai = new Date(data.tanggal_selesai);

    if (isNaN(tanggalMulai.getTime()) || isNaN(tanggalSelesai.getTime())) {
        throw new ApiError(400, "Format tanggal tidak valid.");
    }
    // validasi: tanggal_mulai harus <= tanggal_selesai
    if (tanggalMulai.getTime() > tanggalSelesai.getTime()) {
        throw new ApiError(400, "Tanggal mulai tidak boleh lebih besar dari tanggal selesai.");
    }
    // optional: minimal durasi 1 detik
    if (tanggalMulai.getTime() === tanggalSelesai.getTime()) {
        throw new ApiError(400, "Tanggal mulai dan selesai tidak boleh sama persis");
    }
}
// FUNGSI HITUNG PESERTA BERDASARKAN JENIS LAYANAN
function hitungPeserta(pesertas, rule) {
    switch (rule.mode) {
        case "single":
            return 1;

        case "zero":
            return 0;

        case "multiple":
            if (!Array.isArray(pesertas)) { throw new ApiError(400, "Format peserta tidak valid"); }
            return pesertas.length;

        default:
            throw new ApiError(500, "Rule peserta tidak dikenali");
    }
}

// PEMANGGIL SEMUA VALIDASI
async function validateData(data, jenisLayanan, files) {
    const schema = JENIS_SCHEMA[jenisLayanan.nama_jenis_layanan];
    if (!schema) {
        throw new ApiError(400, `Tidak ada aturan validasi untuk layanan "${jenisLayanan.nama_jenis_layanan}"`);
    }

    const result = {};
    // 1. Validate required / forbidden fields
    validateGlobalFields(data, { globalRequired: JENIS_SCHEMA.globalRequired });
    validateFields(data, schema.fields);
    // 2. Validate required files
    validateFiles(files, schema.files);
    // 3. Validate logbook
    result.link_logbook = validateLogbookRule(data, schema);
    // 4. Validate waktu
    validateWaktu(data);
    // 4. Hitung jumlah peserta
    result.jumlah_peserta = hitungPeserta(data.pesertas, schema.peserta);

    return result;
}



module.exports = {
    validateData,
    JENIS_SCHEMA
};
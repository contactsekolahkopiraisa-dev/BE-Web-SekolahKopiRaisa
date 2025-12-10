const ApiError = require("../utils/apiError.js");
const { uploadToCloudinary } = require("../services/cloudinaryUpload.service.js");
const { sendEmail } = require('../utils/email');
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
    pengajuan: injectStatus(l.pengajuan, STATUS.MENUNGGU_PERSETUJUAN.nama_status_kode),
    pelaksanaan: l.statusKodePelaksanaan,
    mou: injectStatus(l.mou, STATUS.BELUM_TERLAKSANA.nama_status_kode),
    sertifikat: injectStatus(l.sertifikat, STATUS.BELUM_TERSEDIA.nama_status_kode),
    laporan: injectStatus(l.laporan, STATUS.BELUM_TERSEDIA.nama_status_kode),
    kegiatan: [
        ...new Map(
            l.konfigurasiLayanan.detailKonfigurasis
                .map(d => d.kegiatan)
                .map(k => [k.id, k])
        ).values()
    ]
});

const buildFilter = (query) => {
    const filterOptions = {
        where: {}
    };

    // Example filtering
    if (query.status) {
        filterOptions.where.status = query.status;
    }

    if (query.ongoing === 'true') {
        filterOptions.where.tanggal_selesai = { gte: new Date() };
    }

    // Sorting
    const allowedSortFields = ['nama', 'created_at', 'tanggal_mulai', 'tanggal_selesai'];
    if (query.sort_by && allowedSortFields.includes(query.sort_by)) {
        filterOptions.orderBy = {
            [query.sort_by]: query.order === 'asc' ? 'asc' : 'desc'
        };
    } else {
        filterOptions.orderBy = { created_at: 'desc' }; // default
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
            if (!Array.isArray(pesertas)) { throw new ApiError(400, "Format peserta tidak valid"); }
            return pesertas.length;
        default:
            throw new ApiError(500, "Rule peserta tidak dikenali");
    }
}

const injectStatus = (relationData, defaultStatus) => {
    if (!relationData) {
        return { nama_status_kode: defaultStatus };
    }
    return {
        ...relationData,
        nama_status_kode: relationData.status
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
        };
        const file = fileArr[0];

        const upload = await uploadToCloudinary(
            file.buffer,
            file.originalname,
            {
                folder: "layanan",
                mimetype: file.mimetype,
            }
        );

        // nama yang disimpan di DB
        const dbField = map[field] || field;
        uploaded[dbField] = upload.url;
    }

    return uploaded;
}

const formatRangkumanKegiatan = (detailKonfigurasis) => {
    return detailKonfigurasis
        .map((d, i) => {
            return `${i + 1}. ${d.kegiatan.nama_kegiatan} - ${d.subKegiatan.nama_sub_kegiatan}`;
        })
        .join('\n');
};
const sendNotifikasiAdminLayanan = async (emailAdmin, layanan) => {
    if (!emailAdmin) throw new Error("Email admin wajib.");

    const kegiatanList = formatRangkumanKegiatan(
        layanan.konfigurasiLayanan.detailKonfigurasis
    );

    const mail = {
        from: `"Sistem Layanan RAISA" <${process.env.EMAIL_USER || process.env.SMTP_USER}>`,
        to: emailAdmin,
        subject: `Pengajuan Layanan Baru - ${layanan.jenisLayanan.nama_jenis_layanan}`,
        text:
            `Telah masuk pengajuan layanan baru.

=== IDENTITAS PEMOHON ===
Nama     : ${layanan.user.name}
Email    : ${layanan.user.email}
No HP    : ${layanan.user.phone_number}
Instansi : ${layanan.instansi_asal}

=== DETAIL LAYANAN ===
ID Layanan          : ${layanan.id}
Jenis Layanan       : ${layanan.jenisLayanan.nama_jenis_layanan}
Tanggal Mulai       : ${layanan.tanggal_mulai}
Tanggal Selesai     : ${layanan.tanggal_selesai}
Jumlah Peserta      : ${layanan.jumlah_peserta}

=== FILE PERSYARATAN ===
Proposal            : ${layanan.file_proposal || "-"}
Surat Permohonan    : ${layanan.file_surat_permohonan || "-"}
Surat Pengantar     : ${layanan.file_surat_pengantar || "-"}
Surat Undangan      : ${layanan.file_surat_undangan || "-"}

=== KEGIATAN SESUAI KONFIGURASI ===
${kegiatanList}

=== PESERTA (Jika Ada) ===
${layanan.peserta.map(p => `- ${p.nama_peserta} (${p.nim || "NIM tidak ada"})`).join('\n')}

Pengajuan ini sedang menunggu proses persetujuan.
`
    };

    await sendEmail(mail);
};

const sendNotifikasiPengusulLayanan = async (emailPemohon, layanan) => {
    if (!emailPemohon) throw new Error("Email pemohon wajib.");

    const kegiatanList = formatRangkumanKegiatan(
        layanan.konfigurasiLayanan.detailKonfigurasis
    );

    const mail = {
        from: `"Sistem Layanan RAISA" <${process.env.EMAIL_USER || process.env.SMTP_USER}>`,
        to: emailPemohon,
        subject: `Pengajuan Layanan Berhasil - ${layanan.jenisLayanan.nama_jenis_layanan}`,
        text:
            `Pengajuan layanan Anda telah berhasil kami terima.

=== DETAIL PENGAJUAN ===
Jenis Layanan   : ${layanan.jenisLayanan.nama_jenis_layanan}
Tanggal Mulai   : ${layanan.tanggal_mulai}
Tanggal Selesai : ${layanan.tanggal_selesai}
Instansi Asal   : ${layanan.instansi_asal}
Jumlah Peserta  : ${layanan.jumlah_peserta}

=== KEGIATAN YANG AKAN DIJALANKAN ===
${kegiatanList}

=== FILE YANG ANDA KIRIM ===
Proposal            : ${layanan.file_proposal || "-"}
Surat Permohonan    : ${layanan.file_surat_permohonan || "-"}
Surat Pengantar     : ${layanan.file_surat_pengantar || "-"}
Surat Undangan      : ${layanan.file_surat_undangan || "-"}

Terima kasih.
Pengajuan Anda sedang kami proses dan menunggu persetujuan.
`
    };

    await sendEmail(mail);
};





module.exports = {
    uploadFilesBySchema,
    sendNotifikasiAdminLayanan,
    sendNotifikasiPengusulLayanan,
    buildFilter,
    injectStatus,
    formatLayanan,
    hitungPeserta
}
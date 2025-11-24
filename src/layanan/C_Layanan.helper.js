const ApiError = require("../utils/apiError.js");
const { deleteFromCloudinaryByUrl } = require("../services/cloudinaryDelete.service.js");
const { uploadToCloudinary } = require("../services/cloudinaryUpload.service.js");
const { sendEmail } = require('../utils/email');


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
    injectStatus
}
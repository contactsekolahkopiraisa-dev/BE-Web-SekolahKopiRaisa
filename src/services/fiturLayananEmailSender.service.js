// fiturLayananEmailSender.service.js
// INI DIPAKAI UNTUK MENGIRIM EMAIL NOTIF OLEH FITUR LAYANAN

const { sendEmail } = require("../utils/email");
const { STATEMENT_LAYANAN } = require("../utils/constant/enum.js");


// =======================
// FORMATTERS
// =======================

// MENGUBAH JSON KONFIGURASI JADI TEKS READABLE
const formatRangkumanKegiatan = (detailKonfigurasis) => {
    return detailKonfigurasis
        .map((d, i) => {
            return `${i + 1}. ${d.kegiatan.nama_kegiatan} - ${d.subKegiatan.nama_sub_kegiatan
                }`;
        })
        .join("\n");
};
// MENGUBAH JSON PESERTA JADI TEKS READABLE
const formatRangkumanPeserta = (pesertas) => {
    return pesertas
        .map((p, i) => {
            return `${i + 1}. ${p.nama_peserta} (NIM/NISN: ${p.nim || '-'})`;
        })
        .join('\n');
};
// MENGOLAH DILE PERSYARATAN DARI LAYANAN ATAU MOU
const formatFilePersyaratan = (layanan) => {
    const files = [
        { label: "Proposal", value: layanan.file_proposal },
        { label: "Surat Permohonan", value: layanan.file_surat_permohonan },
        { label: "Surat Pengantar", value: layanan.file_surat_pengantar },
        { label: "Surat Undangan", value: layanan.file_surat_undangan },
        { label: "MoU", value: layanan.mou.file_mou },
    ];

    const tersedia = files.filter(f => f.value);

    if (tersedia.length === 0) {
        return "-";
    }

    return tersedia
        .map((f) => `${f.label.padEnd(20)} : ${f.value}`)
        .join("\n");
};

// MENGOLAH ALASAN PENOLAKAN DARI LAYANAN ATAU MOU
const getAlasanPenolakan = (statusKey, layanan) => {
    if (statusKey === STATEMENT_LAYANAN.PENGAJUAN_LAYANAN_DITOLAK.nama_status_kode) {
        const alasan = layanan.layananRejection?.[0]?.alasan;
        return alasan ? `ALASAN : ${alasan}` : "";
    }
    if (statusKey === STATEMENT_LAYANAN.PENGAJUAN_MOU_DITOLAK.nama_status_kode) {
        const alasan = layanan.mou?.mouRejection?.alasan;
        return alasan ? `ALASAN : ${alasan}` : "";
    }
    return "";
};


// =======================
// TEMPLATES PESAN
// =======================

const MESSAGE_MAP = {
    [STATEMENT_LAYANAN.LAYANAN_DIAJUKAN.nama_status_kode]: {
        admin: "Pengajuan layanan baru telah masuk.\nMohon untuk segera dilakukan peninjauan dan tindak lanjut.",
        user: "Pengajuan layanan Anda telah berhasil dikirim dan sedang menunggu proses verifikasi."
    },

    [STATEMENT_LAYANAN.PENGAJUAN_LAYANAN_DISETUJUI.nama_status_kode]: {
        admin: ({ isButuhMOU }) =>
            isButuhMOU
                ? "Pengajuan layanan Anda telah disetujui.\nSilakan melanjutkan ke tahap administrasi dan pengajuan MOU."
                : "Pengajuan layanan Anda telah disetujui.\nSilakan menunggu pelaksanaan kegiatan."
    },

    [STATEMENT_LAYANAN.PENGAJUAN_LAYANAN_DITOLAK.nama_status_kode]: {
        admin: "Pengajuan layanan Anda ditolak.\nSilakan ajukan kembali layanan dengan perbaikan data sesuai catatan yang diberikan."
    },

    [STATEMENT_LAYANAN.MOU_DIAJUKAN.nama_status_kode]: {
        admin: "Pengajuan MOU telah diajukan.\nMohon untuk segera dilakukan pemeriksaan dan tindak lanjut.",
        user: "Pengajuan MOU Anda telah berhasil dikirim dan sedang dalam proses peninjauan."
    },

    [STATEMENT_LAYANAN.REVISI_MOU_DIAJUKAN.nama_status_kode]: {
        admin: "Revisi dokumen MOU telah diajukan.\nMohon untuk segera dilakukan peninjauan ulang.",
        user: "Revisi dokumen MOU Anda telah berhasil diajukan dan sedang dalam proses peninjauan."
    },

    [STATEMENT_LAYANAN.PENGAJUAN_MOU_DISETUJUI.nama_status_kode]: {
        user: "Pengajuan MOU Anda telah disetujui.\nKegiatan dapat dilanjutkan ke tahap pelaksanaan."
    },

    [STATEMENT_LAYANAN.PENGAJUAN_MOU_DITOLAK.nama_status_kode]: {
        user: "Pengajuan MOU Anda ditolak.\nSilakan lakukan perbaikan dokumen MOU dan ajukan kembali."
    },
    [STATEMENT_LAYANAN.PELAKSANAAN_SELESAI.nama_status_kode]: {
        admin: "Salah satu pelaksanaan layanan telah selesai. \nMenunggu pengguna menyelesaikan laporan kegiatan untuk P4S.",
        user: "Pelaksanaan layanan telah selesai. \nSegera selesaikan laporan kegiatan pada menu anda."
    },

    [STATEMENT_LAYANAN.LAPORAN_DISERAHKAN.nama_status_kode]: {
        admin: "Laporan kegiatan telah diserahkan.\nMohon untuk menindaklanjuti proses pembuatan dan penerbitan sertifikat.",
        // user: "Laporan kegiatan Anda telah berhasil diserahkan.\nLaporan akan segera diproses oleh admin. Terima kasih."
    },

    [STATEMENT_LAYANAN.SERTIFIKAT_DIKIRIM.nama_status_kode]: {
        admin: "Sertifikat kegiatan Anda telah berhasil dikirim.\nSilakan periksa sertifikat yang telah dikirimkan.\nTerima kasih atas partisipasi Anda."
    }
};

// =======================
// MAIN FUNCTION
// =======================

// KIRIM PESAN NOTIF VIA EMAIL
const sendEmailLayananNotif = async (sender, isToAdmin, emailReceivers, layanan, tahapan) => {
    // kembalikan kalau tidak lengkap
    if (!sender || !emailReceivers || !layanan || !tahapan) {
        throw Error("Data untuk sendEmailMessage() harus lengkap!");
    }
    if (!Array.isArray(emailReceivers) || emailReceivers.length === 0) {
        throw Error("Email receiver harus berupa string[]");
    }

    const statusKey = tahapan.nama_status_kode;
    const jenisLayanan = layanan.jenisLayanan.nama_jenis_layanan;

    const isButuhMOU = ["Magang", "Praktek Kerja Lapangan (PKL)", "Pelatihan"].includes(jenisLayanan);

    const template = MESSAGE_MAP[statusKey];
    if (!template) {
        throw new Error(`Template pesan untuk status "${statusKey}" belum tersedia`);
    }

    const roleKey = isToAdmin ? "admin" : "user";

    let headline = template[roleKey];

    if (!headline) {
        throw new Error(`Template ${roleKey} untuk status "${statusKey}" tidak tersedia`);
    }

    if (typeof headline === "function") {
        headline = headline({ isButuhMOU });
    }

    // =======================
    // BODY EMAIL
    // =======================




    // // formatting tahapan
    // const judulTahapan = tahapan.nama_status_kode.toUpperCase();
    // // fromatting jenis layanan
    // const judulJenisLayanan = layanan.jenisLayanan.nama_jenis_layanan.toUpperCase();
    // // formatting list kegiatan
    const kegiatanList = formatRangkumanKegiatan(layanan.konfigurasiLayanan?.detailKonfigurasis);
    // // formatting peserta (saat ini belum dipakai optimal, dilanjutkan dev selanjutnya)
    const pesertaList = formatRangkumanPeserta(layanan.pesertas ? layanan.pesertas : '-')




    const alasanPenolakan = getAlasanPenolakan(statusKey, layanan);

    // const alasanPenolakan =
    //     statusKey === STATEMENT_LAYANAN.PENGAJUAN_LAYANAN_DITOLAK.nama_status_kode
    //         ? `ALASAN : ${layanan.layananRejection?.[0] ? alasan || "-"}`
    //         : statusKey === STATEMENT_LAYANAN.PENGAJUAN_MOU_DITOLAK.nama_status_kode
    //             ? `ALASAN : ${layanan.mou?.mouRejection?.alasan || "-"}`
    //             : "";




    // // formatting headline pesan
    // let headline = "[P] PEMBERITAHUAN STATUS LAYANAN"; // PLACEHOLDER DEFAULT
    // if (judulTahapan === STATEMENT_LAYANAN.LAYANAN_DIAJUKAN.nama_status_kode.toUpperCase()) { // all
    //     headline = isToAdmin ?
    //         "Pengajuan layanan baru telah masuk. Mohon untuk segera dilakukan peninjauan dan tindak lanjut."
    //         : "Pengajuan layanan Anda telah berhasil dikirim dan sedang menunggu proses verifikasi.";
    // } else if (judulTahapan === STATEMENT_LAYANAN.PENGAJUAN_LAYANAN_DISETUJUI.nama_status_kode.toUpperCase()) { // cust
    //     headline = isButuhMOU
    //         ? "Pengajuan layanan Anda telah disetujui. \nSilakan melanjutkan ke tahap administrasi dan pengajuan MOU."
    //         : "Pengajuan layanan Anda telah disetujui. \nSilakan menunggu informasi pelaksanaan kegiatan."
    //         ;
    // } else if (judulTahapan === STATEMENT_LAYANAN.PENGAJUAN_LAYANAN_DITOLAK.nama_status_kode.toUpperCase()) { // cust
    //     headline = "Pengajuan layanan Anda ditolak. \nSilakan ajukan kembali layanan dengan perbaikan data sesuai catatan yang diberikan.";
    // } else if (judulTahapan === STATEMENT_LAYANAN.LAPORAN_DISERAHKAN.nama_status_kode.toUpperCase()) { // all
    //     headline = isToAdmin ?
    //         "Laporan kegiatan telah diserahkan. \nMohon untuk menindaklanjuti proses pembuatan dan penerbitan sertifikat."
    //         : "Laporan kegiatan Anda telah berhasil diserahkan. \nLaporan akan segera diproses oleh admin. Terima kasih.";
    // } else if (judulTahapan === STATEMENT_LAYANAN.MOU_DIAJUKAN.nama_status_kode.toUpperCase()) { // all
    //     headline = isToAdmin ?
    //         "Pengajuan MOU telah diajukan. \nMohon untuk segera dilakukan pemeriksaan dan tindak lanjut."
    //         : "Pengajuan MOU Anda telah berhasil dikirim dan sedang dalam proses peninjauan.";
    // } else if (judulTahapan === STATEMENT_LAYANAN.PENGAJUAN_MOU_DISETUJUI.nama_status_kode.toUpperCase()) { // cust
    //     headline = "Pengajuan MOU Anda telah disetujui. \nKegiatan dapat dilanjutkan ke tahap pelaksanaan.";
    // } else if (judulTahapan === STATEMENT_LAYANAN.PENGAJUAN_MOU_DITOLAK.nama_status_kode.toUpperCase()) { // cust
    //     headline = "Pengajuan MOU Anda ditolak. \nSilakan lakukan perbaikan dokumen MOU dan ajukan kembali.";
    // } else if (judulTahapan === STATEMENT_LAYANAN.REVISI_MOU_DIAJUKAN.nama_status_kode.toUpperCase()) { // all
    //     headline = isToAdmin ?
    //         "Revisi dokumen MOU telah diajukan. \nMohon untuk segera dilakukan peninjauan ulang."
    //         : "Revisi dokumen MOU Anda telah berhasil diajukan dan sedang dalam proses peninjauan.";
    // } else if (judulTahapan === STATEMENT_LAYANAN.SERTIFIKAT_DIKIRIM.nama_status_kode.toUpperCase()) { // cust
    //     headline = "Sertifikat kegiatan Anda telah berhasil dikirim. \nSilakan periksa sertifikat yang telah dikirimkan sesuai dengan ketentuan yang berlaku. \nTerima kasih atas partisipasi Anda."
    // } else { throw Error("Tahapan anda tidak ditemukan") };



    // formatting text
    //     const textPesan = `
    //   ${judulTahapan} - ${headline}

    //   ${(judulTahapan === STATEMENT_LAYANAN.PENGAJUAN_LAYANAN_DITOLAK.nama_status_kode.toUpperCase()) ?
    //             `ALASAN : ${layanan.layananRejection.alasan}`
    //             : (judulTahapan === STATEMENT_LAYANAN.PENGAJUAN_MOU_DITOLAK.nama_status_kode.toUpperCase()) ?
    //                 `ALASAN : ${layanan.mou.mouRejection.alasan}` : ``
    //         }

    //   === IDENTITAS PEMOHON ===
    //   Nama     : ${layanan.user.name}
    //   Email    : ${layanan.user.email}
    //   No HP    : ${layanan.user.phone_number}
    //   Instansi : ${layanan.instansi_asal}

    //   === DETAIL LAYANAN ===
    //   ID Layanan          : ${layanan.id}
    //   Jenis Layanan       : ${layanan.jenisLayanan.nama_jenis_layanan}
    //   Tanggal Mulai       : ${new Date(layanan.tanggal_mulai).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
    //   Tanggal Selesai     : ${new Date(layanan.tanggal_selesai).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
    //   Jumlah Peserta      : ${layanan.jumlah_peserta}

    //   === FILE PERSYARATAN ===
    //   Proposal            : ${layanan.file_proposal || "-"}
    //   Surat Permohonan    : ${layanan.file_surat_permohonan || "-"}
    //   Surat Pengantar     : ${layanan.file_surat_pengantar || "-"}
    //   Surat Undangan      : ${layanan.file_surat_undangan || "-"}

    //   === KEGIATAN SESUAI KONFIGURASI ===
    //   ${kegiatanList}

    //   === PESERTA (Jika Ada) ===
    //   ${pesertaList}

    //   `;



    const textPesan = `
${statusKey.toUpperCase()} - ${headline}
${alasanPenolakan ? "\n" + alasanPenolakan : ""}

=== IDENTITAS PEMOHON ===
Nama     : ${layanan.user.name}
Email    : ${layanan.user.email}
No HP    : ${layanan.user.phone_number}
Instansi : ${layanan.instansi_asal}

=== DETAIL LAYANAN ===
ID Layanan      : ${layanan.id}
Jenis Layanan   : ${jenisLayanan}
Tanggal Mulai   : ${new Date(layanan.tanggal_mulai).toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
Tanggal Selesai : ${new Date(layanan.tanggal_selesai).toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
Jumlah Peserta  : ${layanan.jumlah_peserta}

=== FILE PERSYARATAN ===
${formatFilePersyaratan(layanan)}

=== KEGIATAN ===
${kegiatanList || "-"}

${!isToAdmin ? `=== PESERTA ===\n${pesertaList || "-"}` : ""}
`;

    // formatting html, masi enunggu kdingan frontend
    const htmlPesan = undefined;

    // =======================
    // SEND EMAIL
    // =======================

    // kalau targetnya banyak maka sistem kirim ke semua admin receiver biar semua admin tahu
    // kalau targetnya satu maka sistem cukup kirim ke customer yang bersangkutan
    const mail = {
        from: `"Sistem Layanan RAISA" <${process.env.EMAIL_USER || process.env.SMTP_USER}>`,
        to: emailReceivers,
        subject: `NOTIFIKASI LAYANAN - ${jenisLayanan.toUpperCase()} - ${statusKey}`,
        text: textPesan,
        html: htmlPesan
    };
    const terkirim = await sendEmail(mail);
    return await sendEmail(mail);
}

module.exports = {
    sendEmailLayananNotif
}
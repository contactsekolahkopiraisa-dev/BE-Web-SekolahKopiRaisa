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
        { label: "MoU", value: layanan.mou?.file_mou },
        { label: "File Sertifikat", value: layanan.sertifikat?.file_sertifikat },
        { label: "Link Sertifikat", value: layanan.sertifikat?.link_sertifikat },
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
        user: "Sertifikat kegiatan Anda telah berhasil dikirim.\nSilakan periksa sertifikat yang telah dikirimkan di website kami.\nTerima kasih atas partisipasi Anda."
    }
};
// membangun html template
const buildHtmlEmail = ({
    judulTahapan,
    headline,
    alasanPenolakan,
    layanan,
    kegiatanList,
    pesertaList,
    filePersyaratan
}) => {
    return `<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#f5f1ed;font-family:Arial,sans-serif;color:#3e2f24;">

<table width="100%" cellpadding="0" cellspacing="0" style="padding:30px 0;">
<tr>
<td align="center">

<table width="680" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;overflow:hidden;">
    
    <!-- HEADER -->
    <tr>
        <td style="background:#6f4e37;color:#ffffff;padding:20px;text-align:center;font-weight:bold;">
            NOTIFIKASI STATUS LAYANAN
        </td>
    </tr>

    <!-- BODY -->
    <tr>
        <td style="padding:28px;font-size:14px;line-height:1.6;">

            <div style="display:inline-block;background:#d7b899;padding:6px 14px;border-radius:20px;font-size:12px;font-weight:bold;margin-bottom:12px;">
                ${judulTahapan}
            </div>

            <div style="font-size:16px;font-weight:bold;margin:12px 0;color:#5a3e2b;">
                ${headline}
            </div>

            ${alasanPenolakan ? `
                <h3 style="border-bottom:2px solid #e6d5c3;">Alasan Penolakan</h3>
                <div style="background:#f8f4f0;padding:12px;border-radius:6px;">
                    ${alasanPenolakan}
                </div>
            ` : ""}

            <h3 style="border-bottom:2px solid #e6d5c3;">Identitas Pemohon</h3>
            <table width="100%">
                <tr><td width="170"><b>Nama</b></td><td>: ${layanan.user.name}</td></tr>
                <tr><td><b>Email</b></td><td>: ${layanan.user.email}</td></tr>
                <tr><td><b>No HP</b></td><td>: ${layanan.user.phone_number}</td></tr>
                <tr><td><b>Instansi</b></td><td>: ${layanan.instansi_asal}</td></tr>
            </table>

            <h3 style="border-bottom:2px solid #e6d5c3;">Detail Layanan</h3>
            <table width="100%">
                <tr><td width="170"><b>ID Layanan</b></td><td>: ${layanan.id}</td></tr>
                <tr><td><b>Jenis Layanan</b></td><td>: ${layanan.jenisLayanan.nama_jenis_layanan}</td></tr>
                <tr><td><b>Tanggal Mulai</b></td><td>: ${new Date(layanan.tanggal_mulai).toLocaleDateString("id-ID")}</td></tr>
                <tr><td><b>Tanggal Selesai</b></td><td>: ${new Date(layanan.tanggal_selesai).toLocaleDateString("id-ID")}</td></tr>
                <tr><td><b>Jumlah Peserta</b></td><td>: ${layanan.jumlah_peserta}</td></tr>
            </table>

            <h3 style="border-bottom:2px solid #e6d5c3;">File Persyaratan</h3>
            <div style="background:#f8f4f0;padding:12px;border-radius:6px;">
                <span style="white-space:pre-line;">&#8203;${filePersyaratan}</span>
            </div>

            <h3 style="border-bottom:2px solid #e6d5c3;">Kegiatan</h3>
            <div style="background:#f8f4f0;padding:12px;border-radius:6px;">
                <span style="white-space:pre-line;">&#8203;${kegiatanList || "-"}</span>
            </div>

        </td>
    </tr>

    <!-- FOOTER -->
    <tr>
        <td style="background:#f0e6dc;text-align:center;padding:16px;font-size:12px;">
            Email ini dikirim otomatis oleh sistem.
        </td>
    </tr>

</table>

</td>
</tr>
</table>

</body>
</html>`;
};


            // ${pesertaList
            // ? `
            //         <h3 style="border-bottom:2px solid #e6d5c3;">Peserta</h3>
            //         <div style="background:#f8f4f0;padding:12px;border-radius:6px;white-space:pre-line;">
            //             ${pesertaList}
            //         </div>
            //         `
            // : ""
                    // }


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

    // formatting list kegiatan
    const kegiatanList = formatRangkumanKegiatan(layanan.konfigurasiLayanan?.detailKonfigurasis);
    // formatting peserta (saat ini belum dipakai optimal, dilanjutkan dev selanjutnya)
    const pesertaList = formatRangkumanPeserta(layanan.pesertas ? layanan.pesertas : '-')
    // formatting alasan
    const alasanPenolakan = getAlasanPenolakan(statusKey, layanan);

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


`;

    // ${!isToAdmin ? `=== PESERTA ===\n${pesertaList || "-"}` : ""}

    // formatting html
    const htmlPesan = buildHtmlEmail({
        judulTahapan: statusKey,
        headline,
        alasanPenolakan,
        layanan,
        kegiatanList,
        pesertaList,
        filePersyaratan: formatFilePersyaratan(layanan)
    });


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
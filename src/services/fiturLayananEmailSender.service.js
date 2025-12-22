// INI DIPAKAI UNTUK MENGIRIM EMAIL NOTIF OLEH FITUR LAYANAN

const { sendEmail } = require("../utils/email");
const { STATEMENT_LAYANAN } = require("../utils/constant/enum.js");


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
            return `${i + 1}. ${p.nama_peserta} (${p.nim || 'NIM tidak ada'})`;
        })
        .join('\n');
};


// KIRIM PESAN NOTIF VIA EMAIL
const sendEmailLayananNotif = async (sender, isToAdmin, emailReceivers, layanan, tahapan) => {
    // kembalikan kalau tidak lengkap
    if (!sender || !emailReceivers || !layanan || !tahapan) {
        throw Error("Data untuk sendEmailMessage() harus lengkap!");
    }
    if (!Array.isArray(emailReceivers) || emailReceivers.length === 0) {
        throw Error("Email receiver harus berupa string[]");
    }
    // formatting tahapan
    const judulTahapan = tahapan.nama_status_kode.toUpperCase();
    // fromatting jenis layanan
    const judulJenisLayanan = layanan.jenisLayanan.nama_jenis_layanan.toUpperCase();
    // formatting list kegiatan
    const kegiatanList = formatRangkumanKegiatan(layanan.konfigurasiLayanan.detailKonfigurasis);
    // formatting peserta (saat ini belum dipakai optimal, dilanjutkan dev selanjutnya)
    const pesertaList = formatRangkumanPeserta(layanan.pesertas)
    // formatting headline pesan
    let headline = "[P] PEMBERITAHUAN STATUS LAYANAN"; // PLACEHOLDER DEFAULT
    if (judulTahapan === STATEMENT_LAYANAN.LAYANAN_DIAJUKAN.nama_status_kode.toUpperCase()) { // all
        headline = isToAdmin ?
            "PENGAJUAN INI MOHON UNTUK DAPAT ANDA LAKUKAN TINDAK LANJUT"
            : "PENGAJUAN ANDA SEDANG DIAJUKAN";
    } else if (judulTahapan === STATEMENT_LAYANAN.PENGAJUAN_LAYANAN_DISETUJUI.nama_status_kode.toUpperCase()) { // cust
        headline = "PENGAJUAN ANDA TELAH DISETUJUI. SILAHKAN MELANJUTKAN ADMINISTRASI";
    } else if (judulTahapan === STATEMENT_LAYANAN.PENGAJUAN_LAYANAN_DITOLAK.nama_status_kode.toUpperCase()) { // cust
        headline = "PENGAJUAN ANDA DITOLAK. SILAHKAN AJUKAN LAYANAN BARU DENGAN DATA YANG DIPERBAIKI";
    } else if (judulTahapan === STATEMENT_LAYANAN.PELAKSANAAN_SELESAI.nama_status_kode.toUpperCase()) { // all
        headline = isToAdmin ?
            "PELAKSANAAN TELAH DISELESAIKAN, MOHON SEGERA MENGURUS SERTIFIKAT"
            : "PELAKSANAAN TELAH DISELESAIKAN";
    } else if (judulTahapan === STATEMENT_LAYANAN.MOU_DIAJUKAN.nama_status_kode.toUpperCase()) { // all
        headline = isToAdmin ?
            "PENGAJUAN MOU INI MOHON UNTUK DAPAT ANDA LAKUKAN TINDAK LANJUT"
            : "PENGAJUAN MOU ANDA SEDANG DIAJUKAN";
    } else if (judulTahapan === STATEMENT_LAYANAN.PENGAJUAN_MOU_DISETUJUI.nama_status_kode.toUpperCase()) { // cust
        headline = "PENGAJUAN MOU ANDA TELAH DISETUJUI. SELAMAT MELAKUKAN AKTIVITAS!";
    } else if (judulTahapan === STATEMENT_LAYANAN.PENGAJUAN_MOU_DITOLAK.nama_status_kode.toUpperCase()) { // cust
        headline = "PENGAJUAN MOU ANDA DITOLAK. SILAHKAN PERBAIKI MOU DAN SUBMIT ULANG";
    } else if (judulTahapan === STATEMENT_LAYANAN.REVISI_MOU_DIAJUKAN.nama_status_kode.toUpperCase()) { // all
        headline = isToAdmin ?
            "PENGAJUAN REVISI MOU INI MOHON UNTUK DAPAT ANDA LAKUKAN TINDAK LANJUT"
            : "PENGAJUAN REVISI MOU ANDA SEDANG DIAJUKAN";
    }

    // formatting text
    const textPesan = `
  ${judulTahapan} - ${headline}
  
  ${layanan.layananRejection ?
            `ALASAN : ${layanan.layananRejection.alasan}`
            : layanan.mou ?
                mouRejection ?
                    `ALASAN : ${layanan.mou.mouRejection.alasan}`
                    : ``
                : ``}

  === IDENTITAS PEMOHON ===
  Nama     : ${layanan.user.name}
  Email    : ${layanan.user.email}
  No HP    : ${layanan.user.phone_number}
  Instansi : ${layanan.instansi_asal}
  
  === DETAIL LAYANAN ===
  ID Layanan          : ${layanan.id}
  Jenis Layanan       : ${layanan.jenisLayanan.nama_jenis_layanan}
  Tanggal Mulai       : ${new Date(layanan.tanggal_mulai).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
  Tanggal Selesai     : ${new Date(layanan.tanggal_selesai).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
  Jumlah Peserta      : ${layanan.jumlah_peserta}
  
  === FILE PERSYARATAN ===
  Proposal            : ${layanan.file_proposal || "-"}
  Surat Permohonan    : ${layanan.file_surat_permohonan || "-"}
  Surat Pengantar     : ${layanan.file_surat_pengantar || "-"}
  Surat Undangan      : ${layanan.file_surat_undangan || "-"}
  
  === KEGIATAN SESUAI KONFIGURASI ===
  ${kegiatanList}
  
  === PESERTA (Jika Ada) ===
  ${pesertaList}
  
  `;

    // formatting html, masi enunggu kdingan frontend
    const htmlPesan = undefined;

    // kalau targetnya banyak maka sistem kirim ke semua admin receiver biar semua admin tahu
    // kalau targetnya satu maka sistem cukup kirim ke customer yang bersangkutan
    const results = [];
    // for (const emailReceiver of emailReceivers) {
    const mail = {
        from: `"Sistem Layanan RAISA" <${process.env.EMAIL_USER || process.env.SMTP_USER}>`,
        to: emailReceivers,
        subject: `NOTIFIKASI LAYANAN - ${judulJenisLayanan} - ${judulTahapan}`,
        text: textPesan,
        html: htmlPesan
    };
    const terkirim = await sendEmail(mail);
    // debug
    console.log(terkirim);
    results.push(terkirim);

    return results;
}

module.exports = {
    sendEmailLayananNotif
}
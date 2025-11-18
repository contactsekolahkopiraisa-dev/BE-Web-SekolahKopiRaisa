const ApiError = require("../utils/apiError.js");
const { deleteFromCloudinaryByUrl } = require("../services/cloudinaryDelete.service.js");
const { uploadToCloudinary } = require("../services/cloudinaryUpload.service.js");
const { layananRepository, jenisLayananRepository, targetPesertaRepository, statusKodeRepository, konfigurasiLayananRepository, pesertaRepository, subKegiatanRepository, layananRejectionRepository } = require("./C_Layanan.repository.js");
const { sanitizeData } = require("../utils/sanitizeData.js");
const { JENIS_SCHEMA, validateData } = require("./C_Layanan.validate.js");
const { uploadFilesBySchema, sendNotifikasiAdminLayanan, sendNotifikasiPengusulLayanan } = require("./C_Layanan.helper.js");
const crypto = require('crypto');
const dotenv = require("dotenv");
dotenv.config();

const statusKodeService = {
    // GET ALL KODE STATUS
    async getAll() {
        const statusKodes = await statusKodeRepository.findAll();
        if (!statusKodes || statusKodes.length === 0) {
            throw new ApiError(404, 'Data-data status tidak ditemukan!');
        }
        return statusKodes;
    },
    // GET KODE STATUS BY ID
    async getById(id) {
        const statusKode = await statusKodeRepository.findById(id);
        if (!statusKode) {
            throw new ApiError(404, 'Data status tidak ditemukan!');
        }
        return statusKode;
    },
}

const jenisLayananService = {
    // GET ALL JENIS LAYANAN
    async getAll() {
        const jenisLayanans = await jenisLayananRepository.findAll();
        if (!jenisLayanans || jenisLayanans.length === 0) {
            throw new ApiError(404, 'Data jenis layanan tidak ditemukan!');
        }
        return jenisLayanans;
    },
    // GET JENIS LAYANAN BY ID
    async getById(id) {
        const jenisLayanan = await jenisLayananRepository.findById(id);
        if (!jenisLayanan) {
            throw new ApiError(404, 'Data jenis layanan tidak ditemukan!');
        }
        return jenisLayanan;
    },
    // PUT JENIS LAYANAN BY ID
    async update(id, dataRaw, file) {
        // cari data itu ada tidak, reuse kode this.getById()
        const existingJenisLayanan = await this.getById(id);
        const existingTargetPeserta = await targetPesertaService.getById(dataRaw.id_target_peserta);
        // kalo g ada kembalikan 404
        if (!existingJenisLayanan || !existingTargetPeserta) throw new ApiError(404, 'Data jenis layanan / target peserta tidak ditemukan!');
        // hapus id biar id nya g diupdate
        delete dataRaw.id;
        // bersihkan data : konvert integer
        const data = sanitizeData(dataRaw);
        // hapus file img kalo ada
        if (file) {
            if (existingJenisLayanan.image) { await deleteFromCloudinaryByUrl(existingJenisLayanan.image, 'jenis-layanan') }
            // upload img baru
            const uploaded = await uploadToCloudinary(file.buffer, file.originalname, {
                folder: 'jenis-layanan',
                type: 'image'
            });
            data.image = uploaded.url;
        }
        // lempar ke repo
        const updated = await jenisLayananRepository.update(id, data);
        return updated;
    }
}

const targetPesertaService = {
    // GET ALL TARGET PESERTA
    async getAll() {
        const targetPesertas = await targetPesertaRepository.findAll();
        if (!targetPesertas || targetPesertas.length === 0) {
            throw new ApiError(404, 'Data target peserta tidak ditemukan!');
        }
        return targetPesertas;
    },
    // GET TARGET PESERTA BY ID
    async getById(id) {
        const targetPeserta = await targetPesertaRepository.findById(id);
        if (!targetPeserta) {
            throw new ApiError(404, 'Data target peserta tidak ditemukan!');
        }
        return targetPeserta;
    },
}

const konfigurasiLayananService = {
    async getByHashAndJenis(hash, idJenis) {
        return await konfigurasiLayananRepository.findByHashAndJenis(hash, idJenis);
    },
    async generateKonfigurasiHash(list) {
        const sorted = list
            .map(item => ({
                id_kegiatan: item.id_kegiatan,
                id_sub_kegiatan: [...item.id_sub_kegiatan].sort()
            }))
            .sort((a, b) => a.id_kegiatan - b.id_kegiatan);

        const asString = JSON.stringify(sorted);
        return crypto.createHash("sha256").update(asString).digest("hex");
    },
    async resolveKegiatanDenganSub(idJenisLayanan, konfigurasiInput) {
        const result = [];

        const kegiatanIds = konfigurasiInput[0]?.id_kegiatan;
        if (!Array.isArray(kegiatanIds)) { throw new ApiError(400, "Format id_kegiatan tidak valid."); }

        for (const kegiatanId of kegiatanIds) {
            // ambil subkegiatan yang aktif untuk jenis layanan tertentu
            const subKegiatan = await subKegiatanRepository.findActiveSubKegiatanByJenisLayanan(
                kegiatanId,
                idJenisLayanan
            );
            result.push({
                id_kegiatan: kegiatanId,
                id_sub_kegiatan: subKegiatan.map(s => s.id)
            });
        }

        return result;
    },
    async create(idJenisLayanan, hash, isiKonfigurasiLayanan) {
        // const hash = this.generateKonfigurasiHash(isiKonfigurasiLayanan);
        const existing = await konfigurasiLayananRepository.findByHashAndJenis(hash, idJenisLayanan);
        if (existing) {
            console.log("[ konfigurasiLayananService.create ] Konfigurasi sudah ada, batal membuat konfigurasi, lalu memakai konfigurasi lama...")
            return existing;
        }
        const created = await konfigurasiLayananRepository.create(idJenisLayanan, hash, false, isiKonfigurasiLayanan);
        console.log("[ konfigurasiLayananService.create ] Konfigurasi baru dibuat...")
        return created;
    },
}

const pesertaService = {
    // async hitungJumlahPeserta(jenis, payloadPeserta) {
    //     const jenisNama = jenis.nama_jenis_layanan;
    //     // jenis_layanan tidak ada
    //     if (!jenisNama) { throw new ApiError(500, "Jenis layanan tidak valid pada penghitung jumlah peserta."); }
    //     // UNDANGAN NARASUMBER → 0
    //     if (jenisNama.includes("Undangan Narasumber")) { return 0; }
    //     // MAGANG / PKL → 1
    //     if (jenisNama.includes("Magang") || jenisNama.includes("Praktek Kerja Lapangan (PKL)")) { return 1; }
    //     // PELATIHAN / KUNJUNGAN → banyak peserta
    //     if (Array.isArray(payloadPeserta.peserta)) { return payloadPeserta.peserta.length; }
    //     // Default
    //     return 0;
    // },
    async create(layanan, jenis, payloadPeserta, user) {
        const jenisNama = jenis.nama_jenis_layanan;
        // Jika jenis_layanan tidak ada
        if (!jenis || !jenisNama) { new ApiError(500, "Jenis layanan tidak valid pada handlePeserta"); }
        // 1. UNDANGAN NARASUMBER = TIDAK ADA PESERTA
        if (jenisNama.includes("Undangan Narasumber")) {
            console.log("[pesertaService.handlePeserta] Tidak membuat peserta (undangan narasumber)");
            return [];
        }
        // 2. MAGANG / PKL = 1 peserta otomatis dari user login
        if (jenisNama.includes("Magang") || jenisNama.includes("Praktek Kerja Lapangan (PKL)")) {
            const data = {
                id_layanan: layanan.id,
                nama_peserta: user.name,
                instansi_asal: layanan.instansi_asal,
                fakultas: payloadPeserta.fakultas,
                program_studi: payloadPeserta.prodi,
                nim: payloadPeserta.nim
            };
            console.log("[pesertaService.handlePeserta] Membuat peserta untuk PKL/Magang");
            const saved = await pesertaRepository.create(data);
            return [saved];
        }
        // 3. PELATIHAN / KUNJUNGAN = banyak peserta
        if (Array.isArray(payloadPeserta.pesertas) && payloadPeserta.pesertas.length > 0) {
            const list = payloadPeserta.pesertas.map(item => ({
                id_layanan: layanan.id,
                nama_peserta: item.nama,
                instansi_asal: layanan.instansi_asal,
                fakultas: null,
                program_studi: null,
                nim: null
            }));
            console.log("[pesertaService.handlePeserta] Bulk insert peserta =", list.length);
            const saved = await pesertaRepository.createMany(list);
            return [saved];
        }
        // DEFAULT
        return [];
    }
}

const layananService = {
    async getAll() { },
    async getById() { },
    async getByUserId() { },
    async create(payloadRaw, files, userRaw) {
        // formatting
        const payload = sanitizeData(payloadRaw);
        const user = sanitizeData(userRaw);
        // konvert json
        let konfigurasiInput = JSON.parse(payload.isi_konfigurasi_layanan);
        payload.pesertas = payload.pesertas ? JSON.parse(payload.pesertas) : [];

        // LOGIC BAGIAN JENIS LAYANAN : pengecekan apakah jenis layanannya ada
        const jenisLayanan = await jenisLayananRepository.findById(payload.id_jenis_layanan);
        if (!jenisLayanan) { throw new ApiError(404, "jenis layanan aktif tidak ditemukan!"); }

        // LOGIC MAGANG/PKL : kalau dia masih ada magang/pkl ongoing dia tidak bisa mengajukan
        const jenisMagangPKL = ['Magang', 'Praktek Kerja Lapangan (PKL)'];
        if (jenisMagangPKL.includes(jenisLayanan.nama_jenis_layanan)) {
            const ongoing = await layananRepository.findOngoingByUserAndJenis(user.id, jenisMagangPKL);
            if (ongoing.length > 0) {
                throw new ApiError(400, "Tidak bisa mengajukan layanan! Masih ada magang/PKL yang sedang berlangsung atau akan datang.");
            }
        }

        // VALIDATE SEMUA DATA
        const hasilValidasi = await validateData(payload, jenisLayanan, files);

        // keluarkan hasil dari validasi
        payload.link_logbook = hasilValidasi.link_logbook;
        payload.jumlah_peserta = hasilValidasi.jumlah_peserta;

        // SETTING STATUS
        const STATUS_PENDING_PENGAJUAN = await statusKodeRepository.findByName('Menunggu Persetujuan');
        const STATUS_PENDING_PELAKSANAAN = await statusKodeRepository.findByName('Menunggu Persetujuan');
        if (!STATUS_PENDING_PENGAJUAN || !STATUS_PENDING_PELAKSANAAN) {
            throw new ApiError(500, "Status kode tidak ditemukan di database!");
        }

        // LOGIC KONFIGURASI LAYANAN
        // memakai hash untuk menyimpan kombinasi konfigurasi kegiatan & sub yang dipih
        // FE hanya mengirim id_kegiatan, kita lengkapi subkegiatan aktif
        const konfigurasiLengkap = await konfigurasiLayananService.resolveKegiatanDenganSub(
            payload.id_jenis_layanan,
            konfigurasiInput
        );
        // generate hash nya
        const reqHashed = await konfigurasiLayananService.generateKonfigurasiHash(konfigurasiLengkap);
        // cari konfigurasi dengan hash dan jenis_layanan
        let konfigurasi = await konfigurasiLayananService.getByHashAndJenis(reqHashed, payload.id_jenis_layanan);
        if (!konfigurasi) {
            // kalau tidak ada konfigurasi yang sama maka buat baru
            konfigurasi = await konfigurasiLayananService.create(payload.id_jenis_layanan, reqHashed, konfigurasiLengkap);
        } else {
            // kalau ada maka pakai yang lama
            console.log("[ LayananService.create ] Konfigurasi sudah ada, memakai konfigurasi yang sudah ada")
        }

        // LOGIC FILE UPLOAD
        const uploadedFiles = await uploadFilesBySchema(
            JENIS_SCHEMA[jenisLayanan.nama_jenis_layanan].files,
            files
        );

        // bentuk data untuk insert
        const newLayanan = {
            id_user: user.id,
            id_jenis_layanan: payload.id_jenis_layanan,
            id_konfigurasi_layanan: konfigurasi.id,
            id_status_pengajuan: STATUS_PENDING_PENGAJUAN.id,
            id_status_pelaksanaan: STATUS_PENDING_PELAKSANAAN.id,
            nama_kegiatan: payload.nama_kegiatan,
            tempat_kegiatan: payload.tempat_kegiatan,
            jumlah_peserta: payload.jumlah_peserta,
            instansi_asal: payload.instansi_asal,
            tanggal_mulai: payload.tanggal_mulai,
            tanggal_selesai: payload.tanggal_selesai,
            link_logbook: payload.link_logbook,
            file_proposal: uploadedFiles.proposal || null,
            file_surat_permohonan: uploadedFiles.surat_permohonan || null,
            file_surat_pengantar: uploadedFiles.surat_pengantar || null,
            file_surat_undangan: uploadedFiles.surat_undangan || null,
        };
        // masukkan data ke db
        const created = await layananRepository.create(newLayanan);

        // LOGIC PESERTA : create peserta 
        const pesertaAdded = await pesertaService.create(created, jenisLayanan, payload, user);

        // masukkan peserta ke var untuk direturn
        created.peserta = pesertaAdded;

        const adminEmail = process.env.EMAIL_USER;
        await sendNotifikasiAdminLayanan(adminEmail, created);
        // 2. Kirim ke Pengusul / User
        await sendNotifikasiPengusulLayanan(created.user.email, created);

        return created;
    },
    async updateStatusPengajuan(idLayanan, idStatus, alasan) {
        const STATUS_DITOLAK = await statusKodeRepository.findByName('Ditolak');
        const status = await statusKodeRepository.findById(idStatus);
        if (!status || !STATUS_DITOLAK) { throw ApiError(500, "Kode status tidak ditemukan!");}

        // kalau ditolak tapi alasannya kosong maka error
        if ((status.id == STATUS_DITOLAK.id) && !alasan) {
            throw ApiError(400, "Alasan Penolakan harus disertakan!")
        }
        // build payload update
        const data = {
            id_layanan: parseInt(idLayanan),
            id_status_pengajuan: status.id
        };
        // update status ke db
        const updated = await layananRepository.updateStatusPengajuan(data);

        // kalau ditolak maka insert jugaalasan
        if (status.id == STATUS_DITOLAK.id) {
            const rejectionPayload = {
                id_layanan: parseInt(idLayanan),
                alasan: alasan
            }
            const alasanCreated = await layananRejectionRepository.create(rejectionPayload);
            updated.alasan = alasanCreated;
        }

        return updated;
    }
}

module.exports = {
    jenisLayananService,
    targetPesertaService,
    layananService,
    statusKodeService
};



// FIX MASUKAN DARI FE
// {
//   "id_jenis_layanan": 1,
//   "nama_kegiatan": "Belajar IndustrI Kopi", // kosongi bila selain undangan narasumber
//   "tempat_kegiatan": "Aula", // kosongi bila selain undangan narasumber
//   "jumlah_peserta": 1,
//   "instansi_asal": "Universitas Jember",
//   "tanggal_mulai": "2025-11-08T08:00:00.000Z",
//   "tanggal_selesai": "2025-11-08T12:00:00.000Z",
//   "link_logbook": "docs.google.com", // hanya untuk magang / PKL
//   "proposal_atau_surat_permohonan": "DOK1",
//   "surat_pengantar_atau_undangan": "DOK2",
//   "isi_konfigurasi_layanan": [
//      {
//          "id_kegiatan": [1,2,3,4,5,6,7]
//      }
//   ],
//  "nim": 123, // hanya kalau magang / pkl
//  "fakultas": "Pertanian"  // hanya kalau magang / pkl
//  "prodi": "Ilmu Tanah" // hanya kalau magang / pkl
//  "peserta": [
//      {
//          "urutan": 1,
//          "nama": "Adit"
//      },
//      {
//          "urutan": 2,
//          "nama": "Adit"
//      }
//  ]
// }
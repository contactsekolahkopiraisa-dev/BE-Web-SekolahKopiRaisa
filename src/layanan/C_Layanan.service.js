const crypto = require("crypto");
const dotenv = require("dotenv");
const ApiError = require("../utils/apiError.js");
dotenv.config();
const {
  deleteFromCloudinaryByUrl,
} = require("../services/cloudinaryDelete.service.js");
const {
  uploadToCloudinary,
} = require("../services/cloudinaryUpload.service.js");
const { sanitizeData } = require("../utils/sanitizeData.js");
const { STATUS, STATEMENT_LAYANAN } = require("../utils/constant/enum.js");
const { JENIS_SCHEMA, validateData } = require("./C_Layanan.validate.js");
const {
  layananRepository,
  jenisLayananRepository,
  targetPesertaRepository,
  statusKodeRepository,
  konfigurasiLayananRepository,
  pesertaRepository,
  subKegiatanRepository,
  layananRejectionRepository,
} = require("./C_Layanan.repository.js");
const {
  uploadFilesBySchema,
  buildFilter,
  formatLayanan,
  hitungPeserta,
} = require("./C_Layanan.helper.js");
const {
  calculateDurationMonth,
} = require("../utils/calculateDurationMonth.js");
const { findUserByRole } = require("../auth/user.repository.js");
const { sendEmailLayananNotif } = require("../services/fiturLayananEmailSender.service.js");

const statusKodeService = {
  // GET ALL KODE STATUS
  async getAll() {
    const statusKodes = await statusKodeRepository.findAll();
    if (!statusKodes || statusKodes.length === 0) {
      throw new ApiError(404, "Data-data status tidak ditemukan!");
    }
    return statusKodes;
  },
  // GET KODE STATUS BY ID
  async getById(id) {
    const statusKode = await statusKodeRepository.findById(id);
    if (!statusKode) {
      throw new ApiError(404, "Data status tidak ditemukan!");
    }
    return statusKode;
  },
};

const jenisLayananService = {
  // GET ALL JENIS LAYANAN
  async getAll() {
    const jenisLayanans = await jenisLayananRepository.findAll();
    if (!jenisLayanans || jenisLayanans.length === 0) {
      throw new ApiError(404, "Data jenis layanan tidak ditemukan!");
    }
    return jenisLayanans;
  },
  // GET JENIS LAYANAN BY ID
  async getById(id) {
    const jenisLayanan = await jenisLayananRepository.findById(id);
    if (!jenisLayanan) {
      throw new ApiError(404, "Data jenis layanan tidak ditemukan!");
    }
    return jenisLayanan;
  },
  // PUT JENIS LAYANAN BY ID
  async update(id, dataRaw, file) {
    // cari data itu ada tidak, reuse kode this.getById()
    const existingJenisLayanan = await jenisLayananService.getById(id);
    let existingTargetPeserta;
    if (dataRaw.id_target_peserta) {
      // cari juga target peserta, 404 nya ngikut bawaan
      existingTargetPeserta = await targetPesertaService.getById(
        dataRaw.id_target_peserta
      );
    }

    // hapus id biar id nya g diupdate
    delete dataRaw.id;
    // bersihkan data : konvert integer
    const data = sanitizeData(dataRaw);
    // hapus file img kalo ada
    if (file) {
      if (existingJenisLayanan.image) {
        await deleteFromCloudinaryByUrl(
          existingJenisLayanan.image,
          "jenis-layanan"
        );
      }
      // upload img baru
      const uploaded = await uploadToCloudinary(
        file.buffer,
        file.originalname,
        {
          folder: "jenis-layanan",
          type: "image",
        }
      );
      data.image = uploaded.url;
    }
    // buat payload baru
    const payload = {
      nama_jenis_layanan: data.nama_jenis_layanan ?? undefined,
      deskripsi_singkat: data.deskripsi_singkat ?? undefined,
      deskripsi_lengkap: data.deskripsi_lengkap ?? undefined,
      image: data.image ?? undefined,
      estimasi_waktu: data.estimasi_waktu ?? undefined,
      id_target_peserta: data.id_target_peserta ?? undefined,
      is_active: data.is_active ?? undefined,
    };

    // lempar ke repo
    const updated = await jenisLayananRepository.update(id, payload);
    return updated;
  },
};

const targetPesertaService = {
  // GET ALL TARGET PESERTA
  async getAll() {
    const targetPesertas = await targetPesertaRepository.findAll();
    if (!targetPesertas || targetPesertas.length === 0) {
      throw new ApiError(404, "Data target peserta tidak ditemukan!");
    }
    return targetPesertas;
  },
  // GET TARGET PESERTA BY ID
  async getById(id) {
    const targetPeserta = await targetPesertaRepository.findById(id);
    if (!targetPeserta) {
      throw new ApiError(404, "Data target peserta tidak ditemukan!");
    }
    return targetPeserta;
  },
};

const konfigurasiLayananService = {
  async getByHashAndJenis(hash, idJenis) {
    return await konfigurasiLayananRepository.findByHashAndJenis(hash, idJenis);
  },
  async generateKonfigurasiHash(list) {
    const sorted = list
      .map((item) => ({
        id_kegiatan: item.id_kegiatan,
        id_sub_kegiatan: [...item.id_sub_kegiatan].sort(),
      }))
      .sort((a, b) => a.id_kegiatan - b.id_kegiatan);

    const asString = JSON.stringify(sorted);
    return crypto.createHash("sha256").update(asString).digest("hex");
  },
  async resolveKegiatanDenganSub(idJenisLayanan, konfigurasiInput) {
    const result = [];

    const kegiatanIds = konfigurasiInput[0]?.id_kegiatan;
    if (!Array.isArray(kegiatanIds)) {
      throw new ApiError(400, "Format id_kegiatan tidak valid.");
    }

    for (const kegiatanId of kegiatanIds) {
      // ambil subkegiatan yang aktif untuk jenis layanan tertentu
      const subKegiatan =
        await subKegiatanRepository.findActiveSubKegiatanByJenisLayanan(
          kegiatanId,
          idJenisLayanan
        );
      result.push({
        id_kegiatan: kegiatanId,
        id_sub_kegiatan: subKegiatan.map((s) => s.id),
      });
    }

    return result;
  },
  async create(idJenisLayanan, hash, isiKonfigurasiLayanan) {
    // const hash = this.generateKonfigurasiHash(isiKonfigurasiLayanan);
    const existing = await konfigurasiLayananRepository.findByHashAndJenis(
      hash,
      idJenisLayanan
    );
    if (existing) {
      console.log(
        "[ konfigurasiLayananService.create ] Konfigurasi sudah ada, batal membuat konfigurasi, lalu memakai konfigurasi lama..."
      );
      return existing;
    }
    const created = await konfigurasiLayananRepository.create(
      idJenisLayanan,
      hash,
      false,
      isiKonfigurasiLayanan
    );
    console.log(
      "[ konfigurasiLayananService.create ] Konfigurasi baru dibuat..."
    );
    return created;
  },
};

const pesertaService = {
  async create(layanan, jenis, payloadPeserta, user) {
    const jenisNama = jenis.nama_jenis_layanan;
    // Jika jenis_layanan tidak ada
    if (!jenis || !jenisNama) {
      new ApiError(500, "Jenis layanan tidak valid pada handlePeserta");
    }
    // 1. UNDANGAN NARASUMBER = TIDAK ADA PESERTA
    if (jenisNama.includes("Undangan Narasumber")) {
      console.log(
        "[pesertaService.handlePeserta] Tidak membuat peserta (undangan narasumber)"
      );
      return [];
    }
    // 2. MAGANG / PKL = 1 peserta otomatis dari user login
    if (
      jenisNama.includes("Magang") ||
      jenisNama.includes("Praktek Kerja Lapangan (PKL)")
    ) {
      const data = {
        id_layanan: layanan.id,
        nama_peserta: user.name,
        instansi_asal: layanan.instansi_asal,
        fakultas: payloadPeserta.fakultas,
        program_studi: payloadPeserta.prodi,
        nim: payloadPeserta.nim,
      };
      console.log(
        "[pesertaService.handlePeserta] Membuat peserta untuk PKL/Magang"
      );
      const saved = await pesertaRepository.create(data);
      return [saved];
    }
    // 3. PELATIHAN / KUNJUNGAN = banyak peserta
    if (
      Array.isArray(payloadPeserta.pesertas) &&
      payloadPeserta.pesertas.length > 0
    ) {
      const list = payloadPeserta.pesertas.map((item) => ({
        id_layanan: layanan.id,
        nama_peserta: item.nama,
        instansi_asal: layanan.instansi_asal,
        fakultas: null,
        program_studi: null,
        nim: null,
      }));
      console.log(
        "[pesertaService.handlePeserta] Bulk insert peserta =",
        list.length
      );
      const saved = await pesertaRepository.createMany(list);
      return [saved];
    }
    // DEFAULT
    return [];
  },
};

const layananService = {
  async getAll(user, query) {
    const filterOptions = buildFilter(query);

    if (user.role === "customer") {
      filterOptions.where.id_user = user.id;
    }

    const layanans = await layananRepository.findAll(filterOptions);
    if (!layanans) {
      throw new ApiError(404, "Data layanan tidak ada!");
    }

    return layanans.map((item) => {
      item.durasi_dalam_bulan =
        item.tanggal_mulai && item.tanggal_selesai
          ? calculateDurationMonth(
            new Date(item.tanggal_mulai),
            new Date(item.tanggal_selesai)
          )
          : null;
      return formatLayanan(item);
    });
  },
  async getById(id, user, query = {}) {
    const filterOptions = buildFilter(query);
    filterOptions.where.id = parseInt(id);

    if (user.role === "customer") {
      filterOptions.where.id_user = user.id;
    }

    const layanan = await layananRepository.findById(filterOptions);
    if (!layanan) {
      throw new ApiError(404, "Data layanan tidak ada!");
    }

    layanan.durasi_dalam_bulan = await calculateDurationMonth(
      new Date(layanan.tanggal_mulai),
      new Date(layanan.tanggal_selesai)
    );

    return formatLayanan(layanan);
  },
  async create(payloadRaw, files, userRaw) {
    // formatting
    const payload = sanitizeData(payloadRaw);
    const user = sanitizeData(userRaw);
    // konvert json
    let konfigurasiInput = JSON.parse(payload.isi_konfigurasi_layanan);
    payload.pesertas = payload.pesertas ? JSON.parse(payload.pesertas) : [];

    // LOGIC BAGIAN JENIS LAYANAN : pengecekan apakah jenis layanannya ada
    const jenisLayanan = await jenisLayananRepository.findById(
      payload.id_jenis_layanan
    );
    if (!jenisLayanan || jenisLayanan.is_active == false) {
      throw new ApiError(404, "jenis layanan aktif tidak ditemukan!");
    }
    // LOGIC MAGANG/PKL : kalau dia masih ada magang/pkl ongoing dia tidak bisa mengajukan
    const jenisMagangPKL = ["Magang", "Praktek Kerja Lapangan (PKL)"];
    if (jenisMagangPKL.includes(jenisLayanan.nama_jenis_layanan)) {
      const ongoing = await layananRepository.findOngoingByUserAndJenis(
        user.id,
        jenisMagangPKL
      );
      if (ongoing.length > 0) {
        throw new ApiError(
          409,
          "Tidak bisa mengajukan layanan! Masih ada magang/PKL yang sedang berlangsung atau akan datang."
        );
      }
    }

    // VALIDATE SEMUA DATA
    const rule = await validateData(payload, jenisLayanan, files);

    // hitung jumlah peserta
    payload.jumlah_peserta = await hitungPeserta(
      payload.pesertas,
      rule.peserta
    );

    // LOGIC KONFIGURASI LAYANAN
    // memakai hash untuk menyimpan kombinasi konfigurasi kegiatan & sub yang dipih
    // FE hanya mengirim id_kegiatan, kita lengkapi subkegiatan aktif
    const konfigurasiLengkap =
      await konfigurasiLayananService.resolveKegiatanDenganSub(
        payload.id_jenis_layanan,
        konfigurasiInput
      );
    // generate hash nya
    const reqHashed = await konfigurasiLayananService.generateKonfigurasiHash(
      konfigurasiLengkap
    );
    // cari konfigurasi dengan hash dan jenis_layanan
    let konfigurasi = await konfigurasiLayananService.getByHashAndJenis(
      reqHashed,
      payload.id_jenis_layanan
    );
    // kalau ada maka pakai yang lama
    if (!konfigurasi) {
      // kalau tidak ada konfigurasi yang sama maka buat baru
      konfigurasi = await konfigurasiLayananService.create(
        payload.id_jenis_layanan,
        reqHashed,
        konfigurasiLengkap
      );
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
      id_status_pengajuan: STATUS.MENUNGGU_PERSETUJUAN.id,
      id_status_pelaksanaan: STATUS.MENUNGGU_PERSETUJUAN.id,
      nama_kegiatan: payload.nama_kegiatan,
      tempat_kegiatan: payload.tempat_kegiatan,
      jumlah_peserta: payload.jumlah_peserta,
      instansi_asal: payload.instansi_asal,
      tanggal_mulai: payload.tanggal_mulai,
      tanggal_selesai: payload.tanggal_selesai,
      file_proposal: uploadedFiles.proposal || null,
      file_surat_permohonan: uploadedFiles.surat_permohonan || null,
      file_surat_pengantar: uploadedFiles.surat_pengantar || null,
      file_surat_undangan: uploadedFiles.surat_undangan || null,
    };
    // masukkan data ke db
    const created = await layananRepository.create(newLayanan);

    // LOGIC PESERTA : create peserta
    const pesertaAdded = await pesertaService.create(
      created,
      jenisLayanan,
      payload,
      user
    );

    // masukkan peserta ke var untuk direturn
    created.pesertas = pesertaAdded;

    // TODO : HARUSNYA MAILER DIBUAT AUTOSERVICE TERSENDIRI, perbaikilah wahai dev selanjutnya
    const emailTargets = (await findUserByRole('admin')).map(u => u.email);
    const emailTerkirims = await sendEmailLayananNotif(user, true, emailTargets, created, STATEMENT_LAYANAN.LAYANAN_DIAJUKAN);
    console.log(emailTerkirims);
    // kirim juga ke customer
    const emailTarget = [user.email.toString()];
    const emailTerkirim = await sendEmailLayananNotif(user, false, emailTarget, created, STATEMENT_LAYANAN.LAYANAN_DIAJUKAN);
    console.log(emailTerkirim);

    return created;
  },
  async updateStatus(statementLayanan, idLayanan, user, idStatus, alasan = null) {
    // ambil kode status tujuan dari req, 404 nya ngikut bawaan
    const status = await statusKodeRepository.findById(idStatus);
    // cari layanan ada atau tidak, 404 nya ngikut bawaan
    const existingLayanan = await layananService.getById(idLayanan, user, {
      include_rejection: true,
    });

    // hanya admin yang bisa acc dan reject
    if (existingLayanan.pengajuan.id === STATUS.MENUNGGU_PERSETUJUAN.id) {
      if (idStatus === STATUS.DISETUJUI.id || idStatus === STATUS.DITOLAK.id) {
        if (user.role !== "admin") {
          throw new ApiError(
            403,
            "Hanya admin yang boleh mengubah status pengajuan."
          );
        }
      }
    }
    // build payload update
    const payload = {
      id_status_pengajuan: idStatus,
    };

    // LOGIC PENGAJUAN
    if (existingLayanan.pengajuan.id == STATUS.MENUNGGU_PERSETUJUAN.id) {

      // Update status pengajuan dengan idStatus yang diterima
      payload.id_status_pengajuan = idStatus;

      // kalau pengajuan ditolak maka tolak juga pelaksanaan
      if (idStatus == STATUS.DITOLAK.id) {
        payload.id_status_pelaksanaan = STATUS.DITOLAK.id;
        // kalau ditolak tapi alasannya kosong maka error
        if (status.id == STATUS.DITOLAK.id && !alasan) {
          throw new ApiError(400, "Alasan Penolakan harus disertakan!");
        }
        // kalau ditolak tapi sudah pernah ditolak maka tidak bisa tolak lagi
        if (
          Array.isArray(existingLayanan.layananRejection) &&
          existingLayanan.layananRejection.length > 0
        ) {
          throw new ApiError(400, "Layanan sudah pernah ditolak!");
        }
      }
      // kalau pengajuan diacc maka ubah status pelaksanaan
      if (idStatus == STATUS.DISETUJUI.id) {
        payload.id_status_pelaksanaan = STATUS.BELUM_TERLAKSANA.id;
      }
    }

    // belum ada validasi waktu, tolong perbaikan untuk dev selajutnya

    // LOGIC PENYELESAIAN
    if (existingLayanan.pelaksanaan.id == STATUS.SEDANG_BERJALAN.id) {
      console.log("updating pelaksanaan...");
      if (idStatus == STATUS.SELESAI.id) {
        // kalau di finish pelaksanaan tapi bukan id nya yang ngubah maka tolak
        if (user.id !== existingLayanan.pemohon.id) {
          throw new ApiError(
            403,
            "Hanya user bersangkutan yang bisa menyelesaikan pelaksanaan !"
          );
        } else {
          payload.id_status_pelaksanaan = STATUS.SELESAI.id;
        }
      }
    }

    // update status ke db
    const updated = await layananRepository.update(idLayanan, payload);

    // kalau ditolak maka insert juga alasan
    if (status.id == STATUS.DITOLAK.id) {
      // Cek apakah sudah pernah ditolak sebelumnya
      const existingRejection =
        Array.isArray(updated.layananRejection) &&
          updated.layananRejection.length > 0
          ? updated.layananRejection[0]
          : null;

      if (existingRejection) {
        // Kalau sudah ada rejection, UPDATE alasan nya
        const alasanUpdated = await layananRejectionRepository.update(
          existingRejection.id,
          { alasan }
        );
        updated.layananRejection = [alasanUpdated];
      } else {
        // Kalau belum ada, INSERT baru
        const rejectionPayload = {
          id_layanan: parseInt(idLayanan),
          alasan: alasan,
        };
        // DEV NOTES : SEMENTARA LAYANANREJECTION HANYA DIPAKAI DISINI SEHINGGA LANGSUNG DIPANGGIL REPO NYA DISINI,
        // KALAU NANTI APLIKASI BERKEMBANG MAKA PISAHKAN REJECTION INI KE CONST SERVICE TERPISAH
        const alasanCreated = await layananRejectionRepository.create(
          rejectionPayload
        );
        updated.layananRejection = [alasanCreated];
      }
    }

    // kirim email notif hasil update :
    // to specified cust only if called by admin
    if (user.role === 'admin') {
      // const emailTarget = [user.email.toString()];// salah
      const emailTarget = [updated.user.email.toString()];// salah
      const emailTerkirim = await sendEmailLayananNotif(user, true, emailTarget, updated, statementLayanan);
      console.log(emailTerkirim);
      // to specified cust & all admin if called by customer
    } else if (user.role === 'customer') {
      const emailTargets = (await findUserByRole('admin')).map(u => u.email);
      const emailTerkirims = await sendEmailLayananNotif(user, true, emailTargets, updated, statementLayanan);
      console.log(emailTerkirims);
      // kirim juga ke customer
      const emailTarget = [user.email.toString()];
      const emailTerkirim = await sendEmailLayananNotif(user, false, emailTarget, updated, statementLayanan);
      console.log(emailTerkirim);
    }

    return updated;
  },
  async uploadLogbook(id_layanan, link, user) {
    // cari layanan ada atau tidak, 404 nya ngikut bawaan
    const existingLayanan = await layananService.getById(id_layanan, user);

    // create payload
    const payload = {
      link_logbook: link,
    };
    // lempar ke repo
    const updated = await layananRepository.update(id_layanan, payload);
    return updated;
  },
};

module.exports = {
  jenisLayananService,
  targetPesertaService,
  layananService,
  statusKodeService,
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

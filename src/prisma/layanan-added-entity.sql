CREATE TABLE modul (
  id SERIAL PRIMARY KEY,
  id_dibuat_oleh int NOT NULL REFERENCES "User"(id),
  judul_modul varchar(128) UNIQUE NOT NULL,
  deskripsi text,
  file_modul text NOT NULL,
  created_at datetime NOT NULL DEFAULT (now()),
  updated_at datetime NOT NULL
);

CREATE TABLE status_kode (
    id SERIAL PRIMARY KEY,
    nama_status_kode VARCHAR(32) NOT NULL
);
CREATE TABLE target_peserta (
  id SERIAL PRIMARY KEY,
  nama_target varchar(16) UNIQUE NOT NULL
);

CREATE TABLE jenis_layanan (
  id SERIAL PRIMARY KEY,
  nama_jenis_layanan varchar(32) UNIQUE NOT NULL,
  deskripsi_singkat varchar(64) NOT NULL,
  deskripsi_lengkap text NOT NULL,
  image text,
  estimasi_waktu vatrchar(16) NOT NULL,
  id_target_peserta int NOT NULL REFERENCES target_peserta(id)
);

CREATE TABLE kegiatan (
  id SERIAL PRIMARY KEY,
  nama_kegiatan varchar(32) UNIQUE NOT NULL,
  deskripsi text
);
CREATE TABLE sub_kegiatan (
  id SERIAL PRIMARY KEY,
  id_kegiatan int NOT NULL REFERENCES kegiatan(id),
  nama_sub_kegiatan varchar(64) NOT NULL,
  jam_durasi int,
  deskripsi text
);

CREATE TABLE konfigurasi_layanan (
  id SERIAL PRIMARY KEY,
  id_jenis_layanan int NOT NULL REFERENCES jenis_layanan(id),
  versi_konfig datetime NOT NULL,
  hash_konfigurasi varchar(128) UNIQUE NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  catatan text,
  created_at datetime NOT NULL DEFAULT (now())
);
CREATE TABLE detail_konfigurasi (
  id SERIAL PRIMARY KEY,
  id_konfigurasi_layanan int NOT NULL REFERENCES konfigurasi_layanan(id),
  id_kegiatan int NOT NULL REFERENCES kegiatan(id),
  id_sub_kegiatan int NOT NULL REFERENCES sub_kegiatan(id),
  urutan_ke int NOT NULL
);

CREATE TABLE layanan (
  id SERIAL PRIMARY KEY,
  id_user int NOT NULL REFERENCES "User"(id),
  id_jenis_layanan uuid NOT NULL REFERENCES jenis_layanan(id),
  id_konfigurasi_layanan int NOT NULL REFERENCES ,
  id_status_pengajuan int NOT NULL REFERENCES status_kode(id),
  id_status_pelaksanaan int NOT NULL REFERENCES status_kode(id),
  nama_kegiatan text,
  tempat_kegiatan text,
  jumlah_peserta int NOT NULL DEFAULT 1,
  instansi_asal varchar(64) NOT NULL,
  tanggal_mulai datetime NOT NULL,
  tanggal_selesai datetime NOT NULL,
  link_logbook text,
  file_proposal text,
  file_surat_permohonan text,
  file_surat_pengantar text,
  file_surat_undangan text,
  created_at datetime NOT NULL DEFAULT (now())
);
CREATE TABLE layanan_rejection (
  id SERIAL PRIMARY KEY,
  id_layanan int UNIQUE NOT NULL,
  alasan text NOT NULL,
  created_at datetime NOT NULL DEFAULT (now())
);

CREATE TABLE mou (
  id SERIAL PRIMARY KEY,
  id_layanan INT UNIQUE NOT NULL REFERENCES layanan(id),
  id_status_pengajuan int NOT NULL REFERENCEC status_kode(id),
  file_mou text NOT NULL,
  tanggal_upload datetime NOT NULL DEFAULT (now()),
  tanggal_disetujui datetime
);
CREATE TABLE mou_rejection (
  id SERIAL PRIMARY KEY,
  id_mou int UNIQUE NOT NULL REFERENCES mou(id),
  alasan text NOT NULL,
  created_at datetime DEFAULT (now())
);

CREATE TABLE peserta (
  id SERIAL PRIMARY KEY,
  id_layanan int NOT NULL REFERENCES layanan(id),
  nama_peserta varchar(128) NOT NULL,
  instansi_asal varchar(64),
  fakultas varchar(32),
  program_studi varchar(32),
  nim varchar(32),
  predikat varchar(32)
);

CREATE TABLE laporan (
  id SERIAL PRIMARY KEY,
  nama_p4s varchar(64) NOT NULL,
  asal_kab_kota varchar(32) NOT NULL,
  id_layanan int NOT NULL REFERENCES layanan(id),
  foto_kegiatan text NOT NULL,
  id_status_pelaporan int NOT NULL REFERENCES status_kode(id)
);

CREATE TABLE sertifikat (
  id SERIAL PRIMARY KEY,
  id_layanan int NOT NULL REFERENCES layanan(id),
  file_sertifikat text,
  link_sertifikat text,
  created_at datetime NOT NULL DEFAULT (now())
);
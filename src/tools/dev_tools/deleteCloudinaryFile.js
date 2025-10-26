// // https://res.cloudinary.com/darsrhtsb/raw/upload/v1761398548/konten-kopiraisa/modul/1761398547378_FORMAT%20-%20SURAT%20PENGANTAR.docx.pdf

// // https://res.cloudinary.com/darsrhtsb/raw/upload/v1761397812/konten-kopiraisa/modul/1761397810816_FORMAT%20-%20SURAT%20PENGANTAR.docx.pdf

// /**
//  * deleteCloudinaryFile.js
//  * Jalankan dengan: node src/tools/dev_tools/deleteCloudinaryFile.js
//  */

// const cloudinary = require('cloudinary').v2;
// const dotenv = require('dotenv');
// dotenv.config();

// // === KONFIGURASI CLOUDINARY ===
// cloudinary.config({
//   cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
//   api_key: process.env.CLOUDINARY_API_KEY,
//   api_secret: process.env.CLOUDINARY_API_SECRET,
// });

// // === URL FILE YANG INGIN DIHAPUS ===
// const urlsToDelete = [
//   'https://res.cloudinary.com/dwph2kxy6/raw/upload/v1761487477/konten-kopiraisa/modul/1761487472942_9c12fb15a93f2e57c239.pdf',
// ];

// /**
//  * Ambil public_id dari URL Cloudinary (versi robust)
//  * Menangani: versi Cloudinary, spasi (%20), dan ekstensi berlapis
//  */
// const getPublicIdFromUrl = (url) => {
//   try {
//     const u = new URL(url);
//     const decodedPath = decodeURIComponent(u.pathname); // ubah %20 jadi spasi
//     const parts = decodedPath.split('/');

//     // cari "upload"
//     const uploadIndex = parts.findIndex((p) => p === 'upload');
//     if (uploadIndex === -1) throw new Error('URL tidak valid: tidak ada "upload"');

//     // ambil bagian setelah "upload/"
//     const afterUpload = parts.slice(uploadIndex + 1);

//     // hapus versi (misal v123456789)
//     if (afterUpload[0].match(/^v\d+$/)) afterUpload.shift();

//     // ambil file terakhir
//     const filenameWithExt = afterUpload.pop();

//     /**
//      * 🔍 Logika khusus:
//      * - Ekstensi terakhir adalah yang dianggap "resmi"
//      * - Tapi jika ada titik ganda, kita simpan yang sebelum titik terakhir
//      *   Contoh:  file.docx.pdf  →  file.docx
//      *            file.final.backup.zip → file.final.backup
//      */
//     const partsOfFilename = filenameWithExt.split('.');
//     let filename;

//     if (partsOfFilename.length > 2) {
//       // simpan semua kecuali ekstensi terakhir
//       filename = partsOfFilename.slice(0, -1).join('.');
//     } else {
//       // kalau cuma satu titik, hapus ekstensi terakhir
//       filename = partsOfFilename[0];
//     }

//     afterUpload.push(filename);
//     return afterUpload.join('/');
//   } catch (err) {
//     console.error('❌ Gagal parse URL:', err.message);
//     return null;
//   }
// };

// /**
//  * Menebak tipe resource Cloudinary
//  */
// function guessResourceType(fileUrl) {
//   const ext = fileUrl.split('.').pop().toLowerCase();
//   if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)) return 'image';
//   if (['mp4', 'mov', 'avi', 'mkv'].includes(ext)) return 'video';
//   return 'raw';
// }

// /**
//  * Hapus file dari Cloudinary
//  */
// async function deleteFromCloudinaryByUrl(fileUrl) {
//   const publicId = getPublicIdFromUrl(fileUrl);
//   const resourceType = guessResourceType(fileUrl);

//   if (!publicId) {
//     console.warn('⚠️ Public ID tidak ditemukan dari URL:', fileUrl);
//     return;
//   }

//   console.log(`🧹 Menghapus dari Cloudinary...
// Public ID: ${publicId}
// Resource: ${resourceType}`);

//   try {
//     const result = await cloudinary.uploader.destroy(publicId, {
//       resource_type: resourceType,
//       invalidate: true,
//     });

//     if (result.result === 'ok') {
//       console.log(`✅ Berhasil hapus: ${fileUrl}`);
//     } else if (result.result === 'not found') {
//       console.warn(`⚠️ File tidak ditemukan di Cloudinary:\n${fileUrl}`);
//     } else {
//       console.log('ℹ️ Respons Cloudinary:', result);
//     }
//   } catch (error) {
//     console.error(`❌ Gagal hapus dari Cloudinary: ${error.message}`);
//   }
// }

// /**
//  * Jalankan
//  */
// (async () => {
//   for (const url of urlsToDelete) {
//     await deleteFromCloudinaryByUrl(url);
//   }
// })();

import { v2 as cloudinary } from 'cloudinary';
cloudinary.config({
  cloud_name: "dwph2kxy6",
  api_key: "972926257281214",
  api_secret: "xqaFl-PvV5mn8CrADHSglkJcuVY"
});

// const result = await cloudinary.uploader.destroy(
//   "konten-kopiraisa/modul/1761483700028_77db25d3520471c6ddb9",
//   { resource_type: "raw" }
// );

const { resources } = await cloudinary.api.resources({
  type: "upload",       // biasanya 'upload'
  resource_type: "raw",
  prefix: "konten-kopiraisa/modul",
  max_results: 10
});
console.log(resources);

// console.log(result);

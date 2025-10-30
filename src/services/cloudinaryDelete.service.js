/**
 * cloudinaryDelete.service.js
 * Service untuk menghapus file dari Cloudinary berdasarkan URL,
 * mendukung multiple akun Cloudinary dengan logging debug lengkap.
 */

const { v2: cloudinary } = require("cloudinary");
const dotenv = require("dotenv");
dotenv.config();

/**
 * Buat instance Cloudinary baru dari cloud_name
 */
const getCloudinaryInstance = (cloudName) => {
  let config;

  if (cloudName === process.env.CLOUDINARY_CLOUD_NAME_OLD) {
    config = {
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME_OLD,
      api_key: process.env.CLOUDINARY_API_KEY_OLD,
      api_secret: process.env.CLOUDINARY_API_SECRET_OLD,
    };
  } else if (cloudName === process.env.CLOUDINARY_CLOUD_NAME) {
    config = {
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
    };
  } else {
    console.error("❌ Cloud name tidak dikenali:", cloudName);
    throw new Error(`Cloud name tidak dikenali: ${cloudName}`);
  }

  cloudinary.config(config);
};

/**
 * Ambil cloud_name dari URL Cloudinary
 */
const getCloudNameFromUrl = (url) => {
  try {
    const match = url.match(/https:\/\/res\.cloudinary\.com\/([^\/]+)\//);
    if (match && match[1]) return match[1];
    console.warn("⚠️ Gagal mendeteksi cloud_name dari URL:", url);
    return null;
  } catch (err) {
    console.error("❌ Gagal parse cloudName dari URL:", err.message, "URL:", url);
    return null;
  }
};

/**
 * Menebak tipe resource Cloudinary dari ekstensi
 */
const guessResourceType = (fileUrl) => {
  const ext = fileUrl.split(".").pop().toLowerCase();
  if (["jpg", "jpeg", "png", "gif", "webp"].includes(ext)) return "image";
  if (["mp4", "mov", "avi", "mkv"].includes(ext)) return "video";
  return "raw";
};

/**
 * Hapus file dari Cloudinary berdasarkan URL
 */
const deleteFromCloudinaryByUrl = async (fileUrl, namaFolder) => {
  try {
    const cloudName = getCloudNameFromUrl(fileUrl) || process.env.CLOUDINARY_CLOUD_NAME;
    getCloudinaryInstance(cloudName);

    const resourceType = guessResourceType(fileUrl);

    // ambil semua resources di folder modul
    const resources = await cloudinary.api.resources({
      type: "upload",
      prefix: `konten-kopiraisa/${namaFolder}`,
      resource_type: resourceType,
      max_results: 500,
    });

    // cari file yang URL-nya cocok
    const match = resources.resources.find(
      r => r.secure_url === fileUrl || r.url === fileUrl
    );

    if (!match) {
      console.warn("⚠️ File tidak ditemukan via API resources:", fileUrl);
      return false;
    }

    console.log(`🧹 Menghapus file dengan public_id dari API:
    Public ID: ${match.public_id}
    Resource: ${match.resource_type}
    Cloud: ${cloudName}`);

    const result = await cloudinary.uploader.destroy(match.public_id, {
      resource_type: match.resource_type,
      invalidate: true,
    });

    if (result.result === "ok") {
        console.log("✅ Berhasil hapus:", fileUrl);
        return true;
    }
    else {
        console.warn("⚠️ Gagal hapus, respons:", result);
        return false;
    }
  } catch (err) {
    console.error("❌ Error hapus file:", err.message, fileUrl);
    return false;
  }
};

/**
 * Hapus banyak file
 */
const deleteMultipleFromCloudinary = async (urls = []) => {
  for (const url of urls) {
    await deleteFromCloudinaryByUrl(url);
  }
};

module.exports = {
  deleteFromCloudinaryByUrl,
  deleteMultipleFromCloudinary,
};

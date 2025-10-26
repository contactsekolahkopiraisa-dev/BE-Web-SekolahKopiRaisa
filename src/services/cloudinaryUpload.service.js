const { cloudinary } = require("../utils/cloudinary");
const path = require("path");
const crypto = require("crypto");
const streamifier = require("streamifier");

/**
 * Upload file ke Cloudinary (image, video, raw)
 * File dokumen (PDF/DOCX/XLSX/ZIP) akan bisa dibuka langsung di browser.
 *
 * @param {Buffer} fileBuffer
 * @param {string} filename
 * @param {Object} options { folder, mimetype }
 */
const uploadToCloudinary = async (fileBuffer, filename, options = {}) => {
  const { folder = "uploads", mimetype = "application/octet-stream" } = options;

  // Deteksi tipe file
  const ext = path.extname(filename).toLowerCase();
  const isImage =
    mimetype.startsWith("image/") ||
    [".jpg", ".jpeg", ".png", ".webp", ".gif"].includes(ext);
  const isVideo =
    mimetype.startsWith("video/") ||
    [".mp4", ".mov", ".avi", ".mkv"].includes(ext);
  const resourceType = isImage ? "image" : isVideo ? "video" : "raw";

  // Buat nama unik
  const randomPart = crypto.randomBytes(10).toString("hex");
  const uniqueName = `${Date.now()}_${randomPart}`;
  const folderPath = `konten-kopiraisa/${folder}`;

  try {
    let result;
    // UPLOAD KHUSUS IMG VID
    if (isImage || isVideo) {
      result = await new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          {
            folder: folderPath,
            resource_type: resourceType,
            public_id: uniqueName,
            use_filename: true,
            unique_filename: false,
            overwrite: true,
          },
          (error, result) => (error ? reject(error) : resolve(result))
        );
        streamifier.createReadStream(fileBuffer).pipe(uploadStream);
      });
    }
    // UPLOAD SELAIN IMG VID
    else {
      result = await new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          {
            folder: folderPath,
            resource_type: "raw",
            type: "upload",
            access_mode: "public",
            public_id: `${uniqueName}${ext}`,
            use_filename: true,
            unique_filename: false,
            overwrite: true,
          },
          (error, result) => (error ? reject(error) : resolve(result))
        );
        streamifier.createReadStream(fileBuffer).pipe(uploadStream);
      });
    }
    // debug di konsol
    console.log(result);

    return {
      url: result.secure_url,
      public_id: result.public_id,
      resource_type: result.resource_type,
    };
  } catch (error) {
    console.error("❌ Gagal upload ke Cloudinary:", error);
    throw error;
  }
};

module.exports = { uploadToCloudinary };
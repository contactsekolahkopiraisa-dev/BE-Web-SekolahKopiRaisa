const {cloudinary} = require('../utils/cloudinary');

/**
 * Upload file/image ke Cloudinary
 * @param {Buffer} fileBuffer - buffer dari multer
 * @param {string} filename - nama file asli
 * @param {Object} options
 *        options.folder - nama folder di Cloudinary (misal 'modul', 'mou', 'image')
 *        options.type - 'image' atau 'raw' (default akan otomatis dari mimetype)
 * @returns {Promise<string>} - URL file di Cloudinary
 */

const uploadToCloudinary = (filebuffer, filename, options = {}) => {
    return new Promise((resolve, reject) => {
        const { folder = 'image', type } = options;
        // Tentukan resource_type otomatis berdasarkan folder/mimetype
        let resource_type = type || (folder === 'image' ? 'image' : 'raw');

        const stream = cloudinary.uploader.upload_stream(
            { 
                folder: `konten-kopiraisa/${folder}`, 
                resource_type, 
                public_id: `${Date.now()}_${filename}`,
                use_filename: true,
                unique_filename: false,
                overwrite: true
            },
            (error, result) => {
                if (error) return reject(error);
                resolve(result.secure_url);
            }
        );
        stream.end(filebuffer);
    });
};

module.exports = {uploadToCloudinary};
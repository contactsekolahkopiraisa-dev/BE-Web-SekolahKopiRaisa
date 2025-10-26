const multer = require('multer');
const path = require('path');
const storage = multer.memoryStorage();


// TIPE IMAGE ALLOWED UNTUK CLOUDINARY
const allowedMimeTypes = [ 'image/jpeg', 'image/png', 'image/jpg', 'image/webp' ];
// TIPE FILE ALLOWED UNTUK CLOUDINARY
const allowedFileMimeTypes = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/zip',
  'application/x-rar-compressed',
  'text/plain',
  'application/json',
];
// TIPE EKSTENSI DIBOLEHKAN
const allowedFileExtensions = [
  '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.zip', '.rar', '.txt', '.json'
];


// Filter untuk hanya mengizinkan file gambar
const imageFileFilter = (req, file, cb) => {
  if (allowedMimeTypes.includes(file.mimetype)) cb(null, true);
  else cb(new Error(`File type not allowed for field: ${file.fieldname}, File: ${file.originalname}`), false);
};

//Filter untuk file dokumen (raw)
const rawFileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  if (allowedFileMimeTypes.includes(file.mimetype) && allowedFileExtensions.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error(`Tipe file tidak diizinkan: ${file.originalname}`), false);
  }
};

// PENGECEKAN TIPE DATA FILE
// const fileFilter = (req, file, cb) => {
//     if (allowedMimeTypes.includes(file.mimetype)) {
//         cb(null, true);
//     } else {
//         cb(new Error(`File type not allowed for field: ${file.fieldname}, File: ${file.originalname}`), false);
//     }
// };

const upload = multer({
    storage, limits: {
        fileSize: 5 * 1024 * 1024,
        files: 5,
    },
    fileFilter: imageFileFilter
});
const uploadCompany = multer({
    storage, limits: {
        fileSize: 5 * 1024 * 1024,
        files: 5,
    },
    fileFilter: imageFileFilter
});

// Upload untuk News: mendukung hingga 4 file media dan 1 thumbnail
const uploadNews = multer({
    storage,
    limits: {
        fileSize: 5 * 1024 * 1024, // Maksimal 5MB per file
        files: 5, // Maksimal 5 file dalam satu request (media + thumbnail)
    },
    fileFilter: (req, file, cb) => {
        // Filter file untuk media dan thumbnail (hanya gambar)
        const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
        if (!allowedTypes.includes(file.mimetype)) {
            return cb(new Error('ALLOWED_FILE_TYPES'), false);
        }
        cb(null, true);
    }
});

// Upload untuk Product: mendukung 1 file produk
const uploadProduct = multer({
    storage,
    limits: {
        fileSize: 5 * 1024 * 1024, // Maksimal 5MB per file
    },
    fileFilter: (req, file, cb) => {
        // Filter file untuk produk (hanya gambar)
        const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
        if (!allowedTypes.includes(file.mimetype)) {
            return cb(new Error('ALLOWED_FILE_TYPES'), false);
        }
        cb(null, true);
    }
});

// UPLOAD KHUSUS UNTUK FILE MODUL / DOKUMEN (PDF, WORD, EXCEL, ZIP, DLL)
const uploadFile = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: rawFileFilter
});


module.exports = { upload, uploadFile };    //REFACTOR SEMUA YANG PAKAI upload ini
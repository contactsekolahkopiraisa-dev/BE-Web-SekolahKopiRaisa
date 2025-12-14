const mockFileMiddleware = (fieldName) => (req, res, next) => {
    // Inject mock file ke req.file (untuk single)
    req.file = { 
        fieldname: fieldName, 
        buffer: Buffer.from('mock file data'),
        mimetype: 'application/pdf', // Default mimetype
    }; 
    // Inject mock ke req.files (untuk fields)
    req.files = {
        file_proposal: [{ buffer: Buffer.from('mock') }],
        file_surat_permohonan: [{ buffer: Buffer.from('mock') }],
        file_surat_pengantar: [{ buffer: Buffer.from('mock') }],
        file_surat_undangan: [{ buffer: Buffer.from('mock') }],
        foto_kegiatan: [{ buffer: Buffer.from('mock') }], 
        file_mou: [{ buffer: Buffer.from('mock') }],
        file_sertifikat: [{ buffer: Buffer.from('mock') }],
    };
    req.body = req.body || {}; 
    next();
};

const mockMulterMethods = {
    // Metode utama yang digunakan di semua routes
    single: jest.fn((fieldName) => mockFileMiddleware(fieldName)),
    array: jest.fn((fieldName) => mockFileMiddleware(fieldName)),
    fields: jest.fn(() => mockFileMiddleware('multiple_fields')),
    none: jest.fn(() => (req, res, next) => next()),
};

// Exports harus sesuai dengan named exports di src/middleware/multer.js
module.exports = {
    upload: mockMulterMethods, 
    uploadFile: mockMulterMethods, 
    uploadUMKM: mockMulterMethods,
    // Jika ada exports lain di multer.js (misalnya uploadNews, uploadProduct), tambahkan di sini
};
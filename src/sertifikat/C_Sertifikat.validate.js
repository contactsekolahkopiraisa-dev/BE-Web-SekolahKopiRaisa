const Joi = require("joi");


// POST CREATE SERTIFIKAT BARU
const createSchema = Joi.object({
    body: Joi.object({
        id_layanan: Joi.number().required(),
        link_sertifikat: Joi.string().min(3),
        file_sertifikat: Joi.string().min(3),
        // file_sertifikat di multer
        // antara file_sertifikat dan link minimal salah satu tidak boleh kosong
    })
        .or('link_sertifikat', 'file_sertifikat'),
    params: Joi.object({}), // kosong
    query: Joi.object({}),  // kosong
})


module.exports = {
    createSchema,
    // rejectSchema
}
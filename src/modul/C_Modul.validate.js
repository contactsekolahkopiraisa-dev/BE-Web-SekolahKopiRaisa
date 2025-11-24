const Joi = require("joi");


// POST CREATE MODUL BARU
const createSchema = Joi.object({
    judul_modul: Joi.string().min(3).required(),
    deskripsi: Joi.string().min(5).allow("").optional(),
    // file_modul di multer
})
// PUT UPDATE MODUL YANG SUDAH ADA
const updateSchema = Joi.object({
    judul_modul: Joi.string().min(3).empty("").optional(),
    deskripsi: Joi.string().min(5).empty("").optional(),
    // file_modul di multer
})
    .or("judul_modul", "deskripsi")
    .messages({
        "object.missing": "Minimal satu field harus diisi untuk update modul!"
    });


module.exports = {
    createSchema,
    updateSchema
}
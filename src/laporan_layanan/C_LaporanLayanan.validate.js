const Joi = require("joi");


// POST CREATE LAPORAN BARU
const createSchema = Joi.object({
    body: Joi.object({
        nama_p4s: Joi.string().min(3).required(),
        asal_kab_kota: Joi.string().min(5).required(),
        id_layanan: Joi.number().required(),
        // foto_kegiatan di multer
    }),
    params: Joi.object({}), // kosong
    query: Joi.object({}),  // kosong
})


module.exports = {
    createSchema
}
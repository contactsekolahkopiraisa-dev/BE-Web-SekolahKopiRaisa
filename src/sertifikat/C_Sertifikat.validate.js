const Joi = require("joi");


// POST CREATE SERTIFIKAT BARU
const createSchema = Joi.object({
    body: ({
        id_layanan: Joi.number().required(),
        // file_mou di multer
    }),
    params: Joi.object({}), // kosong
    query: Joi.object({}),  // kosong
})
// // PUT REJECT MOU
// const rejectSchema = Joi.object({
//     body: Joi.object({
//         alasan: Joi.string().min(3).required(),
//     }),
//     params: Joi.object({
//         id: Joi.number().required(),
//     }), // kosong
//     query: Joi.object({}),  // kosong
// })


module.exports = {
    createSchema,
    // rejectSchema
}
const { sertifikatService } = require("./C_Sertifikat.service");


const sertifikatController = {
    // GET SERTIFIKAT BY ID
    async getById(req, res, next) {
        try {
            const data = await sertifikatService.getById(req.params.id, req.user);
            res.status(200).json({ success: true, message: `Berhasil Mendapatkan sertifikat !`, data });
        } catch (err) {
            next(err);
        }
    },
    // POST SERTIFIKAT TO DB
    async create(req, res, next) {
        try {
            const data = await sertifikatService.create(req.body, req.file, req.user);
            res.status(201).json({ success: true, message: `Berhasil mengunggah sertifikat !`, data});
        } catch (err) {
            next(err);
        }
    },
}


module.exports = {
    sertifikatController
}
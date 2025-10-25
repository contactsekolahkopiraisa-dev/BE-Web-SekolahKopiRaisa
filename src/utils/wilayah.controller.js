// src/wilayah/wilayah.controller.js
const wilayahService = require('../utils/wilayah.service');

// GET /api/wilayah/provinces
async function provincesHandler(req, res) {
    try {
        const data = await wilayahService.getProvinces();
        return res.status(200).json(data);
    } catch (err) {
        console.error('provincesHandler error:', err.message);
        return res.status(502).json({ message: err.message || 'Upstream error' });
    }
}

// GET /api/wilayah/regencies/:provinceCode
async function regenciesHandler(req, res) {
    const { provinceCode } = req.params;
    if (!provinceCode) return res.status(400).json({ message: 'provinceCode param is required' });
    try {
        const data = await wilayahService.getRegencies(provinceCode);
        return res.status(200).json(data);
    } catch (err) {
        console.error('regenciesHandler error:', err.message);
        return res.status(502).json({ message: err.message || 'Upstream error' });
    }
}

// GET /api/wilayah/districts/:regencyCode
async function districtsHandler(req, res) {
    const { regencyCode } = req.params;
    if (!regencyCode) return res.status(400).json({ message: 'regencyCode param is required' });
    try {
        const data = await wilayahService.getDistricts(regencyCode);
        return res.status(200).json(data);
    } catch (err) {
        console.error('districtsHandler error:', err.message);
        return res.status(502).json({ message: err.message || 'Upstream error' });
    }
}

// GET /api/wilayah/villages/:districtCode
async function villagesHandler(req, res) {
    const { districtCode } = req.params;
    if (!districtCode) return res.status(400).json({ message: 'districtCode param is required' });
    try {
        const data = await wilayahService.getVillages(districtCode);
        return res.status(200).json(data);
    } catch (err) {
        console.error('villagesHandler error:', err.message);
        return res.status(502).json({ message: err.message || 'Upstream error' });
    }
}

module.exports = {
    provincesHandler,
    regenciesHandler,
    districtsHandler,
    villagesHandler,
};

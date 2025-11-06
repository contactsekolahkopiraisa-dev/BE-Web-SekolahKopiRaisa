// src/wilayah/wilayah.controller.js
const express = require('express');
const router = express.Router();
const wilayahService = require('../utils/wilayah.service');
const prisma = require('../db');

/**
 * GET /api/v1/wilayah/provinces
 * Ambil daftar provinsi dari API eksternal (filter: Jawa Timur only)
 */
router.get('/provinces', async (req, res) => {
  try {
    const allProvinces = await wilayahService.getProvinces({ useCache: true });
    
    console.log('[Controller] Provinces count:', allProvinces.length);
    
    // Pastikan allProvinces adalah array
    if (!Array.isArray(allProvinces)) {
      console.error('[Controller] allProvinces is not an array:', typeof allProvinces);
      return res.status(500).json({ 
        message: 'Invalid response format from wilayah API',
        debug: process.env.NODE_ENV === 'development' ? { 
          type: typeof allProvinces,
          isArray: Array.isArray(allProvinces)
        } : undefined
      });
    }
    
    // Filter hanya Jawa Timur (code: "35" atau 35)
    const jatim = allProvinces.find(p => 
      String(p.code) === '35' || p.code === 35
    );
    
    if (!jatim) {
      console.warn('[Controller] Jawa Timur not found in provinces list');
      return res.status(404).json({ 
        message: 'Provinsi Jawa Timur tidak ditemukan dalam data API',
        availableProvinces: allProvinces.slice(0, 5).map(p => ({ 
          code: p.code, 
          name: p.name 
        }))
      });
    }

    console.log('[Controller] Found Jawa Timur:', jatim);
    return res.status(200).json({ 
      success: true,
      data: [jatim] 
    });
    
  } catch (err) {
    console.error('[Controller] Error fetching provinces:', err);
    return res.status(500).json({ 
      message: 'Gagal mengambil data provinsi dari database',
      error: err.message,
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
  }
});

/**
 * GET /api/v1/wilayah/regencies/:provinceCode
 * Ambil daftar kabupaten berdasarkan kode provinsi (filter: Tapal Kuda only)
 */
router.get('/regencies/:provinceCode', async (req, res) => {
  try {
    const { provinceCode } = req.params;
    
    console.log('[Controller] Fetching regencies for province:', provinceCode);
    
    // Kabupaten Tapal Kuda yang diizinkan
    const tapalKudaCodes = ['35.08', '35.09', '35.10', '35.11', '35.12', '35.13', '35.14'];
    const tapalKudaNames = {
      '35.08': 'Lumajang',
      '35.09': 'Jember',
      '35.10': 'Banyuwangi',
      '35.11': 'Bondowoso',
      '35.12': 'Situbondo',
      '35.13': 'Probolinggo',
      '35.14': 'Pasuruan'
    };
    
    const allRegencies = await wilayahService.getRegencies(provinceCode, { useCache: true });
    
    console.log('[Controller] Total regencies fetched:', allRegencies.length);
    
    // Pastikan adalah array
    if (!Array.isArray(allRegencies)) {
      console.error('[Controller] allRegencies is not an array:', typeof allRegencies);
      return res.status(500).json({ 
        message: 'Invalid response format from wilayah API',
        debug: process.env.NODE_ENV === 'development' ? {
          type: typeof allRegencies,
          isArray: Array.isArray(allRegencies)
        } : undefined
      });
    }
    
    // Filter hanya kabupaten Tapal Kuda
    const tapalKudaRegencies = allRegencies.filter(r => 
      tapalKudaCodes.includes(String(r.code))
    );

    console.log('[Controller] Tapal Kuda regencies found:', tapalKudaRegencies.length);

    return res.status(200).json({ 
      success: true,
      data: tapalKudaRegencies,
      info: {
        total: tapalKudaRegencies.length,
        tapalKudaOnly: true
      }
    });
    
  } catch (err) {
    console.error('[Controller] Error fetching regencies:', err);
    return res.status(500).json({ 
      message: 'Gagal mengambil data kabupaten dari database',
      error: err.message,
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
  }
});

/**
 * GET /api/v1/wilayah/districts/:regencyCode
 * Ambil daftar kecamatan berdasarkan kode kabupaten
 */
router.get('/districts/:regencyCode', async (req, res) => {
  try {
    const { regencyCode } = req.params;
    
    console.log('[Controller] Fetching districts for regency:', regencyCode);
    
    const districts = await wilayahService.getDistricts(regencyCode, { useCache: true });
    
    console.log('[Controller] Districts fetched:', districts.length);
    
    // Pastikan adalah array
    if (!Array.isArray(districts)) {
      console.error('[Controller] districts is not an array:', typeof districts);
      return res.status(500).json({ 
        message: 'Invalid response format from wilayah API',
        debug: process.env.NODE_ENV === 'development' ? {
          type: typeof districts,
          isArray: Array.isArray(districts)
        } : undefined
      });
    }
    
    return res.status(200).json({ 
      success: true,
      data: districts,
      info: {
        total: districts.length,
        regencyCode: regencyCode
      }
    });
    
  } catch (err) {
    console.error('[Controller] Error fetching districts:', err);
    return res.status(500).json({ 
      message: 'Gagal mengambil data kecamatan dari database',
      error: err.message,
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
  }
});

/**
 * GET /api/v1/wilayah/villages/:districtCode
 * Ambil daftar desa/kelurahan berdasarkan kode kecamatan
 */
router.get('/villages/:districtCode', async (req, res) => {
  try {
    const { districtCode } = req.params;
    
    console.log('[Controller] Fetching villages for district:', districtCode);
    
    const villages = await wilayahService.getVillages(districtCode, { useCache: true });
    
    console.log('[Controller] Villages fetched:', villages.length);
    
    // Pastikan adalah array
    if (!Array.isArray(villages)) {
      console.error('[Controller] villages is not an array:', typeof villages);
      return res.status(500).json({ 
        message: 'Invalid response format from wilayah API',
        debug: process.env.NODE_ENV === 'development' ? {
          type: typeof villages,
          isArray: Array.isArray(villages)
        } : undefined
      });
    }
    
    return res.status(200).json({ 
      success: true,
      data: villages,
      info: {
        total: villages.length,
        districtCode: districtCode
      }
    });
    
  } catch (err) {
    console.error('[Controller] Error fetching villages:', err);
    return res.status(500).json({ 
      message: 'Gagal mengambil data desa/kelurahan dari database',
      error: err.message,
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
  }
});

/**
 * GET /api/v1/wilayah/validate/:villageCode
 * Validasi apakah desa ada di database Tapal Kuda (local DB)
 */
router.get('/validate/:villageCode', async (req, res) => {
  try {
    const { villageCode } = req.params;
    
    console.log('[Controller] Validating village code:', villageCode);
    
    // Parse village code
    const parsedCode = parseInt(villageCode);
    if (isNaN(parsedCode)) {
      return res.status(400).json({ 
        valid: false,
        message: 'Kode desa harus berupa angka'
      });
    }
    
    // Cek di database apakah desa ini ada di Tapal Kuda
    const desa = await prisma.desa.findFirst({
      where: { 
        id_desa: parsedCode
      },
      include: {
        kecamatan: {
          include: {
            kabupaten: {
              include: {
                provinsi: true
              }
            }
          }
        }
      }
    });

    if (!desa) {
      console.log('[Controller] Village not found in Tapal Kuda DB:', villageCode);
      return res.status(404).json({ 
        valid: false, 
        message: 'Desa tidak ditemukan di wilayah Tapal Kuda',
        villageCode: parsedCode
      });
    }

    console.log('[Controller] Village found in Tapal Kuda DB:', desa.nama_desa);
    
    return res.status(200).json({ 
      valid: true,
      message: 'Desa valid dan terdaftar di wilayah Tapal Kuda',
      data: {
        desa: desa.nama_desa,
        kecamatan: desa.kecamatan.nama_kecamatan,
        kabupaten: desa.kecamatan.kabupaten.nama_kabupaten,
        provinsi: desa.kecamatan.kabupaten.provinsi.nama_provinsi
      }
    });
    
  } catch (err) {
    console.error('[Controller] Error validating village:', err);
    return res.status(500).json({ 
      valid: false,
      message: 'Terjadi kesalahan saat validasi desa',
      error: err.message,
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
  }
});

module.exports = router;
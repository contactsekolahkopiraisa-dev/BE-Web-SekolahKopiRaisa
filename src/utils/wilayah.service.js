// src/utils/wilayah.service.js
// MENGGUNAKAN DATABASE LOKAL - TIDAK PAKAI API EKSTERNAL
const prisma = require('../db');

// simple in-memory cache
const cache = new Map();
const DEFAULT_TTL = 1000 * 60 * 60; // 1 jam

function getCache(key) {
    const v = cache.get(key);
    if (!v) return null;
    if (Date.now() > v.expiresAt) {
        cache.delete(key);
        return null;
    }
    return v.value;
}

function setCache(key, value, ttl = DEFAULT_TTL) {
    cache.set(key, { value, expiresAt: Date.now() + ttl });
}

function clearCache(key) {
    if (key) cache.delete(key);
    else cache.clear();
}

/**
 * Convert village code format: "35.09.21.2001" → 3509212001
 */
function parseVillageCode(code) {
    if (!code) return null;
    
    // Jika sudah integer, return langsung
    if (typeof code === 'number') return code;
    
    // Hapus semua titik dan convert ke integer
    const cleaned = String(code).replace(/\./g, '');
    const parsed = parseInt(cleaned);
    
    return isNaN(parsed) ? null : parsed;
}

/**
 * Get provinces - hanya return Jawa Timur dari DB lokal
 */
async function getProvinces({ useCache = true } = {}) {
    const key = 'wilayah:provinces:local';
    if (useCache) {
        const c = getCache(key);
        if (c) {
            console.log('[Cache HIT] provinces (local)');
            return c;
        }
    }
    
    try {
        const provinces = await prisma.provinsi.findMany({
            select: {
                id_provinsi: true,
                nama_provinsi: true
            }
        });
        
        // Transform ke format API-friendly
        const formatted = provinces.map(p => ({
            code: String(p.id_provinsi),
            name: p.nama_provinsi.toUpperCase(),
            id: p.id_provinsi
        }));
        
        console.log(`[Local DB] Loaded ${formatted.length} province(s)`);
        
        if (useCache) setCache(key, formatted);
        return formatted;
    } catch (err) {
        console.error('[getProvinces] Error:', err);
        throw new Error('Failed to fetch provinces from local DB: ' + err.message);
    }
}

/**
 * Get regencies - ambil dari DB lokal
 */
async function getRegencies(provinceCode, { useCache = true } = {}) {
    if (!provinceCode) throw new TypeError('provinceCode is required');
    
    const key = `wilayah:regencies:local:${provinceCode}`;
    if (useCache) {
        const c = getCache(key);
        if (c) {
            console.log(`[Cache HIT] regencies (local):${provinceCode}`);
            return c;
        }
    }
    
    try {
        const provinceId = parseInt(provinceCode);
        
        const regencies = await prisma.kabupaten.findMany({
            where: {
                id_provinsi: provinceId
            },
            select: {
                id_kabupaten: true,
                nama_kabupaten: true
            },
            orderBy: {
                id_kabupaten: 'asc'
            }
        });
        
        // Transform ke format API-friendly
        const formatted = regencies.map(r => {
            const kabCode = String(r.id_kabupaten);
            const provCode = kabCode.substring(0, 2);
            const regCode = kabCode.substring(2);
            
            return {
                code: `${provCode}.${regCode}`,
                name: r.nama_kabupaten.toUpperCase(),
                id: r.id_kabupaten
            };
        });
        
        console.log(`[Local DB] Loaded ${formatted.length} regencies for province ${provinceCode}`);
        
        if (useCache) setCache(key, formatted);
        return formatted;
    } catch (err) {
        console.error(`[getRegencies] Error for ${provinceCode}:`, err);
        throw new Error(`Failed to fetch regencies from local DB: ${err.message}`);
    }
}

/**
 * Get districts - ambil dari DB lokal
 */
async function getDistricts(regencyCode, { useCache = true } = {}) {
    if (!regencyCode) throw new TypeError('regencyCode is required');
    
    const key = `wilayah:districts:local:${regencyCode}`;
    if (useCache) {
        const c = getCache(key);
        if (c) {
            console.log(`[Cache HIT] districts (local):${regencyCode}`);
            return c;
        }
    }
    
    try {
        // Parse regency code: "35.09" → 3509
        const cleanCode = String(regencyCode).replace(/\./g, '');
        const regencyId = parseInt(cleanCode);
        
        const districts = await prisma.kecamatan.findMany({
            where: {
                id_kabupaten: regencyId
            },
            select: {
                id_kecamatan: true,
                nama_kecamatan: true
            },
            orderBy: {
                id_kecamatan: 'asc'
            }
        });
        
        // Transform ke format API-friendly
        const formatted = districts.map(d => {
            const distCode = String(d.id_kecamatan);
            const provCode = distCode.substring(0, 2);
            const regCode = distCode.substring(2, 4);
            const distNumCode = distCode.substring(4);
            
            return {
                code: `${provCode}.${regCode}.${distNumCode}`,
                name: d.nama_kecamatan.charAt(0).toUpperCase() + d.nama_kecamatan.slice(1).toLowerCase(),
                id: d.id_kecamatan
            };
        });
        
        console.log(`[Local DB] Loaded ${formatted.length} districts for regency ${regencyCode}`);
        
        if (useCache) setCache(key, formatted);
        return formatted;
    } catch (err) {
        console.error(`[getDistricts] Error for ${regencyCode}:`, err);
        throw new Error(`Failed to fetch districts from local DB: ${err.message}`);
    }
}

/**
 * Get villages - ambil dari DB lokal
 */
async function getVillages(districtCode, { useCache = true } = {}) {
    if (!districtCode) throw new TypeError('districtCode is required');
    
    const key = `wilayah:villages:local:${districtCode}`;
    if (useCache) {
        const c = getCache(key);
        if (c) {
            console.log(`[Cache HIT] villages (local):${districtCode}`);
            return c;
        }
    }
    
    try {
        // Parse district code: "35.09.01" → 350901
        const cleanCode = String(districtCode).replace(/\./g, '');
        const districtId = parseInt(cleanCode);
        
        const villages = await prisma.desa.findMany({
            where: {
                id_kecamatan: districtId
            },
            select: {
                id_desa: true,
                nama_desa: true
            },
            orderBy: {
                id_desa: 'asc'
            }
        });
        
        // Transform ke format API-friendly
        const formatted = villages.map(v => {
            const villageCode = String(v.id_desa);
            
            // Format: 3509012001 → "35.09.01.2001"
            if (villageCode.length >= 10) {
                const provCode = villageCode.substring(0, 2);
                const regCode = villageCode.substring(2, 4);
                const distNumCode = villageCode.substring(4, 6);
                const villNumCode = villageCode.substring(6);
                
                return {
                    code: `${provCode}.${regCode}.${distNumCode}.${villNumCode}`,
                    codeRaw: v.id_desa, // Untuk submit ke backend
                    name: v.nama_desa.charAt(0).toUpperCase() + v.nama_desa.slice(1).toLowerCase(),
                    id: v.id_desa
                };
            }
            
            // Fallback
            return {
                code: villageCode,
                codeRaw: v.id_desa,
                name: v.nama_desa.charAt(0).toUpperCase() + v.nama_desa.slice(1).toLowerCase(),
                id: v.id_desa
            };
        });
        
        console.log(`[Local DB] Loaded ${formatted.length} villages for district ${districtCode}`);
        
        if (useCache) setCache(key, formatted);
        return formatted;
    } catch (err) {
        console.error(`[getVillages] Error for ${districtCode}:`, err);
        throw new Error(`Failed to fetch villages from local DB: ${err.message}`);
    }
}

/**
 * Get village detail by ID
 */
async function getVillageDetail(villageId) {
    try {
        const parsedId = parseVillageCode(villageId);
        
        if (!parsedId) {
            throw new Error('Invalid village code format');
        }
        
        const village = await prisma.desa.findUnique({
            where: {
                id_desa: parsedId
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
        
        if (!village) return null;
        
        return {
            id_desa: village.id_desa,
            nama_desa: village.nama_desa,
            nama_kecamatan: village.kecamatan.nama_kecamatan,
            nama_kabupaten: village.kecamatan.kabupaten.nama_kabupaten,
            nama_provinsi: village.kecamatan.kabupaten.provinsi.nama_provinsi,
            full_address: `${village.nama_desa}, ${village.kecamatan.nama_kecamatan}, ${village.kecamatan.kabupaten.nama_kabupaten}, ${village.kecamatan.kabupaten.provinsi.nama_provinsi}`
        };
    } catch (err) {
        console.error('[getVillageDetail] Error:', err);
        throw new Error('Failed to get village detail: ' + err.message);
    }
}

module.exports = {
    getProvinces,
    getRegencies,
    getDistricts,
    getVillages,
    getVillageDetail,
    parseVillageCode,
    // cache utilities (optional)
    __cache: { getCache, setCache, clearCache },
};
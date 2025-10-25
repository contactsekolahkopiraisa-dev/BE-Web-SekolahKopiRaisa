// src/utils/wilayah.service.js
const wilayahApi = require('./wilayahId');

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

async function safeGet(path, retries = 2) {
    let errLast;
    for (let i = 0; i <= retries; i++) {
        try {
            const res = await wilayahApi.get(path);
            return res.data; // wilayah.id returns directly in data
        } catch (err) {
            errLast = err;
            const status = err?.response?.status;
            const isRetryable = !status || status >= 500 || err.code === 'ECONNABORTED';
            if (!isRetryable || i === retries) break;
            await new Promise(r => setTimeout(r, 150 * (i + 1))); // backoff
        }
    }
    // rethrow the last error so caller can handle
    throw errLast;
}

async function getProvinces({ useCache = true } = {}) {
    const key = 'wilayah:provinces';
    if (useCache) {
        const c = getCache(key);
        if (c) return c;
    }
    try {
        const data = await safeGet('/provinces.json');
        if (useCache) setCache(key, data);
        return data;
    } catch (err) {
        throw new Error('Failed to fetch provinces: ' + (err.message || 'upstream error'));
    }
}

async function getRegencies(provinceCode, { useCache = true } = {}) {
    if (!provinceCode) throw new TypeError('provinceCode is required');
    const key = `wilayah:regencies:${provinceCode}`;
    if (useCache) {
        const c = getCache(key);
        if (c) return c;
    }
    try {
        const data = await safeGet(`/regencies/${provinceCode}.json`);
        if (useCache) setCache(key, data);
        return data;
    } catch (err) {
        throw new Error(`Failed to fetch regencies for ${provinceCode}: ${err.message || 'upstream error'}`);
    }
}

async function getDistricts(regencyCode, { useCache = true } = {}) {
    if (!regencyCode) throw new TypeError('regencyCode is required');
    const key = `wilayah:districts:${regencyCode}`;
    if (useCache) {
        const c = getCache(key);
        if (c) return c;
    }
    try {
        const data = await safeGet(`/districts/${regencyCode}.json`);
        if (useCache) setCache(key, data);
        return data;
    } catch (err) {
        throw new Error(`Failed to fetch districts for ${regencyCode}: ${err.message || 'upstream error'}`);
    }
}

async function getVillages(districtCode, { useCache = true } = {}) {
    if (!districtCode) throw new TypeError('districtCode is required');
    const key = `wilayah:villages:${districtCode}`;
    if (useCache) {
        const c = getCache(key);
        if (c) return c;
    }
    try {
        const data = await safeGet(`/villages/${districtCode}.json`);
        if (useCache) setCache(key, data);
        return data;
    } catch (err) {
        throw new Error(`Failed to fetch villages for ${districtCode}: ${err.message || 'upstream error'}`);
    }
}

module.exports = {
    getProvinces,
    getRegencies,
    getDistricts,
    getVillages,
    // cache utilities (optional)
    __cache: { getCache, setCache, clearCache },
};

const axios = require('axios');
require('dotenv').config();

const wilayahApi = axios.create({
    baseURL: process.env.WILAYAH_API_BASE_URL || 'https://wilayah.id/api',
    timeout: 8000, // 8 detik timeout biar gak ngegantung
});

module.exports = wilayahApi;
const prisma = require('../db');
const ApiError = require('../utils/apiError');
const {
  getSalesDataByPartner,
  getSalesChartData,
  getTopProductsByPartner,
  getAllUMKMSalesData,
  getSalesChartDataAllUMKM
} = require('./penjualan.repository');

const PAJAK_RATE = 0.10; // 10%

/**
 * Format currency ke Rupiah
 */
const formatRupiah = (amount) => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(amount);
};

/**
 * Format nama bulan
 */
const getNamaBulan = (bulan) => {
  const namaBulan = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];
  return namaBulan[parseInt(bulan) - 1] || '';
};

/**
 * Hitung summary penjualan
 */
const calculateSummary = (orders) => {
  let totalQuantity = 0;
  let labaKotor = 0;

  orders.forEach(order => {
    order.orderItems.forEach(item => {
      totalQuantity += item.quantity;
      labaKotor += item.price * item.quantity;
    });
  });

  const pajak = labaKotor * PAJAK_RATE;
  const labaBersih = labaKotor - pajak;

  return {
    jumlahProdukTerjual: totalQuantity,
    labaKotor,
    pajak,
    labaBersih,
  };
};

/**
 * Get laporan penjualan untuk UMKM
 */
const getLaporanPenjualanUMKM = async (userId, filters) => {
  // 1. Cari partner berdasarkan user_id langsung dengan Prisma
  const partner = await prisma.partner.findUnique({
    where: {
      user_id: parseInt(userId),
    },
    include: {
      products: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });

  if (!partner) {
    throw new ApiError(404, 'Profil partner tidak ditemukan! Silakan hubungi admin.');
  }

  // 2. Get sales data
  const orders = await getSalesDataByPartner(partner.id, filters);

  // 3. Hitung summary
  const summary = calculateSummary(orders);

  // 4. Get chart data (penjualan per hari dalam bulan)
  const chartData = await getSalesChartData(partner.id, filters);

  // 5. Get top 5 products (berdasarkan jumlah terjual)
  const topProducts = await getTopProductsByPartner(partner.id, filters);

  // 6. Format periode
  const periode = filters.bulan && filters.tahun
    ? `${getNamaBulan(filters.bulan)} ${filters.tahun}`
    : 'Semua Periode';

  return {
    partner: {
      id: partner.id,
      nama: partner.name,
      owner: partner.owner_name,
    },
    periode,
    summary: {
      jumlahProdukTerjual: summary.jumlahProdukTerjual,
      labaBersih: formatRupiah(summary.labaBersih),
      labaKotor: formatRupiah(summary.labaKotor),
      pajak: formatRupiah(summary.pajak),
      persentasePajak: '10%',
    },
    chart: chartData,
    topProducts: topProducts.map((product, index) => ({
      ranking: index + 1,
      namaProduk: product.name,
      jumlahTerjual: product.totalQuantity,
      totalPendapatan: formatRupiah(product.totalRevenue),
    })),
  };
};

/**
 * Get laporan penjualan semua UMKM (admin)
 */
/**
 * Get laporan penjualan semua UMKM (admin)
 */
const getLaporanPenjualanAdmin = async (filters) => {
  // 1. Get semua partner yang punya user_id langsung dengan Prisma
  const partners = await prisma.partner.findMany({
    where: {
      user_id: {
        not: null,
      },
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });

  if (!partners || partners.length === 0) {
    throw new ApiError(404, 'Tidak ada data UMKM yang terdaftar.');
  }

  // 2. Get sales data untuk semua UMKM
  const allUMKMData = await getAllUMKMSalesData(filters);

  // 3. Get chart data untuk semua UMKM ← TAMBAHAN INI
  const chartData = await getSalesChartDataAllUMKM(filters);

  // 4. Hitung total keseluruhan
  let totalJumlahProduk = 0;
  let totalLabaKotor = 0;

  allUMKMData.forEach(umkm => {
    totalJumlahProduk += umkm.jumlahProdukTerjual;
    totalLabaKotor += umkm.labaKotorRaw;
  });

  const totalPajak = totalLabaKotor * PAJAK_RATE;
  const totalLabaBersih = totalLabaKotor - totalPajak;

  // 5. Format periode
  const periode = filters.bulan && filters.tahun
    ? `${getNamaBulan(filters.bulan)} ${filters.tahun}`
    : 'Semua Periode';

  return {
    periode,
    totalSummary: {
      totalJumlahProdukTerjual: totalJumlahProduk,
      totalLabaBersih: formatRupiah(totalLabaBersih),
      totalLabaKotor: formatRupiah(totalLabaKotor),
      totalPajak: formatRupiah(totalPajak),
    },
    chart: chartData, 
    umkmList: allUMKMData.map(umkm => ({
      partnerId: umkm.partnerId,
      namaUMKM: umkm.namaPartner,
      owner: umkm.owner,
      jumlahProdukTerjual: umkm.jumlahProdukTerjual,
      labaBersih: formatRupiah(umkm.labaBersih),
      labaKotor: formatRupiah(umkm.labaKotorRaw),
    })),
  };
};

/**
 * Get laporan penjualan berdasarkan partner_id (admin)
 */
const getLaporanPenjualanByPartnerId = async (partnerId, filters) => {
  // 1. Cari partner berdasarkan partner_id langsung dengan Prisma
  const partner = await prisma.partner.findUnique({
    where: { id: parseInt(partnerId) },
    include: {
      user: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });

  if (!partner) {
    throw new ApiError(404, 'Partner tidak ditemukan!');
  }

  // Pastikan partner punya user_id (berarti UMKM verified)
  if (!partner.user_id) {
    throw new ApiError(400, 'Partner ini belum terhubung dengan user UMKM.');
  }

  // 2. Get sales data
  const orders = await getSalesDataByPartner(partner.id, filters);

  // 3. Hitung summary
  const summary = calculateSummary(orders);

  // 4. Get chart data
  const chartData = await getSalesChartData(partner.id, filters);

  // 5. Get top 5 products
  const topProducts = await getTopProductsByPartner(partner.id, filters);

  // 6. Format periode
  const periode = filters.bulan && filters.tahun
    ? `${getNamaBulan(filters.bulan)} ${filters.tahun}`
    : 'Semua Periode';

  return {
    partner: {
      id: partner.id,
      nama: partner.name,
      owner: partner.owner_name,
      user: {
        id: partner.user.id,
        name: partner.user.name,
      },
    },
    periode,
    summary: {
      jumlahProdukTerjual: summary.jumlahProdukTerjual,
      labaBersih: formatRupiah(summary.labaBersih),
      labaKotor: formatRupiah(summary.labaKotor),
      pajak: formatRupiah(summary.pajak),
      persentasePajak: '10%',
    },
    chart: chartData,
    topProducts: topProducts.map((product, index) => ({
      ranking: index + 1,
      namaProduk: product.name,
      jumlahTerjual: product.totalQuantity,
      totalPendapatan: formatRupiah(product.totalRevenue),
    })),
  };
};

/**
 * Get top products untuk UMKM
 */
const getTopProductsUMKM = async (userId, filters) => {
  // 1. Cari partner
  const partner = await prisma.partner.findUnique({
    where: { user_id: parseInt(userId) },
  });

  if (!partner) {
    throw new ApiError(404, 'Profil partner tidak ditemukan! Silakan hubungi admin.');
  }

  // 2. Get top products
  const limit = filters.limit || 10;
  const topProducts = await getTopProductsByPartner(partner.id, filters);

  // 3. Format periode
  const periode = filters.bulan && filters.tahun
    ? `${getNamaBulan(filters.bulan)} ${filters.tahun}`
    : 'Semua Periode';

  return {
    partner: {
      id: partner.id,
      nama: partner.name,
      owner: partner.owner_name,
    },
    periode,
    limit,
    totalProducts: topProducts.length,
    products: topProducts.slice(0, limit).map((product, index) => ({
      ranking: index + 1,
      productId: product.id,
      namaProduk: product.name,
      gambarProduk: product.image,
      jumlahTerjual: product.totalQuantity,
      totalPendapatan: formatRupiah(product.totalRevenue),
    })),
  };
};

/**
 * Helper untuk build date filter
 */
const buildDateFilter = (filters) => {
  const where = {};

  if (filters.bulan && filters.tahun) {
    const month = parseInt(filters.bulan);
    const year = parseInt(filters.tahun);
    
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59, 999);

    where.created_at = {
      gte: startDate,
      lte: endDate,
    };
  } else if (filters.tahun) {
    const year = parseInt(filters.tahun);
    const startDate = new Date(year, 0, 1);
    const endDate = new Date(year, 11, 31, 23, 59, 59, 999);

    where.created_at = {
      gte: startDate,
      lte: endDate,
    };
  }

  return where;
};

/**
 * Get top products dari semua UMKM (untuk admin)
 */
const getTopProductsAllUMKM = async (filters) => {
  const dateFilter = buildDateFilter(filters);
  const limit = filters.limit || 10;

  // Get semua partner yang punya user_id
  const partners = await prisma.partner.findMany({
    where: {
      user_id: {
        not: null,
      },
    },
  });

  if (!partners || partners.length === 0) {
    throw new ApiError(404, 'Tidak ada data UMKM yang terdaftar.');
  }

  const partnerIds = partners.map(p => p.id);

  // Get all orders dengan produk dari semua partner
  const orders = await prisma.order.findMany({
    where: {
      status: 'DELIVERED',
      payment: {
        status: 'SUCCESS',
      },
      orderItems: {
        some: {
          partner_id: { in: partnerIds },
        },
      },
      ...dateFilter,
    },
    include: {
      orderItems: {
        where: {
          partner_id: { in: partnerIds },
        },
        include: {
          product: {
            select: {
              id: true,
              name: true,
              image: true,
            },
          },
          partner: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
    },
  });

  // Aggregate produk dari semua UMKM
  const productStats = {};

  orders.forEach(order => {
    order.orderItems.forEach(item => {
      const productId = item.product.id;

      if (!productStats[productId]) {
        productStats[productId] = {
          id: productId,
          name: item.product.name,
          image: item.product.image,
          partnerName: item.partner.name,
          partnerId: item.partner.id,
          totalQuantity: 0,
          totalRevenue: 0,
        };
      }

      productStats[productId].totalQuantity += item.quantity;
      productStats[productId].totalRevenue += item.price * item.quantity;
    });
  });

  // Sort by quantity dan ambil top N
  const topProducts = Object.values(productStats)
    .sort((a, b) => b.totalQuantity - a.totalQuantity)
    .slice(0, limit);

  // Format periode
  const periode = filters.bulan && filters.tahun
    ? `${getNamaBulan(filters.bulan)} ${filters.tahun}`
    : 'Semua Periode';

  return {
    periode,
    limit,
    totalProducts: topProducts.length,
    products: topProducts.map((product, index) => ({
      ranking: index + 1,
      productId: product.id,
      namaProduk: product.name,
      gambarProduk: product.image,
      namaUMKM: product.partnerName,
      partnerId: product.partnerId,
      jumlahTerjual: product.totalQuantity,
      totalPendapatan: formatRupiah(product.totalRevenue),
    })),
  };
};

module.exports = {
  getLaporanPenjualanUMKM,
  getLaporanPenjualanAdmin,
  getLaporanPenjualanByPartnerId,
  getTopProductsUMKM,
  getTopProductsAllUMKM,
};
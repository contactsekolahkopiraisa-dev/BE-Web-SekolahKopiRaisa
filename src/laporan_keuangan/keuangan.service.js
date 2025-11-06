// src/laporan_keuangan/keuangan.service.js
const {
  insertLaporanKeuangan,
  getAllLaporanKeuangan,
  findLaporanKeuanganById,
  findLaporanKeuanganByUserId,
  updateLaporanKeuanganById,
  deleteLaporanKeuanganById,
  getRingkasanKeuangan,
  getAllLaporanForAdmin,
  getTransactionsByFilters
} = require('./keuangan.repository');

const ApiError = require('../utils/apiError');
const prisma = require('../db');

/**
 * Helper: Format tanggal ke periode (Bulan Tahun)
 */
const formatPeriode = (date) => {
  const d = new Date(date);
  const bulan = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 
                 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
  return `${bulan[d.getMonth()]} ${d.getFullYear()}`;
};

/**
 * Create laporan keuangan baru (Admin only)
 */
const createLaporanKeuangan = async (data, userId, isAdmin = false) => {
  try {
    // Hanya admin yang bisa create laporan manual
    if (!isAdmin) {
      throw new ApiError(403, 'Hanya admin yang bisa membuat laporan keuangan');
    }

    if (!data.periode || !data.report_date) {
      throw new ApiError(400, 'Periode dan tanggal laporan wajib diisi');
    }

    const hasIncome = data.income !== undefined && data.income !== null && Number(data.income) > 0;
    const hasPengeluaran = data.pengeluarans && Array.isArray(data.pengeluarans) && data.pengeluarans.length > 0;

    if (!hasIncome && !hasPengeluaran) {
      throw new ApiError(400, 'Minimal isi pemasukan atau pengeluaran');
    }

    if (hasPengeluaran) {
      for (const p of data.pengeluarans) {
        if (!p.tanggal || !p.jumlah_pengeluaran) {
          throw new ApiError(400, 'Setiap pengeluaran harus memiliki tanggal dan jumlah');
        }
      }
    }

    const laporan = await insertLaporanKeuangan({
      id_user: userId,
      periode: data.periode,
      report_date: data.report_date,
      description: data.description,
      income: Number(data.income) || 0,
      pengeluarans: data.pengeluarans || []
    });

    return laporan;
  } catch (error) {
    throw error;
  }
};

/**
 * Get all laporan keuangan (laporan manual + pemasukan dari payment)
 * Admin only
 */
const getLaporanKeuangan = async (filters, user) => {
  try {
    if (!user.admin) {
      throw new ApiError(403, 'Akses ditolak – hanya admin yang diperbolehkan');
    }

    // 1. Ambil laporan manual dari admin
    const laporanManual = await getAllLaporanForAdmin(filters);

    // 2. Ambil pemasukan dari payment user
    const paymentOrders = await getTransactionsByFilters(filters);
    
    console.log(`📦 Laporan manual: ${laporanManual.length}`);
    console.log(`💰 Payment SUCCESS: ${paymentOrders.length}`);
    
    if (paymentOrders.length > 0) {
      console.log('Sample payment order:', JSON.stringify(paymentOrders[0], null, 2));
    }

    // 3. Gabungkan data
    const allData = [
      // Laporan manual (bisa ada pemasukan + pengeluaran)
      ...laporanManual.map(lap => ({
        source: 'manual',
        id: lap.id_financialreport,
        user: lap.User,
        periode: lap.periode,
        tanggal: lap.report_date,
        description: lap.description,
        pemasukan: Number(lap.income || 0),
        pengeluaran: Number(lap.expenses || 0),
        saldo: Number(lap.income || 0) - Number(lap.expenses || 0),
        detail_pengeluaran: lap.pengeluaran
      })),
      
      // Pemasukan dari payment (hanya pemasukan, pengeluaran = 0)
      ...paymentOrders.map(order => ({
        source: 'payment',
        id: order.id,
        order_id: order.id,
        user: order.user,
        periode: formatPeriode(order.created_at),
        tanggal: order.created_at,
        description: `Pembayaran Order #${order.id}`,
        pemasukan: Number(order.payment.amount || 0),
        pengeluaran: 0,  // Payment tidak ada pengeluaran
        saldo: Number(order.payment.amount || 0),
        payment_method: order.payment.method,
        payment_status: order.payment.status
      }))
    ];

    // 4. Sort by tanggal descending
    allData.sort((a, b) => new Date(b.tanggal) - new Date(a.tanggal));

    // 5. Hitung summary
    const totalIncome = allData.reduce((sum, item) => sum + Number(item.pemasukan || 0), 0);
    const totalExpenses = allData.reduce((sum, item) => sum + Number(item.pengeluaran || 0), 0);
    const saldo = totalIncome - totalExpenses;

    return {
      data: allData,
      summary: {
        total_income: totalIncome,
        total_expenses: totalExpenses,
        saldo: saldo,
        jumlah_transaksi: allData.length,
        detail: {
          jumlah_laporan_manual: laporanManual.length,
          jumlah_payment: paymentOrders.length,
          income_manual: laporanManual.reduce((sum, l) => sum + Number(l.income || 0), 0),
          income_payment: paymentOrders.reduce((sum, o) => sum + Number(o.payment.amount || 0), 0)
        }
      }
    };
  } catch (error) {
    throw error;
  }
};

/**
 * Get laporan keuangan by ID (hanya laporan manual)
 */
const getLaporanKeuanganById = async (id, user) => {
  try {
    const laporan = await findLaporanKeuanganById(id);

    if (!laporan) {
      throw new ApiError(404, 'Laporan keuangan tidak ditemukan');
    }

    if (!user.admin && laporan.id_user !== user.id) {
      throw new ApiError(403, 'Anda tidak memiliki akses ke laporan ini');
    }

    return laporan;
  } catch (error) {
    throw error;
  }
};

/**
 * Get laporan keuangan by User ID
 */
const getLaporanKeuanganByUserId = async (userId, requestUser) => {
  try {
    if (!requestUser.admin && requestUser.id !== Number(userId)) {
      throw new ApiError(403, 'Anda tidak memiliki akses ke data ini');
    }

    const laporan = await findLaporanKeuanganByUserId(userId);
    return laporan;
  } catch (error) {
    throw error;
  }
};

/**
 * Update laporan keuangan (hanya laporan manual, bisa tambah pengeluaran)
 */
const updateLaporanKeuangan = async (id, updateData, user) => {
  try {
    const existing = await findLaporanKeuanganById(id);
    if (!existing) {
      throw new ApiError(404, 'Laporan keuangan tidak ditemukan');
    }

    if (!user.admin) {
      throw new ApiError(403, 'Hanya admin yang bisa mengubah laporan');
    }

    if (updateData.pengeluarans) {
      updateData.id_user = existing.id_user;
    }

    const updated = await updateLaporanKeuanganById(id, updateData);
    return updated;
  } catch (error) {
    throw error;
  }
};

/**
 * Delete laporan keuangan (hanya laporan manual)
 */
const deleteLaporanKeuangan = async (id, user) => {
  try {
    const existing = await findLaporanKeuanganById(id);
    if (!existing) {
      throw new ApiError(404, 'Laporan keuangan tidak ditemukan');
    }

    if (!user.admin) {
      throw new ApiError(403, 'Hanya admin yang bisa menghapus laporan');
    }

    await deleteLaporanKeuanganById(id);
    return { message: 'Laporan keuangan berhasil dihapus' };
  } catch (error) {
    throw error;
  }
};

/**
 * Get ringkasan keuangan (laporan manual + payment)
 */
const getSummaryKeuangan = async (userId, filters, requestUser) => {
  try {
    if (!requestUser.admin && requestUser.id !== Number(userId)) {
      throw new ApiError(403, 'Anda tidak memiliki akses ke data ini');
    }

    // Cari UMKM langsung pakai prisma
    const umkm = await prisma.verifikasiUMKM.findFirst({
      where: { id_user: Number(userId) }
    });
    
    if (!umkm) {
      throw new ApiError(404, 'Data UMKM tidak ditemukan');
    }

    // Get summary dari laporan manual
    const summaryManual = await getRingkasanKeuangan(userId, filters);

    // Get summary dari payment
    const paymentOrders = await getTransactionsByFilters({
      ...filters,
      userId: userId
    });

    const totalIncomePayment = paymentOrders.reduce((sum, order) => 
      sum + Number(order.payment.amount || 0), 0
    );

    // Gabungkan summary
    const totalIncome = summaryManual.total_income + totalIncomePayment;
    const totalExpenses = summaryManual.total_expenses;
    const saldo = totalIncome - totalExpenses;

    return {
      umkm: {
        id_umkm: umkm.id_umkm,
        nama_umkm: umkm.nama_umkm,
        status_verifikasi: umkm.status_verifikasi
      },
      periode: filters.bulan && filters.tahun
        ? { bulan: filters.bulan, tahun: filters.tahun }
        : 'Semua periode',
      ringkasan: {
        total_income: totalIncome,
        total_expenses: totalExpenses,
        saldo: saldo,
        jumlah_transaksi: summaryManual.jumlah_transaksi + paymentOrders.length,
        detail: {
          income_manual: summaryManual.total_income,
          income_payment: totalIncomePayment,
          jumlah_laporan_manual: summaryManual.jumlah_transaksi,
          jumlah_payment: paymentOrders.length
        }
      }
    };
  } catch (error) {
    throw error;
  }
};

module.exports = {
  createLaporanKeuangan,
  getLaporanKeuangan,
  getLaporanKeuanganById,
  getLaporanKeuanganByUserId,
  updateLaporanKeuangan,
  deleteLaporanKeuangan,
  getSummaryKeuangan
};
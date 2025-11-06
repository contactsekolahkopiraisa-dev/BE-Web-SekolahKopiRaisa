// src/laporan_keuangan/keuangan.repository.js
const { get } = require('http');
const prisma = require('../db');

const _truncate = (v, max) => {
  if (v === null || v === undefined) return null;
  const s = String(v);
  return s.length > max ? s.slice(0, max) : s;
};

/**
 * Insert laporan keuangan baru dengan pengeluaran
 */
const insertLaporanKeuangan = async (data) => {
  try {
    const laporan = await prisma.financialReport.create({
      data: {
        id_user: data.id_user,
        periode: _truncate(data.periode, 50),
        report_date: new Date(data.report_date),
        description: data.description || null,
        income: data.income || 0,
        
        // Create pengeluaran jika ada
        pengeluaran: data.pengeluarans && data.pengeluarans.length > 0 ? {
          create: data.pengeluarans.map(p => ({
            id_user: data.id_user,
            tanggal: new Date(p.tanggal),
            jumlah_pengeluaran: Number(p.jumlah_pengeluaran),
            keterangan: p.keterangan || null
          }))
        } : undefined
      },
      include: {
        User: {
          select: {
            id: true,
            name: true,
            email: true,
            verifikasiUMKMs: {
              select: {
                id_umkm: true,
                nama_umkm: true,
                status_verifikasi: true
              }
            }
          }
        },
        pengeluaran: true
      }
    });
    
    // Calculate total expenses
    const totalExpenses = laporan.pengeluaran.reduce((sum, p) => sum + Number(p.jumlah_pengeluaran), 0);
    
    return {
      ...laporan,
      expenses: totalExpenses
    };
  } catch (error) {
    throw error;
  }
};

/**
 * Get all laporan keuangan dengan filter + calculate expenses
 */
const getAllLaporanKeuangan = async (filters = {}) => {
  try {
    const where = {};

    if (filters.id_user) {
      where.id_user = Number(filters.id_user);
    }

    if (filters.periode) {
      where.periode = {
        contains: filters.periode,
        mode: 'insensitive'
      };
    }

    if (filters.tanggal_dari || filters.tanggal_sampai) {
      where.report_date = {};
      if (filters.tanggal_dari) {
        where.report_date.gte = new Date(filters.tanggal_dari);
      }
      if (filters.tanggal_sampai) {
        where.report_date.lte = new Date(filters.tanggal_sampai);
      }
    }

    if (filters.bulan || filters.tahun) {
      if (filters.tahun) {
        const year = Number(filters.tahun);
        if (filters.bulan) {
          const month = Number(filters.bulan);
          const startDate = new Date(year, month - 1, 1);
          const endDate = new Date(year, month, 0);
          where.report_date = {
            gte: startDate,
            lte: endDate
          };
        } else {
          const startDate = new Date(year, 0, 1);
          const endDate = new Date(year, 11, 31);
          where.report_date = {
            gte: startDate,
            lte: endDate
          };
        }
      }
    }

    const laporan = await prisma.financialReport.findMany({
      where,
      include: {
        User: {
          select: {
            id: true,
            name: true,
            email: true,
            verifikasiUMKMs: {
              select: {
                id_umkm: true,
                nama_umkm: true,
                status_verifikasi: true
              }
            }
          }
        },
        pengeluaran: true
      },
      orderBy: {
        report_date: 'desc'
      }
    });

    // Calculate total expenses untuk setiap laporan
    const laporanWithExpenses = laporan.map(lap => {
      const totalExpenses = lap.pengeluaran.reduce((sum, p) => sum + Number(p.jumlah_pengeluaran), 0);
      return {
        ...lap,
        expenses: totalExpenses
      };
    });

    return laporanWithExpenses;
  } catch (error) {
    throw error;
  }
};

/**
 * Get laporan keuangan by ID
 */
const findLaporanKeuanganById = async (id) => {
  try {
    const laporan = await prisma.financialReport.findUnique({
      where: { id_financialreport: Number(id) },
      include: {
        User: {
          select: {
            id: true,
            name: true,
            email: true,
            phone_number: true,
            verifikasiUMKMs: {
              select: {
                id_umkm: true,
                nama_umkm: true,
                status_verifikasi: true,
                addresses: {
                  include: {
                    desa: {
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
                    }
                  }
                }
              }
            }
          }
        },
        pengeluaran: {
          orderBy: {
            tanggal: 'desc'
          }
        }
      }
    });
    
    if (!laporan) return null;
    
    // Calculate total expenses
    const totalExpenses = laporan.pengeluaran.reduce((sum, p) => sum + Number(p.jumlah_pengeluaran), 0);
    
    return {
      ...laporan,
      expenses: totalExpenses
    };
  } catch (error) {
    throw error;
  }
};

/**
 * Get laporan keuangan by User ID
 */
const findLaporanKeuanganByUserId = async (userId) => {
  try {
    const laporan = await prisma.financialReport.findMany({
      where: { id_user: Number(userId) },
      include: {
        User: {
          select: {
            id: true,
            name: true,
            email: true,
            verifikasiUMKMs: {
              select: {
                id_umkm: true,
                nama_umkm: true,
                status_verifikasi: true
              }
            }
          }
        },
        pengeluaran: true
      },
      orderBy: {
        report_date: 'desc'
      }
    });
    
    // Calculate expenses untuk setiap laporan
    const laporanWithExpenses = laporan.map(lap => {
      const totalExpenses = lap.pengeluaran.reduce((sum, p) => sum + Number(p.jumlah_pengeluaran), 0);
      return {
        ...lap,
        expenses: totalExpenses
      };
    });
    
    return laporanWithExpenses;
  } catch (error) {
    throw error;
  }
};

/**
 * Update laporan keuangan + pengeluaran
 */
const updateLaporanKeuanganById = async (id, updateData) => {
  try {
    const data = {};

    if (updateData.periode !== undefined) {
      data.periode = _truncate(updateData.periode, 50);
    }
    if (updateData.report_date !== undefined) {
      data.report_date = new Date(updateData.report_date);
    }
    if (updateData.description !== undefined) {
      data.description = updateData.description;
    }
    if (updateData.income !== undefined) {
      data.income = Number(updateData.income);
    }

    // Handle pengeluarans update
    // Strategy: Delete all old pengeluarans, create new ones
    if (updateData.pengeluarans !== undefined) {
      // Delete existing pengeluarans
      await prisma.pengeluaran.deleteMany({
        where: { id_financialreport: Number(id) }
      });
      
      // Create new pengeluarans
      if (updateData.pengeluarans && updateData.pengeluarans.length > 0) {
        data.pengeluaran = {
          create: updateData.pengeluarans.map(p => ({
            id_user: updateData.id_user,
            tanggal: new Date(p.tanggal),
            jumlah_pengeluaran: Number(p.jumlah_pengeluaran),
            keterangan: p.keterangan || null
          }))
        };
      }
    }

    const laporan = await prisma.financialReport.update({
      where: { id_financialreport: Number(id) },
      data,
      include: {
        User: {
          select: {
            id: true,
            name: true,
            email: true,
            verifikasiUMKMs: {
              select: {
                id_umkm: true,
                nama_umkm: true,
                status_verifikasi: true
              }
            }
          }
        },
        pengeluaran: true
      }
    });

    // Calculate total expenses
    const totalExpenses = laporan.pengeluaran.reduce((sum, p) => sum + Number(p.jumlah_pengeluaran), 0);

    return {
      ...laporan,
      expenses: totalExpenses
    };
  } catch (error) {
    throw error;
  }
};

/**
 * Delete laporan keuangan (cascade delete pengeluarans)
 */
const deleteLaporanKeuanganById = async (id) => {
  try {
    // Prisma akan auto-delete pengeluarans karena onDelete: Cascade
    const laporan = await prisma.financialReport.delete({
      where: { id_financialreport: Number(id) }
    });
    return laporan;
  } catch (error) {
    throw error;
  }
};

/**
 * Get ringkasan keuangan per user/UMKM
 */
const getRingkasanKeuangan = async (userId, filters = {}) => {
  try {
    const where = { id_user: Number(userId) };

    if (filters.bulan || filters.tahun) {
      if (filters.tahun) {
        const year = Number(filters.tahun);
        if (filters.bulan) {
          const month = Number(filters.bulan);
          const startDate = new Date(year, month - 1, 1);
          const endDate = new Date(year, month, 0);
          where.report_date = {
            gte: startDate,
            lte: endDate
          };
        } else {
          const startDate = new Date(year, 0, 1);
          const endDate = new Date(year, 11, 31);
          where.report_date = {
            gte: startDate,
            lte: endDate
          };
        }
      }
    }

    // Get all laporan with pengeluaran
    const laporans = await prisma.financialReport.findMany({
      where,
      include: {
        pengeluaran: true
      }
    });

    // Calculate totals
    const totalIncome = laporans.reduce((sum, lap) => sum + Number(lap.income || 0), 0);
    
    const totalExpenses = laporans.reduce((sum, lap) => {
      const lapExpenses = lap.pengeluaran.reduce((pSum, p) => pSum + Number(p.jumlah_pengeluaran), 0);
      return sum + lapExpenses;
    }, 0);

    return {
      total_income: totalIncome,
      total_expenses: totalExpenses,
      saldo: totalIncome - totalExpenses,
      jumlah_transaksi: laporans.length
    };
  } catch (error) {
    throw error;
  }
};

/**
 * Get laporan keuangan untuk admin (SEMUA laporan tanpa filter status)
 * FIXED: Tampilkan semua laporan yang ada di database
 */
const getAllLaporanForAdmin = async (filters = {}) => {
  try {
    const where = {};

    // Filter berdasarkan periode jika ada
    if (filters.periode) {
      where.periode = {
        contains: filters.periode,
        mode: 'insensitive'
      };
    }

    // Filter berdasarkan tanggal jika ada
    if (filters.tanggal_dari || filters.tanggal_sampai) {
      where.report_date = {};
      if (filters.tanggal_dari) {
        where.report_date.gte = new Date(filters.tanggal_dari);
      }
      if (filters.tanggal_sampai) {
        where.report_date.lte = new Date(filters.tanggal_sampai);
      }
    }

    // Filter berdasarkan bulan/tahun jika ada
    if (filters.bulan || filters.tahun) {
      if (filters.tahun) {
        const year = Number(filters.tahun);
        if (filters.bulan) {
          const month = Number(filters.bulan);
          const startDate = new Date(year, month - 1, 1);
          const endDate = new Date(year, month, 0);
          where.report_date = {
            gte: startDate,
            lte: endDate
          };
        } else {
          const startDate = new Date(year, 0, 1);
          const endDate = new Date(year, 11, 31);
          where.report_date = {
            gte: startDate,
            lte: endDate
          };
        }
      }
    }

    const laporan = await prisma.financialReport.findMany({
      where,
      include: {
        User: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            verifikasiUMKMs: {
              select: {
                id_umkm: true,
                nama_umkm: true,
                status_verifikasi: true
              }
            }
          }
        },
        pengeluaran: true
      },
      orderBy: {
        report_date: 'desc'
      }
    });

    // Calculate expenses
    const laporanWithExpenses = laporan.map(lap => {
      const totalExpenses = lap.pengeluaran.reduce((sum, p) => sum + Number(p.jumlah_pengeluaran), 0);
      return {
        ...lap,
        expenses: totalExpenses
      };
    });

    return laporanWithExpenses;
  } catch (error) {
    throw error;
  }
};

const getTransactionsByFilters = async (filters = {}) => {
  try {
    const where = {
      status: 'DELIVERED'  // Order yang sudah selesai
    };

    // Filter by userId jika ada
    if (filters.userId) {
      where.user_id = Number(filters.userId);
    }

    // Filter by tanggal range
    if (filters.tanggal_dari || filters.tanggal_sampai) {
      where.created_at = {};
      if (filters.tanggal_dari) {
        where.created_at.gte = new Date(filters.tanggal_dari);
      }
      if (filters.tanggal_sampai) {
        where.created_at.lte = new Date(filters.tanggal_sampai);
      }
    }

    // Filter by bulan/tahun
    if (filters.bulan || filters.tahun) {
      if (filters.tahun) {
        const year = Number(filters.tahun);
        if (filters.bulan) {
          const month = Number(filters.bulan);
          const startDate = new Date(year, month - 1, 1);
          const endDate = new Date(year, month, 0, 23, 59, 59);
          where.created_at = {
            gte: startDate,
            lte: endDate
          };
        } else {
          const startDate = new Date(year, 0, 1);
          const endDate = new Date(year, 11, 31, 23, 59, 59);
          where.created_at = {
            gte: startDate,
            lte: endDate
          };
        }
      }
    }

    const orders = await prisma.order.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        payment: true,
        orderItems: {  // ✅ TAMBAHKAN INI - include orderItems
          include: {
            product: {
              select: {
                name: true
              }
            }
          }
        }
      },
      orderBy: {
        created_at: 'desc'
      }
    });

    // Filter hanya yang payment SUCCESS
    const successOrders = orders.filter(order => 
      order.payment && order.payment.status === 'SUCCESS'
    );

    console.log(`📊 Order DELIVERED dengan Payment SUCCESS: ${successOrders.length}`);
    
    return successOrders;
  } catch (error) {
    console.error('❌ Error in getTransactionsByFilters:', error);
    throw error;
  }
};

module.exports = {
  insertLaporanKeuangan,
  getAllLaporanKeuangan,
  findLaporanKeuanganById,
  findLaporanKeuanganByUserId,
  updateLaporanKeuanganById,
  deleteLaporanKeuanganById,
  getRingkasanKeuangan,
  getAllLaporanForAdmin,
  getTransactionsByFilters
};
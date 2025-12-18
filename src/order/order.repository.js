const prisma = require("../db");

const findAllOrders = async (statusFilter) => {
    return prisma.order.findMany({
        where: {
            ...(statusFilter?.length > 0 && {
                status: { in: statusFilter },
            }),
        },
        include: {
            user: true,
            orderItems: {
                include: {
                    product: true,
                    partner: true,
                },
            },
            shippingAddress: true,
            payment: true,
            OrderCancellation: true,
        },
        orderBy: {
            created_at: "desc",
        },
    });
};

const findOrdersByUser = async (userId, statusFilter) => {
    return prisma.order.findMany({
        where: {
            user_id: userId,
            ...(statusFilter?.length > 0 && {
                status: { in: statusFilter },
            }),
        },
        include: {
            user: true,
            orderItems: {
                include: {
                    product: true,
                    partner: true,
                },
            },
            shippingAddress: true,
            payment: true,
            OrderCancellation: true,
        },
        orderBy: {
            created_at: "desc",
        },
    });
};

// NEW: Fungsi untuk mendapatkan orders berdasarkan partner
const findOrdersByPartner = async (partnerId, statusFilter) => {
    return prisma.order.findMany({
        where: {
            orderItems: {
                some: {
                    partner_id: partnerId,
                },
            },
            ...(statusFilter && {
                status: statusFilter,
            }),
        },
        include: {
            user: {
                select: {
                    id: true,
                    name: true,
                    phone_number: true,
                },
            },
            orderItems: {
                include: {
                    product: true,
                    partner: true,
                },
            },
            shippingAddress: true,
            payment: true,
            OrderCancellation: true,
        },
        orderBy: {
            created_at: "desc",
        },
    });
};

const findOrderDetailById = async (orderId) => {
    return prisma.order.findUnique({
        where: { id: parseInt(orderId) },
        include: {
            user: true,
            shippingAddress: true,
            shippingDetail: true,
            orderItems: {
                include: {
                    product: true,
                    partner: true,
                },
            },
            payment: true,
        },
    });
};

const findOrdersById = async (orderId) => {
    return await prisma.order.findUnique({
        where: { id: parseInt(orderId) },
        include: {
            orderItems: {
                include: {
                    product: true,
                    partner: true,
                },
            },
        }
    });
};

const findOrdersByPartnerId = async (partnerId) => {
    return await prisma.orderItem.findMany({
        where: {
            partner_id: parseInt(partnerId),
            notified_to_partner_at: null,
            order: {
                status: "PENDING",
            },
        },
        include: {
            product: true,
            order: {
                include: {
                    user: true,
                },
            },
            partner: true,
        },
    });
};

const markOrderItemsAsNotified = async (itemIds) => {
    if (!itemIds.length) return;

    await prisma.orderItem.updateMany({
        where: {
            id: { in: itemIds },
        },
        data: {
            notified_to_partner_at: new Date(),
        },
    });

    const relatedOrderItems = await prisma.orderItem.findMany({
        where: {
            id: { in: itemIds },
        },
        select: {
            order_id: true,
        },
    });

    const orderIds = [
        ...new Set(relatedOrderItems.map((item) => item.order_id)),
    ];

    if (orderIds.length > 0) {
        await prisma.order.updateMany({
            where: {
                id: { in: orderIds },
            },
            data: {
                status: "PROCESSING",
            },
        });
    }
};

const findAllComplietedOrders = async () => {
    return prisma.order.findMany({
        where: {
            status: "DELIVERED",
        },
        include: {
            user: true,
            orderItems: {
                include: {
                    product: {
                        include: {
                            partner: true,
                        },
                    },
                },
            },
            shippingAddress: true,
        },
        orderBy: {
            created_at: "desc",
        },
    });
};

const findUserComplietedOrders = async (userId) => {
    return prisma.order.findMany({
        where: {
            user_id: userId,
            status: "DELIVERED",
        },
        include: {
            user: true,
            orderItems: {
                include: {
                    product: {
                        include: {
                            partner: true,
                        },
                    },
                },
            },
            shippingAddress: true,
        },
        orderBy: {
            created_at: "desc",
        },
    });
};

const insertNewOrders = async (
    userId, {
        items,
        address,
        destination_id,
        destination_province,
        destination_city,
        destination_district,
        destination_subdistrict,
        parsedPosCode,
        paymentMethod,
        totalAmount,
        shipping_name,
        shipping_code,
        shipping_service,
        parsedCost,
    }
) => {
    // Transaksi HANYA untuk database operations
    const newOrder = await prisma.$transaction(async (tx) => {
        for (const item of items) {
            await tx.inventory.update({
                where: {
                    products_id: item.products_id,
                },
                data: {
                    stock: {
                        decrement: item.quantity,
                    },
                },
            });
        }
        
        return await tx.order.create({
            data: {
                user: { connect: { id: userId } },
                status: "PENDING",
                orderItems: {
                    create: items.map((item) => ({
                        product: { connect: { id: item.products_id } },
                        quantity: item.quantity,
                        price: item.price,
                        custom_note: item.custom_note || null,
                        partner: item.partner_id ? { connect: { id: item.partner_id } } : undefined,
                    })),
                },
                shippingAddress: {
                    create: {
                        address: address,
                        destination_id: destination_id || null,
                        destination_province: destination_province || null,
                        destination_city: destination_city || null,
                        destination_district: destination_district || null,
                        destination_subdistrict: destination_subdistrict || null,
                        destination_zip_code: parsedPosCode || null,
                    },
                },
                shippingDetail: {
                    create: {
                        shipping_name: shipping_name || null,
                        shipping_code: shipping_code || null,
                        service_name: shipping_service || null,
                        shipping_cost: parsedCost || 0,
                    },
                },
                payment: {
                    create: {
                        amount: totalAmount,
                        method: paymentMethod,
                        status: "PENDING",
                    },
                },
            },
            include: {
                user: true,
                orderItems: {
                    include: {
                        product: {
                            include: {
                                partner: true,
                            },
                        }
                    },
                },
                shippingAddress: true,
                shippingDetail: true,
                payment: true,
            },
        });
    }, {
        maxWait: 5000,
        timeout: 10000, // Tingkatkan timeout jadi 10 detik
    });
    
    // Panggil Midtrans API SETELAH transaksi selesai
    let midtransResult = null;
    if (paymentMethod !== "COD") {
        const { createMidtransSnapToken } = require("../utils/midtrans");
        midtransResult = await createMidtransSnapToken(newOrder);

        // Update payment dengan snap token
        await prisma.payment.update({
            where: { id: newOrder.payment.id },
            data: {
                snap_token: midtransResult?.snapToken || null,
                snap_redirect_url: midtransResult?.snapRedirectUrl || null,
            },
        });
    }
    
    return { ...newOrder, midtransResult };
};

const updatePaymentSnapToken = async (orderId, snapToken, snapRedirectUrl) => {
    const order = await prisma.order.findUnique({
        where: { id: orderId },
        include: { payment: true },
    });

    if (!order || !order.payment) {
        throw new Error("Order atau payment tidak ditemukan!");
    }

    await prisma.payment.update({
        where: { id: order.payment.id },
        data: {
            snap_token: snapToken,
            snap_redirect_url: snapRedirectUrl || null,
        },
    });

    const updatedOrder = await prisma.order.findUnique({
        where: { id: orderId },
        include: {
            user: true,
            orderItems: {
                include: {
                    product: {
                        include: {
                            partner: true,
                        },
                    },
                },
            },
            shippingAddress: true,
            payment: true,
        },
    });

    return updatedOrder;
};

const updateOrderPaymentStatus = async (orderId, { payment_status, payment_method }) => {
    const order = await prisma.order.findUnique({
        where: { id: orderId },
        include: { payment: true },
    });

    if (!order) {
        console.error(`Order dengan ID ${orderId} tidak ditemukan`);
        throw new Error(`Order dengan ID ${orderId} tidak ditemukan`);
    }

    if (!order.payment) {
        console.error(`Order dengan ID ${orderId} belum memiliki data pembayaran`);
        throw new Error(`Order dengan ID ${orderId} belum memiliki data pembayaran`);
    }

    const updatedPayment = await prisma.payment.update({
        where: { order_id: orderId },
        data: {
            status: payment_status,
            method: payment_method,
        },
    });

    return { order, updatedPayment };
};

const updateStatusOrders = async (orderId, newStatus) => {
    return await prisma.order.update({
        where: { id: parseInt(orderId) },
        data: {
            status: newStatus,
            updated_at: new Date(),
        },
    });
};

const createOrderCancellation = async (orderId, userId, reason) => {
    return await prisma.orderCancellation.create({
        data: {
            order_id: orderId,
            user_id: userId,
            reason: reason,
        },
    });
};

const updateItemOrders = async (orderId, updatedData) => {
    return await prisma.order.update({
        where: { id: parseInt(orderId) },
        data: updatedData,
    });
};

const deleteOrders = async (orderId) => {
    await prisma.orderItem.deleteMany({
        where: { order_id: parseInt(orderId) }
    });

    await prisma.payment.deleteMany({
        where: { order_id: parseInt(orderId) }
    });
    
    await prisma.shippingAddress.deleteMany({
        where: { order_id: parseInt(orderId) }
    });
    
    await prisma.shippingDetail.deleteMany({
        where: { order_id: parseInt(orderId) }
    });

    return await prisma.order.delete({
        where: { id: parseInt(orderId) }
    });
};

const deleteProductCartItems = async (userId, productIds) => {
    if (!productIds || productIds.length === 0) {
        return;
    }

    const result = await prisma.cartItem.deleteMany({
        where: {
            cart: {
                user_id: userId,
            },
            products_id: {
                in: productIds,
            },
        },
    });

    console.log(`✅ ${result.count} item berhasil dihapus dari keranjang user ID: ${userId}`);
    return result;
};

const getProductsByCartItem = async (cartItemIds) => {
    return await prisma.cartItem.findMany({
        where: { id: { in: cartItemIds } },
        include: {
            product: {
                include: {
                    partner: true,
                    inventory: {
                        select: {
                            stock: true,
                        }
                    }
                }
            }
        },
    });
};

const findProductsByIds = async (productIds) => {
    const products = await prisma.product.findMany({
        where: {
            id: { in: productIds.map(id => parseInt(id)) },
        },
        select: {
            id: true,
        }
    });
    return products.map(product => product.id);
};

const createNotification = async (notificationData) => {
    return await prisma.notification.create({
        data: notificationData,
    });
};

const findAllMyNotifikasi = async (userId) => {
    return await prisma.notification.findMany({
        where: { user_id: userId },
        orderBy: {
            created_at: "desc",
        },
        include: {
            user: true,
        }
    });
};

const markNotificationAsViewed = async (ref, userId) => {
    return await prisma.notification.updateMany({
        where: {
            id: parseInt(ref),
            user_id: userId,
        },
        data: {
            viewed: true,
        },
    });
};

const cancelOrderAndRestoreStock = async (order, userId, reason) => {
    const itemsToRestore = order.orderItems;

    return prisma.$transaction(async (tx) => {
        for (const item of itemsToRestore) {
            await tx.inventory.update({
                where: {
                    products_id: item.products_id,
                },
                data: {
                    stock: {
                        increment: item.quantity,
                    },
                },
            });
        }

        const updatedOrder = await tx.order.update({
            where: { id: order.id },
            data: {
                status: "CANCELED",
                updated_at: new Date(),
            },
        });

        await tx.orderCancellation.create({
            data: {
                order_id: order.id,
                user_id: userId,
                reason: reason,
            },
        });

        return updatedOrder;
    });
};

module.exports = {
    findAllOrders,
    findAllMyNotifikasi,
    findOrdersByUser,
    findOrdersByPartner,
    findOrdersById,
    findAllComplietedOrders,
    findUserComplietedOrders,
    findOrdersByPartnerId,
    findOrderDetailById,
    getProductsByCartItem,
    insertNewOrders,
    markOrderItemsAsNotified,
    markNotificationAsViewed,
    updatePaymentSnapToken,
    updateOrderPaymentStatus,
    updateStatusOrders,
    updateItemOrders,
    deleteOrders,
    cancelOrderAndRestoreStock,
    createOrderCancellation,
    createNotification,
    deleteProductCartItems,
};
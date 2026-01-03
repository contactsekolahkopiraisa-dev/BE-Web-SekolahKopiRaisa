const ApiError = require("../utils/apiError");
const { generatePartnerOrderNotification } = require("../utils/whatsapp");
const { OrderStatus } = require("@prisma/client");
const { PaymentMethod } = require("@prisma/client")
const { getProductsByIds } = require("../product/product.repository");
const { createMidtransSnapToken } = require("../utils/midtrans");
const { deleteCartItems } = require("../cart/cart.repository");
const rajaOngkirApi = require("../utils/rajaOngkir");
const qs = require('qs');
const prisma = require("../db");

const {
    findAllOrders,
    findAllMyNotifikasi,
    findOrdersByUser,
    findOrdersByPartnerId,
    findOrdersById,
    findAllComplietedOrders,
    findUserComplietedOrders,
    findOrdersByPartner,
    findOrderDetailById,
    getProductsByCartItem,
    insertNewOrders,
    markOrderItemsAsNotified,
    updatePaymentSnapToken,
    updateOrderPaymentStatus,
    updateStatusOrders,
    updateItemOrders,
    deleteOrders,
    deleteProductCartItems,
    createOrderCancellation,
    createNotification,
    cancelOrderAndRestoreStock,
    markNotificationAsViewed
} = require("./order.repository");
const { product, user } = require("../db");

const getAllOrders = async () => {
    const orders = await findAllOrders();
    if (!orders) {
        throw new ApiError(500, "Gagal mendapatkan data order!");
    }
    return orders;
};

const getOrdersByUser = async (userId, status) => {
    const orders = await findOrdersByUser(userId, status);
    if (!orders) {
        throw new ApiError(404, "Order tidak ditemukan!");
    }
    return orders;
};

const getOrdersByPartner = async (userId, status) => {
    // Cari partner berdasarkan user_id
    const partner = await prisma.partner.findUnique({
        where: { user_id: userId }
    });
    
    if (!partner) {
        throw new ApiError(404, "Profil partner tidak ditemukan! Silakan hubungi admin.");
    }

    // Cari orders yang mengandung produk dari partner ini
    const orders = await findOrdersByPartner(partner.id, status);
    
    if (!orders || orders.length === 0) {
        return []; // Tidak ada pesanan
    }

    return orders.map(order => ({
        orderId: order.id,
        statusOrder: order.status,
        createdAt: order.created_at,
        customerName: order.user?.name || "-",
        customerPhone: order.user?.phone_number || "-",
        items: order.orderItems
            .filter(item => item.partner_id === partner.id) // Hanya item dari partner ini
            .map(item => ({
                productId: item.product.id,
                productImage: item.product.image,
                name: item.product.name,
                quantity: item.quantity,
                price: item.price,
                subtotal: item.quantity * item.price,
                note: item.custom_note || "-",
            })),
        shippingAddress: order.shippingAddress?.address || "-",
        payment: {
            method: order.payment?.method,
            status: order.payment?.status,
            // Hanya tampilkan total untuk item partner ini
            amount: order.orderItems
                .filter(item => item.partner_id === partner.id)
                .reduce((sum, item) => sum + (item.quantity * item.price), 0)
        }
    }));
};

const getOrderHistoryByRole = async (userId, role, statusFilter) => {
    let orders;
    
    if (role === "admin") {
        orders = await findAllOrders(statusFilter);
    } else {
        orders = await findOrdersByUser(userId, statusFilter);
    }

    return orders.map(order => {
        // ✅ Helper untuk format status pembayaran yang lebih jelas
        const getPaymentStatusInfo = (paymentStatus) => {
            const statusMap = {
                'SUCCESS': { text: 'Lunas', color: 'green', isPaid: true },
                'PENDING': { text: 'Menunggu Pembayaran', color: 'yellow', isPaid: false },
                'FAILED': { text: 'Gagal', color: 'red', isPaid: false },
                'CANCEL': { text: 'Dibatalkan', color: 'gray', isPaid: false },
                'DENY': { text: 'Ditolak', color: 'red', isPaid: false },
                'EXPIRE': { text: 'Kedaluwarsa', color: 'orange', isPaid: false },
            };
            return statusMap[paymentStatus] || { text: 'Unknown', color: 'gray', isPaid: false };
        };

        const paymentStatusInfo = getPaymentStatusInfo(order.payment?.status);

        return {
            orderId: order.id,
            statusOrder: order.status,
            createdAt: order.created_at,
            updatedAt: order.updated_at,
            customerName: order.user?.name || "-",
            customerPhone: order.user?.phone_number || "-",
            items: order.orderItems.map(item => ({
                productId: item.product?.id,
                productImage: item.product?.image,
                name: item.product?.name || "-",
                quantity: item.quantity,
                price: item.price,
                subtotal: item.quantity * item.price,
                partner: {
                    id: item.partner?.id,
                    name: item.partner?.name || "Mitra"
                },
                note: item.custom_note || "-",
            })),
            shippingAddress: order.shippingAddress?.address || "-",
            payment: {
                method: order.payment?.method,
                status: order.payment?.status,
                amount: order.payment?.amount,
                // ✅ Informasi lengkap status pembayaran
                statusInfo: paymentStatusInfo,
                isPaid: paymentStatusInfo.isPaid,
            },
            cancellation: order.OrderCancellation ? {
                reason: order.OrderCancellation.reason,
                canceledAt: order.OrderCancellation.created_at,
            } : null,
        };
    });
};
const getCompleteOrderByRole = async (userId, role) => {
    if (role === "admin") {
        return await findAllComplietedOrders();
    } else {
        return await findUserComplietedOrders(userId);
    }
};

const createOrders = async (userId, orderData) => {
    console.log("Membuat order untuk user:", userId);
    console.log("Data order:", orderData);

    const {
        items,
        address,
        destination_id,
        destination_province,
        destination_city,
        destination_district,
        destination_subdistrict,
        destination_pos_code,
        paymentMethod,
        shipping_name,
        shipping_code,
        shipping_service,
        cost
    } = orderData;
    console.log("Items:", items);

    const parsedCost = parseInt(cost);
    if (isNaN(parsedCost)) {
        throw new ApiError(400, "Biaya pengiriman (cost) tidak valid!");
    }

    const parsedPosCode = parseInt(destination_pos_code);
    if (isNaN(parsedPosCode)) {
        throw new ApiError(400, "Kode pos tujuan (destination_pos_code) tidak valid!");
    }

    const parsedDestinationId = parseInt(destination_id);
    if (isNaN(parsedDestinationId)) {
        throw new ApiError(400, "ID tujuan (destination_id) tidak valid!");
    }

    if (!items || items.length === 0) {
        throw new ApiError(404, "Pesanan tidak boleh kosong");
    }
    if (!address || !paymentMethod) {
        throw new ApiError(404, "Alamat dan metode pembayaran wajib diisi");
    }

    const productIds = items.map((item) => item.products_id);
    productIds.forEach((id, index) => {
        console.log(`Tipe data productId di index ${index}:`, id, "-", typeof id);
    });

    const products = await getProductsByIds(productIds);
    console.log("Products_id yang ditemukan:", products);

    if (products.length !== items.length) {
        throw new ApiError(404, "Beberapa produk tidak ditemukan di database");
    }

    const productMap = Object.fromEntries(
        products.map(product => [product.id, product])
    );

    let totalProductPrice = 0;
    const itemsWithPrice = items.map((item) => {
        const product = productMap[item.products_id];
        if (!product) {
            throw new ApiError(404, `Produk dengan ID ${item.products_id} tidak ditemukan`);
        }
        if (!product.partner?.id) {
            throw new ApiError(400, `Produk ID ${product.id} belum memiliki partner!`);
        }

        const availableStock = product.inventory?.stock ?? 0;
        if (item.quantity > availableStock) {
            throw new ApiError(400, `Stok produk "${product.name}" tidak mencukupi. Tersedia: ${availableStock}, diminta: ${item.quantity}`);
        }

        const pricePerUnit = product.price;
        totalProductPrice += item.quantity * pricePerUnit;

        return {
            products_id: item.products_id,
            quantity: item.quantity,
            price: pricePerUnit,
            custom_note: item.custom_note || null,
            partner_id: product.partner?.id ?? null,
            fromCart: item.fromCart === true,
        };
    });

    const totalAmount = totalProductPrice + parsedCost;

    const fromCartProductId = itemsWithPrice
        .filter(item => item.fromCart)
        .map(item => item.products_id);

    const itemsToSave = itemsWithPrice.map(({ fromCart, ...rest }) => rest);

    const orders = await insertNewOrders(userId, {
        items: itemsToSave,
        address,
        destination_id: parsedDestinationId,
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
    }, async (order) => {
        return await createMidtransSnapToken(order);
    });

    if (!orders) {
        throw new ApiError(500, "Gagal membuat order!")
    };

    let paymentInfo;
    if (orders.payment.method === "COD") {
        paymentInfo = {
            type: "cod",
            snapToken: null,
            snapRedirectUrl: null,
        }
    } else {
        const midtransResult = orders.midtransResult;
        let snapToken = null;
        let snapRedirectUrl = null;

        if (midtransResult) {
            if (orders.payment.method === "QRIS") {
                snapRedirectUrl = midtransResult.qrUrl;
            } else {
                snapToken = midtransResult.snapToken;
                snapRedirectUrl = midtransResult.snapRedirectUrl;
            }
        }
        paymentInfo = {
            type: orders.payment.method === "QRIS" ? "qris" : "snap",
            snapToken,
            snapRedirectUrl,
        }
    }

    if (fromCartProductId.length > 0) {
        await deleteProductCartItems(userId, fromCartProductId);
    }

    return {
        updatedOrder: orders,
        paymentInfo,
    };
};

const handleMidtransNotification = async (notification) => {
    const {
        transaction_status,
        payment_type,
        order_id,
        fraud_status,
    } = notification;

    console.log("🔥 Midtrans Notification:", notification);
    
    if (!transaction_status || !payment_type || !order_id) {
        throw new ApiError(400, "Data tidak lengkap dari Midtrans");
    }

    const idMatch = order_id?.match(/ORDER-(\d+)-/);
    const orderId = idMatch ? parseInt(idMatch[1], 10) : null;

    if (!orderId) {
        throw new Error(`order_id tidak valid: ${order_id}`);
    }

    const internalStatus = mapTransactionStatus(transaction_status, payment_type, fraud_status);
    const paymentMethod = mapPaymentMethod(payment_type);

    if (!paymentMethod) {
        throw new Error(`Payment method '${payment_type}' tidak dikenali`);
    }

    console.log("✅ Parsed Order ID:", orderId);
    console.log("🔍 Mapped Payment Status:", internalStatus);
    console.log("💳 Mapped Payment Method:", paymentMethod);

    // Update payment status di database
    const { order, updatedPayment } = await updateOrderPaymentStatus(orderId, {
        payment_status: internalStatus,
        payment_method: paymentMethod,
    });

    // 🔥 AUTO-UPDATE ORDER STATUS jika pembayaran SUCCESS
    if (internalStatus === 'SUCCESS') {
        // Update order status dari PENDING ke PROCESSING
        if (order.status === 'PENDING') {
            await updateStatusOrders(orderId, OrderStatus.PROCESSING);
            console.log(`✅ Order ${orderId} status otomatis diubah ke PROCESSING (pembayaran berhasil)`);
        }

        // Kirim notifikasi ke customer
        try {
            await createNotificationForPaymentSuccess(order, updatedPayment);
        } catch (notificationError) {
            console.error(
                "⚠️ Gagal membuat notifikasi pembayaran untuk order:",
                orderId,
                notificationError
            );
        }
    }

    // 🔥 Jika pembayaran FAILED/EXPIRED/CANCEL
    if (['FAILED', 'EXPIRE', 'CANCEL', 'DENY'].includes(internalStatus)) {
        console.log(`⚠️ Order ${orderId} pembayaran gagal/dibatalkan: ${internalStatus}`);
        
        // Optional: Kirim notifikasi gagal bayar
        try {
            await createNotificationForPaymentFailed(order, updatedPayment, internalStatus);
        } catch (notificationError) {
            console.error("⚠️ Gagal membuat notifikasi kegagalan pembayaran:", orderId, notificationError);
        }
    }

    return updatedPayment;
};

const mapTransactionStatus = (status, type, fraud) => {
    switch (status) {
        case "capture":
            return type === "credit_card"
                ? (fraud === "challenge" ? "DENY" : "SUCCESS")
                : "SUCCESS";
        case "settlement":
            return "SUCCESS";
        case "pending":
            return "PENDING";
        case "deny":
            return "DENY";
        case "cancel":
            return "CANCEL";
        case "expire":
            return "EXPIRE";
        default:
            return "PENDING";
    }
};

const mapPaymentMethod = (type) => {
    const mapping = {
        bank_transfer: "BANK_TRANSFER",
        credit_card: "CREDIT_CARD",
        qris: "QRIS",
    };
    return mapping[type] || null;
};

const getOrderDetailById = async (orderId, isAdmin, userId) => {
    const order = await findOrderDetailById(orderId);
    
    if (!order) {
        throw new ApiError(404, "Order tidak ditemukan");
    }

    // Admin bisa akses semua order
    if (isAdmin) {
        return formatOrderDetail(order);
    }

    // Customer hanya bisa akses order miliknya
    if (order.user_id === userId) {
        return formatOrderDetail(order);
    }

    // UMKM hanya bisa akses order yang mengandung produk mereka
    const partner = await prisma.partner.findUnique({
        where: { user_id: userId }
    });
    
    if (partner) {
        const hasPartnerProduct = order.orderItems.some(
            item => item.partner_id === partner.id
        );
        
        if (hasPartnerProduct) {
            // Filter hanya item milik partner ini
            const filteredOrder = {
                ...order,
                orderItems: order.orderItems.filter(
                    item => item.partner_id === partner.id
                )
            };
            return formatOrderDetail(filteredOrder, true); // true = partner view
        }
    }

    throw new ApiError(403, "Anda tidak memiliki akses ke order ini");
};

const formatOrderDetail = (order, isPartnerView = false) => {
    const detail = {
        orderId: order.id,
        namaCustomer: order.user?.name || "-",
        nomerCustomer: order.user?.phone_number || "-",
        alamatCustomer: order.shippingAddress?.address || "-",
        provinsiCustomer: order.shippingAddress?.destination_province || "-",
        kotaCustomer: order.shippingAddress?.destination_city || "-",
        kodePos: order.shippingAddress?.destination_zip_code || "-",
        tanggalTransaksi: order.created_at,
        statusOrder: order.status,
        items: order.orderItems.map(item => ({
            namaProduk: item.product.name,
            gambarProduk: item.product.image,
            harga: item.price,
            quantity: item.quantity,
            catatan: item.custom_note,
            namaMitra: item.partner?.name || "-",
        })),
        metodePembayaran: order.payment?.method || "-",
        statusPembayaran: order.payment?.status || "-",
    };

    if (isPartnerView) {
        // Untuk partner, hitung hanya total item mereka
        detail.totalHarga = order.orderItems.reduce(
            (sum, item) => sum + (item.quantity * item.price), 
            0
        );
    } else {
        detail.totalHarga = order.payment?.amount ?? 0;
    }

    return detail;
};

const getOrderStatuses = (isAdmin) => {
    if (isAdmin) {
        return Object.values(OrderStatus);
    } else {
        return Object.values(OrderStatus).filter(status => 
            [OrderStatus.DELIVERED].includes(status)
        );
    }
};

const getDomestic = async (searchParams) => {
    const {
        search,
        limit = 1000,
        offset = 0
    } = searchParams;

    const response = await rajaOngkirApi.get('/destination/domestic-destination', {
        params: { search, limit, offset },
    });

    const allDataDomestic = response.data.data;
    console.log("Data semua domestic service(allDataDomestic):", allDataDomestic);

    if (!allDataDomestic || allDataDomestic.length === 0) {
        throw new ApiError(404, "Tidak ada data domestik ditemukan!");
    }

    return allDataDomestic
}

const getCost = async (searchCost) => {
    const payload = {
        courier: "jnt",
        origin: "31366",
        destination: searchCost.destination,
        weight: parseInt(searchCost.weight),
        price: searchCost.price,
    }

    console.log("Payload untuk ongkos kirim:", payload);

    try {
        const response = await rajaOngkirApi.post(
            '/calculate/domestic-cost',
            qs.stringify(payload),
            {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                }
            }
        );

        const responseData = response.data;
        if (!responseData || !responseData.data) {
            throw new ApiError(404, "Tidak ada data ongkos kirim ditemukan!");
        }

        return responseData;
    } catch (error) {
        console.error("Error dari getCost():", error?.response?.data || error.message);
        throw error;
    }
}

const getPaymentMethod = () => {
    return Object.values(PaymentMethod);
};

const updatedOrderStatus = async (orderId, newStatus, user) => {
    const order = await findOrdersById(orderId);
    if (!order) {
        throw new ApiError(404, "Pesanan tidak ditemukan!");
    }

    const isAdmin = user.admin;

    // Admin bisa mengubah status tertentu
    if (isAdmin) {
        if (
            ![
                OrderStatus.PROCESSING,
                OrderStatus.SHIPPED,
                OrderStatus.DELIVERED,
                OrderStatus.CANCELED,
            ].includes(newStatus)
        ) {
            throw new ApiError(
                403, "Admin hanya bisa mengubah status ke: PROCESSING, SHIPPED, DELIVERED, atau CANCELED"
            );
        }
    } else {
        // Cek apakah user adalah customer pemilik order
        const isCustomer = order.user_id === user.id;
        
        if (isCustomer) {
            // Customer hanya bisa tandai selesai dari SHIPPED
            if (
                newStatus === OrderStatus.DELIVERED &&
                order.status !== OrderStatus.SHIPPED
            ) {
                throw new ApiError(
                    403, "Pesanan hanya bisa ditandai selesai setelah dikirim"
                );
            }

            if (![OrderStatus.DELIVERED].includes(newStatus)) {
                throw new ApiError(
                    403, "Customer tidak berhak mengubah ke status tersebut"
                );
            }
        } else {
            // Cek apakah user adalah UMKM partner
            const partner = await prisma.partner.findUnique({
                where: { user_id: user.id }
            });
            
            if (!partner) {
                throw new ApiError(403, "Akses ditolak: bukan pesanan Anda");
            }

            // Cek apakah order mengandung produk dari partner ini
            const hasPartnerProduct = order.orderItems.some(
                item => item.partner_id === partner.id
            );

            if (!hasPartnerProduct) {
                throw new ApiError(403, "Akses ditolak: pesanan tidak mengandung produk Anda");
            }

            // Partner bisa mengubah status ke PROCESSING atau SHIPPED
            if (![OrderStatus.PROCESSING, OrderStatus.SHIPPED].includes(newStatus)) {
                throw new ApiError(
                    403, "Partner hanya bisa mengubah status ke: PROCESSING atau SHIPPED"
                );
            }
        }
    }

    return await prisma.$transaction(async (tx) => {
        // 1️⃣ Update order status
        const updatedOrder = await tx.order.update({
            where: { id: parseInt(orderId) },
            data: {
                status: newStatus,
                updated_at: new Date(),
            },
        });
        console.log(`✅ Order ${orderId} status updated to ${newStatus}`);

        // 2️⃣ Jika DELIVERED, update payment COD dan insert sales report
        if (newStatus === OrderStatus.DELIVERED) {
            console.log(`📦 Processing DELIVERED actions for order ${orderId}`);
            
            // Update payment COD ke SUCCESS
            if (order.payment?.method === 'COD' && order.payment.status !== 'SUCCESS') {
                await tx.payment.update({
                    where: { id: order.payment.id },
                    data: { 
                        status: 'SUCCESS',
                        updated_at: new Date()
                    }
                });
                console.log(`✅ Payment COD untuk order ${orderId} otomatis diupdate ke SUCCESS`);
            }

            // 3️⃣ Ambil order data lengkap dalam transaction (DATA TERBARU!)
            const orderForReport = await tx.order.findUnique({
                where: { id: parseInt(orderId) },
                include: {
                    orderItems: {
                        include: {
                            product: true,
                            partner: true,
                        },
                    },
                    payment: true,
                    user: true,
                },
            });

            console.log(`📊 Order data for sales report:`);
            console.log(`   - Status Order: ${orderForReport.status}`);
            console.log(`   - Status Payment: ${orderForReport.payment?.status}`);
            console.log(`   - Payment Method: ${orderForReport.payment?.method}`);
            console.log(`   - Total Items: ${orderForReport.orderItems.length}`);

            // 4️⃣ Validasi sebelum insert sales report
            if (orderForReport.status === 'DELIVERED' && orderForReport.payment?.status === 'SUCCESS') {
                // Cek apakah sudah ada di sales_report
                const existingReport = await tx.salesReport.findFirst({
                    where: { id_order: parseInt(orderId) },
                });

                if (existingReport) {
                    console.log(`ℹ️ Sales report untuk order ${orderId} sudah ada, skip insert`);
                } else {
                    // Filter hanya item yang punya partner_id
                    const validItems = orderForReport.orderItems.filter(item => item.partner_id);
                    
                    if (validItems.length > 0) {
                        const salesReportData = validItems.map(item => ({
                            id_order: orderForReport.id,
                            id_order_item: item.id,
                            id_product: item.products_id,
                            partner_id: item.partner_id,
                            quantity: item.quantity,
                            price_per_unit: item.price,
                            subtotal: item.quantity * item.price,
                            tanggal_transaksi: orderForReport.created_at,
                        }));

                        await tx.salesReport.createMany({
                            data: salesReportData,
                            skipDuplicates: true,
                        });

                        console.log(`✅ Sales report berhasil dibuat untuk order ${orderId} (${validItems.length} items)`);
                    } else {
                        console.warn(`⚠️ Order ${orderId} tidak ada item dengan partner`);
                    }
                }
            } else {
                console.warn(`⚠️ Order ${orderId} tidak memenuhi syarat sales report:`);
                console.warn(`   - Status: ${orderForReport.status} (expected: DELIVERED)`);
                console.warn(`   - Payment: ${orderForReport.payment?.status} (expected: SUCCESS)`);
            }
        }

        console.log(`✅ Transaction completed for order ${orderId}`);
        return updatedOrder;
    }, {
        maxWait: 5000, // Maksimal 5 detik untuk acquire transaction
        timeout: 10000, // Maksimal 10 detik untuk eksekusi
    });
}

const cancelOrder = async (orderId, user, reason) => {
    const order = await findOrdersById(orderId);
    if (!order) {
        throw new ApiError(404, "Pesanan tidak ditemukan.");
    }

    if (order.user_id !== user.id) {
        throw new ApiError(403, "Akses ditolak: bukan pesanan Anda.");
    }

    if (order.status !== OrderStatus.PENDING) {
        throw new ApiError(400, "Pesanan hanya bisa dibatalkan saat status masih PENDING.");
    }

    const updatedOrder = await cancelOrderAndRestoreStock(order, user.id, reason);
    if (!updatedOrder) {
        throw new ApiError(500, "Gagal membatalkan pesanan dan mengembalikan stok.");
    }

    try {
        await createNotificationForOrderCancellation(order, reason);
    } catch (notificationError) {
        console.error(
            "⚠️ Gagal membuat notifikasi pembatalan untuk order:",
            orderId,
            notificationError
        );
    }

    return updatedOrder;
};

const contactPartner = async (partnerId) => {
    if (!partnerId || isNaN(partnerId)) {
        throw new ApiError(400, "ID mitra tidak valid.");
    }

    console.log("Mencari order dengan ID:", partnerId);
    const orderItems = await findOrdersByPartnerId(partnerId);
    console.log("Order ditemukan:", orderItems);

    if (!orderItems || orderItems.length === 0) {
        throw new ApiError(404, "Tidak ada pesanan baru untuk mitra ini.");
    }

    const partner = orderItems[0].partner;
    if (!partner.phone_number || !/^\+?(\d{10,15})$/.test(partner.phone_number)) {
        throw new ApiError(400, "Nomor telepon mitra tidak tersedia atau tidak valid.");
    }

    const groupedOrders = {};

    orderItems.forEach((item) => {
        const orderId = item.order.id;
        if (!groupedOrders[orderId]) {
            groupedOrders[orderId] = {
                user: item.order.user,
                status: item.order.status,
                items: [],
            };
        }
        groupedOrders[orderId].items.push(item);
    });

    const orders = Object.entries(groupedOrders).map(([orderId, data]) => ({
        id: Number(orderId),
        user: data.user,
        status: data.status,
        orderItems: data.items,
    }));

    const result = generatePartnerOrderNotification(partner, orders);
    if (!result || !result.message) {
        throw new ApiError(500, "Gagal membuat pesan notifikasi untuk mitra.");
    }
    
    const itemIds = orderItems.map((i) => i.id);
    await markOrderItemsAsNotified(itemIds);

    return result;
};

const updateOrders = async (id, editedOrdersData) => {
    const existingOrders = await findOrdersById(id);
    if (!existingOrders) {
        throw new ApiError(404, "Order tidak ditemukan!");
    }

    const ordersData = await updateItemOrders(id, editedOrdersData);
    return ordersData;
};

const removeOrders = async (id) => {
    const existingOrders = await findOrdersById(id);

    if (!existingOrders) {
        throw new ApiError(404, "Order tidak ditemukan!");
    }
    
    const ordersData = await deleteOrders(id);

    if (!ordersData) {
        throw new ApiError(500, "Gagal menghapus order!");
    }
    return ordersData;
};

const createNotificationForNewOrder = async (userId, order) => {
    const itemCount = order.orderItems.length;
    const totalAmount = new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0
    }).format(order.payment.amount);

    const notificationName = `Pesanan #${order.id} Berhasil Dibuat`;
    const notificationDescription = `Pesanan Anda berisi ${itemCount} produk dengan total ${totalAmount} telah dibuat dan sedang menunggu pembayaran.`;

    const notificationData = {
        name: notificationName,
        description: notificationDescription,
        user_id: userId,
        order_id: order.id,
    };

    await createNotification(notificationData);
};

const createNotificationForPaymentSuccess = async (order, payment) => {
    const formattedAmount = new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0
    }).format(payment.amount);

    const notificationData = {
        name: `Pembayaran untuk Pesanan #${order.id} Berhasil`,
        description: `Pembayaran Anda sebesar ${formattedAmount} telah kami konfirmasi.`,
        user_id: order.user_id,
        order_id: order.id,
    };

    await createNotification(notificationData);
    console.log(`✅ Notifikasi pembayaran berhasil dibuat untuk order ID: ${order.id}`);
};

const createNotificationForOrderCancellation = async (order, reason) => {
    const notificationData = {
        name: `Pesanan #${order.id} Telah Dibatalkan`,
        description: `Pesanan Anda telah dibatalkan dengan alasan: "${reason}". Jika ini adalah kesalahan, silakan buat pesanan baru.`,
        user_id: order.user_id,
        order_id: order.id,
    };

    await createNotification(notificationData);
    console.log(`✅ Notifikasi pembatalan berhasil dibuat untuk order ID: ${order.id}`);
};

const readNotification = async (ref, userId) => {
    if (!ref) return;
    await markNotificationAsViewed(ref, userId);
};

const getMyNotifikasi = async (userId) => {
    const myNotifikasi = await findAllMyNotifikasi(userId);
    if (!myNotifikasi || myNotifikasi.length === 0) {
        throw new ApiError(404, "Tidak ada notifikasi ditemukan!");
    }

    return myNotifikasi
}

// ==================== FUNGSI BARU UNTUK UMKM ====================

// Get riwayat pesanan UMKM
const getUMKMOrderHistory = async (userId, statusFilter) => {
    const partner = await prisma.partner.findUnique({
        where: { user_id: userId }
    });
    
    if (!partner) {
        throw new ApiError(404, "Profil partner tidak ditemukan! Silakan hubungi admin.");
    }

    const orders = await prisma.order.findMany({
        where: {
            orderItems: {
                some: {
                    partner_id: partner.id,
                },
            },
            ...(statusFilter?.length > 0 && {
                status: { in: statusFilter },
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

    return orders.map(order => {
        const partnerItems = order.orderItems.filter(item => item.partner_id === partner.id);
        
        // ✅ Helper untuk format status pembayaran
        const getPaymentStatusInfo = (paymentStatus) => {
            const statusMap = {
                'SUCCESS': { text: 'Lunas', color: 'green', isPaid: true },
                'PENDING': { text: 'Menunggu Pembayaran', color: 'yellow', isPaid: false },
                'FAILED': { text: 'Gagal', color: 'red', isPaid: false },
                'CANCEL': { text: 'Dibatalkan', color: 'gray', isPaid: false },
                'DENY': { text: 'Ditolak', color: 'red', isPaid: false },
                'EXPIRE': { text: 'Kedaluwarsa', color: 'orange', isPaid: false },
            };
            return statusMap[paymentStatus] || { text: 'Unknown', color: 'gray', isPaid: false };
        };

        const paymentStatusInfo = getPaymentStatusInfo(order.payment?.status);
        
        return {
            orderId: order.id,
            statusOrder: order.status,
            createdAt: order.created_at,
            updatedAt: order.updated_at,
            customerName: order.user?.name || "-",
            customerPhone: order.user?.phone_number || "-",
            items: partnerItems.map(item => ({
                productId: item.product.id,
                productImage: item.product.image,
                name: item.product.name,
                quantity: item.quantity,
                price: item.price,
                subtotal: item.quantity * item.price,
                note: item.custom_note || "-",
            })),
            shippingAddress: order.shippingAddress?.address || "-",
            payment: {
                method: order.payment?.method,
                status: order.payment?.status,
                partnerAmount: partnerItems.reduce(
                    (sum, item) => sum + (item.quantity * item.price), 
                    0
                ),
                // ✅ Informasi lengkap status pembayaran
                statusInfo: paymentStatusInfo,
                isPaid: paymentStatusInfo.isPaid,
            },
            cancellation: order.OrderCancellation ? {
                reason: order.OrderCancellation.reason,
                canceledAt: order.OrderCancellation.created_at,
            } : null,
        };
    });
};

// Update status order oleh UMKM
const updateUMKMOrderStatus = async (orderId, newStatus, userId) => {
    const order = await findOrdersById(orderId);
    if (!order) {
        throw new ApiError(404, "Pesanan tidak ditemukan!");
    }

    const partner = await prisma.partner.findUnique({
        where: { user_id: userId }
    });
    
    if (!partner) {
        throw new ApiError(404, "Profil partner tidak ditemukan!");
    }

    const hasPartnerProduct = order.orderItems.some(
        item => item.partner_id === partner.id
    );

    if (!hasPartnerProduct) {
        throw new ApiError(403, "Akses ditolak: pesanan tidak mengandung produk Anda");
    }

    const allowedStatuses = [OrderStatus.PROCESSING, OrderStatus.SHIPPED];
    if (!allowedStatuses.includes(newStatus)) {
        throw new ApiError(403, "UMKM hanya bisa mengubah status ke: PROCESSING atau SHIPPED");
    }

    if (newStatus === OrderStatus.PROCESSING && order.status !== OrderStatus.PENDING) {
        throw new ApiError(400, "Status hanya bisa diubah ke PROCESSING dari status PENDING");
    }

    if (newStatus === OrderStatus.SHIPPED && order.status !== OrderStatus.PROCESSING) {
        throw new ApiError(400, "Status hanya bisa diubah ke SHIPPED dari status PROCESSING");
    }

    const updatedOrder = await updateStatusOrders(orderId, newStatus);

    try {
        await createNotificationForUMKMStatusChange(order, newStatus, partner.name);
    } catch (notifError) {
        console.error("⚠️ Gagal membuat notifikasi untuk order:", orderId, notifError);
    }

    return updatedOrder;
};

// Get daftar status yang bisa digunakan UMKM
const getUMKMOrderStatuses = () => {
    return [
        {
            value: OrderStatus.PROCESSING,
            label: "Diproses",
            description: "Pesanan sedang diproses oleh UMKM"
        },
        {
            value: OrderStatus.SHIPPED,
            label: "Dikirim",
            description: "Pesanan dalam pengiriman"
        }
    ];
};

// Helper: create notification untuk perubahan status oleh UMKM
const createNotificationForUMKMStatusChange = async (order, newStatus, partnerName) => {
    let statusText = "";
    let description = "";

    switch(newStatus) {
        case OrderStatus.PROCESSING:
            statusText = "Diproses";
            description = `Pesanan Anda #${order.id} sedang diproses oleh ${partnerName}.`;
            break;
        case OrderStatus.SHIPPED:
            statusText = "Dikirim";
            description = `Pesanan Anda #${order.id} telah dikirim oleh ${partnerName}.`;
            break;
        default:
            statusText = newStatus;
            description = `Status pesanan #${order.id} diubah menjadi ${newStatus}.`;
    }

    const notificationData = {
        name: `Pesanan #${order.id} - ${statusText}`,
        description: description,
        user_id: order.user_id,
        order_id: order.id,
    };

    await createNotification(notificationData);
    console.log(`✅ Notifikasi perubahan status berhasil dibuat untuk order ID: ${order.id}`);
};

// Get UMKM order detail by ID
const getUMKMOrderDetailById = async (orderId, userId) => {
    const order = await findOrderDetailById(orderId);
    
    if (!order) {
        throw new ApiError(404, "Pesanan tidak ditemukan");
    }

    const partner = await prisma.partner.findUnique({
        where: { user_id: userId }
    });
    
    if (!partner) {
        throw new ApiError(404, "Profil partner tidak ditemukan!");
    }

    const hasPartnerProduct = order.orderItems.some(
        item => item.partner_id === partner.id
    );

    if (!hasPartnerProduct) {
        throw new ApiError(403, "Akses ditolak: pesanan tidak mengandung produk Anda");
    }

    // Filter hanya item milik partner ini
    const partnerItems = order.orderItems.filter(
        item => item.partner_id === partner.id
    );

    return {
        orderId: order.id,
        statusOrder: order.status,
        createdAt: order.created_at,
        updatedAt: order.updated_at,
        customerName: order.user?.name || "-",
        customerPhone: order.user?.phone_number || "-",
        shippingAddress: {
            address: order.shippingAddress?.address || "-",
            province: order.shippingAddress?.destination_province || "-",
            city: order.shippingAddress?.destination_city || "-",
            district: order.shippingAddress?.destination_district || "-",
            subdistrict: order.shippingAddress?.destination_subdistrict || "-",
            zipCode: order.shippingAddress?.destination_zip_code || "-",
        },
        items: partnerItems.map(item => ({
            productId: item.product.id,
            productImage: item.product.image,
            name: item.product.name,
            quantity: item.quantity,
            price: item.price,
            subtotal: item.quantity * item.price,
            note: item.custom_note || "-",
        })),
        payment: {
            method: order.payment?.method,
            status: order.payment?.status,
            partnerAmount: partnerItems.reduce(
                (sum, item) => sum + (item.quantity * item.price), 
                0
            ),
        },
        cancellation: order.OrderCancellation ? {
            reason: order.OrderCancellation.reason,
            canceledAt: order.OrderCancellation.created_at,
        } : null,
    };
};

// ==================== SALES REPORT ====================

/**
 * Insert data ke sales_report ketika order DELIVERED
 */
const insertToSalesReport = async (orderId, orderData = null) => {
    const order = orderData || await prisma.order.findUnique({
        where: { id: orderId },
        include: {
            orderItems: {
                include: {
                    product: true,
                    partner: true,
                },
            },
            payment: true,
        },
    });

    if (!order) {
        throw new Error('Order tidak ditemukan');
    }

    // DEBUGGING
    console.log(`📊 Checking sales report for order ${orderId}:`);
    console.log(`   Status Order: ${order.status}`);
    console.log(`   Status Payment: ${order.payment?.status}`);
    console.log(`   Payment Method: ${order.payment?.method}`);

    // Validasi: Hanya insert jika DELIVERED & SUCCESS
    if (order.status !== 'DELIVERED' || order.payment?.status !== 'SUCCESS') {
        console.log(`⚠️ Order ${orderId} belum memenuhi syarat untuk sales report`);
        console.log(`   Reason: Status=${order.status}, PaymentStatus=${order.payment?.status}`);
        return;
    }

    // Cek apakah sudah pernah di-insert
    const existingReport = await prisma.salesReport.findFirst({
        where: { id_order: orderId },
    });

    if (existingReport) {
        console.log(`ℹ️ Sales report untuk order ${orderId} sudah ada`);
        return;
    }

    // Filter hanya orderItem yang punya partner_id
    const validItems = order.orderItems.filter(item => item.partner_id);
    
    if (validItems.length === 0) {
        console.warn(`⚠️ Order ${orderId} tidak ada item dengan partner`);
        return;
    }

    // Insert ke sales_report untuk setiap orderItem
    const salesReportData = validItems.map(item => ({
        id_order: order.id,
        id_order_item: item.id,
        id_product: item.products_id,
        partner_id: item.partner_id,
        quantity: item.quantity,
        price_per_unit: item.price,
        subtotal: item.quantity * item.price,
        tanggal_transaksi: order.created_at,
    }));

    await prisma.salesReport.createMany({
        data: salesReportData,
        skipDuplicates: true, // ← Safety net
    });

    console.log(`✅ Sales report berhasil dibuat untuk order ${orderId} (${validItems.length} items)`);
};

const createNotificationForPaymentFailed = async (order, payment, status) => {
    let statusText = '';
    let description = '';

    switch(status) {
        case 'FAILED':
            statusText = 'Pembayaran Gagal';
            description = `Pembayaran untuk pesanan #${order.id} gagal diproses. Silakan coba lagi atau hubungi customer service.`;
            break;
        case 'EXPIRE':
            statusText = 'Pembayaran Kedaluwarsa';
            description = `Batas waktu pembayaran untuk pesanan #${order.id} telah habis. Silakan buat pesanan baru.`;
            break;
        case 'CANCEL':
            statusText = 'Pembayaran Dibatalkan';
            description = `Pembayaran untuk pesanan #${order.id} telah dibatalkan.`;
            break;
        case 'DENY':
            statusText = 'Pembayaran Ditolak';
            description = `Pembayaran untuk pesanan #${order.id} ditolak oleh sistem pembayaran. Silakan gunakan metode pembayaran lain.`;
            break;
        default:
            statusText = 'Pembayaran Bermasalah';
            description = `Terjadi masalah dengan pembayaran pesanan #${order.id}. Status: ${status}`;
    }

    const notificationData = {
        name: `Pesanan #${order.id} - ${statusText}`,
        description: description,
        user_id: order.user_id,
        order_id: order.id,
    };

    await createNotification(notificationData);
    console.log(`✅ Notifikasi kegagalan pembayaran dibuat untuk order ID: ${order.id}`);
};

module.exports = {
    getDomestic,
    getAllOrders,
    getOrdersByUser,
    getOrdersByPartner,
    getMyNotifikasi,
    getCompleteOrderByRole,
    getCost,
    getOrderDetailById,
    getOrderStatuses,
    getOrderHistoryByRole,
    getPaymentMethod,
    createOrders,
    contactPartner,
    cancelOrder,
    createNotificationForNewOrder,
    createNotificationForOrderCancellation,
    createNotificationForPaymentSuccess,
    handleMidtransNotification,
    updateOrders,
    updatedOrderStatus,
    removeOrders,
    readNotification,
    // FUNGSI BARU UNTUK UMKM
    getUMKMOrderHistory,
    getUMKMOrderDetailById,
    updateUMKMOrderStatus,
    getUMKMOrderStatuses,
    insertToSalesReport,
    createNotificationForPaymentFailed,
};
const midtransClient = require("midtrans-client");

// ============================================
// MIDTRANS CLIENT SETUP
// ============================================
const snap = new midtransClient.Snap({
    isProduction: false, // Ubah ke true untuk production
    serverKey: process.env.MIDTRANS_SERVER_KEY,
    clientKey: process.env.MIDTRANS_CLIENT_KEY,
});

const coreApi = new midtransClient.CoreApi({
    isProduction: false, // Ubah ke true untuk production
    serverKey: process.env.MIDTRANS_SERVER_KEY,
    clientKey: process.env.MIDTRANS_CLIENT_KEY,
});

// ============================================
// MAPPING PAYMENT METHOD
// ============================================
const mapPaymentMethodToMidtransType = (method) => {
    switch (method.toUpperCase()) {
        case "QRIS":
            return "qris";
        case "CREDIT_CARD":
            return "credit_card";
        case "BANK_TRANSFER":
            return "bank_transfer";
        default:
            return null;
    }
};

// ============================================
// CREATE MIDTRANS SNAP TOKEN / QR CODE
// ============================================
const createMidtransSnapToken = async (order) => {
    console.log("🔄 Creating Midtrans payment for order:", order.id);
    
    // Map payment method
    const paymentType = mapPaymentMethodToMidtransType(order.payment.method);

    if (!paymentType) {
        throw new Error(`Metode pembayaran '${order.payment.method}' tidak didukung.`);
    }

    // ============================================
    // SETUP CUSTOMER DATA
    // ============================================
    const customer = {
        first_name: order.user.name || "User",
        last_name: "",
        email: order.user.email || "user@example.com",
        phone: order.user.phone_number || "081234567890",
    };

    // ============================================
    // SETUP ITEM DETAILS
    // ============================================
    const items = order.orderItems.map((item) => ({
        id: item.product.id.toString(),
        name: item.product.name,
        price: item.price,
        quantity: item.quantity,
    }));

    // Tambahkan ongkir sebagai item
    if (order.shippingDetail && order.shippingDetail.shipping_cost > 0) {
        items.push({
            id: 'SHIPPING',
            name: `Ongkos Kirim - ${order.shippingDetail.shipping_name || "Pengiriman"}`,
            price: order.shippingDetail.shipping_cost,
            quantity: 1,
        });
    }

    // Hitung total
    const grossAmount = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const orderId = `ORDER-${order.id}-${Date.now()}`;

    console.log("💰 Total Amount:", grossAmount);
    console.log("📦 Order ID for Midtrans:", orderId);

    // ============================================
    // QRIS PAYMENT (via Core API)
    // ============================================
    if (paymentType === "qris") {
        console.log("🔄 Processing QRIS payment...");
        
        const parameter = {
            payment_type: "qris",
            transaction_details: {
                order_id: orderId,
                gross_amount: grossAmount,
            },
            item_details: items,
            customer_details: customer,
            qris: {
                acquirer: "gopay", 
            },
        };

        try {
            const chargeResponse = await coreApi.charge(parameter);
            console.log("✅ QRIS Charge Response:", chargeResponse);
            
            // Cari QR Code URL dari actions
            const qrAction = chargeResponse.actions?.find((a) => a.name === "generate-qr-code");
            const qrUrl = qrAction?.url || null;
            
            if (!qrUrl) {
                throw new Error("QR Code URL tidak ditemukan dalam response Midtrans");
            }
            
            return { 
                type: "qris", 
                qrUrl,
                snapToken: null,
                snapRedirectUrl: qrUrl // Untuk compatibility
            };
        } catch (error) {
            console.error("❌ QRIS Error:", error);
            throw new Error("Gagal membuat QRIS payment: " + error.message);
        }
    }

    // ============================================
    // OTHER PAYMENTS (via Snap API)
    // ============================================
    console.log("🔄 Processing", paymentType, "payment...");
    
    const snapParameter = {
        transaction_details: {
            order_id: orderId,
            gross_amount: grossAmount,
        },
        item_details: items,
        customer_details: customer,
        enabled_payments: [paymentType],
    };

    try {
        const snapResponse = await snap.createTransaction(snapParameter);
        console.log("✅ Snap Response:", snapResponse);
        
        return {
            type: "snap",
            snapToken: snapResponse.token,
            snapRedirectUrl: snapResponse.redirect_url || `https://app.sandbox.midtrans.com/snap/v2/vtweb/${snapResponse.token}`,
            qrUrl: null
        };
    } catch (error) {
        console.error("❌ Snap Error:", error);
        throw new Error("Gagal membuat Snap token: " + error.message);
    }
};

module.exports = { 
    createMidtransSnapToken,
    snap,
    coreApi
};
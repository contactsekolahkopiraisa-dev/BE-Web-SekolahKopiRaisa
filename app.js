const express = require("express");
const dotenv = require("dotenv");
const cookieParser = require("cookie-parser");
const passport = require("passport");
const cors = require("cors");
const session = require("express-session");
const swaggerUi = require("swagger-ui-express");
const swaggerJsdoc = require("swagger-jsdoc");
const swaggerDocument = require("./src/document/swagger-final.json");
// const passportLink = require('./src/auth/facebook-config');

dotenv.config();

// Inisialisasi konfigurasi Passport
require("./src/auth/passport-config");
require("./src/auth/facebook-config");

const { createMidtransSnapToken } = require("./src/utils/midtrans");

const app = express();
const port = process.env.PORT || 3000;

// === CORS Config ===
const allowedOrigins = [
  "https://sekolah-kopi-raisa.vercel.app",
  "https://sekolahkopiraisa.vercel.app",
  "https://be-web-sekolah-kopi-raisa.vercel.app",
  "http://localhost:3000",
  "http://localhost:5000", // Frontend local port
  "http://localhost:2000",
  "http://127.0.0.1:2000",
  "http://127.0.0.1:3000",
  "http://127.0.0.1:5000", // Frontend local port
];

const corsOptions = {
  origin: function (origin, callback) {
    console.log("🔍 CORS Request from origin:", origin);

    // Allow requests with no origin (like mobile apps, Postman, etc.)
    if (!origin) {
      console.log("✅ No origin - allowing request");
      callback(null, true);
      return;
    }

    // Allow localhost always (for development)
    if (origin && origin.includes("localhost")) {
      console.log("✅ Localhost detected - allowing request");
      callback(null, true);
      return;
    }

    if (allowedOrigins.includes(origin)) {
      console.log("✅ Origin allowed:", origin);
      callback(null, true);
    } else {
      console.log("❌ Origin blocked:", origin);
      console.log("📝 Allowed origins:", allowedOrigins);
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: [
    "Content-Type",
    "Authorization",
    "X-Requested-With",
    "Accept",
  ],
  exposedHeaders: ["Content-Range", "X-Content-Range"],
  optionsSuccessStatus: 200,
};

// === Middleware ===
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(cors(corsOptions));

// Handle preflight requests
app.options("*", cors(corsOptions));

// === Session Middleware ===
app.use(
  session({
    secret: process.env.SESSION_SECRET || "kopi-secret",
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === "production", // true untuk Vercel
      httpOnly: true,
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      maxAge: 24 * 60 * 60 * 1000, // 1 hari
    },
  })
);

// === Passport ===
app.use(passport.initialize());
app.use(passport.session());

// === Logging ===
app.use((req, res, next) => {
  console.log(`[${req.method}] ${req.originalUrl}`);
  next();
});

// === Routes ===
const newsController = require("./src/content/news.controller");
const authRoutes = require("./src/auth/user.controller");
const partnerRoutes = require("./src/partners/partner.controller");
const productRoutes = require("./src/product/product.controller");
const cartRoutes = require("./src/cart/cart.controller");
const orderRoutes = require("./src/order/order.controller");
const companyRoutes = require("./src/company/company.controller");
const wilayahRoutes = require("./src/utils/wilayah.controller");

// === LAPORAN
const umkmRoutes = require("./src/auth/umkm.controller");
const keuanganRoutes = require("./src/laporan_keuangan/keuangan.controller");

// === LAYANAN
const {
  jenisLayananRoutes,
  layananRoutes,
  targetPesertaRoutes,
} = require("./src/layanan/C_Layanan.routes");
const { modulRoutes } = require("./src/modul/C_Modul.routes");
const { mouRoutes } = require("./src/mou/C_Mou.routes");
const {
  laporanLayananRoutes,
} = require("./src/laporan_layanan/C_LaporanLayanan.routes");
const { sertifikatRoutes } = require("./src/sertifikat/C_Sertifikat.routes");

app.use(express.json());

// Default Endpoint
app.get("/", (req, res) => {
  res.send("Halo kopi raisa!");
});

// Main API Routes
app.use("/api/v1/news", newsController);
app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/partner", partnerRoutes);
app.use("/api/v1/product", productRoutes);
app.use("/api/v1/cart", cartRoutes);
app.use("/api/v1/order", orderRoutes);
app.use("/api/v1/company", companyRoutes);

// === LAPORAN
app.use("/api/v1/auth/umkm", umkmRoutes);
app.use("/api/v1/laporan-keuangan", keuanganRoutes);
app.use("/api/v1/wilayah", wilayahRoutes);

// === LAYANAN
app.use("/api/v1/layanan", layananRoutes);
app.use("/api/v1/jenis-layanan", jenisLayananRoutes);
app.use("/api/v1/target-peserta", targetPesertaRoutes);
app.use("/api/v1/modul", modulRoutes);
app.use("/api/v1/mou", mouRoutes);
app.use("/api/v1/laporan-layanan", laporanLayananRoutes);
app.use("/api/v1/sertifikat", sertifikatRoutes);

// === Swagger Documentation ===
// Serve raw swagger.json for external tools
app.get("/swagger.json", (req, res) => {
  res.json(swaggerDocument);
});

// Custom Swagger UI HTML with CDN
app.get("/api-docs", (req, res) => {
  const protocol =
    req.secure || req.headers["x-forwarded-proto"] === "https"
      ? "https"
      : "http";
  const host = req.get("host");
  const swaggerJsonUrl = `${protocol}://${host}/swagger.json`;

  const html = `
  <!DOCTYPE html>
  <html>
    <head>
      <title>API Sekolah Kopi Raisa</title>
      <link rel="stylesheet" type="text/css" href="https://unpkg.com/swagger-ui-dist@4.15.5/swagger-ui.css" />
      <style>
        .swagger-ui .topbar { display: none }
        html { box-sizing: border-box; overflow: -moz-scrollbars-vertical; overflow-y: scroll; }
        *, *:before, *:after { box-sizing: inherit; }
        body { margin:0; background: #fafafa; }
      </style>
    </head>
    <body>
      <div id="swagger-ui"></div>
      <script src="https://unpkg.com/swagger-ui-dist@4.15.5/swagger-ui-bundle.js"></script>
      <script src="https://unpkg.com/swagger-ui-dist@4.15.5/swagger-ui-standalone-preset.js"></script>
      <script>
        window.onload = function() {
          const ui = SwaggerUIBundle({
            url: '${swaggerJsonUrl}',
            dom_id: '#swagger-ui',
            deepLinking: true,
            presets: [
              SwaggerUIBundle.presets.apis,
              SwaggerUIStandalonePreset
            ],
            plugins: [
              SwaggerUIBundle.plugins.DownloadUrl
            ],
            layout: "StandaloneLayout"
          });
        };
      </script>
    </body>
  </html>`;

  res.send(html);
});

// Redirect /api-docs/ to /api-docs
app.get("/api-docs/", (req, res) => {
  res.redirect("/api-docs");
});

// === Middleware untuk menangani endpoint tidak ditemukan (404) ===
app.use((req, res, next) => {
  res.status(404).json({
    success: false,
    message: "Endpoint tidak ditemukan",
  });
});

// === Global Error Handler ===
app.use((err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  const message = err.message || "Terjadi kesalahan pada server.";

  res.status(statusCode).json({
    success: false,
    message,
  });

  console.error(
    "❌ Error: [",
    statusCode,
    "] ",
    message,
    "\nstack: ",
    err.stack
  );
});

// === Start Server (Lokal Only) ===
if (process.env.NODE_ENV !== "production") {
  app.listen(port, () => {
    console.log(`Server is running on... http://localhost:${port}`);
  });
}

module.exports = app; // Penting untuk deployment ke Vercel

// import express from 'express';
// import userRoutes from './user/user.routes.js';

// const app = express();

// app.use(express.json());

// // ROOT ROUTE
// app.get("/", (req, res) => {
//     res.send("Hello Express + Prisma");
// });
// // USER ROUTES
// app.use("/user", userRoutes);

// app.listen(3000, () => {console.log("Server berjalan di http://localhost:3000")});

module.exports = {
    authMiddleware: (req, res, next) => { 
        const role = req.headers['x-user-role'];
        req.user = { 
            id: role === "admin" ? 1 : 2, 
            role: role || 'customer', 
            admin: role === "admin" 
        };
        next();
    },
    roleMiddleware: (...allowedRoles) => (req, res, next) => {
        const userRole = req.user?.role;
        if (!userRole || !allowedRoles.includes(userRole)) {
            return res.status(403).json({ success: false, message: "Akses ditolak: Role tidak diizinkan." });
        }
        next();
    },
    // Mock handler untuk MulterError agar tidak mengganggu.
    multerErrorHandler: (err, req, res, next) => next(), 
    // Exports lain yang mungkin digunakan di routes
    validateAboutCompanyMedia: (req, res, next) => next(),
    validateUpdateCompanyMedia: (req, res, next) => next(),
    validateProductMedia: (req, res, next) => next(),
    validateProductUpdate: () => (req, res, next) => next(),
    companyMulterErrorHandler: (err, req, res, next) => next(),
};
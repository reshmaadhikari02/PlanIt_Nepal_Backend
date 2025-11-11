const authorizeRoles = (...allowedRoles) => {
    return (req, res, next) => {
        const userRole = req.user.role;
        if (!userRole) {
            return res.status(403).json({ success: false, message: "User role not found" });
        }
        if (userRole === "admin" || allowedRoles.includes(userRole)) {
            return next();
        }
        return res.status(403).json({ success: false, message: "Access denied: Insufficient permissions" });
    };
};

module.exports = authorizeRoles;

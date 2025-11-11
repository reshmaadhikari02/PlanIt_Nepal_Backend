const { verifyToken } = require("../utils/tokenHelpers");

const authMiddleware = (req, res, next) => {
    try {
        if (!req?.headers) {
            return res.status(500).json({ message: "Internal Server Error" });
        }

        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.toLowerCase().startsWith("bearer ")) {
            return res.status(401).json({ message: "No token, authorization denied" });
        }

        const accessToken = authHeader.split(" ")[1].trim();
        const secret = process.env.ACCESS_TOKEN_SECRET;
        if (!secret) {
            throw new Error("ACCESS_TOKEN_SECRET not defined");
        }

        const decoded = verifyToken(accessToken, secret);
        req.user = decoded;
        next();
    } catch (error) {
        if (error.name === "TokenExpiredError") {
            return res.status(401).json({ message: "accessToken expired" });
        }
        if (error.name === "JsonWebTokenError") {
            return res.status(401).json({ message: "Invalid accessToken" });
        }
        return res.status(500).json({ message: "Server error during authentication" });
    }
};

module.exports = authMiddleware;

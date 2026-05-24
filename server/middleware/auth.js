const jwt = require('jsonwebtoken');

module.exports = function (req, res, next) {
    const token = req.header('x-auth-token');
    if (!token) {
        return res.status(401).json({ msg: 'No token, authorization denied' });
    }
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        if (!decoded || !decoded.admin || !decoded.admin.id) {
            return res.status(401).json({ msg: 'Admin token is not valid' });
        }

        // Verify that the token is not a candidate token
        if (decoded.candidate) {
            return res.status(401).json({ msg: 'Access denied: Candidate cannot access admin routes' });
        }

        req.admin = decoded.admin;
        next();
    } catch (err) {
        res.status(401).json({ msg: 'Token is not valid' });
    }
};

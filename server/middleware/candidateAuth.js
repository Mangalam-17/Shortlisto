const jwt = require('jsonwebtoken');

module.exports = function (req, res, next) {
    const token = req.header('x-auth-token');
    if (!token) {
        return res.status(401).json({ msg: 'No token, authorization denied' });
    }
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        if (!decoded || !decoded.candidate || !decoded.candidate.id) {
            return res.status(401).json({ msg: 'Candidate token is not valid' });
        }

        // Verify that the token is not an admin token
        if (decoded.admin) {
            return res.status(401).json({ msg: 'Access denied: Admins cannot access candidate routes' });
        }

        req.candidate = decoded.candidate;
        next();
    } catch (err) {
        res.status(401).json({ msg: 'Token is not valid' });
    }
};

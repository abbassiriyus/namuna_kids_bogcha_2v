const jwt = require('jsonwebtoken');

module.exports = function (req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // <-- MUHIM

  if (!token) return res.status(401).json({ message: 'Token kerak' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'mysecretkey');
    req.user = decoded;
    next();
  } catch (err) {
    res.status(403).json({ message: 'Token noto‘g‘ri yoki muddati tugagan' });
  }
};

const jwt = require("jsonwebtoken");

const protect = (req, res, next) => {
  let token;

  // 1. Check for Authorization header
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    try {
      // 2. Extract token
      token = req.headers.authorization.split(" ")[1];
      // 3. Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // 4. Attach user ID to request
      req.user = decoded.id;

      // 5. Allow access
      next();

    } catch (error) {
      return res.status(401).json({ message: "Not authorized, token failed" });
    }
  }

  // 6. No token
  if (!token) {
    return res.status(401).json({ message: "Not authorized, no token" });
  }
};


module.exports = protect;
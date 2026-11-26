import { createRemoteJWKSet, jwtVerify } from "jose";

// BetterAuth runs inside the Next.js app and exposes the public keys here.
const AUTH_URL = process.env.AUTH_URL || "http://localhost:3000";
const ISSUER = "mentor-lagbe";
const AUDIENCE = "mentor-lagbe-api";

const JWKS = createRemoteJWKSet(new URL(`${AUTH_URL}/api/auth/jwks`));

// Check the Bearer token and put the logged-in user on the request.
export const verifyToken = async (req, res, next) => {
  try {
    const header = req.headers.authorization || "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : null;

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Please sign in first",
      });
    }

    const { payload } = await jwtVerify(token, JWKS, {
      issuer: ISSUER,
      audience: AUDIENCE,
    });

    req.user = {
      id: payload.sub,
      email: payload.email,
      role: payload.role,
      plan: payload.plan,
    };

    next();
  } catch {
    return res.status(401).json({
      success: false,
      message: "Invalid or expired token",
    });
  }
};

// One small helper used by the three role checks below.
const requireRole = (role) => (req, res, next) => {
  if (req.user?.role !== role) {
    return res.status(403).json({
      success: false,
      message: `${role} access only`,
    });
  }

  next();
};

export const verifyStudent = requireRole("student");
export const verifyTutor = requireRole("tutor");
export const verifyAdmin = requireRole("admin");

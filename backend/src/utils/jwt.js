import jwt from 'jsonwebtoken';

export const signJwt = (payload, options = {}) => {
	return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '7d', ...options });
};

export const verifyJwt = (token) => jwt.verify(token, process.env.JWT_SECRET);
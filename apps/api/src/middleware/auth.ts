import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface AuthenticatedRequest extends Request {
  user?: {
    userId: string;
  };
}

export const authenticateToken = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: { message: 'Unauthorized' } });
  }

  const accessSecret = process.env.JWT_ACCESS_SECRET;
  if (!accessSecret) {
    return res.status(500).json({ error: { message: 'Internal Server Error' } });
  }

  jwt.verify(token, accessSecret, (err, decoded) => {
    if (err) {
      return res.status(403).json({ error: { message: 'Forbidden: Invalid token' } });
    }

    req.user = decoded as { userId: string };
    next();
  });
};

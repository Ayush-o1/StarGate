import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { prisma } from '@stargate/database';
import { RegisterSchema, LoginSchema, AuthResponse } from '@stargate/shared';

const generateTokens = (userId: string) => {
  const accessSecret = process.env.JWT_ACCESS_SECRET!;
  const refreshSecret = process.env.JWT_REFRESH_SECRET!;

  const accessToken = jwt.sign({ userId }, accessSecret, { expiresIn: '15m' });
  const refreshToken = jwt.sign({ userId }, refreshSecret, { expiresIn: '7d' });

  return { accessToken, refreshToken };
};

export const register = async (req: Request, res: Response) => {
  try {
    const data = RegisterSchema.parse(req.body);

    const existingUser = await prisma.user.findUnique({ where: { email: data.email } });
    if (existingUser) {
      return res.status(400).json({ error: { message: 'User already exists' } });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(data.password, salt);

    const user = await prisma.user.create({
      data: {
        email: data.email,
        passwordHash,
        name: data.name,
      },
    });

    const tokens = generateTokens(user.id);
    const hashedToken = await bcrypt.hash(tokens.refreshToken, 10);

    await prisma.refreshToken.create({
      data: {
        hashedToken,
        userId: user.id,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    const response: AuthResponse = {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        createdAt: user.createdAt.toISOString(),
      },
      tokens,
    };

    res.status(201).json(response);
  } catch (error: unknown) {
    if (error instanceof Error) {
      res.status(400).json({ error: { message: (error as Error & { errors?: unknown }).errors || error.message } });
    } else {
      res.status(400).json({ error: { message: 'An unknown error occurred' } });
    }
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const data = LoginSchema.parse(req.body);

    const user = await prisma.user.findUnique({ where: { email: data.email } });
    if (!user) {
      return res.status(401).json({ error: { message: 'Invalid credentials' } });
    }

    const isMatch = await bcrypt.compare(data.password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ error: { message: 'Invalid credentials' } });
    }

    const tokens = generateTokens(user.id);
    const hashedToken = await bcrypt.hash(tokens.refreshToken, 10);

    await prisma.refreshToken.create({
      data: {
        hashedToken,
        userId: user.id,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    const response: AuthResponse = {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        createdAt: user.createdAt.toISOString(),
      },
      tokens,
    };

    res.status(200).json(response);
  } catch (error: unknown) {
    if (error instanceof Error) {
      res.status(400).json({ error: { message: (error as Error & { errors?: unknown }).errors || error.message } });
    } else {
      res.status(400).json({ error: { message: 'An unknown error occurred' } });
    }
  }
};

export const refresh = async (req: Request, res: Response) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) return res.status(400).json({ error: { message: 'Refresh token required' } });

    const refreshSecret = process.env.JWT_REFRESH_SECRET!;
    const decoded = jwt.verify(refreshToken, refreshSecret) as { userId: string };

    // Find all unrevoked tokens for user
    const tokens = await prisma.refreshToken.findMany({
      where: { userId: decoded.userId, revoked: false, expiresAt: { gt: new Date() } },
    });

    let foundTokenId = null;
    for (const tokenRecord of tokens) {
      if (await bcrypt.compare(refreshToken, tokenRecord.hashedToken)) {
        foundTokenId = tokenRecord.id;
        break;
      }
    }

    if (!foundTokenId) {
      return res.status(403).json({ error: { message: 'Invalid or revoked token' } });
    }

    // Revoke old token
    await prisma.refreshToken.update({
      where: { id: foundTokenId },
      data: { revoked: true },
    });

    // Issue new tokens
    const newTokens = generateTokens(decoded.userId);
    const newHashedToken = await bcrypt.hash(newTokens.refreshToken, 10);

    await prisma.refreshToken.create({
      data: {
        hashedToken: newHashedToken,
        userId: decoded.userId,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    res.status(200).json(newTokens);
  } catch (error: unknown) {
    res.status(403).json({ error: { message: 'Invalid token' } });
  }
};

export const logout = async (req: Request, res: Response) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) return res.status(204).send();

    // Optimistically decode without verifying to extract user
    const decoded = jwt.decode(refreshToken) as { userId: string } | null;
    if (decoded) {
      const tokens = await prisma.refreshToken.findMany({
        where: { userId: decoded.userId, revoked: false },
      });

      for (const tokenRecord of tokens) {
        if (await bcrypt.compare(refreshToken, tokenRecord.hashedToken)) {
          await prisma.refreshToken.update({
            where: { id: tokenRecord.id },
            data: { revoked: true },
          });
          break;
        }
      }
    }

    res.status(204).send();
  } catch (error) {
    res.status(204).send(); // Always succeed on logout
  }
};

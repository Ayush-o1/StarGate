import { Response } from 'express';
import { prisma } from '@stargate/database';
import { AuthenticatedRequest } from '../middleware/auth';
import { UserProfile } from '@stargate/shared';

export const getMe = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.userId },
    });

    if (!user) return res.status(404).json({ error: { message: 'User not found' } });

    const profile: UserProfile = {
      id: user.id,
      email: user.email,
      name: user.name,
      createdAt: user.createdAt.toISOString(),
    };

    res.status(200).json(profile);
  } catch (error) {
    res.status(500).json({ error: { message: 'Internal Server Error' } });
  }
};

export const updateMe = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { name } = req.body;
    
    const user = await prisma.user.update({
      where: { id: req.user!.userId },
      data: { name },
    });

    const profile: UserProfile = {
      id: user.id,
      email: user.email,
      name: user.name,
      createdAt: user.createdAt.toISOString(),
    };

    res.status(200).json(profile);
  } catch (error) {
    res.status(500).json({ error: { message: 'Internal Server Error' } });
  }
};

import bcrypt from 'bcryptjs';
import { Role } from '@prisma/client';
import { conflict, notFound, unauthorized } from '../../lib/errors.js';
import { signAccessToken } from '../../lib/jwt.js';
import { prisma } from '../../lib/prisma.js';
import type { LoginInput, RegisterInput } from './auth.schemas.js';

export interface PublicUser {
  id: number;
  email: string;
  role: Role;
  createdAt: string;
}

export interface AuthResponse {
  token: string;
  user: PublicUser;
}

const toPublicUser = (user: {
  id: number;
  email: string;
  role: Role;
  createdAt: Date;
}): PublicUser => ({
  id: user.id,
  email: user.email,
  role: user.role,
  createdAt: user.createdAt.toISOString(),
});

export const registerUser = async (input: RegisterInput): Promise<AuthResponse> => {
  const existing = await prisma.user.findUnique({
    where: { email: input.email },
  });

  if (existing) {
    throw conflict('User with this email already exists');
  }

  const passwordHash = await bcrypt.hash(input.password, 10);

  const user = await prisma.user.create({
    data: {
      email: input.email,
      passwordHash,
      role: Role.customer,
      cart: {
        create: {},
      },
    },
  });

  const token = signAccessToken({
    id: user.id,
    email: user.email,
    role: user.role,
  });

  return {
    token,
    user: toPublicUser(user),
  };
};

export const loginUser = async (input: LoginInput): Promise<AuthResponse> => {
  const user = await prisma.user.findUnique({
    where: { email: input.email },
  });

  if (!user) {
    throw unauthorized('Invalid email or password');
  }

  const isPasswordValid = await bcrypt.compare(input.password, user.passwordHash);
  if (!isPasswordValid) {
    throw unauthorized('Invalid email or password');
  }

  const token = signAccessToken({
    id: user.id,
    email: user.email,
    role: user.role,
  });

  return {
    token,
    user: toPublicUser(user),
  };
};

export const getCurrentUser = async (userId: number): Promise<PublicUser> => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    throw notFound('User not found');
  }

  return toPublicUser(user);
};

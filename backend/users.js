// In-memory User Store
import { hashPassword } from './auth.js';

const users = new Map(); // email -> user

export const createUser = async (email, password) => {
  // Basic validation
  if (!email.includes('@')) throw new Error('INVALID_EMAIL');
  if (password.length < 8) throw new Error('PASSWORD_TOO_SHORT');
  if (users.has(email)) throw new Error('USER_ALREADY_EXISTS');

  const passwordHash = await hashPassword(password);
  const user = {
    id: Math.random().toString(36).substr(2, 9),
    email,
    passwordHash,
    createdAt: new Date().toISOString()
  };

  users.set(email, user);
  return { id: user.id, email: user.email, createdAt: user.createdAt };
};

export const findUserByEmail = (email) => {
  return users.get(email) || null;
};

export const getUserById = (id) => {
  return Array.from(users.values()).find(u => u.id === id) || null;
};

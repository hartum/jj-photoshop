import type { User } from '../../domain/user.model.js';

export interface UserRepositoryPort {
  getUsers(): Promise<User[]>;
  createUser(user: Omit<User, 'id' | 'createdAt'>): Promise<User>;
  updateUser(id: string, user: Partial<User>): Promise<User>;
  deleteUser(id: string): Promise<void>;
}

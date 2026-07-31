export type UserRole = 'Cliente' | 'Fotógrafo' | 'Gestor Tienda' | 'Administrador';
export type UserStatus = 'Activo' | 'Inactivo';

export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: UserRole;
  storeLocation: string; // Tienda física asociada (ej. "JJ Photoshop - Centro", "JJ Photoshop - Norte")
  status: UserStatus;
  createdAt: string;
}

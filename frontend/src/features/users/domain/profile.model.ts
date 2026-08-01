export type ProfileCode = 
  | 'SUPERUSUARIO' 
  | 'ADMIN' 
  | 'GERENTE' 
  | 'SUPERVISOR' 
  | 'FOTOGRAFO' 
  | 'CONTABLE';

export type TagSeverity = 'danger' | 'warn' | 'info' | 'success' | 'secondary' | 'contrast';

export interface Perfil {
  id: string;
  code: ProfileCode;
  name: string;
  description: string;
  severity: TagSeverity;
  deletedAt?: string | null;
}

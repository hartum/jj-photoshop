import type { Project } from '../../domain/project.entity.js';

export interface ProjectRepository {
  findById(id: string): Promise<Project | null>;
  save(project: Project): Promise<void>;
  findAll(): Promise<Project[]>;
}

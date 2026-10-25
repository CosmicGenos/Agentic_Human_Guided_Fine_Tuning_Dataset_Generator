/** Role inside one project (not the global app role). */
export type ProjectRole = 'owner' | 'worker';

export interface Member {
  user_id: string;
  email: string;
  username: string | null;
  role: ProjectRole;
  added_by: string | null;
  added_at: string;
}

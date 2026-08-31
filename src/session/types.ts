/** Supported application roles for multi-user session management. */
export type UserRole = 'Admin' | 'Manager' | 'Agent' | 'ReadOnlyUser';

export type UserCredentials = {
  role: UserRole;
  /** Logical user id (stable file key), e.g. admin */
  userId: string;
  username: string;
  password: string;
  /** Optional human label for reports */
  displayName?: string;
};

export type SessionMeta = {
  role: UserRole;
  userId: string;
  username: string;
  storageStatePath: string;
  createdAt: string;
  /** Epoch ms when this session should be considered expired */
  expiresAt: number;
  origin: string;
};

export type SessionEnsureResult = {
  role: UserRole;
  userId: string;
  storageStatePath: string;
  reused: boolean;
  meta: SessionMeta;
};

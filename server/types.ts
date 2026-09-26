import type { Role } from '../shared/types.js';
import type { UserRecord } from './models.js';

export interface AccessClaims {
  sub: string;
  role: Role;
  mfa: boolean;
  ver: number;
  sid: string;
}

export type AppEnv = {
  Variables: {
    requestId: string;
    ip: string;
    ipHash: string;
    claims: AccessClaims | null;
    user: UserRecord | null;
  };
};

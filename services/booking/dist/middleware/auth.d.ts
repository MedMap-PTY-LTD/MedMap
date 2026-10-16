import { Request, Response, NextFunction } from 'express';
export interface AuthUser {
    uid: string;
    admin: boolean;
    email: string;
}
export interface AuthedRequest extends Request {
    authUser?: AuthUser;
}
export declare function authenticateToken(token: string): Promise<AuthUser>;
export declare function requireAuth(req: AuthedRequest, res: Response, next: NextFunction): Promise<void>;
export declare function requireAdmin(req: AuthedRequest, res: Response, next: NextFunction): void;
//# sourceMappingURL=auth.d.ts.map
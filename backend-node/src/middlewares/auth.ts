import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

// Estendendo o objeto Request do Express para incluir o accountId e userId do token
export interface AuthRequest extends Request {
  user?: {
    userId: number;
    accountId: number;
    role: string;
  };
}

export const requireAuth = (req: AuthRequest, res: Response, next: NextFunction) => {
  let token = req.cookies?.token;
  const authHeader = req.headers.authorization;

  if (!token && authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({ error: 'Acesso negado. Token não fornecido.' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret') as any;
    
    // Injeção vitalícia do tenant
    req.user = {
      userId: decoded.userId,
      accountId: decoded.accountId,
      role: decoded.role
    };

    next();
  } catch (err) {
    return res.status(401).json({ error: 'Token inválido ou expirado.' });
  }
};

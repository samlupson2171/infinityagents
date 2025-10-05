import * as jwt from 'jsonwebtoken';
import * as crypto from 'crypto';

// Contract access token interface
export interface ContractTokenPayload {
  userId: string;
  email: string;
  purpose: 'contract_access';
  iat: number;
  exp: number;
}

// Generate secure contract access token
export function generateContractAccessToken(
  userId: string,
  email: string
): string {
  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) {
    throw new Error(
      'NEXTAUTH_SECRET is required for contract token generation'
    );
  }

  const payload: Omit<ContractTokenPayload, 'iat' | 'exp'> = {
    userId,
    email,
    purpose: 'contract_access',
  };

  // Token expires in 7 days
  const token = jwt.sign(payload, secret, {
    expiresIn: '7d',
    issuer: 'infinity-weekends',
    audience: 'contract-access',
  });

  return token;
}

// Verify contract access token
export function verifyContractAccessToken(
  token: string
): ContractTokenPayload | null {
  try {
    const secret = process.env.NEXTAUTH_SECRET;
    if (!secret) {
      throw new Error(
        'NEXTAUTH_SECRET is required for contract token verification'
      );
    }

    const decoded = jwt.verify(token, secret, {
      issuer: 'infinity-weekends',
      audience: 'contract-access',
    }) as ContractTokenPayload;

    // Verify the purpose
    if (decoded.purpose !== 'contract_access') {
      console.error('Invalid token purpose:', decoded.purpose);
      return null;
    }

    return decoded;
  } catch (error) {
    console.error('Contract token verification failed:', error);
    return null;
  }
}

// Generate secure random token (alternative approach)
export function generateSecureToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

// Create contract access URL
export function createContractAccessUrl(token: string): string {
  const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
  return `${baseUrl}/contract/sign?token=${encodeURIComponent(token)}`;
}

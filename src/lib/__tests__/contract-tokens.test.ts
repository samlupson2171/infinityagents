import {
  generateContractAccessToken,
  verifyContractAccessToken,
  createContractAccessUrl,
} from '../contract-tokens';

// Mock environment variable
const originalEnv = process.env.NEXTAUTH_SECRET;

describe('Contract Tokens', () => {
  beforeAll(() => {
    process.env.NEXTAUTH_SECRET = 'test-secret-key-for-contract-tokens';
  });

  afterAll(() => {
    process.env.NEXTAUTH_SECRET = originalEnv;
  });

  describe('generateContractAccessToken', () => {
    it('should generate a valid JWT token', () => {
      const userId = '507f1f77bcf86cd799439011';
      const email = 'test@example.com';

      const token = generateContractAccessToken(userId, email);

      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3); // JWT has 3 parts
    });

    it('should throw error if NEXTAUTH_SECRET is not set', () => {
      delete process.env.NEXTAUTH_SECRET;

      expect(() => {
        generateContractAccessToken('userId', 'email@test.com');
      }).toThrow('NEXTAUTH_SECRET is required for contract token generation');

      process.env.NEXTAUTH_SECRET = 'test-secret-key-for-contract-tokens';
    });
  });

  describe('verifyContractAccessToken', () => {
    it('should verify a valid token', () => {
      const userId = '507f1f77bcf86cd799439011';
      const email = 'test@example.com';

      const token = generateContractAccessToken(userId, email);
      const decoded = verifyContractAccessToken(token);

      expect(decoded).toBeDefined();
      expect(decoded?.userId).toBe(userId);
      expect(decoded?.email).toBe(email);
      expect(decoded?.purpose).toBe('contract_access');
    });

    it('should return null for invalid token', () => {
      const decoded = verifyContractAccessToken('invalid-token');
      expect(decoded).toBeNull();
    });

    it('should return null for token with wrong purpose', () => {
      // This would be a token generated with different purpose
      const decoded = verifyContractAccessToken('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJwdXJwb3NlIjoid3JvbmctcHVycG9zZSJ9.invalid');
      expect(decoded).toBeNull();
    });

    it('should return null if NEXTAUTH_SECRET is not set', () => {
      const token = generateContractAccessToken('userId', 'email@test.com');
      delete process.env.NEXTAUTH_SECRET;

      const decoded = verifyContractAccessToken(token);
      expect(decoded).toBeNull();

      process.env.NEXTAUTH_SECRET = 'test-secret-key-for-contract-tokens';
    });
  });

  describe('createContractAccessUrl', () => {
    it('should create a valid URL with token', () => {
      const token = 'test-token-123';
      const url = createContractAccessUrl(token);

      expect(url).toContain('/contract/sign?token=');
      expect(url).toContain(encodeURIComponent(token));
    });

    it('should use NEXTAUTH_URL if set', () => {
      const originalUrl = process.env.NEXTAUTH_URL;
      process.env.NEXTAUTH_URL = 'https://example.com';

      const token = 'test-token-123';
      const url = createContractAccessUrl(token);

      expect(url).toBe(`https://example.com/contract/sign?token=${encodeURIComponent(token)}`);

      process.env.NEXTAUTH_URL = originalUrl;
    });

    it('should use localhost as fallback', () => {
      const originalUrl = process.env.NEXTAUTH_URL;
      delete process.env.NEXTAUTH_URL;

      const token = 'test-token-123';
      const url = createContractAccessUrl(token);

      expect(url).toBe(`http://localhost:3000/contract/sign?token=${encodeURIComponent(token)}`);

      process.env.NEXTAUTH_URL = originalUrl;
    });
  });

  describe('Token expiration', () => {
    it('should generate token that expires in 7 days', () => {
      const userId = '507f1f77bcf86cd799439011';
      const email = 'test@example.com';

      const token = generateContractAccessToken(userId, email);
      const decoded = verifyContractAccessToken(token);

      expect(decoded).toBeDefined();
      
      if (decoded) {
        const now = Math.floor(Date.now() / 1000);
        const sevenDaysInSeconds = 7 * 24 * 60 * 60;
        
        // Token should expire approximately 7 days from now (with some tolerance)
        expect(decoded.exp - now).toBeGreaterThan(sevenDaysInSeconds - 60); // 1 minute tolerance
        expect(decoded.exp - now).toBeLessThan(sevenDaysInSeconds + 60);
      }
    });
  });
});
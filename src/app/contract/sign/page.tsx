'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { useToast } from '@/components/shared/Toast';
import { ContractSigning } from '@/components/contract/ContractSigning';

interface ContractData {
  _id: string;
  version: string;
  title: string;
  content: string;
  isActive: boolean;
  createdAt: string;
  effectiveDate: string;
}

interface TokenValidationResult {
  valid: boolean;
  userId?: string;
  email?: string;
  error?: string;
}

export default function ContractSigningPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session, status } = useSession();
  const { showError } = useToast();

  const [contract, setContract] = useState<ContractData | null>(null);
  const [tokenValidation, setTokenValidation] =
    useState<TokenValidationResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const token = searchParams.get('token');

  useEffect(() => {
    if (!token) {
      setError('No contract access token provided');
      setLoading(false);
      return;
    }

    validateTokenAndLoadContract();
  }, [token]);

  useEffect(() => {
    // If user is not authenticated and we have a valid token, redirect to login with return URL
    if (tokenValidation?.valid && status === 'unauthenticated') {
      const returnUrl = encodeURIComponent(`/contract/sign?token=${token}`);
      router.push(`/auth/login?callbackUrl=${returnUrl}`);
      return;
    }

    // If user is authenticated but token is for different user, show error
    if (
      tokenValidation?.valid &&
      session?.user?.email &&
      tokenValidation.email !== session.user.email
    ) {
      setError(
        'This contract link is not associated with your account. Please log in with the correct account or contact support.'
      );
      setLoading(false);
      return;
    }
  }, [tokenValidation, session, status, token, router]);

  const validateTokenAndLoadContract = async () => {
    try {
      setLoading(true);
      setError(null);

      // Validate token
      const tokenResponse = await fetch('/api/contract/validate-token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token }),
      });

      const tokenResult = await tokenResponse.json();
      setTokenValidation(tokenResult);

      if (!tokenResult.valid) {
        setError(
          tokenResult.error || 'Invalid or expired contract access token'
        );
        setLoading(false);
        return;
      }

      // Load current contract
      const contractResponse = await fetch('/api/contract/current');
      if (!contractResponse.ok) {
        throw new Error('Failed to load contract');
      }

      const contractData = await contractResponse.json();
      setContract(contractData.data);
    } catch (err) {
      console.error('Error loading contract:', err);
      setError('Failed to load contract. Please try again or contact support.');
    } finally {
      setLoading(false);
    }
  };

  const handleSignSuccess = (result: any) => {
    setSuccess(
      'Contract signed successfully! You now have full access to the training platform.'
    );

    // Redirect to dashboard after a short delay
    setTimeout(() => {
      router.push('/');
    }, 3000);
  };

  const handleSignError = (errorMessage: string) => {
    showError('Contract Signing Failed', errorMessage);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <LoadingSpinner />
          <p className="mt-4 text-gray-600">Loading contract...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="max-w-md mx-auto text-center">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <div className="text-red-600 text-4xl mb-4">⚠️</div>
            <h1 className="text-xl font-semibold text-red-800 mb-2">
              Contract Access Error
            </h1>
            <p className="text-red-700 mb-4">{error}</p>
            <div className="space-y-2">
              <button
                onClick={() => router.push('/')}
                className="w-full bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
              >
                Return to Home
              </button>
              <button
                onClick={() => router.push('/auth/login')}
                className="w-full bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700 transition-colors"
              >
                Login
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="max-w-md mx-auto text-center">
          <div className="bg-green-50 border border-green-200 rounded-lg p-6">
            <div className="text-green-600 text-4xl mb-4">✅</div>
            <h1 className="text-xl font-semibold text-green-800 mb-2">
              Contract Signed Successfully!
            </h1>
            <p className="text-green-700 mb-4">{success}</p>
            <p className="text-sm text-green-600">
              Redirecting to dashboard...
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (!contract) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">No contract available</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto py-8 px-4">
        <ContractSigning
          contract={contract}
          token={token || undefined}
          onSignSuccess={handleSignSuccess}
          onSignError={handleSignError}
        />
      </div>

    </div>
  );
}

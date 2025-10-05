'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { Toast } from '@/components/shared/Toast';
import { useContractReading } from '@/lib/hooks/useFormValidation';
import { errorRecoveryGuidance } from '@/lib/validation/form-validation';

interface ContractData {
  _id: string;
  version: string;
  title: string;
  content: string;
  isActive: boolean;
  createdAt: string;
  effectiveDate: string;
}

interface ContractSigningProps {
  contract: ContractData;
  token?: string;
  onSignSuccess?: (result: any) => void;
  onSignError?: (error: string) => void;
}

export function ContractSigning({
  contract,
  token,
  onSignSuccess,
  onSignError,
}: ContractSigningProps) {
  const { data: session } = useSession();
  const [signing, setSigning] = useState(false);
  const [signError, setSignError] = useState<string | null>(null);
  const [digitalSignatureConsent, setDigitalSignatureConsent] = useState(false);
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  // Enhanced contract reading validation
  const {
    scrollProgress,
    hasScrolledToEnd,
    isValid: contractReadingValid,
    validation,
    handleScroll,
    reset: resetContractReading
  } = useContractReading();

  // Reset state when contract changes
  useEffect(() => {
    resetContractReading();
    setDigitalSignatureConsent(false);
    setSignError(null);
    setValidationErrors([]);
  }, [contract._id, resetContractReading]);

  // Validate form state
  const validateSigningForm = (): boolean => {
    const errors: string[] = [];

    if (!contractReadingValid) {
      errors.push(validation.message || 'Please read the entire contract');
    }

    if (!digitalSignatureConsent) {
      errors.push('You must consent to digital signature to proceed');
    }

    if (!contract?._id) {
      errors.push('Contract data is missing');
    }

    if (!session?.user && !token) {
      errors.push('Authentication required to sign contract');
    }

    setValidationErrors(errors);
    return errors.length === 0;
  };

  const handleSignContract = async () => {
    // Clear previous errors
    setSignError(null);
    setValidationErrors([]);

    // Validate form before submission
    if (!validateSigningForm()) {
      return;
    }

    try {
      setSigning(true);

      const requestBody: any = {
        contractId: contract._id,
        contractVersion: contract.version,
        hasReadContract: hasScrolledToEnd,
        digitalSignatureConsent: digitalSignatureConsent,
      };

      // Include token if provided (for token-based signing)
      if (token) {
        requestBody.token = token;
      }

      const response = await fetch('/api/contract/sign', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      const result = await response.json();

      if (!result.success) {
        // Handle different types of errors with recovery guidance
        const errorCode = result.error?.code || 'CONTRACT_ERROR';
        const guidance = errorRecoveryGuidance[errorCode as keyof typeof errorRecoveryGuidance] || 
                        errorRecoveryGuidance.CONTRACT_ERROR;
        
        const errorMessage = `${result.error?.message || 'Failed to sign contract'}\n\n${guidance.message}`;
        setSignError(errorMessage);
        onSignError?.(errorMessage);
        return;
      }

      // Success handling
      setShowSuccessToast(true);
      onSignSuccess?.(result);
      
    } catch (err) {
      console.error('Contract signing error:', err);
      
      // Network or unexpected error handling
      const guidance = errorRecoveryGuidance.NETWORK_ERROR;
      const errorMessage = `Unable to sign contract due to connection issues.\n\n${guidance.message}`;
      
      setSignError(errorMessage);
      onSignError?.(errorMessage);
    } finally {
      setSigning(false);
    }
  };

  // Handle digital signature consent change
  const handleConsentChange = (checked: boolean) => {
    setDigitalSignatureConsent(checked);
    // Clear validation errors when user fixes issues
    if (checked && validationErrors.includes('You must consent to digital signature to proceed')) {
      setValidationErrors(prev => prev.filter(error => 
        error !== 'You must consent to digital signature to proceed'
      ));
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-lg overflow-hidden">
      {/* Header */}
      <div className="bg-blue-600 text-white p-6">
        <h1 className="text-2xl font-bold">Partner Agreement</h1>
        <p className="text-blue-100 mt-2">
          Please review the contract carefully and scroll to the bottom to sign
        </p>
        <div className="mt-4 text-sm">
          <p>
            <strong>Version:</strong> {contract.version}
          </p>
          <p>
            <strong>Effective Date:</strong>{' '}
            {new Date(contract.effectiveDate).toLocaleDateString()}
          </p>
        </div>
      </div>

      {/* Validation Errors */}
      {validationErrors.length > 0 && (
        <div className="bg-red-50 border-l-4 border-red-400 p-4" role="alert">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">
                Please complete the following requirements:
              </h3>
              <ul className="mt-2 text-sm text-red-700 list-disc list-inside">
                {validationErrors.map((error, index) => (
                  <li key={index}>{error}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Progress indicator */}
      <div className="bg-gray-100 p-4">
        <div className="flex items-center justify-between text-sm mb-2">
          <span className="text-gray-600">Reading Progress</span>
          <span
            className={`font-medium ${
              hasScrolledToEnd ? 'text-green-600' : 'text-orange-600'
            }`}
          >
            {hasScrolledToEnd
              ? '✅ Complete'
              : `📖 ${Math.round(scrollProgress)}%`}
          </span>
        </div>

        {/* Progress bar */}
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className={`h-2 rounded-full transition-all duration-300 ${
              hasScrolledToEnd ? 'bg-green-500' : 'bg-blue-500'
            }`}
            style={{ width: `${scrollProgress}%` }}
            role="progressbar"
            aria-valuenow={scrollProgress}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`Contract reading progress: ${Math.round(scrollProgress)}%`}
          />
        </div>
        
        {/* Reading guidance */}
        {!hasScrolledToEnd && (
          <p className="mt-2 text-xs text-gray-600">
            Scroll through the entire contract to enable signing
          </p>
        )}
      </div>

      {/* Contract content */}
      <div
        className={`p-6 max-h-96 overflow-y-auto border-2 scroll-smooth transition-colors ${
          hasScrolledToEnd ? 'border-green-200' : 'border-gray-200'
        }`}
        onScroll={handleScroll}
        role="document"
        aria-label="Contract content"
        tabIndex={0}
      >
        <h2 className="text-xl font-semibold mb-4">{contract.title}</h2>
        <div
          className="prose max-w-none text-sm leading-relaxed"
          dangerouslySetInnerHTML={{ __html: contract.content }}
        />
      </div>

      {/* Signing section */}
      <div className="bg-gray-50 p-6 border-t">
        {/* User information */}
        <div className="mb-4 text-sm text-gray-600">
          <p>
            By signing this contract, you agree to all terms and conditions
            outlined above.
          </p>
          {session?.user && (
            <p className="mt-1">
              <strong>Signing as:</strong> {session.user.name} ({session.user.email})
            </p>
          )}
        </div>

        {/* Digital signature consent */}
        {hasScrolledToEnd && (
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
            <div className="flex items-start">
              <input
                type="checkbox"
                id="digital-signature-consent"
                checked={digitalSignatureConsent}
                onChange={(e) => handleConsentChange(e.target.checked)}
                className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                aria-describedby="consent-description"
              />
              <label
                htmlFor="digital-signature-consent"
                className="ml-2 text-sm text-blue-800 cursor-pointer"
              >
                <span id="consent-description">
                  I understand that clicking "Sign Contract" constitutes my
                  digital signature and legal acceptance of this agreement.
                </span>
              </label>
            </div>
          </div>
        )}

        {/* Reading completion validation message */}
        {!hasScrolledToEnd && (
          <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md" role="alert">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-yellow-800">
                  Please scroll through the entire contract above before signing.
                  You must read {Math.round(validation.remainingProgress)}% more to continue.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Sign Error */}
        {signError && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md" role="alert">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">Contract Signing Error</h3>
                <div className="mt-2 text-sm text-red-700 whitespace-pre-line">
                  {signError}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Sign button */}
        <div className="flex justify-end">
          <button
            onClick={handleSignContract}
            disabled={!hasScrolledToEnd || !digitalSignatureConsent || signing}
            className={`px-6 py-3 rounded-md font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 ${
              hasScrolledToEnd && digitalSignatureConsent && !signing
                ? 'bg-green-600 text-white hover:bg-green-700 focus:ring-green-500'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
            aria-label={
              !hasScrolledToEnd
                ? 'Complete reading to enable signing'
                : !digitalSignatureConsent
                ? 'Accept digital signature consent to enable signing'
                : 'Sign contract'
            }
          >
            {signing ? (
              <div className="flex items-center">
                <LoadingSpinner />
                <span className="ml-2">Signing...</span>
              </div>
            ) : (
              '✍️ Sign Contract'
            )}
          </button>
        </div>

        {/* Help text */}
        {hasScrolledToEnd && !digitalSignatureConsent && (
          <p className="mt-2 text-xs text-gray-500 text-right">
            Please check the consent box above to enable signing
          </p>
        )}
      </div>

      {/* Success Toast */}
      {showSuccessToast && (
        <Toast
          type="success"
          message="Contract signed successfully!"
          onClose={() => setShowSuccessToast(false)}
        />
      )}
    </div>
  );
}

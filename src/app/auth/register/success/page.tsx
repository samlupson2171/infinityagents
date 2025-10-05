import Link from 'next/link';

export default function RegistrationSuccessPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          {/* Success Icon */}
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-6">
            <svg
              className="h-6 w-6 text-green-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M5 13l4 4L19 7"
              ></path>
            </svg>
          </div>

          {/* Success Message */}
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Registration Successful!
            </h2>

            <p className="text-gray-600 mb-6">
              Thank you for registering with Infinity Weekends. Your account has
              been created successfully.
            </p>

            {/* Approval Process Explanation */}
            <div className="bg-blue-50 border border-blue-200 rounded-md p-4 mb-6 text-left">
              <h3 className="text-lg font-semibold text-blue-900 mb-3">
                What happens next?
              </h3>

              <div className="space-y-3 text-sm text-blue-800">
                <div className="flex items-start">
                  <div className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold mr-3 mt-0.5">
                    1
                  </div>
                  <div>
                    <strong>Account Review:</strong> Our administrators will
                    review your registration details and verify your ABTA/PTS
                    credentials.
                  </div>
                </div>

                <div className="flex items-start">
                  <div className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold mr-3 mt-0.5">
                    2
                  </div>
                  <div>
                    <strong>Email Notification:</strong> You will receive an
                    email confirmation once your account has been approved or if
                    we need additional information.
                  </div>
                </div>

                <div className="flex items-start">
                  <div className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold mr-3 mt-0.5">
                    3
                  </div>
                  <div>
                    <strong>Access Granted:</strong> Once approved, you can log
                    in and access exclusive training materials, offers, and
                    submit client inquiries.
                  </div>
                </div>
              </div>
            </div>

            {/* Important Notes */}
            <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4 mb-6 text-left">
              <h4 className="text-sm font-semibold text-yellow-800 mb-2">
                Important Notes:
              </h4>
              <ul className="text-sm text-yellow-700 space-y-1">
                <li>• Account approval typically takes 1-2 business days</li>
                <li>
                  • Only travel agencies with valid ABTA/PTS numbers are
                  approved
                </li>
                <li>
                  • You will not be able to log in until your account is
                  approved
                </li>
                <li>
                  • Check your email regularly for updates on your application
                  status
                </li>
              </ul>
            </div>

            {/* Contact Information */}
            <div className="text-center text-sm text-gray-600 mb-6">
              <p>
                If you have any questions about your registration, please
                contact us at{' '}
                <a
                  href="mailto:info@infinityweekends.co.uk"
                  className="text-blue-600 hover:text-blue-500 font-medium"
                >
                  info@infinityweekends.co.uk
                </a>
              </p>
            </div>

            {/* Action Buttons */}
            <div className="space-y-3">
              <Link
                href="/auth/login"
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Go to Login Page
              </Link>

              <Link
                href="/"
                className="w-full flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Return to Home
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

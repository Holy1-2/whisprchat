import React from 'react';

export default function SlowConnection() {
  const navigate = useNavigate();

  const handleRetry = () => {
    const intendedPath = sessionStorage.getItem('intendedPath') || '/';
    const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    
    if (connection?.effectiveType && !['slow-2g', '2g', '3g'].includes(connection.effectiveType)) {
      navigate(intendedPath, { replace: true });
      sessionStorage.removeItem('intendedPath');
    }
  };
  return (
    <div className="flex flex-col items-center justify-center h-screen bg-[#1a120b] text-center p-8">
      <svg xmlns="http://www.w3.org/2000/svg" className="h-40 w-40 text-[#6CFFCA] mb-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" 
              d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0M12 9v3"/>
      </svg>
      <h1 className="text-2xl font-bold text-[#e5d5c6] mb-4">Connection Unstable</h1>
      <p className="text-[#e5d5c6]/75 mb-6 max-w-md">
        Your internet connection seems slow. Please check your network settings 
        and try again for the best experience.
      </p>
      <button
        onClick={() => window.location.reload()}
        className="bg-[#3d2e20] text-[#e5d5c6] px-6 py-3 rounded-lg hover:bg-[#4f3e2e] transition-colors"
      >
        Retry Connection
      </button>
    </div>
  );
}
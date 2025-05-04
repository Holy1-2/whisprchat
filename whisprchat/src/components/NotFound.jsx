import React from 'react';
import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center h-screen bg-[#1a120b] text-center p-8">
      <svg xmlns="http://www.w3.org/2000/svg" className="h-40 w-40 text-[#6CFFCA] mb-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" 
              d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
      </svg>
      <h1 className="text-2xl font-bold text-[#e5d5c6] mb-4">404 - Page Not Found</h1>
      <p className="text-[#e5d5c6]/75 mb-6 max-w-md">
        The page you're looking for doesn't exist or has been moved. 
        Let's get you back to safety.
      </p>
      <Link
        to="/"
        className="bg-[#3d2e20] text-[#e5d5c6] px-6 py-3 rounded-lg hover:bg-[#4f3e2e] transition-colors"
      >
        Return Home
      </Link>
    </div>
  );
}
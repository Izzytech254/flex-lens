'use client';

import React from 'react';

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-6 text-center">
      <h2 className="text-xl font-bold mb-2">Something went wrong</h2>
      <p className="text-slate-400 text-xs mb-4">{error.message || 'An unexpected error occurred'}</p>
      <button
        type="button"
        onClick={() => reset()}
        className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-full text-xs font-semibold transition"
      >
        Try Again
      </button>
    </div>
  );
}

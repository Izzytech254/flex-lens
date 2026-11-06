import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-6 text-center">
      <h2 className="text-2xl font-bold mb-2">Page Not Found</h2>
      <p className="text-slate-400 text-sm mb-4">Could not find requested resource</p>
      <Link
        href="/"
        className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-full text-xs font-semibold transition"
      >
        Return to FixLens
      </Link>
    </div>
  );
}

import React from "react";
import { Link } from "react-router-dom";
import { Music2, Home } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen grid place-items-center bg-[#050505] text-white px-6 text-center" data-testid="not-found-page">
      <div>
        <div className="w-16 h-16 rounded-2xl bg-rose-600 mx-auto grid place-items-center mb-6 shadow-[0_18px_40px_-10px_rgba(225,29,72,0.6)]">
          <Music2 className="w-8 h-8" />
        </div>
        <p className="text-[11px] uppercase tracking-[0.3em] text-rose-400 mb-3">Error 404</p>
        <h1 className="font-display text-5xl lg:text-7xl tracking-tighter mb-4">This song isn't on the queue.</h1>
        <p className="text-zinc-400 max-w-md mx-auto">The page you're looking for slipped between two beats. Let's head back somewhere familiar.</p>
        <Link to="/" className="mt-8 inline-flex items-center gap-2 bg-rose-600 hover:bg-rose-500 transition-all rounded-full px-6 py-3 font-medium" data-testid="back-home-button">
          <Home className="w-4 h-4" /> Back to Duo-fy
        </Link>
      </div>
    </div>
  );
}

import React, { useState } from "react";
import { Link, useNavigate, Navigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Music2, Loader2 } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { toast } from "sonner";

export default function Login() {
  const { login, user } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  if (user) {
    let pending = null;
    try { pending = sessionStorage.getItem("duofy.pendingJoin"); } catch (_) {}
    if (pending) {
      try { sessionStorage.removeItem("duofy.pendingJoin"); } catch (_) {}
      return <Navigate to={`/join/${pending}`} replace />;
    }
    return <Navigate to="/dashboard" replace />;
  }

  const onSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    const r = await login(email, password);
    setSubmitting(false);
    if (r.ok) {
      toast.success(`Welcome back!`);
      let pending = null;
      try { pending = sessionStorage.getItem("duofy.pendingJoin"); } catch (_) {}
      if (pending) {
        try { sessionStorage.removeItem("duofy.pendingJoin"); } catch (_) {}
        navigate(`/join/${pending}`);
      } else {
        navigate("/dashboard");
      }
    } else {
      setError(r.error);
      toast.error(r.error);
    }
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-[#050505] text-white relative overflow-hidden" data-testid="login-page">
      <div className="hidden lg:block relative">
        <img src="https://images.unsplash.com/photo-1742774101914-1925309b1971?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjA1OTN8MHwxfHNlYXJjaHwzfHxkYXJrJTIwYWJzdHJhY3QlMjByZWQlMjBsaWdodHxlbnwwfHx8fDE3NzgxMjY0Mjd8MA&ixlib=rb-4.1.0&q=85" alt="" className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#050505] via-[#050505]/40 to-transparent" />
        <Link to="/" className="absolute top-8 left-8 flex items-center gap-2" data-testid="login-back-home">
          <div className="w-9 h-9 rounded-xl bg-rose-600 grid place-items-center"><Music2 className="w-5 h-5" /></div>
          <span className="font-display text-2xl tracking-tighter">Duo<span className="text-rose-500">-fy</span></span>
        </Link>
        <div className="absolute bottom-12 left-12 right-12 max-w-md">
          <p className="text-[11px] uppercase tracking-[0.3em] text-rose-400 mb-3">Welcome back</p>
          <h2 className="font-display text-4xl tracking-tighter leading-tight">The room remembers your last song.</h2>
        </div>
      </div>

      <div className="flex items-center justify-center px-6 py-16 relative">
        <Link to="/" className="lg:hidden absolute top-8 left-6 flex items-center gap-2" data-testid="login-back-home-mobile">
          <div className="w-9 h-9 rounded-xl bg-rose-600 grid place-items-center"><Music2 className="w-5 h-5" /></div>
          <span className="font-display text-2xl tracking-tighter">Duo<span className="text-rose-500">-fy</span></span>
        </Link>
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="w-full max-w-sm"
        >
          <h1 className="font-display text-3xl tracking-tighter">Sign in</h1>
          <p className="text-sm text-zinc-500 mt-1">Pick up where the music left off.</p>

          <form onSubmit={onSubmit} className="mt-8 space-y-4">
            <div>
              <label className="text-[11px] uppercase tracking-[0.2em] text-zinc-500">Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1.5 w-full bg-zinc-900/60 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-rose-500/60 focus:ring-1 focus:ring-rose-500/40 transition-all"
                placeholder="you@example.com"
                data-testid="login-email"
              />
            </div>
            <div>
              <label className="text-[11px] uppercase tracking-[0.2em] text-zinc-500">Password</label>
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1.5 w-full bg-zinc-900/60 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-rose-500/60 focus:ring-1 focus:ring-rose-500/40 transition-all"
                placeholder="••••••••"
                data-testid="login-password"
              />
            </div>
            {error && <p className="text-xs text-rose-400" data-testid="login-error">{error}</p>}
            <button
              type="submit"
              disabled={submitting}
              className="w-full inline-flex items-center justify-center gap-2 bg-rose-600 hover:bg-rose-500 disabled:opacity-60 transition-all rounded-full px-6 py-3 font-medium shadow-[0_8px_30px_-8px_rgba(225,29,72,0.7)]"
              data-testid="login-submit"
            >
              {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
              Sign in
            </button>
          </form>

          <p className="mt-6 text-sm text-zinc-500">
            New here?{" "}
            <Link to="/signup" className="text-rose-400 hover:text-rose-300" data-testid="login-to-signup">
              Create an account
            </Link>
          </p>
        </motion.div>
      </div>
    </div>
  );
}

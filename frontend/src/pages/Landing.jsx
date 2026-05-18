import React from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Music2, Users, Radio, ArrowRight, Heart, Headphones, MessageCircle, Disc3 } from "lucide-react";
import FloatingParticles from "../components/FloatingParticles";
import Visualizer from "../components/Visualizer";

const HERO_BG =
  "https://images.unsplash.com/photo-1742774101914-1925309b1971?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjA1OTN8MHwxfHNlYXJjaHwzfHxkYXJrJTIwYWJzdHJhY3QlMjByZWQlMjBsaWdodHxlbnwwfHx8fDE3NzgxMjY0Mjd8MA&ixlib=rb-4.1.0&q=85";
const COUPLE_IMG =
  "https://images.unsplash.com/photo-1749831238693-07bf9bb43303?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjA2MDV8MHwxfHNlYXJjaHwyfHxjb3VwbGUlMjBsaXN0ZW5pbmclMjBtdXNpYyUyMGRhcmt8ZW58MHx8fHwxNzc4MTI2NDA4fDA&ixlib=rb-4.1.0&q=85";
const VINYL_IMG =
  "https://images.unsplash.com/photo-1581017816147-2cb8dd55f550?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjA1NzR8MHwxfHNlYXJjaHwyfHxkaiUyMHR1cm50YWJsZSUyMGRhcmt8ZW58MHx8fHwxNzc4MTI2NDI3fDA&ixlib=rb-4.1.0&q=85";

export default function Landing() {
  return (
    <div className="min-h-screen bg-[#050505] text-white relative overflow-x-hidden" data-testid="landing-page">
      {/* NAV */}
      <header className="absolute top-0 left-0 right-0 z-30 px-6 lg:px-12 py-6 flex items-center justify-between">
        <div className="flex items-center gap-2" data-testid="landing-logo">
          <div className="w-9 h-9 rounded-xl bg-rose-600 grid place-items-center shadow-lg shadow-rose-900/40">
            <Music2 className="w-5 h-5 text-white" strokeWidth={2.2} />
          </div>
          <span className="font-display text-2xl tracking-tighter">Duo<span className="text-rose-500">-fy</span></span>
        </div>
        <nav className="hidden md:flex items-center gap-7 text-sm text-zinc-300">
          <a href="#features" className="hover:text-white transition-colors">Features</a>
          <a href="#how" className="hover:text-white transition-colors">How it works</a>
          <a href="#stories" className="hover:text-white transition-colors">Stories</a>
        </nav>
        <div className="flex items-center gap-3">
          <Link to="/login" className="text-sm text-zinc-300 hover:text-white transition-colors hidden sm:inline" data-testid="nav-login">
            Sign in
          </Link>
          <Link to="/signup" className="text-sm bg-rose-600 hover:bg-rose-500 transition-colors rounded-full px-4 py-2 font-medium" data-testid="nav-signup">
            Get started
          </Link>
        </div>
      </header>

      {/* HERO */}
      <section className="relative min-h-screen flex items-center pt-28 pb-20 px-6 lg:px-12">
        <div className="absolute inset-0 -z-10">
          <img src={HERO_BG} alt="" className="w-full h-full object-cover opacity-50" />
          <div className="absolute inset-0 bg-gradient-to-b from-[#050505]/60 via-[#050505]/85 to-[#050505]" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#050505] via-[#050505]/60 to-transparent" />
        </div>
        <FloatingParticles />

        <div className="relative max-w-7xl mx-auto w-full grid lg:grid-cols-12 items-center gap-10">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
            className="lg:col-span-7"
          >
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full glass text-[11px] uppercase tracking-[0.25em] text-rose-300 mb-7" data-testid="hero-badge">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
              Real-time · Synchronized · Intimate
            </div>
            <h1 className="font-display text-5xl sm:text-6xl lg:text-7xl tracking-tighter font-medium leading-[1.02] text-balance">
              Listen <span className="italic text-rose-400">together</span>,
              <br /> even when you're <span className="text-zinc-500">apart.</span>
            </h1>
            <p className="mt-6 text-zinc-400 max-w-xl text-base sm:text-lg leading-relaxed">
              Duo-fy turns distance into rhythm. Create a private room, share a queue, and feel every beat at the same instant — with the people you love most.
            </p>
            <div className="mt-9 flex flex-wrap items-center gap-3">
              <Link to="/signup" className="group inline-flex items-center gap-2 bg-rose-600 hover:bg-rose-500 transition-all rounded-full px-7 py-3.5 font-medium shadow-[0_8px_30px_-8px_rgba(225,29,72,0.7)]" data-testid="hero-cta-primary">
                Start a room
                <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
              </Link>
              <Link to="/login" className="inline-flex items-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-full px-6 py-3.5 transition-colors text-sm" data-testid="hero-cta-secondary">
                I have an account
              </Link>
            </div>
            <div className="mt-10 flex items-center gap-6 text-xs text-zinc-500">
              <div className="flex -space-x-2">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="w-7 h-7 rounded-full border-2 border-[#050505] bg-gradient-to-br from-rose-500 to-rose-900" />
                ))}
              </div>
              <span>Trusted by couples and friends in 40+ cities — and counting.</span>
            </div>
          </motion.div>

          {/* Floating room mock */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.15 }}
            className="lg:col-span-5"
          >
            <div className="relative">
              <div className="absolute -inset-8 bg-rose-600/20 blur-3xl rounded-full" />
              <div className="relative rounded-3xl border border-white/10 bg-gradient-to-br from-[#1a0a10] to-[#0a0a0a] p-6 shadow-[0_30px_80px_-20px_rgba(0,0,0,0.7)]" data-testid="hero-mock">
                <div className="flex items-center gap-2 text-xs text-zinc-500 mb-5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  <span className="uppercase tracking-[0.3em]">Live · 2 listeners</span>
                </div>
                <div className="flex gap-4 items-center">
                  <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-black spin-slow shrink-0">
                    <img src={VINYL_IMG} alt="" className="w-full h-full object-cover" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] uppercase tracking-[0.3em] text-rose-400">Now Playing</p>
                    <p className="font-display text-xl tracking-tight truncate">Midnight Velvet</p>
                    <p className="text-zinc-500 text-sm truncate">Aurora Lane · Slow Hours</p>
                    <Visualizer playing className="mt-3" bars={18} />
                  </div>
                </div>
                <div className="mt-5 h-1 rounded-full bg-white/10 relative">
                  <div className="absolute left-0 top-0 h-full w-1/2 rounded-full bg-rose-500" />
                </div>
                <div className="flex items-center justify-between mt-4 text-xs text-zinc-500 font-mono-soft">
                  <span>0:48</span><span>1:32</span>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* FEATURES */}
      <section id="features" className="relative px-6 lg:px-12 py-24 max-w-7xl mx-auto">
        <div className="grid lg:grid-cols-12 gap-10 items-center">
          <div className="lg:col-span-5">
            <p className="text-[11px] uppercase tracking-[0.3em] text-rose-400 mb-4">Why Duo-fy</p>
            <h2 className="font-display text-4xl lg:text-5xl tracking-tighter font-medium leading-tight">
              The same song.<br />The same heartbeat.
            </h2>
            <p className="mt-5 text-zinc-400 leading-relaxed">
              Forget screen-sharing or counting "3, 2, 1, play." Duo-fy keeps your music, queue, and chat perfectly in sync — down to the millisecond.
            </p>
          </div>
          <div className="lg:col-span-7 grid sm:grid-cols-2 gap-5">
            {[
              { icon: Radio, title: "Real-time sync", text: "Play, pause, seek — every change reaches your partner instantly." },
              { icon: Disc3, title: "Shared queue", text: "Build a soundtrack together. Every track, a piece of you both." },
              { icon: MessageCircle, title: "Live chat", text: "Whisper between songs. Typing indicators included." },
              { icon: Headphones, title: "Private rooms", text: "Each room has its own code. Only the people you invite get in." },
            ].map((f) => (
              <div key={f.title} className="glass rounded-2xl p-5 hover:-translate-y-0.5 hover:border-rose-500/30 transition-all" data-testid={`feature-${f.title}`}>
                <div className="w-10 h-10 rounded-xl bg-rose-600/15 grid place-items-center text-rose-400 mb-3">
                  <f.icon className="w-5 h-5" />
                </div>
                <h3 className="font-display text-lg tracking-tight">{f.title}</h3>
                <p className="text-sm text-zinc-400 mt-1.5">{f.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* STORIES */}
      <section id="stories" className="relative px-6 lg:px-12 py-24 max-w-7xl mx-auto">
        <div className="grid lg:grid-cols-12 gap-10 items-center">
          <div className="lg:col-span-6 relative">
            <div className="absolute -inset-6 bg-rose-600/20 blur-3xl rounded-full -z-10" />
            <img src={COUPLE_IMG} alt="" className="rounded-3xl border border-white/10 w-full object-cover aspect-[4/3]" />
          </div>
          <div className="lg:col-span-6">
            <p className="text-[11px] uppercase tracking-[0.3em] text-rose-400 mb-4 flex items-center gap-2">
              <Heart className="w-3.5 h-3.5" /> Made for two
            </p>
            <h2 className="font-display text-4xl lg:text-5xl tracking-tighter font-medium leading-tight">
              Whether you're a flight or a city apart.
            </h2>
            <p className="mt-5 text-zinc-400 leading-relaxed max-w-xl">
              We built Duo-fy for couples in long-distance relationships — and for anyone who believes a shared song still means something. Now your favourite tracks can travel with you, in real time.
            </p>
            <ul className="mt-7 space-y-3 text-sm">
              {["Spotify-quality search across millions of tracks","Synced playback within ~200ms","Persistent rooms — your moments saved","Free during early access"].map((it) => (
                <li key={it} className="flex items-start gap-3 text-zinc-300">
                  <span className="w-1.5 h-1.5 mt-2 rounded-full bg-rose-500 shrink-0" /> {it}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* HOW */}
      <section id="how" className="px-6 lg:px-12 py-24 max-w-7xl mx-auto">
        <p className="text-[11px] uppercase tracking-[0.3em] text-rose-400 mb-4">How it works</p>
        <h2 className="font-display text-4xl lg:text-5xl tracking-tighter font-medium leading-tight max-w-2xl">
          Three taps from a song to a shared moment.
        </h2>
        <div className="mt-10 grid md:grid-cols-3 gap-6">
          {[
            { n: "01", t: "Create a room", d: "Sign up in seconds and spin up a private room. We'll generate a 6-digit code." },
            { n: "02", t: "Invite your duo", d: "Share the code with your partner or friend. They drop in, instantly." },
            { n: "03", t: "Play together", d: "Search, queue, hit play. Everyone hears the same beat at the same moment." },
          ].map((s) => (
            <div key={s.n} className="glass rounded-2xl p-6 hover:border-rose-500/30 transition-colors">
              <p className="font-mono-soft text-xs text-rose-400 mb-3">{s.n}</p>
              <h3 className="font-display text-xl tracking-tight">{s.t}</h3>
              <p className="text-sm text-zinc-400 mt-2 leading-relaxed">{s.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="px-6 lg:px-12 py-24 max-w-7xl mx-auto">
        <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-rose-950/60 via-[#0a0a0a] to-[#0a0a0a] p-10 lg:p-16 grain">
          <div className="absolute -top-20 -right-20 w-80 h-80 bg-rose-600/30 blur-3xl rounded-full" />
          <div className="relative max-w-2xl">
            <h2 className="font-display text-4xl lg:text-5xl tracking-tighter font-medium leading-tight">
              Some songs deserve to be shared in real time.
            </h2>
            <p className="mt-4 text-zinc-400">Free to try. No credit card. Just press play.</p>
            <Link to="/signup" className="mt-7 inline-flex items-center gap-2 bg-rose-600 hover:bg-rose-500 transition-all rounded-full px-7 py-3.5 font-medium shadow-[0_8px_30px_-8px_rgba(225,29,72,0.7)]" data-testid="cta-bottom">
              Create your first room
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="px-6 lg:px-12 py-10 border-t border-white/[0.06] text-xs text-zinc-600 flex flex-col sm:flex-row justify-between gap-4">
        <span>© {new Date().getFullYear()} Duo-fy · A small thing made with care.</span>
        <span className="flex items-center gap-1.5">
          Built with <Heart className="w-3 h-3 text-rose-500" /> for those who listen together.
        </span>
      </footer>
    </div>
  );
}

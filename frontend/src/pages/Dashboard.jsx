import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Plus, KeyRound, Users, ArrowRight, Disc3, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import Sidebar from "../components/Sidebar";
import MobileNav from "../components/MobileNav";
import { api } from "../services/api";
import { useAuth } from "../context/AuthContext";

function timeAgo(iso) {
  try {
    const d = new Date(iso);
    const s = Math.floor((Date.now() - d.getTime()) / 1000);
    if (s < 60) return `${s}s ago`;
    if (s < 3600) return `${Math.floor(s / 60)}m ago`;
    if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
    return `${Math.floor(s / 86400)}d ago`;
  } catch { return ""; }
}

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [rooms, setRooms] = useState([]);
  const [publicRooms, setPublicRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [creating, setCreating] = useState(false);
  const [code, setCode] = useState("");
  const [joining, setJoining] = useState(false);

  useEffect(() => {
    let on = true;
    (async () => {
      try {
        const [mine, pub] = await Promise.all([
          api.get("/rooms/mine"),
          api.get("/rooms/public"),
        ]);
        if (!on) return;
        setRooms(mine.data || []);
        setPublicRooms((pub.data || []).filter(r => r.host_id !== user?.id));
      } catch (_) {}
      finally { if (on) setLoading(false); }
    })();
    return () => { on = false; };
  }, [user?.id]);

  const createRoom = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    setCreating(true);
    try {
      const { data } = await api.post("/rooms", { name: name.trim(), description: description.trim() });
      toast.success(`Room "${data.name}" created · code ${data.code}`);
      navigate(`/room/${data.id}`);
    } catch (e) {
      toast.error("Failed to create room");
    } finally { setCreating(false); }
  };

  const joinByCode = async (e) => {
    e.preventDefault();
    if (!code.trim()) return;
    setJoining(true);
    try {
      const { data } = await api.post("/rooms/join", { code: code.trim().toUpperCase() });
      navigate(`/room/${data.id}`);
    } catch (e) {
      const msg = e.response?.data?.detail || "Room not found";
      toast.error(typeof msg === "string" ? msg : "Room not found");
    } finally { setJoining(false); }
  };

  return (
    <div className="min-h-screen flex bg-[#050505] text-white" data-testid="dashboard-page">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <MobileNav />
        <main className="flex-1 px-6 lg:px-12 py-6 lg:py-10 max-w-7xl">
        <motion.header initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mb-10">
          <p className="text-[11px] uppercase tracking-[0.3em] text-rose-400 mb-2">Dashboard</p>
          <h1 className="font-display text-4xl lg:text-5xl tracking-tighter">
            Hey {user?.name?.split(" ")[0] || "there"} <span className="text-rose-500">·</span> ready to listen?
          </h1>
          <p className="text-zinc-400 mt-2 text-sm">Spin up a new room or hop into an existing one.</p>
        </motion.header>

        <div className="grid lg:grid-cols-2 gap-5">
          {/* Create */}
          <form onSubmit={createRoom} className="glass rounded-3xl p-6 lg:p-7" data-testid="create-room-card">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-rose-600/15 grid place-items-center text-rose-400"><Plus className="w-5 h-5" /></div>
              <h2 className="font-display text-2xl tracking-tight">Create a room</h2>
            </div>
            <div className="space-y-3">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                required maxLength={80}
                placeholder="Room name (e.g. Saturday slow songs)"
                className="w-full bg-zinc-900/60 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-rose-500/50 focus:ring-1 focus:ring-rose-500/30 transition-all"
                data-testid="create-room-name"
              />
              <input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                maxLength={120}
                placeholder="Optional description"
                className="w-full bg-zinc-900/60 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-rose-500/50 focus:ring-1 focus:ring-rose-500/30 transition-all"
                data-testid="create-room-desc"
              />
            </div>
            <button
              type="submit"
              disabled={creating}
              className="mt-4 inline-flex items-center gap-2 bg-rose-600 hover:bg-rose-500 disabled:opacity-50 transition-all rounded-full px-6 py-3 font-medium shadow-[0_8px_30px_-8px_rgba(225,29,72,0.7)]"
              data-testid="create-room-submit"
            >
              {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              Create room
            </button>
          </form>

          {/* Join */}
          <form onSubmit={joinByCode} className="glass rounded-3xl p-6 lg:p-7" data-testid="join-room-card">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-rose-600/15 grid place-items-center text-rose-400"><KeyRound className="w-5 h-5" /></div>
              <h2 className="font-display text-2xl tracking-tight">Join with a code</h2>
            </div>
            <input
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              required maxLength={12}
              placeholder="6-digit code"
              className="w-full bg-zinc-900/60 border border-white/10 rounded-xl px-4 py-3 text-center font-mono-soft tracking-[0.5em] text-lg outline-none focus:border-rose-500/50 focus:ring-1 focus:ring-rose-500/30 transition-all"
              data-testid="join-room-code"
            />
            <button
              type="submit" disabled={joining}
              className="mt-4 inline-flex items-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 transition-all rounded-full px-6 py-3 font-medium"
              data-testid="join-room-submit"
            >
              {joining ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
              Join room
            </button>
          </form>
        </div>

        {/* Your rooms */}
        <section className="mt-14">
          <div className="flex items-end justify-between mb-5">
            <h2 className="font-display text-2xl tracking-tight">Your rooms</h2>
            <span className="text-xs text-zinc-500 font-mono-soft">{rooms.length}</span>
          </div>
          {loading ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[0, 1, 2].map((i) => (
                <div key={i} className="glass rounded-2xl p-5 h-36 shimmer" />
              ))}
            </div>
          ) : rooms.length === 0 ? (
            <div className="glass rounded-2xl p-8 text-center" data-testid="rooms-empty">
              <Disc3 className="w-8 h-8 mx-auto text-zinc-600 mb-3" />
              <p className="text-zinc-400 text-sm">No rooms yet — create one above.</p>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {rooms.map((r) => (
                <button
                  key={r.id}
                  onClick={() => navigate(`/room/${r.id}`)}
                  className="text-left glass rounded-2xl p-5 hover:-translate-y-0.5 hover:border-rose-500/30 transition-all"
                  data-testid={`my-room-${r.id}`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono-soft text-xs text-rose-400">{r.code}</span>
                    <span className="text-[10px] uppercase tracking-[0.25em] text-zinc-500">{timeAgo(r.created_at)}</span>
                  </div>
                  <h3 className="font-display text-xl tracking-tight mt-3 line-clamp-1">{r.name}</h3>
                  {r.description && <p className="text-xs text-zinc-500 mt-1 line-clamp-2">{r.description}</p>}
                  <div className="flex items-center gap-2 mt-4 text-xs text-zinc-500"><Users className="w-3.5 h-3.5" /> {r.member_count} listening</div>
                </button>
              ))}
            </div>
          )}
        </section>

        {/* Discover */}
        {publicRooms.length > 0 && (
          <section className="mt-14">
            <div className="flex items-end justify-between mb-5">
              <h2 className="font-display text-2xl tracking-tight">Discover rooms</h2>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {publicRooms.slice(0, 6).map((r) => (
                <button
                  key={r.id}
                  onClick={() => navigate(`/room/${r.id}`)}
                  className="text-left glass rounded-2xl p-5 hover:-translate-y-0.5 hover:border-rose-500/30 transition-all"
                  data-testid={`discover-room-${r.id}`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase tracking-[0.25em] text-zinc-500">Hosted by {r.host_name}</span>
                    <span className="text-xs text-zinc-500">·</span>
                  </div>
                  <h3 className="font-display text-xl tracking-tight mt-3 line-clamp-1">{r.name}</h3>
                  <div className="flex items-center gap-2 mt-4 text-xs text-zinc-500"><Users className="w-3.5 h-3.5" /> {r.member_count} listening</div>
                </button>
              ))}
            </div>
          </section>
        )}
        </main>
      </div>
    </div>
  );
}

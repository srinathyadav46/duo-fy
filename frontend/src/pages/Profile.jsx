import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Heart, History, Trash2, LogOut, Music, ExternalLink } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import Sidebar from "../components/Sidebar";
import MobileNav from "../components/MobileNav";
import { api } from "../services/api";
import { useAuth } from "../context/AuthContext";

function SongRow({ song, onRemove }) {
  return (
    <div className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-white/[0.04] transition-colors" data-testid={`song-row-${song.track_id}`}>
      {song.artwork ? (
        <img src={song.artwork} alt="" className="w-10 h-10 rounded-md object-cover" />
      ) : (
        <div className="w-10 h-10 rounded-md bg-gradient-to-br from-rose-700 to-zinc-900" />
      )}
      <div className="flex-1 min-w-0">
        <p className="text-sm truncate">{song.title}</p>
        <p className="text-xs text-zinc-500 truncate">{song.artist}</p>
      </div>
      {onRemove && (
        <button onClick={() => onRemove(song.track_id)} className="text-zinc-500 hover:text-rose-400 transition-colors" data-testid={`remove-fav-${song.track_id}`}>
          <Trash2 className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}

function SpotifyCard() {
  const [status, setStatus] = useState({ connected: false, configured: false });
  const [loading, setLoading] = useState(true);
  const [params, setParams] = useSearchParams();

  const refresh = async () => {
    try {
      const { data } = await api.get("/spotify/status");
      setStatus(data);
    } catch (_) {
      setStatus({ connected: false, configured: false });
    } finally { setLoading(false); }
  };

  useEffect(() => { refresh(); }, []);

  useEffect(() => {
    const flag = params.get("spotify");
    if (!flag) return;
    if (flag === "connected") toast.success("Spotify connected!");
    else if (flag === "error") toast.error("Spotify connection cancelled");
    else if (flag === "token_error") toast.error("Spotify token exchange failed");
    else if (flag === "invalid_state") toast.error("Spotify state was invalid — try again");
    setParams({}, { replace: true });
  }, [params, setParams]);

  const connect = async () => {
    try {
      const { data } = await api.get("/spotify/auth-url");
      window.location.href = data.url;
    } catch (e) {
      const msg = e.response?.data?.detail || "Spotify is not configured";
      toast.error(typeof msg === "string" ? msg : "Spotify is not configured");
    }
  };

  const disconnect = async () => {
    try {
      await api.post("/spotify/disconnect");
      toast("Spotify disconnected");
      refresh();
    } catch { toast.error("Could not disconnect"); }
  };

  return (
    <section className="glass rounded-2xl p-5 lg:p-6" data-testid="spotify-card">
      <div className="flex items-center gap-2 mb-3">
        <Music className="w-4 h-4 text-emerald-400" />
        <h2 className="font-display text-xl tracking-tight">Spotify</h2>
        {status.connected && (
          <span className="ml-auto text-[10px] uppercase tracking-[0.25em] text-emerald-400 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> Connected
          </span>
        )}
      </div>

      {loading ? (
        <div className="h-16 rounded-xl bg-white/[0.03] shimmer" />
      ) : !status.configured ? (
        <p className="text-sm text-zinc-400">
          Spotify isn't configured on this server yet. The app currently uses iTunes 30-second previews — full-track Spotify playback unlocks once an admin adds <span className="font-mono-soft text-rose-300">SPOTIFY_CLIENT_ID</span>, <span className="font-mono-soft text-rose-300">SPOTIFY_CLIENT_SECRET</span>, and <span className="font-mono-soft text-rose-300">SPOTIFY_REDIRECT_URI</span>.
        </p>
      ) : status.connected ? (
        <>
          <p className="text-sm text-zinc-400">
            Linked as <span className="text-white">{status.display_name || "Spotify user"}</span>
            {status.product && (
              <span className={`ml-2 text-xs px-2 py-0.5 rounded-full ${status.product === "premium" ? "bg-emerald-500/15 text-emerald-300" : "bg-amber-500/15 text-amber-300"}`}>
                {status.product}
              </span>
            )}
          </p>
          {status.product !== "premium" && (
            <p className="text-xs text-amber-400/80 mt-2">
              Full-track playback requires Premium. We'll fall back to 30-second previews.
            </p>
          )}
          <div className="flex flex-wrap gap-2 mt-4">
            <button
              onClick={disconnect}
              className="text-xs bg-white/5 hover:bg-white/10 border border-white/10 rounded-full px-4 py-2 transition-colors"
              data-testid="spotify-disconnect"
            >
              Disconnect
            </button>
          </div>
        </>
      ) : (
        <>
          <p className="text-sm text-zinc-400">
            Link your Spotify Premium account to play full songs in your rooms — instead of 30-second previews.
          </p>
          <button
            onClick={connect}
            className="mt-4 inline-flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-black rounded-full px-5 py-2.5 text-sm font-medium transition-colors"
            data-testid="spotify-connect"
          >
            <Music className="w-4 h-4" /> Connect Spotify
            <ExternalLink className="w-3.5 h-3.5" />
          </button>
        </>
      )}
    </section>
  );
}

export default function Profile() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [favorites, setFavorites] = useState([]);
  const [recent, setRecent] = useState([]);
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    try {
      const [f, r] = await Promise.all([
        api.get("/users/favorites"),
        api.get("/users/recently-played"),
      ]);
      setFavorites(f.data.favorites || []);
      setRecent(r.data.recently_played || []);
    } catch (_) {}
    finally { setLoading(false); }
  };

  useEffect(() => { refresh(); }, []);

  const removeFav = async (trackId) => {
    try {
      await api.delete(`/users/favorites/${encodeURIComponent(trackId)}`);
      setFavorites((f) => f.filter((x) => x.track_id !== trackId));
      toast("Removed");
    } catch { toast.error("Could not remove"); }
  };

  const initials = (user?.name || "?").split(" ").map(p => p[0]).slice(0, 2).join("").toUpperCase();

  return (
    <div className="min-h-screen flex bg-[#050505] text-white" data-testid="profile-page">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <MobileNav />
        <main className="flex-1 px-6 lg:px-12 py-6 lg:py-10 max-w-5xl">
          <motion.header initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mb-10 flex items-center gap-5">
            <div className="w-16 h-16 lg:w-20 lg:h-20 rounded-full bg-gradient-to-br from-rose-500 to-rose-900 grid place-items-center text-2xl font-display tracking-tighter shrink-0">
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[11px] uppercase tracking-[0.3em] text-rose-400 mb-1">Profile</p>
              <h1 className="font-display text-2xl lg:text-4xl tracking-tighter truncate">{user?.name}</h1>
              <p className="text-zinc-500 text-sm truncate">{user?.email}</p>
            </div>
            <button
              onClick={() => { logout(); navigate("/"); }}
              className="hidden sm:inline-flex items-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 transition-colors rounded-full px-4 py-2 text-sm"
              data-testid="profile-logout"
            >
              <LogOut className="w-4 h-4" /> Sign out
            </button>
          </motion.header>

          <SpotifyCard />

          <div className="grid lg:grid-cols-2 gap-6 mt-6">
            <section className="glass rounded-2xl p-5 lg:p-6">
              <div className="flex items-center gap-2 mb-4">
                <Heart className="w-4 h-4 text-rose-400" />
                <h2 className="font-display text-xl tracking-tight">Favorites</h2>
                <span className="ml-auto text-xs text-zinc-500 font-mono-soft">{favorites.length}</span>
              </div>
              {loading ? (
                <div className="space-y-2">
                  {[0,1,2].map(i => <div key={i} className="h-14 rounded-xl bg-white/[0.03] shimmer" />)}
                </div>
              ) : favorites.length === 0 ? (
                <p className="text-sm text-zinc-500 py-8 text-center" data-testid="favorites-empty">No favorites yet. Tap the heart on a song while listening.</p>
              ) : (
                <div className="space-y-1" data-testid="favorites-list">
                  {favorites.map((s) => <SongRow key={s.track_id} song={s} onRemove={removeFav} />)}
                </div>
              )}
            </section>

            <section className="glass rounded-2xl p-5 lg:p-6">
              <div className="flex items-center gap-2 mb-4">
                <History className="w-4 h-4 text-rose-400" />
                <h2 className="font-display text-xl tracking-tight">Recently played</h2>
                <span className="ml-auto text-xs text-zinc-500 font-mono-soft">{recent.length}</span>
              </div>
              {loading ? (
                <div className="space-y-2">
                  {[0,1,2].map(i => <div key={i} className="h-14 rounded-xl bg-white/[0.03] shimmer" />)}
                </div>
              ) : recent.length === 0 ? (
                <p className="text-sm text-zinc-500 py-8 text-center" data-testid="recent-empty">Nothing yet — start a song to see it here.</p>
              ) : (
                <div className="space-y-1" data-testid="recent-list">
                  {recent.slice(0, 20).map((s, i) => <SongRow key={`${s.track_id}-${i}`} song={s} />)}
                </div>
              )}
            </section>
          </div>
        </main>
      </div>
    </div>
  );
}

import React, { useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { useAuth } from "../context/AuthContext";
import { api } from "../services/api";
import { Music2 } from "lucide-react";

/** Deep-link landing page: /join/:code → auto-join the room. */
export default function JoinByCode() {
  const { code } = useParams();
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      // Stash code & redirect to login; user can complete after auth.
      try { sessionStorage.setItem("duofy.pendingJoin", code || ""); } catch (_) {}
      navigate("/login");
      return;
    }
    (async () => {
      try {
        const { data } = await api.post("/rooms/join", { code: (code || "").toUpperCase() });
        toast.success(`Joining ${data.name}…`);
        navigate(`/room/${data.id}`, { replace: true });
      } catch (e) {
        const msg = e.response?.data?.detail || "Room not found";
        toast.error(typeof msg === "string" ? msg : "Room not found");
        navigate("/dashboard", { replace: true });
      }
    })();
  }, [code, user, loading, navigate]);

  return (
    <div className="min-h-screen grid place-items-center bg-[#050505] text-white" data-testid="join-by-code-page">
      <div className="text-center">
        <div className="w-14 h-14 rounded-2xl bg-rose-600 mx-auto grid place-items-center mb-5 shadow-[0_18px_40px_-10px_rgba(225,29,72,0.6)]">
          <Music2 className="w-7 h-7" />
        </div>
        <p className="text-[11px] uppercase tracking-[0.3em] text-rose-400 mb-2">Joining room</p>
        <h1 className="font-display text-3xl tracking-tighter">{code?.toUpperCase()}</h1>
        <div className="mt-6 w-8 h-8 rounded-full border-2 border-white/10 border-t-rose-500 animate-spin mx-auto" />
      </div>
    </div>
  );
}

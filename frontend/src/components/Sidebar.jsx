import React from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { Home, User, LogOut, Music2, Heart } from "lucide-react";
import { useAuth } from "../context/AuthContext";

const items = [
  { to: "/dashboard", label: "Rooms", icon: Home, testid: "nav-rooms" },
  { to: "/profile", label: "Profile", icon: User, testid: "nav-profile" },
];

/** Internal nav body shared by desktop sidebar and mobile drawer. */
export function NavBody({ onNavigate }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const initials = (user?.name || "?")
    .split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();

  const handleNav = () => onNavigate?.();

  return (
    <div className="flex flex-col h-full" data-testid="nav-body">
      <button
        className="flex items-center gap-2 mb-10 group"
        onClick={() => { navigate("/dashboard"); handleNav(); }}
        data-testid="sidebar-logo"
      >
        <div className="w-9 h-9 rounded-xl bg-rose-600 grid place-items-center shadow-lg shadow-rose-900/40">
          <Music2 className="w-5 h-5 text-white" strokeWidth={2.2} />
        </div>
        <span className="font-display text-2xl tracking-tighter">Duo<span className="text-rose-500">-fy</span></span>
      </button>

      <nav className="flex flex-col gap-1">
        {items.map((it) => (
          <NavLink
            key={it.to}
            to={it.to}
            onClick={handleNav}
            data-testid={it.testid}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-3 rounded-xl transition-colors text-sm ${
                isActive
                  ? "bg-white/[0.06] text-white"
                  : "text-zinc-400 hover:text-white hover:bg-white/[0.03]"
              }`
            }
          >
            <it.icon className="w-4 h-4" />
            {it.label}
          </NavLink>
        ))}
      </nav>

      <div className="mt-auto">
        <div className="flex items-center gap-3 p-3 rounded-xl border border-white/[0.06] bg-white/[0.02]">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-rose-600 to-rose-800 grid place-items-center text-sm font-medium">
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm truncate" data-testid="sidebar-user-name">{user?.name}</p>
            <p className="text-xs text-zinc-500 truncate">{user?.email}</p>
          </div>
          <button
            onClick={() => { logout(); navigate("/"); handleNav(); }}
            data-testid="sidebar-logout"
            className="text-zinc-500 hover:text-rose-400 transition-colors"
            title="Log out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
        <p className="mt-4 text-[10px] uppercase tracking-[0.25em] text-zinc-600 flex items-center gap-2">
          <Heart className="w-3 h-3 text-rose-500/70" /> Synced for two
        </p>
      </div>
    </div>
  );
}

export default function Sidebar() {
  return (
    <aside
      className="hidden lg:flex flex-col w-[260px] shrink-0 h-screen sticky top-0 px-5 py-7 border-r border-white/[0.06] bg-[#0A0A0A]"
      data-testid="sidebar"
    >
      <NavBody />
    </aside>
  );
}

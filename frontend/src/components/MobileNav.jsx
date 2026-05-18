import React, { useState } from "react";
import { Menu, Music2 } from "lucide-react";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "./ui/sheet";
import { NavBody } from "./Sidebar";

/**
 * Mobile-only top bar with a hamburger that opens a side-drawer using the
 * shadcn Sheet component. Pass `subtitle` to display a context line under the
 * brand (e.g. room name).
 */
export default function MobileNav({ title, subtitle, right }) {
  const [open, setOpen] = useState(false);

  return (
    <header
      className="lg:hidden flex items-center gap-3 px-4 py-3 border-b border-white/[0.06] bg-[#0a0a0a]/90 backdrop-blur-xl sticky top-0 z-40"
      data-testid="mobile-nav"
    >
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <button
            className="w-9 h-9 grid place-items-center rounded-xl bg-white/5 hover:bg-white/10 transition-colors"
            data-testid="mobile-nav-trigger"
            aria-label="Open menu"
          >
            <Menu className="w-4 h-4" />
          </button>
        </SheetTrigger>
        <SheetContent
          side="left"
          className="w-[260px] sm:w-[280px] bg-[#0a0a0a] border-r border-white/[0.06] p-5 pt-16 overflow-y-auto"
          data-testid="mobile-nav-drawer"
        >
          <SheetTitle className="sr-only">Navigation menu</SheetTitle>
          <NavBody onNavigate={() => setOpen(false)} />
        </SheetContent>
      </Sheet>

      <div className="flex items-center gap-2 flex-1 min-w-0">
        {!title && (
          <>
            <div className="w-8 h-8 rounded-lg bg-rose-600 grid place-items-center shrink-0">
              <Music2 className="w-4 h-4 text-white" />
            </div>
            <span className="font-display text-xl tracking-tighter">Duo<span className="text-rose-500">-fy</span></span>
          </>
        )}
        {title && (
          <div className="min-w-0 flex-1">
            <p className="text-[10px] uppercase tracking-[0.25em] text-rose-400 truncate">{subtitle}</p>
            <h1 className="font-display text-lg tracking-tight truncate">{title}</h1>
          </div>
        )}
      </div>
      {right}
    </header>
  );
}

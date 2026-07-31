import { useState } from "react";

export default function Panel({ title, defaultOpen = true, right, children }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <section className="rounded-lg border border-zinc-800 bg-zinc-900/70 shadow-md shadow-black/20">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-3 py-2 text-[11px] font-semibold uppercase tracking-widest text-zinc-400 hover:text-zinc-100"
      >
        {title}
        <span className="flex items-center gap-2">
          {right}
          <svg viewBox="0 0 16 16" fill="currentColor"
            className={`w-3 h-3 transition-transform ${open ? "rotate-90" : ""}`}>
            <path d="M6 3l5 5-5 5V3z" />
          </svg>
        </span>
      </button>
      {open && <div className="px-3 pb-3 space-y-3">{children}</div>}
    </section>
  );
}
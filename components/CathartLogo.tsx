// Cathart wordmark + still water mark + definition subtitle

export function CathartLogo() {
  return (
    <div className="flex flex-col items-center gap-1">
      {/* Still water mark — circle above horizon, violet arcs reflected below */}
      <svg viewBox="0 0 64 44" width="72" height="50" fill="none" aria-hidden="true">
        <circle cx="32" cy="12" r="9" stroke="#5eead4" strokeWidth="2" opacity="0.92" />
        <line x1="4" y1="24" x2="60" y2="24" stroke="#78716c" strokeWidth="0.75" />
        <path d="M23 24 Q32 33 41 24" stroke="#a78bfa" strokeWidth="1.75" strokeLinecap="round" opacity="0.52" />
        <path d="M16 24 Q32 40 48 24" stroke="#a78bfa" strokeWidth="1.25" strokeLinecap="round" opacity="0.22" />
      </svg>

      {/* Wordmark + definition */}
      <div className="flex flex-col items-center gap-0.5">
        <span
          className="font-bold tracking-tight bg-gradient-to-r from-teal-400 to-violet-400 bg-clip-text text-transparent leading-none"
          style={{ fontSize: "34px", letterSpacing: "-0.02em" }}
        >
          Cathart
        </span>
        <span className="text-stone-500 text-[11px] italic" style={{ letterSpacing: "0.01em" }}>
          v. to practice the art of catharsis
        </span>
      </div>
    </div>
  );
}

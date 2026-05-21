// Sigils for each emissary — heraldic, hand-marked glyphs. Stroke art,
// currentColor (picks up the card's accent). Ported verbatim from the
// Claude Design handoff bundle (sigils.jsx).

export function SigilSpiral() {
  return (
    <svg viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round">
      {[0, 90, 180, 270].map((a) => (
        <g key={a} transform={`rotate(${a} 50 50)`}>
          <line x1="50" y1="6" x2="50" y2="14" />
        </g>
      ))}
      {[45, 135, 225, 315].map((a) => (
        <g key={a} transform={`rotate(${a} 50 50)`} opacity="0.45">
          <line x1="50" y1="14" x2="50" y2="46" strokeDasharray="1 3" />
        </g>
      ))}
      <circle cx="50" cy="50" r="38" />
      <circle cx="50" cy="50" r="29" opacity="0.78" />
      <circle cx="50" cy="50" r="20" opacity="0.6" />
      <circle cx="50" cy="50" r="11" opacity="0.45" />
      <circle cx="50" cy="50" r="2" fill="currentColor" stroke="none" />
      {Array.from({ length: 24 }).map((_, i) => {
        const a = i * 15;
        const inner = i % 6 === 0 ? 35 : 36.5;
        const rad = (a * Math.PI) / 180;
        return (
          <line
            key={i}
            x1={50 + Math.sin(rad) * inner}
            y1={50 - Math.cos(rad) * inner}
            x2={50 + Math.sin(rad) * 38}
            y2={50 - Math.cos(rad) * 38}
            opacity={i % 6 === 0 ? 0.9 : 0.35}
          />
        );
      })}
    </svg>
  );
}

export function SigilBootstrap() {
  return (
    <svg viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
      <g transform="rotate(45 50 50)">
        <rect x="14" y="14" width="72" height="72" />
        <rect x="24" y="24" width="52" height="52" opacity="0.7" />
        <rect x="34" y="34" width="32" height="32" opacity="0.45" />
      </g>
      <circle cx="50" cy="50" r="2.2" fill="currentColor" stroke="none" />
      {[0, 90, 180, 270].map((a) => (
        <g key={a} transform={`rotate(${a} 50 50)`}>
          <line x1="50" y1="0" x2="50" y2="6" strokeWidth="1.6" />
        </g>
      ))}
      <g opacity="0.95">
        <line x1="50" y1="50" x2="50" y2="38" strokeWidth="1.6" />
        <path d="M 45 42 L 50 36 L 55 42" strokeWidth="1.6" />
      </g>
    </svg>
  );
}

export function SigilCartographer() {
  return (
    <svg viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="50" cy="50" r="38" opacity="0.7" />
      <path d="M 50 14 L 54 46 L 50 50 L 46 46 Z" fill="currentColor" stroke="none" />
      <path d="M 50 86 L 54 54 L 50 50 L 46 54 Z" fill="currentColor" stroke="none" opacity="0.85" />
      <path d="M 14 50 L 46 54 L 50 50 L 46 46 Z" fill="currentColor" stroke="none" opacity="0.7" />
      <path d="M 86 50 L 54 46 L 50 50 L 54 54 Z" fill="currentColor" stroke="none" opacity="0.85" />
      {[45, 135, 225, 315].map((a) => (
        <g key={a} transform={`rotate(${a} 50 50)`} opacity="0.45">
          <line x1="50" y1="22" x2="50" y2="50" />
        </g>
      ))}
      <g fill="currentColor" stroke="none">
        <circle cx="22" cy="22" r="1.2" />
        <circle cx="30" cy="14" r="1.2" />
        <circle cx="36" cy="24" r="1.2" />
        <circle cx="78" cy="22" r="1.2" />
        <circle cx="70" cy="14" r="1.2" />
        <circle cx="68" cy="30" r="1.2" />
        <circle cx="22" cy="78" r="1.2" />
        <circle cx="32" cy="86" r="1.2" />
        <circle cx="78" cy="78" r="1.2" />
        <circle cx="68" cy="86" r="1.2" />
      </g>
      <g opacity="0.4" strokeWidth="0.8">
        <line x1="22" y1="22" x2="30" y2="14" />
        <line x1="30" y1="14" x2="36" y2="24" />
        <line x1="70" y1="14" x2="78" y2="22" />
        <line x1="70" y1="14" x2="68" y2="30" />
        <line x1="22" y1="78" x2="32" y2="86" />
        <line x1="68" y1="86" x2="78" y2="78" />
      </g>
    </svg>
  );
}

export function SigilForge() {
  return (
    <svg viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
      <line x1="10" y1="82" x2="90" y2="82" strokeWidth="1.6" />
      <line x1="14" y1="26" x2="86" y2="26" strokeWidth="1.6" />
      <line x1="10" y1="22" x2="90" y2="22" strokeWidth="1.6" />
      <g>
        <line x1="22" y1="30" x2="22" y2="78" />
        <line x1="28" y1="30" x2="28" y2="78" />
        <line x1="22" y1="78" x2="28" y2="78" />
        <line x1="22" y1="30" x2="28" y2="30" />
      </g>
      <g>
        <line x1="47" y1="30" x2="47" y2="78" />
        <line x1="53" y1="30" x2="53" y2="78" />
        <line x1="47" y1="78" x2="53" y2="78" />
        <line x1="47" y1="30" x2="53" y2="30" />
      </g>
      <g>
        <line x1="72" y1="30" x2="72" y2="78" />
        <line x1="78" y1="30" x2="78" y2="78" />
        <line x1="72" y1="78" x2="78" y2="78" />
        <line x1="72" y1="30" x2="78" y2="30" />
      </g>
      <path d="M 14 22 L 50 6 L 86 22" />
      <circle cx="50" cy="14" r="2.2" fill="currentColor" stroke="none" />
      <g opacity="0.4">
        <line x1="25" y1="38" x2="25" y2="72" />
        <line x1="50" y1="38" x2="50" y2="72" />
        <line x1="75" y1="38" x2="75" y2="72" />
      </g>
    </svg>
  );
}

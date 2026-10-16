/**
 * Original appliance illustrations (no third-party assets). Used when a category/service
 * has no uploaded photo. Admins can upload real photos in the catalogue manager.
 */
type Kind = "ac" | "washer" | "fridge" | "microwave" | "generic";

export function ApplianceArt({ kind, className, title }: { kind: string; className?: string; title?: string }) {
  const k = (["ac", "washer", "fridge", "microwave"].includes(kind) ? kind : "generic") as Kind;
  return (
    <svg viewBox="0 0 240 180" preserveAspectRatio="xMidYMid slice" className={className} role="img" aria-label={title ?? `${k} illustration`}>
      <defs>
        <linearGradient id={`bg-${k}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#FFF4EC" />
          <stop offset="1" stopColor="#FFE4D1" />
        </linearGradient>
        <linearGradient id={`body-${k}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#FFFFFF" />
          <stop offset="1" stopColor="#EEEFF2" />
        </linearGradient>
        <linearGradient id={`glass-${k}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#FD5E0C" />
          <stop offset="1" stopColor="#1E2024" />
        </linearGradient>
        <filter id={`sh-${k}`} x="-20%" y="-20%" width="140%" height="150%">
          <feDropShadow dx="0" dy="6" stdDeviation="7" floodColor="#1E2024" floodOpacity="0.16" />
        </filter>
      </defs>
      <rect width="240" height="180" fill={`url(#bg-${k})`} />
      <circle cx="196" cy="34" r="46" fill="#FFFFFF" opacity="0.55" />
      <circle cx="30" cy="160" r="40" fill="#D6D8DC" opacity="0.45" />
      <ellipse cx="120" cy="160" rx="70" ry="6" fill="#1E2024" opacity="0.08" />
      {k === "ac" && <AC />}
      {k === "washer" && <Washer />}
      {k === "fridge" && <Fridge />}
      {k === "microwave" && <Microwave />}
      {k === "generic" && <Generic />}
    </svg>
  );
}

function AC() {
  return (
    <g filter="url(#sh-ac)">
      <rect x="38" y="44" width="164" height="58" rx="14" fill="url(#body-ac)" stroke="#D6D8DC" />
      <rect x="38" y="86" width="164" height="16" rx="8" fill="#E6E7EA" />
      {[0, 1, 2, 3, 4, 5, 6].map((i) => (
        <rect key={i} x={52 + i * 20} y="91" width="14" height="3" rx="1.5" fill="#B3B6BD" />
      ))}
      <rect x="160" y="56" width="28" height="10" rx="3" fill="#1E2024" />
      <text x="174" y="64" textAnchor="middle" fontSize="8" fontWeight="700" fill="#7CF0B0" fontFamily="sans-serif">
        24°
      </text>
      <circle cx="52" cy="61" r="3" fill="#16A34A" />
      <g stroke="#FD5E0C" strokeWidth="3" strokeLinecap="round" fill="none" opacity="0.75">
        <path d="M78 116c6 6 6 14 0 20" />
        <path d="M120 116c6 6 6 14 0 20" />
        <path d="M162 116c6 6 6 14 0 20" />
      </g>
      <g stroke="#B3B6BD" strokeWidth="2" strokeLinecap="round" fill="none">
        <path d="M98 118c5 5 5 11 0 16" />
        <path d="M140 118c5 5 5 11 0 16" />
      </g>
    </g>
  );
}

function Washer() {
  return (
    <g filter="url(#sh-washer)">
      <rect x="70" y="26" width="100" height="128" rx="12" fill="url(#body-washer)" stroke="#D6D8DC" />
      <rect x="70" y="26" width="100" height="26" rx="12" fill="#E6E7EA" />
      <rect x="70" y="44" width="100" height="8" fill="#E6E7EA" />
      <rect x="80" y="33" width="34" height="11" rx="3" fill="#1E2024" />
      <rect x="84" y="37" width="14" height="3" rx="1.5" fill="#7CF0B0" />
      <circle cx="150" cy="39" r="7" fill="#FFFFFF" stroke="#B3B6BD" strokeWidth="2" />
      <circle cx="132" cy="39" r="3" fill="#B3B6BD" />
      <circle cx="120" cy="101" r="38" fill="#FFFFFF" stroke="#D6D8DC" strokeWidth="3" />
      <circle cx="120" cy="101" r="29" fill="url(#glass-washer)" />
      <path d="M92 108c8-6 16 6 28 0s20 6 28 0v8c-6 14-18 20-28 20s-22-6-28-20z" fill="#FF8A47" opacity="0.7" />
      <path d="M104 84c6-6 16-8 24-4" stroke="#FFFFFF" strokeWidth="4" strokeLinecap="round" opacity="0.55" fill="none" />
    </g>
  );
}

function Fridge() {
  return (
    <g filter="url(#sh-fridge)">
      <rect x="78" y="14" width="84" height="146" rx="12" fill="url(#body-fridge)" stroke="#D6D8DC" />
      <line x1="78" y1="64" x2="162" y2="64" stroke="#D6D8DC" strokeWidth="3" />
      <rect x="146" y="30" width="6" height="22" rx="3" fill="#4B4F57" />
      <rect x="146" y="76" width="6" height="40" rx="3" fill="#4B4F57" />
      <rect x="90" y="26" width="26" height="12" rx="3" fill="#1E2024" />
      <text x="103" y="35" textAnchor="middle" fontSize="8" fontWeight="700" fill="#7CF0B0" fontFamily="sans-serif">
        4°
      </text>
      <g stroke="#B3B6BD" strokeWidth="2" strokeLinecap="round">
        <path d="M100 90v14M93 97h14M95 92l10 10M105 92l-10 10" />
      </g>
      <rect x="84" y="150" width="8" height="10" rx="2" fill="#B3B6BD" />
      <rect x="148" y="150" width="8" height="10" rx="2" fill="#B3B6BD" />
    </g>
  );
}

function Microwave() {
  return (
    <g filter="url(#sh-microwave)">
      <rect x="40" y="48" width="160" height="92" rx="12" fill="url(#body-microwave)" stroke="#D6D8DC" />
      <rect x="52" y="60" width="104" height="68" rx="8" fill="url(#glass-microwave)" />
      <path d="M64 70l30 0-38 46z" fill="#FFFFFF" opacity="0.12" />
      <ellipse cx="104" cy="114" rx="30" ry="6" fill="#FF8A47" opacity="0.6" />
      <path d="M92 108c0-10 24-10 24 0z" fill="#F59E0B" opacity="0.9" />
      <rect x="166" y="62" width="24" height="12" rx="3" fill="#1E2024" />
      <text x="178" y="71" textAnchor="middle" fontSize="7" fontWeight="700" fill="#7CF0B0" fontFamily="sans-serif">
        2:00
      </text>
      {[0, 1, 2].map((r) =>
        [0, 1].map((c) => <rect key={`${r}${c}`} x={167 + c * 12} y={82 + r * 11} width="9" height="7" rx="2" fill="#D6D8DC" />),
      )}
      <circle cx="178" cy="124" r="7" fill="#FFFFFF" stroke="#B3B6BD" strokeWidth="2" />
    </g>
  );
}

function Generic() {
  return (
    <g filter="url(#sh-generic)">
      <rect x="70" y="40" width="100" height="100" rx="20" fill="url(#body-generic)" stroke="#D6D8DC" />
      <path d="M102 112l30-30m-6-10a14 14 0 1 1 16 16l-6-2-34 34a6 6 0 0 1-8-8l34-34z" stroke="#FD5E0C" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </g>
  );
}

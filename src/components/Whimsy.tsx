/* Little woodland illustrations. All colors come from CSS variables so they follow light/dark. */

export function HeroScene({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 400 130" preserveAspectRatio="xMidYMax slice" className={className} aria-hidden="true">
      <defs>
        <linearGradient id="sky" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="var(--sky1)" /><stop offset="1" stopColor="var(--sky2)" />
        </linearGradient>
      </defs>
      <rect width="400" height="130" fill="url(#sky)" />
      {/* sun / moon */}
      <circle cx="338" cy="30" r="14" fill="var(--sun)" opacity=".9" />
      {/* drifting leaves */}
      <g fill="var(--leaf)" opacity=".85">
        <path d="M60 24c6-8 14-6 14-6s0 9-8 12c-4 1-6-2-6-6z" />
        <path d="M150 12c5-6 11-5 11-5s0 7-6 9c-3 1-5-1-5-4z" transform="rotate(30 155 12)" />
        <path d="M250 40c5-6 11-5 11-5s0 7-6 9c-3 1-5-1-5-4z" transform="rotate(-20 255 40)" />
      </g>
      {/* birds */}
      <g stroke="var(--bark)" strokeWidth="1.6" fill="none" strokeLinecap="round" opacity=".6">
        <path d="M200 28q4-5 8 0q4-5 8 0" /><path d="M222 42q3-4 6 0q3-4 6 0" />
      </g>
      {/* far hills */}
      <path d="M0 92Q60 60 130 84T260 78T400 88V130H0Z" fill="var(--hill1)" />
      {/* pines on far hill */}
      <g fill="var(--pine2)">
        <path d="M24 88l9-26 9 26z" /><path d="M42 90l7-20 7 20z" /><path d="M300 82l8-24 8 24z" /><path d="M318 84l6-17 6 17z" /><path d="M360 88l7-20 7 20z" />
      </g>
      {/* near hill */}
      <path d="M0 112Q90 86 190 106T400 100V130H0Z" fill="var(--hill2)" />
      {/* cottage */}
      <g transform="translate(150 70)">
        <rect x="10" y="26" width="52" height="34" rx="3" fill="var(--wall)" />
        <path d="M2 30L36 6l34 24z" fill="var(--roof)" />
        <rect x="48" y="8" width="8" height="14" fill="var(--bark)" />
        <rect x="29" y="38" width="14" height="22" rx="7" fill="var(--door)" />
        <rect x="14" y="34" width="11" height="11" rx="2" fill="var(--glow)" /><path d="M19.5 34v11M14 39.5h11" stroke="var(--bark)" strokeWidth="1" />
        <rect x="47" y="34" width="11" height="11" rx="2" fill="var(--glow)" /><path d="M52.5 34v11M47 39.5h11" stroke="var(--bark)" strokeWidth="1" />
        {/* chimney smoke */}
        <g fill="var(--smoke)" opacity=".7"><circle cx="52" cy="2" r="3.5" /><circle cx="56" cy="-6" r="4.5" /><circle cx="53" cy="-15" r="5.5" /></g>
      </g>
      {/* near pines */}
      <g fill="var(--pine1)">
        <path d="M96 112l11-34 11 34z" /><path d="M106 114l9-27 9 27z" /><path d="M262 108l10-30 10 30z" />
      </g>
      <g fill="var(--bark)"><rect x="105" y="112" width="4" height="8" /><rect x="268" y="108" width="4" height="9" /></g>
      {/* mushrooms */}
      <Mushroom x={50} y={106} s={0.9} />
      <Mushroom x={330} y={104} s={1.1} />
      <Mushroom x={346} y={110} s={0.7} />
      {/* foreground grass */}
      <path d="M0 122Q100 112 200 120T400 118V130H0Z" fill="var(--hill3)" />
    </svg>
  );
}

function Mushroom({ x, y, s }: { x: number; y: number; s: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <rect x="-3" y="0" width="6" height="9" rx="2.5" fill="var(--cream)" />
      <path d="M-11 1a11 9 0 0 1 22 0z" fill="var(--berry)" />
      <circle cx="-4" cy="-3" r="1.8" fill="var(--cream)" /><circle cx="3" cy="-5" r="1.5" fill="var(--cream)" /><circle cx="6" cy="-1" r="1.2" fill="var(--cream)" />
    </g>
  );
}

export function Acorn({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" className="inline-block align-[-3px]">
      <path d="M12 2c1 0 1.5.8 1.5 1.8" stroke="var(--bark)" strokeWidth="1.6" strokeLinecap="round" fill="none" />
      <path d="M3.5 11C3.5 7 7.5 5 12 5s8.5 2 8.5 6z" fill="var(--bark)" />
      <path d="M5 11h14c0 5-3 10-7 11-4-1-7-6-7-11z" fill="var(--gold)" />
      <path d="M8 10.5l1.5-1.5M11 10l1.5-1.5M14.5 10l1.5-1.5" stroke="var(--cream)" strokeWidth=".9" strokeLinecap="round" opacity=".7" />
    </svg>
  );
}

export function Leaf({ size = 18, color = "var(--moss)" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" className="inline-block align-[-3px]">
      <path d="M4 20C4 9 11 3 21 3c0 10-6 17-15 17z" fill={color} />
      <path d="M4 20L15 9" stroke="var(--cream)" strokeWidth="1.4" strokeLinecap="round" opacity=".8" />
    </svg>
  );
}

export function Cottage({ size = 56 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
      <circle cx="32" cy="32" r="30" fill="var(--sky2)" />
      <path d="M2 50Q32 38 62 50V64H2Z" fill="var(--hill2)" />
      <rect x="16" y="30" width="32" height="22" rx="3" fill="var(--wall)" />
      <path d="M10 33L32 14l22 19z" fill="var(--roof)" />
      <rect x="40" y="16" width="5" height="9" fill="var(--bark)" />
      <rect x="28" y="38" width="9" height="14" rx="4.5" fill="var(--door)" />
      <rect x="19" y="36" width="7" height="7" rx="1.5" fill="var(--glow)" />
      <rect x="39" y="36" width="7" height="7" rx="1.5" fill="var(--glow)" />
    </svg>
  );
}

/* A row of tiny mushrooms / acorns to close out a page */
export function Footer() {
  return (
    <div className="mt-10 flex items-center justify-center gap-3 text-xs text-muted">
      <Leaf size={14} /><span>Made with care for the cottage</span><Acorn size={16} />
    </div>
  );
}

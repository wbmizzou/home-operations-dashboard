/* Little woodland illustrations. All colors come from CSS variables so they follow light/dark. */

/** `hollow` = the illustration of the original house; `cottage` = a generic storybook cottage for everyone else. */
export function HeroScene({ className = "", variant = "hollow" }: { className?: string; variant?: "hollow" | "cottage" }) {
  return (
    <svg viewBox="0 0 400 130" preserveAspectRatio="xMidYMax slice" className={className} aria-hidden="true">
      <defs>
        <linearGradient id="sky" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="var(--sky1)" /><stop offset="1" stopColor="var(--sky2)" />
        </linearGradient>
      </defs>
      <rect width="400" height="130" fill="url(#sky)" />
      <circle cx="352" cy="26" r="13" fill="var(--sun)" opacity=".9" />
      {/* drifting leaves + birds */}
      <g fill="var(--leaf)" opacity=".85">
        <path d="M70 22c6-8 14-6 14-6s0 9-8 12c-4 1-6-2-6-6z" />
        <path d="M210 14c5-6 11-5 11-5s0 7-6 9c-3 1-5-1-5-4z" transform="rotate(30 215 14)" />
        <path d="M320 50c5-6 11-5 11-5s0 7-6 9c-3 1-5-1-5-4z" transform="rotate(-20 325 50)" />
      </g>
      <g stroke="var(--bark)" strokeWidth="1.6" fill="none" strokeLinecap="round" opacity=".6">
        <path d="M268 30q4-5 8 0q4-5 8 0" /><path d="M290 42q3-4 6 0q3-4 6 0" />
      </g>

      {/* distant woods */}
      <path d="M0 96Q70 70 140 90T270 84T400 94V130H0Z" fill="var(--hill1)" />
      <g fill="var(--pine2)">
        <path d="M18 94l8-24 8 24z" /><path d="M34 96l7-19 7 19z" /><path d="M84 90l7-21 7 21z" />
        <path d="M312 88l8-24 8 24z" /><path d="M330 92l7-20 7 20z" /><path d="M372 94l8-23 8 23z" />
      </g>

      {/* lawn */}
      <path d="M0 106Q100 98 200 104T400 102V130H0Z" fill="var(--lawn)" />

{variant === "hollow" ? (
        <>
      {/* fence + bins */}
      <g>
        <rect x="318" y="86" width="44" height="22" fill="var(--fence)" />
        <g stroke="var(--bark)" strokeWidth=".6" opacity=".5">{[324, 330, 336, 342, 348, 354].map((x) => <line key={x} x1={x} x2={x} y1="86" y2="108" />)}</g>
        <rect x="68" y="94" width="6" height="9" rx="1" fill="var(--bin1)" />
        <rect x="75" y="94" width="6" height="9" rx="1" fill="var(--bin2)" />
        <rect x="82" y="94" width="6" height="9" rx="1" fill="var(--bin1)" />
      </g>

      {/* the house: split-level, gray brick, white upper floor, yellow door */}
      <g transform="translate(112 46)">
        {/* garage wing */}
        <rect x="0" y="30" width="66" height="30" fill="var(--brick)" />
        <g stroke="var(--brickLine)" strokeWidth=".6" opacity=".6">{[38, 46, 54].map((y) => <line key={y} x1="0" x2="66" y1={y} y2={y} />)}</g>
        {/* long low roof over garage + porch */}
        <path d="M-5 31L8 21H100L108 31Z" fill="var(--roofD)" />
        {/* upper floor */}
        <rect x="88" y="10" width="70" height="28" fill="var(--wall)" />
        <path d="M82 13L94 3H152L164 13Z" fill="var(--roofD)" />
        {[[97, 16], [128, 16]].map(([x, y]) => (
          <g key={x}>
            <rect x={x - 4} y={y} width="3.5" height="13" fill="var(--shutter)" />
            <rect x={x + 13} y={y} width="3.5" height="13" fill="var(--shutter)" />
            <rect x={x} y={y} width="13" height="13" rx="1" fill="var(--glass)" stroke="var(--wall)" strokeWidth="1.2" />
            <path d={`M${x + 6.5} ${y}v13M${x} ${y + 6.5}h13`} stroke="var(--wall)" strokeWidth="1" />
          </g>
        ))}
        {/* lower brick under upper floor */}
        <rect x="88" y="38" width="70" height="22" fill="var(--brick)" />
        <g stroke="var(--brickLine)" strokeWidth=".6" opacity=".6">{[44, 50, 56].map((y) => <line key={y} x1="88" x2="158" y1={y} y2={y} />)}</g>
        <rect x="98" y="46" width="18" height="6" rx="1" fill="var(--glass)" stroke="var(--wall)" strokeWidth="1" />
        <rect x="130" y="46" width="18" height="6" rx="1" fill="var(--glass)" stroke="var(--wall)" strokeWidth="1" />
        {/* covered porch */}
        <rect x="66" y="31" width="22" height="29" fill="var(--wall)" opacity=".92" />
        <rect x="68" y="35" width="3" height="25" fill="var(--wall)" stroke="var(--brickLine)" strokeWidth=".4" />
        <rect x="84" y="35" width="3" height="25" fill="var(--wall)" stroke="var(--brickLine)" strokeWidth=".4" />
        <rect x="73" y="36" width="9" height="24" rx="1.5" fill="var(--doorY)" />
        <circle cx="79" cy="49" r=".9" fill="var(--bark)" />
        <circle cx="72" cy="40" r="1.6" fill="var(--glow)" /><circle cx="83" cy="40" r="1.6" fill="var(--glow)" />
        {/* steps / walk */}
        <path d="M70 60h14l6 6H64z" fill="var(--step)" />
        {/* front shrubs */}
        <g fill="var(--shrub)">
          <ellipse cx="100" cy="60" rx="7" ry="5" /><ellipse cx="116" cy="61" rx="6" ry="4.5" /><ellipse cx="136" cy="61" rx="6.5" ry="4.8" /><ellipse cx="152" cy="61" rx="6" ry="4.5" />
          <ellipse cx="58" cy="60" rx="8" ry="5.5" />
        </g>
      </g>

      {/* the pine in front of the house */}
      <g>
        <rect x="163" y="98" width="6" height="18" fill="var(--bark)" />
        <g fill="var(--pine1)">
          <path d="M166 68l11 17h-22z" /><path d="M166 76l14 20h-28z" /><path d="M166 85l17 20h-34z" />
        </g>
      </g>

      {/* small bare tree by the walkway */}
      <g stroke="var(--bark)" strokeLinecap="round" fill="none">
        <path d="M262 112V80" strokeWidth="2.6" />
        <path d="M262 92q-9-7-14-16M262 88q9-8 15-18M262 84q-3-9-2-17M254 82q-6 1-11 6" strokeWidth="1.5" />
      </g>

        </>
      ) : (
        <>
      {/* a generic storybook cottage */}
      <g transform="translate(150 62)">
        <rect x="10" y="26" width="62" height="38" rx="3" fill="var(--wall)" />
        <path d="M0 30L41 4l41 26z" fill="var(--roof)" />
        <rect x="58" y="8" width="8" height="16" fill="var(--bark)" />
        <g fill="var(--smoke)" opacity=".7"><circle cx="62" cy="2" r="3.5" /><circle cx="66" cy="-6" r="4.5" /><circle cx="63" cy="-15" r="5.5" /></g>
        <rect x="34" y="40" width="14" height="24" rx="7" fill="var(--door)" />
        <rect x="16" y="36" width="12" height="12" rx="2" fill="var(--glow)" /><path d="M22 36v12M16 42h12" stroke="var(--bark)" strokeWidth="1" />
        <rect x="54" y="36" width="12" height="12" rx="2" fill="var(--glow)" /><path d="M60 36v12M54 42h12" stroke="var(--bark)" strokeWidth="1" />
        <g fill="var(--shrub)"><ellipse cx="8" cy="63" rx="8" ry="5.5" /><ellipse cx="78" cy="63" rx="8" ry="5.5" /></g>
      </g>
      <g fill="var(--pine1)"><path d="M104 112l11-34 11 34z" /><path d="M262 108l10-30 10 30z" /></g>
      <g fill="var(--bark)"><rect x="113" y="112" width="4" height="8" /><rect x="268" y="108" width="4" height="9" /></g>

        </>
      )}

      {/* pine-straw yard */}
      <path d="M0 114Q100 108 200 113T400 110V130H0Z" fill="var(--straw)" />
      <g stroke="var(--strawLine)" strokeWidth="1" strokeLinecap="round" opacity=".7">
        <path d="M20 122l9-3M58 125l8-2M96 120l9 2M140 124l9-3M200 121l9 2M246 125l8-2M300 121l9-3M350 124l8 2M380 119l8-2" />
      </g>
      <g fill="var(--bark)" opacity=".7"><ellipse cx="44" cy="120" rx="2.4" ry="1.6" /><ellipse cx="170" cy="124" rx="2.4" ry="1.6" /><ellipse cx="320" cy="124" rx="2.4" ry="1.6" /></g>

      <Mushroom x={30} y={118} s={0.8} />
      <Mushroom x={362} y={120} s={0.9} />
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

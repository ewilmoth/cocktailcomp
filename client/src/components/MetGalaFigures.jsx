// Purely decorative Met Gala silhouettes for the login screen. Flat gold
// gradient fills with a thin dark stroke to separate overlapping shapes of
// the same color (headdress/collar/bow over the gown).
export default function MetGalaFigures({ className }) {
  return (
    <svg
      className={className}
      viewBox="0 0 900 560"
      xmlns="http://www.w3.org/2000/svg"
      role="presentation"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="metgala-gold" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#f0d9a8" />
          <stop offset="55%" stopColor="#caa25d" />
          <stop offset="100%" stopColor="#8f6a30" />
        </linearGradient>
      </defs>

      <g fill="#f5ead7">
        <path opacity="0.85" d="M60,80 Q66,86 60,110 Q54,86 60,80" />
        <path opacity="0.6" d="M250,50 Q254,54 250,68 Q246,54 250,50" />
        <path opacity="0.6" d="M640,250 Q644,254 640,268 Q636,254 640,250" />
        <path opacity="0.9" d="M690,90 Q694,94 690,108 Q686,94 690,90" />
        <path opacity="0.5" d="M850,160 Q854,164 850,178 Q846,164 850,160" />
        <path opacity="0.6" d="M30,300 Q34,304 30,318 Q26,304 30,300" />
        <path opacity="0.7" d="M870,320 Q874,324 870,338 Q866,324 870,320" />
      </g>

      {/* Feather headdress, structured trumpet gown, jagged hem + train */}
      <g fill="url(#metgala-gold)" stroke="#0d0a08" strokeWidth="4" strokeLinejoin="round">
        <path d="M175,95 L158,8 L170,92 Z" />
        <path d="M175,95 L182,2 L188,93 Z" />
        <path d="M175,95 L200,12 L191,96 Z" />
        <path d="M175,95 L146,16 L156,99 Z" />
        <path d="M175,95 L120,32 L148,104 Z" />
        <path d="M175,95 L220,28 L196,103 Z" />
        <circle cx="175" cy="118" r="24" />
        <rect x="167" y="139" width="16" height="16" />
        <path
          d="M155,158
             L 197,158
             C 212,172 218,190 214,208
             C 240,244 258,290 268,340
             C 282,414 296,486 310,558
             L 250,540
             L 198,486
             L 150,540
             L 100,492
             L 58,540
             L 10,486
             C 18,452 30,414 46,374
             C 74,306 112,248 138,208
             C 134,190 140,172 155,158 Z"
        />
      </g>

      {/* Peacock sunburst collar + fitted gown */}
      <g fill="url(#metgala-gold)" stroke="#0d0a08" strokeWidth="4" strokeLinejoin="round">
        <path d="M450,160 L290,120 L305,150 Z" />
        <path d="M450,160 L330,75 L350,115 Z" />
        <path d="M450,160 L380,45 L395,95 Z" />
        <path d="M450,160 L425,28 L435,85 Z" />
        <path d="M450,160 L455,20 L465,85 Z" />
        <path d="M450,160 L495,28 L480,88 Z" />
        <path d="M450,160 L525,48 L500,98 Z" />
        <path d="M450,160 L565,78 L535,115 Z" />
        <path d="M450,160 L605,122 L570,150 Z" />
        <circle cx="450" cy="108" r="23" />
        <rect x="442" y="128" width="16" height="16" />
        <path
          d="M424,176
             C 406,220 398,320 396,540
             L 504,540
             C 502,320 494,220 476,176
             C 460,166 440,166 424,176 Z"
        />
      </g>

      {/* Voluminous ball gown with statement bow + hair comb */}
      <g fill="url(#metgala-gold)" stroke="#0d0a08" strokeWidth="4" strokeLinejoin="round">
        <path d="M730,55 L740,2 L747,60 Z" />
        <circle cx="728" cy="92" r="22" />
        <rect x="721" y="111" width="14" height="14" />
        <path d="M700,127 C696,142 695,162 698,182 L760,182 C763,162 762,142 758,127 C 744,119 714,119 700,127 Z" />
        <path
          d="M702,186
             C 610,220 548,320 542,540
             L 916,540
             C 910,320 848,220 756,186
             C 738,196 720,196 702,186 Z"
        />
        <path d="M700,208 L 620,182 C 600,206 606,240 632,250 C 658,258 692,236 700,214 Z" />
        <path d="M760,208 L 840,182 C 860,206 854,240 828,250 C 802,258 768,236 760,214 Z" />
        <rect x="710" y="200" width="40" height="24" rx="5" />
      </g>
    </svg>
  );
}

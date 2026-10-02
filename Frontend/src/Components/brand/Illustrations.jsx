/**
 * ChopNow cut-paper illustration set (LayersbyJ revamp).
 *
 * Every shape is a flat silhouette with one to three thin "highlight" strokes,
 * the way a paper cut-out catches light. Shapes are meant to be placed inside a
 * Tile with `overflow-hidden` so the tile edge crops them.
 *
 * Common props:
 *   fill      main silhouette colour (CSS colour or var())
 *   detail    highlight / cut colour (usually the tile's own colour)
 *   className size + position (width drives the scale, height is auto)
 *   rotate    degrees, rotates around the shape's centre
 */

const C = {
  moringa: 'var(--color-moringa)',
  moringa2: 'var(--color-moringa-2)',
  yellow: 'var(--color-yellow)',
  pepper: 'var(--color-pepper)',
  fufu: 'var(--color-fufu)',
  char: 'var(--color-char)',
  lime: 'var(--color-lime)',
  peach: 'var(--color-peach)',
  mint: 'var(--color-mint)',
  clay: 'var(--color-clay)',
};

const Svg = ({ viewBox, className, rotate = 0, origin, children, label }) => (
  <svg
    viewBox={viewBox}
    className={className}
    aria-hidden={label ? undefined : 'true'}
    role={label ? 'img' : undefined}
    aria-label={label}
    focusable="false"
  >
    <g transform={rotate ? `rotate(${rotate} ${origin})` : undefined}>{children}</g>
  </svg>
);

/* ---------- Brand mark ---------- */

export const CMark = ({ fill = C.yellow, className = 'w-8', label }) => (
  <svg
    viewBox="95 54 38 40"
    className={className}
    aria-hidden={label ? undefined : 'true'}
    role={label ? 'img' : undefined}
    aria-label={label}
  >
    <path
      fill={fill}
      d="M127.19 60.39C119.94 53.86 108.81 54.29 102.03 61.31C95.24 68.34 95.24 79.47 102.03 86.49C108.81 93.52 119.94 93.91 127.19 87.37L129.3 89.72L132.43 77.88L120.34 79.76L122.45 82.1C118.32 85.82 112.08 85.89 107.88 82.27C103.67 78.66 102.8 72.48 105.85 67.84C108.9 63.21 114.91 61.56 119.9 63.99L127.19 60.39Z"
    />
  </svg>
);

/* ---------- Cutlery ---------- */

const FORK =
  'M30 330V30A30 30 0 0 1 90 30V300A16.667 16.667 0 0 0 123.333 300V30A30 30 0 0 1 183.333 30V300A16.667 16.667 0 0 0 216.667 300V30A30 30 0 0 1 276.667 30V300A16.667 16.667 0 0 0 310 300V30A30 30 0 0 1 370 30V360C370 470 262 520 246 620L270 960A40 40 0 0 1 230 1000H170A40 40 0 0 1 130 960L154 620C138 520 30 470 30 360Z';

export const Fork = ({ fill = C.moringa, detail = C.lime, className, rotate }) => (
  <Svg viewBox="0 0 400 1000" className={className} rotate={rotate} origin="200 500">
    <path fill={fill} d={FORK} />
    <g stroke={detail} strokeLinecap="round" fill="none" opacity="0.4">
      <path d="M58 72V262" strokeWidth="11" />
      <path d="M151 72V262" strokeWidth="11" />
      <path d="M186 690L193 930" strokeWidth="13" />
    </g>
    <path d="M60 380C80 450 140 495 176 520" stroke={detail} strokeWidth="7" fill="none" strokeLinecap="round" opacity="0.25" />
  </Svg>
);

export const Spoon = ({ fill = C.yellow, detail = C.moringa, className, rotate }) => (
  <Svg viewBox="0 0 400 1000" className={className} rotate={rotate} origin="200 500">
    <path
      fill={fill}
      d="M200 0C300 0 370 110 370 250C370 380 300 470 236 500L262 960A40 40 0 0 1 222 1000H178A40 40 0 0 1 138 960L164 500C100 470 30 380 30 250C30 110 100 0 200 0Z"
    />
    <ellipse cx="200" cy="250" rx="118" ry="186" fill="none" stroke={detail} strokeWidth="6" opacity="0.18" />
    <g stroke={detail} strokeLinecap="round" fill="none" opacity="0.28">
      <path d="M112 130C84 190 80 270 102 342" strokeWidth="14" />
      <path d="M192 572L198 930" strokeWidth="12" />
    </g>
  </Svg>
);

/* ---------- Produce ---------- */

export const Chilli = ({ fill = C.clay, detail = C.yellow, stem = C.moringa, className, rotate }) => (
  <Svg viewBox="0 0 1000 1000" className={className} rotate={rotate} origin="500 500">
    <path fill={fill} d="M120 170C330 200 700 380 960 960C660 740 330 610 90 390C20 320 30 160 120 170Z" />
    <path d="M178 236C405 296 640 452 828 736" stroke={detail} strokeWidth="26" strokeLinecap="round" fill="none" opacity="0.38" />
    <path d="M250 330C420 400 560 500 690 650" stroke={detail} strokeWidth="9" strokeLinecap="round" fill="none" opacity="0.22" />
    <path fill={stem} d="M70 210C70 150 120 130 160 150C190 166 196 210 170 236C140 210 100 206 70 210Z" />
    <path d="M128 160C92 112 96 62 140 18" stroke={stem} strokeWidth="34" strokeLinecap="round" fill="none" />
  </Svg>
);

export const Bread = ({ fill = C.clay, detail = C.peach, className, rotate }) => (
  <Svg viewBox="0 0 1000 640" className={className} rotate={rotate} origin="500 320">
    <path fill={fill} d="M0 640V340C0 140 210 10 500 10S1000 140 1000 340V640Z" />
    <g stroke={detail} strokeLinecap="round" fill="none">
      <path d="M290 180L222 420" strokeWidth="46" />
      <path d="M490 170L422 430" strokeWidth="46" />
      <path d="M690 180L622 420" strokeWidth="46" />
    </g>
    <path d="M140 170C250 82 370 52 500 50" stroke={detail} strokeWidth="16" strokeLinecap="round" fill="none" opacity="0.45" />
    <path d="M40 560H960" stroke={detail} strokeWidth="10" strokeLinecap="round" opacity="0.3" />
  </Svg>
);

export const Leaf = ({ fill = C.peach, detail = C.pepper, className, rotate }) => (
  <Svg viewBox="0 0 1000 1000" className={className} rotate={rotate} origin="500 500">
    <path fill={fill} d="M0 1000C0 450 400 0 1000 0C1000 600 550 1000 0 1000Z" />
    <g stroke={detail} strokeLinecap="round" fill="none" opacity="0.55">
      <path d="M70 930C300 700 600 350 930 70" strokeWidth="20" />
      <path d="M300 700L300 520" strokeWidth="12" />
      <path d="M300 700L478 700" strokeWidth="12" />
      <path d="M500 500L512 330" strokeWidth="12" />
      <path d="M500 500L676 512" strokeWidth="12" />
      <path d="M690 310L700 190" strokeWidth="10" />
      <path d="M690 310L812 316" strokeWidth="10" />
    </g>
  </Svg>
);

export const TomatoHalf = ({ fill = C.pepper, flesh = '#F2876A', seed = C.peach, className, rotate }) => (
  <Svg viewBox="0 0 400 400" className={className} rotate={rotate} origin="200 200">
    <circle cx="200" cy="200" r="196" fill={fill} />
    <circle cx="200" cy="200" r="168" fill={flesh} />
    {[45, 135, 225, 315].map((a) => {
      const r = (a * Math.PI) / 180;
      const x = 200 + 82 * Math.cos(r);
      const y = 200 + 82 * Math.sin(r);
      return (
        <g key={a} transform={`rotate(${a + 90} ${x} ${y})`}>
          <ellipse cx={x} cy={y} rx="44" ry="66" fill={fill} />
          <ellipse cx={x} cy={y - 18} rx="7" ry="11" fill={seed} />
          <ellipse cx={x} cy={y + 4} rx="7" ry="11" fill={seed} />
          <ellipse cx={x} cy={y + 26} rx="7" ry="11" fill={seed} />
        </g>
      );
    })}
    <circle cx="200" cy="200" r="30" fill={seed} />
    <path d="M58 150A150 150 0 0 1 150 56" stroke="#FFFFFF" strokeWidth="12" strokeLinecap="round" fill="none" opacity="0.45" />
  </Svg>
);

export const Pin = ({ fill = C.moringa, hole = C.lime, className, rotate }) => (
  <Svg viewBox="0 0 500 1000" className={className} rotate={rotate} origin="250 500">
    <path fill={fill} d="M250 1000C250 1000 0 660 0 250A250 250 0 0 1 500 250C500 660 250 1000 250 1000Z" />
    <circle cx="250" cy="250" r="96" fill={hole} />
    <path d="M90 250A160 160 0 0 1 250 90" stroke={hole} strokeWidth="14" strokeLinecap="round" fill="none" opacity="0.4" />
  </Svg>
);

export const Bag = ({ fill = C.moringa, detail = C.lime, mark = C.yellow, className, rotate }) => (
  <Svg viewBox="0 0 1000 1000" className={className} rotate={rotate} origin="500 500">
    <path d="M360 260C360 110 640 110 640 260" stroke={fill} strokeWidth="44" strokeLinecap="round" fill="none" />
    <path fill={fill} d="M80 250H920L980 1000H20Z" />
    <path d="M80 250L160 330H840L920 250" stroke={detail} strokeWidth="12" strokeLinejoin="round" fill="none" opacity="0.4" />
    <path d="M150 400L120 920" stroke={detail} strokeWidth="12" strokeLinecap="round" opacity="0.25" />
    <g transform="translate(500 640) scale(7.2) translate(-114 -74)">
      <path
        fill={mark}
        d="M127.19 60.39C119.94 53.86 108.81 54.29 102.03 61.31C95.24 68.34 95.24 79.47 102.03 86.49C108.81 93.52 119.94 93.91 127.19 87.37L129.3 89.72L132.43 77.88L120.34 79.76L122.45 82.1C118.32 85.82 112.08 85.89 107.88 82.27C103.67 78.66 102.8 72.48 105.85 67.84C108.9 63.21 114.91 61.56 119.9 63.99L127.19 60.39Z"
      />
    </g>
  </Svg>
);

export const Plate = ({ fill = C.moringa, ring = C.fufu, className }) => (
  <Svg viewBox="0 0 400 400" className={className}>
    <circle cx="200" cy="200" r="198" fill={fill} />
    <circle cx="200" cy="200" r="156" fill="none" stroke={ring} strokeWidth="4" opacity="0.8" />
    <circle cx="200" cy="200" r="146" fill="none" stroke={ring} strokeWidth="1.5" opacity="0.4" />
  </Svg>
);

export const Coin = ({ fill = C.clay, ring = C.peach, className }) => (
  <Svg viewBox="0 0 400 400" className={className}>
    <circle cx="200" cy="200" r="196" fill={fill} />
    <circle cx="200" cy="200" r="150" fill="none" stroke={ring} strokeWidth="8" />
    <text
      x="200"
      y="236"
      textAnchor="middle"
      fontFamily="Anton, Impact, sans-serif"
      fontSize="104"
      fill={ring}
    >
      RWF
    </text>
  </Svg>
);

/* A thin construction arc, the hairline that runs beside a cut shape. */
export const Hairline = ({ d, stroke = C.moringa, className, viewBox = '0 0 360 360' }) => (
  <svg viewBox={viewBox} className={className} aria-hidden="true" preserveAspectRatio="none">
    <path d={d} stroke={stroke} strokeWidth="1.5" fill="none" vectorEffect="non-scaling-stroke" />
  </svg>
);

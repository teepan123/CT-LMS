export function Avatar({
  animal = "fox",
  size = 56,
}: {
  animal?: string;
  size?: number;
}) {
  const fox = animal === "fox",
    rabbit = animal === "rabbit",
    c = fox ? "#e99146" : rabbit ? "#cab9de" : "#b38a68";
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      aria-label={fox ? "สุนัขจิ้งจอก" : rabbit ? "กระต่าย" : "หมี"}
      role="img"
    >
      <circle cx="50" cy="50" r="47" fill="#faf2db" />
      <path
        d={
          rabbit
            ? "M29 39 Q15 -5 33 8 L43 38 M57 38 L69 8 Q88 -5 73 42"
            : fox
              ? "M18 43 L19 9 L42 29 M58 29 L81 9 L82 43"
              : "M22 44 Q5 15 24 17 Q42 16 36 43 M62 43 Q60 13 79 17 Q97 18 79 44"
        }
        fill={c}
        stroke="#664b3d"
        strokeWidth="2"
      />
      <path
        d="M17 43 Q22 23 50 27 Q79 24 84 46 L77 72 Q50 94 24 74 Z"
        fill={c}
      />
      <path d="M22 52 L48 65 L77 52 Q79 79 50 84 Q22 80 22 52" fill="#fff6e3" />
      <ellipse cx="36" cy="51" rx="3" ry="4" fill="#293f36" />
      <ellipse cx="65" cy="51" rx="3" ry="4" fill="#293f36" />
      <path d="M44 66 Q50 61 56 66 L50 72Z" fill="#293f36" />
      <path
        d="M50 72 Q47 78 43 74 M50 72 Q53 78 58 74"
        fill="none"
        stroke="#293f36"
        strokeWidth="2"
      />
      <ellipse cx="27" cy="62" rx="6" ry="3" fill="#eeb2a0" />
      <ellipse cx="73" cy="62" rx="6" ry="3" fill="#eeb2a0" />
      <path d="M31 83 L49 88 L66 83 L61 97 L38 97Z" fill="#528573" />
    </svg>
  );
}
function Tree({ x, y, s = 1 }: { x: number; y: number; s?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <path d="M-5 0H5V-32H-5Z" fill="#8c7254" />
      <path d="M-27 -23 L0 -69 L27 -23Z" fill="#387c67" />
      <path d="M-23 -43 L0 -85 L23 -43Z" fill="#58a480" />
      <path d="M0 -85V-23H27L16-43H23Z" fill="#2b6c59" opacity=".35" />
    </g>
  );
}
function Island({
  x,
  y,
  tone,
  index,
}: {
  x: number;
  y: number;
  tone: string;
  index: number;
}) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <ellipse cx="0" cy="40" rx="117" ry="32" fill="#588b7b" opacity=".10" />
      <path
        d="M-105 -4 L0 -59 L106 -4 L106 17 L0 75 L-105 18Z"
        fill="#c1b7a0"
      />
      <path d="M0 51L106-4V17L0 75Z" fill="#a89d8b" />
      <path d="M-105 -4L0-59L106-4L0 51Z" fill={tone} />
      <path
        d="M-93 -3L0-51L94-3L0 44Z"
        fill="none"
        stroke="#fff"
        strokeOpacity=".3"
        strokeWidth="2"
      />
      {index === 0 ? (
        <>
          <path d="M-44 1 L-3 -22 L44 4 L4 27Z" fill="#e9ddb6" />
          <path d="M-36 -12V-43L3-65L3-1Z" fill="#ecd4a0" />
          <path d="M3-65L39-44V-12L3 9Z" fill="#c7ac7f" />
          <path d="M-47-43L-3-91L48-42L3-16Z" fill="#548579" />
          <path d="M-47-43L3-16L3-52L-3-91Z" fill="#77a991" />
          <path d="M-17-4V-28L-3-36V-12" fill="#627c62" />
          <Tree x={-66} y={-6} s={0.6} />
          <Tree x={57} y={15} s={0.7} />
        </>
      ) : index === 1 ? (
        <>
          <path d="M-33 6V-43L4-64L4 28Z" fill="#f0dba6" />
          <path d="M4-64L39-43V7L4 28Z" fill="#d5b378" />
          <path d="M-40-43L4-72L46-45L4-20Z" fill="#be8d51" />
          <circle
            cx="5"
            cy="-42"
            r="16"
            fill="#fff4cb"
            stroke="#876e47"
            strokeWidth="5"
          />
          <path d="M5-42L5-54M5-42L16-39" stroke="#876e47" strokeWidth="3" />
          <Tree x={-60} y={1} s={0.6} />
        </>
      ) : index === 2 ? (
        <>
          <path d="M-28 18L-28-45L7-65L7 40Z" fill="#b7b1d6" />
          <path d="M7-65L42-44V18L7 40Z" fill="#8c86b3" />
          <path d="M-37-43L7-102L49-43L7-19Z" fill="#7979a6" />
          <path d="M7-102V-19L-37-43Z" fill="#9a98c4" />
          <path d="M-13 6V-19L0-27V-2" fill="#f4e4ba" />
          <Tree x={-57} y={9} s={0.7} />
        </>
      ) : (
        <>
          <path d="M-23 22V-70L7-86L7 40Z" fill="#bed5d7" />
          <path d="M7-86L36-69V23L7 40Z" fill="#80aeb7" />
          <path d="M-30-69L7-115L43-70L7-49Z" fill="#467f93" />
          <path d="M-12-5V-25L0-31V-11M-12-42V-60L0-66V-48" fill="#fff0b3" />
          <Tree x={-53} y={5} s={0.62} />
        </>
      )}
      <path d="M54-28V-66" stroke="#7b745f" strokeWidth="3" />
      <path
        d="M54-66L80-59L54-51Z"
        fill={index === 0 ? "#e5a95f" : "#e2d3af"}
      />
    </g>
  );
}
export function WorldMap({
  animal = "fox",
  current = 0,
}: {
  animal?: string;
  current?: number;
}) {
  return (
    <svg
      className="world-art"
      viewBox="0 0 800 570"
      role="img"
      aria-label="แผนที่ 4 เกาะ: ป่าแห่งการเริ่มต้น หุบเขานักสืบ เกาะแห่งสิ่งสำคัญ และหอคอยนักออกแบบ"
    >
      <defs>
        <pattern id="dots" width="28" height="28" patternUnits="userSpaceOnUse">
          <circle cx="2" cy="2" r="1" fill="#bacdc1" opacity=".4" />
        </pattern>
      </defs>
      <rect width="800" height="570" fill="url(#dots)" />
      <path
        d="M177 373C160 286 340 363 373 270S450 215 542 179S667 193 641 93"
        stroke="#c3c9ac"
        strokeWidth="14"
        fill="none"
      />
      <path
        d="M177 373C160 286 340 363 373 270S450 215 542 179S667 193 641 93"
        stroke="#fbf6e8"
        strokeWidth="8"
        strokeDasharray="10 12"
        fill="none"
      />
      <g fill="#fff" opacity=".8">
        <ellipse cx="121" cy="144" rx="50" ry="15" />
        <ellipse cx="142" cy="133" rx="26" ry="20" />
        <ellipse cx="646" cy="408" rx="60" ry="17" />
        <ellipse cx="672" cy="397" rx="30" ry="23" />
      </g>
      <Island x={171} y={394} tone="#a1c49c" index={0} />
      <Island x={366} y={304} tone="#d8cf9d" index={1} />
      <Island x={536} y={215} tone="#c1bdd6" index={2} />
      <Island x={649} y={98} tone="#a6cbd0" index={3} />
      <g
        transform={`translate(${[190, 384, 551, 663][Math.min(current, 3)]} ${[385, 295, 206, 89][Math.min(current, 3)]})`}
      >
        <ellipse cy="24" rx="21" ry="8" fill="#345f48" opacity=".25" />
        <svg x="-24" y="-29" width="48" height="48" viewBox="0 0 100 100">
          <Avatar animal={animal} size={100} />
        </svg>
      </g>
      <g transform="translate(88 427)">
        <circle cx="0" cy="0" r="20" fill="#2b6554" />
        <text
          y="6"
          textAnchor="middle"
          fontSize="19"
          fill="white"
          fontWeight="700"
        >
          1
        </text>
      </g>
      <g transform="translate(280 339)">
        <circle r="18" fill="#836d37" />
        <text y="6" textAnchor="middle" fontSize="17" fill="white">
          2
        </text>
      </g>
      <g transform="translate(453 250)">
        <circle r="18" fill="#71638b" />
        <text y="6" textAnchor="middle" fontSize="17" fill="white">
          3
        </text>
      </g>
      <g transform="translate(574 139)">
        <circle r="18" fill="#436c80" />
        <text y="6" textAnchor="middle" fontSize="17" fill="white">
          4
        </text>
      </g>
      <g transform="translate(26 35)">
        <path d="M0 22L10 0L20 22L10 17Z" fill="#769084" />
        <text x="10" y="-9" textAnchor="middle" fill="#637e73" fontSize="11">
          N
        </text>
      </g>
      <text x="27" y="540" fill="#597568" fontSize="12" letterSpacing="3">
        THE LITTLE THINKERS’ EXPEDITION
      </text>
    </svg>
  );
}

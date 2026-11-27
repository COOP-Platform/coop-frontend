/**
 * A ring showing how far a budget is: what came in out of the goal, with the
 * percentage in the middle. Plain SVG, no chart library.
 */
export function ProgressRing({
  value,
  of,
  size = 72,
  stroke = 8,
}: {
  value: number;
  of: number;
  size?: number;
  stroke?: number;
}) {
  const share = of > 0 ? Math.min(1, Math.max(0, value / of)) : 0;
  const percent = of > 0 ? Math.round((value / of) * 100) : 0;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const centre = size / 2;
  return (
    <svg
      className="progress-ring"
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      role="img"
      aria-label={`${percent}% collected`}
    >
      <circle
        className="progress-ring__track"
        cx={centre}
        cy={centre}
        r={radius}
        fill="none"
        strokeWidth={stroke}
      />
      <circle
        className={`progress-ring__fill${share >= 1 ? ' progress-ring__fill--done' : ''}`}
        cx={centre}
        cy={centre}
        r={radius}
        fill="none"
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={circumference * (1 - share)}
        transform={`rotate(-90 ${centre} ${centre})`}
      />
      <text
        className="progress-ring__text"
        x="50%"
        y="50%"
        dominantBaseline="central"
        textAnchor="middle"
        style={{ fontSize: Math.max(12, size / 5) }}
      >
        {percent}%
      </text>
    </svg>
  );
}

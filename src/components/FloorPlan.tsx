export function FloorPlan() {
  return (
    <svg
      viewBox="0 0 800 600"
      className="h-full w-full"
      style={{ maxHeight: "100%" }}
    >
      <defs>
        <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
          <path d="M 20 0 L 0 0 0 20" fill="none" stroke="var(--canvas-grid)" strokeWidth="0.5" opacity="0.5" />
        </pattern>
        <pattern id="bedFabric" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <line x1="0" y1="0" x2="0" y2="8" stroke="oklch(0.75 0.08 152)" strokeWidth="2" />
        </pattern>
      </defs>

      <rect width="800" height="600" fill="url(#grid)" />

      {/* Outer walls */}
      <g stroke="var(--wall)" strokeWidth="4" fill="none" strokeLinejoin="miter">
        <path d="M 60 60 L 740 60 L 740 380 L 620 380 L 620 540 L 200 540 L 200 440 L 60 440 Z" />
      </g>

      {/* Interior walls */}
      <g stroke="var(--wall)" strokeWidth="3" fill="none">
        <line x1="380" y1="60" x2="380" y2="320" />
        <line x1="60" y1="280" x2="280" y2="280" />
        <line x1="380" y1="320" x2="740" y2="320" />
        <line x1="200" y1="380" x2="380" y2="380" />
        <line x1="380" y1="380" x2="380" y2="540" />
      </g>

      {/* Door arcs */}
      <g stroke="var(--wall)" strokeWidth="1.2" fill="none" opacity="0.6">
        <path d="M 280 280 A 60 60 0 0 1 340 220" />
        <line x1="280" y1="280" x2="340" y2="220" strokeDasharray="2 2" />
        <path d="M 380 200 A 50 50 0 0 0 430 250" />
        <path d="M 460 380 A 50 50 0 0 1 510 430" />
      </g>

      {/* Bedroom: Bed (selected) */}
      <g>
        <rect x="470" y="110" width="180" height="140" rx="6" fill="url(#bedFabric)" stroke="var(--primary)" strokeWidth="2" />
        <rect x="490" y="120" width="60" height="30" rx="4" fill="oklch(0.95 0.02 152)" stroke="oklch(0.6 0.05 152)" strokeWidth="1" />
        <rect x="570" y="120" width="60" height="30" rx="4" fill="oklch(0.95 0.02 152)" stroke="oklch(0.6 0.05 152)" strokeWidth="1" />
        {/* selection handles */}
        {[[470,110],[650,110],[470,250],[650,250],[560,110],[560,250],[470,180],[650,180]].map(([x,y],i)=>(
          <rect key={i} x={x-4} y={y-4} width="8" height="8" fill="white" stroke="var(--primary)" strokeWidth="1.5" />
        ))}
        <text x="560" y="200" textAnchor="middle" fontSize="10" fill="oklch(0.4 0.05 152)" fontStyle="italic">Living Room</text>
      </g>

      {/* Living room: Sofa */}
      <g fill="none" stroke="var(--wall)" strokeWidth="1.5">
        <rect x="100" y="320" width="120" height="50" rx="6" fill="oklch(0.94 0.005 120)" />
        <rect x="108" y="328" width="32" height="34" rx="3" />
        <rect x="144" y="328" width="32" height="34" rx="3" />
        <rect x="180" y="328" width="32" height="34" rx="3" />
      </g>

      {/* Chair near bed */}
      <g fill="oklch(0.94 0.005 120)" stroke="var(--wall)" strokeWidth="1.2">
        <rect x="400" y="100" width="40" height="40" rx="6" />
      </g>

      {/* Cupboard top-left */}
      <g fill="oklch(0.96 0.005 120)" stroke="var(--wall)" strokeWidth="1.5">
        <rect x="80" y="80" width="160" height="40" />
        <line x1="160" y1="80" x2="160" y2="120" />
      </g>

      {/* Wardrobe right side */}
      <g fill="oklch(0.96 0.005 120)" stroke="var(--wall)" strokeWidth="1.5">
        <rect x="690" y="100" width="40" height="120" />
      </g>

      {/* Round table + chairs (dining) */}
      <g stroke="var(--wall)" strokeWidth="1.2" fill="oklch(0.96 0.005 120)">
        <circle cx="500" cy="450" r="34" />
        <circle cx="500" cy="400" r="10" />
        <circle cx="500" cy="500" r="10" />
        <circle cx="450" cy="450" r="10" />
        <circle cx="550" cy="450" r="10" />
      </g>

      {/* Plant */}
      <g>
        <circle cx="270" cy="350" r="14" fill="oklch(0.7 0.12 152)" stroke="var(--wall)" strokeWidth="1" />
        <circle cx="270" cy="350" r="6" fill="oklch(0.5 0.1 152)" />
      </g>

      {/* Lamps */}
      <g fill="none" stroke="var(--wall)" strokeWidth="1">
        <circle cx="100" cy="100" r="14" />
        <circle cx="100" cy="100" r="5" fill="oklch(0.9 0.08 90)" />
        <circle cx="660" cy="500" r="14" />
        <circle cx="660" cy="500" r="5" fill="oklch(0.9 0.08 90)" />
      </g>

      {/* Dimensions */}
      <g fill="var(--muted-foreground)" fontSize="9" fontFamily="ui-monospace, monospace">
        <text x="400" y="50" textAnchor="middle">680 cm</text>
        <text x="50" y="250" textAnchor="middle" transform="rotate(-90 50 250)">380 cm</text>
      </g>

      {/* Room labels */}
      <g fill="var(--muted-foreground)" fontSize="11" fontStyle="italic" fontFamily="serif">
        <text x="170" y="220">Living Area</text>
        <text x="430" y="450">Dining</text>
        <text x="300" y="490">Hallway</text>
      </g>
    </svg>
  );
}

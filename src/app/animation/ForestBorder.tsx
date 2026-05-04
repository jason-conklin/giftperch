export default function ForestBorder() {
  const TREE_COUNT = 24;
  const TREE_WIDTH = 50;

  return (
    <div className="w-full pointer-events-none select-none">
      <svg
        viewBox="0 0 1200 140"
        preserveAspectRatio="none"
        className="w-full h-[110px]"
      >
        <g>
          {Array.from({ length: TREE_COUNT }).map((_, i) => {
            const x = i * TREE_WIDTH;
            const isAlt = i % 2 === 0;

            const color = isAlt ? "#0F3D3E" : "#145C54";

            // Slight variation per tree for natural feel
            const heightOffset = isAlt ? 0 : 6;

            return (
              <g key={i}>
                {/* Bottom triangle (largest) */}
                <polygon
                  points={`
                    ${x + 25},${40 - heightOffset}
                    ${x},110
                    ${x + 50},110
                  `}
                  fill={color}
                />

                {/* Middle triangle */}
                <polygon
                  points={`
                    ${x + 25},${20 - heightOffset}
                    ${x + 8},85
                    ${x + 42},85
                  `}
                  fill={color}
                />

                {/* Top triangle */}
                <polygon
                  points={`
                    ${x + 25},${5 - heightOffset}
                    ${x + 14},60
                    ${x + 36},60
                  `}
                  fill={color}
                />
              </g>
            );
          })}
        </g>

        {/* Ground line (keep — this anchors the forest visually) */}
        <rect x="0" y="110" width="1200" height="20" fill="#0F3D3E" />
      </svg>
    </div>
  );
}
export default function ForestBorder() {
  const TREE_COUNT = 24;
  const TREE_WIDTH = 50;

  return (
    <div className="w-full pointer-events-none select-none">
      <svg
        viewBox="0 0 1200 145"
        preserveAspectRatio="none"
        className="h-[115px] w-full"
        aria-hidden="true"
      >
        <g>
          {Array.from({ length: TREE_COUNT }).map((_, i) => {
            const x = i * TREE_WIDTH;
            const isAlt = i % 2 === 0;
            const color = isAlt ? "#0F3D3E" : "#145C54";

            // Small height variation so it feels natural, not stamped.
            const lift = isAlt ? 0 : 7;
            const cx = x + TREE_WIDTH / 2;

            return (
              <g key={i}>
                {/* Top tier: narrow but with a visible overhang */}
                <polygon
                  points={`
                    ${cx},${6 - lift}
                    ${cx - 16},${54 - lift}
                    ${cx - 7},${50 - lift}
                    ${cx},${66 - lift}
                    ${cx + 7},${50 - lift}
                    ${cx + 16},${54 - lift}
                  `}
                  fill={color}
                />

                {/* Middle tier: wider, pointy side overhangs */}
                <polygon
                  points={`
                    ${cx},${28 - lift}
                    ${cx - 24},${84 - lift}
                    ${cx - 11},${78 - lift}
                    ${cx},${96 - lift}
                    ${cx + 11},${78 - lift}
                    ${cx + 24},${84 - lift}
                  `}
                  fill={color}
                />

                {/* Bottom tier: widest tier, strongest tree silhouette */}
                <polygon
                  points={`
                    ${cx},${52 - lift}
                    ${cx - 32},110
                    ${cx - 14},102
                    ${cx},122
                    ${cx + 14},102
                    ${cx + 32},110
                  `}
                  fill={color}
                />
              </g>
            );
          })}
        </g>

        <rect x="0" y="110" width="1200" height="35" fill="#0F3D3E" />
      </svg>
    </div>
  );
}
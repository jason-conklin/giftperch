export default function ForestBorder() {
  const TREE_COUNT = 25;
  const TREE_WIDTH = 48;
  const VIEWBOX_WIDTH = 1200;
  const CENTER_INDEX = (TREE_COUNT - 1) / 2;
  const GROUND_Y = 132;

  return (
    <div className="w-full pointer-events-none select-none">
      <svg
        viewBox={`0 0 ${VIEWBOX_WIDTH} 160`}
        preserveAspectRatio="none"
        className="h-[125px] w-full"
        aria-hidden="true"
      >
        <g>
          {Array.from({ length: TREE_COUNT }).map((_, i) => {
            const x = i * TREE_WIDTH;
            const cx = x + TREE_WIDTH / 2;
            const isAlt = i % 2 === 0;
            const color = isAlt ? "#0F3D3E" : "#145C54";

            // 0 at center, 1 at edges
            const distanceFromCenter =
              Math.abs(i - CENTER_INDEX) / CENTER_INDEX;

            // Explicit height increase toward edges
            const heightBoost = distanceFromCenter * 42;

            // Small designed variation so it does not look perfectly mechanical
            const variation = i % 3 === 0 ? 5 : i % 3 === 1 ? -3 : 2;

            const topY = 30 - heightBoost + variation;
            const middleY = 56 - heightBoost * 0.68 + variation;
            const bottomY = 82 - heightBoost * 0.38 + variation;

            return (
              <g key={i}>
                {/* Top tier */}
                <polygon
                  points={`
                    ${cx},${topY}
                    ${cx - 16},${topY + 48}
                    ${cx - 7},${topY + 44}
                    ${cx},${topY + 60}
                    ${cx + 7},${topY + 44}
                    ${cx + 16},${topY + 48}
                  `}
                  fill={color}
                />

                {/* Middle tier */}
                <polygon
                  points={`
                    ${cx},${middleY}
                    ${cx - 24},${middleY + 56}
                    ${cx - 11},${middleY + 50}
                    ${cx},${middleY + 68}
                    ${cx + 11},${middleY + 50}
                    ${cx + 24},${middleY + 56}
                  `}
                  fill={color}
                />

                {/* Bottom tier */}
                <polygon
                  points={`
                    ${cx},${bottomY}
                    ${cx - 32},${GROUND_Y}
                    ${cx - 14},${GROUND_Y - 8}
                    ${cx},${GROUND_Y + 12}
                    ${cx + 14},${GROUND_Y - 8}
                    ${cx + 32},${GROUND_Y}
                  `}
                  fill={color}
                />
              </g>
            );
          })}
        </g>

        <rect x="0" y={GROUND_Y} width={VIEWBOX_WIDTH} height="28" fill="#0F3D3E" />
      </svg>
    </div>
  );
}
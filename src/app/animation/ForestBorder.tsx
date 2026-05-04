export default function ForestBorder() {
  const TREE_COUNT = 25;
  const TREE_WIDTH = 48;
  const VIEWBOX_WIDTH = 1200;
  const VIEWBOX_HEIGHT = 170;
  const CENTER_INDEX = (TREE_COUNT - 1) / 2;
  const GROUND_Y = 132;

  return (
    <div className="w-full pointer-events-none select-none">
      <svg
        viewBox={`0 0 ${VIEWBOX_WIDTH} ${VIEWBOX_HEIGHT}`}
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

            // 0 at center, 1 at far edges
            const distanceFromCenter =
              Math.abs(i - CENTER_INDEX) / CENTER_INDEX;

            // Controlled height difference: noticeable, not chaotic
            const heightBoost = Math.pow(distanceFromCenter, 1.35) * 34;

            // Tiny deterministic variation
            const variation = i % 4 === 0 ? 3 : i % 4 === 1 ? -2 : i % 4 === 2 ? 1 : -1;

            const topY = 34 - heightBoost + variation;
            const middleY = 58 - heightBoost * 0.65 + variation;
            const bottomY = 82 - heightBoost * 0.35 + variation;

            return (
              <g key={i}>
                {/* Top tier */}
                <polygon
                  points={`
                    ${cx},${topY}
                    ${cx - 15},${topY + 46}
                    ${cx - 6},${topY + 42}
                    ${cx},${topY + 56}
                    ${cx + 6},${topY + 42}
                    ${cx + 15},${topY + 46}
                  `}
                  fill={color}
                />

                {/* Middle tier */}
                <polygon
                  points={`
                    ${cx},${middleY}
                    ${cx - 23},${middleY + 52}
                    ${cx - 10},${middleY + 46}
                    ${cx},${middleY + 62}
                    ${cx + 10},${middleY + 46}
                    ${cx + 23},${middleY + 52}
                  `}
                  fill={color}
                />

                {/* Bottom tier */}
                <polygon
                  points={`
                    ${cx},${bottomY}
                    ${cx - 31},${GROUND_Y}
                    ${cx - 13},${GROUND_Y - 8}
                    ${cx},${GROUND_Y + 10}
                    ${cx + 13},${GROUND_Y - 8}
                    ${cx + 31},${GROUND_Y}
                  `}
                  fill={color}
                />
              </g>
            );
          })}
        </g>

        <rect
          x="0"
          y={GROUND_Y}
          width={VIEWBOX_WIDTH}
          height="38"
          fill="#0F3D3E"
        />
      </svg>
    </div>
  );
}
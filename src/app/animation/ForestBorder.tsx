export default function ForestBorder() {
  const TREE_COUNT = 25;
  const TREE_WIDTH = 48;
  const VIEWBOX_WIDTH = 1200;
  const VIEWBOX_HEIGHT = 220; // ↑ more headroom
  const CENTER_INDEX = (TREE_COUNT - 1) / 2;

  const GROUND_Y = 170; // ↓ push everything down

  return (
    <div className="w-full pointer-events-none select-none">
      <svg
        viewBox={`0 0 ${VIEWBOX_WIDTH} ${VIEWBOX_HEIGHT}`}
        preserveAspectRatio="none"
        className="h-[140px] w-full"
        aria-hidden="true"
      >
        <g>
          {Array.from({ length: TREE_COUNT }).map((_, i) => {
            const x = i * TREE_WIDTH;
            const cx = x + TREE_WIDTH / 2;

            const isAlt = i % 2 === 0;
            const color = isAlt ? "#0F3D3E" : "#145C54";

            const distanceFromCenter =
              Math.abs(i - CENTER_INDEX) / CENTER_INDEX;

            // 🔥 Stronger curve (this is what you want visually)
            const curved = Math.pow(distanceFromCenter, 1.6);

            const heightBoost = curved * 90; // ↑ MUCH stronger

            const variation = i % 3 === 0 ? 6 : i % 3 === 1 ? -4 : 2;

            const topY = 60 - heightBoost + variation;
            const middleY = 95 - heightBoost * 0.7 + variation;
            const bottomY = 120 - heightBoost * 0.4 + variation;

            return (
              <g key={i}>
                {/* Top */}
                <polygon
                  points={`
                    ${cx},${topY}
                    ${cx - 16},${topY + 50}
                    ${cx - 6},${topY + 46}
                    ${cx},${topY + 64}
                    ${cx + 6},${topY + 46}
                    ${cx + 16},${topY + 50}
                  `}
                  fill={color}
                />

                {/* Middle */}
                <polygon
                  points={`
                    ${cx},${middleY}
                    ${cx - 24},${middleY + 60}
                    ${cx - 10},${middleY + 52}
                    ${cx},${middleY + 72}
                    ${cx + 10},${middleY + 52}
                    ${cx + 24},${middleY + 60}
                  `}
                  fill={color}
                />

                {/* Bottom */}
                <polygon
                  points={`
                    ${cx},${bottomY}
                    ${cx - 32},${GROUND_Y}
                    ${cx - 14},${GROUND_Y - 10}
                    ${cx},${GROUND_Y + 14}
                    ${cx + 14},${GROUND_Y - 10}
                    ${cx + 32},${GROUND_Y}
                  `}
                  fill={color}
                />
              </g>
            );
          })}
        </g>

        {/* Ground */}
        <rect
          x="0"
          y={GROUND_Y}
          width={VIEWBOX_WIDTH}
          height="30"
          fill="#0F3D3E"
        />
      </svg>
    </div>
  );
}
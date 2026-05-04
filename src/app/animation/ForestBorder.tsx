export default function ForestBorder() {
  const TREE_COUNT = 25;
  const TREE_WIDTH = 48;
  const VIEWBOX_WIDTH = 1200;
  const VIEWBOX_HEIGHT = 240;

  const CENTER_INDEX = (TREE_COUNT - 1) / 2;

  const GROUND_Y = 190;
  const BASE_OFFSET = 40; // pushes everything down safely

  return (
    <div className="w-full pointer-events-none select-none">
      <svg
        viewBox={`0 0 ${VIEWBOX_WIDTH} ${VIEWBOX_HEIGHT}`}
        preserveAspectRatio="none"
        className="h-[150px] w-full"
        aria-hidden="true"
      >
        <g>
          {Array.from({ length: TREE_COUNT }).map((_, i) => {
            const x = i * TREE_WIDTH;
            const cx = x + TREE_WIDTH / 2;

            const isAlt = i % 2 === 0;
            const color = isAlt ? "#0F3D3E" : "#145C54";

            // 0 center → 1 edges
            const distance =
              Math.abs(i - CENTER_INDEX) / CENTER_INDEX;

            // Strong edge growth (this is what you want visually)
            const heightBoost = Math.pow(distance, 1.6) * 85;

            const variation =
              i % 4 === 0 ? 4 : i % 4 === 1 ? -2 : i % 4 === 2 ? 2 : -1;

            let topY = 60 - heightBoost + variation + BASE_OFFSET;
            const midY = 95 - heightBoost * 0.65 + variation + BASE_OFFSET;
            const botY = 125 - heightBoost * 0.35 + variation + BASE_OFFSET;

            // clamp ONLY the one that needs it
            topY = Math.max(8, topY);

            return (
              <g key={i}>
                {/* Top */}
                <polygon
                  points={`
                    ${cx},${topY}
                    ${cx - 14},${topY + 44}
                    ${cx - 6},${topY + 40}
                    ${cx},${topY + 54}
                    ${cx + 6},${topY + 40}
                    ${cx + 14},${topY + 44}
                  `}
                  fill={color}
                />

                {/* Middle */}
                <polygon
                  points={`
                    ${cx},${midY}
                    ${cx - 22},${midY + 52}
                    ${cx - 10},${midY + 46}
                    ${cx},${midY + 62}
                    ${cx + 10},${midY + 46}
                    ${cx + 22},${midY + 52}
                  `}
                  fill={color}
                />

                {/* Bottom */}
                <polygon
                  points={`
                    ${cx},${botY}
                    ${cx - 30},${GROUND_Y}
                    ${cx - 12},${GROUND_Y - 8}
                    ${cx},${GROUND_Y + 10}
                    ${cx + 12},${GROUND_Y - 8}
                    ${cx + 30},${GROUND_Y}
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
          height="40"
          fill="#0F3D3E"
        />
      </svg>
    </div>
  );
}
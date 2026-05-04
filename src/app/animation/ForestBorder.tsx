export default function ForestBorder() {
  const TREE_COUNT = 17;
  const TREE_WIDTH = 70;
  const VIEWBOX_WIDTH = TREE_COUNT * TREE_WIDTH;
  const VIEWBOX_HEIGHT = 390;

  const CENTER_INDEX = (TREE_COUNT - 1) / 2;
  const GROUND_Y = 320;

  return (
    <div className="w-full pointer-events-none select-none">
      <svg
        viewBox={`0 0 ${VIEWBOX_WIDTH} ${VIEWBOX_HEIGHT}`}
        preserveAspectRatio="xMidYMax meet"
        className="h-full w-full"
        aria-hidden="true"
      >
        <g>
          {Array.from({ length: TREE_COUNT }).map((_, i) => {
            const x = i * TREE_WIDTH;
            const cx = x + TREE_WIDTH / 2;

            const isAlt = i % 2 === 0;
            const color = isAlt ? "#0F3D3E" : "#145C54";

            const distance = Math.abs(i - CENTER_INDEX) / CENTER_INDEX;

            // Shorter center, much taller sides.
            const scale = 0.62 + Math.pow(distance, 1.55) * 1.28;

            const variation =
              i % 4 === 0 ? 0.06 : i % 4 === 1 ? -0.03 : i % 4 === 2 ? 0.03 : 0;

            const finalScale = scale + variation;

            return (
              <g
                key={i}
                transform={`
                  translate(${cx}, ${GROUND_Y})
                  scale(${finalScale})
                  translate(${-cx}, ${-GROUND_Y})
                `}
              >
                {/* Top tier */}
                <polygon
                  points={`
                    ${cx},${GROUND_Y - 125}
                    ${cx - 17},${GROUND_Y - 78}
                    ${cx - 7},${GROUND_Y - 82}
                    ${cx},${GROUND_Y - 64}
                    ${cx + 7},${GROUND_Y - 82}
                    ${cx + 17},${GROUND_Y - 78}
                  `}
                  fill={color}
                />

                {/* Middle tier */}
                <polygon
                  points={`
                    ${cx},${GROUND_Y - 94}
                    ${cx - 28},${GROUND_Y - 39}
                    ${cx - 12},${GROUND_Y - 46}
                    ${cx},${GROUND_Y - 25}
                    ${cx + 12},${GROUND_Y - 46}
                    ${cx + 28},${GROUND_Y - 39}
                  `}
                  fill={color}
                />

                {/* Bottom tier */}
                <polygon
                  points={`
                    ${cx},${GROUND_Y - 62}
                    ${cx - 39},${GROUND_Y}
                    ${cx - 16},${GROUND_Y - 10}
                    ${cx},${GROUND_Y + 12}
                    ${cx + 16},${GROUND_Y - 10}
                    ${cx + 39},${GROUND_Y}
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
          height="70"
          fill="#0F3D3E"
        />
      </svg>
    </div>
  );
}
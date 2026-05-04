export default function ForestBorder() {
  const TREE_COUNT = 25;
  const TREE_WIDTH = 48;
  const VIEWBOX_WIDTH = 1200;
  const VIEWBOX_HEIGHT = 390;

  const CENTER_INDEX = (TREE_COUNT - 1) / 2;
  const GROUND_Y = 320;

  return (
    <div className="w-full pointer-events-none select-none">
      <svg
        viewBox={`0 0 ${VIEWBOX_WIDTH} ${VIEWBOX_HEIGHT}`}
        preserveAspectRatio="none"
        className="h-[170px] w-full"
        aria-hidden="true"
      >
        <g>
          {Array.from({ length: TREE_COUNT }).map((_, i) => {
            const x = i * TREE_WIDTH;
            const cx = x + TREE_WIDTH / 2;

            const isAlt = i % 2 === 0;
            const color = isAlt ? "#0F3D3E" : "#145C54";

            const distance = Math.abs(i - CENTER_INDEX) / CENTER_INDEX;

            const scale = 0.65 + Math.pow(distance, 1.8) * 1.35;

            const variation =
              i % 3 === 0 ? 0.05 : i % 3 === 1 ? -0.03 : 0.02;

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
                    ${cx},${GROUND_Y - 120}
                    ${cx - 14},${GROUND_Y - 76}
                    ${cx - 6},${GROUND_Y - 80}
                    ${cx},${GROUND_Y - 64}
                    ${cx + 6},${GROUND_Y - 80}
                    ${cx + 14},${GROUND_Y - 76}
                  `}
                  fill={color}
                />

                {/* Middle tier */}
                <polygon
                  points={`
                    ${cx},${GROUND_Y - 90}
                    ${cx - 22},${GROUND_Y - 38}
                    ${cx - 10},${GROUND_Y - 44}
                    ${cx},${GROUND_Y - 26}
                    ${cx + 10},${GROUND_Y - 44}
                    ${cx + 22},${GROUND_Y - 38}
                  `}
                  fill={color}
                />

                {/* Bottom tier */}
                <polygon
                  points={`
                    ${cx},${GROUND_Y - 60}
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
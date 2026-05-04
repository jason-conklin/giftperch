export default function ForestBorder() {
  const TREE_COUNT = 25;
  const TREE_WIDTH = 48;
  const VIEWBOX_WIDTH = 1200;
  const VIEWBOX_HEIGHT = 220;

  const CENTER_INDEX = (TREE_COUNT - 1) / 2;
  const GROUND_Y = 170;

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

            // 🔥 Strong curve for visible difference
            const scale = 0.75 + Math.pow(distanceFromCenter, 1.8) * 0.9;

            // Slight controlled variation
            const variation =
              i % 3 === 0 ? 0.04 : i % 3 === 1 ? -0.02 : 0.02;

            const finalScale = scale + variation;

            return (
              <g
                key={i}
                transform={`
                  translate(${cx} ${GROUND_Y})
                  scale(${finalScale})
                  translate(${-cx} ${-GROUND_Y})
                `}
              >
                {/* CLEAN, CONSISTENT TREE SHAPE */}

                {/* Top */}
                <polygon
                  points={`
                    ${cx},40
                    ${cx - 14},80
                    ${cx + 14},80
                  `}
                  fill={color}
                />

                {/* Middle */}
                <polygon
                  points={`
                    ${cx},70
                    ${cx - 22},115
                    ${cx + 22},115
                  `}
                  fill={color}
                />

                {/* Bottom */}
                <polygon
                  points={`
                    ${cx},100
                    ${cx - 30},150
                    ${cx + 30},150
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
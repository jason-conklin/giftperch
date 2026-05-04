export default function ForestBorder() {
  const TREE_COUNT = 32;
  const VIEWBOX_WIDTH = 1200;
  const VIEWBOX_HEIGHT = 240;
  const GROUND_Y = 190;
  const CENTER_INDEX = (TREE_COUNT - 1) / 2;

  return (
    <div className="pointer-events-none w-full select-none">
      <svg
        viewBox={`0 0 ${VIEWBOX_WIDTH} ${VIEWBOX_HEIGHT}`}
        preserveAspectRatio="none"
        className="h-full w-full"
        aria-hidden="true"
      >
        <g>
          {Array.from({ length: TREE_COUNT }).map((_, i) => {
            const spacing = VIEWBOX_WIDTH / (TREE_COUNT - 1);
            const cx = i * spacing;

            const isAlt = i % 2 === 0;
            const color = isAlt ? "#0F3D3E" : "#145C54";

            const distance = Math.abs(i - CENTER_INDEX) / CENTER_INDEX;
            const scale = 0.58 + Math.pow(distance, 1.65) * 1.12;

            const variation =
              i % 4 === 0 ? 0.05 : i % 4 === 1 ? -0.03 : i % 4 === 2 ? 0.03 : 0;

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
                <polygon
                  points={`
                    ${cx},${GROUND_Y - 105}
                    ${cx - 16},${GROUND_Y - 66}
                    ${cx - 7},${GROUND_Y - 70}
                    ${cx},${GROUND_Y - 55}
                    ${cx + 7},${GROUND_Y - 70}
                    ${cx + 16},${GROUND_Y - 66}
                  `}
                  fill={color}
                />

                <polygon
                  points={`
                    ${cx},${GROUND_Y - 78}
                    ${cx - 26},${GROUND_Y - 32}
                    ${cx - 11},${GROUND_Y - 39}
                    ${cx},${GROUND_Y - 21}
                    ${cx + 11},${GROUND_Y - 39}
                    ${cx + 26},${GROUND_Y - 32}
                  `}
                  fill={color}
                />

                <polygon
                  points={`
                    ${cx},${GROUND_Y - 50}
                    ${cx - 36},${GROUND_Y}
                    ${cx - 15},${GROUND_Y - 9}
                    ${cx},${GROUND_Y + 10}
                    ${cx + 15},${GROUND_Y - 9}
                    ${cx + 36},${GROUND_Y}
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
          height="50"
          fill="#0F3D3E"
        />
      </svg>
    </div>
  );
}
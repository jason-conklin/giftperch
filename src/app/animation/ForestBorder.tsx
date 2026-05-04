export default function ForestBorder() {
  const TREE_COUNT = 32;
  const VIEWBOX_WIDTH = 1200;
  const VIEWBOX_HEIGHT = 240;
  const GROUND_Y = 190;
  const CENTER_INDEX = (TREE_COUNT - 1) / 2;

  const riverCenterX = VIEWBOX_WIDTH / 2;
  const riverTopWidth = 74;
  const riverBottomWidth = 122;

  return (
    <div className="pointer-events-none w-full select-none">
      <svg
        viewBox={`0 0 ${VIEWBOX_WIDTH} ${VIEWBOX_HEIGHT}`}
        preserveAspectRatio="none"
        className="h-full w-full"
        aria-hidden="true"
      >
        {/* Trees */}
        <g>
          {Array.from({ length: TREE_COUNT }).map((_, i) => {
            const spacing = VIEWBOX_WIDTH / (TREE_COUNT - 1);
            const cx = i * spacing;

            // Leave a subtle opening around the river so it feels intentional.
            if (Math.abs(cx - riverCenterX) < 54) return null;

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

        {/* Ground */}
        <rect
          x="0"
          y={GROUND_Y}
          width={VIEWBOX_WIDTH}
          height="50"
          fill="#0F3D3E"
        />

        {/* River cut through center */}
        <polygon
          points={`
            ${riverCenterX - riverTopWidth / 2},${GROUND_Y - 4}
            ${riverCenterX + riverTopWidth / 2},${GROUND_Y - 4}
            ${riverCenterX + riverBottomWidth / 2},${VIEWBOX_HEIGHT}
            ${riverCenterX - riverBottomWidth / 2},${VIEWBOX_HEIGHT}
          `}
          fill="#3BA7D8"
        />

        {/* River highlight */}
        <polygon
          points={`
            ${riverCenterX - 8},${GROUND_Y + 2}
            ${riverCenterX + 12},${GROUND_Y + 2}
            ${riverCenterX + 26},${VIEWBOX_HEIGHT}
            ${riverCenterX - 22},${VIEWBOX_HEIGHT}
          `}
          fill="#5FC3EA"
          opacity="0.85"
        />

        {/* River banks */}
        <polygon
          points={`
            ${riverCenterX - riverTopWidth / 2 - 18},${GROUND_Y}
            ${riverCenterX - riverTopWidth / 2},${GROUND_Y}
            ${riverCenterX - riverBottomWidth / 2},${VIEWBOX_HEIGHT}
            ${riverCenterX - riverBottomWidth / 2 - 22},${VIEWBOX_HEIGHT}
          `}
          fill="#0B2F30"
          opacity="0.92"
        />

        <polygon
          points={`
            ${riverCenterX + riverTopWidth / 2},${GROUND_Y}
            ${riverCenterX + riverTopWidth / 2 + 18},${GROUND_Y}
            ${riverCenterX + riverBottomWidth / 2 + 22},${VIEWBOX_HEIGHT}
            ${riverCenterX + riverBottomWidth / 2},${VIEWBOX_HEIGHT}
          `}
          fill="#0B2F30"
          opacity="0.92"
        />

        {/* Simple rocks */}
        <ellipse cx={riverCenterX - 62} cy={GROUND_Y + 18} rx="10" ry="5" fill="#E8C978" opacity="0.65" />
        <ellipse cx={riverCenterX + 58} cy={GROUND_Y + 22} rx="12" ry="6" fill="#E8C978" opacity="0.55" />
        <ellipse cx={riverCenterX - 42} cy={GROUND_Y + 42} rx="8" ry="4" fill="#F8F5E7" opacity="0.55" />
        <ellipse cx={riverCenterX + 44} cy={GROUND_Y + 54} rx="9" ry="4" fill="#F8F5E7" opacity="0.45" />
      </svg>
    </div>
  );
}
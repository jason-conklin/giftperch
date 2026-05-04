export default function ForestBorder() {
  const TREE_COUNT = 32;
  const VIEWBOX_WIDTH = 1200;
  const VIEWBOX_HEIGHT = 240;
  const GROUND_Y = 190;
  const CENTER_INDEX = (TREE_COUNT - 1) / 2;

  const riverCenterX = VIEWBOX_WIDTH / 2;

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

        {/* River base */}
        <polygon
          points={`
            ${riverCenterX - 42},${GROUND_Y}
            ${riverCenterX + 42},${GROUND_Y}
            ${riverCenterX + 95},${VIEWBOX_HEIGHT}
            ${riverCenterX - 95},${VIEWBOX_HEIGHT}
          `}
          fill="#2F8FBD"
        />

        {/* Inner water facet */}
        <polygon
          points={`
            ${riverCenterX - 16},${GROUND_Y}
            ${riverCenterX + 16},${GROUND_Y}
            ${riverCenterX + 55},${VIEWBOX_HEIGHT}
            ${riverCenterX - 55},${VIEWBOX_HEIGHT}
          `}
          fill="#5FC3EA"
        />

        {/* Left bank (faceted) */}
        <polygon
          points={`
            ${riverCenterX - 42},${GROUND_Y}
            ${riverCenterX - 58},${GROUND_Y}
            ${riverCenterX - 115},${VIEWBOX_HEIGHT}
            ${riverCenterX - 95},${VIEWBOX_HEIGHT}
          `}
          fill="#0B2F30"
        />

        {/* Right bank */}
        <polygon
          points={`
            ${riverCenterX + 42},${GROUND_Y}
            ${riverCenterX + 58},${GROUND_Y}
            ${riverCenterX + 115},${VIEWBOX_HEIGHT}
            ${riverCenterX + 95},${VIEWBOX_HEIGHT}
          `}
          fill="#0B2F30"
        />

        {/* ===== ROCKS (GEOMETRIC, NOT OVALS) ===== */}

        {/* Left rocks */}
        {/* Left bank boulders */}
        <g opacity="0.95">
          <polygon
            points={`
              ${riverCenterX - 74},${GROUND_Y + 6}
              ${riverCenterX - 58},${GROUND_Y + 2}
              ${riverCenterX - 46},${GROUND_Y + 10}
              ${riverCenterX - 50},${GROUND_Y + 20}
              ${riverCenterX - 68},${GROUND_Y + 22}
              ${riverCenterX - 80},${GROUND_Y + 15}
            `}
            fill="#D7B65F"
          />
          <polygon
            points={`
              ${riverCenterX - 69},${GROUND_Y + 8}
              ${riverCenterX - 58},${GROUND_Y + 5}
              ${riverCenterX - 51},${GROUND_Y + 10}
              ${riverCenterX - 57},${GROUND_Y + 14}
              ${riverCenterX - 68},${GROUND_Y + 15}
            `}
            fill="#757575"
            opacity="0.75"
          />

          <polygon
            points={`
              ${riverCenterX - 98},${GROUND_Y + 26}
              ${riverCenterX - 84},${GROUND_Y + 20}
              ${riverCenterX - 70},${GROUND_Y + 27}
              ${riverCenterX - 74},${GROUND_Y + 39}
              ${riverCenterX - 92},${GROUND_Y + 42}
              ${riverCenterX - 104},${GROUND_Y + 34}
            `}
            fill="#F0DFAC"
          />
          <polygon
            points={`
              ${riverCenterX - 94},${GROUND_Y + 28}
              ${riverCenterX - 84},${GROUND_Y + 24}
              ${riverCenterX - 76},${GROUND_Y + 28}
              ${riverCenterX - 84},${GROUND_Y + 33}
              ${riverCenterX - 94},${GROUND_Y + 34}
            `}
            fill="#757575"
            opacity="0.7"
          />
        </g>

        {/* Right bank boulders */}
        <g opacity="0.95">
          <polygon
            points={`
              ${riverCenterX + 54},${GROUND_Y + 8}
              ${riverCenterX + 70},${GROUND_Y + 3}
              ${riverCenterX + 84},${GROUND_Y + 10}
              ${riverCenterX + 80},${GROUND_Y + 22}
              ${riverCenterX + 62},${GROUND_Y + 24}
              ${riverCenterX + 50},${GROUND_Y + 16}
            `}
            fill="#D7B65F"
          />
          <polygon
            points={`
              ${riverCenterX + 60},${GROUND_Y + 10}
              ${riverCenterX + 70},${GROUND_Y + 6}
              ${riverCenterX + 78},${GROUND_Y + 10}
              ${riverCenterX + 70},${GROUND_Y + 15}
              ${riverCenterX + 60},${GROUND_Y + 16}
            `}
            fill="#757575"
            opacity="0.75"
          />

          <polygon
            points={`
              ${riverCenterX + 84},${GROUND_Y + 31}
              ${riverCenterX + 98},${GROUND_Y + 25}
              ${riverCenterX + 112},${GROUND_Y + 32}
              ${riverCenterX + 108},${GROUND_Y + 44}
              ${riverCenterX + 90},${GROUND_Y + 46}
              ${riverCenterX + 78},${GROUND_Y + 38}
            `}
            fill="#F0DFAC"
          />
          <polygon
            points={`
              ${riverCenterX + 88},${GROUND_Y + 33}
              ${riverCenterX + 98},${GROUND_Y + 29}
              ${riverCenterX + 106},${GROUND_Y + 33}
              ${riverCenterX + 98},${GROUND_Y + 38}
              ${riverCenterX + 88},${GROUND_Y + 39}
            `}
            fill="#757575"
            opacity="0.7"
          />
        </g>
      </svg>
    </div>
  );
}
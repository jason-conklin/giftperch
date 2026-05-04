export default function ForestBorder() {
  const TREE_COUNT = 25;
  const TREE_WIDTH = 48;
  const VIEWBOX_WIDTH = 1200;
  const CENTER_INDEX = (TREE_COUNT - 1) / 2;

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
            const isAlt = i % 2 === 0;
            const color = isAlt ? "#0F3D3E" : "#145C54";

            // Bigger toward the edges, smaller near center.
            const distanceFromCenter = Math.abs(i - CENTER_INDEX) / CENTER_INDEX;
            const edgeScale = 0.86 + distanceFromCenter * 0.28;

            // Tiny non-random variation so it still feels designed.
            const naturalVariation = i % 3 === 0 ? 0.04 : i % 3 === 1 ? -0.02 : 0.02;
            const scale = edgeScale + naturalVariation;

            const cx = x + TREE_WIDTH / 2;
            const groundY = 132;

            return (
              <g
                key={i}
                transform={`
                  translate(${cx} ${groundY})
                  scale(${scale})
                  translate(${-cx} ${-groundY})
                `}
              >
                {/* Top tier */}
                <polygon
                  points={`
                    ${cx},18
                    ${cx - 16},66
                    ${cx - 7},62
                    ${cx},78
                    ${cx + 7},62
                    ${cx + 16},66
                  `}
                  fill={color}
                />

                {/* Middle tier */}
                <polygon
                  points={`
                    ${cx},40
                    ${cx - 24},96
                    ${cx - 11},90
                    ${cx},108
                    ${cx + 11},90
                    ${cx + 24},96
                  `}
                  fill={color}
                />

                {/* Bottom tier */}
                <polygon
                  points={`
                    ${cx},64
                    ${cx - 32},132
                    ${cx - 14},124
                    ${cx},144
                    ${cx + 14},124
                    ${cx + 32},132
                  `}
                  fill={color}
                />
              </g>
            );
          })}
        </g>

        <rect x="0" y="132" width={VIEWBOX_WIDTH} height="28" fill="#0F3D3E" />
      </svg>
    </div>
  );
}
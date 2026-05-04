export default function ForestBorder() {
  return (
    <div className="w-full pointer-events-none select-none">
      <svg
        viewBox="0 0 1200 120"
        preserveAspectRatio="none"
        className="w-full h-[100px]"
      >
        {/* Trees */}
        <g>
          {/* Row of alternating trees */}
          {Array.from({ length: 24 }).map((_, i) => {
            const x = i * 50
            const isAlt = i % 2 === 0

            const color = isAlt ? "#0F3D3E" : "#145C54" // Evergreen + lighter evergreen

            return (
              <polygon
                key={i}
                points={`
                  ${x + 25},20
                  ${x},100
                  ${x + 50},100
                `}
                fill={color}
              />
            )
          })}
        </g>

        {/* Optional subtle base line (can remove if you want ultra-minimal) */}
        <rect x="0" y="100" width="1200" height="20" fill="#0F3D3E" />
      </svg>
    </div>
  )
}
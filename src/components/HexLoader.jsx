import { useEffect, useRef } from "react";

export default function HexLoader({ onFinish }) {
  const svgRef = useRef(null);
  const overlayRef = useRef(null);
  const hasFinished = useRef(false);

  useEffect(() => {
    const svg = svgRef.current;
    const overlay = overlayRef.current;
    if (!svg || !overlay) return;

    hasFinished.current = false;

    requestAnimationFrame(() => {
      svg.style.transform = "scale(40)";
      svg.style.opacity = "0";
      overlay.style.opacity = "0";
    });

    const timer = setTimeout(() => {
      if (!hasFinished.current) {
        hasFinished.current = true;
        onFinish();
      }
    }, 750);

    return () => clearTimeout(timer);
  }, [onFinish]);

  return (
    <div ref={overlayRef} style={styles.overlay}>
      <svg
        ref={svgRef}
        width="80"
        height="80"
        viewBox="0 0 100 100"
        style={styles.hex}
      >
        <polygon
          points="50,4 93,27 93,73 50,96 7,73 7,27"
          fill="none"
          stroke="#00ff88"
          strokeWidth="6"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
}

const styles = {
  overlay: {
    position: "fixed",
    inset: 0,
    background: "#0a0a0c",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 9999,
    opacity: 1,
    transition: "opacity 1.25s ease",
    pointerEvents: "none",
  },
  hex: {
    transform: "scale(1)",
    opacity: 1,
<<<<<<< HEAD
    transition: "transform 1.0s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.75s ease",
=======
    transition: "transform 1.25s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.75s ease",
>>>>>>> e74a06161332f678af4db67f4ef8a1cc0af3949e
    willChange: "transform, opacity",
  },
};
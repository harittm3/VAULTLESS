import { motion } from "framer-motion";
import { useEffect } from "react";

const styles = {
  container: {
    position: "fixed",
    inset: 0,
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    background: "transparent", // important so page is visible
    zIndex: 9999
  },

  hex: {
    zIndex: 10000,
    filter: "drop-shadow(0 0 20px #00cc66)"
  }
};

export default function HexLoader({ onFinish }) {

  useEffect(() => {
    const timer = setTimeout(() => {
      onFinish();
    }, 1500);

    return () => clearTimeout(timer);
  }, [onFinish]);

  return (
    <div style={styles.container}>

      <motion.svg
        width="140"
        height="140"
        viewBox="0 0 100 100"
        style={styles.hex}

        initial={{
          scale: 0.1,
          opacity: 1
        }}

        animate={{
          scale: 30,
          opacity: 0
        }}

        transition={{
          duration: 1.5,
          ease: "easeInOut"
        }}
      >

        <polygon
          points="50,3 95,25 95,75 50,97 5,75 5,25"
          fill="transparent"
          stroke="#00cc66"
          strokeWidth="5"
        />

      </motion.svg>

    </div>
  );
}
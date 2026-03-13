import { motion } from "framer-motion";
import { useEffect } from "react";

export default function HexLoader({ onFinish }) {

  useEffect(() => {

    const timer = setTimeout(() => {
      onFinish();
    }, 1500);

    return () => clearTimeout(timer);

  }, []);

  return (
    <div style={styles.container}>

      <motion.div
        initial={{ scale: 0.2, opacity: 0 }}
        animate={{ scale: 1.8, opacity: 1 }}
        transition={{ duration: 1.2, ease: "easeOut" }}
        style={styles.hex}
      />

    </div>
  );
}

const styles = {

  container: {
    position: "fixed",
    inset: 0,
    background: "#000",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 9999
  },

  hex: {
    width: 120,
    height: 120,
    background: "#00ff88",
    clipPath:
      "polygon(25% 5%, 75% 5%, 100% 50%, 75% 95%, 25% 95%, 0% 50%)",
    boxShadow: "0 0 40px #00ff88"
  }

};
import { useCallback } from "react";
import Particles from "@tsparticles/react";
import { loadFull } from "tsparticles";

export default function ParticleBackground() {

  const particlesInit = useCallback(async (engine) => {
    await loadFull(engine);
  }, []);

  return (
    <Particles
      id="tsparticles"
      init={particlesInit}
      options={{

        fullScreen: {
          enable: true,
          zIndex: -1
        },

        background: {
          color: "transparent"
        },

        particles: {

          number: {
            value: 200,
            density: {
              enable: true,
              area: 800
            }
          },

          color: {
            value: "#00cc66"
          },

          shape: {
            type: "circle"
          },

          opacity: {
            value: 0.6
          },

          size: {
            value: { min: 1, max: 3 }
          },

          links: {
            enable: true,
            distance: 160,
            color: "#00cc66",
            opacity: 0.35,
            width: 1
          },

          move: {
            enable: true,
            speed: 0.6,
            direction: "none",
            random: false,
            straight: false,
            outModes: {
              default: "bounce"
            }
          }

        },

        interactivity: {

          events: {
            onHover: {
              enable: true,
              mode: "grab"
            },
            resize: true
          },

          modes: {
            grab: {
              distance: 200,
              links: {
                opacity: 1
              }
            }
          }

        },

        detectRetina: true
      }}
    />
  );
}
import { motion } from 'framer-motion';

export const WaveBorder = () => {
  return (
    <div className="relative w-full h-24 overflow-hidden">
      <motion.svg
        className="absolute bottom-0 w-full h-full"
        viewBox="0 0 1200 120"
        preserveAspectRatio="none"
        animate={{
          x: [-50, 0, -50],
        }}
        transition={{
          duration: 8,
          repeat: Infinity,
          ease: "linear"
        }}
      >
        <motion.path
          d="M0,60 C300,120 900,0 1200,60 L1200,120 L0,120 Z"
          fill="hsl(var(--background))"
          animate={{
            d: [
              "M0,60 C300,120 900,0 1200,60 L1200,120 L0,120 Z",
              "M0,80 C300,40 900,100 1200,80 L1200,120 L0,120 Z",
              "M0,60 C300,120 900,0 1200,60 L1200,120 L0,120 Z"
            ]
          }}
          transition={{
            duration: 6,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
      </motion.svg>
      
      {/* Additional wave layers for depth */}
      <motion.svg
        className="absolute bottom-0 w-full h-full opacity-50"
        viewBox="0 0 1200 120"
        preserveAspectRatio="none"
        animate={{
          x: [0, -50, 0],
        }}
        transition={{
          duration: 10,
          repeat: Infinity,
          ease: "linear"
        }}
      >
        <motion.path
          d="M0,80 C400,40 800,120 1200,80 L1200,120 L0,120 Z"
          fill="hsl(var(--background))"
          animate={{
            d: [
              "M0,80 C400,40 800,120 1200,80 L1200,120 L0,120 Z",
              "M0,100 C400,60 800,140 1200,100 L1200,120 L0,120 Z",
              "M0,80 C400,40 800,120 1200,80 L1200,120 L0,120 Z"
            ]
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
      </motion.svg>
    </div>
  );
};
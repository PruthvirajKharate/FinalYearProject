import { motion } from "framer-motion";
import React from "react"; // Import React for its types

// Define the type for the component's props
interface AnimatedPageProps {
  children: React.ReactNode;
}

const AnimatedPage: React.FC<AnimatedPageProps> = ({ children }) => {
  const pageVariants = {
    initial: { opacity: 0, y: 20 },
    in: { opacity: 1, y: 0 },
    out: { opacity: 0, y: -20 },
  };
  const pageTransition = {
    type: "tween",
    ease: "anticipate",
    duration: 0.5,
  };

  return (
    <motion.div
      initial="initial"
      animate="in"
      exit="out"
      variants={pageVariants}
      transition={pageTransition}
      className="w-full"
    >
      {children}
    </motion.div>
  );
};

export default AnimatedPage;

import { motion, AnimatePresence } from 'motion/react';
import { useEffect, useState } from 'react';

export default function IntroScreen({ onComplete }: { onComplete: () => void }) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(onComplete, 1000); // wait for exit animation
    }, 2500);
    return () => clearTimeout(timer);
  }, []);
  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1 }}
          className="fixed top-0 left-0 w-screen h-[100dvh] z-[100] flex items-center justify-center bg-gradient-to-b from-dark to-darker bg-grain overflow-hidden"
        >
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 1.2, opacity: 0 }}
            transition={{ duration: 1.5, ease: "easeInOut" }}
            className="absolute inset-0 w-full h-full z-20 flex items-center justify-center p-8"
          >
            <img 
              src="/logo (1).png" 
              alt="Lodhi Bhawan Logo" 
              className="w-auto h-auto max-w-[70vw] max-h-[50vh] object-contain sepia-theme" 
            />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

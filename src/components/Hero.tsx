import { motion } from 'motion/react';

export default function Hero() {
  return (
    <section id="home" className="relative h-screen flex items-center justify-center overflow-hidden">
      {/* Replace with your hero-bg.jpg */}
      <div className="absolute inset-0 z-0">
        <img 
          src="/hero-bg.jpg" 
          alt="Lodhi Bhawan Interior" 
          className="w-full h-full object-cover sepia-theme scale-105 animate-[pulse_20s_ease-in-out_infinite_alternate]"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-black/50 to-darker"></div>
      </div>

      <div className="relative z-10 text-center px-6 max-w-4xl mx-auto mt-20">
        <motion.h1 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 3.5 }}
          className="text-4xl md:text-6xl lg:text-7xl font-serif text-secondary mb-6 tracking-tight"
        >
          Delhi on Your Plates
        </motion.h1>
        
        <motion.p 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 3.8 }}
          className="text-base md:text-lg text-secondary/80 font-light tracking-wide mb-10 max-w-2xl mx-auto"
        >
          A cinematic journey through Old Delhi — reimagined as a premium modern dining experience.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 4.1 }}
        >
          <a 
            href="#reserve-section" 
            onClick={(e) => {
              e.preventDefault();
              try {
                document.querySelector('#reserve-section')?.scrollIntoView({ behavior: 'smooth' });
              } catch (err) {}
            }}
            className="inline-block bg-gradient-to-r from-dark to-darker border border-primary/30 text-primary px-8 py-4 uppercase tracking-widest text-sm hover:from-darker hover:to-dark transition-all duration-500 shadow-lg"
          >
            Reserve a Table
          </a>
        </motion.div>
      </div>
    </section>
  );
}

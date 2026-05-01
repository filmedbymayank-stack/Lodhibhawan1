import { motion } from 'motion/react';
import { useRef } from 'react';

export default function Gallery() {
  const ref = useRef(null);

  return (
    <section id="gallery" ref={ref} className="py-16 md:py-24 bg-darker relative overflow-hidden bg-grain">
      <div className="container mx-auto px-6 md:px-12 relative z-20">
        <div className="text-center mb-16">
          <motion.h2 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-xs uppercase tracking-[0.3em] text-primary mb-4"
          >
            Visual Journey
          </motion.h2>
          <motion.h3 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="text-3xl md:text-4xl font-serif text-secondary mb-6"
          >
            Old Delhi – New Chapter
          </motion.h3>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.3 }}
            className="text-sm md:text-base text-secondary/70 font-light max-w-2xl mx-auto px-6"
          >
            Step into a space where historic charm effortlessly blends with contemporary luxury, capturing the true essence of purani Dilli.
          </motion.p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Column 1 */}
          <motion.div className="space-y-6">
            <div className="relative overflow-hidden group">
              {/* Replace with your gallery-1.jpg */}
              <img src="/gallery-1.jpg" alt="Gallery 1" className="w-full h-auto sepia-theme group-hover:scale-105 transition-transform duration-700" />
            </div>
            <div className="relative overflow-hidden group">
              {/* Replace with your gallery-2.jpg */}
              <img src="/gallery-2.jpg" alt="Gallery 2" className="w-full h-auto sepia-theme group-hover:scale-105 transition-transform duration-700" />
            </div>
          </motion.div>

          {/* Column 2 */}
          <motion.div className="space-y-6 lg:mt-12">
            <div className="relative overflow-hidden group">
              {/* Replace with your gallery-3.jpg */}
              <img src="/gallery-3.jpg" alt="Gallery 3" className="w-full h-auto sepia-theme group-hover:scale-105 transition-transform duration-700" />
            </div>
            <div className="relative overflow-hidden group">
              {/* Replace with your gallery-4.jpg */}
              <img src="/gallery-4.jpg" alt="Gallery 4" className="w-full h-auto sepia-theme group-hover:scale-105 transition-transform duration-700" />
            </div>
          </motion.div>

          {/* Column 3 */}
          <motion.div className="space-y-6 lg:mt-24">
            <div className="relative overflow-hidden group">
              {/* Replace with your gallery-5.jpg */}
              <img src="/gallery-5.jpg" alt="Gallery 5" className="w-full h-auto sepia-theme group-hover:scale-105 transition-transform duration-700" />
            </div>
            <div className="bg-primary/10 p-8 flex items-center justify-center h-64 border border-primary/20">
              <p className="font-serif text-xl text-secondary text-center italic">
                "Where every corner whispers a tale of the walled city."
              </p>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

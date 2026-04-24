import { motion } from 'motion/react';

export default function About() {
  return (
    <section id="about" className="py-16 md:py-24 bg-darker relative bg-grain">
      <div className="container mx-auto px-6 md:px-12 relative z-20">
        <div className="flex flex-col lg:flex-row items-center gap-16">
          <motion.div 
            initial={{ opacity: 0, x: -50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 1 }}
            className="lg:w-1/2"
          >
            <h2 className="text-xs uppercase tracking-[0.3em] text-primary mb-4">Our Story</h2>
            <h3 className="text-3xl md:text-4xl font-serif text-secondary mb-8 leading-tight">
              The Soul of Purani Dilli,<br/>Served with Elegance.
            </h3>
            <p className="text-sm md:text-base text-secondary/70 font-light leading-relaxed mb-6">
              Lodhi Bhawan is born from the nostalgic alleys of Old Delhi, where culinary secrets have been passed down through generations. We bring the authentic, robust flavors of the walled city into a refined, luxury setting.
            </p>
            <p className="text-sm md:text-base text-secondary/70 font-light leading-relaxed mb-8">
              Every dish tells a story of heritage, crafted with premium ingredients and a deep respect for tradition. Experience the warmth, the spice, and the grandeur of a bygone era.
            </p>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, x: 50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 1 }}
            className="lg:w-1/2 relative"
          >
            <div className="aspect-[4/5] relative overflow-hidden rounded-sm">
              {/* Replace with your about-image.jpg */}
              <img 
                src="/about-image.jpg" 
                alt="Old Delhi Inspiration" 
                className="w-full h-full object-cover sepia-theme hover:scale-105 transition-transform duration-1000"
              />
              <div className="absolute inset-0 border-2 border-secondary/20 m-4 pointer-events-none"></div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

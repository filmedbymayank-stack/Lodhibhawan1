import { motion } from 'motion/react';
import { useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
// @ts-ignore
import HTMLFlipBook from 'react-pageflip';

const menuPages = [
  '/menu-page-1.jpg',
  '/menu-page-2.jpg',
  '/menu-page-3.jpg',
  '/menu-page-4.jpg'
];

export default function Menu() {
  const bookRef = useRef<any>(null);
  const [currentPage, setCurrentPage] = useState(0);

  return (
    <section id="menu" className="py-16 md:py-24 bg-dark relative overflow-hidden">
      <div className="container mx-auto px-6 md:px-12">
        <div className="text-center mb-16">
          <motion.h2 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-xs uppercase tracking-[0.3em] text-primary mb-4"
          >
            Culinary Heritage
          </motion.h2>
          <motion.h3 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="text-3xl md:text-4xl font-serif text-secondary mb-4"
          >
            The Menu
          </motion.h3>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.3 }}
            className="text-sm md:text-base text-secondary/70 font-light max-w-2xl mx-auto px-6"
          >
            Explore our curated selection of authentic Old Delhi recipes, perfected over generations and presented with modern elegance.
          </motion.p>
        </div>

        {/* Menu Pages Book */}
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="relative w-full max-w-5xl mx-auto flex items-center justify-center py-8"
        >
          <div className="w-full aspect-[3/4] md:aspect-[8/5] max-h-[80vh] z-10">
            {/* @ts-ignore */}
            <HTMLFlipBook 
              width={500} 
              height={700} 
              size="stretch" 
              minWidth={300} 
              maxWidth={1000} 
              minHeight={400} 
              maxHeight={1500} 
              maxShadowOpacity={0.5} 
              showCover={false} 
              mobileScrollSupport={true}
              className="mx-auto"
              ref={bookRef}
              onFlip={(e: any) => setCurrentPage(e.data)}
            >
              {menuPages.map((page, idx) => (
                <div key={idx} className="bg-transparent overflow-hidden flex items-center justify-center">
                  <img 
                    src={page} 
                    alt={`Menu Page ${idx + 1}`} 
                    className="w-full h-full object-contain"
                  />
                </div>
              ))}
            </HTMLFlipBook>
          </div>

          {/* Desktop Navigation Buttons */}
          <button 
            onClick={() => {
              if (bookRef.current && bookRef.current.pageFlip) {
                try { bookRef.current.pageFlip().flipPrev(); } catch(e) {}
              }
            }} 
            className={`hidden md:flex absolute -left-4 z-20 bg-darker/80 text-primary p-3 rounded-full hover:bg-primary hover:text-darker transition-all border border-primary/30 shadow-xl ${currentPage === 0 ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
          >
            <ChevronLeft size={20} />
          </button>

          <button 
            onClick={() => {
              if (bookRef.current && bookRef.current.pageFlip) {
                try { bookRef.current.pageFlip().flipNext(); } catch(e) {}
              }
            }} 
            className={`hidden md:flex absolute -right-4 z-20 bg-darker/80 text-primary p-3 rounded-full hover:bg-primary hover:text-darker transition-all border border-primary/30 shadow-xl ${currentPage >= menuPages.length - 2 ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
          >
            <ChevronRight size={20} />
          </button>
        </motion.div>

        {/* Mobile Navigation Buttons */}
        <div className="flex md:hidden justify-center items-center gap-6 mt-6 mb-8 relative z-20">
          <button 
            onClick={() => {
              if (bookRef.current && bookRef.current.pageFlip) {
                try { bookRef.current.pageFlip().flipPrev(); } catch(e) {}
              }
            }} 
            disabled={currentPage === 0}
            className={`bg-darker/90 text-primary p-4 rounded-full border border-primary/30 shadow-xl active:scale-95 transition-all ${currentPage === 0 ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}
          >
            <ChevronLeft size={24} />
          </button>
          <span className="text-primary/60 text-[10px] tracking-widest uppercase">Swipe or Click</span>
          <button 
            onClick={() => {
              if (bookRef.current && bookRef.current.pageFlip) {
                try { bookRef.current.pageFlip().flipNext(); } catch(e) {}
              }
            }} 
            disabled={currentPage >= menuPages.length - 1} // Mobile mostly displays 1 page at a time so last page is length - 1
            className={`bg-darker/90 text-primary p-4 rounded-full border border-primary/30 shadow-xl active:scale-95 transition-all ${currentPage >= menuPages.length - 1 ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}
          >
            <ChevronRight size={24} />
          </button>
        </div>

        {/* Chef's Kiss Video Section */}
        <div className="mt-16 md:mt-24 mb-16 relative">
          <div className="text-center mb-8 md:mb-12">
            <motion.h2 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-xs uppercase tracking-[0.3em] text-primary mb-4"
            >
              Masterclass
            </motion.h2>
            <motion.h3 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
              className="text-3xl md:text-4xl font-serif text-secondary mb-4 md:mb-6"
            >
              Chef's Kiss
            </motion.h3>
            <motion.p 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.3 }}
              className="text-sm md:text-base text-secondary/70 font-light max-w-2xl mx-auto px-6"
            >
              Witness the artistry of our master chefs bringing age-old recipes to life in a cinematic glimpse behind the scenes of our kitchen.
            </motion.p>
          </div>
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="w-full max-w-4xl mx-auto p-2 md:p-4 bg-darker border border-primary/20 shadow-2xl"
          >
            <video 
              src="/chef-video.mp4" 
              autoPlay 
              loop 
              muted 
              playsInline 
              className="w-full aspect-video object-cover sepia-theme max-h-[60vh] md:max-h-[70vh]"
            ></video>
          </motion.div>
        </div>

        {/* Special Dishes Images */}
        <div className="mt-16 md:mt-24">
          <div className="text-center mb-8 md:mb-12">
            <motion.h4 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-2xl md:text-3xl font-serif text-primary mb-4"
            >
              Special Dishes
            </motion.h4>
            <motion.p 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
              className="text-sm md:text-base text-secondary/70 font-light max-w-2xl mx-auto px-6"
            >
              A handpicked collection of our most celebrated culinary creations, prepared with passion and served with absolute elegance.
            </motion.p>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((num) => (
              <motion.div 
                key={num}
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: (num % 4) * 0.1 }}
                className="aspect-square md:aspect-[4/5] relative overflow-hidden group bg-darker/50 border border-primary/10 flex items-center justify-center"
              >
                {/* Add your 8 photos in the public folder named special-1.jpg to special-8.jpg */}
                <img 
                  src={`/special-${num}.jpg`} 
                  alt={`Special Dish ${num}`} 
                  className="w-full h-full object-cover sepia-theme group-hover:scale-110 transition-transform duration-700"
                />
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

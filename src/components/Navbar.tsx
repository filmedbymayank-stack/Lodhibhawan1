import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Menu, X } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);
const navLinks = [
    { name: 'About', href: '#about' },
    { name: 'Menu', href: '#menu' },
    { name: 'Gallery', href: '#gallery' },
    { name: 'Reviews', href: '#reviews' },
    { name: 'Admin', href: '/admin', isRoute: true },
  ];

  /* 
   * NEW CUSTOM CLICK HANDLER
   * This intercepts clicks, closes the menu smoothly, 
   * and forces the window to scroll to the #ID manually 
   */
  const handleNavClick = (e: React.MouseEvent<HTMLAnchorElement>, targetId: string) => {
    if (targetId.startsWith('/')) {
      // It's a route link, let React Router handle it
      return;
    }
    
    e.preventDefault();
    setIsMobileMenuOpen(false);
    
    // Give a slight delay for the mobile menu closing animation to start
    // before attempting to scroll to correctly determine offset
    setTimeout(() => {
      const element = document.querySelector(targetId);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
      }
    }, 150);
  };

  return (
    <motion.nav
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.8, delay: 3 }}
      className={`fixed top-0 left-0 right-0 z-40 transition-all duration-300 ${
        isScrolled || isMobileMenuOpen ? 'bg-darker/95 backdrop-blur-md py-4 shadow-lg shadow-black/50' : 'bg-transparent py-6'
      }`}
    >
      <div className="container mx-auto px-6 md:px-12 flex justify-between items-center">
        <a href="#home" onClick={(e) => handleNavClick(e, '#home')} className="flex items-center gap-3">
          <img 
            src="/logo3.png" 
            alt="Lodhi Bhawan" 
            className="h-7 md:h-10 sepia-theme object-contain" 
          />
        </a>

        {/* Desktop Nav */}
        <div className="hidden md:flex items-center gap-8">
          {navLinks.map((link) => (
            link.isRoute ? (
               <Link
                key={link.name}
                to={link.href}
                className="text-xs font-semibold uppercase tracking-widest text-primary/80 hover:text-primary transition-colors duration-300"
              >
                {link.name}
              </Link>
            ) : (
              <a
                key={link.name}
                href={link.href}
                onClick={(e) => handleNavClick(e, link.href)}
                className="text-xs font-semibold uppercase tracking-widest text-primary/80 hover:text-primary transition-colors duration-300"
              >
                {link.name}
              </a>
            )
          ))}
          <a
            href="#reserve"
            onClick={(e) => handleNavClick(e, '#reserve')}
            className="text-xs font-bold uppercase tracking-widest text-primary bg-gradient-to-r from-dark to-darker border border-primary/20 px-6 py-3 hover:from-darker hover:to-dark transition-all duration-300 shadow-lg"
          >
            Reserve a Table
          </a>
        </div>

        {/* Mobile Toggle */}
        <button 
          className="md:hidden text-secondary p-2 -mr-2 bg-dark/30 rounded-lg active:scale-95 transition-transform"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          aria-label="Toggle Menu"
        >
          {isMobileMenuOpen ? <X size={28} /> : <Menu size={28} />}
        </button>
      </div>

      {/* Mobile Nav */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden bg-darker border-t border-primary/30 mt-4 overflow-hidden"
          >
            <div className="flex flex-col px-6 py-4 gap-4">
              {navLinks.map((link) => (
                link.isRoute ? (
                  <Link
                    key={link.name}
                    to={link.href}
                    className="text-sm font-semibold uppercase tracking-widest text-primary/80 hover:text-primary py-2"
                  >
                    {link.name}
                  </Link>
                ) : (
                  <a
                    key={link.name}
                    href={link.href}
                    onClick={(e) => handleNavClick(e, link.href)}
                    className="text-sm font-semibold uppercase tracking-widest text-primary/80 hover:text-primary py-2"
                  >
                    {link.name}
                  </a>
                )
              ))}
              <a
                href="#reserve"
                onClick={(e) => handleNavClick(e, '#reserve')}
                className="text-sm font-bold uppercase tracking-widest text-primary bg-gradient-to-r from-dark to-darker border border-primary/20 px-6 py-3 text-center mt-2"
              >
                Reserve a Table
              </a>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.nav>
  );
}

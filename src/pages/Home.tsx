import { useState, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { XCircle, CheckCircle2 } from 'lucide-react';
import IntroScreen from '../components/IntroScreen';
import Navbar from '../components/Navbar';
import Hero from '../components/Hero';
import About from '../components/About';
import Menu from '../components/Menu';
import Gallery from '../components/Gallery';
import Testimonials from '../components/Testimonials';
import Reservation from '../components/Reservation';
import Footer from '../components/Footer';

let globalIntroComplete = false;

export default function Home() {
  const [introComplete, setIntroComplete] = useState(() => {
    return globalIntroComplete;
  });
  const [pendingHash, setPendingHash] = useState('');
  const [popupMessage, setPopupMessage] = useState('');
  const location = useLocation();

  // On mount, reset the scroll position and cache any lingering #hash from the URL
  useEffect(() => {
    if ('scrollRestoration' in history) {
      history.scrollRestoration = 'manual';
    }
    window.scrollTo(0, 0);

    const hash = location.hash || window.location.hash;
    // Don't intercept Router's own hash (like #/, #/admin) when using HashRouter
    if (hash && hash !== '#/' && !hash.startsWith('#/')) {
      setPendingHash(hash);
    }
  }, [location.hash]);

  useEffect(() => {
    const handlePopup = (e: any) => {
      setPopupMessage(e.detail);
    };
    window.addEventListener('reservationPopup', handlePopup);
    return () => window.removeEventListener('reservationPopup', handlePopup);
  }, []);

  useEffect(() => {
    if (introComplete && pendingHash) {
      try {
        const element = document.querySelector(pendingHash);
        if (element) {
          // Delay briefly to ensure sections are explicitly rendered
          setTimeout(() => {
            element.scrollIntoView({ behavior: 'smooth' });
          }, 150);
        }
      } catch (err) {
        // Invalid selector, ignore
      }
    }
  }, [introComplete, pendingHash]);

  // Use a callback to prevent IntroScreen from remounting or resetting the timer 
  const handleIntroComplete = useCallback(() => {
    globalIntroComplete = true;
    setIntroComplete(true);
  }, []);

  return (
    <div className="min-h-screen font-sans selection:bg-primary selection:text-darker overflow-x-hidden">
      {!introComplete && <IntroScreen onComplete={handleIntroComplete} />}
      
      <div className={!introComplete ? "h-screen overflow-hidden" : ""}>
        <Navbar />
        <main>
          <Hero />
          <About />
          <Menu />
          <Gallery />
          <Testimonials />
          <Reservation />
        </main>
        <Footer />
      </div>

      <AnimatePresence>
        {introComplete && popupMessage && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
          >
            <div className="bg-dark border border-primary/40 p-8 max-w-sm w-full shadow-2xl relative text-center">
              {popupMessage.includes('Cancelled') ? (
                <XCircle size={48} className="mx-auto mb-4 text-red-500" />
              ) : (
                <CheckCircle2 size={48} className="mx-auto mb-4 text-green-500" />
              )}
              <h3 className={`text-xl font-serif mb-6 ${popupMessage.includes('Cancelled') ? 'text-red-400' : 'text-primary'}`}>
                {popupMessage}
              </h3>
              <button 
                onClick={() => setPopupMessage('')}
                className="w-full py-3 bg-primary/20 text-primary border border-primary/30 hover:bg-primary/30 transition-colors uppercase text-xs tracking-widest font-bold"
              >
                Dismiss
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

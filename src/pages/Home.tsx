import { useState, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import IntroScreen from '../components/IntroScreen';
import Navbar from '../components/Navbar';
import Hero from '../components/Hero';
import About from '../components/About';
import Menu from '../components/Menu';
import Gallery from '../components/Gallery';
import Testimonials from '../components/Testimonials';
import Reservation from '../components/Reservation';
import Footer from '../components/Footer';

export default function Home() {
  const [introComplete, setIntroComplete] = useState(() => {
    return sessionStorage.getItem('introComplete') === 'true';
  });
  const [pendingHash, setPendingHash] = useState('');
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
    if (introComplete && pendingHash) {
      const element = document.querySelector(pendingHash);
      if (element) {
        // Delay briefly to ensure sections are explicitly rendered
        setTimeout(() => {
          element.scrollIntoView({ behavior: 'smooth' });
        }, 150);
      }
    }
  }, [introComplete, pendingHash]);

  // Use a callback to prevent IntroScreen from remounting or resetting the timer 
  const handleIntroComplete = useCallback(() => {
    setIntroComplete(true);
    sessionStorage.setItem('introComplete', 'true');
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
    </div>
  );
}

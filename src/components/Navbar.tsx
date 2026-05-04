import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Menu, X, Calendar, Plus } from 'lucide-react';
import { Link } from 'react-router-dom';
import { collection, onSnapshot, doc, updateDoc, addDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { ReservationData } from '../pages/types';

export default function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [myReservations, setMyReservations] = useState<ReservationData[]>([]);
  const prevReservationsRef = useRef<Record<string, string>>({});
  const [showReservations, setShowReservations] = useState(false);
  
  const handleAcceptSuggestion = async (res: ReservationData) => {
    if (!res.suggestedDatetime) return;
    try {
      await updateDoc(doc(db, 'reservations', res.id), {
        datetime: res.suggestedDatetime,
        status: 'Pending',
        suggestedDatetime: ''
      });
    } catch (e) {
      console.error(e);
    }
  };

  const [rejectingRes, setRejectingRes] = useState<ReservationData | null>(null);
  const [rejectMode, setRejectMode] = useState<'options' | 'changeTime' | null>(null);
  const [newSuggestDatetime, setNewSuggestDatetime] = useState('');

  const submitRejectOrChange = async () => {
    if (!rejectingRes) return;
    if (rejectMode === 'changeTime') {
       if (!newSuggestDatetime) {
         alert("Please select a valid date/time.");
         return;
       }
       try {
         // Add as a new reservation and cancel the old one
         await updateDoc(doc(db, 'reservations', rejectingRes.id), {
           status: 'Cancelled'
         });
         const newRes = {
           name: rejectingRes.name,
           phone: rejectingRes.phone,
           guests: rejectingRes.guests,
           datetime: newSuggestDatetime,
           status: 'Pending',
           createdAt: new Date().toISOString()
         };
         const docRef = await addDoc(collection(db, 'reservations'), newRes);
         
         // Update local storage to track the new one too
         const stored = localStorage.getItem('myReservations');
         const parsed = stored ? JSON.parse(stored) : [];
         parsed.push(docRef.id);
         localStorage.setItem('myReservations', JSON.stringify(parsed));
         window.dispatchEvent(new Event('reservationUpdated'));
       } catch (e) {
         console.error(e);
       }
    } else {
       // Just reject meaning cancel
       try {
         await updateDoc(doc(db, 'reservations', rejectingRes.id), {
           status: 'Cancelled'
         });
       } catch (e) {
         console.error(e);
       }
    }
    setRejectingRes(null);
    setRejectMode(null);
    setNewSuggestDatetime('');
  };

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    // Listen for local storage updates
    const updateLocalReservations = () => {
      try {
        const stored = localStorage.getItem('myReservations');
        let parsedIds: string[] = [];
        if (stored) {
          parsedIds = JSON.parse(stored) as string[];
        }
        const virtualPhone = localStorage.getItem('virtualAccountPhone');
        if (parsedIds.length > 0 || virtualPhone) {
          setupFirestoreListener(parsedIds);
        }
      } catch (e) {
        // Ignore JSON error
      }
    };
    
    updateLocalReservations();
    
    // Add event listener for newly added reservations from Reservation.tsx
    window.addEventListener('reservationUpdated', updateLocalReservations);
    return () => window.removeEventListener('reservationUpdated', updateLocalReservations);
  }, []);

  const [unsubscribeFn, setUnsubscribeFn] = useState<(() => void) | null>(null);

  const setupFirestoreListener = (myReservationIds: string[]) => {
    if (unsubscribeFn) {
      unsubscribeFn();
    }
    
    const virtualPhone = localStorage.getItem('virtualAccountPhone');
    
    const unsub = onSnapshot(collection(db, 'reservations'), (snapshot) => {
      const myRes: ReservationData[] = [];
      const now = new Date();

      snapshot.docs.forEach(doc => {
        const data = doc.data() as ReservationData;
        
        const isMyRes = myReservationIds.includes(doc.id) || myReservationIds.includes(data.id) || (virtualPhone && data.phone === virtualPhone);
        
        if (isMyRes) {
            myRes.push(data);
           
           // Check for status changes to notify
           const prevStatus = prevReservationsRef.current[data.id];
           if (prevStatus && prevStatus !== data.status) {
              if ('Notification' in window && Notification.permission === 'granted') {
                 new Notification('Lodhi Bhawan Updates', {
                    body: `Your reservation status updated to: ${data.status === 'SuggestedNewTime' ? 'Admin Suggested New Time' : data.status}`,
                 });
              }
           }
           prevReservationsRef.current[data.id] = data.status;
        }
      });
      // Sort to show ascending by date
      setMyReservations(myRes.sort((a, b) => new Date(a.datetime).getTime() - new Date(b.datetime).getTime()));
    }, (error) => {
      console.log('Error listening to reservations', error);
    });
    setUnsubscribeFn(() => unsub);
  };
    
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
      try {
        const element = document.querySelector(targetId);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth' });
        }
      } catch (err) {
        // ignore
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
          
          <div className="relative">
            <button 
              onClick={() => setShowReservations(!showReservations)}
              className="relative text-primary/80 hover:text-primary transition-colors p-2"
            >
              <Calendar size={20} />
              {myReservations.length > 0 && (
                <span className="absolute top-1 right-1 w-2 h-2 bg-primary rounded-full animate-pulse border border-darker"></span>
              )}
            </button>
            <AnimatePresence>
              {showReservations && (
                  <motion.div 
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  className="absolute right-0 mt-4 w-72 bg-darker border border-primary/20 shadow-2xl p-4 z-50 rounded-sm"
                >
                  <h4 className="text-secondary font-serif mb-4 flex justify-between items-center">
                    <span>My Reservations</span>
                    {myReservations.length > 0 && <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded-full">{myReservations.length}</span>}
                  </h4>
                  <div className="space-y-4 max-h-80 overflow-y-auto pr-1">
                    {myReservations.length === 0 ? (
                      <div className="py-2">
                        <p className="text-secondary/50 text-xs italic mb-4 text-center">No reservations found.</p>
                      </div>
                    ) : (
                      <>
                        {/* Upcoming Section */}
                        {myReservations.filter(r => r.status !== 'Reached' && r.status !== 'Completed').length > 0 && (
                          <div className="space-y-2">
                            <p className="text-[10px] uppercase tracking-[0.2em] text-primary/50 font-bold mb-2">Upcoming</p>
                            {myReservations
                              .filter(r => r.status !== 'Reached' && r.status !== 'Completed')
                              .map(res => (
                                <div key={res.id} className={`text-sm bg-dark p-3 border rounded-sm relative ${ res.status === 'Confirmed' ? 'border-[#8A9A5B]/30' : res.status === 'Cancelled' || res.status === 'DidntReach' ? 'border-[#E2725B]/30' : res.status === 'SuggestedNewTime' ? 'border-[#FF9933]/30' : 'border-[#CCCCFF]/30' }`}>
                                  <div className={`absolute top-0 bottom-0 left-0 w-1 ${ res.status === 'Confirmed' ? 'bg-[#8A9A5B]' : res.status === 'Cancelled' || res.status === 'DidntReach' ? 'bg-[#E2725B]' : res.status === 'SuggestedNewTime' ? 'bg-[#FF9933]' : 'bg-[#CCCCFF]'}`}></div>
                                  <div className="ml-2">
                                     <div className="flex justify-between items-start">
                                       <p className="text-white font-medium">{res.name}</p>
                                       <span className="text-[9px] px-1.5 py-0.5 rounded border uppercase tracking-widest text-secondary/90 bg-darker border-primary/20">
                                         {res.status === 'SuggestedNewTime' ? 'Suggested New Time' : res.status === 'DidntReach' || res.status === "DIDN'T REACHED" ? "DIDN'T REACHED" : res.status}
                                       </span>
                                     </div>
                                     <p className="text-secondary/70 text-[11px] mt-1 font-mono flex items-center gap-0.5"><Plus size={10} className="text-secondary/40" />{res.phone}</p>
                                     <p className="text-secondary/70 text-xs mt-0.5">{new Date(res.datetime).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short'})}</p>
                                     <p className="text-xs text-secondary/60 mt-2 border-t border-primary/10 pt-2">{res.guests} Guests{res.tableNo ? ` | Table: ${res.tableNo}` : ''}</p>
                                     
                                     {res.status === 'SuggestedNewTime' && (
                                       <div className="mt-3 bg-[#FF9933]/10 border border-[#FF9933]/20 p-2 rounded-sm">
                                         <p className="text-[11px] text-secondary/80 mb-2 leading-relaxed">Admin suggested a new time:<br/><span className="text-[#FF9933] font-mono">{res.suggestedDatetime ? new Date(res.suggestedDatetime).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short'}) : 'No Time'}</span></p>
                                         <div className="flex gap-2">
                                            <button onClick={() => handleAcceptSuggestion(res)} className="flex-1 bg-[#FF9933]/20 text-[#FF9933] border border-[#FF9933]/30 px-2 py-1 text-[10px] uppercase tracking-widest hover:bg-[#FF9933]/30 font-bold">Accept</button>
                                            <button onClick={() => { setRejectingRes(res); setRejectMode('options'); setShowReservations(false); }} className="flex-1 bg-red-500/10 text-red-400 border border-red-500/20 px-2 py-1 text-[10px] uppercase tracking-widest hover:bg-red-500/20 font-bold">Reject</button>
                                         </div>
                                       </div>
                                     )}
                                  </div>
                                </div>
                              ))}
                          </div>
                        )}

                        {/* History Section */}
                        {myReservations.filter(r => r.status === 'Reached' || r.status === 'Completed').length > 0 && (
                          <div className="space-y-2 mt-4 text-left">
                            <p className="text-[10px] uppercase tracking-[0.2em] text-primary/50 font-bold mb-2">History / Reached</p>
                            {myReservations
                              .filter(r => r.status === 'Reached' || r.status === 'Completed')
                              .map(res => (
                                <div key={res.id} className={`text-sm bg-dark/40 p-3 border rounded-sm relative opacity-80 ${ res.status === 'Completed' ? 'border-[#E6D7A3]/30' : 'border-[#CD7F32]/30' }`}>
                                  <div className={`absolute top-0 bottom-0 left-0 w-1 ${ res.status === 'Completed' ? 'bg-[#E6D7A3]' : 'bg-[#CD7F32]'}`}></div>
                                  <div className="ml-2">
                                     <div className="flex justify-between items-start">
                                       <p className="text-white/70 font-medium">{res.name}</p>
                                       <span className="text-[9px] text-secondary/60 bg-darker/50 px-1.5 py-0.5 rounded border border-primary/10 uppercase tracking-widest">{res.status === "DidntReach" || res.status === "DIDN'T REACHED" ? "DIDN'T REACHED" : res.status}</span>
                                     </div>
                                     <p className="text-secondary/50 text-[10px] mt-1 font-mono flex items-center gap-0.5"><Plus size={10} className="text-secondary/30" />{res.phone}</p>
                                     <p className="text-secondary/50 text-[10px]">{new Date(res.datetime).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short'})}</p>
                                  </div>
                                </div>
                              ))}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <a
            href="#reserve-section"
            onClick={(e) => handleNavClick(e, '#reserve-section')}
            className="text-xs font-bold uppercase tracking-widest text-primary bg-gradient-to-r from-dark to-darker border border-primary/20 px-6 py-3 hover:from-darker hover:to-dark transition-all duration-300 shadow-lg"
          >
            Reserve a Table
          </a>
        </div>

        {/* Mobile Toggle & Mobile Notification Icon */}
        <div className="flex items-center gap-4 md:hidden">
          <div className="relative">
            <button 
              onClick={() => setShowReservations(!showReservations)}
              className="text-secondary hover:text-primary transition-colors p-2"
            >
              <Calendar size={22} />
              {myReservations.length > 0 && (
                <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-primary rounded-full animate-pulse border border-darker"></span>
              )}
            </button>
            <AnimatePresence>
              {showReservations && (
                <motion.div 
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  className="fixed right-4 left-4 mt-6 bg-darker border border-primary/20 shadow-2xl p-4 z-50 rounded-sm"
                >
                  <div className="flex justify-between items-center mb-4">
                    <h4 className="text-secondary font-serif">My Reservations {myReservations.length > 0 && <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded-full ml-2">{myReservations.length}</span>}</h4>
                    <button onClick={() => setShowReservations(false)} className="text-secondary/50 hover:text-primary"><X size={18}/></button>
                  </div>
                  <div className="space-y-4 max-h-80 overflow-y-auto pr-1">
                    {myReservations.length === 0 ? (
                      <div className="py-2">
                        <p className="text-secondary/50 text-xs italic mb-4 text-center">No reservations found.</p>
                      </div>
                    ) : (
                      <>
                        {/* Upcoming Section */}
                        {myReservations.filter(r => r.status !== 'Reached' && r.status !== 'Completed').length > 0 && (
                          <div className="space-y-2">
                            <p className="text-[10px] uppercase tracking-[0.2em] text-primary/50 font-bold mb-2">Upcoming</p>
                            {myReservations
                              .filter(r => r.status !== 'Reached' && r.status !== 'Completed')
                              .map(res => (
                                <div key={res.id} className={`text-sm bg-dark p-3 border rounded-sm relative ${ res.status === 'Confirmed' ? 'border-[#8A9A5B]/30' : res.status === 'Cancelled' || res.status === 'DidntReach' ? 'border-[#E2725B]/30' : res.status === 'Reached' ? 'border-[#CD7F32]/30' : res.status === 'SuggestedNewTime' ? 'border-[#FF9933]/30' : 'border-[#CCCCFF]/30' }`}>
                                  <div className={`absolute top-0 bottom-0 left-0 w-1 ${ res.status === 'Confirmed' ? 'bg-[#8A9A5B]' : res.status === 'Cancelled' || res.status === 'DidntReach' ? 'bg-[#E2725B]' : res.status === 'Reached' ? 'bg-[#CD7F32]' : res.status === 'SuggestedNewTime' ? 'bg-[#FF9933]' : 'bg-[#CCCCFF]'}`}></div>
                                  <div className="ml-2">
                                     <div className="flex justify-between items-start">
                                       <p className="text-white font-medium">{res.name}</p>
                                       <span className="text-[9px] px-1.5 py-0.5 rounded border uppercase tracking-widest text-secondary/90 bg-darker border-primary/20">
                                         {res.status === 'SuggestedNewTime' ? 'Suggested New Time' : res.status === "DidntReach" || res.status === "DIDN'T REACHED" ? "DIDN'T REACHED" : res.status}
                                       </span>
                                     </div>
                                     <p className="text-secondary/70 text-[11px] mt-1 font-mono flex items-center gap-0.5"><Plus size={10} className="text-secondary/40" />{res.phone}</p>
                                     <p className="text-secondary/70 text-xs mt-0.5">{new Date(res.datetime).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short'})}</p>
                                     <p className="text-xs text-secondary/60 mt-2 border-t border-primary/10 pt-2">{res.guests} Guests{res.tableNo ? ` | Table: ${res.tableNo}` : ''}</p>
                                     
                                     {res.status === 'SuggestedNewTime' && (
                                       <div className="mt-3 bg-[#FF9933]/10 border border-[#FF9933]/20 p-2 rounded-sm">
                                         <p className="text-[11px] text-secondary/80 mb-2 leading-relaxed">Admin suggested a new time:<br/><span className="text-[#FF9933] font-mono">{res.suggestedDatetime ? new Date(res.suggestedDatetime).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short'}) : 'No Time'}</span></p>
                                         <div className="flex gap-2">
                                            <button onClick={() => handleAcceptSuggestion(res)} className="flex-1 bg-[#FF9933]/20 text-[#FF9933] border border-[#FF9933]/30 px-2 py-1 text-[10px] uppercase tracking-widest hover:bg-[#FF9933]/30 font-bold">Accept</button>
                                            <button onClick={() => { setRejectingRes(res); setRejectMode('options'); setShowReservations(false); setIsMobileMenuOpen(false); }} className="flex-1 bg-red-500/10 text-red-400 border border-red-500/20 px-2 py-1 text-[10px] uppercase tracking-widest hover:bg-red-500/20 font-bold">Reject</button>
                                         </div>
                                       </div>
                                     )}
                                  </div>
                                </div>
                              ))}
                          </div>
                        )}

                        {/* History Section */}
                        {myReservations.filter(r => r.status === 'Reached' || r.status === 'Completed').length > 0 && (
                          <div className="space-y-2 mt-4 text-left">
                            <p className="text-[10px] uppercase tracking-[0.2em] text-primary/50 font-bold mb-2">History / Reached</p>
                            {myReservations
                              .filter(r => r.status === 'Reached' || r.status === 'Completed')
                              .map(res => (
                                <div key={res.id} className={`text-sm bg-dark/40 p-3 border rounded-sm relative opacity-80 ${ res.status === 'Completed' ? 'border-[#E6D7A3]/30' : 'border-[#CD7F32]/30' }`}>
                                  <div className={`absolute top-0 bottom-0 left-0 w-1 ${ res.status === 'Completed' ? 'bg-[#E6D7A3]' : 'bg-[#CD7F32]'}`}></div>
                                  <div className="ml-2">
                                     <div className="flex justify-between items-start">
                                       <p className="text-white/70 font-medium">{res.name}</p>
                                       <span className="text-[9px] text-secondary/60 bg-darker/50 px-1.5 py-0.5 rounded border border-primary/10 uppercase tracking-widest">{res.status === "DidntReach" || res.status === "DIDN'T REACHED" ? "DIDN'T REACHED" : res.status}</span>
                                     </div>
                                     <p className="text-secondary/50 text-[10px] mt-1 font-mono flex items-center gap-0.5"><Plus size={10} className="text-secondary/30" />{res.phone}</p>
                                     <p className="text-secondary/50 text-[10px]">{new Date(res.datetime).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short'})}</p>
                                  </div>
                                </div>
                              ))}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <button 
            className="text-secondary p-2 -mr-2 bg-dark/30 rounded-lg active:scale-95 transition-transform"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            aria-label="Toggle Menu"
          >
            {isMobileMenuOpen ? <X size={28} /> : <Menu size={28} />}
          </button>
        </div>
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
                href="#reserve-section"
                onClick={(e) => handleNavClick(e, '#reserve-section')}
                className="text-sm font-bold uppercase tracking-widest text-primary bg-gradient-to-r from-dark to-darker border border-primary/20 px-6 py-3 text-center mt-2"
              >
                Reserve a Table
              </a>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {rejectingRes && (
          <motion.div 
             initial={{ opacity: 0 }}
             animate={{ opacity: 1 }}
             exit={{ opacity: 0 }}
             className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm px-4"
          >
             <div className="bg-dark border border-red-500/40 p-6 max-w-sm w-full shadow-2xl relative">
                <h3 className="text-xl font-serif text-red-400 mb-2">Reject Suggestion</h3>
                
                {rejectMode === 'options' ? (
                  <>
                    <p className="text-sm text-secondary/70 mb-6">
                      You are rejecting the admin's suggested time slot. Would you like to propose a new time or just cancel the reservation?
                    </p>
                    <div className="flex flex-col gap-3">
                      <button 
                         onClick={() => setRejectMode('changeTime')}
                         className="w-full py-3 bg-amber-900/40 text-amber-500 hover:bg-amber-900/60 border border-amber-500/30 transition-colors uppercase text-xs tracking-widest font-bold"
                      >
                         Propose New Time
                      </button>
                      <button 
                         onClick={submitRejectOrChange}
                         className="w-full py-3 bg-red-900/40 text-red-400 hover:bg-red-900/60 border border-red-500/30 transition-colors uppercase text-xs tracking-widest font-bold"
                      >
                         Just Cancel Reservation
                      </button>
                      <button 
                         onClick={() => { setRejectingRes(null); setRejectMode(null); }}
                         className="w-full py-2 border-t border-secondary/10 text-secondary/60 hover:text-secondary uppercase text-[10px] tracking-widest mt-2"
                      >
                         Go Back
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <p className="text-sm text-secondary/70 mb-4">Select a new date and time you prefer:</p>
                    <input
                       type="datetime-local"
                       value={newSuggestDatetime}
                       onChange={(e) => setNewSuggestDatetime(e.target.value)}
                       className="w-full bg-darker border border-amber-500/30 p-3 text-secondary focus:outline-none focus:border-amber-400 mb-6 [color-scheme:dark]"
                    />
                    <div className="flex gap-3">
                      <button 
                        onClick={() => setRejectMode('options')}
                        className="flex-1 py-3 border border-secondary/30 text-secondary hover:bg-secondary/10 transition-colors uppercase text-xs tracking-widest"
                      >
                        Back
                      </button>
                      <button 
                        onClick={submitRejectOrChange}
                        className="flex-1 py-3 bg-primary/20 text-primary border border-primary/30 hover:bg-primary/30 transition-colors uppercase text-xs tracking-widest font-bold"
                      >
                        Submit
                      </button>
                    </div>
                  </>
                )}
             </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.nav>
  );
}

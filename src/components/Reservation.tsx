import { motion, AnimatePresence } from 'motion/react';
import { MapPin, Phone, Clock, X, CheckCircle2 } from 'lucide-react';
import { useState } from 'react';
import { ReservationData } from '../pages/types';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { doc, setDoc } from 'firebase/firestore';

export default function Reservation() {
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    guests: '2',
    datetime: ''
  });
  const [showPopup, setShowPopup] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const minTime = new Date(Date.now() + 15 * 60000);
  const minDateTimePickerValue = new Date(minTime.getTime() - minTime.getTimezoneOffset() * 60000).toISOString().slice(0, 16);

  const handleSubmit = async (e: any) => {
    setError("");
    e.preventDefault();
    const { name, phone, guests, datetime } = formData;
    if (!name || !phone || !datetime) {
      setError("Please fill in all details.");
      return;
    }

    setIsSubmitting(true);

    const selectedTime = new Date(datetime).getTime();
    const minAdvanceTime = Date.now() + 15 * 60000;
    
    if (selectedTime < minAdvanceTime) {
      setError("Advance booking is required. Please select a time at least 15 minutes from now.");
      setIsSubmitting(false);
      return;
    }

    const reservationId = Date.now().toString();
    const newReservation: ReservationData = {
      id: reservationId,
      name,
      phone,
      guests,
      datetime,
      status: 'Pending',
      createdAt: new Date().toISOString()
    };

    try {
      await setDoc(doc(db, 'reservations', reservationId), newReservation);
    } catch (err) {
      setError("There was an error submitting your reservation. Please try again later.");
      setIsSubmitting(false);
      handleFirestoreError(err, OperationType.CREATE, `reservations/${reservationId}`);
      return;
    }

    setIsSubmitting(false);

    if ('Notification' in window && Notification.permission !== 'granted') {
      Notification.requestPermission();
    }

    // Save to local storage for tracking
    try {
      const existing = localStorage.getItem('myReservations');
      const parsed = existing ? JSON.parse(existing) : [];
      parsed.push(reservationId);
      localStorage.setItem('myReservations', JSON.stringify(parsed));
      
      // Save their phone as their virtual account identity
      localStorage.setItem('virtualAccountPhone', formData.phone);
      
      // Dispatch custom event to notify Navbar immediately
      window.dispatchEvent(new Event('reservationUpdated'));
    } catch (e) {
      // Ignore
    }

    // Show the popup
    setShowPopup(true);
    
    // Reset form
    setFormData({
      name: '',
      phone: '',
      guests: '2',
      datetime: ''
    });
  };

  return (
    <section id="reserve-section" className="py-16 md:py-24 bg-dark relative">
      {/* Background Image Overlay */}
      <div className="absolute inset-0 z-0 opacity-10">
        <img 
          src="/reserve-bg.jpg" 
          alt="Background" 
          className="w-full h-full object-cover sepia-theme"
        />
      </div>

      <div className="container mx-auto px-6 md:px-12 relative z-10">
        <div className="flex flex-col lg:flex-row gap-16">
          
          {/* Info Section */}
          <motion.div 
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="lg:w-1/3"
          >
            <h2 className="text-xs uppercase tracking-[0.3em] text-primary mb-4">Reservation</h2>
            <h3 className="text-3xl font-serif text-secondary mb-4">Reserve a Table</h3>
            <p className="text-sm md:text-base text-secondary/70 font-light mb-10 max-w-md">
              Secure your spot for an unforgettable dining experience. Whether it's an intimate dinner or a family gathering, we have the perfect table reserved for you.
            </p>
            
            <div className="space-y-8">
              <div className="flex items-start gap-4">
                <MapPin className="text-primary shrink-0 mt-1" />
                <div>
                  <h4 className="text-secondary font-medium mb-1">Location</h4>
                  <p className="text-secondary/60 font-light text-sm mb-3">SCO 482, Sector 35 C,<br/>Chandigarh</p>
                  <a 
                    href="https://maps.app.goo.gl/y5CmivcvZJggKcy7A?g_st=ac" 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="inline-block border border-primary/30 text-primary px-3 py-1.5 hover:bg-primary/10 transition-all active:scale-95 uppercase text-[10px] tracking-widest font-medium"
                  >
                    Get Directions
                  </a>
                </div>
              </div>
              
              <div className="flex items-start gap-4">
                <Phone className="text-primary shrink-0 mt-1" />
                <div>
                  <h4 className="text-secondary font-medium mb-1">Contact</h4>
                  <p className="text-secondary/60 font-light text-sm">+91 988-884-8482</p>
                </div>
              </div>
              
              <div className="flex items-start gap-4">
                <Clock className="text-primary shrink-0 mt-1" />
                <div>
                  <h4 className="text-secondary font-medium mb-1">Hours</h4>
                  <p className="text-secondary/60 font-light text-sm">Open Now | 9AM-1AM<br/>Love Walk-Ins</p>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Form Section */}
          <motion.div 
            id="reserve"
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="lg:w-2/3 bg-darker p-8 md:p-12 border border-primary/20 scroll-mt-32"
          >
            {error && <div className="md:col-span-2 text-red-500 text-sm mb-4 border border-red-500/30 bg-red-500/10 p-3">{error}</div>}
            <form className="grid grid-cols-1 md:grid-cols-2 gap-6" onSubmit={handleSubmit}>
              <div className="space-y-2">
                <label className="text-xs uppercase tracking-widest text-secondary/60">Name</label>
                <input 
                  type="text" 
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className="w-full bg-transparent border-b border-secondary/30 py-2 text-secondary focus:outline-none focus:border-primary transition-colors" 
                  placeholder="Your Name" 
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs uppercase tracking-widest text-secondary/60">Phone</label>
                <div className="relative">
                  <span className="absolute left-0 bottom-2 text-secondary/60 font-mono">+91 </span>
                  <input 
                    type="tel" 
                    required
                    value={formData.phone}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, '').slice(0, 10);
                      setFormData({...formData, phone: val})
                    }}
                    pattern="[0-9]{10}"
                    maxLength={10}
                    minLength={10}
                    title="Please enter exactly 10 digits"
                    className="w-full bg-transparent border-b border-secondary/30 py-2 pl-10 text-secondary focus:outline-none focus:border-primary transition-colors font-mono" 
                    placeholder="10-digit Number" 
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs uppercase tracking-widest text-secondary/60">Guests</label>
                <select 
                  value={formData.guests}
                  onChange={(e) => setFormData({...formData, guests: e.target.value})}
                  className="w-full bg-transparent border-b border-secondary/30 py-2 text-secondary focus:outline-none focus:border-primary transition-colors appearance-none"
                >
                  <option value="1" className="bg-darker">1 Person</option>
                  <option value="2" className="bg-darker">2 People</option>
                  <option value="3" className="bg-darker">3 People</option>
                  <option value="4" className="bg-darker">4 People</option>
                  <option value="5" className="bg-darker">5 People</option>
                  <option value="6" className="bg-darker">6 People</option>
                  <option value="7" className="bg-darker">7 People</option>
                  <option value="8" className="bg-darker">8 People</option>
                  <option value="9" className="bg-darker">9 People</option>
                  <option value="10" className="bg-darker">10 People</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-xs uppercase tracking-widest text-secondary/60">Date & Time</label>
                <input 
                  type="datetime-local" required
                  min={minDateTimePickerValue}
                  value={formData.datetime}
                  onChange={(e) => setFormData({...formData, datetime: e.target.value})}
                  className="w-full bg-transparent border-b border-secondary/30 py-2 text-secondary focus:outline-none focus:border-primary transition-colors [color-scheme:dark]" 
                />
              </div>
              <div className="md:col-span-2 mt-6">
                <button type="submit" disabled={isSubmitting} className="w-full bg-gradient-to-r from-dark to-darker border border-primary/30 text-primary py-4 uppercase tracking-widest text-sm font-medium hover:from-darker hover:to-dark transition-all duration-300 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed">
                  Reserve Now
                </button>
              </div>
            </form>
          </motion.div>

        </div>
      </div>

      {/* Success Popup */}
      <AnimatePresence>
        {showPopup && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4"
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-darker border border-primary/30 p-8 max-w-md w-full relative shadow-2xl shadow-primary/10"
            >
              <button 
                onClick={() => setShowPopup(false)}
                className="absolute top-4 right-4 text-secondary/50 hover:text-primary transition-colors"
                aria-label="Close Popup"
              >
                <X size={24} />
              </button>
              
              <div className="text-center">
                <CheckCircle2 className="w-16 h-16 text-primary mx-auto mb-6" />
                <h4 className="text-2xl font-serif text-secondary mb-4">Thanks For Booking</h4>
                
                <p className="text-secondary/70 font-light leading-relaxed mb-6">
                  Your reservation request has been successfully submitted.<br/>
                  You’ll receive a confirmation notification within 5–10 minutes.
                </p>
                
                <button 
                  onClick={() => setShowPopup(false)}
                  className="w-full border border-primary/30 text-primary py-3 uppercase tracking-widest text-xs font-medium hover:bg-primary/5 transition-all duration-300"
                >
                  Understood
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}

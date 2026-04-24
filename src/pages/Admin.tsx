import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Link } from 'react-router-dom';
import { ChevronLeft, CheckCircle2, XCircle, Clock, Filter, Phone, User, Calendar, MessageSquare, LogOut, Settings, Edit3, KeyRound, MoreVertical } from 'lucide-react';
import { ReservationData } from '../types';
import { db } from '../firebase';
import { collection, query, orderBy, onSnapshot, doc, updateDoc, setDoc } from 'firebase/firestore';

const ADMIN_USER = 'lodhibhawan7';

// 3 simple tables on left, 2 sofa right, 1 simple right
const TABLES = [
  { id: 'T1', name: 'Table 1', capacity: 4, min: 2, type: 'simple', position: 'left' },
  { id: 'T2', name: 'Table 2', capacity: 4, min: 2, type: 'simple', position: 'left' },
  { id: 'T3', name: 'Table 3', capacity: 4, min: 2, type: 'simple', position: 'left' },
  { id: 'S1', name: 'Sofa 1', capacity: 6, min: 5, type: 'sofa', position: 'right' },
  { id: 'S2', name: 'Sofa 2', capacity: 6, min: 5, type: 'sofa', position: 'right' },
  { id: 'T4', name: 'Table 4', capacity: 4, min: 2, type: 'simple', position: 'right' },
];

export default function Admin() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [username, setUsername] = useState('');
  const [pin, setPin] = useState('');
  const [loginError, setLoginError] = useState('');
  const [fetchError, setFetchError] = useState('');

  const [currentAdminPin, setCurrentAdminPin] = useState(() => localStorage.getItem('adminPin') || '4567');

  const [reservations, setReservations] = useState<ReservationData[]>([]);
  const [activeTab, setActiveTab] = useState<'reservations' | 'upcoming' | 'tables' | 'settings'>('reservations');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Pending' | 'Confirmed' | 'Cancelled'>('All');
  const [upcomingDateFilter, setUpcomingDateFilter] = useState(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });
  
  // PIN Change State
  const [oldPinInput, setOldPinInput] = useState('');
  const [newPinInput, setNewPinInput] = useState('');
  const [confirmPinInput, setConfirmPinInput] = useState('');
  const [pinChangeMessage, setPinChangeMessage] = useState('');
  
  // Rejection modal
  const [selectedResReject, setSelectedResReject] = useState<ReservationData | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  // Allocation Wizard State
  const [allocatingRes, setAllocatingRes] = useState<ReservationData | null>(null);
  // steps: undefined -> popup asking to confirm -> final details
  const [allocationStep, setAllocationStep] = useState<'none' | 'confirm_selection' | 'final_details'>('none');
  const [pendingTableSelection, setPendingTableSelection] = useState<string>('');
  
  // View Table state
  const [viewTableDetailsId, setViewTableDetailsId] = useState<string | null>(null);

  useEffect(() => {
    // Check if previously logged in
    if (sessionStorage.getItem('adminAuth') === 'true') {
      setIsAuthenticated(true);
    }

    // Sync old local storage reservations to Firebase (Migrate old data)
    try {
      const localData = JSON.parse(localStorage.getItem('reservations') || '[]');
      if (localData.length > 0) {
        localData.forEach(async (res: any) => {
          if (!res.createdAt) res.createdAt = new Date(res.datetime).toISOString(); // fallback
          if (!res.id) res.id = Date.now().toString();
          await setDoc(doc(db, 'reservations', res.id), res, { merge: true });
        });
        localStorage.removeItem('reservations');
      }
    } catch (e) { console.error("Migration error", e); }
    
    // Real-time Firestore sync
    const q = query(collection(db, 'reservations'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      let data: ReservationData[] = [];
      snapshot.forEach((doc) => {
        data.push(doc.data() as ReservationData);
      });
      // Sort in frontend to ensure no documents are hidden due to missing createdAt field
      data.sort((a, b) => {
        const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return timeB - timeA;
      });
      setReservations(data);
      setFetchError('');
    }, (error) => {
      console.error('Error fetching reservations:', error);
      setFetchError(error.message);
    });

    return () => unsubscribe();
  }, []);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (username === ADMIN_USER && pin === currentAdminPin) {
      setIsAuthenticated(true);
      sessionStorage.setItem('adminAuth', 'true');
      setLoginError('');
    } else {
      setLoginError('Invalid username or PIN');
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    sessionStorage.removeItem('adminAuth');
  };

  const updateReservationStatus = async (id: string, updates: Partial<ReservationData>) => {
    try {
      await updateDoc(doc(db, 'reservations', id), updates);
    } catch (error) {
      console.error("Error updating reservation status:", error);
      alert("Failed to update reservation status.");
    }
  };

  const initAllocation = (res: ReservationData) => {
    setAllocatingRes(res);
    setAllocationStep('none');
    setPendingTableSelection('');
    setActiveTab('tables'); // Switch to table layout
  };

  const handleTableClick = (tableId: string) => {
    if (!allocatingRes) {
      setViewTableDetailsId(tableId);
      return;
    }

    // Check availability (1.5 window)
    const allocatingTime = new Date(allocatingRes.datetime).getTime();
    const isReserved = reservations.some(r => {
      if (r.tableNo !== tableId || r.status !== 'Confirmed') return false;
      const existingTime = new Date(r.datetime).getTime();
      return Math.abs(existingTime - allocatingTime) < 1.5 * 60 * 60 * 1000;
    });

    if (isReserved) {
      alert("This table is already reserved within 1.5 hours of this time.");
      return;
    }

    // Check capacity rules
    const table = TABLES.find(t => t.id === tableId);
    const guestCount = parseInt(allocatingRes.guests) || 1;
    
    if (table) {
      if (guestCount > table.capacity || guestCount < table.min) {
         if (!window.confirm(`This ${table.type} table is for ${table.min}-${table.capacity} guests, but booking is for ${guestCount}. Proceed anyway?`)) {
           return;
         }
      }
    }

    setPendingTableSelection(tableId);
    setAllocationStep('confirm_selection');
  };

  const proceedToFinalDetails = () => {
    setAllocationStep('final_details');
  };

  const goBackToSelection = () => {
    setAllocationStep('none');
    setPendingTableSelection('');
  };

  const handleConfirmBookingFinal = () => {
    if (!allocatingRes || !pendingTableSelection) return;

    updateReservationStatus(allocatingRes.id, { 
      status: 'Confirmed', 
      tableNo: pendingTableSelection 
    });

    // Format date for WhatsApp
    const dateObj = new Date(allocatingRes.datetime);
    const timeString = dateObj.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true });
    
    // Message according to prompt, made highly professional
    const text = `Dear ${allocatingRes.name},\nWe are delighted to inform you that your reservation has been confirmed!\nYour assigned table number is ${pendingTableSelection}. We look forward to hosting you on ${dateObj.toLocaleDateString('en-IN')} at ${timeString}.\n\nWarm regards,\nLodhi Bhawan`;

    // Open WhatsApp
    window.open(`https://wa.me/91${allocatingRes.phone.replace(/\D/g,'')}?text=${encodeURIComponent(text)}`, '_blank');
    
    // Reset flow
    setAllocatingRes(null);
    setPendingTableSelection('');
    setAllocationStep('none');
    setActiveTab('reservations');
  };

  const cancelAllocationProcess = () => {
    setAllocatingRes(null);
    setPendingTableSelection('');
    setAllocationStep('none');
    setActiveTab('reservations');
  };

  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  useEffect(() => {
    // Click outside to close menu
    const handleClickOutside = (e: MouseEvent) => {
      if ((e.target as Element).closest('.three-dots-menu')) return;
      setOpenMenuId(null);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleUnreserve = (res: ReservationData) => {
    // Directly unreserve or use a custom popup. Let's just update directly since it's from a menu
    updateReservationStatus(res.id, { 
      status: 'Cancelled'
    });
    setOpenMenuId(null);
  };

  const handleNotifyWhatsApp = (res: ReservationData) => {
    const dateObj = new Date(res.datetime);
    const timeString = dateObj.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true });
    const text = `Hello ${res.name},\nThis is a friendly reminder for your reservation at Lodhi Bhawan for today at ${timeString}.\nYour table is ${res.tableNo}.\nWe look forward to hosting you soon!`;
    window.open(`https://wa.me/91${res.phone.replace(/\D/g,'')}?text=${encodeURIComponent(text)}`, '_blank');
  };

  const handleReject = () => {
    if (!selectedResReject) return;

    updateReservationStatus(selectedResReject.id, { 
      status: 'Cancelled',
    });

    if (rejectReason) {
       const text = `Hello ${selectedResReject.name},\nWe're sorry but we are unable to confirm your reservation at Lodhi Bhawan for ${new Date(selectedResReject.datetime).toLocaleString('en-IN')}.\nReason: ${rejectReason}\n\nPlease contact us for further assistance.`;
       window.open(`https://wa.me/91${selectedResReject.phone.replace(/\D/g,'')}?text=${encodeURIComponent(text)}`, '_blank');
    }

    setSelectedResReject(null);
    setRejectReason('');
  };

  const handleChangePin = (e: React.FormEvent) => {
    e.preventDefault();
    setPinChangeMessage('');
    if (oldPinInput !== currentAdminPin) {
      setPinChangeMessage('Error: Incorrect previous PIN.');
      return;
    }
    if (newPinInput.length < 4) {
      setPinChangeMessage('Error: New PIN must be at least 4 characters.');
      return;
    }
    if (newPinInput !== confirmPinInput) {
      setPinChangeMessage('Error: New PINs do not match.');
      return;
    }
    localStorage.setItem('adminPin', newPinInput);
    setCurrentAdminPin(newPinInput);
    setPinChangeMessage('Success: PIN has been changed!');
    setOldPinInput('');
    setNewPinInput('');
    setConfirmPinInput('');
  };

  const filteredReservations = reservations.filter(r => {
    const matchesStatus = statusFilter === 'All' ? true : r.status === statusFilter;
    return matchesStatus;
  });

  const getTableStatus = (tableId: string) => {
    const checkTime = allocatingRes 
      ? new Date(allocatingRes.datetime).getTime() 
      : Date.now();

    const tableRes = reservations.find(r => {
      if (r.tableNo !== tableId || r.status !== 'Confirmed') return false;
      const existingTime = new Date(r.datetime).getTime();
      return Math.abs(existingTime - checkTime) < 1.5 * 60 * 60 * 1000;
    });

    if (tableRes) return 'Reserved';
    return 'Available';
  };

  // Render a specific table type visually
  const renderTableVisual = (table: any) => {
    const status = getTableStatus(table.id);
    const isAvailable = status === 'Available';
    
    const isSelected = table.id === pendingTableSelection;
    let tableColor = isAvailable ? 'bg-secondary/20 border-[#E6D7A3] shadow-[0_0_15px_rgba(230,215,163,0.1)]' : 'bg-red-900/40 border-[#DC2626] shadow-[0_0_15px_rgba(220,38,38,0.2)]';
    let seatColor = isAvailable ? 'bg-[#E6D7A3]' : 'bg-[#DC2626]';
    let textColor = isAvailable ? 'text-[#E6D7A3]' : 'text-[#FECACA]';

    if (isSelected) {
      tableColor = 'bg-primary/40 border-primary shadow-[0_0_20px_rgba(var(--color-primary-rgb),0.5)]';
      seatColor = 'bg-primary';
      textColor = 'text-white';
    }

    // Is it greyed out due to capacity restrictions during allocation?
    const guestCount = allocatingRes ? parseInt(allocatingRes.guests) || 1 : null;
    let opacityClass = 'opacity-100';
    if (guestCount && isAvailable && !isSelected) {
       if (guestCount > table.capacity || guestCount < table.min) {
         opacityClass = 'opacity-40 grayscale hover:opacity-80 transition-opacity';
       }
    }

    if (table.type === 'simple') {
      return (
        <div 
          key={table.id}
          onClick={() => handleTableClick(table.id)}
          className={`flex flex-col items-center justify-center gap-1.5 cursor-pointer group p-1 transition-all ${opacityClass}`}
        >
          <div className="flex gap-3">
            <div className={`w-3.5 h-3.5 rounded-full ${seatColor} transition-transform group-hover:-translate-y-1`}></div>
            <div className={`w-3.5 h-3.5 rounded-full ${seatColor} transition-transform group-hover:-translate-y-1`}></div>
          </div>
          <div className={`w-16 h-16 rounded-md border-[3px] flex items-center justify-center transition-transform group-hover:scale-105 z-10 ${tableColor}`}>
            <span className={`font-bold tracking-wider text-xs ${textColor}`}>{table.name}</span>
          </div>
          <div className="flex gap-3">
            <div className={`w-3.5 h-3.5 rounded-full ${seatColor} transition-transform group-hover:translate-y-1`}></div>
            <div className={`w-3.5 h-3.5 rounded-full ${seatColor} transition-transform group-hover:translate-y-1`}></div>
          </div>
        </div>
      );
    } // return sofa table rendering next

    if (table.type === 'sofa') {
      return (
        <div 
          key={table.id}
          onClick={() => handleTableClick(table.id)}
          className={`flex items-center justify-center cursor-pointer group relative p-2 transition-all ${opacityClass}`}
        >
          <div className="flex flex-col gap-2.5 justify-center -mr-1.5 z-10">
             <div className={`w-3.5 h-3.5 rounded-full ${seatColor} -translate-x-1 transition-transform`}></div>
             <div className={`w-3.5 h-3.5 rounded-full ${seatColor} -translate-x-2`}></div>
             <div className={`w-3.5 h-3.5 rounded-full ${seatColor} -translate-x-1 transition-transform`}></div>
          </div>
          <div className={`w-[72px] h-[72px] rounded-full border-[3px] flex items-center justify-center relative transition-transform group-hover:scale-105 z-20 ${tableColor}`}>
             <span className={`font-bold tracking-wider text-xs ${textColor} whitespace-nowrap`}>{table.name}</span>
          </div>
          {/* Half-circle sofa background */}
          <div className={`absolute right-1/2 translate-x-[42px] top-1/2 -translate-y-1/2 w-[38px] h-[95px] rounded-r-full border-r-[12px] border-t-[12px] border-b-[12px] transition-all ${isAvailable ? (isSelected ? 'border-primary' : 'border-[#E6D7A3]') : 'border-[#DC2626]'}`}></div>
        </div>
      );
    }
    return null;
  };


  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-darker flex items-center justify-center bg-grain font-sans p-6">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-dark p-8 md:p-12 border border-primary/20 shadow-2xl max-w-md w-full"
        >
          <div className="text-center mb-8">
            <img src="/logo3.png" alt="Lodhi Bhawan" className="h-12 mx-auto mb-4 sepia-theme" />
            <h2 className="text-2xl font-serif text-secondary mb-1">Admin Portal</h2>
            <p className="text-secondary/60 text-sm">Please log in to continue</p>
          </div>
          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-2">
              <label className="text-xs uppercase tracking-widest text-secondary/60">Username</label>
              <input 
                type="text" 
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full bg-darker/50 border border-secondary/20 p-3 text-secondary focus:outline-none focus:border-primary transition-colors" 
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs uppercase tracking-widest text-secondary/60">PIN Code</label>
              <input 
                type="password" 
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                className="w-full bg-darker/50 border border-secondary/20 p-3 text-secondary focus:outline-none focus:border-primary transition-colors tracking-widest" 
                required
              />
            </div>
            {loginError && <p className="text-red-400 text-sm text-center">{loginError}</p>}
            <button type="submit" className="w-full bg-gradient-to-r from-dark to-darker border border-primary/30 text-primary py-3 uppercase tracking-widest text-sm font-medium hover:bg-primary/10 transition-all duration-300">
              Access Dashboard
            </button>
            <div className="text-center mt-4">
              <Link to="/" className="text-secondary/50 hover:text-primary text-xs uppercase tracking-widest">Return to Home</Link>
            </div>
          </form>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-darker bg-grain font-sans text-secondary pb-24">
      {/* Top Bar */}
      <header className="bg-dark border-b border-primary/20 sticky top-0 z-30">
        <div className="container mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <Link to="/" className="text-secondary/60 hover:text-primary transition-colors" title="Back to site">
              <ChevronLeft />
            </Link>
            <img src="/logo3.png" alt="Lodhi Bhawan" className="h-8 sepia-theme hidden md:block" />
            <span className="font-serif text-xl tracking-wide">Admin Dashboard</span>
          </div>
          <button 
            onClick={handleLogout}
            className="text-secondary/60 hover:text-primary transition-colors p-2 rounded-sm"
          >
            <LogOut size={20} />
          </button>
        </div>
      </header>

      <main className="container mx-auto px-6 py-8 flex flex-col lg:flex-row gap-8">
        
        {/* Sidebar Nav */}
        <div className="lg:w-48 shrink-0 flex flex-row lg:flex-col gap-2 overflow-x-auto pb-4 lg:pb-0 border-b lg:border-b-0 lg:border-r border-primary/20 pr-4">
          <button 
            onClick={() => { setActiveTab('reservations'); setAllocatingRes(null); setAllocationStep('none'); }}
            className={`text-left px-4 py-3 text-sm tracking-widest uppercase transition-colors shrink-0 flex items-center gap-2 ${activeTab === 'reservations' ? 'bg-primary/10 text-primary border-l-2 border-primary' : 'text-secondary/60 hover:text-primary hover:bg-dark'}`}
          >
            Reservations
          </button>
          <button 
            onClick={() => { setActiveTab('upcoming'); setAllocatingRes(null); setAllocationStep('none'); }}
            className={`text-left px-4 py-3 text-sm tracking-widest uppercase transition-colors shrink-0 flex items-center gap-2 ${activeTab === 'upcoming' ? 'bg-primary/10 text-primary border-l-2 border-primary' : 'text-secondary/60 hover:text-primary hover:bg-dark'}`}
          >
            Upcoming
          </button>
          <button 
            onClick={() => setActiveTab('tables')}
            className={`text-left px-4 py-3 text-sm tracking-widest uppercase transition-colors shrink-0 flex items-center gap-2 ${activeTab === 'tables' ? 'bg-primary/10 text-primary border-l-2 border-primary' : 'text-secondary/60 hover:text-primary hover:bg-dark'}`}
          >
            Table Layout
          </button>
          <button 
            onClick={() => setActiveTab('settings')}
            className={`text-left px-4 py-3 text-sm tracking-widest uppercase transition-colors shrink-0 flex items-center gap-2 ${activeTab === 'settings' ? 'bg-primary/10 text-primary border-l-2 border-primary' : 'text-secondary/60 hover:text-primary hover:bg-dark'}`}
          >
            <Settings size={14} /> Settings
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 w-full min-w-0">
          
          {activeTab === 'reservations' && (
            <div className="space-y-6">
              <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 border-b border-primary/20 pb-4">
                <h2 className="text-2xl font-serif">Reservations</h2>
               <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
                 <div className="flex gap-2">
                    {['All', 'Pending', 'Confirmed', 'Cancelled'].map(f => (
                      <button
                        key={f}
                        onClick={() => setStatusFilter(f as any)}
                        className={`px-3 py-1 text-xs uppercase tracking-wider rounded-sm transition-colors ${statusFilter === f ? 'bg-primary text-darker font-bold' : 'bg-dark border border-primary/30 text-primary/70 hover:bg-primary/10'}`}
                      >
                        {f}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                {fetchError && (
                  <div className="bg-red-500/20 border border-red-500 text-red-400 p-4 rounded-sm">
                    Error loading database: {fetchError}
                  </div>
                )}
                {filteredReservations.length === 0 && !fetchError ? (
                  <p className="text-secondary/50 font-light mt-8">No reservations found.</p>
                ) : (
                  filteredReservations.map(res => (
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      key={res.id} 
                      className="bg-dark p-4 md:p-6 border border-primary/20 flex flex-col md:flex-row justify-between gap-6 relative"
                    >
                      <div className={`absolute left-0 top-0 bottom-0 w-1 ${res.status === 'Pending' ? 'bg-yellow-500' : res.status === 'Confirmed' ? 'bg-green-500' : 'bg-red-500'}`}></div>
                      
                      <div className="pl-3 flex-1 space-y-2">
                        <div className="flex items-center gap-3">
                          <h3 className="text-xl font-medium text-white">{res.name}</h3>
                          <span className={`text-[10px] uppercase tracking-widest px-2 py-0.5 rounded-sm font-bold ${
                            res.status === 'Pending' ? 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30' : 
                            res.status === 'Confirmed' ? 'bg-green-500/20 text-green-400 border border-green-500/30' : 
                            'bg-red-500/20 text-red-400 border border-red-500/30'
                          }`}>
                            {res.status}
                          </span>
                        </div>
                        
                        <div className="grid grid-cols-2 lg:flex lg:gap-8 text-sm text-secondary/70">
                          <div className="flex items-center gap-1.5"><Phone size={14} className="text-primary" /> {res.phone}</div>
                          <div className="flex items-center gap-1.5"><User size={14} className="text-primary" /> {res.guests} Guests</div>
                          <div className="flex items-center gap-1.5 col-span-2 lg:col-span-1"><Clock size={14} className="text-primary" /> {new Date(res.datetime).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}</div>
                        </div>
                         {res.tableNo && (
                          <div className="text-sm text-primary font-medium mt-1">Assigned Table: {res.tableNo}</div>
                        )}
                      </div>

                      {res.status === 'Pending' && (
                        <div className="flex flex-row md:flex-col gap-2 shrink-0 border-t border-primary/20 md:border-t-0 pt-4 md:pt-0">
                          <button 
                            onClick={() => initAllocation(res)}
                            className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-primary/20 text-primary border border-primary/30 px-4 py-2 text-sm hover:bg-primary/30 transition-colors uppercase tracking-widest text-[10px] font-bold"
                          >
                            <CheckCircle2 size={16} /> Allocate a Table
                          </button>
                          <button 
                            onClick={() => setSelectedResReject(res)}
                            className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-dark/50 text-red-400 border border-red-500/30 px-4 py-2 text-sm hover:bg-red-900/40 transition-colors uppercase tracking-widest text-[10px]"
                          >
                            <XCircle size={16} /> Reject
                          </button>
                        </div>
                      )}
                    </motion.div>
                  ))
                )}
              </div>
            </div>
          )}

          {activeTab === 'upcoming' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-primary/20 pb-4">
                <h2 className="text-2xl font-serif">Upcoming Reservations</h2>
                <div className="flex items-center gap-2">
                  <Calendar size={16} className="text-primary" />
                  <input 
                    type="date" 
                    value={upcomingDateFilter}
                    onChange={(e) => setUpcomingDateFilter(e.target.value)}
                    className="bg-dark border border-primary/30 p-2 text-sm text-secondary focus:outline-none focus:border-primary [color-scheme:dark]"
                  />
                  {upcomingDateFilter && (
                    <button onClick={() => setUpcomingDateFilter('')} className="text-xs text-red-400 hover:text-red-300 uppercase tracking-widest px-2">Clear</button>
                  )}
                </div>
              </div>

              <div className="space-y-4">
                {(() => {
                  const upcomingFiltered = reservations.filter(r => {
                    if (r.status !== 'Confirmed') return false;
                    if (upcomingDateFilter) {
                      return r.datetime.startsWith(upcomingDateFilter);
                    }
                    return true;
                  }).sort((a, b) => new Date(a.datetime).getTime() - new Date(b.datetime).getTime());

                  if (upcomingFiltered.length === 0) {
                     return <p className="text-secondary/50 font-light mt-8">No upcoming reservations found strictly for the selected date.</p>;
                  }

                  return upcomingFiltered.map(res => {
                    const resTime = new Date(res.datetime).getTime();
                    const now = Date.now();
                    const isWithin30MinsBefore = resTime > now && (resTime - now) <= 30 * 60 * 1000;

                    return (
                      <motion.div 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        key={res.id} 
                        className={`bg-dark p-4 md:p-6 border border-primary/20 flex flex-col md:flex-row justify-between gap-6 relative ${openMenuId === res.id ? 'z-50' : 'z-10'}`}
                      >
                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-green-500"></div>
                        
                        <div className="pl-3 flex-1 space-y-2">
                          <div className="flex items-center gap-3">
                            <h3 className="text-xl font-medium text-white">{res.name}</h3>
                            <span className="text-[10px] uppercase tracking-widest px-2 py-0.5 rounded-sm font-bold bg-green-500/20 text-green-400 border border-green-500/30">
                              Confirmed
                            </span>
                          </div>
                          
                          <div className="grid grid-cols-2 lg:flex lg:gap-8 text-sm text-secondary/70">
                            <div className="flex items-center gap-1.5"><Phone size={14} className="text-primary" /> {res.phone}</div>
                            <div className="flex items-center gap-1.5"><User size={14} className="text-primary" /> {res.guests} Guests</div>
                            <div className="flex items-center gap-1.5 col-span-2 lg:col-span-1"><Clock size={14} className="text-primary" /> {new Date(res.datetime).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}</div>
                          </div>
                          {res.tableNo && (
                            <div className="text-sm text-primary font-medium mt-1">Assigned Table: {res.tableNo}</div>
                          )}
                        </div>

                        <div className="flex flex-col items-end gap-2 shrink-0 border-t border-primary/20 md:border-t-0 pt-4 md:pt-0">
                          <div className="flex gap-2">
                            {isWithin30MinsBefore && (
                              <button 
                                onClick={() => handleNotifyWhatsApp(res)}
                                className="flex items-center justify-center gap-2 bg-[#25D366]/20 text-[#25D366] border border-[#25D366]/30 px-3 py-1.5 text-xs hover:bg-[#25D366]/30 transition-colors uppercase tracking-widest font-bold rounded-sm"
                                title="Notify customer on WhatsApp"
                              >
                                <MessageSquare size={14} /> Notify
                              </button>
                            )}
                            <div className="relative three-dots-menu flex items-center">
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setOpenMenuId(openMenuId === res.id ? null : res.id);
                                }}
                                className="group flex items-center justify-center p-1.5 text-secondary/50 hover:text-white hover:bg-white/10 transition-colors rounded-sm"
                                title="More Options"
                              >
                                <MoreVertical size={18} />
                              </button>
                              
                              <AnimatePresence>
                                {openMenuId === res.id && (
                                  <motion.div 
                                    initial={{ opacity: 0, scale: 0.95, y: -10 }}
                                    animate={{ opacity: 1, scale: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.95, y: -10 }}
                                    className="absolute right-0 top-full mt-2 w-32 bg-darker border border-primary/20 shadow-xl z-20 rounded-sm overflow-hidden"
                                  >
                                    <button 
                                      onClick={() => handleUnreserve(res)}
                                      className="w-full text-left px-4 py-2 text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors"
                                    >
                                      Unreserve
                                    </button>
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    );
                  });
                })()}
              </div>
            </div>
          )}

          {activeTab === 'tables' && (
            <div className="border border-primary/20 bg-dark p-6 rounded-sm relative">
              
              {allocatingRes && (
                 <div className="mb-6 bg-primary/10 border border-primary/30 p-4 rounded flex flex-col md:flex-row justify-between items-center gap-4">
                    <div>
                        <p className="text-primary font-serif text-lg">Allocating Table for {allocatingRes.name}</p>
                        <p className="text-secondary/70 text-sm">{allocatingRes.guests} Guests • {new Date(allocatingRes.datetime).toLocaleString('en-IN')}</p>
                    </div>
                    <button 
                      onClick={cancelAllocationProcess}
                      className="text-xs uppercase tracking-widest border border-primary/20 text-primary hover:bg-primary/10 px-4 py-2"
                    >
                      Cancel Allocation
                    </button>
                 </div>
              )}

              <h2 className="text-xl font-serif mb-6 border-b border-primary/20 pb-4">Table Overview</h2>
              
              <div className="flex gap-6 text-sm mb-12 text-secondary/70 justify-center">
                <div className="flex items-center gap-2"><span className="w-4 h-4 rounded-full bg-primary shadow shadow-primary/50"></span> Available</div>
                <div className="flex items-center gap-2"><span className="w-4 h-4 rounded-full bg-red-600 shadow shadow-red-600/50"></span> Reserved</div>
              </div>

              {/* Flex Layout for tables: 2 columns, exactly like image */}
              <div className="grid grid-cols-2 gap-x-8 gap-y-12 py-4 max-w-2xl mx-auto px-4 justify-items-center">
                 
                 {/* Left Column - 3 Simple Tables */}
                 <div className="flex flex-col gap-10 items-center">
                     {TABLES.filter(t => t.position === 'left').map(renderTableVisual)}
                 </div>

                 {/* Right Column - 2 Sofa Tables, 1 Simple Table */}
                 <div className="flex flex-col gap-8 items-center pl-6">
                     {TABLES.filter(t => t.position === 'right').map(renderTableVisual)}
                 </div>

              </div>

            </div>
          )}

          {activeTab === 'settings' && (
            <div className="space-y-6 max-w-xl">
               <h2 className="text-2xl font-serif border-b border-primary/20 pb-4">Core Settings</h2>
               
               <div className="bg-dark p-6 border border-primary/20 space-y-6">
                 <div className="flex items-center gap-3 border-b border-primary/10 pb-4">
                    <KeyRound className="text-primary" />
                    <h3 className="text-lg text-secondary">Change Admin PIN</h3>
                 </div>
                 
                 <form onSubmit={handleChangePin} className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-xs uppercase tracking-widest text-secondary/60">Previous PIN</label>
                      <input 
                        type="password"
                        required
                        value={oldPinInput}
                        onChange={(e) => setOldPinInput(e.target.value)}
                        className="w-full bg-darker border border-secondary/20 p-3 text-secondary focus:outline-none focus:border-primary transition-colors tracking-widest"
                      />
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-xs uppercase tracking-widest text-secondary/60">New PIN</label>
                        <input 
                          type="password"
                          required
                          value={newPinInput}
                          onChange={(e) => setNewPinInput(e.target.value)}
                          className="w-full bg-darker border border-secondary/20 p-3 text-secondary focus:outline-none focus:border-primary transition-colors tracking-widest"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs uppercase tracking-widest text-secondary/60">Confirm New PIN</label>
                        <input 
                          type="password"
                          required
                          value={confirmPinInput}
                          onChange={(e) => setConfirmPinInput(e.target.value)}
                          className="w-full bg-darker border border-secondary/20 p-3 text-secondary focus:outline-none focus:border-primary transition-colors tracking-widest"
                        />
                      </div>
                    </div>
                    
                    {pinChangeMessage && (
                      <p className={`text-sm ${pinChangeMessage.startsWith('Error') ? 'text-red-400' : 'text-green-400'}`}>
                        {pinChangeMessage}
                      </p>
                    )}
                    
                    <button type="submit" className="bg-primary/20 border border-primary/30 text-primary py-3 px-6 uppercase tracking-widest text-sm hover:bg-primary/30 transition-colors">
                       Update PIN
                    </button>
                 </form>
               </div>
            </div>
          )}
        </div>
      </main>

      <AnimatePresence>
        {viewTableDetailsId && (
          <motion.div 
            initial={{ opacity: 0, backdropFilter: 'blur(0px)' }}
            animate={{ opacity: 1, backdropFilter: 'blur(8px)' }}
            exit={{ opacity: 0, backdropFilter: 'blur(0px)' }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4"
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="bg-[#111] border border-primary/20 p-6 md:p-8 max-w-2xl w-full shadow-2xl relative"
            >
              <div className="flex justify-between items-center mb-8 border-b border-primary/10 pb-4">
                <h3 className="text-3xl font-serif text-white flex items-center gap-3">
                  {TABLES.find(t=>t.id===viewTableDetailsId)?.name} 
                  <span className="text-xs font-sans tracking-widest text-primary uppercase border border-primary/30 bg-primary/5 px-3 py-1 rounded-full">
                    Reservations
                  </span>
                </h3>
                <button onClick={() => setViewTableDetailsId(null)} className="text-secondary/40 hover:text-white transition-colors"><XCircle size={28} /></button>
              </div>
              
              <div className="max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
                {(() => {
                  const tableReservations = reservations
                    .filter(r => r.tableNo === viewTableDetailsId && r.status === 'Confirmed')
                    .sort((a, b) => new Date(a.datetime).getTime() - new Date(b.datetime).getTime());
                  
                  if (tableReservations.length === 0) {
                    return (
                      <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="text-secondary/40 text-center py-16 flex flex-col items-center gap-4"
                      >
                        <Calendar size={48} className="opacity-20" />
                        <p className="italic text-lg">No confirmed reservations for this table.</p>
                      </motion.div>
                    );
                  }

                  return (
                    <div className="w-full text-left">
                      <div className="grid grid-cols-12 gap-4 pb-3 border-b border-primary/10 text-xs uppercase tracking-widest text-secondary/50 font-semibold mb-4 mx-2">
                        <div className="col-span-4">Guest</div>
                        <div className="col-span-3">Time & Date</div>
                        <div className="col-span-2">Size</div>
                        <div className="col-span-3 text-right">Contact</div>
                      </div>
                      <div className="space-y-3">
                        {tableReservations.map((res, index) => (
                          <motion.div 
                            key={res.id} 
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.1, ease: "easeOut" }}
                            className="grid grid-cols-12 gap-4 items-center bg-[#1a1a1a] hover:bg-[#222] transition-colors p-4 rounded-sm border border-secondary/5 group"
                          >
                            <div className="col-span-4 flex flex-col">
                              <span className="font-serif text-lg text-white group-hover:text-primary transition-colors">{res.name}</span>
                            </div>
                            <div className="col-span-3 flex flex-col gap-1">
                              <span className="text-sm text-primary font-bold tracking-wider">
                                {new Date(res.datetime).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true })}
                              </span>
                              <span className="text-xs text-secondary/60">
                                {new Date(res.datetime).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}
                              </span>
                            </div>
                            <div className="col-span-2 flex items-center gap-2 text-sm text-secondary/80">
                              <User size={14} className="text-secondary/40" /> {res.guests}
                            </div>
                            <div className="col-span-3 flex items-center justify-end gap-2 text-sm text-secondary/80 font-mono text-right">
                              {res.phone} <Phone size={12} className="text-secondary/30" />
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    </div>
                  );
                })()}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Pop-up: Confirm table or Change */}
      <AnimatePresence>
        {allocationStep === 'confirm_selection' && pendingTableSelection && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm px-4"
          >
            <div className="bg-dark border border-primary/40 p-6 md:p-8 max-w-sm w-full shadow-2xl relative text-center">
              <h3 className="text-xl font-serif text-primary mb-6">Confirm {TABLES.find(t=>t.id===pendingTableSelection)?.name}?</h3>
              <div className="flex gap-3">
                <button 
                  onClick={goBackToSelection}
                  className="flex-1 py-3 border border-secondary/30 text-secondary hover:bg-secondary/10 transition-colors uppercase text-xs tracking-widest"
                >
                  Change
                </button>
                <button 
                  onClick={proceedToFinalDetails}
                  className="flex-1 py-3 bg-primary text-darker font-medium hover:bg-primary/90 transition-colors uppercase text-xs tracking-widest"
                >
                  Confirm Table
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Pop-up: Final Details & Confirm Booking */}
      <AnimatePresence>
        {allocationStep === 'final_details' && allocatingRes && pendingTableSelection && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm px-4"
          >
            <div className="bg-dark border border-primary/40 p-6 md:p-8 max-w-md w-full shadow-2xl relative">
              <h3 className="text-2xl font-serif text-primary mb-6">Final Details</h3>
              
              <div className="space-y-4 mb-8 bg-darker p-4 border border-primary/10">
                 <div className="flex justify-between border-b border-primary/10 pb-2">
                    <span className="text-secondary/60 text-sm">Guest Name</span>
                    <span className="text-secondary font-medium">{allocatingRes.name}</span>
                 </div>
                 <div className="flex justify-between border-b border-primary/10 pb-2">
                    <span className="text-secondary/60 text-sm">Phone</span>
                    <span className="text-secondary font-medium">{allocatingRes.phone}</span>
                 </div>
                 <div className="flex justify-between border-b border-primary/10 pb-2">
                    <span className="text-secondary/60 text-sm">Date & Time</span>
                    <span className="text-secondary font-medium">{new Date(allocatingRes.datetime).toLocaleString('en-IN', {dateStyle:'short', timeStyle:'short'})}</span>
                 </div>
                 <div className="flex justify-between border-b border-primary/10 pb-2">
                    <span className="text-secondary/60 text-sm">Guests Count</span>
                    <span className="text-secondary font-medium">{allocatingRes.guests}</span>
                 </div>
                 <div className="flex justify-between pt-1">
                    <span className="text-secondary/60 text-sm font-bold">Assigned Table</span>
                    <span className="text-primary font-bold">{TABLES.find(t=>t.id===pendingTableSelection)?.name}</span>
                 </div>
              </div>

              <div className="flex gap-3">
                <button 
                  onClick={goBackToSelection}
                  className="w-1/3 py-3 border border-secondary/30 text-secondary hover:bg-secondary/10 transition-colors uppercase text-xs tracking-widest flex items-center justify-center gap-2"
                >
                  <Edit3 size={14} /> Edit
                </button>
                <button 
                  onClick={handleConfirmBookingFinal}
                  className="w-2/3 py-3 bg-primary text-darker font-medium hover:bg-primary/90 transition-colors uppercase text-xs tracking-widest flex items-center justify-center gap-2"
                >
                  <CheckCircle2 size={16} /> Confirm Booking
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Reject Reservation Modal */}
      <AnimatePresence>
        {selectedResReject && (
          <motion.div 
             initial={{ opacity: 0 }}
             animate={{ opacity: 1 }}
             exit={{ opacity: 0 }}
             className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm px-4"
          >
             <div className="bg-dark border border-red-500/40 p-6 md:p-8 max-w-md w-full shadow-2xl relative">
                <h3 className="text-2xl font-serif text-red-400 mb-2">Reject Reservation</h3>
                <p className="text-sm text-secondary/70 mb-6 border-b border-primary/20 pb-4">
                  Are you sure you want to cancel the request from <strong>{selectedResReject.name}</strong>?
                </p>
                <div className="space-y-4 mb-6">
                  <div>
                    <label className="text-xs uppercase tracking-widest text-secondary/60 mb-2 block">Reason (Optional)</label>
                    <textarea 
                      value={rejectReason}
                      onChange={(e) => setRejectReason(e.target.value)}
                      placeholder="e.g., We are fully booked at this time."
                      className="w-full bg-darker border border-primary/30 p-3 text-secondary focus:outline-none focus:border-red-400 min-h-[100px]"
                    />
                  </div>
                </div>
                <div className="flex gap-3 mt-8">
                  <button 
                    onClick={() => setSelectedResReject(null)}
                    className="flex-1 py-3 border border-secondary/30 text-secondary hover:bg-secondary/10 transition-colors uppercase text-xs tracking-widest"
                  >
                    Go Back
                  </button>
                  <button 
                    onClick={handleReject}
                    className="flex-1 py-3 bg-red-900/80 text-red-100 hover:bg-red-800 border border-red-500/50 transition-colors uppercase text-xs tracking-widest"
                  >
                    Reject & Notify
                  </button>
                </div>
             </div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Link, useNavigate } from 'react-router-dom';
import { ChevronLeft, Home, CheckCircle2, XCircle, Clock, Filter, Phone, User, Calendar, MessageSquare, LogOut, Settings, Edit3, KeyRound, MoreVertical, Plus, X, Menu, Download } from 'lucide-react';
import { ReservationData } from './types';
import { auth, db, handleFirestoreError, OperationType } from '../firebase';
import { signInWithEmailAndPassword, signOut, onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { collection, query, orderBy, onSnapshot, doc, updateDoc, setDoc, deleteDoc } from 'firebase/firestore';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

// 3 simple tables on left, 2 sofa right, 1 simple right
const TABLES = [
  { id: 'T1', name: 'Table 1', capacity: 4, min: 2, type: 'simple', position: 'left' },
  { id: 'T2', name: 'Table 2', capacity: 4, min: 2, type: 'simple', position: 'left' },
  { id: 'T3', name: 'Table 3', capacity: 4, min: 2, type: 'simple', position: 'left' },
  { id: 'T4', name: 'Table 4', capacity: 4, min: 2, type: 'simple', position: 'left' },
  { id: 'T5', name: 'Table 5', capacity: 4, min: 2, type: 'simple', position: 'right' },
  { id: 'T6', name: 'Table 6', capacity: 4, min: 2, type: 'simple', position: 'right' },
  { id: 'S1', name: 'Sofa 1', capacity: 6, min: 5, type: 'sofa', position: 'right' },
  { id: 'S2', name: 'Sofa 2', capacity: 6, min: 5, type: 'sofa', position: 'right' },
];

export default function Admin() {
  const navigate = useNavigate();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [username, setUsername] = useState('');
  const [pin, setPin] = useState('');
  const [loginError, setLoginError] = useState('');
  const [fetchError, setFetchError] = useState('');

  const prevResCountRef = useRef(0);

  const playTing = () => {
    try {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioContext();
      
      const playNote = (freq: number, startTime: number, duration: number) => {
          const osc = ctx.createOscillator();
          const gainNode = ctx.createGain();
          osc.connect(gainNode);
          gainNode.connect(ctx.destination);
          
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, startTime);
          
          gainNode.gain.setValueAtTime(0, startTime);
          gainNode.gain.linearRampToValueAtTime(0.3, startTime + 0.05);
          gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + duration);
          
          osc.start(startTime);
          osc.stop(startTime + duration);
      };

      const now = ctx.currentTime;
      playNote(880, now, 0.4); // A5
      playNote(1108.73, now + 0.15, 0.6); // C#6

      const el = document.createElement('div');
      el.innerText = 'New Reservation Arrived';
      el.className = 'fixed top-6 left-1/2 -translate-x-1/2 bg-primary text-black px-8 py-3 rounded-md uppercase tracking-widest font-normal z-[1000] shadow-2xl transition-all';
      document.body.appendChild(el);
      setTimeout(() => el.remove(), 4000);
    } catch (e) {
      // ignore
    }
  };

  const [currentAdminPin, setCurrentAdminPin] = useState(() => localStorage.getItem('adminPin') || '4567');

  const [reservations, setReservations] = useState<ReservationData[]>([]);
  const [activeTab, setActiveTab] = useState<'reservations' | 'upcoming' | 'tables' | 'settings' | 'reached' | 'export'>('reservations');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'All' | 'Pending' | 'Confirmed' | 'Cancelled' | 'Reached' | 'Didnt Reached' | 'Completed'>('All');
  const [upcomingDateFilter, setUpcomingDateFilter] = useState(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });
  
  // PIN Change State
  const [oldPinInput, setOldPinInput] = useState('');
  const [newPinInput, setNewPinInput] = useState('');
  const [confirmPinInput, setConfirmPinInput] = useState('');
  const [pinChangeMessage, setPinChangeMessage] = useState('');
  const [showPinModal, setShowPinModal] = useState(false);
  const [showPinConfirm, setShowPinConfirm] = useState(false);
  
  // Clear Reservations State
  const [showClearModal, setShowClearModal] = useState(false);
  const [clearType, setClearType] = useState<'All Reservations' | 'Upcoming' | 'Reached' | 'History' | null>(null);
  
  // Rejection modal
  const [selectedResReject, setSelectedResReject] = useState<ReservationData | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  // Allocation Wizard State
  const [allocatingRes, setAllocatingRes] = useState<ReservationData | null>(null);
  const [suggestTimeRes, setSuggestTimeRes] = useState<ReservationData | null>(null);
  const [suggestDatetime, setSuggestDatetime] = useState('');
  // steps: undefined -> popup asking to confirm -> final details
  const [allocationStep, setAllocationStep] = useState<'none' | 'confirm_selection' | 'final_details'>('none');
  const [pendingTableSelection, setPendingTableSelection] = useState<string>('');
  
  // View Table state
  const [viewTableDetailsId, setViewTableDetailsId] = useState<string | null>(null);

  // Export Modal State
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportFilterType, setExportFilterType] = useState<'All' | 'Upcoming' | 'Reached' | null>(null);

  const [showAddModal, setShowAddModal] = useState(false);
  const [manualRes, setManualRes] = useState({ name: '', phone: '', guests: 1, datetime: '' });

  const handleAddManualReservation = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const newRef = doc(collection(db, 'reservations'));
      await setDoc(newRef, {
        id: newRef.id,
        name: manualRes.name,
        phone: manualRes.phone,
        guests: manualRes.guests.toString(),
        datetime: manualRes.datetime,
        status: 'Pending',
        createdAt: new Date().toISOString()
      });
      setManualRes({ name: '', phone: '', guests: 1, datetime: '' });
      setShowAddModal(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'reservations');
    }
  };

  useEffect(() => {
    // Trap the physical back button to keep user in admin dashboard when authenticated
    if (isAuthenticated) {
      window.history.pushState(null, '', window.location.href);
      const handlePopState = () => {
        window.history.pushState(null, '', window.location.href);
        // We can close modals to simulate back button
        setAllocationStep('none');
        setSelectedResReject(null);
        setViewTableDetailsId(null);
      };
      window.addEventListener('popstate', handlePopState);
      return () => window.removeEventListener('popstate', handlePopState);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    // Check if previously logged in
    if (sessionStorage.getItem('adminAuth') === 'true') {
      setIsAuthenticated(true);
    }

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
      
      if (prevResCountRef.current > 0 && data.length > prevResCountRef.current) {
        playTing();
      }
      prevResCountRef.current = data.length;

      setReservations(data);
      setFetchError('');
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'reservations');
      setFetchError(error.message);
    });

    return () => unsubscribe();
  }, []);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (username === 'lodhibhawan7' && pin === currentAdminPin) {
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
    navigate('/');
  };

  const updateReservationStatus = async (id: string, updates: Partial<ReservationData>) => {
    try {
      await updateDoc(doc(db, 'reservations', id), updates);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `reservations/${id}`);
      alert("Failed to update reservation status.");
    }
  };

  const handlePaymentDone = async (res: ReservationData) => {
    await updateReservationStatus(res.id, {
      status: 'Completed',
      paymentDoneAt: new Date().toISOString()
    });
  };

  const handleDownloadData = (filterType: 'All' | 'Upcoming' | 'Reached') => {
    setExportFilterType(filterType);
    setShowExportModal(true);
  };

  const executeExport = (format: 'pdf' | 'excel') => {
    if (!exportFilterType) return;
    
    let filteredRes = [...reservations];
    
    if (exportFilterType === 'Upcoming') {
      filteredRes = reservations.filter(r => r.status === 'Confirmed' && !r.tableNo);
    } else if (exportFilterType === 'Reached') {
      filteredRes = reservations.filter(r => r.status === 'Reached' || (r.status === 'Confirmed' && r.tableNo));
    }

    // Sort reservations by date descending for the report
    const sortedRes = filteredRes.sort((a, b) => new Date(b.datetime).getTime() - new Date(a.datetime).getTime());
    
    const tableColumn = ["Date & Time", "Name", "Phone", "Guests", "Table No", "Status"];
    const tableRows: any[] = [];

    sortedRes.forEach(res => {
      const resDate = new Date(res.datetime).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
      const resData = [
        resDate,
        res.name,
        res.phone,
        res.guests,
        res.tableNo || '-',
        res.status
      ];
      tableRows.push(resData);
    });

    const dateStr = new Date().toISOString().split('T')[0];
    const fileNameBase = `Lodhi_Bhawan_${exportFilterType}_Reservations_${dateStr}`;

    if (format === 'pdf') {
      const doc = new jsPDF();
      doc.text(`Lodhi Bhawan - ${exportFilterType} Reservations Data`, 14, 20);
      
      autoTable(doc, {
        head: [tableColumn],
        body: tableRows,
        startY: 30,
        theme: 'grid',
        styles: { fontSize: 8 },
        headStyles: { fillColor: [40, 40, 40] }
      });

      doc.save(`${fileNameBase}.pdf`);
    } else if (format === 'excel') {
      // Create worksheet
      const wsData = [tableColumn, ...tableRows];
      const ws = XLSX.utils.aoa_to_sheet(wsData);
      
      // Auto-size columns slightly
      const wscols = [
        {wch: 25}, // Date & Time
        {wch: 20}, // Name
        {wch: 15}, // Phone
        {wch: 10}, // Guests
        {wch: 10}, // Table No
        {wch: 20}  // Status
      ];
      ws['!cols'] = wscols;

      // Create workbook
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Reservations");

      // Save file
      XLSX.writeFile(wb, `${fileNameBase}.xlsx`);
    }
    
    setShowExportModal(false);
    setExportFilterType(null);
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

    // Check availability (30 mins window before and after)
    const allocatingTime = new Date(allocatingRes.datetime).getTime();
    const isReserved = reservations.some(r => {
      if (!r.tableNo?.split(',').map(s=>s.trim()).includes(tableId) || r.status !== 'Confirmed') return false;
      const existingTime = new Date(r.datetime).getTime();
      return Math.abs(existingTime - allocatingTime) <= 30 * 60 * 1000;
    });

    if (isReserved) {
      alert("This table is already reserved within 30 minutes of this time before or after.");
      return;
    }

    // Toggle logic for multiple table selection
    let currentSelection = pendingTableSelection ? pendingTableSelection.split(',').map(s=>s.trim()).filter(Boolean) : [];
    if (currentSelection.includes(tableId)) {
      currentSelection = currentSelection.filter(id => id !== tableId);
    } else {
      currentSelection.push(tableId);
    }
    setPendingTableSelection(currentSelection.join(', '));
  };

  const proceedToFinalDetails = () => {
    setAllocationStep('final_details');
  };

  const goBackToSelection = () => {
    setAllocationStep('none');
    setPendingTableSelection('');
  };

  const handleConfirmBookingFinal = async () => {
    if (!allocatingRes || !pendingTableSelection) return;

    updateReservationStatus(allocatingRes.id, { 
      status: 'Confirmed', 
      tableNo: pendingTableSelection 
    });
    
    // Notifications are handled via Firestore UI listener
    
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

  const handleReject = async () => {
    if (!selectedResReject) return;

    updateReservationStatus(selectedResReject.id, { 
      status: 'Cancelled',
      rejectReason: rejectReason
    });

    setSelectedResReject(null);
    setRejectReason('');
  };

  const handlePinSubmit = (e: React.FormEvent) => {
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
    setShowPinConfirm(true);
  };

  const confirmPinChange = () => {
    localStorage.setItem('adminPin', newPinInput);
    setCurrentAdminPin(newPinInput);
    setPinChangeMessage('Success: PIN has been changed!');
    setOldPinInput('');
    setNewPinInput('');
    setConfirmPinInput('');
    setShowPinConfirm(false);
    setTimeout(() => {
      setShowPinModal(false);
      setPinChangeMessage('');
    }, 1500);
  };

  const handleClearConfirm = async () => {
    try {
      if (clearType === 'All Reservations') {
        reservations.forEach(async (r) => {
          await deleteDoc(doc(db, 'reservations', r.id));
        });
      } else if (clearType === 'Upcoming') {
        reservations.filter(r => r.status === 'Confirmed' && !r.tableNo).forEach(async (r) => {
          await deleteDoc(doc(db, 'reservations', r.id));
        });
      } else if (clearType === 'Reached') {
        reservations.filter(r => r.status === 'Reached' || (r.status === 'Confirmed' && r.tableNo)).forEach(async (r) => {
          await deleteDoc(doc(db, 'reservations', r.id));
        });
      } else if (clearType === 'History') {
        reservations.filter(r => r.status === 'Completed' || r.status === 'Cancelled' || r.status === 'DidntReach').forEach(async (r) => {
          await deleteDoc(doc(db, 'reservations', r.id));
        });
      }
      setShowClearModal(false);
      setClearType(null);
    } catch(e) {
      alert('Failed to clear reservations');
    }
  };

  const filteredReservations = reservations.filter(r => {
    const matchesStatus = statusFilter === 'All' ? true : r.status === statusFilter;
    return matchesStatus;
  });

  const getTableStatus = (tableId: string): string => {
    let checkTime = Date.now();
    
    if (allocatingRes) {
      checkTime = new Date(allocatingRes.datetime).getTime();
    }

    const blockingRes = reservations.find(r => {
      if (!r.tableNo?.split(',').map(s=>s.trim()).includes(tableId)) return false;
      if (!['Confirmed', 'Reached'].includes(r.status)) return false;
      const existingTime = new Date(r.datetime).getTime();
      
      // If no allocatingRes, we are viewing current table status in real time
      if (!allocatingRes) {
        // If reservation time has passed by more than 30 minutes, it's considered empty
        if (checkTime - existingTime > 30 * 60 * 1000) return false;
        
        // Show as upcoming if it's arriving soon (within next 2 hours or currently going on)
        return Math.abs(existingTime - checkTime) <= 2 * 60 * 60 * 1000;
      } else {
        // If allocating, prevent allocation 30 mins before or after
        return Math.abs(existingTime - checkTime) <= 30 * 60 * 1000;
      }
    });

    if (blockingRes) return blockingRes.status;
    return 'Available';
  };

  // Render a specific table type visually
  const renderTableVisual = (table: any) => {
    const status = getTableStatus(table.id);
    const isAvailable = status === 'Available';
    
    const isSelected = pendingTableSelection ? pendingTableSelection.split(', ').includes(table.id) : false;
    let tableColor = 'bg-secondary/20 border-[#E6D7A3] shadow-[0_0_15px_rgba(230,215,163,0.1)]';
    let seatColor = 'bg-[#E6D7A3]';
    let textColor = 'text-[#E6D7A3]';

    let sofaBorderColor = 'border-[#E6D7A3]';
    // Upcoming -> Copper/Bronze (#CD7F32)
    if (status === 'Confirmed') {
      tableColor = 'bg-[#CD7F32]/20 border-[#CD7F32] shadow-[0_0_15px_rgba(205,127,50,0.2)]';
      seatColor = 'bg-[#CD7F32]';
      textColor = 'text-[#CD7F32]';
      sofaBorderColor = 'border-[#CD7F32]';
    // Reserved/Occupied -> Emerald Green (#50C878)
    } else if (status === 'Reached') {
      tableColor = 'bg-[#50C878]/20 border-[#50C878] shadow-[0_0_15px_rgba(80,200,120,0.2)]';
      seatColor = 'bg-[#50C878]';
      textColor = 'text-[#50C878]';
      sofaBorderColor = 'border-[#50C878]';
    }

    if (isSelected) {
      tableColor = 'bg-primary/40 border-primary shadow-[0_0_20px_rgba(var(--color-primary-rgb),0.5)]';
      seatColor = 'bg-primary';
      textColor = 'text-white';
      sofaBorderColor = 'border-primary';
    }

    // Is it greyed out due to capacity restrictions during allocation?
    let opacityClass = 'opacity-100 transition-opacity';

    if (table.type === 'simple') {
      return (
        <div 
          key={table.id}
          onClick={() => handleTableClick(table.id)}
          className={`flex flex-col items-center justify-center gap-1.5 cursor-pointer group p-1 ${opacityClass}`}
        >
          <div className="flex gap-3">
            <div className={`w-3.5 h-3.5 rounded-full ${seatColor} transition-transform group-hover:-translate-y-1`}></div>
            <div className={`w-3.5 h-3.5 rounded-full ${seatColor} transition-transform group-hover:-translate-y-1`}></div>
          </div>
          <div className={`w-16 h-16 rounded-md border-[3px] flex items-center justify-center transition-transform group-hover:scale-105 z-10 ${tableColor}`}>
            <span className={`font-normal tracking-wider text-xs ${textColor}`}>{table.name}</span>
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
             <span className={`font-normal tracking-wider text-xs ${textColor} whitespace-nowrap`}>{table.name}</span>
          </div>
          {/* Half-circle sofa background */}
          <div className={`absolute right-1/2 translate-x-[42px] top-1/2 -translate-y-1/2 w-[38px] h-[95px] rounded-r-full border-r-[12px] border-t-[12px] border-b-[12px] transition-all ${sofaBorderColor}`}></div>
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
            <h2 className="text-3xl font-serif text-secondary mb-1">Admin Portal</h2>
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
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="text-secondary/60 hover:text-primary transition-colors p-2"
            >
              <Menu size={24} />
            </button>
            
            <img src="/logo3.png" alt="Lodhi Bhawan" className="h-8 sepia-theme hidden md:block" />
            <span className="font-serif text-xl tracking-wide">Admin Dashboard</span>
          </div>
          <Link 
            to="/"
            title="Return to Website"
            className="text-secondary/60 hover:text-primary transition-colors p-2 rounded-sm flex items-center gap-1"
          >
            <Home size={20} />
          </Link>
        </div>
      </header>

      {/* Main Drawer Menu */}
      <AnimatePresence>
        {isSidebarOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsSidebarOpen(false)}
              className="fixed inset-0 bg-black/60 z-40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'tween', duration: 0.3 }}
              className="fixed inset-y-0 left-0 w-64 bg-dark border-r border-primary/20 shadow-2xl z-50 flex flex-col pt-6"
            >
              <div className="flex justify-between items-center px-6 pb-6 border-b border-primary/10">
                <span className="font-serif text-xl tracking-wide">Menu</span>
                <button
                  onClick={() => setIsSidebarOpen(false)}
                  className="text-secondary/60 hover:text-primary"
                >
                  <X size={20} />
                </button>
              </div>
              <div className="flex flex-col flex-1 overflow-y-auto py-4">
                <button 
                  onClick={() => { setActiveTab('reservations'); setAllocatingRes(null); setAllocationStep('none'); setIsSidebarOpen(false); }}
                  className={`text-left px-6 py-4 text-sm tracking-widest uppercase transition-colors shrink-0 flex items-center gap-3 ${activeTab === 'reservations' ? 'bg-primary/10 text-primary border-l-4 border-primary' : 'text-secondary/60 hover:text-primary hover:bg-darker'}`}
                >
                  Reservations
                </button>
                <button 
                  onClick={() => { setActiveTab('upcoming'); setAllocatingRes(null); setAllocationStep('none'); setIsSidebarOpen(false); }}
                  className={`text-left px-6 py-4 text-sm tracking-widest uppercase transition-colors shrink-0 flex items-center gap-3 ${activeTab === 'upcoming' ? 'bg-primary/10 text-primary border-l-4 border-primary' : 'text-secondary/60 hover:text-primary hover:bg-darker'}`}
                >
                  Upcoming
                </button>
                <button 
                  onClick={() => { setActiveTab('tables'); setIsSidebarOpen(false); }}
                  className={`text-left px-6 py-4 text-sm tracking-widest uppercase transition-colors shrink-0 flex items-center gap-3 ${activeTab === 'tables' ? 'bg-primary/10 text-primary border-l-4 border-primary' : 'text-secondary/60 hover:text-primary hover:bg-darker'}`}
                >
                  Table Layout
                </button>
                <button 
                  onClick={() => { setActiveTab('reached'); setAllocatingRes(null); setAllocationStep('none'); setIsSidebarOpen(false); }}
                  className={`text-left px-6 py-4 text-sm tracking-widest uppercase transition-colors shrink-0 flex items-center gap-3 ${activeTab === 'reached' ? 'bg-primary/10 text-primary border-l-4 border-primary' : 'text-secondary/60 hover:text-primary hover:bg-darker'}`}
                >
                  Reached
                </button>
                <button 
                  onClick={() => { setActiveTab('export'); setIsSidebarOpen(false); }}
                  className={`text-left px-6 py-4 text-sm tracking-widest uppercase transition-colors shrink-0 flex items-center gap-3 ${activeTab === 'export' ? 'bg-primary/10 text-primary border-l-4 border-primary' : 'text-secondary/60 hover:text-primary hover:bg-darker'}`}
                >
                  <Download size={16} /> Export Data
                </button>
                <button 
                  onClick={() => { setActiveTab('settings'); setIsSidebarOpen(false); }}
                  className={`text-left px-6 py-4 text-sm tracking-widest uppercase transition-colors shrink-0 flex items-center gap-3 ${activeTab === 'settings' ? 'bg-primary/10 text-primary border-l-4 border-primary' : 'text-secondary/60 hover:text-primary hover:bg-darker'}`}
                >
                  <Settings size={16} /> Settings
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <main className="container mx-auto px-6 py-8 flex flex-col gap-8">
        
        {/* Content Area */}
        <div className="flex-1 w-full min-w-0">
          
          {activeTab === 'reservations' && (
            <div className="space-y-6">
              <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 border-b border-primary/20 pb-4">
                <div className="flex items-center gap-4">
                  <h2 className="text-3xl font-serif">Reservations</h2>
                </div>
               <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
                 <div className="flex gap-2">
                    {['All', 'Pending', 'Confirmed', 'Reached', 'Cancelled', 'Completed'].map(f => {
                      const count = f === 'All' ? reservations.length : reservations.filter(r => r.status === f).length;
                      return (
                        <button
                          key={f}
                          onClick={() => setStatusFilter(f as any)}
                          className={`px-3 py-1 text-xs uppercase tracking-wider rounded-sm transition-colors ${statusFilter === f ? 'bg-primary text-darker font-normal' : 'bg-dark border border-primary/30 text-primary/70 hover:bg-primary/10'}`}
                        >
                          {f} ({count})
                        </button>
                      );
                    })}
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
                  filteredReservations.map(res => {
                    return (
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      key={res.id} 
                      className={`bg-dark border flex flex-col relative ${
                        res.status === 'Confirmed' ? 'border-[#8A9A5B]/50' : 
                        res.status === 'Completed' ? 'border-[#E6D7A3]/50' :
                        res.status === 'Cancelled' || res.status === 'DidntReach' ? 'border-[#E2725B]/50' : 
                        res.status === 'Reached' ? 'border-[#CD7F32]/50' :
                        res.status === 'SuggestedNewTime' ? 'border-[#FF9933]/50' :
                        'border-[#CCCCFF]/50'
                      }`}
                    >
                      <div className={`absolute left-0 top-0 bottom-0 w-1 ${
                        res.status === 'Confirmed' ? 'bg-[#8A9A5B]' : 
                        res.status === 'Completed' ? 'bg-[#E6D7A3]' :
                        res.status === 'Cancelled' || res.status === 'DidntReach' ? 'bg-[#E2725B]' : 
                        res.status === 'Reached' ? 'bg-[#CD7F32]' :
                        res.status === 'SuggestedNewTime' ? 'bg-[#FF9933]' :
                        'bg-[#CCCCFF]'
                      }`}></div>
                      
                      <div className="flex flex-col w-full pl-3 pr-4 py-2 gap-0.5">
                        <div className="flex justify-between items-center w-full">
                          <div className="flex flex-col items-start gap-1 w-full">
                            <div className="flex justify-between items-center w-full">
                              <span className="text-xl font-medium text-white whitespace-nowrap overflow-hidden text-ellipsis flex items-center">
                                {res.name} {res.guests && <span className="text-xs font-normal text-secondary/60 ml-2">({res.guests}p)</span>} <span className="text-xs text-secondary/60 font-mono ml-2">: {res.phone}</span>
                              </span>
                              <span className="text-xl text-secondary/80 whitespace-nowrap font-mono ml-4 font-medium">
                                {new Date(res.datetime).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                            <div className="flex justify-between items-center w-full mt-2 pt-2 border-t border-primary/10">
                              <span className={`text-[10px] uppercase tracking-[0.2em] px-2 py-0.5 rounded-sm font-bold border ${
                                res.status === 'Confirmed' ? 'bg-[#8A9A5B]/10 text-[#8A9A5B] border-[#8A9A5B]/20' : 
                                res.status === 'Completed' ? 'bg-[#E6D7A3]/10 text-[#E6D7A3] border-[#E6D7A3]/20' :
                                res.status === 'Cancelled' || res.status === 'DidntReach' ? 'bg-[#E2725B]/10 text-[#E2725B] border-[#E2725B]/20' :
                                res.status === 'Reached' ? 'bg-[#CD7F32]/10 text-[#CD7F32] border-[#CD7F32]/20' :
                                res.status === 'SuggestedNewTime' ? 'bg-[#F4C430]/10 text-[#F4C430] border-[#F4C430]/20' :
                                'bg-[#CCCCFF]/10 text-[#CCCCFF] border-[#CCCCFF]/20'
                              }`}>
                                {res.status === 'SuggestedNewTime' ? 'Suggested New Time' : res.status === 'DidntReach' ? "DIDN'T REACHED" : res.status}
                              </span>
                              <span className="text-xs text-secondary/50 whitespace-nowrap uppercase tracking-widest font-normal">
                                {new Date(res.datetime).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year:'numeric' })}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>

                       {res.status === 'Pending' && (
                        <div className="flex flex-row md:flex-row gap-2 shrink-0 border-t border-primary/10 p-2 bg-darker/50">
                          <button 
                            onClick={() => updateReservationStatus(res.id, { status: 'Confirmed' })}
                            className="flex-1 flex items-center justify-center gap-1.5 bg-primary/20 text-primary border border-primary/30 px-3 py-1.5 text-xs hover:bg-primary/30 transition-colors uppercase tracking-widest font-normal"
                          >
                            <CheckCircle2 size={14} /> Accept
                          </button>
                          <button 
                            onClick={() => setSelectedResReject(res)}
                            className="flex-1 flex items-center justify-center gap-1.5 bg-dark/50 text-red-400 border border-red-500/30 px-3 py-1.5 text-xs hover:bg-red-900/40 transition-colors uppercase tracking-widest"
                          >
                            <XCircle size={14} /> Reject
                          </button>
                        </div>
                      )}
                    </motion.div>
                    );
                  })
                )}
              </div>
              <button 
                onClick={() => setShowAddModal(true)}
                className="fixed bottom-6 right-6 flex items-center justify-center bg-primary text-darker w-14 h-14 rounded-full shadow-2xl hover:bg-white hover:scale-105 transition-all z-[999]"
              >
                <Plus size={24} />
              </button>
            </div>
          )}

          {activeTab === 'upcoming' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-primary/20 pb-4">
                <h2 className="text-3xl font-serif">Upcoming Reservations</h2>
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
                    const hideStatuses = ['Cancelled', 'Completed', 'Reached', 'DidntReach', 'Ongoing'];
                    if (hideStatuses.includes(r.status)) return false;
                    if (r.status === 'Confirmed' && !!r.tableNo) return false; // Moves to Reached section once table is allocated
                    // Upcoming shows Pending, Confirmed (without table), SuggestedNewTime
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
                    const diffTime = resTime - now;

                    let urgencyClass = 'bg-dark border-primary/20'; // default
                    let indicatorColor = res.status === 'Reached' ? 'bg-[#CD7F32]' : 
                                         res.status === 'Confirmed' ? 'bg-[#8A9A5B]' :
                                         res.status === 'SuggestedNewTime' ? 'bg-[#FF9933]' :
                                         res.status === 'Completed' ? 'bg-[#E6D7A3]' :
                                         res.status === 'Cancelled' || res.status === 'DidntReach' ? 'bg-[#E2725B]' :
                                         'bg-[#CCCCFF]';
                    let flagColor = res.status === 'Reached' ? 'bg-[#CD7F32]/10 text-[#CD7F32] border-[#CD7F32]/20' : 
                                    res.status === 'Confirmed' ? 'bg-[#8A9A5B]/10 text-[#8A9A5B] border-[#8A9A5B]/20' :
                                    res.status === 'SuggestedNewTime' ? 'bg-[#FF9933]/10 text-[#FF9933] border-[#FF9933]/20' :
                                    res.status === 'Completed' ? 'bg-[#E6D7A3]/10 text-[#E6D7A3] border-[#E6D7A3]/20' :
                                    res.status === 'Cancelled' || res.status === 'DidntReach' ? 'bg-[#E2725B]/10 text-[#E2725B] border-[#E2725B]/20' :
                                    'bg-[#CCCCFF]/10 text-[#CCCCFF] border-[#CCCCFF]/20';

                    if (diffTime <= 30 * 60 * 1000) {
                      urgencyClass = 'bg-amber-900/10 border-amber-500/30';
                    } else if (diffTime <= 60 * 60 * 1000) {
                       urgencyClass = 'bg-yellow-900/10 border-yellow-500/20';
                    }

                    return (
                      <motion.div 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        key={res.id} 
                        className={`bg-dark border flex flex-col relative flex-wrap ${ res.status === 'Confirmed' ? 'border-[#8A9A5B]/50' : res.status === 'Completed' ? 'border-[#E6D7A3]/50' : res.status === 'Cancelled' || res.status === 'DidntReach' ? 'border-[#E2725B]/50' : res.status === 'Reached' ? 'border-[#CD7F32]/50' : res.status === 'SuggestedNewTime' ? 'border-[#FF9933]/50' : 'border-[#CCCCFF]/50' } ${openMenuId === res.id ? 'z-50' : 'z-10'} ${urgencyClass}`}
                      >
                        <div className={`absolute left-0 top-0 bottom-0 w-1 ${indicatorColor}`}></div>
                        
                        <div className="flex flex-col w-full pl-3 pr-4 py-2 gap-0.5">
                          <div className="flex justify-between items-center w-full">
                            <div className="flex flex-col items-start gap-1 w-full">
                              <div className="flex justify-between items-center w-full">
                                <span className="text-xl font-medium text-white whitespace-nowrap overflow-hidden text-ellipsis flex items-center">
                                  {res.name} {res.guests && <span className="text-xs font-normal text-secondary/60 ml-2">({res.guests}p)</span>} <span className="text-xs text-secondary/60 font-mono ml-2">: {res.phone}</span>
                                </span>
                                <span className="text-xl text-secondary/80 whitespace-nowrap font-mono ml-4 font-medium">
                                  {new Date(res.datetime).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                                </span>
                              </div>
                              <div className="flex justify-between items-center w-full mt-2 pt-2 border-t border-primary/10">
                                <span className={`text-[10px] uppercase tracking-[0.2em] px-2 py-0.5 rounded-sm font-bold border ${flagColor}`}>
                                  {res.status === 'SuggestedNewTime' && res.suggestedDatetime ? `Suggested - ${new Date(res.suggestedDatetime).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })}` : `${res.status === 'DidntReach' ? "DIDN'T REACHED" : res.status}`}
                                </span>
                                <span className="text-xs text-secondary/50 whitespace-nowrap uppercase tracking-widest font-normal">
                                  {new Date(res.datetime).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year:'numeric' })}
                                </span>
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center w-full mt-2 gap-2">
                            
                            <div className="flex flex-wrap gap-2 w-full sm:w-auto mt-2 sm:mt-0 justify-end">
                              {res.tableNo ? (
                                <span className="flex items-center justify-center gap-1 bg-primary/10 text-primary px-3 py-1.5 text-xs uppercase tracking-widest font-normal rounded-sm">
                                  Table {res.tableNo}
                                </span>
                              ) : res.status !== 'SuggestedNewTime' ? (
                                <>
                                  <button
                                    onClick={() => setSuggestTimeRes(res)}
                                    className="flex items-center justify-center gap-1 bg-amber-500/20 text-amber-500 border border-amber-500/30 px-3 py-1.5 text-[12px] hover:bg-amber-500/30 transition-colors uppercase tracking-widest font-normal rounded-sm"
                                  >
                                    Suggest Time
                                  </button>
                                  <button
                                    onClick={() => initAllocation(res)}
                                    className="flex items-center justify-center gap-1 bg-primary/20 text-primary border border-primary/30 px-3 py-1.5 text-[12px] hover:bg-primary/30 transition-colors uppercase tracking-widest font-normal rounded-sm"
                                  >
                                    Allocate Table
                                  </button>
                                </>
                              ) : null}
                              <div className="relative three-dots-menu flex items-center ml-2">
                                <button 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setOpenMenuId(openMenuId === res.id ? null : res.id);
                                  }}
                                  className="group flex items-center justify-center p-1 text-secondary/50 hover:text-white hover:bg-white/10 transition-colors rounded-sm"
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
                        </div>
                      </motion.div>
                    );
                  });
                })()}
              </div>
            </div>
          )}

          {activeTab === 'reached' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-primary/20 pb-4">
                <h2 className="text-3xl font-serif">Reached Guests</h2>
              </div>

              <div className="space-y-4">
                {(() => {
                  const reachedFiltered = reservations.filter(r => ['Reached', 'DidntReach', 'Ongoing'].includes(r.status) || (r.status === 'Confirmed' && !!r.tableNo))
                    .sort((a, b) => new Date(a.datetime).getTime() - new Date(b.datetime).getTime());

                  if (reachedFiltered.length === 0) {
                     return <p className="text-secondary/50 font-light mt-8">No reached reservations found.</p>;
                  }

                  return reachedFiltered.map(res => {
                    return (
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      key={res.id} 
                      className={`bg-dark border flex flex-col relative ${
                        res.status === 'Confirmed' ? 'border-[#8A9A5B]/50' : 
                        res.status === 'Completed' ? 'border-[#E6D7A3]/50' :
                        res.status === 'Cancelled' || res.status === 'DidntReach' ? 'border-[#E2725B]/50' : 
                        res.status === 'Reached' ? 'border-[#CD7F32]/50' :
                        res.status === 'SuggestedNewTime' ? 'border-[#FF9933]/50' :
                        'border-[#CCCCFF]/50'
                      } ${openMenuId === res.id ? 'z-50' : 'z-10'}`}
                    >
                      <div className={`absolute left-0 top-0 bottom-0 w-1 ${
                        res.status === 'Confirmed' ? 'bg-[#8A9A5B]' : 
                        res.status === 'Completed' ? 'bg-[#E6D7A3]' :
                        res.status === 'Cancelled' || res.status === 'DidntReach' ? 'bg-[#E2725B]' : 
                        res.status === 'Reached' ? 'bg-[#CD7F32]' :
                        res.status === 'SuggestedNewTime' ? 'bg-[#FF9933]' :
                        'bg-[#CCCCFF]'
                      }`}></div>
                      
                      <div className="flex flex-col w-full pl-3 pr-4 py-2 gap-0.5">
                        <div className="flex justify-between items-center w-full">
                          <div className="flex flex-col items-start gap-1 w-full">
                            <div className="flex justify-between items-center w-full">
                              <span className="text-xl font-medium text-white whitespace-nowrap overflow-hidden text-ellipsis flex items-center">
                                {res.name} {res.guests && <span className="text-xs font-normal text-secondary/60 ml-2">({res.guests}p)</span>} {res.tableNo && <span className="text-primary text-xs font-medium pl-1">T:{res.tableNo}</span>} <span className="text-xs text-secondary/60 font-mono ml-2">: {res.phone}</span>
                              </span>
                              <span className="text-xl text-secondary/80 whitespace-nowrap font-mono ml-4 font-medium">
                                {new Date(res.datetime).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                            <div className="flex justify-between items-center w-full mt-2 pt-2 border-t border-primary/10">
                              <span className={`text-[10px] uppercase tracking-[0.2em] px-2 py-0.5 rounded-sm font-bold border ${
                                res.status === 'Confirmed' ? 'bg-[#8A9A5B]/10 text-[#8A9A5B] border-[#8A9A5B]/20' : 
                                res.status === 'Completed' ? 'bg-[#E6D7A3]/10 text-[#E6D7A3] border-[#E6D7A3]/20' :
                                res.status === 'Cancelled' || res.status === 'DidntReach' ? 'bg-[#E2725B]/10 text-[#E2725B] border-[#E2725B]/20' :
                                res.status === 'Reached' ? 'bg-[#CD7F32]/10 text-[#CD7F32] border-[#CD7F32]/20' :
                                res.status === 'SuggestedNewTime' ? 'bg-[#F4C430]/10 text-[#F4C430] border-[#F4C430]/20' :
                                'bg-[#CCCCFF]/10 text-[#CCCCFF] border-[#CCCCFF]/20'
                              }`}>
                                {res.status === 'SuggestedNewTime' ? 'Suggested New Time' : res.status === 'DidntReach' ? "DIDN'T REACHED" : res.status}
                              </span>
                              <span className="text-xs text-secondary/50 whitespace-nowrap uppercase tracking-widest font-normal">
                                {new Date(res.datetime).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year:'numeric' })}
                              </span>
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex flex-row justify-between items-center w-full mt-2 pt-2 border-t border-primary/10">
                          
                          <div className="flex gap-2 relative flex-wrap justify-end">
                            {(res.status === 'Reached' || res.status === 'Ongoing') && (
                              <button 
                                onClick={() => handlePaymentDone(res)}
                                className="flex items-center justify-center gap-1 bg-green-500/20 text-green-400 border border-green-500/30 px-3 py-1 text-[12px] hover:bg-green-500/30 transition-colors uppercase tracking-widest font-normal rounded-sm"
                              >
                                <CheckCircle2 size={12} /> Payment Done
                              </button>
                            )}
                            {res.status === 'Confirmed' && (
                              <>
                                <button 
                                  onClick={() => updateReservationStatus(res.id, { status: 'Reached' })}
                                  className="flex items-center justify-center gap-1 bg-yellow-500/20 text-yellow-500 border border-yellow-500/30 px-3 py-1 text-[12px] hover:bg-yellow-500/30 transition-colors uppercase tracking-widest font-normal rounded-sm"
                                >
                                  <CheckCircle2 size={12} /> Reached
                                </button>
                                <button 
                                  onClick={() => updateReservationStatus(res.id, { status: 'DidntReach' })}
                                  className="flex items-center justify-center gap-1 bg-red-500/20 text-red-500 border border-red-500/30 px-3 py-1 text-[12px] hover:bg-red-500/30 transition-colors uppercase tracking-widest font-normal rounded-sm"
                                >
                                  <XCircle size={12} /> DIDN'T REACHED
                                </button>
                              </>
                            )}
                            <div className="relative three-dots-menu flex items-center ml-2">
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setOpenMenuId(openMenuId === res.id ? null : res.id);
                                }}
                                className="group flex items-center justify-center p-1 text-secondary/50 hover:text-white hover:bg-white/10 transition-colors rounded-sm"
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
                    <div className="flex gap-2">
                      <button 
                        onClick={cancelAllocationProcess}
                        className="text-xs uppercase tracking-widest border border-primary/20 text-primary hover:bg-primary/10 px-4 py-2"
                      >
                        Cancel
                      </button>
                      {pendingTableSelection && (
                        <button
                          onClick={proceedToFinalDetails}
                          className="bg-primary hover:bg-primary/90 text-dark uppercase tracking-widest text-xs px-6 py-2 transition-all font-normal"
                        >
                          Confirm ({pendingTableSelection.split(',').length})
                        </button>
                      )}
                    </div>
                 </div>
              )}

              <div className="flex justify-between items-end border-b border-primary/20 pb-4 mb-6">
                 <h2 className="text-xl font-serif">Table Overview</h2>
                 <div className="flex flex-wrap gap-4 text-xs text-secondary/70">
                   <div className="flex items-center gap-2"><span className="w-3 h-3 bg-[#E6D7A3] shadow shadow-[#E6D7A3]/50"></span> Available</div>
                   <div className="flex items-center gap-2"><span className="w-3 h-3 bg-[#CD7F32] shadow shadow-[#CD7F32]/50"></span> Upcoming</div>
                   <div className="flex items-center gap-2"><span className="w-3 h-3 bg-[#50C878] shadow shadow-[#50C878]/50"></span> Reserved Table</div>
                 </div>
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

          {activeTab === 'export' && (
            <div className="space-y-6 max-w-xl">
               <h2 className="text-3xl font-serif border-b border-primary/20 pb-4">Export Data</h2>
               
               <div className="bg-dark p-6 border border-primary/20 space-y-6">
                 <p className="text-secondary/70 text-sm">Download a complete PDF report containing all reservation records, including pending, confirmed, reached, cancelled, and completed bookings.</p>
                 <div className="flex flex-col gap-3">
                   <button 
                    onClick={() => handleDownloadData('All')}
                    className="w-full bg-primary/20 text-primary border border-primary/30 px-6 py-3 uppercase tracking-widest text-sm hover:bg-primary/30 transition-colors flex items-center justify-center gap-2 font-normal"
                   >
                     <Download size={18} /> All Reservations
                   </button>
                   <button 
                    onClick={() => handleDownloadData('Upcoming')}
                    className="w-full bg-primary/20 text-primary border border-primary/30 px-6 py-3 uppercase tracking-widest text-sm hover:bg-primary/30 transition-colors flex items-center justify-center gap-2 font-normal"
                   >
                     <Download size={18} /> Upcoming
                   </button>
                   <button 
                    onClick={() => handleDownloadData('Reached')}
                    className="w-full bg-primary/20 text-primary border border-primary/30 px-6 py-3 uppercase tracking-widest text-sm hover:bg-primary/30 transition-colors flex items-center justify-center gap-2 font-normal"
                   >
                     <Download size={18} /> Reached
                   </button>
                 </div>
               </div>
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="space-y-6 max-w-xl">
               <h2 className="text-3xl font-serif border-b border-primary/20 pb-4">Core Settings</h2>
               
               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 <button onClick={() => setShowPinModal(true)} className="bg-dark p-6 border border-primary/20 hover:border-primary/50 transition-colors flex flex-col items-center justify-center gap-4 py-12">
                   <KeyRound size={48} className="text-primary" />
                   <h3 className="text-lg text-secondary uppercase tracking-widest font-normal">Change PIN</h3>
                 </button>
                 <button onClick={handleLogout} className="bg-dark p-6 border border-red-500/20 hover:border-red-500/50 transition-colors flex flex-col items-center justify-center gap-4 py-12">
                   <LogOut size={48} className="text-red-500" />
                   <h3 className="text-lg text-red-500 uppercase tracking-widest font-normal">Logout Admin</h3>
                 </button>
                 <button onClick={() => setShowClearModal(true)} className="bg-dark p-6 border border-red-500/20 hover:border-red-500/50 transition-colors flex flex-col items-center justify-center gap-4 py-12">
                   <XCircle size={48} className="text-red-500" />
                   <h3 className="text-lg text-red-500 uppercase tracking-widest font-normal">Clear Reservations</h3>
                 </button>
               </div>
            </div>
          )}
        </div>
      </main>

      <AnimatePresence>
        {showExportModal && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
          >
            <div className="bg-dark border border-primary/20 p-6 max-w-sm w-full shadow-2xl relative">
              <button 
                onClick={() => { setShowExportModal(false); setExportFilterType(null); }}
                className="absolute right-4 top-4 text-secondary/40 hover:text-primary transition-colors"
              >
                <X size={20} />
              </button>
              
              <h3 className="text-xl font-serif text-primary mb-2">Export Selection</h3>
              <p className="text-secondary/60 text-sm mb-6">Choose an export format for "{exportFilterType}" data.</p>
              
              <div className="flex flex-col gap-3">
                <button
                  onClick={() => executeExport('pdf')}
                  className="w-full py-4 px-4 bg-red-900/10 hover:bg-red-900/30 text-red-400 border border-red-900/30 font-medium tracking-widest text-sm uppercase transition-colors"
                >
                  Export as PDF
                </button>
                <button
                  onClick={() => executeExport('excel')}
                  className="w-full py-4 px-4 bg-green-900/10 hover:bg-green-900/30 text-green-400 border border-green-900/30 font-medium tracking-widest text-sm uppercase transition-colors"
                >
                  Export as EXCEL
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Manual Add Reservation Modal */}
      <AnimatePresence>
        {showAddModal && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-darker/90 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="bg-dark border border-primary/30 w-full max-w-md shadow-2xl relative"
            >
              <button 
                onClick={() => setShowAddModal(false)}
                className="absolute top-4 right-4 text-secondary/60 hover:text-primary transition-colors"
              >
                <X size={20} />
              </button>
              
              <div className="p-6 border-b border-primary/10">
                <h3 className="font-serif text-3xl text-primary">Add Reservation</h3>
                <p className="text-sm text-secondary/60 mt-1">Manually enter a walk-in or offline booking.</p>
              </div>

              <form onSubmit={handleAddManualReservation} className="p-6 space-y-4">
                <div className="space-y-2">
                  <label className="text-xs uppercase tracking-widest text-secondary/60">Name</label>
                  <input 
                    type="text" 
                    required 
                    value={manualRes.name}
                    onChange={(e) => setManualRes(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full bg-darker border border-primary/20 px-4 py-3 text-secondary focus:outline-none focus:border-primary/50 transition-colors" 
                    placeholder="Guest Name"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs uppercase tracking-widest text-secondary/60">Mobile Number</label>
                  <div className="relative">
                    <span className="absolute left-3 bottom-3.5 text-secondary/40 font-mono text-sm">+91 </span>
                    <input 
                      type="tel" 
                      required 
                      pattern="[0-9]{10}" 
                      maxLength={10} 
                      minLength={10}
                      value={manualRes.phone}
                      onChange={(e) => {
                        const val = e.target.value.replace(/\D/g, '').slice(0, 10);
                        setManualRes(prev => ({ ...prev, phone: val }));
                      }}
                      className="w-full bg-darker border border-primary/20 pl-11 pr-4 py-3 text-secondary focus:outline-none focus:border-primary/50 transition-colors font-mono" 
                      placeholder="10-digit number"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs uppercase tracking-widest text-secondary/60">Guests</label>
                    <select
                      required 
                      value={manualRes.guests}
                      onChange={(e) => setManualRes(prev => ({ ...prev, guests: parseInt(e.target.value) || 1 }))}
                      className="w-full bg-darker border border-primary/20 px-4 py-3 text-secondary focus:outline-none focus:border-primary/50 transition-colors appearance-none" 
                    >
                      {[1,2,3,4,5,6,7,8,9,10].map(n => (
                        <option key={n} value={n} className="bg-dark">{n} {n===1?'Person':'People'}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs uppercase tracking-widest text-secondary/60">Date & Time</label>
                    <input 
                      type="datetime-local" 
                      required 
                      value={manualRes.datetime}
                      onChange={(e) => setManualRes(prev => ({ ...prev, datetime: e.target.value }))}
                      className="w-full bg-darker border border-primary/20 px-4 py-3 text-secondary focus:outline-none focus:border-primary/50 transition-colors [color-scheme:dark]" 
                    />
                  </div>
                </div>
                <button 
                  type="submit"
                  className="w-full mt-4 bg-gradient-to-r from-dark to-darker border border-primary/30 text-primary py-3 uppercase tracking-widest text-sm hover:from-darker hover:to-dark transition-all duration-300 font-normal"
                >
                  Add Reservation
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

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
                    .filter(r => r.tableNo?.split(',').map(s=>s.trim()).includes(viewTableDetailsId || '') && r.status === 'Confirmed')
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
                      <div className="grid grid-cols-12 gap-4 pb-3 border-b border-primary/10 text-xs uppercase tracking-widest text-secondary/50 font-normal mb-4 mx-2">
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
                              <span className="text-sm text-primary font-normal tracking-wider">
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
                              <Plus size={12} className="text-secondary/30" />{res.phone}
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
              <h3 className="text-3xl font-serif text-primary mb-6">Final Details</h3>
              
              <div className="space-y-4 mb-8 bg-darker p-4 border border-primary/10">
                 <div className="flex justify-between border-b border-primary/10 pb-2">
                    <span className="text-secondary/60 text-sm">Guest Name</span>
                    <span className="text-secondary font-medium">{allocatingRes.name}</span>
                 </div>
                 <div className="flex justify-between border-b border-primary/10 pb-2">
                    <span className="text-secondary/60 text-sm">Phone</span>
                    <span className="text-secondary font-medium flex items-center"><Plus size={14} className="text-secondary/40 mr-1" />{allocatingRes.phone}</span>
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
                    <span className="text-secondary/60 text-sm font-normal">Assigned Table{pendingTableSelection.split(',').length > 1 ? 's' : ''}</span>
                    <span className="text-primary font-normal">{pendingTableSelection.split(',').map(id => TABLES.find(t=>t.id===id.trim())?.name).filter(Boolean).join(', ')}</span>
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
                <h3 className="text-3xl font-serif text-red-400 mb-2">Reject Reservation</h3>
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

      {/* Suggest Time Slot Modal */}
      <AnimatePresence>
        {suggestTimeRes && (
          <motion.div 
             initial={{ opacity: 0 }}
             animate={{ opacity: 1 }}
             exit={{ opacity: 0 }}
             className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm px-4"
          >
             <div className="bg-dark border border-amber-500/40 p-6 md:p-8 max-w-md w-full shadow-2xl relative">
                <h3 className="text-3xl font-serif text-amber-400 mb-2">Suggest New Time</h3>
                <p className="text-sm text-secondary/70 mb-6 border-b border-primary/20 pb-4">
                  Suggest a different time slot for <strong>{suggestTimeRes.name}</strong>.
                </p>
                <div className="space-y-4 mb-6">
                  <div>
                     <label className="text-xs uppercase tracking-widest text-secondary/60 mb-2 block">New Time</label>
                     <input
                       type="time"
                       value={suggestDatetime}
                       onChange={(e) => setSuggestDatetime(e.target.value)}
                       className="w-full bg-dark border border-amber-500/30 p-3 text-secondary focus:outline-none focus:border-amber-400 [color-scheme:dark]"
                     />
                  </div>
                </div>
                <div className="flex gap-3 mt-8">
                  <button 
                    onClick={() => { setSuggestTimeRes(null); setSuggestDatetime(''); }}
                    className="flex-1 py-3 border border-secondary/30 text-secondary hover:bg-secondary/10 transition-colors uppercase text-xs tracking-widest"
                  >
                    Go Back
                  </button>
                  <button 
                    onClick={() => {
                        if (suggestDatetime && suggestTimeRes) {
                           const originalDateStr = suggestTimeRes.datetime.split('T')[0];
                           const newDatetimeStr = `${originalDateStr}T${suggestDatetime}`;
                           updateReservationStatus(suggestTimeRes.id, { 
                             status: 'SuggestedNewTime', 
                             suggestedDatetime: newDatetimeStr 
                           });
                           setSuggestTimeRes(null);
                           setSuggestDatetime('');
                        } else {
                           alert('Please select a new date and time');
                        }
                    }}
                    className="flex-1 py-3 bg-amber-900/80 text-amber-100 hover:bg-amber-800 border border-amber-500/50 transition-colors uppercase text-xs tracking-widest"
                  >
                    Suggest & Notify
                  </button>
                </div>
             </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Change PIN Modal */}
      <AnimatePresence>
        {showPinModal && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-darker/90 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="bg-dark border border-primary/30 w-full max-w-md shadow-2xl relative p-6"
            >
              <button 
                onClick={() => { setShowPinModal(false); setPinChangeMessage(''); setShowPinConfirm(false); }}
                className="absolute top-4 right-4 text-secondary/60 hover:text-primary transition-colors"
              >
                <X size={20} />
              </button>
              
              {!showPinConfirm ? (
                <>
                  <div className="flex items-center gap-3 border-b border-primary/10 pb-4 mb-4">
                      <KeyRound className="text-primary" />
                      <h3 className="text-lg text-secondary">Change Admin PIN</h3>
                  </div>
                  
                  <form onSubmit={handlePinSubmit} className="space-y-4">
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
                      
                      {pinChangeMessage && (
                        <p className={`text-sm ${pinChangeMessage.startsWith('Error') ? 'text-red-400' : 'text-green-400'}`}>
                          {pinChangeMessage}
                        </p>
                      )}
                      
                      <button type="submit" className="w-full bg-primary/20 border border-primary/30 text-primary py-3 px-6 uppercase tracking-widest text-sm hover:bg-primary/30 transition-colors mt-4">
                        Update PIN
                      </button>
                  </form>
                </>
              ) : (
                <div className="text-center py-6">
                  <h3 className="text-xl font-serif text-white mb-2">Confirm Action</h3>
                  <p className="text-secondary/80 mb-8">Are you sure to change your password?</p>
                  
                  {pinChangeMessage && (
                    <p className={`text-sm mb-4 ${pinChangeMessage.startsWith('Error') ? 'text-red-400' : 'text-green-400'}`}>
                      {pinChangeMessage}
                    </p>
                  )}

                  <div className="flex gap-4">
                    <button 
                      onClick={() => setShowPinConfirm(false)}
                      className="flex-1 py-3 border border-secondary/30 text-secondary hover:bg-secondary/10 transition-colors uppercase text-xs tracking-widest"
                    >
                      Not
                    </button>
                    <button 
                      onClick={confirmPinChange}
                      className="flex-1 py-3 bg-primary text-darker font-normal transition-colors hover:bg-primary/90 uppercase text-xs tracking-widest"
                    >
                      Confirm
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Clear Reservations Modal */}
      <AnimatePresence>
        {showClearModal && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-darker/90 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="bg-dark border border-red-500/30 w-full max-w-md shadow-2xl relative p-6"
            >
              <button 
                onClick={() => { setShowClearModal(false); setClearType(null); }}
                className="absolute top-4 right-4 text-secondary/60 hover:text-red-500 transition-colors"
              >
                <X size={20} />
              </button>
              
              {!clearType ? (
                <>
                  <div className="flex items-center gap-3 border-b border-red-500/20 pb-4 mb-6">
                      <XCircle className="text-red-500" />
                      <h3 className="text-lg text-red-500">Clear Reservations</h3>
                  </div>
                  
                  <div className="flex flex-col gap-4">
                    <button 
                      onClick={() => setClearType('All Reservations')}
                      className="bg-red-900/20 border border-red-500/30 text-red-400 p-4 uppercase tracking-widest text-sm hover:bg-red-900/40 transition-colors text-center font-normal"
                    >
                       All Reservations
                    </button>
                    <button 
                      onClick={() => setClearType('Upcoming')}
                      className="bg-red-900/20 border border-red-500/30 text-red-400 p-4 uppercase tracking-widest text-sm hover:bg-red-900/40 transition-colors text-center font-normal"
                    >
                       Upcoming
                    </button>
                    <button 
                      onClick={() => setClearType('Reached')}
                      className="bg-red-900/20 border border-red-500/30 text-red-400 p-4 uppercase tracking-widest text-sm hover:bg-red-900/40 transition-colors text-center font-normal"
                    >
                       Reached
                    </button>
                    <button 
                      onClick={() => setClearType('History')}
                      className="bg-red-900/20 border border-red-500/30 text-red-400 p-4 uppercase tracking-widest text-sm hover:bg-red-900/40 transition-colors text-center font-normal"
                    >
                       History (Completed/Cancelled)
                    </button>
                  </div>
                </>
              ) : (
                <div className="text-center py-6">
                  <h3 className="text-xl font-serif text-white mb-2">Confirm Deletion</h3>
                  <p className="text-red-400 mb-8 font-light max-w-[260px] mx-auto">Are you sure about deleting <span className="font-normal text-red-500">{clearType}</span> ? This action cannot be undone.</p>
                  
                  <div className="flex gap-4">
                    <button 
                      onClick={() => setClearType(null)}
                      className="flex-1 py-3 border border-secondary/30 text-secondary hover:bg-secondary/10 transition-colors uppercase text-xs tracking-widest"
                    >
                      Not
                    </button>
                    <button 
                      onClick={handleClearConfirm}
                      className="flex-1 py-3 bg-red-600 text-white font-normal transition-colors hover:bg-red-700 uppercase text-xs tracking-widest"
                    >
                      Confirm
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}

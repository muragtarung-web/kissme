import React, { useState, useEffect } from 'react';
import { Calendar as CalendarIcon, Users, Clock, MapPin, CheckCircle } from 'lucide-react';
import { motion } from 'motion/react';
import toast from 'react-hot-toast';
import { db, auth } from '../lib/firebase';
import { collection, addDoc, query, where, getDocs, onSnapshot, limit } from 'firebase/firestore';
import { handleFirestoreError, OperationType } from '../lib/firestore-errors';
import { useLoading } from '../hooks/useLoading';

export default function Reservations() {
  const { showLoading, hideLoading } = useLoading();
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    time: '11:00 AM',
    guests: '2',
    type: 'indoor',
    tableNumber: '',
    notes: '',
    fullName: '',
    phone: ''
  });

  const [occupiedTables, setOccupiedTables] = useState<string[]>([]);
  const [fetchingTables, setFetchingTables] = useState(false);

  useEffect(() => {
    if (!formData.date || !formData.time) return;
    
    setFetchingTables(true);
    // Optimize listener by filtering by date to prevent 'transport errored' on broad collection snapshot
    const q = query(
      collection(db, 'reservations'),
      where('date', '>=', formData.date.split('-').slice(0, 2).join('-')), // Fetch broad enough to catch potential format variances in current month
      limit(200)
    );
    
    const unsubscribe = onSnapshot(q, (snap) => {
      const selectedDate = formData.date;
      const normalizeTime = (t: string) => t.toLowerCase().replace(/[^a-z0-9]/g, '');
      const selectedTime = normalizeTime(formData.time);
      
      const occupied = snap.docs
        .map(doc => {
          const data = doc.data();
          // Extract digits from tableNumber
          const rawTableNum = String(data.tableNumber || '').trim();
          const tableNumMatch = rawTableNum.match(/\d+/);
          const normalizedTableNum = tableNumMatch ? tableNumMatch[0] : rawTableNum;
          
          // Handle both string dates and Firestore Timestamps
          let dateStr = '';
          if (data.date) {
            if (typeof data.date === 'string') {
              dateStr = data.date;
            } else if (data.date.toDate) {
              dateStr = data.date.toDate().toISOString().split('T')[0];
            } else if (data.date instanceof Date) {
              dateStr = data.date.toISOString().split('T')[0];
            }
          }

          return {
            date: dateStr.trim(),
            time: normalizeTime(String(data.time || '')),
            status: String(data.status || '').toLowerCase().trim(),
            tableNumber: normalizedTableNum
          };
        })
        .filter(data => {
          // Normalize dates for comparison (handle 2026-5-7 vs 2026-05-07)
          const normalizeDate = (d: string) => d.replace(/\//g, '-').split('-').map(p => p.padStart(2, '0')).join('-');
          const isSameDate = normalizeDate(data.date) === normalizeDate(selectedDate);
          
          const isSameTime = data.time === selectedTime;
          // Broaden active status check: any confirmed, booked or pending status
          const isActiveStatus = ['pending', 'confirmed', 'booked', 'check-in', 'active', 'booked'].includes(data.status);
          
          if (isSameDate && isSameTime && isActiveStatus) {
            console.log(`[Availability] Table ${data.tableNumber} is occupied!`);
          }
          return isSameDate && isSameTime && isActiveStatus;
        })
        .map(data => data.tableNumber)
        .filter(num => num !== '');
        
      setOccupiedTables(occupied);
      setFetchingTables(false);
    }, (error) => {
      console.error('Failed to listen to occupied tables:', error);
      setFetchingTables(false);
    });

    return () => unsubscribe();
  }, [formData.date, formData.time]);

  const checkAvailability = async () => {
    if (!formData.date || !formData.time || !formData.tableNumber) return true;
    return !occupiedTables.includes(formData.tableNumber);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser) {
      toast.error('Session expired. Please login again.');
      return;
    }

    const isAvailable = await checkAvailability();
    if (!isAvailable) {
      toast.error(`Table ${formData.tableNumber} is already reserved for this time.`);
      return;
    }

    try {
      showLoading('Baymax is securing your digital seat...');
      const resRef = await addDoc(collection(db, 'reservations'), {
        ...formData,
        customerId: auth.currentUser.uid,
        status: 'pending',
        createdAt: new Date(),
        email: auth.currentUser.email
      });

      // Add in-app notification for the customer
      await addDoc(collection(db, 'inAppNotifications'), {
        userId: auth.currentUser.uid,
        title: 'Reservation Requested',
        message: `Your reservation request for Table ${formData.tableNumber} on ${formData.date} at ${formData.time} has been received.`,
        read: false,
        createdAt: new Date(),
        type: 'reservation',
        referenceId: resRef.id
      });

      // Send confirmation email via backend API
      try {
        await fetch('/api/send-reservation-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: auth.currentUser.email,
            fullName: formData.fullName,
            date: formData.date,
            time: formData.time,
            tableNumber: formData.tableNumber,
            guests: formData.guests
          })
        });
      } catch (emailErr) {
        console.error('Email trigger failed:', emailErr);
      }

      setStep(3);
      toast.success('Reservation request submitted!');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'reservations');
      toast.error('Booking failed');
    } finally {
      hideLoading();
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-24 text-zinc-900 dark:text-white">
      <div className="text-center mb-16">
        <h1 className="text-5xl font-serif font-bold italic mb-4">Reserve Your <span className="text-gold">Moment</span></h1>
        <p className="text-zinc-500 dark:text-white/40">Secure your table at Kiss me Store. We look forward to serving you.</p>
      </div>

      <div className="luxury-card overflow-hidden !p-0 shadow-none">
        <div className="grid grid-cols-1 md:grid-cols-5 h-full min-h-[500px]">
          <div className="md:col-span-2 bg-zinc-50 dark:bg-zinc-950 p-10 border-r border-zinc-200 dark:border-white/5">
            <h3 className="text-xs uppercase tracking-[0.2em] text-primary font-bold mb-8">Booking Info</h3>
            <div className="space-y-8">
              <div className="flex gap-4">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0">1</div>
                <div>
                  <h4 className="font-bold text-sm mb-1 text-zinc-900 dark:text-white">Select Details</h4>
                  <p className="text-xs text-zinc-500 dark:text-white/40">Date, time and party size</p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${step >= 2 ? 'bg-primary/10 text-primary' : 'bg-zinc-100 dark:bg-white/5 text-zinc-400 dark:text-white/20'}`}>2</div>
                <div>
                  <h4 className={`font-bold text-sm mb-1 ${step >= 2 ? 'text-zinc-900 dark:text-white' : 'text-zinc-400 dark:text-white/20'}`}>Guest Details</h4>
                  <p className="text-xs text-zinc-500 dark:text-white/40">Confirm identity</p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${step === 3 ? 'bg-primary/10 text-primary' : 'bg-zinc-100 dark:bg-white/5 text-zinc-400 dark:text-white/20'}`}>3</div>
                <div>
                  <h4 className={`font-bold text-sm mb-1 ${step === 3 ? 'text-zinc-900 dark:text-white' : 'text-zinc-400 dark:text-white/20'}`}>Confirmation</h4>
                  <p className="text-xs text-zinc-500 dark:text-white/40">Success!</p>
                </div>
              </div>
            </div>

            <div className="mt-20 pt-12 border-t border-zinc-200 dark:border-white/5 text-xs text-zinc-400 dark:text-white/20 space-y-4">
              <div className="flex items-center gap-2">
                <CheckCircle size={14} className="text-green-500" /> Instant confirmation
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle size={14} className="text-green-500" /> Free cancellation
              </div>
            </div>
          </div>

          <div className="md:col-span-3 p-10 bg-transparent">
            {step === 1 && (
              <motion.form 
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="space-y-8"
                onSubmit={(e) => { e.preventDefault(); setStep(2); }}
              >
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-zinc-400 dark:text-white/40 uppercase tracking-widest block text-left">Date</label>
                    <div className="relative">
                      <input 
                        type="date" 
                        required
                        value={formData.date}
                        className="w-full bg-zinc-50 dark:bg-white/5 border border-zinc-200 dark:border-white/10 rounded-xl px-4 py-3 text-sm focus:border-gold outline-none text-zinc-900 dark:text-white transition-colors" 
                        onChange={(e) => setFormData({...formData, date: e.target.value})}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-zinc-400 dark:text-white/40 uppercase tracking-widest block text-left">Time</label>
                    <select 
                      value={formData.time}
                      className="w-full bg-zinc-50 dark:bg-white/5 border border-zinc-200 dark:border-white/10 rounded-xl px-4 py-3 text-sm focus:border-gold outline-none appearance-none text-zinc-900 dark:text-white transition-colors"
                      onChange={(e) => setFormData({...formData, time: e.target.value})}
                    >
                      <option value="11:00 AM" className="bg-white dark:bg-[#121212] text-zinc-900 dark:text-white">11:00 AM</option>
                      <option value="01:00 PM" className="bg-white dark:bg-[#121212] text-zinc-900 dark:text-white">01:00 PM</option>
                      <option value="06:00 PM" className="bg-white dark:bg-[#121212] text-zinc-900 dark:text-white">06:00 PM</option>
                      <option value="08:00 PM" className="bg-white dark:bg-[#121212] text-zinc-900 dark:text-white">08:00 PM</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-zinc-400 dark:text-white/40 uppercase tracking-widest block text-left">Number of Guests</label>
                  <div className="flex gap-4">
                    {['1-2', '3-4', '5-6', '7+'].map(val => (
                      <button 
                        key={val}
                        type="button"
                        onClick={() => setFormData({...formData, guests: val})}
                        className={`flex-grow py-3 rounded-xl border transition-all text-sm font-bold ${formData.guests === val ? 'bg-gold border-gold text-black' : 'bg-zinc-50 dark:bg-white/5 border-zinc-200 dark:border-white/10 text-zinc-900 dark:text-white'}`}
                      >
                        {val}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-zinc-400 dark:text-white/40 uppercase tracking-widest block text-left">
                    Table Number {fetchingTables && <span className="animate-pulse text-gold"> (Checking...)</span>}
                  </label>
                  <select 
                    required
                    disabled={fetchingTables}
                    className="w-full bg-zinc-50 dark:bg-white/5 border border-zinc-200 dark:border-white/10 rounded-xl px-4 py-3 text-sm focus:border-gold outline-none appearance-none text-zinc-900 dark:text-white transition-colors disabled:opacity-50"
                    value={formData.tableNumber}
                    onChange={(e) => setFormData({...formData, tableNumber: e.target.value})}
                  >
                    <option value="" disabled className="bg-white dark:bg-[#121212] text-zinc-900 dark:text-white">
                      {fetchingTables ? 'Updating availability...' : 'Select a table'}
                    </option>
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(num => {
                      const isOccupied = occupiedTables.includes(num.toString());
                      return (
                        <option 
                          key={num} 
                          value={num.toString()} 
                          disabled={isOccupied}
                          className={`bg-white dark:bg-[#121212] ${isOccupied ? 'text-red-500 line-through' : 'text-zinc-900 dark:text-white'}`}
                        >
                          {isOccupied ? `Table ${num} — ALREADY RESERVED` : `Table ${num} Available`}
                        </option>
                      );
                    })}
                  </select>
                  <p className="text-[10px] text-zinc-500 text-left italic">
                    {fetchingTables ? 'Securing live table data...' : 'Choose your preferred table number for this time slot.'}
                  </p>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-zinc-400 dark:text-white/40 uppercase tracking-widest block text-left">Table Preference</label>
                  <div className="grid grid-cols-2 gap-4">
                    <button 
                      type="button"
                      onClick={() => setFormData({...formData, type: 'indoor'})}
                      className={`py-3 rounded-xl border transition-all text-xs font-bold flex items-center justify-center gap-2 ${formData.type === 'indoor' ? 'bg-primary border-primary text-white' : 'bg-zinc-50 dark:bg-white/5 border-zinc-200 dark:border-white/10 text-zinc-400 dark:text-white/40'}`}
                    >
                      <MapPin size={14} /> Indoor
                    </button>
                    <button 
                      type="button"
                      onClick={() => setFormData({...formData, type: 'outdoor'})}
                      className={`py-3 rounded-xl border transition-all text-xs font-bold flex items-center justify-center gap-2 ${formData.type === 'outdoor' ? 'bg-primary border-primary text-white' : 'bg-zinc-50 dark:bg-white/5 border-zinc-200 dark:border-white/10 text-zinc-400 dark:text-white/40'}`}
                    >
                      <MapPin size={14} /> Garden View
                    </button>
                  </div>
                </div>

                <button type="submit" className="w-full btn-gold !py-4 text-xs font-bold uppercase tracking-[0.2em]">
                  Continue Booking
                </button>
              </motion.form>
            )}

            {step === 2 && (
              <motion.form 
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="space-y-8"
                onSubmit={handleSubmit}
              >
                <h3 className="text-xl font-serif font-bold text-zinc-900 dark:text-white text-left">Personal Information</h3>
                <div className="space-y-4 text-left">
                  <input 
                    type="text" 
                    placeholder="Full Name" 
                    className="w-full bg-zinc-50 dark:bg-white/5 border border-zinc-200 dark:border-white/10 rounded-xl px-4 py-4 text-sm outline-none focus:border-gold text-zinc-900 dark:text-white transition-colors" 
                    required 
                    value={formData.fullName}
                    onChange={(e) => setFormData({...formData, fullName: e.target.value})}
                  />
                  <input 
                    type="phone" 
                    placeholder="Phone Number" 
                    className="w-full bg-zinc-50 dark:bg-white/5 border border-zinc-200 dark:border-white/10 rounded-xl px-4 py-4 text-sm outline-none focus:border-gold text-zinc-900 dark:text-white transition-colors" 
                    required 
                    value={formData.phone}
                    onChange={(e) => setFormData({...formData, phone: e.target.value})}
                  />
                  <textarea 
                    placeholder="Special Requests (Optional)" 
                    className="w-full bg-zinc-50 dark:bg-white/5 border border-zinc-200 dark:border-white/10 rounded-xl px-4 py-4 text-sm outline-none focus:border-gold h-32 text-zinc-900 dark:text-white transition-colors" 
                    value={formData.notes}
                    onChange={(e) => setFormData({...formData, notes: e.target.value})}
                  />
                </div>
                <div className="flex gap-4">
                  <button type="button" onClick={() => setStep(1)} className="flex-grow py-4 border border-zinc-200 dark:border-white/10 rounded-xl font-bold uppercase text-[10px] tracking-widest text-zinc-400 dark:text-white/20 hover:bg-zinc-50 dark:hover:bg-white/5 transition-colors">Back</button>
                  <button type="submit" className="flex-[2] btn-gold font-bold uppercase text-[10px] tracking-widest">Confirm Request</button>
                </div>
              </motion.form>
            )}

            {step === 3 && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="h-full flex flex-col items-center justify-center text-center space-y-6"
              >
                <div className="w-20 h-20 bg-green-500/10 text-green-500 rounded-full flex items-center justify-center mb-4">
                  <CheckCircle size={48} />
                </div>
                <h2 className="text-3xl font-serif font-bold italic text-zinc-900 dark:text-white">Table Reserved!</h2>
                <p className="text-zinc-500 dark:text-white/40 max-w-sm">
                  We've sent a confirmation to your email. Your booking ID is <span className="text-gold font-bold">#KM-7729</span>.
                </p>
                <button onClick={() => setStep(1)} className="btn-primary">Done</button>
              </motion.div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Calendar, Music, Ticket, ArrowRight, User, X, MapPin, Clock } from 'lucide-react';
import { db } from '../lib/firebase';
import { collection, getDocs, query, orderBy, onSnapshot } from 'firebase/firestore';
import { Event as AppEvent } from '../types';
import { useLanguage } from '../hooks/useLanguage';
import { handleFirestoreError, OperationType } from '../lib/firestore-errors';
import { Link } from 'react-router-dom';
import { useLoading } from '../hooks/useLoading';

export default function Events() {
  const { showLoading, hideLoading } = useLoading();
  const [events, setEvents] = useState<AppEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState<AppEvent | null>(null);
  const { t } = useLanguage();

  useEffect(() => {
    showLoading('Scanning for happenings...');
    const unsub = onSnapshot(query(collection(db, 'events'), orderBy('date')), (snap) => {
      setEvents(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as AppEvent)));
      setLoading(false);
      hideLoading();
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'events');
      setLoading(false);
      hideLoading();
    });
    
    return () => unsub();
  }, []);

  return (
    <div className="max-w-7xl mx-auto px-6 py-24 relative overflow-hidden text-zinc-900 dark:text-white min-h-screen">
      <div className="text-left mb-24 px-2">
        <span className="text-gold uppercase tracking-[0.4em] text-[10px] font-bold mb-4 block">Current Happenings</span>
        <h1 className="text-7xl font-serif font-bold italic leading-none">Terminal <span className="text-zinc-200 dark:text-white/20">Events</span></h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        {/* Featured Event */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          onClick={() => setSelectedEvent({
             id: 'featured',
             title: t('eventConcert'),
             desc: 'Celebrating a decade of divine aesthetics. Multiple soundscapes, raffles, and culinary showcases await in our grand auditorium. Experience the fusion of taste and sound like never before.',
             date: 'May 12, 2026',
             time: '19:00',
             img: 'https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?auto=format&fit=crop&q=80&w=2000'
          } as AppEvent)}
          className="lg:col-span-2 relative h-[600px] overflow-hidden group cursor-pointer border border-white/5 shadow-2xl"
        >
          <img 
            src="https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?auto=format&fit=crop&q=80&w=2000" 
            alt="Featured event" 
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-1000"
            referrerPolicy="no-referrer"
            onError={(e) => {
              (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?auto=format&fit=crop&q=80&w=2000';
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-white dark:from-[#0A0A0A] via-transparent to-transparent" />
          <div className="absolute bottom-16 left-16 right-16 text-left">
            <div className="flex items-center gap-4 mb-6">
              <span className="bg-primary px-4 py-1 text-[10px] font-bold uppercase tracking-widest shadow-xl text-white">Grand Entry</span>
              <span className="text-[10px] uppercase tracking-widest font-bold flex items-center gap-2 text-zinc-900 dark:text-white">
                <Calendar size={14} className="text-gold" /> May 12, 2026
              </span>
            </div>
            <h2 className="text-6xl font-serif font-bold italic mb-6 leading-tight max-w-3xl text-white">{t('eventConcert')}</h2>
            <p className="text-white/60 text-[11px] uppercase tracking-widest font-bold leading-loose max-w-xl mb-10">
              Celebrating a decade of divine aesthetics. Multiple soundscapes, raffles, and culinary showcases await.
            </p>
            <button className="btn-gold">
              {t('rsvpNow')}
            </button>
          </div>
        </motion.div>

        {loading ? (
           <div className="lg:col-span-2 text-center py-24 text-white/20 uppercase tracking-widest text-[10px] font-bold">Scanning for happenings...</div>
        ) : events.length > 0 ? events.map((event, id) => (
          <motion.div 
            key={event.id}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            onClick={() => setSelectedEvent(event)}
            className="bg-zinc-50 dark:bg-[#121212] border border-zinc-100 dark:border-white/5 flex flex-col md:flex-row overflow-hidden group shadow-none transition-colors cursor-pointer"
          >
            <div className="md:w-2/5 aspect-[4/3] md:aspect-auto overflow-hidden transition-all duration-700 bg-zinc-200 dark:bg-white/5">
              <img 
                src={event.img || 'https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?auto=format&fit=crop&q=80&w=2000'} 
                alt={event.title} 
                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000"
                referrerPolicy="no-referrer"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?auto=format&fit=crop&q=80&w=2000';
                }}
              />
            </div>
            <div className="md:w-3/5 p-10 flex flex-col justify-center text-left">
              <div className="flex items-center gap-4 mb-6">
                <span className="text-gold text-[9px] font-bold uppercase tracking-[0.3em] flex items-center gap-2">
                  <Music size={12} /> Soundscape
                </span>
                <span className="text-zinc-500 dark:text-white/20 text-[9px] font-bold uppercase tracking-[0.3em]">{event.date}</span>
              </div>
              <h3 className="text-3xl font-serif font-bold italic mb-4 text-white">{event.title}</h3>
              <p className="text-white/60 text-[10px] uppercase tracking-widest font-bold leading-loose line-clamp-2 mb-8">{event.desc}</p>
              <div className="mt-auto flex items-center justify-between border-t border-zinc-100 dark:border-white/5 pt-6">
                <span className="text-[10px] font-bold uppercase tracking-widest text-gold">{event.time}</span>
                <button className="text-zinc-900 dark:text-white text-[9px] font-bold uppercase tracking-[0.3em] hover:text-gold transition-colors">
                  Details
                </button>
              </div>
            </div>
          </motion.div>
        )) : (
          <div className="lg:col-span-2 py-24 text-center border border-dashed border-zinc-200 dark:border-white/10 rounded-3xl">
            <Calendar size={48} className="mx-auto text-zinc-200 dark:text-white/10 mb-6" />
            <h3 className="text-xl font-serif italic text-zinc-400 dark:text-white/20 mb-2">No Upcoming Happenings Found</h3>
            <p className="text-[10px] uppercase tracking-widest text-white/30 font-bold">Please check back soon for our next major Soundscape event.</p>
          </div>
        )}
      </div>

      {/* Full Detail Modal */}
      <AnimatePresence>
        {selectedEvent && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6 md:p-12">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedEvent(null)}
              className="absolute inset-0 bg-black/95 backdrop-blur-xl"
            />
            
            <motion.div 
              layoutId={selectedEvent.id}
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-6xl bg-zinc-900 border border-white/5 rounded-3xl overflow-hidden shadow-2xl flex flex-col lg:flex-row max-h-[90vh]"
            >
              <button 
                onClick={() => setSelectedEvent(null)}
                className="absolute top-6 right-6 z-10 w-12 h-12 bg-black/40 backdrop-blur-md rounded-full flex items-center justify-center text-white/40 hover:text-white transition-colors border border-white/5"
              >
                <X size={20} />
              </button>

              <div className="lg:w-1/2 relative bg-zinc-800">
                <img 
                  src={selectedEvent.img || 'https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?auto=format&fit=crop&q=80&w=2000'} 
                  alt={selectedEvent.title} 
                  className="w-full h-full object-cover transition-all duration-1000"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?auto=format&fit=crop&q=80&w=2000';
                  }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-zinc-900 via-transparent to-transparent lg:hidden" />
              </div>

              <div className="lg:w-1/2 p-12 md:p-20 overflow-y-auto custom-scrollbar flex flex-col">
                <div className="mb-12">
                  <span className="text-gold text-[10px] font-bold uppercase tracking-[0.5em] mb-6 block">HAPPENING DETAIL</span>
                  <h2 className="text-5xl font-serif font-bold italic text-white mb-8 leading-tight">{selectedEvent.title}</h2>
                  
                  <div className="grid grid-cols-2 gap-8 mb-12">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-gold">
                        <Calendar size={18} />
                      </div>
                      <div>
                        <span className="text-[10px] uppercase text-white/40 block font-bold tracking-widest">Date</span>
                        <span className="text-sm text-white font-medium">{selectedEvent.date}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-gold">
                        <Clock size={18} />
                      </div>
                      <div>
                        <span className="text-[10px] uppercase text-white/40 block font-bold tracking-widest">Time</span>
                        <span className="text-sm text-white font-medium">{selectedEvent.time}</span>
                      </div>
                    </div>
                  </div>

                  <p className="text-white/60 text-lg leading-relaxed mb-12 font-serif italic px-2 border-l-2 border-gold/40">
                    "{selectedEvent.desc}"
                  </p>

                  <div className="space-y-4 mb-16">
                    <div className="flex items-center gap-4 text-[10px] uppercase tracking-widest font-bold text-white/20">
                      <MapPin size={14} className="text-gold" /> Main Sound Stage • Level 2
                    </div>
                    <div className="flex items-center gap-4 text-[10px] uppercase tracking-widest font-bold text-white/20">
                      <Ticket size={14} className="text-gold" /> Exclusive Loyalty Access
                    </div>
                  </div>
                </div>

                <div className="mt-auto pt-10 border-t border-white/5 flex flex-col sm:flex-row items-center gap-6">
                  <Link 
                    to="/reservations" 
                    className="w-full sm:w-auto px-10 py-5 bg-gold text-black text-[11px] font-bold uppercase tracking-[0.3em] hover:bg-white transition-all text-center rounded-sm shadow-xl hover:shadow-gold/20"
                  >
                    Book This Event
                  </Link>
                  <button 
                    onClick={() => setSelectedEvent(null)}
                    className="text-[10px] uppercase tracking-widest font-bold text-white/40 hover:text-gold transition-colors"
                  >
                    Close Detail
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}


import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Calendar, Music, Ticket, ArrowRight, User } from 'lucide-react';
import { db } from '../lib/firebase';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { Event as AppEvent } from '../types';
import { useLanguage } from '../hooks/useLanguage';
import { handleFirestoreError, OperationType } from '../lib/firestore-errors';

export default function Events() {
  const [events, setEvents] = useState<AppEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const { t } = useLanguage();

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const q = query(collection(db, 'events'), orderBy('date'));
        const snap = await getDocs(q);
        setEvents(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as AppEvent)));
      } catch (error) {
        handleFirestoreError(error, OperationType.GET, 'events');
      } finally {
        setLoading(false);
      }
    };
    fetchEvents();
  }, []);

  return (
    <div className="max-w-7xl mx-auto px-6 py-24 relative overflow-hidden text-zinc-900 dark:text-white">
      <div className="text-left mb-24 px-2">
        <span className="text-gold uppercase tracking-[0.4em] text-[10px] font-bold mb-4 block">Current Happenings</span>
        <h1 className="text-7xl font-serif font-bold italic leading-none">Terminal <span className="text-zinc-200 dark:text-white/20">Events</span></h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        {/* Featured Event */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="lg:col-span-2 relative h-[600px] overflow-hidden group cursor-pointer border border-white/5 shadow-2xl"
        >
          <img 
            src="https://images.unsplash.com/photo-1459749411177-042180ce672c?auto=format&fit=crop&q=80&w=2000" 
            alt="Featured event" 
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-1000 grayscale group-hover:grayscale-0"
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-white dark:from-[#0A0A0A] via-transparent to-transparent" />
          <div className="absolute bottom-16 left-16 right-16 text-left">
            <div className="flex items-center gap-4 mb-6">
              <span className="bg-primary px-4 py-1 text-[10px] font-bold uppercase tracking-widest shadow-xl text-white">Grand Entry</span>
              <span className="text-[10px] uppercase tracking-widest font-bold flex items-center gap-2 text-zinc-900 dark:text-white">
                <Calendar size={14} className="text-gold" /> May 12, 2026
              </span>
            </div>
            <h2 className="text-6xl font-serif font-bold italic mb-6 leading-tight max-w-3xl text-zinc-900 dark:text-white">{t('eventConcert')}</h2>
            <p className="text-zinc-500 dark:text-white/40 text-[11px] uppercase tracking-widest font-bold leading-loose max-w-xl mb-10">
              Celebrating a decade of divine aesthetics. Multiple soundscapes, raffles, and culinary showcases await.
            </p>
            <button className="btn-gold">
              {t('rsvpNow')}
            </button>
          </div>
        </motion.div>

        {loading ? (
           <div className="lg:col-span-2 text-center py-24 text-white/20 uppercase tracking-widest text-[10px] font-bold">Scanning for happenings...</div>
        ) : events.map((event, id) => (
          <motion.div 
            key={event.id}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="bg-zinc-50 dark:bg-[#121212] border border-zinc-100 dark:border-white/5 flex flex-col md:flex-row overflow-hidden group shadow-none transition-colors"
          >
            <div className="md:w-2/5 aspect-[4/3] md:aspect-auto overflow-hidden grayscale group-hover:grayscale-0 transition-all duration-700 bg-zinc-200 dark:bg-white/5">
              <img 
                src={event.img} 
                alt={event.title} 
                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000"
                referrerPolicy="no-referrer"
              />
            </div>
            <div className="md:w-3/5 p-10 flex flex-col justify-center text-left">
              <div className="flex items-center gap-4 mb-6">
                <span className="text-gold text-[9px] font-bold uppercase tracking-[0.3em] flex items-center gap-2">
                  <Music size={12} /> Soundscape
                </span>
                <span className="text-zinc-500 dark:text-white/20 text-[9px] font-bold uppercase tracking-[0.3em]">{event.date}</span>
              </div>
              <h3 className="text-3xl font-serif font-bold italic mb-4 text-zinc-900 dark:text-white">{event.title}</h3>
              <p className="text-zinc-500 dark:text-white/40 text-[10px] uppercase tracking-widest font-bold leading-loose line-clamp-2 mb-8">{event.desc}</p>
              <div className="mt-auto flex items-center justify-between border-t border-zinc-100 dark:border-white/5 pt-6">
                <span className="text-[10px] font-bold uppercase tracking-widest text-gold">{event.time}</span>
                <button className="text-zinc-900 dark:text-white text-[9px] font-bold uppercase tracking-[0.3em] hover:text-gold transition-colors">
                  Details
                </button>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}


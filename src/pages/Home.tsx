import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { ArrowRight, Music, Utensils, Calendar, MapPin, Heart } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../hooks/useLanguage';
import { db } from '../lib/firebase';
import { collection, query, getDocs, limit, orderBy } from 'firebase/firestore';
import { SiteSettings, Moment } from '../types';

export default function Home() {
  const { t } = useLanguage();
  const [settings, setSettings] = useState<SiteSettings | null>(null);
  const [featuredMoments, setFeaturedMoments] = useState<Moment[]>([]);

  useEffect(() => {
    async function fetchData() {
      const settingsSnap = await getDocs(collection(db, 'settings'));
      if (!settingsSnap.empty) {
        setSettings({ id: settingsSnap.docs[0].id, ...settingsSnap.docs[0].data() } as SiteSettings);
      }
      
      const momentsSnap = await getDocs(query(collection(db, 'moments'), orderBy('date', 'desc'), limit(4)));
      setFeaturedMoments(momentsSnap.docs.map(d => ({ id: d.id, ...d.data() } as Moment)));
    }
    fetchData();
  }, []);

  return (
    <div className="space-y-24 pb-24 text-zinc-900 dark:text-[#F5F5F5]">
      {/* Hero Section */}
      <section className="relative h-[90vh] flex items-center overflow-hidden">
        <div className="absolute inset-0 z-0">
          <img 
            src={settings?.heroImage || "https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?auto=format&fit=crop&q=80&w=2000"} 
            alt="Hero Background" 
            className="w-full h-full object-cover opacity-60 scale-105"
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-6 w-full">
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
            className="max-w-2xl"
          >
            <h1 className="text-7xl md:text-8xl font-serif font-bold leading-none mb-6 text-zinc-900 dark:text-white">
              {settings?.heroTitle || t('heroTitle')} <br />
              <span className="text-gold italic">{settings?.heroSubtitle || t('heroAesthetics')}</span>
            </h1>
            <p className="text-sm uppercase tracking-[0.4em] text-white/60 mb-10 max-w-lg leading-loose">
              {t('heroTagline')}
            </p>
            <div className="flex flex-wrap gap-6">
              <Link to="/menu" className="btn-primary group">
                {t('exploreMenu')}
              </Link>
              <Link to="/reservations" className="btn-gold group">
                {t('bookTable')}
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Feature Section */}
      <section className="max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <motion.div 
            whileHover={{ y: -5 }}
            className="luxury-card flex flex-col items-start gap-6 border-l-4 border-l-primary"
          >
            <div className="w-12 h-12 bg-primary/10 flex items-center justify-center text-primary">
              <Utensils size={24} />
            </div>
            <div>
              <h3 className="text-xl font-serif italic mb-2 text-zinc-900 dark:text-white">{settings?.features?.[0]?.title || 'Live Terminal'}</h3>
              <p className="text-xs uppercase tracking-widest text-zinc-500 dark:text-white/40 leading-relaxed">{settings?.features?.[0]?.description || 'Exquisite local and international cuisine prepared by master chefs.'}</p>
            </div>
          </motion.div>

          <motion.div 
            whileHover={{ y: -5 }}
            className="luxury-card flex flex-col items-start gap-6 border-l-4 border-l-gold"
          >
            <div className="w-12 h-12 bg-gold/10 flex items-center justify-center text-gold">
              <Music size={24} />
            </div>
            <div>
              <h3 className="text-xl font-serif italic mb-2 text-zinc-900 dark:text-white">{settings?.features?.[1]?.title || 'Soundscapes'}</h3>
              <p className="text-xs uppercase tracking-widest text-zinc-500 dark:text-white/40 leading-relaxed">{settings?.features?.[1]?.description || 'Regular acoustic nights and live band performances under the stars.'}</p>
            </div>
          </motion.div>

          <motion.div 
            whileHover={{ y: -5 }}
            className="luxury-card flex flex-col items-start gap-6 border-l-4 border-l-white/20"
          >
            <div className="w-12 h-12 bg-white/5 flex items-center justify-center text-white/60">
              <Calendar size={24} />
            </div>
            <div>
              <h3 className="text-xl font-serif italic mb-2 text-zinc-900 dark:text-white">{settings?.features?.[2]?.title || 'Private Events'}</h3>
              <p className="text-xs uppercase tracking-widest text-zinc-500 dark:text-white/40 leading-relaxed">{settings?.features?.[2]?.description || 'Perfect venue for weddings, birthdays, and corporate celebrations.'}</p>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Recommended Section */}
      <section className="max-w-7xl mx-auto px-6">
        <div className="flex items-end justify-between mb-16 px-2">
          <div>
            <span className="text-[10px] uppercase tracking-[0.4em] text-gold font-bold mb-3 block">Selected for you</span>
            <h2 className="text-5xl font-serif font-bold italic">{t('featuredDelicacies')} <span className="text-zinc-200 dark:text-white/20">Delicacies</span></h2>
          </div>
          <Link to="/menu" className="text-[10px] uppercase tracking-widest font-bold border-b border-gold text-gold pb-1 hover:text-white hover:border-white transition-all">
            {t('seeSelection')}
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {[
            { name: 'Signature Steak', price: '₱850', img: 'https://images.unsplash.com/photo-1546833998-877b37c2e5c6?auto=format&fit=crop&q=80&w=600' },
            { name: 'Grilled Seafood Platter', price: '₱1,200', img: 'https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?auto=format&fit=crop&q=80&w=600' },
            { name: 'Crispy Pata Special', price: '₱750', img: 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&q=80&w=600' },
            { name: 'House Pasta', price: '₱450', img: 'https://images.unsplash.com/photo-1473093226795-af9932fe5856?auto=format&fit=crop&q=80&w=600' },
          ].map((item, id) => (
            <motion.div 
              key={id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: id * 0.1 }}
              viewport={{ once: true }}
              className="group cursor-pointer"
            >
              <div className="aspect-[4/5] overflow-hidden rounded-xl mb-6 grayscale group-hover:grayscale-0 transition-all duration-700">
                <img 
                  src={item.img} 
                  alt={item.name} 
                  className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110"
                  referrerPolicy="no-referrer"
                />
              </div>
              <p className="text-[10px] uppercase tracking-widest text-gold font-bold mb-2">{item.price}</p>
              <h4 className="text-xl font-serif italic mb-1 text-zinc-900 dark:text-white">{item.name}</h4>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Moments Gallery */}
      {featuredMoments.length > 0 && (
        <section className="max-w-7xl mx-auto px-6 overflow-hidden">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-16 px-2 gap-6">
            <div>
              <span className="text-[10px] uppercase tracking-[0.4em] text-gold font-bold mb-3 block">Guest Gallery</span>
              <h2 className="text-5xl font-serif font-bold italic">Happening <span className="text-zinc-200 dark:text-white/20">Moments</span></h2>
            </div>
            <p className="max-w-md text-xs uppercase tracking-widest text-zinc-500 dark:text-white/40 leading-loose">
              Captured experiences from our community. Join the conversation and share your visit with us.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {featuredMoments.map((moment, idx) => (
              <motion.div 
                key={moment.id}
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                transition={{ delay: idx * 0.1 }}
                viewport={{ once: true }}
                className="group relative aspect-[4/5] rounded-2xl overflow-hidden bg-zinc-900"
              >
                <img 
                  src={moment.imageUrl} 
                  alt={moment.title} 
                  className="w-full h-full object-cover grayscale transition-all duration-700 group-hover:grayscale-0 group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-80" />
                <div className="absolute bottom-0 left-0 right-0 p-6 translate-y-4 group-hover:translate-y-0 transition-transform">
                  <h4 className="text-lg font-serif italic text-white mb-1">{moment.title}</h4>
                  <p className="text-[9px] uppercase tracking-widest text-gold font-bold">{moment.description}</p>
                </div>
                {moment.featured && (
                  <div className="absolute top-4 left-4">
                    <Heart className="text-gold fill-gold" size={14} />
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        </section>
      )}

      {/* Location Section */}
      <section className="bg-zinc-50 dark:bg-zinc-950 border-y border-zinc-200 dark:border-zinc-800 py-24">
        <div className="max-w-7xl mx-auto px-4 flex flex-col md:flex-row items-center gap-12">
          <div className="md:w-1/2">
            <h2 className="text-4xl font-serif font-bold mb-8 text-zinc-900 dark:text-white">Visit Us Today</h2>
            <div className="space-y-6">
              <div className="flex gap-4">
                <MapPin className="text-gold shrink-0" />
                <p className="text-zinc-600 dark:text-zinc-300">National Highway, Tagoloan, Misamis Oriental, Philippines</p>
              </div>
              <div className="flex gap-4">
                <Calendar className="text-gold shrink-0" />
                <div>
                  <p className="text-zinc-900 dark:text-zinc-300 font-bold">Open Daily</p>
                  <p className="text-zinc-500 dark:text-zinc-400">10:00 AM - 12:00 MN (Sun-Thu)</p>
                  <p className="text-zinc-500 dark:text-zinc-400">10:00 AM - 02:00 AM (Fri-Sat)</p>
                </div>
              </div>
            </div>
          </div>
          <div className="md:w-1/2 w-full aspect-video rounded-3xl overflow-hidden grayscale contrast-125 opacity-70 border border-zinc-800">
            <iframe 
              src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d15783.332066827376!2d124.7470634!3d8.5158671!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x32ffbd23c10a4023%3A0x6d8f5c9e4367c30a!2sTagoloan%2C%20Misamis%20Oriental!5e0!3m2!1sen!2sph!4v1714350000000!5m2!1sen!2sph"
              className="w-full h-full border-0"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            ></iframe>
          </div>
        </div>
      </section>
    </div>
  );
}

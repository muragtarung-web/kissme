import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowRight, Music, Utensils, Calendar, MapPin, Heart, Star, Gift, Crown, ChevronRight, Zap, X, ChevronLeft, ShoppingBag } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useLanguage } from '../hooks/useLanguage';
import { useAuth } from '../hooks/useAuth';
import { useCart } from '../hooks/useCart';
import { db } from '../lib/firebase';
import { collection, query, getDocs, limit, orderBy, onSnapshot } from 'firebase/firestore';
import { SiteSettings, Moment, Event as AppEvent, Product } from '../types';
import { useLoading } from '../hooks/useLoading';
import toast from 'react-hot-toast';

export default function Home() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const { addToCart: addToCartContext } = useCart();
  const navigate = useNavigate();
  const { showLoading, hideLoading } = useLoading();
  const [settings, setSettings] = useState<SiteSettings | null>(null);
  const [featuredMoments, setFeaturedMoments] = useState<Moment[]>([]);
  const [events, setEvents] = useState<AppEvent[]>([]);
  const [featuredProducts, setFeaturedProducts] = useState<Product[]>([]);
  const [selectedProductForModal, setSelectedProductForModal] = useState<Product | null>(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  const addToCart = (product: Product, event: React.MouseEvent) => {
    if (!user) {
      toast.error('Please login to place an order');
      navigate('/login');
      return;
    }
    addToCartContext(product);
    toast.success(`${t('addToCart')} ${product.name}`, {
      icon: '🛒',
      style: {
        background: '#D4AF37',
        color: '#000',
        fontWeight: 'bold',
        fontSize: '10px',
        textTransform: 'uppercase',
        letterSpacing: '0.1em'
      }
    });
  };

  const defaultHeroImage = "https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?auto=format&fit=crop&q=80&w=2000";

  useEffect(() => {
    showLoading('Synchronizing Kiss Me experience...');
    let loadedCount = 0;
    const totalRequests = 4;

    const checkLoading = () => {
      loadedCount++;
      if (loadedCount >= totalRequests) {
        hideLoading();
      }
    };

    const unsubs = [
      onSnapshot(collection(db, 'settings'), (snap) => {
        if (!snap.empty) {
          setSettings({ id: snap.docs[0].id, ...snap.docs[0].data() } as SiteSettings);
        }
        checkLoading();
      }, () => checkLoading()),
      onSnapshot(query(collection(db, 'moments'), orderBy('date', 'desc'), limit(4)), (snap) => {
        setFeaturedMoments(snap.docs.map(d => ({ id: d.id, ...d.data() } as Moment)));
        checkLoading();
      }, () => checkLoading()),
      onSnapshot(query(collection(db, 'events'), orderBy('date'), limit(3)), (snap) => {
        setEvents(snap.docs.map(d => ({ id: d.id, ...d.data() } as AppEvent)));
        checkLoading();
      }, () => checkLoading()),
      onSnapshot(query(collection(db, 'products'), limit(100)), (snap) => {
        const allProds = snap.docs.map(d => ({ id: d.id, ...d.data() } as Product));
        // Show only available products, prioritized by 'featured' status
        setFeaturedProducts(allProds.filter(p => p.available).sort((a, b) => (b.featured ? 1 : 0) - (a.featured ? 1 : 0)));
        checkLoading();
      }, () => checkLoading())
    ];

    return () => unsubs.forEach(unsub => unsub());
  }, []);

  return (
    <div className="space-y-24 pb-24 text-zinc-900 dark:text-[#F5F5F5]">
      {/* Personalized Welcome for Customers */}
      <AnimatePresence>
        {user && (
          <motion.section 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-7xl mx-auto px-6 pt-12"
          >
            <div className="luxury-card overflow-hidden !p-0">
              <div className="flex flex-col md:flex-row">
                {/* Points & Tier */}
                <div className="p-8 bg-black md:w-1/3 flex flex-col justify-center items-center text-center space-y-4 border-r border-white/5">
                  <div className="relative">
                    <div className="w-24 h-24 rounded-full border-4 border-gold p-1">
                      <div className="w-full h-full rounded-full bg-zinc-900 flex items-center justify-center text-gold">
                        <Crown size={40} />
                      </div>
                    </div>
                    <div className="absolute -bottom-2 -right-2 bg-gold text-black rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-widest">
                      {user.tier}
                    </div>
                  </div>
                  <div>
                    <h3 className="text-white text-2xl font-serif italic">{user.displayName}</h3>
                    <p className="text-white/40 text-[10px] uppercase tracking-widest font-bold mt-1">Loyalty Member</p>
                  </div>
                  <div className="pt-4 w-full">
                    <div className="flex justify-between text-[10px] uppercase tracking-widest font-bold mb-2">
                      <span className="text-white/60">Points Balance</span>
                      <span className="text-gold">{user.points} pts</span>
                    </div>
                    <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gold transition-all duration-1000" 
                        style={{ width: `${Math.min((user.points / 1000) * 100, 100)}%` }}
                      />
                    </div>
                    <p className="text-[9px] text-white/30 text-right mt-2 uppercase tracking-tighter">
                      {user.points < 1000 ? `${1000 - user.points} pts to Silver` : user.points < 5000 ? `${5000 - user.points} pts to Gold` : 'Max Tier Reached'}
                    </p>
                  </div>
                </div>

                {/* Exclusive Actions */}
                <div className="p-8 flex-1 grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Link to="/reservations" className="group">
                    <div className="h-full luxury-card-sub p-6 hover:bg-white/[0.02] transition-all flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-gold/10 rounded-lg flex items-center justify-center text-gold">
                          <Star size={20} />
                        </div>
                        <div>
                          <h4 className="text-sm font-bold uppercase tracking-widest text-white">Priority Booking</h4>
                          <p className="text-[10px] text-white/40 uppercase mt-1">Skip the queue for tables</p>
                        </div>
                      </div>
                      <ChevronRight size={16} className="text-white/20 group-hover:text-gold group-hover:translate-x-1 transition-all" />
                    </div>
                  </Link>

                  <Link to="/menu" className="group">
                    <div className="h-full luxury-card-sub p-6 hover:bg-white/[0.02] transition-all flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center text-primary">
                          <Gift size={20} />
                        </div>
                        <div>
                          <h4 className="text-sm font-bold uppercase tracking-widest text-white">Special Offers</h4>
                          <p className="text-[10px] text-white/40 uppercase mt-1">Redeem your points</p>
                        </div>
                      </div>
                      <ChevronRight size={16} className="text-white/20 group-hover:text-primary group-hover:translate-x-1 transition-all" />
                    </div>
                  </Link>

                  <div className="h-full luxury-card-sub p-6 bg-gold/5 flex items-center gap-4 border border-gold/10">
                    <Zap size={20} className="text-gold" />
                    <div>
                      <h4 className="text-[10px] font-bold uppercase tracking-[0.2em] text-white">Guest Highlight</h4>
                      <p className="text-[11px] text-white/60 leading-tight mt-1 italic">"Your last visit was 5 days ago. We've missed you!"</p>
                    </div>
                  </div>

                  <div className="flex gap-4">
                     <div className="flex-1 luxury-card-sub p-4 flex flex-col justify-center text-center">
                        <span className="text-[14px] font-serif italic text-gold">15% OFF</span>
                        <span className="text-[8px] uppercase tracking-widest text-white/40">Birthday Month</span>
                     </div>
                     <div className="flex-1 luxury-card-sub p-4 flex flex-col justify-center text-center">
                        <span className="text-[14px] font-serif italic text-gold">FREE TICKET</span>
                        <span className="text-[8px] uppercase tracking-widest text-white/40">Next Event</span>
                     </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.section>
        )}
      </AnimatePresence>

      {/* Hero Section */}
      <section className="relative h-[90vh] flex items-center overflow-hidden">
        <div className="absolute inset-0 z-0">
          <img 
            src={settings?.heroImage || defaultHeroImage} 
            alt="Hero Background" 
            className="w-full h-full object-cover opacity-50 scale-105"
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0A0A0A] via-[#0A0A0A]/40 to-transparent" />
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-6 w-full text-left">
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
            className="max-w-3xl"
          >
            <h1 className="text-7xl md:text-9xl font-serif font-bold leading-[0.9] mb-6 text-white tracking-tighter">
              {settings?.heroTitle || t('heroTitle')} <br />
              <span className="text-gold italic font-light">{settings?.heroSubtitle || t('heroAesthetics')}</span>
            </h1>
            <p className="text-xs uppercase tracking-[0.5em] text-white/40 mb-10 max-w-lg leading-loose font-bold">
              {settings?.heroTagline || t('heroTagline')}
            </p>
            <div className="flex flex-wrap gap-6">
              <Link to="/menu" className="btn-primary py-4 px-10 text-[10px] tracking-[0.2em] uppercase font-bold">
                {t('exploreMenu')}
              </Link>
              <Link to="/reservations" className="bg-transparent border border-white/20 hover:border-gold hover:text-gold text-white py-4 px-10 text-[10px] tracking-[0.2em] uppercase font-bold transition-all">
                {t('bookTable')}
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Feature Section */}
      <section className="max-w-7xl mx-auto px-6">
        {settings?.featuresTitle && (
          <h2 className="text-4xl font-serif font-bold italic mb-12 text-center text-white">{settings.featuresTitle}</h2>
        )}
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

      {/* Guest CTA Section */}
      {!user && (
        <section className="max-w-7xl mx-auto px-6">
          <div className="luxury-card bg-primary/10 border-primary/20 p-12 text-center relative overflow-hidden">
            <div className="absolute -top-12 -left-12 w-48 h-48 bg-primary/10 rounded-full blur-3xl" />
            <div className="absolute -bottom-12 -right-12 w-48 h-48 bg-gold/10 rounded-full blur-3xl" />
            
            <div className="relative z-10">
              <span className="text-[10px] uppercase tracking-[0.4em] text-primary font-bold mb-6 block">Unlock More Experience</span>
              <h2 className="text-5xl font-serif font-bold italic mb-6 text-white">{settings?.ctaTitle || 'Join the Kiss me Store Circle'}</h2>
              <p className="max-w-xl mx-auto text-[11px] uppercase tracking-widest text-zinc-500 dark:text-white/40 leading-loose mb-10">
                {settings?.ctaDescription || 'Register as a member to earn points on every visit, unlock exclusive seasonal menus, and gain priority access to our most sought-after events.'}
              </p>
              <div className="flex justify-center gap-6">
                <Link to="/login" className="btn-primary">
                  Sign Up Now
                </Link>
                <Link to="/menu" className="text-[10px] uppercase tracking-widest font-bold border-b border-white/20 pb-1 hover:border-gold transition-all flex items-center gap-2">
                  Learn Benefits <ChevronRight size={14} />
                </Link>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Recommended Section */}
      <section className="max-w-7xl mx-auto px-6">
        <div className="flex items-end justify-between mb-16 px-2">
          <div>
            <span className="text-[10px] uppercase tracking-[0.4em] text-gold font-bold mb-3 block">Selected for you</span>
            <h2 className="text-5xl font-serif font-bold italic">{settings?.delicaciesTitle || t('featuredDelicacies')} <span className="text-zinc-200 dark:text-white/20">Delicacies</span></h2>
          </div>
          <Link to="/menu" className="text-[10px] uppercase tracking-widest font-bold border-b border-gold text-gold pb-1 hover:text-white hover:border-white transition-all">
            {t('seeSelection')}
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
          {featuredProducts.length > 0 ? featuredProducts.map((item, id) => (
            <motion.div 
              key={item.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: id * 0.05 }}
              viewport={{ once: true }}
              className="group cursor-pointer flex flex-col h-full bg-white/[0.02] border border-white/5 rounded-2xl p-4 hover:border-gold/30 hover:bg-white/[0.05] transition-all duration-500"
              onClick={() => {
                setSelectedProductForModal(item);
                setCurrentImageIndex(0);
              }}
            >
              <div className="aspect-square overflow-hidden rounded-xl mb-6 grayscale group-hover:grayscale-0 transition-all duration-700 bg-zinc-900 border border-white/10 relative">
                <img 
                  src={item.image} 
                  alt={item.name} 
                  className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110"
                  referrerPolicy="no-referrer"
                />
                {item.featured && (
                  <div className="absolute top-3 left-3 bg-gold text-black text-[8px] font-bold px-2 py-1 uppercase tracking-widest flex items-center gap-1 shadow-lg">
                    <Star size={10} className="fill-black" /> Signature
                  </div>
                )}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                  <span className="bg-white/10 backdrop-blur-md border border-white/20 text-white text-[9px] uppercase tracking-widest font-bold px-4 py-2 rounded-full">Read More</span>
                </div>
              </div>
              <div className="flex flex-col flex-1 px-2">
                <div className="flex justify-between items-start gap-2 mb-2">
                  <h4 className="text-xl font-serif italic text-white group-hover:text-gold transition-colors">{item.name}</h4>
                  <p className="text-sm font-bold text-gold whitespace-nowrap">₱{item.price}</p>
                </div>
                <p className="text-[9px] uppercase tracking-widest text-zinc-500 dark:text-white/40 font-bold leading-relaxed line-clamp-2 mt-auto">
                  {item.description}
                </p>
                <div className="mt-4 pt-4 border-t border-white/5 opacity-0 group-hover:opacity-100 transition-all transform translate-y-2 group-hover:translate-y-0">
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      addToCart(item, e);
                    }}
                    className="w-full py-2 bg-white/5 hover:bg-gold hover:text-black border border-white/10 hover:border-gold rounded text-[9px] uppercase font-bold tracking-widest transition-all"
                  >
                    Quick Add
                  </button>
                </div>
              </div>
            </motion.div>
          )) : (
            <div className="col-span-full py-20 text-center">
              <p className="text-[10px] uppercase tracking-[0.4em] text-white/20 font-bold">New selection arriving soon</p>
            </div>
          )}
        </div>
      </section>

      {/* Image Gallery Modal */}
      <AnimatePresence>
        {selectedProductForModal && (
          <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedProductForModal(null)}
              className="absolute inset-0 bg-black/95 backdrop-blur-xl"
            />
            
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-5xl md:h-[80vh] bg-black rounded-2xl overflow-hidden shadow-2xl flex flex-col md:flex-row shadow-gold/10 border border-white/5"
            >
              <button 
                onClick={() => setSelectedProductForModal(null)}
                className="absolute top-6 right-6 z-20 p-3 bg-black/50 text-white rounded-full hover:bg-white hover:text-black transition-all border border-white/10"
              >
                <X size={20} />
              </button>

              {/* Main Display */}
              <div className="flex-grow relative overflow-hidden bg-zinc-900 group min-h-[300px] md:min-h-0">
                <img 
                  src={(selectedProductForModal.images && selectedProductForModal.images.length > 0) 
                    ? selectedProductForModal.images[currentImageIndex] 
                    : selectedProductForModal.image || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&q=80&w=600'
                  } 
                  className="w-full h-full object-contain p-4"
                  referrerPolicy="no-referrer"
                />
                
                {selectedProductForModal.images && selectedProductForModal.images.length > 1 && (
                  <>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        setCurrentImageIndex(prev => prev > 0 ? prev - 1 : selectedProductForModal.images!.length - 1);
                      }}
                      className="absolute left-4 top-1/2 -translate-y-1/2 p-4 bg-black/50 text-white rounded-full opacity-0 group-hover:opacity-100 transition-all hover:bg-gold hover:text-black z-10"
                    >
                      <ChevronLeft size={24} />
                    </button>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        setCurrentImageIndex(prev => prev < selectedProductForModal.images!.length - 1 ? prev + 1 : 0);
                      }}
                      className="absolute right-4 top-1/2 -translate-y-1/2 p-4 bg-black/50 text-white rounded-full opacity-0 group-hover:opacity-100 transition-all hover:bg-gold hover:text-black z-10"
                    >
                      <ChevronRight size={24} />
                    </button>
                  </>
                )}
              </div>

              {/* Info Sidebar */}
              <div className="w-full md:w-96 bg-[#0D0D0D] p-8 flex flex-col border-l border-white/5 overflow-y-auto max-h-[50vh] md:max-h-none">
                <div className="flex-grow">
                  <span className="text-[10px] uppercase tracking-[0.4em] text-gold font-bold mb-4 block">Product Insight</span>
                  <h2 className="text-3xl font-serif italic text-white mb-4 leading-tight">{selectedProductForModal.name}</h2>
                  <p className="text-2xl font-serif text-gold mb-8">₱{selectedProductForModal.price}</p>
                  
                  <div className="space-y-6">
                    <div>
                      <h4 className="text-[10px] uppercase tracking-widest text-white/40 font-bold mb-2">Description</h4>
                      <p className="text-sm text-white/70 leading-relaxed font-medium">{selectedProductForModal.description}</p>
                    </div>

                    {selectedProductForModal.images && selectedProductForModal.images.length > 1 && (
                      <div>
                        <h4 className="text-[10px] uppercase tracking-widest text-white/40 font-bold mb-3">Gallery</h4>
                        <div className="grid grid-cols-4 gap-2">
                          {selectedProductForModal.images.map((img, idx) => (
                            <button 
                              key={idx}
                              onClick={() => setCurrentImageIndex(idx)}
                              className={`aspect-square rounded border transition-all overflow-hidden ${currentImageIndex === idx ? 'border-gold ring-1 ring-gold scale-105' : 'border-white/10 opacity-50 hover:opacity-100'}`}
                            >
                              <img src={img} className="w-full h-full object-cover shadow-sm" />
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="pt-8 mt-auto border-t border-white/5 space-y-4">
                  <button 
                    onClick={(e) => {
                      addToCart(selectedProductForModal, e as any);
                      setSelectedProductForModal(null);
                    }}
                    className="w-full py-5 bg-gold text-black font-bold uppercase tracking-[0.4em] text-[11px] hover:bg-white transition-all shadow-[0_0_30px_rgba(212,175,55,0.1)] rounded-sm"
                  >
                    Add to Order
                  </button>
                  <button 
                    onClick={() => setSelectedProductForModal(null)}
                    className="w-full text-[10px] text-white/40 hover:text-white uppercase font-bold tracking-widest transition-colors py-2"
                  >
                    Close Inspection
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Upcoming Happenings Section */}
      <section className="max-w-7xl mx-auto px-6">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-16 px-2 gap-6">
          <div>
            <span className="text-[10px] uppercase tracking-[0.4em] text-primary font-bold mb-3 block">Live Terminal</span>
            <h2 className="text-5xl font-serif font-bold italic">{settings?.eventsTitle || 'Upcoming Happenings'} <span className="text-zinc-200 dark:text-white/20">Happenings</span></h2>
          </div>
          <Link to="/events" className="text-[10px] uppercase tracking-widest font-bold border-b border-primary text-primary pb-1 hover:text-gold hover:border-gold transition-all">
            See All Events
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {events.length > 0 ? events.map((event, idx) => (
            <motion.div 
              key={event.id}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.15 }}
              viewport={{ once: true }}
              className="group luxury-card !p-0 overflow-hidden flex flex-col"
            >
              <div className="aspect-video relative overflow-hidden bg-zinc-900 border-b border-white/5">
                <img 
                  src={event.img || 'https://images.unsplash.com/photo-1543007630-9710e4a00a20?auto=format&fit=crop&q=80&w=1024'} 
                  alt={event.title} 
                  className="w-full h-full object-cover grayscale transition-all duration-700 group-hover:grayscale-0 group-hover:scale-110"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1543007630-9710e4a00a20?auto=format&fit=crop&q=80&w=1024';
                  }}
                />
                <div className="absolute top-4 left-4">
                  <span className="bg-primary px-3 py-1 text-[9px] font-bold uppercase tracking-widest text-white shadow-xl">Live Terminal</span>
                </div>
              </div>
              <div className="p-8 flex-1 flex flex-col items-start">
                <div className="flex items-center gap-4 mb-4">
                   <span className="text-gold text-[9px] font-bold uppercase tracking-[0.3em] flex items-center gap-2">
                      <Music size={12} /> Soundscape
                   </span>
                   <span className="text-zinc-400 dark:text-white/20 text-[9px] font-bold uppercase tracking-[0.3em]">{event.date}</span>
                </div>
                <h3 className="text-2xl font-serif font-bold italic mb-4 text-zinc-900 dark:text-white leading-tight">{event.title}</h3>
                <p className="text-zinc-500 dark:text-white/40 text-[10px] uppercase tracking-widest font-bold leading-loose line-clamp-2 mb-8">{event.desc}</p>
                <div className="mt-auto w-full pt-6 border-t border-zinc-100 dark:border-white/5 flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-gold">{event.time}</span>
                  <Link to="/events" className="text-zinc-900 dark:text-white text-[9px] font-bold uppercase tracking-[0.3em] hover:text-gold transition-colors flex items-center gap-2 group/btn">
                    RSVP <ChevronRight size={10} className="group-hover/btn:translate-x-1 transition-transform" />
                  </Link>
                </div>
              </div>
            </motion.div>
          )) : (
            <>
              {/* Static Fallback Event if DB is empty */}
              <motion.div 
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="group luxury-card !p-0 overflow-hidden flex flex-col lg:col-span-3 lg:flex-row h-72"
              >
                <div className="lg:w-1/3 relative h-full overflow-hidden bg-zinc-900">
                  <img 
                    src="https://images.unsplash.com/photo-1543007630-9710e4a00a20?auto=format&fit=crop&q=80&w=1024" 
                    alt="Coming Soon" 
                    className="w-full h-full object-cover grayscale opacity-50"
                  />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-gold uppercase tracking-[0.5em] text-[10px] font-bold border border-gold/40 px-6 py-2 bg-black/40 backdrop-blur-sm">Coming Soon</span>
                  </div>
                </div>
                <div className="lg:w-2/3 p-12 flex flex-col justify-center items-start text-left">
                  <span className="text-gold text-[10px] font-bold uppercase tracking-[0.4em] mb-4">Seasonal Feature</span>
                  <h3 className="text-4xl font-serif font-bold italic mb-4 text-zinc-900 dark:text-white">The Grand Anniversary <span className="text-zinc-200 dark:text-white/20 uppercase tracking-tighter not-italic text-2xl">Terminal</span></h3>
                  <p className="text-zinc-500 dark:text-white/40 text-[11px] uppercase tracking-widest font-bold leading-loose max-w-lg">
                    We are currently curating our next major culinary and musical experience. New events are scheduled and posted weekly.
                  </p>
                  <Link to="/events" className="mt-8 text-[10px] text-gold uppercase tracking-widest font-bold border-b border-gold pb-1 hover:text-white hover:border-white transition-all flex items-center gap-2">
                    Check Calendar <ArrowRight size={14} />
                  </Link>
                </div>
              </motion.div>
            </>
          )}
        </div>
      </section>

      {/* Moments Gallery */}
      {featuredMoments.length > 0 && (
        <section className="max-w-7xl mx-auto px-6 overflow-hidden">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-16 px-2 gap-6">
            <div>
              <span className="text-[10px] uppercase tracking-[0.4em] text-gold font-bold mb-3 block">Guest Gallery</span>
              <h2 className="text-5xl font-serif font-bold italic">{settings?.momentsTitle || 'Happening Moments'} <span className="text-zinc-200 dark:text-white/20">Moments</span></h2>
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
                  src={moment.imageUrl || 'https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?auto=format&fit=crop&q=80&w=1000'} 
                  alt={moment.title} 
                  className="w-full h-full object-cover grayscale transition-all duration-700 group-hover:grayscale-0 group-hover:scale-110"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?auto=format&fit=crop&q=80&w=1000';
                  }}
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

      {/* Member Exclusive Offers */}
      {user && (
        <section className="max-w-7xl mx-auto px-6">
          <div className="luxury-card border-gold/20 relative overflow-hidden bg-gradient-to-br from-zinc-900 to-black">
            <div className="absolute top-0 right-0 p-8 opacity-10">
              <Star size={120} className="text-gold" />
            </div>
            
            <div className="relative z-10">
              <span className="text-[10px] uppercase tracking-[0.4em] text-gold font-bold mb-4 block">Membership Perk</span>
              <h2 className="text-4xl font-serif font-bold italic mb-8">{settings?.membershipTitle || 'Exclusive Member Offers'} <span className="text-white/20 uppercase text-2xl not-italic tracking-tighter">Offers</span></h2>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="p-6 luxury-card-sub border-gold/10 group cursor-pointer hover:border-gold/30 transition-all">
                  <div className="flex justify-between items-start mb-4">
                    <div className="w-10 h-10 bg-gold/10 rounded flex items-center justify-center text-gold">
                      <Zap size={20} />
                    </div>
                    <span className="text-[10px] font-bold text-gold bg-gold/10 px-2 py-1 rounded">Flash Deal</span>
                  </div>
                  <h4 className="text-lg font-bold text-white mb-1">Buy 1 Take 1 Cocktails</h4>
                  <p className="text-[9px] text-white/40 uppercase tracking-widest font-bold mb-4">Every Wednesday Night</p>
                  <button className="text-[10px] text-gold uppercase tracking-widest font-bold flex items-center gap-2 group-hover:gap-4 transition-all">
                    Claim Reward <ArrowRight size={12} />
                  </button>
                </div>

                <div className="p-6 luxury-card-sub border-gold/10 group cursor-pointer hover:border-gold/30 transition-all">
                  <div className="flex justify-between items-start mb-4">
                    <div className="w-10 h-10 bg-gold/10 rounded flex items-center justify-center text-gold">
                      <Gift size={20} />
                    </div>
                    <span className="text-[10px] font-bold text-white/40 bg-white/5 px-2 py-1 rounded">200 pts</span>
                  </div>
                  <h4 className="text-lg font-bold text-white mb-1">Free Signature Dessert</h4>
                  <p className="text-[9px] text-white/40 uppercase tracking-widest font-bold mb-4">With total bill over ₱1,500</p>
                  <button className="text-[10px] text-gold uppercase tracking-widest font-bold flex items-center gap-2 group-hover:gap-4 transition-all">
                    Claim Reward <ArrowRight size={12} />
                  </button>
                </div>

                <div className="p-6 luxury-card-sub border-gold/10 group cursor-pointer hover:border-gold/30 transition-all">
                  <div className="flex justify-between items-start mb-4">
                    <div className="w-10 h-10 bg-gold/10 rounded flex items-center justify-center text-gold">
                      <Heart size={20} />
                    </div>
                    <span className="text-[10px] font-bold text-gold bg-gold/10 px-2 py-1 rounded">Member Only</span>
                  </div>
                  <h4 className="text-lg font-bold text-white mb-1">VIP Lounge Access</h4>
                  <p className="text-[9px] text-white/40 uppercase tracking-widest font-bold mb-4">Advance reservation required</p>
                  <button className="text-[10px] text-gold uppercase tracking-widest font-bold flex items-center gap-2 group-hover:gap-4 transition-all">
                    Claim Reward <ArrowRight size={12} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Location Section */}
      <section className="bg-black border-y border-white/5 py-24">
        <div className="max-w-7xl mx-auto px-4 flex flex-col md:flex-row items-center gap-12">
          <div className="md:w-1/2">
            <h2 className="text-4xl font-serif font-bold mb-8 text-white">{settings?.visitTitle || 'Visit Us Today'}</h2>
            <div className="space-y-6">
              <div className="flex gap-4">
                <MapPin className="text-gold shrink-0" />
                <p className="text-white/60">National Highway, Tagoloan, Misamis Oriental, Philippines</p>
              </div>
              <div className="flex gap-4">
                <Calendar className="text-gold shrink-0" />
                <div>
                  <p className="text-white font-bold">Open Daily</p>
                  <p className="text-white/40">10:00 AM - 12:00 MN (Sun-Thu)</p>
                  <p className="text-white/40">10:00 AM - 02:00 AM (Fri-Sat)</p>
                </div>
              </div>
            </div>
          </div>
          <div className="md:w-1/2 w-full aspect-video rounded-3xl overflow-hidden grayscale contrast-125 opacity-70 border border-white/10">
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

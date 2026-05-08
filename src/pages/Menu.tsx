import React, { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { collection, query, getDocs, where, orderBy, onSnapshot } from 'firebase/firestore';
import { Product, Category } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { Search, Filter, ShoppingBag, Star, X, ChevronLeft, ChevronRight } from 'lucide-react';
import toast from 'react-hot-toast';
import { useLanguage } from '../hooks/useLanguage';
import { handleFirestoreError, OperationType } from '../lib/firestore-errors';
import { useLoading } from '../hooks/useLoading';

import { useAuth } from '../hooks/useAuth';
import { useCart } from '../hooks/useCart';
import { useNavigate } from 'react-router-dom';

export default function Menu() {
  const { showLoading, hideLoading } = useLoading();
  const { addToCart: addToCartContext } = useCart();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const { t } = useLanguage();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [flyingIcons, setFlyingIcons] = useState<{ id: number; x: number; y: number; tx: number; ty: number; image: string }[]>([]);
  const [selectedProductForModal, setSelectedProductForModal] = useState<Product | null>(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  useEffect(() => {
    showLoading('Fetching culinary entities...');
    const unsubs = [
      onSnapshot(query(collection(db, 'categories'), orderBy('order')), (snap) => {
        setCategories(snap.docs.map(doc => ({ id: doc.id, ...doc.data() }) as Category));
      }, (error) => {
        handleFirestoreError(error, OperationType.GET, 'categories');
      }),
      onSnapshot(collection(db, 'products'), (snap) => {
        setProducts(snap.docs.map(doc => ({ id: doc.id, ...doc.data() }) as Product));
        setLoading(false);
        hideLoading();
      }, (error) => {
        handleFirestoreError(error, OperationType.GET, 'products');
        setLoading(false);
        hideLoading();
      })
    ];

    return () => unsubs.forEach(unsub => unsub());
  }, []);

  const filteredProducts = products.filter(p => {
    const matchesCategory = selectedCategory === 'all' || p.categoryId === selectedCategory;
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const addToCart = (product: Product, event: React.MouseEvent) => {
    if (!user) {
      toast.error('Please login to place an order');
      navigate('/login');
      return;
    }

    // Calculate target position
    const cartBtn = document.getElementById('cart-trigger');
    const target = cartBtn?.getBoundingClientRect();
    const tx = target ? target.left + target.width / 2 : window.innerWidth - 100;
    const ty = target ? target.top + target.height / 2 : 50;

    // Trigger flying animation
    const id = Date.now();
    setFlyingIcons(prev => [...prev, { 
      id, 
      x: event.clientX, 
      y: event.clientY, 
      tx,
      ty,
      image: product.image || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&q=80&w=600'
    }]);

    // Remove flying icon after animation
    setTimeout(() => {
      setFlyingIcons(prev => prev.filter(icon => icon.id !== id));
    }, 1000);

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

  return (
    <div className="max-w-7xl mx-auto px-4 py-12 text-zinc-900 dark:text-white">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-20 text-left">
        <div className="max-w-xl">
          <span className="text-[10px] uppercase tracking-[0.4em] text-gold font-bold mb-3 block">{t('selectionLabel')}</span>
          <h1 className="text-6xl font-serif font-bold italic leading-none">{t('menuTitleMain')} <span className="text-zinc-200 dark:text-white/20">{t('menuTitleSpan')}</span></h1>
        </div>
        
        <div className="flex items-center gap-4 bg-zinc-50 dark:bg-white/5 border border-zinc-200 dark:border-white/10 rounded-none px-6 py-4 w-full md:w-80 transition-colors">
          <Search size={16} className="text-zinc-400 dark:text-white/40" />
          <input 
            type="text" 
            placeholder={t('searchSelection')} 
            className="bg-transparent border-none outline-none text-[11px] uppercase tracking-widest font-bold w-full placeholder:text-zinc-300 dark:placeholder:text-white/20 text-zinc-900 dark:text-white"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Member Promo Banner */}
      {user && (
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="mb-16 bg-gold/10 border border-gold/20 p-8 flex flex-col md:flex-row items-center justify-between gap-6 overflow-hidden relative"
        >
          <div className="absolute -top-10 -right-10 opacity-5">
            <ShoppingBag size={120} />
          </div>
          <div className="flex items-center gap-6">
            <div className="w-14 h-14 bg-gold flex items-center justify-center text-black rounded-full shrink-0">
              <Star size={28} className="fill-black" />
            </div>
            <div>
              <h3 className="text-xl font-bold uppercase tracking-widest text-gold mb-1">Loyalty Exclusive: 2x Points</h3>
              <p className="text-[10px] uppercase tracking-widest text-white/60 font-bold">Earn double points on all "Hot Selection" items today only!</p>
            </div>
          </div>
          <button className="btn-gold !py-3 whitespace-nowrap">
            Redeem Points
          </button>
        </motion.div>
      )}

      <div className="flex items-start gap-16">
        {/* Categories Sidebar */}
        <aside className="hidden lg:block w-48 sticky top-32 text-left">
          <h3 className="text-[10px] uppercase tracking-[0.3em] text-primary font-bold mb-8">Index</h3>
          <ul className="space-y-6">
            <li>
              <button 
                onClick={() => setSelectedCategory('all')}
                className={`text-sm font-bold uppercase tracking-widest text-left w-full transition-all ${selectedCategory === 'all' ? 'text-gold' : 'text-zinc-400 dark:text-white/20 hover:text-zinc-900 dark:hover:text-white'}`}
              >
                {t('allEntities')}
              </button>
            </li>
            {categories.map(cat => (
              <li key={cat.id}>
                <button 
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`text-sm font-bold uppercase tracking-widest text-left w-full transition-all ${selectedCategory === cat.id ? 'text-gold' : 'text-zinc-400 dark:text-white/20 hover:text-zinc-900 dark:hover:text-white'}`}
                >
                  {cat.name}
                </button>
              </li>
            ))}
          </ul>
        </aside>

        {/* Main Menu Grid */}
        <div className="flex-grow">
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-10">
              {[1, 2, 3, 4, 5, 6].map(n => (
                <div key={n} className="h-96 bg-zinc-100 dark:bg-white/5 animate-pulse rounded-xl" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-10">
              <AnimatePresence mode="popLayout">
                {filteredProducts.map((p) => (
                  <motion.div
                    key={p.id}
                    layout
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex flex-col group text-left"
                  >
                    <div className="aspect-[4/5] rounded-xl overflow-hidden mb-8 relative transition-all duration-700 bg-zinc-100 dark:bg-white/5 cursor-zoom-in">
                      <img 
                        src={p.image || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&q=80&w=600'} 
                        alt={p.name} 
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000"
                        referrerPolicy="no-referrer"
                        onClick={() => {
                          setSelectedProductForModal(p);
                          setCurrentImageIndex(0);
                        }}
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&q=80&w=600';
                        }}
                      />
                      {p.bestSeller && (
                        <div className="absolute top-6 left-6 bg-primary text-white text-[9px] font-bold px-3 py-1 tracking-widest uppercase shadow-xl">
                          Hot Selection
                        </div>
                      )}
                    </div>
                    <div className="flex-grow space-y-2">
                       <p className="text-[10px] uppercase tracking-widest text-gold font-bold">₱{p.price}</p>
                       <h3 className="text-2xl font-serif italic text-zinc-900 dark:text-white">{p.name}</h3>
                       <p className="text-xs text-zinc-500 dark:text-white/40 leading-relaxed font-bold uppercase tracking-widest mt-2">{p.description}</p>
                    </div>
                    <button 
                      onClick={(e) => addToCart(p, e)}
                      className="mt-8 py-4 border border-zinc-200 dark:border-white/10 hover:border-zinc-900 dark:hover:border-white transition-all text-[10px] font-bold uppercase tracking-widest text-zinc-900 dark:text-white"
                    >
                      {t('addToCart') || 'Add to Order'}
                    </button>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>
      </div>

      {/* Flying Animation Layer */}
      <AnimatePresence>
        {flyingIcons.map(icon => (
          <motion.div
            key={icon.id}
            initial={{ 
              x: icon.x - 20, 
              y: icon.y - 20, 
              scale: 1,
              opacity: 1,
              rotate: 0
            }}
            animate={{ 
              x: icon.tx - 20, 
              y: icon.ty - 20, 
              scale: 0.1,
              opacity: 0,
              rotate: 360
            }}
            exit={{ opacity: 0 }}
            transition={{ 
              duration: 0.8, 
              ease: [0.4, 0, 0.2, 1],
              type: "tween"
            }}
            className="fixed top-0 left-0 w-12 h-12 rounded-full overflow-hidden border-2 border-gold z-[9999] pointer-events-none shadow-2xl"
          >
            <img src={icon.image} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
          </motion.div>
        ))}
      </AnimatePresence>

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
    </div>
  );
}

import { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { collection, query, getDocs, where, orderBy } from 'firebase/firestore';
import { Product, Category } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { Search, Filter, ShoppingBag } from 'lucide-react';
import toast from 'react-hot-toast';
import { useLanguage } from '../hooks/useLanguage';
import { handleFirestoreError, OperationType } from '../lib/firestore-errors';

import { useAuth } from '../hooks/useAuth';
import { useNavigate } from 'react-router-dom';

export default function Menu() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const { t } = useLanguage();
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    async function fetchData() {
      try {
        const catSnap = await getDocs(query(collection(db, 'categories'), orderBy('order')));
        const prodSnap = await getDocs(collection(db, 'products'));
        
        setCategories(catSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }) as Category));
        setProducts(prodSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }) as Product));
      } catch (error) {
        handleFirestoreError(error, OperationType.GET, 'menu_data');
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const filteredProducts = products.filter(p => {
    const matchesCategory = selectedCategory === 'all' || p.categoryId === selectedCategory;
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const addToCart = (product: Product) => {
    if (!user) {
      toast.error('Please login to place an order');
      navigate('/login');
      return;
    }
    toast.success(`${t('addToCart')} ${product.name}`);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-12 text-zinc-900 dark:text-white">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-20 text-left">
        <div className="max-w-xl">
          <span className="text-[10px] uppercase tracking-[0.4em] text-gold font-bold mb-3 block">Selection</span>
          <h1 className="text-6xl font-serif font-bold italic leading-none">{t('menuTitleMain')} <span className="text-zinc-200 dark:text-white/20">{t('menuTitleSpan')}</span></h1>
        </div>
        
        <div className="flex items-center gap-4 bg-zinc-50 dark:bg-white/5 border border-zinc-200 dark:border-white/10 rounded-none px-6 py-4 w-full md:w-80 transition-colors">
          <Search size={16} className="text-zinc-400 dark:text-white/40" />
          <input 
            type="text" 
            placeholder="Search Selection..." 
            className="bg-transparent border-none outline-none text-[11px] uppercase tracking-widest font-bold w-full placeholder:text-zinc-300 dark:placeholder:text-white/20 text-zinc-900 dark:text-white"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

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
                All Entities
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
                    <div className="aspect-[4/5] rounded-xl overflow-hidden mb-8 relative grayscale group-hover:grayscale-0 transition-all duration-700 bg-zinc-100 dark:bg-white/5">
                      <img 
                        src={p.image || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&q=80&w=600'} 
                        alt={p.name} 
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000"
                        referrerPolicy="no-referrer"
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
                      onClick={() => addToCart(p)}
                      className="mt-8 py-4 border border-zinc-200 dark:border-white/10 hover:border-zinc-900 dark:hover:border-white transition-all text-[10px] font-bold uppercase tracking-widest text-zinc-900 dark:text-white"
                    >
                      {t('addToCart')}
                    </button>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

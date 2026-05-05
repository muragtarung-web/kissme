import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Menu as MenuIcon, ShoppingCart, User, LogOut, ChevronRight, Globe, Award, Sun, Moon } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useLanguage } from '../hooks/useLanguage';
import { useTheme } from '../hooks/useTheme';
import { auth } from '../lib/firebase';
import { motion, AnimatePresence } from 'motion/react';
import { useState } from 'react';

export default function Layout({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const { language, setLanguage, t } = useLanguage();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const handleLogout = async () => {
    await auth.signOut();
    navigate('/');
  };

  const toggleLanguage = () => {
    setLanguage(language === 'en' ? 'fil' : 'en');
  };

  return (
    <div className="min-h-screen flex flex-col relative overflow-x-hidden">
      {/* Background Atmosphere */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="bg-glow-red" />
        <div className="bg-glow-gold" />
      </div>

      <header className="fixed top-0 left-0 right-0 z-50 bg-white/95 dark:bg-[#0A0A0A]/95 backdrop-blur-xl border-b border-zinc-200 dark:border-white/10 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <Link to="/" className="flex flex-col">
            <span className="text-2xl font-serif font-bold text-gold tracking-tight leading-none uppercase">Kiss me Store</span>
            <span className="text-[10px] uppercase tracking-[0.3em] text-zinc-500 dark:text-zinc-400 font-bold mt-1">Food Corner</span>
          </Link>

          <nav className="hidden md:flex items-center gap-8 text-[11px] font-bold uppercase tracking-[0.2em] text-zinc-800 dark:text-zinc-100">
            <Link to="/menu" className="hover:text-gold transition-colors font-bold">{t('navSelection')}</Link>
            <Link to="/events" className="hover:text-gold transition-colors font-bold">{t('navHappenings')}</Link>
            <Link to="/reservations" className="hover:text-gold transition-colors font-bold">{t('navTables')}</Link>
            {user?.role === 'admin' && (
              <Link to="/admin" className="text-primary hover:text-primary-hover transition-colors">{t('navTerminal')}</Link>
            )}
          </nav>

          <div className="flex items-center gap-4">
            <button 
              onClick={toggleTheme}
              className="p-2 hover:bg-zinc-100 dark:hover:bg-white/5 rounded-full transition-colors group"
              title="Toggle Theme"
            >
              {theme === 'light' ? (
                <Moon size={18} className="text-zinc-600 group-hover:text-gold" />
              ) : (
                <Sun size={18} className="text-zinc-300 group-hover:text-gold" />
              )}
            </button>

            <button 
              onClick={toggleLanguage}
              className="p-2 hover:bg-zinc-100 dark:hover:bg-white/5 rounded-full transition-colors flex items-center gap-2 group"
              title="Toggle Language"
            >
              <Globe size={18} className="text-zinc-600 dark:text-zinc-400 group-hover:text-gold" />
              <span className="text-[10px] font-bold uppercase text-zinc-600 dark:text-zinc-400 group-hover:text-gold">{language}</span>
            </button>

            <button className="p-2 hover:bg-zinc-100 dark:hover:bg-white/5 rounded-full transition-colors relative group">
              <ShoppingCart size={18} className="text-zinc-700 dark:text-zinc-200" />
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-primary text-[9px] text-white flex items-center justify-center rounded-full font-bold shadow-lg shadow-primary/40">0</span>
            </button>
            
            {user ? (
              <div className="flex items-center gap-6">
                <Link to="/profile" className="flex items-center gap-4 hover:opacity-80 transition-opacity group">
                  <div className="hidden lg:flex flex-col items-end">
                    <div className="flex items-center gap-1 text-gold text-[10px] font-bold uppercase tracking-wider group-hover:text-primary transition-colors">
                      <Award size={12} /> {user.tier}
                    </div>
                    <div className="text-[9px] text-zinc-500 dark:text-white/40 font-bold uppercase">{user.points} {t('points')}</div>
                  </div>
                  <div className="w-9 h-9 rounded-lg bg-zinc-100 dark:bg-surface border border-zinc-200 dark:border-white/10 overflow-hidden shadow-2xl group-hover:border-gold transition-colors">
                    <img src={user.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.displayName}`} alt="avatar" />
                  </div>
                </Link>
                <button onClick={handleLogout} className="p-2 hover:bg-zinc-100 dark:hover:bg-white/5 rounded-full transition-colors text-zinc-500 dark:text-zinc-400 hover:text-red-500" title="Logout">
                  <LogOut size={18} />
                </button>
              </div>
            ) : (
              <Link to="/login" className="px-6 py-2 bg-zinc-900 dark:bg-white text-zinc-100 dark:text-black text-[11px] font-bold uppercase tracking-[0.2em] transition-all hover:bg-gold dark:hover:bg-gold active:scale-95 shadow-lg shadow-black/10">
                {t('joinSystem')}
              </Link>
            )}
            
            <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="md:hidden p-2 hover:bg-zinc-100 dark:hover:bg-white/5 rounded-full transition-colors text-zinc-900 dark:text-white">
              <MenuIcon size={24} />
            </button>
          </div>
        </div>
      </header>

      <AnimatePresence>
        {isMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed inset-0 z-40 bg-black pt-24 px-4 md:hidden"
          >
            <nav className="flex flex-col gap-6 text-2xl font-serif">
              <Link onClick={() => setIsMenuOpen(false)} to="/menu" className="flex items-center justify-between border-b border-zinc-800 pb-4">
                <span>Menu</span>
                <ChevronRight className="text-gold" />
              </Link>
              <Link onClick={() => setIsMenuOpen(false)} to="/events" className="flex items-center justify-between border-b border-zinc-800 pb-4">
                <span>Events</span>
                <ChevronRight className="text-gold" />
              </Link>
              <Link onClick={() => setIsMenuOpen(false)} to="/reservations" className="flex items-center justify-between border-b border-zinc-800 pb-4">
                <span>Reservations</span>
                <ChevronRight className="text-gold" />
              </Link>
              {user?.role === 'admin' && (
                <Link onClick={() => setIsMenuOpen(false)} to="/admin" className="text-primary">Admin Portal</Link>
              )}
            </nav>
          </motion.div>
        )}
      </AnimatePresence>

      <main className="flex-grow pt-20">
        {children}
      </main>

      {/* Mobile Bottom Bar for Authenticated Users */}
      {user && (
        <div className="md:hidden fixed bottom-12 left-1/2 -translate-x-1/2 z-50 w-[90%] max-w-sm">
          <div className="bg-black/80 backdrop-blur-2xl border border-white/10 rounded-full px-6 py-4 flex items-center justify-between shadow-2xl">
            <Link to="/" className="flex flex-col items-center gap-1 group">
              <Sun size={20} className="text-white/40 group-hover:text-gold transition-colors" />
              <span className="text-[8px] uppercase tracking-tighter text-white/20 font-bold group-hover:text-gold">Home</span>
            </Link>
            <Link to="/menu" className="flex flex-col items-center gap-1 group">
              <ShoppingCart size={20} className="text-white/40 group-hover:text-gold transition-colors" />
              <span className="text-[8px] uppercase tracking-tighter text-white/20 font-bold group-hover:text-gold">Order</span>
            </Link>
            <Link to="/reservations" className="absolute -top-6 left-1/2 -translate-x-1/2">
              <div className="w-14 h-14 bg-gold rounded-full flex items-center justify-center text-black shadow-xl shadow-gold/20 border-4 border-black active:scale-90 transition-all">
                <MenuIcon size={24} />
              </div>
            </Link>
            <div className="w-14" /> {/* Spacer for central button */}
            <Link to="/events" className="flex flex-col items-center gap-1 group">
              <Award size={20} className="text-white/40 group-hover:text-gold transition-colors" />
              <span className="text-[8px] uppercase tracking-tighter text-white/20 font-bold group-hover:text-gold">Events</span>
            </Link>
            <Link to="/profile" className="flex flex-col items-center gap-1 group">
              <User size={20} className="text-white/40 group-hover:text-gold transition-colors" />
              <span className="text-[8px] uppercase tracking-tighter text-white/20 font-bold group-hover:text-gold">Me</span>
            </Link>
          </div>
        </div>
      )}

      <footer className="bg-zinc-950 border-t border-zinc-900 py-12">
        <div className="max-w-7xl mx-auto px-4 grid grid-cols-1 md:grid-cols-4 gap-12">
          <div className="col-span-1 md:col-span-2">
            <h3 className="text-2xl font-serif font-bold text-gold mb-4">Kiss me Store</h3>
            <p className="text-zinc-400 max-w-md">
              National Highway, Tagoloan, Misamis Oriental. Your premier destination for fine food, live music, and unforgettable events.
            </p>
          </div>
          <div>
            <h4 className="text-sm uppercase tracking-widest text-primary font-bold mb-6">Explore</h4>
            <ul className="space-y-4 text-zinc-400">
              <li><Link to="/menu" className="hover:text-white transition-colors">Menu</Link></li>
              <li><Link to="/events" className="hover:text-white transition-colors">Events</Link></li>
              <li><Link to="/posts" className="hover:text-white transition-colors">Our Story</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="text-sm uppercase tracking-widest text-primary font-bold mb-6">Connect</h4>
            <div className="space-y-4 text-zinc-400">
              <p>Tagoloan, Misamis Oriental</p>
              <p>+63 9XX XXX XXXX</p>
              <p>hello@kissme.ph</p>
            </div>
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-4 mt-12 pt-8 border-t border-zinc-900 text-center text-sm text-zinc-600">
          © 2026 Kiss me Store & Food Corner. All rights reserved.
        </div>
      </footer>
    </div>
  );
}

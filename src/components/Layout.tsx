import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Menu as MenuIcon, ShoppingCart, User, LogOut, ChevronRight, Globe, Award, Sun, Moon, Bell, Check, Mail } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useLanguage } from '../hooks/useLanguage';
import { useTheme } from '../hooks/useTheme';
import { useCart } from '../hooks/useCart';
import { auth, db } from '../lib/firebase';
import { motion, AnimatePresence } from 'motion/react';
import { useState, useEffect } from 'react';
import { collection, query, where, orderBy, onSnapshot, updateDoc, doc, limit, writeBatch } from 'firebase/firestore';
import { InAppNotification } from '../types';
import toast from 'react-hot-toast';
import CartDrawer from './CartDrawer';

const LogoK = ({ size = 18 }: { size?: number }) => (
  <div 
    style={{ width: size, height: size }} 
    className="bg-[#5D4037] rounded-full flex items-center justify-center border border-white/10 shadow-sm overflow-hidden"
  >
    <span className="text-white font-black leading-none select-none" style={{ fontSize: size * 0.6 }}>K</span>
  </div>
);

export default function Layout({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const { language, setLanguage, t } = useLanguage();
  const { theme, toggleTheme } = useTheme();
  const { itemCount } = useCart();
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [selectedNotification, setSelectedNotification] = useState<InAppNotification | null>(null);
  const [notifications, setNotifications] = useState<InAppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!user) {
      setNotifications([]);
      setUnreadCount(0);
      return;
    }

    const q = query(
      collection(db, 'inAppNotifications'),
      where('userId', '==', user.id),
      limit(50)
    );

    let firstLoad = true;
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const notifs = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() } as InAppNotification))
        .sort((a, b) => {
          const timeA = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : new Date(a.createdAt || 0).getTime();
          const timeB = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : new Date(b.createdAt || 0).getTime();
          return timeB - timeA;
        });
      
      // If there are new unread notifications that were just added (after first load)
      if (!firstLoad) {
        snapshot.docChanges().forEach((change) => {
          if (change.type === 'added') {
            const data = change.doc.data() as InAppNotification;
            if (!data.read) {
              toast.success(data.title + ': ' + data.message, {
                icon: '🔔',
                duration: 5000,
                position: 'top-right',
                style: {
                  background: '#0D0D0D',
                  color: '#fff',
                  border: '1px solid rgba(255,215,0,0.2)',
                  fontSize: '11px',
                  fontWeight: 'bold',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em'
                }
              });
            }
          }
        });
      }
      
      setNotifications(notifs);
      setUnreadCount(notifs.filter(n => !n.read).length);
      firstLoad = false;
    }, (error) => {
      console.error('Notification channel error:', error);
      if (error.message.includes('The query requires an index')) {
        console.warn('CRITICAL: Composite index missing for inAppNotifications. Check Firebase console.');
      }
    });

    return () => unsubscribe();
  }, [user]);

  const markAsRead = async (id: string) => {
    try {
      await updateDoc(doc(db, 'inAppNotifications', id), { read: true });
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  };

  const handleNotificationClick = (n: InAppNotification) => {
    setSelectedNotification(n);
    if (!n.read) {
      markAsRead(n.id);
    }
    setIsNotificationsOpen(false);
  };

  const markAllAsRead = async () => {
    const unread = notifications.filter(n => !n.read);
    if (unread.length === 0) return;

    try {
      const batch = writeBatch(db);
      unread.forEach(n => {
        batch.update(doc(db, 'inAppNotifications', n.id), { read: true });
      });
      await batch.commit();
      setIsNotificationsOpen(false);
    } catch (error) {
      console.error('Failed to mark all as read:', error);
    }
  };

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

      <CartDrawer isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} />

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

          <div className="flex items-center gap-2 md:gap-4">
            <button 
              onClick={toggleTheme}
              className="p-1.5 md:p-2 hover:bg-zinc-100 dark:hover:bg-white/5 rounded-full transition-colors group"
              title="Toggle Theme"
            >
              {theme === 'light' ? (
                <Moon size={16} className="md:size-[18px] text-zinc-600 group-hover:text-gold" />
              ) : (
                <Sun size={16} className="md:size-[18px] text-zinc-300 group-hover:text-gold" />
              )}
            </button>

            <button 
              onClick={toggleLanguage}
              className="p-1 md:p-1.5 hover:bg-zinc-100 dark:hover:bg-white/5 rounded-full transition-colors flex items-center gap-1 md:gap-2 group"
              title="Toggle Language"
            >
              <LogoK size={18} />
              <span className="text-[9px] md:text-[10px] font-bold uppercase text-zinc-600 dark:text-zinc-400 group-hover:text-gold">{language}</span>
            </button>

            <button 
              onClick={() => setIsCartOpen(true)}
              className="p-1.5 md:p-2 hover:bg-zinc-100 dark:hover:bg-white/5 rounded-full transition-colors relative group"
            >
              <ShoppingCart size={16} className="md:size-[18px] text-zinc-700 dark:text-zinc-200" />
              <span className="absolute -top-1 -right-1 w-3.5 h-3.5 md:w-4 md:h-4 bg-primary text-[8px] md:text-[9px] text-white flex items-center justify-center rounded-full font-bold shadow-lg shadow-primary/40">{itemCount}</span>
            </button>

            {user && (
              <div className="relative">
                <button 
                  onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
                  className="p-2 hover:bg-zinc-100 dark:hover:bg-white/5 rounded-full transition-colors relative group"
                  title="Notifications"
                >
                  <Bell size={18} className={`${unreadCount > 0 ? 'text-gold fill-gold/10 animate-swing' : 'text-zinc-700 dark:text-zinc-200'}`} />
                  {unreadCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-[8px] text-white flex items-center justify-center rounded-full font-bold border-2 border-white dark:border-[#0A0A0A]">
                      {unreadCount}
                    </span>
                  )}
                </button>

                <AnimatePresence>
                  {isNotificationsOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      className="absolute right-0 mt-4 w-[calc(100vw-2rem)] md:w-80 bg-white dark:bg-[#0D0D0D] border border-zinc-200 dark:border-white/10 rounded-2xl shadow-2xl overflow-hidden z-[60]"
                    >
                      <div className="p-4 border-b border-zinc-100 dark:border-white/5 flex items-center justify-between bg-zinc-50/50 dark:bg-white/5">
                        <h3 className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 dark:text-white/40">Operation Updates</h3>
                        {unreadCount > 0 && (
                          <button 
                            onClick={markAllAsRead}
                            className="text-[9px] font-bold text-gold hover:underline uppercase tracking-tighter"
                          >
                            Mark all read
                          </button>
                        )}
                      </div>

                      <div className="max-h-[350px] overflow-y-auto">
                        {notifications.length > 0 ? (
                          <div className="divide-y divide-zinc-100 dark:divide-white/5">
                            {notifications.map((n) => (
                              <div 
                                key={n.id} 
                                className={`p-4 hover:bg-zinc-50 dark:hover:bg-white/5 transition-colors cursor-pointer relative group ${!n.read ? 'bg-gold/[0.03]' : ''}`}
                                onClick={() => handleNotificationClick(n)}
                              >
                                <div className="flex gap-3">
                                  <div className={`mt-1 p-1.5 rounded-lg ${
                                    n.type === 'order' ? 'bg-blue-500/10 text-blue-500' : 
                                    n.type === 'reservation' ? 'bg-gold/10 text-gold' : 'bg-zinc-100 dark:bg-white/5 text-zinc-500'
                                  }`}>
                                    {n.type === 'order' ? <ShoppingCart size={14} /> : <Mail size={14} />}
                                  </div>
                                  <div className="flex-1 text-left">
                                    <p className={`text-[11px] font-bold leading-tight mb-1 ${!n.read ? 'text-zinc-900 dark:text-zinc-100' : 'text-zinc-500 dark:text-zinc-400'}`}>
                                      {n.title}
                                    </p>
                                    <p className="text-[10px] text-zinc-500 dark:text-zinc-500 leading-relaxed line-clamp-2">
                                      {n.message}
                                    </p>
                                    <p className="text-[8px] text-zinc-400 dark:text-zinc-600 mt-2 font-mono uppercase">
                                      {n.createdAt?.toDate ? n.createdAt.toDate().toLocaleString() : 
                                       (n.createdAt ? new Date(n.createdAt).toLocaleString() : 'Recent')}
                                    </p>
                                  </div>
                                  {!n.read && (
                                    <div className="w-1.5 h-1.5 rounded-full bg-gold mt-1 group-hover:scale-125 transition-transform" />
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="py-12 px-6 text-center">
                            <Bell size={24} className="mx-auto text-zinc-200 dark:text-white/5 mb-4" />
                            <p className="text-[10px] uppercase font-bold tracking-widest text-zinc-400 dark:text-white/20">No active updates in logs</p>
                          </div>
                        )}
                      </div>

                      {notifications.length > 0 && (
                        <Link 
                          to="/profile" 
                          onClick={() => setIsNotificationsOpen(false)}
                          className="block py-3 text-center text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-white/5 border-t border-zinc-100 dark:border-white/5 transition-colors"
                        >
                          View Activity Log
                        </Link>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}
            
            {user ? (
              <div className="hidden md:flex items-center gap-6">
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
              <Link to="/login" className="hidden md:flex px-6 py-2 bg-zinc-900 dark:bg-white text-zinc-100 dark:text-black text-[11px] font-bold uppercase tracking-[0.2em] transition-all hover:bg-gold dark:hover:bg-gold active:scale-95 shadow-lg shadow-black/10">
                {t('joinSystem')}
              </Link>
            )}

            <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="p-2 hover:bg-zinc-100 dark:hover:bg-white/5 rounded-full transition-colors text-zinc-900 dark:text-white">
              <MenuIcon size={20} className="md:size-6" />
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
            <nav className="flex flex-col gap-4 text-2xl font-serif">
              <Link onClick={() => setIsMenuOpen(false)} to="/menu" className="flex items-center justify-between border-b border-zinc-900 pb-4">
                <span>Menu</span>
                <ChevronRight className="text-gold" />
              </Link>
              <Link onClick={() => setIsMenuOpen(false)} to="/events" className="flex items-center justify-between border-b border-zinc-900 pb-4">
                <span>Events</span>
                <ChevronRight className="text-gold" />
              </Link>
              <Link onClick={() => setIsMenuOpen(false)} to="/reservations" className="flex items-center justify-between border-b border-zinc-900 pb-4">
                <span>Reservations</span>
                <ChevronRight className="text-gold" />
              </Link>
              <Link onClick={() => setIsMenuOpen(false)} to="/profile" className="flex items-center justify-between border-b border-zinc-900 pb-4">
                <span>Profile</span>
                <ChevronRight className="text-gold" />
              </Link>
              {user?.role === 'admin' && (
                <Link onClick={() => setIsMenuOpen(false)} to="/admin" className="text-primary border-b border-zinc-900 pb-4">Admin Portal</Link>
              )}
              
              {!user ? (
                <Link 
                  to="/login" 
                  onClick={() => setIsMenuOpen(false)}
                  className="mt-4 w-full bg-gold text-black py-4 rounded-xl text-sm font-bold uppercase tracking-widest text-center"
                >
                  Join System
                </Link>
              ) : (
                <button 
                  onClick={() => {
                    handleLogout();
                    setIsMenuOpen(false);
                  }}
                  className="mt-4 flex items-center justify-center gap-3 w-full bg-red-500/10 text-red-500 py-4 rounded-xl text-sm font-bold uppercase tracking-widest border border-red-500/20"
                >
                  <LogOut size={18} /> Logout
                </button>
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
        <div className="md:hidden fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] w-[92%] max-w-sm">
          <div className="bg-black/90 backdrop-blur-3xl border border-white/10 rounded-2xl px-6 py-4 flex items-center justify-between shadow-2xl">
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

      <AnimatePresence>
        {selectedNotification && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedNotification(null)}
              className="absolute inset-0 bg-black/95 backdrop-blur-xl"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-sm bg-[#0D0D0D] border border-white/5 rounded-3xl overflow-hidden shadow-2xl p-8"
            >
              <button 
                onClick={() => setSelectedNotification(null)}
                className="absolute top-6 right-6 text-white/20 hover:text-white transition-colors"
              >
                <Check size={20} />
              </button>

              <div className="flex flex-col items-center text-center space-y-6 mt-4">
                <div className={`p-4 rounded-2xl ${
                  selectedNotification.type === 'order' ? 'bg-blue-500/10 text-blue-500' : 
                  selectedNotification.type === 'reservation' ? 'bg-gold/10 text-gold' : 'bg-zinc-100 dark:bg-white/5 text-zinc-400 dark:text-white/40'
                }`}>
                  {selectedNotification.type === 'order' ? <ShoppingCart size={32} /> : <Mail size={32} />}
                </div>

                <div>
                  <h3 className="text-xl font-serif italic text-white mb-2 uppercase tracking-wide">{selectedNotification.title}</h3>
                  <p className="text-[10px] text-white/20 font-mono uppercase tracking-[0.2em]">
                    {selectedNotification.createdAt?.toDate ? selectedNotification.createdAt.toDate().toLocaleString() : 
                     (selectedNotification.createdAt ? new Date(selectedNotification.createdAt).toLocaleString() : 'Recent')}
                  </p>
                </div>

                <div className="w-full h-px bg-white/5" />

                <p className="text-white/60 leading-relaxed text-sm">
                  {selectedNotification.message}
                </p>

                {selectedNotification.referenceId && (
                  <div className="pt-4">
                    <span className="text-[10px] uppercase font-bold text-gold bg-gold/5 px-4 py-2 rounded-lg border border-gold/10">
                      Ref: #{selectedNotification.referenceId.slice(-8).toUpperCase()}
                    </span>
                  </div>
                )}

                <button 
                  onClick={() => setSelectedNotification(null)}
                  className="w-full bg-gold text-black py-4 rounded-sm text-[10px] uppercase font-bold tracking-widest hover:bg-white transition-colors"
                >
                  Confirm Receipt
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

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
        <div className="max-w-7xl mx-auto px-4 mt-12 pt-8 border-t border-zinc-900 relative flex flex-col md:flex-row justify-center items-center gap-4 text-sm text-zinc-600">
          <div className="text-center">© 2026 Kiss me Store & Food Corner. All rights reserved.</div>
          <div className="md:absolute md:right-4 text-[10px] uppercase tracking-widest font-bold">
            Develop by : <span className="text-gold">ELMAR R, FUNCION</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

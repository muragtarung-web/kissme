import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, ShoppingBag, Plus, Minus, Trash2, ArrowRight } from 'lucide-react';
import { useCart } from '../hooks/useCart';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { db, auth } from '../lib/firebase';
import { collection, addDoc } from 'firebase/firestore';
import { handleFirestoreError, OperationType } from '../lib/firestore-errors';
import { useLoading } from '../hooks/useLoading';

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function CartDrawer({ isOpen, onClose }: CartDrawerProps) {
  const { items, updateQuantity, removeFromCart, total, clearCart } = useCart();
  const { showLoading, hideLoading } = useLoading();
  const navigate = useNavigate();
  const [tableNumber, setTableNumber] = useState('');

  const handleCheckout = async () => {
    if (items.length === 0) return;
    if (!auth.currentUser) {
      toast.error('Please login to place an order');
      navigate('/login');
      onClose();
      return;
    }

    try {
      showLoading('Transmitting order to culinary team...');
      const orderRef = await addDoc(collection(db, 'orders'), {
        items: items.map(item => ({
          productId: item.product.id,
          name: item.product.name,
          price: item.product.price,
          image: item.product.image,
          quantity: item.quantity
        })),
        total,
        status: 'pending',
        type: 'Online',
        tableNumber: tableNumber || 'N/A',
        customerId: auth.currentUser.uid,
        customerName: auth.currentUser.displayName || 'Guest',
        createdAt: new Date(),
        statusHistory: [{
          status: 'pending',
          timestamp: new Date(),
          note: 'Order submitted via mobile terminal'
        }]
      });

      // Add in-app notification for the customer
      await addDoc(collection(db, 'inAppNotifications'), {
        userId: auth.currentUser.uid,
        title: 'Order Received',
        message: `Your order #${orderRef.id.slice(-6)} (₱${total}) has been received and is being processed by our kitchen.`,
        read: false,
        createdAt: new Date(),
        type: 'order',
        referenceId: orderRef.id
      });

      onClose();
      toast.success('Electronic order received! Kitchen is preparing your tray.', {
        duration: 5000,
        icon: '🍳'
      });
      clearCart();
      setTableNumber('');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'orders');
      toast.error('Order submission encountered a terminal error.');
    } finally {
      hideLoading();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100]"
          />

          {/* Drawer */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed top-0 right-0 bottom-0 w-full max-w-sm bg-white dark:bg-[#0D0D0D] border-l border-zinc-200 dark:border-white/10 z-[101] shadow-2xl flex flex-col"
          >
            <div className="p-6 border-b border-zinc-100 dark:border-white/5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShoppingBag className="text-gold" size={20} />
                <h2 className="text-sm font-bold uppercase tracking-widest text-zinc-900 dark:text-white">Your Tray</h2>
              </div>
              <button 
                onClick={onClose}
                className="p-2 hover:bg-zinc-100 dark:hover:bg-white/5 rounded-full transition-colors text-zinc-500"
              >
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {items.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center space-y-4">
                  <div className="w-16 h-16 rounded-full bg-zinc-50 dark:bg-white/5 flex items-center justify-center text-zinc-300 dark:text-white/10">
                    <ShoppingBag size={32} />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-zinc-900 dark:text-white uppercase tracking-wider">Empty Tray</p>
                    <p className="text-xs text-zinc-500 dark:text-white/40 mt-1">Add some treats from our menu</p>
                  </div>
                  <button 
                    onClick={() => { onClose(); navigate('/menu'); }}
                    className="text-[10px] font-bold text-gold uppercase tracking-[0.2em] hover:opacity-70 transition-opacity"
                  >
                    Go to Menu
                  </button>
                </div>
              ) : (
                items.map((item) => (
                  <div key={item.product.id} className="flex gap-4">
                    <div className="w-16 h-16 rounded-xl bg-zinc-50 dark:bg-white/5 border border-zinc-100 dark:border-white/5 overflow-hidden shrink-0">
                      <img src={item.product.image} alt={item.product.name} className="w-full h-full object-cover" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-xs font-bold text-zinc-900 dark:text-white truncate uppercase tracking-tight">{item.product.name}</h4>
                      <p className="text-[10px] text-zinc-500 dark:text-white/40 mt-0.5">₱{item.product.price}</p>
                      <div className="flex items-center gap-3 mt-2">
                        <div className="flex items-center border border-zinc-200 dark:border-white/10 rounded-lg">
                          <button 
                            onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                            className="p-1 hover:text-gold transition-colors text-zinc-500"
                          >
                            <Minus size={12} />
                          </button>
                          <span className="text-[10px] font-bold w-6 text-center">{item.quantity}</span>
                          <button 
                            onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                            className="p-1 hover:text-gold transition-colors text-zinc-500"
                          >
                            <Plus size={12} />
                          </button>
                        </div>
                        <button 
                          onClick={() => removeFromCart(item.product.id)}
                          className="text-red-500/40 hover:text-red-500 transition-colors"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>
                    <div className="text-xs font-bold text-zinc-900 dark:text-white">
                      ₱{Number(item.product.price) * item.quantity}
                    </div>
                  </div>
                ))
              )}
            </div>

            {items.length > 0 && (
              <div className="p-6 border-t border-zinc-100 dark:border-white/5 bg-zinc-50/50 dark:bg-white/[0.02] space-y-4">
                <div className="space-y-2">
                  <label className="text-[9px] font-bold text-zinc-400 dark:text-white/40 uppercase tracking-widest block text-left">Your Table Number (Optional)</label>
                  <input 
                    type="text"
                    placeholder="e.g. 5"
                    className="w-full bg-white dark:bg-white/5 border border-zinc-200 dark:border-white/10 rounded-lg px-3 py-2 text-xs focus:border-gold outline-none text-zinc-900 dark:text-white transition-colors"
                    value={tableNumber}
                    onChange={(e) => setTableNumber(e.target.value)}
                  />
                </div>

                <div className="flex justify-between items-center text-sm">
                  <span className="text-zinc-500 dark:text-white/40 uppercase tracking-widest text-[10px] font-bold">Total Bill</span>
                  <span className="text-zinc-900 dark:text-white font-serif italic text-lg">₱{total}</span>
                </div>
                <button 
                  onClick={handleCheckout}
                  className="w-full h-14 bg-zinc-900 dark:bg-white text-white dark:text-black rounded-xl text-[11px] font-bold uppercase tracking-[0.2em] flex items-center justify-center gap-2 hover:bg-gold dark:hover:bg-gold transition-all active:scale-95 group shadow-xl shadow-black/10"
                >
                  Confirm Order <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                </button>
                <p className="text-[9px] text-center text-zinc-400 dark:text-white/20 uppercase tracking-widest leading-relaxed">
                  Service standard apply. Please wait for a crew member to verify your digital order.
                </p>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

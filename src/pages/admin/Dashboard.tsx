import { useState, useEffect } from 'react';
import React from 'react';
import { db, auth } from '../../lib/firebase';
import { collection, query, getDocs, limit, orderBy, onSnapshot, addDoc, updateDoc, deleteDoc, doc, arrayUnion, writeBatch } from 'firebase/firestore';
import { motion } from 'motion/react';
import { 
  TrendingUp, Users, ShoppingCart, AlertCircle, 
  BarChart3, Settings, Package, Calendar, 
  LayoutDashboard, Plus, DollarSign, Edit, Trash2, X, Search,
  Camera, Globe, Heart, Bell, ArrowRight, Eye
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { Order, Product, Category, Event as AppEvent, Moment, SiteSettings, Reminder, Reservation } from '../../types';
import toast from 'react-hot-toast';
import { handleFirestoreError, OperationType } from '../../lib/firestore-errors';

type AdminView = 'overview' | 'menu' | 'events' | 'orders' | 'pos' | 'moments' | 'site' | 'reminders';

export default function AdminDashboard() {
  const [view, setView] = useState<AdminView>('overview');
  const [orders, setOrders] = useState<Order[]>([]);
  const [orderSearch, setOrderSearch] = useState('');
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [events, setEvents] = useState<AppEvent[]>([]);
  const [moments, setMoments] = useState<Moment[]>([]);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [siteSettings, setSiteSettings] = useState<SiteSettings | null>(null);
  const [loading, setLoading] = useState(true);

  // POS states
  const [posCart, setPosCart] = useState<{product: Product, quantity: number}[]>([]);
  const [posSearch, setPosSearch] = useState('');
  const [posCategory, setPosCategory] = useState('all');
  const [posPaymentMethod, setPosPaymentMethod] = useState<'Cash' | 'Card' | 'GCash' | 'Maya' | 'Split Payment'>('Cash');

  // Form states
  const [showProductModal, setShowProductModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [showEventModal, setShowEventModal] = useState(false);
  const [editingEvent, setEditingEvent] = useState<AppEvent | null>(null);
  const [showMomentModal, setShowMomentModal] = useState(false);
  const [editingMoment, setEditingMoment] = useState<Moment | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [selectedOrderIds, setSelectedOrderIds] = useState<string[]>([]);

  const [showBatchStatusModal, setShowBatchStatusModal] = useState(false);

  const [showOrderModal, setShowOrderModal] = useState(false);
  const [showReminderModal, setShowReminderModal] = useState(false);
  const [showReminderPreview, setShowReminderPreview] = useState(false);
  const [reminderPreviewData, setReminderPreviewData] = useState({ subject: '', message: '' });
  const [selectedEventIdForReminder, setSelectedEventIdForReminder] = useState<string | null>(null);
  const [editingReminder, setEditingReminder] = useState<Reminder | null>(null);

  useEffect(() => {
    const unsub = onSnapshot(query(collection(db, 'orders'), orderBy('createdAt', 'desc')), (snap) => {
      setOrders(snap.docs.map(doc => ({ id: doc.id, ...doc.data() }) as Order));
    });
    
    fetchCMSData();
    return () => unsub();
  }, []);

  const handleSaveReminder = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const reminderData = {
      eventId: formData.get('eventId') as string,
      message: formData.get('message') as string,
      subject: formData.get('subject') as string,
      scheduledAt: formData.get('scheduledAt') as string,
      type: formData.get('type') as 'email' | 'in-app' | 'both',
      status: 'scheduled' as const,
    };

    try {
      if (editingReminder) {
        await updateDoc(doc(db, 'reminders', editingReminder.id), reminderData);
        toast.success('Reminder updated');
      } else {
        await addDoc(collection(db, 'reminders'), reminderData);
        toast.success('Reminder scheduled');
      }
      setShowReminderModal(false);
      setEditingReminder(null);
      fetchCMSData();
    } catch (error) {
      handleFirestoreError(error, editingReminder ? OperationType.UPDATE : OperationType.CREATE, 'reminders');
    }
  };

  const sendReminder = async (reminder: Reminder) => {
    try {
      toast.loading('Dispatching communications...', { id: 'sending' });
      
      const eventAttendees = reservations.filter(r => r.eventId === reminder.eventId && r.type === 'event' && r.status === 'confirmed');
      const event = events.find(e => e.id === reminder.eventId);
      
      if (reminder.type === 'in-app' || reminder.type === 'both') {
        const notificationPromises = eventAttendees.map(attendee => {
          return addDoc(collection(db, 'notifications'), {
            userId: attendee.customerId,
            title: reminder.subject || (event ? `Reminder: ${event.title}` : 'Event Reminder'),
            message: reminder.message,
            read: false,
            createdAt: new Date().toISOString(),
            eventId: reminder.eventId
          });
        });
        await Promise.all(notificationPromises);
      }

      // Mark as sent
      await updateDoc(doc(db, 'reminders', reminder.id), {
        status: 'sent',
        sentAt: new Date().toISOString()
      });

      toast.success(`Broadcase successful to ${eventAttendees.length} participants`, { id: 'sending' });
      fetchCMSData();
    } catch (error) {
      toast.error('Dispatch failed', { id: 'sending' });
    }
  };

  const deleteReminder = async (id: string) => {
    if (!confirm('Are you sure?')) return;
    try {
      await deleteDoc(doc(db, 'reminders', id));
      toast.success('Reminder deleted');
      fetchCMSData();
    } catch (error) {
      toast.error('Deletion failed');
    }
  };

  const calculateDailySales = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    return orders
      .filter(order => {
        const orderDate = order.createdAt?.toDate ? order.createdAt.toDate() : new Date(order.createdAt);
        return orderDate >= today && order.status === 'completed';
      })
      .reduce((total, order) => total + order.total, 0);
  };

  const fetchCMSData = async () => {
    try {
      const prodSnap = await getDocs(collection(db, 'products'));
      const catSnap = await getDocs(collection(db, 'categories'));
      const eventSnap = await getDocs(query(collection(db, 'events'), orderBy('date')));
      const momentSnap = await getDocs(query(collection(db, 'moments'), orderBy('date', 'desc')));
      const settingsSnap = await getDocs(collection(db, 'settings'));
      const reminderSnap = await getDocs(query(collection(db, 'reminders'), orderBy('scheduledAt', 'desc')));
      const reservationSnap = await getDocs(collection(db, 'reservations'));

      setProducts(prodSnap.docs.map(d => ({ id: d.id, ...d.data() } as Product)));
      setCategories(catSnap.docs.map(d => ({ id: d.id, ...d.data() } as Category)));
      setEvents(eventSnap.docs.map(d => ({ id: d.id, ...d.data() } as AppEvent)));
      setMoments(momentSnap.docs.map(d => ({ id: d.id, ...d.data() } as Moment)));
      setReminders(reminderSnap.docs.map(d => ({ id: d.id, ...d.data() } as Reminder)));
      setReservations(reservationSnap.docs.map(d => ({ id: d.id, ...d.data() } as Reservation)));
      
      if (!settingsSnap.empty) {
        setSiteSettings({ id: settingsSnap.docs[0].id, ...settingsSnap.docs[0].data() } as SiteSettings);
      }
      
      setLoading(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, 'cms_data');
    }
  };

  const handleSaveProduct = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const productData = {
      name: formData.get('name') as string,
      description: formData.get('description') as string,
      price: Number(formData.get('price')),
      categoryId: formData.get('categoryId') as string,
      image: formData.get('image') as string,
      available: formData.get('available') === 'on',
      trackInventory: formData.get('trackInventory') === 'on',
      stock: Number(formData.get('stock')) || 0,
      bestSeller: formData.get('bestSeller') === 'on',
    };

    try {
      if (editingProduct) {
        await updateDoc(doc(db, 'products', editingProduct.id), productData);
        toast.success('Entity updated');
      } else {
        await addDoc(collection(db, 'products'), productData);
        toast.success('Entity added');
      }
      setShowProductModal(false);
      setEditingProduct(null);
      fetchCMSData();
    } catch (error) {
      handleFirestoreError(error, editingProduct ? OperationType.UPDATE : OperationType.CREATE, 'products');
    }
  };

  const deleteProduct = async (id: string) => {
    if (!confirm('Are you sure?')) return;
    try {
      await deleteDoc(doc(db, 'products', id));
      toast.success('Entity removed');
      fetchCMSData();
    } catch (error) {
      toast.error('Deletion failed');
    }
  };

  const addToPOSCart = (product: Product) => {
    if (product.trackInventory && (product.stock === undefined || product.stock <= 0)) {
      toast.error(`${product.name} is out of stock`);
      return;
    }

    setPosCart(prev => {
      const existing = prev.find(item => item.product.id === product.id);
      if (existing) {
        if (product.trackInventory && product.stock !== undefined && existing.quantity >= product.stock) {
          toast.error(`Max current stock reached for ${product.name}`);
          return prev;
        }
        return prev.map(item => 
          item.product.id === product.id 
            ? { ...item, quantity: item.quantity + 1 } 
            : item
        );
      }
      return [...prev, { product, quantity: 1 }];
    });
    toast.success(`${product.name} added`, { duration: 800, position: 'bottom-right' });
  };

  const updateQuantity = (productId: string, delta: number) => {
    setPosCart(prev => prev.map(item => {
      if (item.product.id === productId) {
        const product = item.product;
        const newQty = item.quantity + delta;
        
        if (delta > 0 && product.trackInventory && product.stock !== undefined && newQty > product.stock) {
          toast.error(`Stock limit reached`);
          return item;
        }
        
        return { ...item, quantity: Math.max(0, newQty) };
      }
      return item;
    }).filter(item => item.quantity > 0));
  };

  const handleCheckout = async () => {
    if (posCart.length === 0) return;
    
    const total = posCart.reduce((acc, item) => acc + (item.product.price * item.quantity), 0);
    
    try {
      toast.loading('Processing transaction...', { id: 'checkout' });
      
      // Create the order
      await addDoc(collection(db, 'orders'), {
        items: posCart.map(item => ({
          id: item.product.id,
          name: item.product.name,
          price: item.product.price,
          quantity: item.quantity
        })),
        total,
        status: 'completed',
        type: 'Terminal',
        paymentMethod: posPaymentMethod,
        customerId: auth.currentUser?.uid || 'Terminal',
        createdAt: new Date()
      });

      // Deduct stock
      for (const item of posCart) {
        if (item.product.trackInventory && item.product.stock !== undefined) {
          const newStock = Math.max(0, item.product.stock - item.quantity);
          await updateDoc(doc(db, 'products', item.product.id), { stock: newStock });
        }
      }
      
      setPosCart([]);
      toast.success('Transaction Completed', { id: 'checkout' });
      fetchCMSData(); // Refresh product data to show updated stock
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'pos_checkout');
      toast.error('Checkout failed', { id: 'checkout' });
    }
  };

  const batchUpdateOrderStatus = async (status: string) => {
    if (selectedOrderIds.length === 0) return;
    
    try {
      toast.loading(`Updating ${selectedOrderIds.length} orders...`, { id: 'batch-update' });
      const batch = writeBatch(db);
      
      selectedOrderIds.forEach(id => {
        const orderRef = doc(db, 'orders', id);
        batch.update(orderRef, { 
          status,
          statusHistory: arrayUnion({
            status,
            timestamp: new Date(),
            note: `Bulk Status Update`
          })
        });
      });
      
      await batch.commit();
      setSelectedOrderIds([]);
      toast.success('Orders updated successfully', { id: 'batch-update' });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'bulk_orders');
      toast.error('Batch update failed', { id: 'batch-update' });
    }
  };

  const toggleOrderSelection = (id: string) => {
    setSelectedOrderIds(prev => 
      prev.includes(id) ? prev.filter(oid => oid !== id) : [...prev, id]
    );
  };

  const toggleAllOrders = () => {
    const filteredOrders = orders.filter(order => 
      order.id.toLowerCase().includes(orderSearch.toLowerCase()) ||
      order.status.toLowerCase().includes(orderSearch.toLowerCase()) ||
      (order.customerId && order.customerId.toLowerCase().includes(orderSearch.toLowerCase()))
    );
    
    if (selectedOrderIds.length === filteredOrders.length) {
      setSelectedOrderIds([]);
    } else {
      setSelectedOrderIds(filteredOrders.map(o => o.id));
    }
  };

  const updateOrderStatus = async (id: string, status: string) => {
    try {
      await updateDoc(doc(db, 'orders', id), { 
        status,
        statusHistory: arrayUnion({
          status,
          timestamp: new Date(),
          note: `System Status Update`
        })
      });
      toast.success(`Order set to ${status}`, { position: 'bottom-right' });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `orders/${id}`);
    }
  };

  const handleSaveEvent = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const eventData = {
      title: formData.get('title') as string,
      desc: formData.get('desc') as string,
      date: formData.get('date') as string,
      time: formData.get('time') as string,
      img: formData.get('img') as string,
    };

    try {
      if (editingEvent) {
        await updateDoc(doc(db, 'events', editingEvent.id), eventData);
        toast.success('Happening updated');
      } else {
        await addDoc(collection(db, 'events'), eventData);
        toast.success('Happening scheduled');
      }
      setShowEventModal(false);
      setEditingEvent(null);
      fetchCMSData();
    } catch (error) {
      handleFirestoreError(error, editingEvent ? OperationType.UPDATE : OperationType.CREATE, 'events');
    }
  };

  const deleteEvent = async (id: string) => {
    if (!confirm('Are you sure?')) return;
    try {
      await deleteDoc(doc(db, 'events', id));
      toast.success('Happening removed');
      fetchCMSData();
    } catch (error) {
      toast.error('Deletion failed');
    }
  };

  const handleSaveMoment = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const momentData = {
      title: formData.get('title') as string,
      description: formData.get('description') as string,
      imageUrl: formData.get('imageUrl') as string,
      featured: formData.get('featured') === 'on',
      date: new Date().toISOString(),
    };

    try {
      if (editingMoment) {
        await updateDoc(doc(db, 'moments', editingMoment.id), momentData);
        toast.success('Moment updated');
      } else {
        await addDoc(collection(db, 'moments'), momentData);
        toast.success('Moment posted');
      }
      setShowMomentModal(false);
      setEditingMoment(null);
      fetchCMSData();
    } catch (error) {
      handleFirestoreError(error, editingMoment ? OperationType.UPDATE : OperationType.CREATE, 'moments');
    }
  };

  const deleteMoment = async (id: string) => {
    if (!confirm('Are you sure?')) return;
    try {
      await deleteDoc(doc(db, 'moments', id));
      toast.success('Moment removed');
      fetchCMSData();
    } catch (error) {
      toast.error('Deletion failed');
    }
  };

  const handleSaveSettings = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const settingsData = {
      heroTitle: formData.get('heroTitle') as string,
      heroSubtitle: formData.get('heroSubtitle') as string,
      heroImage: formData.get('heroImage') as string,
      features: [
        { title: formData.get('feature_0_title'), description: formData.get('feature_0_desc'), icon: 'Utensils' },
        { title: formData.get('feature_1_title'), description: formData.get('feature_1_desc'), icon: 'Music' },
        { title: formData.get('feature_2_title'), description: formData.get('feature_2_desc'), icon: 'Calendar' }
      ]
    };

    try {
      if (siteSettings) {
        await updateDoc(doc(db, 'settings', siteSettings.id), settingsData);
        toast.success('Site settings updated');
      } else {
        await addDoc(collection(db, 'settings'), settingsData);
        toast.success('Site settings initialized');
      }
      fetchCMSData();
    } catch (error) {
      handleFirestoreError(error, siteSettings ? OperationType.UPDATE : OperationType.CREATE, 'settings');
    }
  };

  const seedDatabase = async () => {
    const categoriesSeed = [
      { name: 'Entrees', order: 1, active: true },
      { name: 'Main Courses', order: 2, active: true },
      { name: 'Desserts', order: 3, active: true },
      { name: 'Beverages', order: 4, active: true },
    ];

    const productsSeed = [
      { name: 'Ribeye Steak', description: 'Premium Angus beef, garlic butter, asparagus', price: 1250, categoryName: 'Main Courses', image: 'https://images.unsplash.com/photo-1600891964599-f61ba0e24092?auto=format&fit=crop&q=80&w=800' },
      { name: 'Lobster Bisque', description: 'Creamy lobster soup, cognac, tarragon', price: 450, categoryName: 'Entrees', image: 'https://images.unsplash.com/photo-1547592166-23ac45744acd?auto=format&fit=crop&q=80&w=800' },
      { name: 'Cold Brew Coffee', description: '24-hour steeped arabica blend', price: 180, categoryName: 'Beverages', image: 'https://images.unsplash.com/photo-1517701604599-bb29b565090c?auto=format&fit=crop&q=80&w=800' }
    ];

    const eventsSeed = [
      { title: 'Jazz Ensemble Live', desc: 'Elegant evening with smooth jazz performances.', date: 'May 12, 2026', time: '20:00', img: 'https://images.unsplash.com/photo-1514525253361-bee8718a300c?auto=format&fit=crop&q=80&w=800' }
    ];

    try {
      toast.loading('Initializing terminal data...');
      const catIds: Record<string, string> = {};
      
      for (const cat of categoriesSeed) {
        const docRef = await addDoc(collection(db, 'categories'), cat);
        catIds[cat.name] = docRef.id;
      }

      for (const prod of productsSeed) {
        const { categoryName, ...rest } = prod;
        await addDoc(collection(db, 'products'), { ...rest, categoryId: catIds[categoryName] || '' });
      }

      for (const event of eventsSeed) {
        await addDoc(collection(db, 'events'), event);
      }

      toast.dismiss();
      toast.success('Terminal initialized');
      fetchCMSData();
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'seed_data');
    }
  };

  return (
    <div className="flex bg-white dark:bg-[#0A0A0A] min-h-screen text-zinc-900 dark:text-[#F5F5F5]">
      {/* Admin Sidebar */}
      <aside className="w-72 h-screen sticky top-0 bg-zinc-50 dark:bg-[#0D0D0D] border-r border-zinc-200 dark:border-white/5 flex flex-col z-10">
        <div className="p-8 border-b border-zinc-200 dark:border-white/5">
          <h1 className="text-gold font-serif text-2xl tracking-tight leading-none uppercase">Kiss Me</h1>
          <p className="text-[10px] uppercase tracking-widest text-zinc-400 dark:text-white/40 mt-2 font-bold">Terminal Control</p>
        </div>
        
        <nav className="flex-1 p-4 space-y-1">
          <AdminNavItem 
            icon={<LayoutDashboard size={14} />} 
            label="Live Center" 
            active={view === 'overview'} 
            onClick={() => setView('overview')}
          />
          <AdminNavItem 
            icon={<Package size={14} />} 
            label="Selection CMS" 
            active={view === 'menu'} 
            onClick={() => setView('menu')}
          />
          <AdminNavItem 
            icon={<Calendar size={14} />} 
            label="Events CMS" 
            active={view === 'events'} 
            onClick={() => setView('events')}
          />
          <AdminNavItem 
            icon={<Camera size={14} />} 
            label="Moments" 
            active={view === 'moments'} 
            onClick={() => setView('moments')}
          />
          <AdminNavItem 
            icon={<ShoppingCart size={14} />} 
            label="Orders Center" 
            active={view === 'orders'} 
            onClick={() => setView('orders')}
          />
          <AdminNavItem 
            icon={<BarChart3 size={14} />} 
            label="POS Terminal" 
            active={view === 'pos'} 
            onClick={() => setView('pos')}
          />
          <AdminNavItem 
            icon={<Globe size={14} />} 
            label="Site Settings" 
            active={view === 'site'} 
            onClick={() => setView('site')}
          />
          <AdminNavItem 
            icon={<Bell size={14} />} 
            label="Reminders" 
            active={view === 'reminders'} 
            onClick={() => setView('reminders')}
          />
          <AdminNavItem icon={<Users size={14} />} label="Staff & Shifts" />
        </nav>

        <div className="p-6 bg-zinc-100 dark:bg-[#050505] border-t border-zinc-200 dark:border-white/5">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded bg-gradient-to-br from-gold to-[#8E6E32] flex items-center justify-center font-bold text-black text-xs">AD</div>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-tight text-zinc-900 dark:text-white">Admin Portal</p>
              <p className="text-[9px] text-zinc-400 dark:text-white/40 uppercase tracking-widest font-bold">System Secure</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Command Center */}
      <main className="flex-1 flex flex-col overflow-y-auto">
        {/* Top Stats Ribbon */}
        <div className="h-20 bg-white/40 dark:bg-black/40 backdrop-blur-md border-b border-zinc-200 dark:border-white/5 flex items-center px-10 justify-between shrink-0 text-zinc-900 dark:text-white">
          <div className="flex space-x-12">
            <RibbonStat label="Daily Sales" value={`₱${calculateDailySales().toLocaleString()}`} />
            <RibbonStat label="Active Guests" value="84" live />
            <RibbonStat label="Queue" value={`${orders.filter(o => o.status === 'pending').length} Pending`} />
          </div>
          <div className="flex gap-4">
            {view === 'menu' && (
              <button 
                onClick={() => { setEditingProduct(null); setShowProductModal(true); }}
                className="btn-primary py-2 px-6 flex items-center gap-2 text-[10px] font-bold tracking-widest uppercase"
              >
                <Plus size={14} /> Add Product
              </button>
            )}
            <button 
              onClick={() => setView('pos')}
              className={`px-6 py-2 text-[10px] font-bold uppercase tracking-[0.2em] shadow-xl transition-all ${view === 'pos' ? 'bg-gold text-white' : 'bg-white text-black hover:bg-gold'}`}
            >
              Quick POS
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="p-10">
          {view === 'overview' && (
            <div className="space-y-10">
              <header>
                <h1 className="text-4xl font-serif italic mb-2 text-zinc-900 dark:text-white">Command <span className="text-zinc-200 dark:text-white/20">Center</span></h1>
                <p className="text-[10px] uppercase tracking-widest text-zinc-400 dark:text-white/40 font-bold">Global terminal overview for Tagoloan Branch</p>
              </header>

              <div className="grid grid-cols-12 gap-8">
                {/* Featured Live Event Card */}
                <div className="col-span-8 bg-zinc-50 dark:bg-[#121212] rounded-xl overflow-hidden border border-zinc-200 dark:border-white/10 flex flex-col relative group shadow-2xl min-h-[400px]">
                  <div className="h-48 w-full bg-[url('https://images.unsplash.com/photo-1514525253344-f21ce0bb71d6?q=80&w=1024&auto=format&fit=crop')] bg-cover bg-center">
                    <div className="absolute inset-0 bg-gradient-to-t from-white dark:from-[#121212] via-transparent to-transparent"></div>
                  </div>
                  <div className="p-10 text-zinc-900 dark:text-white">
                    <div className="flex gap-2 mb-4">
                      <span className="px-3 py-1 bg-primary text-[10px] text-white font-bold uppercase tracking-widest">Hot Event</span>
                      <span className="px-3 py-1 bg-zinc-900/10 dark:bg-black/60 backdrop-blur-sm text-[10px] font-bold uppercase tracking-widest text-zinc-600 dark:text-white font-bold">Live Terminal</span>
                    </div>
                    <h2 className="text-4xl font-serif italic mb-4">Acoustic Night Terminal</h2>
                    <p className="text-zinc-500 dark:text-white/40 text-sm leading-relaxed max-w-lg mb-8 uppercase tracking-widest font-bold">
                      Active monitoring of guest RSVPs and floor management.
                    </p>
                    <div className="flex items-center space-x-4">
                       <div className="w-10 h-10 rounded-full bg-gold/10 flex items-center justify-center text-gold text-xs font-bold">+45</div>
                       <p className="text-[11px] uppercase tracking-widest text-gold font-bold">45 RSVPs Locked</p>
                    </div>
                  </div>
                </div>

                {/* Real-time incoming list */}
                <div className="col-span-4 flex flex-col gap-4">
                  <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] px-2 text-zinc-400 dark:text-white/40">Incoming Feed</h3>
                  <div className="bg-zinc-50 dark:bg-black/40 border border-zinc-200 dark:border-white/5 rounded-xl p-4 space-y-4">
                    {orders.map(order => (
                      <div key={order.id} className="p-4 bg-white dark:bg-white/[0.03] border border-zinc-200 dark:border-white/10 rounded items-start flex justify-between">
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-tight text-gold">#{order.id.slice(-6)} • {order.type || 'Standard'}</p>
                          <p className="text-[9px] text-zinc-400 dark:text-white/40 font-bold uppercase tracking-widest mt-1">Processing...</p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs font-bold text-zinc-900 dark:text-white">₱{order.total || '0'}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {view === 'menu' && (
            <div className="space-y-10">
              <header>
                <h1 className="text-4xl font-serif italic mb-2 text-zinc-900 dark:text-white">Selection <span className="text-zinc-200 dark:text-white/20">Control</span></h1>
                <p className="text-[10px] uppercase tracking-widest text-zinc-400 dark:text-white/40 font-bold">Manage your culinary library and availability</p>
              </header>

              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {products.map(p => (
                  <div key={p.id} className="bg-zinc-50 dark:bg-[#121212] border border-zinc-200 dark:border-white/5 rounded-xl p-6 group relative shadow-sm hover:shadow-xl transition-all duration-300">
                    <div className="aspect-video rounded-lg overflow-hidden mb-4 opacity-60 group-hover:opacity-100 transition-opacity">
                      <img src={p.image} alt={p.name} className="w-full h-full object-cover" />
                    </div>
                        <div className="flex justify-between items-start mb-2">
                           <h3 className="font-serif italic text-xl text-zinc-900 dark:text-white">{p.name}</h3>
                           <div className="text-right">
                             <p className="text-gold font-bold text-sm">₱{p.price}</p>
                             {p.trackInventory && (
                               <p className={`text-[9px] font-bold uppercase tracking-widest ${p.stock && p.stock < 10 ? 'text-red-500' : 'text-zinc-400 dark:text-white/40'}`}>
                                 Stock: {p.stock || 0}
                               </p>
                             )}
                           </div>
                        </div>
                    <p className="text-[10px] text-zinc-500 dark:text-white/40 uppercase tracking-widest font-bold line-clamp-2">{p.description}</p>
                    
                    <div className="mt-6 pt-6 border-t border-zinc-200 dark:border-white/5 flex gap-4">
                      <button 
                        onClick={() => { setEditingProduct(p); setShowProductModal(true); }}
                        className="flex-1 py-2 bg-zinc-100 dark:bg-white/5 hover:bg-zinc-200 dark:hover:bg-white/10 text-[9px] font-bold uppercase tracking-widest transition-all flex items-center justify-center gap-2 text-zinc-900 dark:text-white"
                      >
                        <Edit size={12} /> Edit
                      </button>
                      <button 
                        onClick={() => deleteProduct(p.id)}
                        className="p-2 bg-primary/10 hover:bg-primary/20 text-primary transition-all rounded"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {view === 'events' && (
            <div className="space-y-10">
              <header className="flex justify-between items-end">
                <div>
                  <h1 className="text-4xl font-serif italic mb-2 text-zinc-900 dark:text-white">Happenings <span className="text-zinc-200 dark:text-white/20">Control</span></h1>
                  <p className="text-[10px] uppercase tracking-widest text-zinc-400 dark:text-white/40 font-bold">Global event management and sound terminals</p>
                </div>
                <button 
                  onClick={() => { setEditingEvent(null); setShowEventModal(true); }}
                  className="btn-gold py-2 px-6 text-[10px] uppercase tracking-widest font-bold"
                >
                  Schedule Event
                </button>
              </header>

              <div className="space-y-4">
                {events.map(event => (
                  <div key={event.id} className="bg-zinc-50 dark:bg-[#121212] border border-zinc-200 dark:border-white/5 p-6 rounded-xl flex items-center justify-between group">
                    <div className="flex items-center gap-8">
                       <div className="w-24 h-16 rounded overflow-hidden grayscale group-hover:grayscale-0 transition-all border border-zinc-200 dark:border-white/5 text-zinc-900 dark:text-white">
                         <img src={event.img} className="w-full h-full object-cover" />
                       </div>
                       <div>
                         <p className="text-gold text-[10px] font-bold uppercase tracking-widest mb-1">{event.date} • {event.time}</p>
                         <h3 className="font-serif italic text-2xl text-zinc-900 dark:text-white">{event.title}</h3>
                       </div>
                    </div>
                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                       <button 
                         onClick={() => { 
                           setSelectedEventIdForReminder(event.id); 
                           setEditingReminder(null); 
                           setReminderPreviewData({ subject: '', message: '' });
                           setShowReminderModal(true); 
                         }}
                         className="p-2 hover:bg-gold/10 rounded text-gold/60 hover:text-gold"
                         title="Schedule Reminder"
                       >
                         <Bell size={16} />
                       </button>
                       <button 
                         onClick={() => { setEditingEvent(event); setShowEventModal(true); }}
                         className="p-2 hover:bg-zinc-100 dark:hover:bg-white/5 rounded text-zinc-400 dark:text-white/60 hover:text-zinc-900 dark:hover:text-white"
                       >
                         <Edit size={16} />
                       </button>
                       <button className="p-2 hover:bg-red-500/10 rounded text-red-500" onClick={() => deleteEvent(event.id)}>
                         <Trash2 size={16} />
                       </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {view === 'orders' && (
            <div className="space-y-10">
              <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                  <h1 className="text-4xl font-serif italic mb-2 text-zinc-900 dark:text-white">Order <span className="text-zinc-200 dark:text-white/20">Terminal</span></h1>
                  <p className="text-[10px] uppercase tracking-widest text-zinc-400 dark:text-white/40 font-bold">Live flow of guest transactions and fulfillment</p>
                </div>
                <div className="flex items-center gap-4">
                  {selectedOrderIds.length > 0 && (
                    <div className="flex items-center gap-3 bg-zinc-100 dark:bg-gold/10 border border-zinc-200 dark:border-gold/20 px-4 py-2 rounded-xl animate-in fade-in slide-in-from-right-4">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-gold">{selectedOrderIds.length} Selection Locked</span>
                      <div className="h-4 w-px bg-gold/20 mx-1" />
                      <select 
                        onChange={(e) => {
                          if (e.target.value) {
                            batchUpdateOrderStatus(e.target.value);
                            e.target.value = '';
                          }
                        }}
                        className="bg-transparent text-[10px] font-bold uppercase tracking-widest text-zinc-900 dark:text-white outline-none cursor-pointer"
                      >
                        <option value="" className="bg-zinc-50 dark:bg-[#121212]">Bulk Status Update</option>
                        {['pending', 'confirmed', 'cooking', 'ready', 'delivery', 'delivered', 'cancelled', 'completed'].map(status => (
                          <option key={status} value={status} className="bg-zinc-50 dark:bg-[#121212]">{status}</option>
                        ))}
                      </select>
                      <button 
                        onClick={() => setSelectedOrderIds([])}
                        className="text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  )}
                  <div className="relative group">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 dark:text-white/20 group-focus-within:text-gold transition-colors" size={16} />
                    <input 
                      type="text"
                      placeholder="Search ID..."
                      value={orderSearch}
                      onChange={(e) => setOrderSearch(e.target.value)}
                      className="bg-zinc-100 dark:bg-white/5 border border-zinc-200 dark:border-white/10 rounded-xl pl-12 pr-6 py-3 text-sm outline-none focus:border-gold w-full md:w-64 transition-all text-zinc-900 dark:text-white"
                    />
                  </div>
                </div>
              </header>

              <div className="bg-zinc-50 dark:bg-[#121212] border border-zinc-200 dark:border-white/5 rounded-xl overflow-hidden shadow-2xl">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-zinc-200 dark:border-white/5 bg-zinc-100 dark:bg-white/[0.02]">
                      <th className="p-4 w-10">
                        <input 
                          type="checkbox"
                          checked={selectedOrderIds.length > 0 && selectedOrderIds.length === orders.length}
                          onChange={toggleAllOrders}
                          className="w-4 h-4 rounded border-zinc-300 dark:border-white/10 bg-transparent text-gold focus:ring-gold appearance-none border checked:bg-gold transition-all cursor-pointer relative after:content-['✓'] after:absolute after:inset-0 after:flex after:items-center after:justify-center after:text-[10px] after:text-black after:opacity-0 checked:after:opacity-100"
                        />
                      </th>
                      <th className="p-4 text-[10px] font-bold uppercase tracking-widest text-zinc-400 dark:text-white/40">Reference</th>
                      <th className="p-4 text-[10px] font-bold uppercase tracking-widest text-zinc-400 dark:text-white/40">Status</th>
                      <th className="p-4 text-[10px] font-bold uppercase tracking-widest text-zinc-400 dark:text-white/40">Fulfillment</th>
                      <th className="p-4 text-[10px] font-bold uppercase tracking-widest text-zinc-400 dark:text-white/40">Total</th>
                      <th className="p-4 text-[10px] font-bold uppercase tracking-widest text-zinc-400 dark:text-white/40">Timestamp</th>
                      <th className="p-4 text-[10px] font-bold uppercase tracking-widest text-zinc-400 dark:text-white/40 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders
                      .filter(order => 
                        order.id.toLowerCase().includes(orderSearch.toLowerCase()) ||
                        order.status.toLowerCase().includes(orderSearch.toLowerCase()) ||
                        (order.customerId && order.customerId.toLowerCase().includes(orderSearch.toLowerCase()))
                      )
                      .map(order => (
                        <tr key={order.id} className={`border-b border-zinc-200 dark:border-white/5 hover:bg-zinc-100 dark:hover:bg-white/[0.01] transition-colors ${selectedOrderIds.includes(order.id) ? 'bg-gold/5' : ''}`}>
                          <td className="p-4">
                            <input 
                              type="checkbox"
                              checked={selectedOrderIds.includes(order.id)}
                              onChange={() => toggleOrderSelection(order.id)}
                              className="w-4 h-4 rounded border-zinc-300 dark:border-white/10 bg-transparent text-gold focus:ring-gold appearance-none border checked:bg-gold transition-all cursor-pointer relative after:content-['✓'] after:absolute after:inset-0 after:flex after:items-center after:justify-center after:text-[10px] after:text-black after:opacity-0 checked:after:opacity-100"
                            />
                          </td>
                          <td className="p-4 text-xs font-mono text-gold uppercase">#{order.id.slice(-8)}</td>
                        <td className="p-4">
                          <select 
                            value={order.status}
                            onChange={(e) => updateOrderStatus(order.id, e.target.value)}
                            className={`bg-zinc-100 dark:bg-black/40 border border-zinc-200 dark:border-white/10 rounded px-2 py-1 text-[9px] font-bold uppercase tracking-widest outline-none focus:border-gold transition-colors ${
                              order.status === 'completed' ? 'text-green-500' : 
                              order.status === 'cancelled' ? 'text-red-500' : 'text-primary'
                            }`}
                          >
                            {['pending', 'confirmed', 'cooking', 'ready', 'delivery', 'delivered', 'cancelled', 'completed'].map(status => (
                              <option key={status} value={status} className="bg-zinc-50 dark:bg-[#121212] text-zinc-900 dark:text-white font-bold">{status}</option>
                            ))}
                          </select>
                        </td>
                        <td className="p-4 text-[10px] font-bold uppercase tracking-widest text-zinc-500 dark:text-white/60">{order.type}</td>
                        <td className="p-4 text-sm font-bold text-zinc-900 dark:text-white">₱{order.total}</td>
                        <td className="p-4 text-[10px] text-zinc-400 dark:text-white/20 font-bold uppercase tracking-widest">
                          {order.createdAt?.toDate ? order.createdAt.toDate().toLocaleTimeString() : 'Just now'}
                        </td>
                        <td className="p-4 text-right">
                          <button 
                            onClick={() => { setSelectedOrder(order); setShowOrderModal(true); }}
                            className="bg-zinc-100 dark:bg-white/5 border border-zinc-200 dark:border-white/10 px-4 py-2 text-[9px] font-bold uppercase tracking-widest text-gold hover:bg-gold hover:text-black transition-all rounded-lg"
                          >
                            Inspect
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {view === 'pos' && (
            <div className="flex h-[calc(100vh-160px)] gap-8">
              {/* POS Left: Product Selection */}
              <div className="flex-1 flex flex-col gap-6">
                <header className="flex justify-between items-center text-left">
                  <div>
                    <h1 className="text-4xl font-serif italic mb-2 text-zinc-900 dark:text-white">Terminal <span className="text-zinc-200 dark:text-white/20">POS</span></h1>
                    <p className="text-[10px] uppercase tracking-widest text-zinc-400 dark:text-white/40 font-bold">High-velocity guest transaction bridge</p>
                  </div>
                  <div className="flex gap-4">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 dark:text-white/20" size={14} />
                      <input 
                        type="text"
                        placeholder="Search Entity..."
                        value={posSearch}
                        onChange={(e) => setPosSearch(e.target.value)}
                        className="bg-zinc-100 dark:bg-white/5 border border-zinc-200 dark:border-white/10 rounded-lg pl-10 pr-4 py-2 text-xs outline-none focus:border-gold w-64 transition-all text-zinc-900 dark:text-white"
                      />
                    </div>
                  </div>
                </header>

                <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
                  <button 
                    onClick={() => setPosCategory('all')}
                    className={`px-4 py-2 rounded-full text-[9px] font-bold uppercase tracking-widest transition-all ${posCategory === 'all' ? 'bg-gold text-black' : 'bg-zinc-100 dark:bg-white/5 text-zinc-500 dark:text-white/40 border border-zinc-200 dark:border-white/10'}`}
                  >
                    All Items
                  </button>
                  {categories.map(cat => (
                    <button 
                      key={cat.id}
                      onClick={() => setPosCategory(cat.id)}
                      className={`px-4 py-2 rounded-full text-[9px] font-bold uppercase tracking-widest whitespace-nowrap transition-all ${posCategory === cat.id ? 'bg-gold text-black' : 'bg-zinc-100 dark:bg-white/5 text-zinc-500 dark:text-white/40 border border-zinc-200 dark:border-white/10'}`}
                    >
                      {cat.name}
                    </button>
                  ))}
                </div>

                <div className="flex-1 overflow-y-auto grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 pr-2">
                  {products
                    .filter(p => (posCategory === 'all' || p.categoryId === posCategory))
                    .filter(p => p.name.toLowerCase().includes(posSearch.toLowerCase()))
                    .map(p => (
                      <button 
                        key={p.id}
                        onClick={() => addToPOSCart(p)}
                        className="bg-zinc-50 dark:bg-[#121212] border border-zinc-200 dark:border-white/5 rounded-xl p-4 flex flex-col items-start gap-3 hover:border-gold/50 transition-all group text-left relative overflow-hidden"
                      >
                        {p.bestSeller && <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-primary shadow-[0_0_8px_#D42D2D]"></div>}
                        <div className="w-full aspect-square rounded-lg overflow-hidden bg-zinc-100 dark:bg-white/5">
                           <img src={p.image} className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all" />
                        </div>
                        <div className="text-left w-full">
                          <h4 className="text-[11px] font-bold uppercase tracking-tight line-clamp-1 text-zinc-900 dark:text-white">{p.name}</h4>
                          <p className="text-gold font-bold text-xs mt-1">₱{p.price}</p>
                        </div>
                      </button>
                    ))}
                </div>
              </div>

              {/* POS Right: Cart & Checkout */}
              <div className="w-96 flex flex-col bg-zinc-50 dark:bg-[#121212] border border-zinc-200 dark:border-white/10 rounded-2xl overflow-hidden shadow-2xl">
                <div className="p-6 border-b border-zinc-200 dark:border-white/5 bg-zinc-100 dark:bg-white/[0.02]">
                  <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400 dark:text-white/40">Current Order</h3>
                  <p className="text-sm font-serif italic mt-1 text-zinc-900 dark:text-white">Guest Session #742</p>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-4">
                  {posCart.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-zinc-300 dark:text-white/10 space-y-4">
                       <ShoppingCart size={48} />
                       <p className="text-[10px] uppercase font-bold tracking-[0.4em]">Empty Terminal</p>
                    </div>
                  ) : (
                    posCart.map(item => (
                      <div key={item.product.id} className="flex items-center justify-between group">
                        <div className="flex-1 text-left">
                          <p className="text-[11px] font-bold uppercase leading-tight text-zinc-900 dark:text-white">{item.product.name}</p>
                          <p className="text-[9px] text-zinc-400 dark:text-white/40 font-bold">₱{item.product.price} × {item.quantity}</p>
                        </div>
                        <div className="flex items-center gap-3">
                           <div className="flex items-center bg-zinc-100 dark:bg-white/5 rounded-lg border border-zinc-200 dark:border-white/10">
                              <button onClick={() => updateQuantity(item.product.id, -1)} className="px-2 py-1 hover:text-gold transition-colors text-zinc-900 dark:text-white">-</button>
                              <span className="text-[10px] font-bold w-6 text-center text-zinc-900 dark:text-white">{item.quantity}</span>
                              <button onClick={() => updateQuantity(item.product.id, 1)} className="px-2 py-1 hover:text-gold transition-colors text-zinc-900 dark:text-white">+</button>
                           </div>
                           <p className="text-[11px] font-bold w-16 text-right text-zinc-900 dark:text-white">₱{item.product.price * item.quantity}</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                <div className="p-8 bg-zinc-100 dark:bg-black/40 border-t border-zinc-200 dark:border-white/10 space-y-6 text-zinc-900 dark:text-white">
                  <div className="space-y-2">
                    <div className="flex justify-between text-zinc-400 dark:text-white/40 text-[10px] font-bold uppercase tracking-widest">
                       <span>Subtotal</span>
                       <span>₱{posCart.reduce((acc, item) => acc + (item.product.price * item.quantity), 0)}</span>
                    </div>
                    <div className="flex justify-between text-zinc-400 dark:text-white/40 text-[10px] font-bold uppercase tracking-widest">
                       <span>Tax (Incl.)</span>
                       <span>₱0.00</span>
                    </div>
                    <div className="flex justify-between text-zinc-900 dark:text-white text-xl font-serif italic border-t border-zinc-200 dark:border-white/5 pt-4 mt-4">
                       <span>Total Payable</span>
                       <span className="text-gold">₱{posCart.reduce((acc, item) => acc + (item.product.price * item.quantity), 0)}</span>
                    </div>
                  </div>

                  <div className="space-y-3 text-left">
                    <label className="text-[10px] uppercase tracking-widest text-zinc-400 dark:text-white/40 font-bold">Payment Method</label>
                    <div className="grid grid-cols-2 gap-2">
                      {['Cash', 'Card', 'GCash', 'Maya', 'Split Payment'].map((method) => (
                        <button
                          key={method}
                          onClick={() => setPosPaymentMethod(method as any)}
                          className={`py-2 px-3 rounded-lg text-[9px] font-bold uppercase tracking-widest border transition-all ${
                            posPaymentMethod === method
                              ? 'bg-gold border-gold text-black shadow-[0_0_15px_rgba(212,175,55,0.3)]'
                              : 'bg-zinc-100 dark:bg-white/5 border-zinc-200 dark:border-white/10 text-zinc-400 dark:text-white/40 hover:border-gold/50'
                          }`}
                        >
                          {method}
                        </button>
                      ))}
                    </div>
                  </div>

                  <button 
                    disabled={posCart.length === 0}
                    onClick={handleCheckout}
                    className="w-full py-4 bg-gold text-black font-bold uppercase tracking-[0.4em] text-[11px] hover:bg-white transition-all shadow-xl disabled:opacity-50 disabled:grayscale"
                  >
                    Lock & Settle
                  </button>
                  <button 
                    onClick={() => setPosCart([])}
                    className="w-full text-[9px] text-zinc-300 dark:text-white/20 hover:text-red-500 uppercase font-bold tracking-widest transition-colors"
                  >
                    Void Terminal
                  </button>
                </div>
              </div>
            </div>
          )}

          {view === 'moments' && (
            <div className="space-y-10">
              <header className="flex justify-between items-end">
                <div>
                  <h1 className="text-4xl font-serif italic mb-2 text-zinc-900 dark:text-white">Guest <span className="text-zinc-200 dark:text-white/20">Moments</span></h1>
                  <p className="text-[10px] uppercase tracking-widest text-zinc-400 dark:text-white/40 font-bold">Capturing the digital soul of guest experiences</p>
                </div>
                <button 
                  onClick={() => { setEditingMoment(null); setShowMomentModal(true); }}
                  className="bg-gold text-black py-2 px-6 text-[10px] uppercase tracking-widest font-bold hover:bg-black hover:text-white transition-all shadow-xl"
                >
                  Post Moment
                </button>
              </header>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {moments.map(moment => (
                  <div key={moment.id} className="bg-zinc-50 dark:bg-[#121212] border border-zinc-200 dark:border-white/5 rounded-2xl overflow-hidden group shadow-sm transition-all hover:shadow-md">
                    <div className="aspect-[4/5] relative">
                      <img src={moment.imageUrl} className="w-full h-full object-cover grayscale transition-all duration-700 group-hover:grayscale-0" />
                      <div className="absolute inset-0 bg-gradient-to-t from-white dark:from-[#121212] via-transparent to-transparent opacity-60"></div>
                      <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-all">
                        <button onClick={() => { setEditingMoment(moment); setShowMomentModal(true); }} className="p-2 bg-black/60 text-white rounded-full hover:bg-gold transition-colors"><Edit size={12}/></button>
                        <button onClick={() => deleteMoment(moment.id)} className="p-2 bg-black/60 text-white rounded-full hover:bg-red-500 transition-colors"><Trash2 size={12}/></button>
                      </div>
                      {moment.featured && <div className="absolute bottom-4 left-4"><Heart className="text-gold fill-gold" size={14} /></div>}
                    </div>
                    <div className="p-6 text-left">
                      <h3 className="font-serif italic text-xl mb-2 text-zinc-900 dark:text-white">{moment.title}</h3>
                      <p className="text-[10px] text-zinc-500 dark:text-white/40 uppercase tracking-widest font-bold line-clamp-2">{moment.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {view === 'reminders' && (
            <div className="space-y-10">
              <header className="flex justify-between items-end">
                <div>
                  <h1 className="text-4xl font-serif italic mb-2 text-zinc-900 dark:text-white">Engage <span className="text-zinc-200 dark:text-white/20">Audience</span></h1>
                  <p className="text-[10px] uppercase tracking-widest text-zinc-400 dark:text-white/40 font-bold">Schedule across-platform event reminders</p>
                </div>
                <button 
                  onClick={() => { 
                    setEditingReminder(null); 
                    setReminderPreviewData({ subject: '', message: '' });
                    setShowReminderModal(true); 
                  }}
                  className="bg-gold text-black py-2 px-6 text-[10px] uppercase tracking-widest font-bold hover:bg-black hover:text-white transition-all shadow-xl"
                >
                  Create Reminder
                </button>
              </header>

              <div className="grid grid-cols-1 gap-4">
                {reminders.map(reminder => {
                  const event = events.find(e => e.id === reminder.eventId);
                  const attendeeCount = reservations.filter(r => r.eventId === reminder.eventId && r.type === 'event' && r.status === 'confirmed').length;
                  
                  return (
                    <div key={reminder.id} className="bg-zinc-50 dark:bg-[#121212] border border-zinc-200 dark:border-white/5 rounded-xl p-6 flex flex-col md:flex-row justify-between items-center gap-6 shadow-sm transition-colors">
                      <div className="flex gap-6 items-center flex-grow">
                        <div className={`p-4 rounded-full ${reminder.status === 'sent' ? 'bg-green-500/10 text-green-500' : 'bg-gold/10 text-gold'}`}>
                          <Bell size={20} />
                        </div>
                        <div className="text-left">
                          <h3 className="font-serif italic text-xl mb-1 text-zinc-900 dark:text-white">{reminder.subject || 'Event Reminder'}</h3>
                          <p className="text-[10px] uppercase tracking-widest text-zinc-400 dark:text-white/40 font-bold mb-2">
                            To: <span className="text-zinc-900 dark:text-white">{event?.title || 'Unknown Event'}</span> ({attendeeCount} RSVPs)
                          </p>
                          <p className="text-xs text-zinc-500 dark:text-white/60 line-clamp-1">{reminder.message}</p>
                        </div>
                      </div>

                      <div className="flex gap-4 items-center shrink-0">
                        <div className="text-right">
                          <p className="text-[9px] uppercase tracking-widest text-zinc-300 dark:text-white/20 font-bold">Status</p>
                          <p className={`text-[10px] uppercase font-bold tracking-widest ${reminder.status === 'sent' ? 'text-green-500' : 'text-gold'}`}>
                            {reminder.status}
                          </p>
                        </div>
                        <div className="h-8 w-px bg-zinc-200 dark:bg-white/5 mx-2"></div>
                        <div className="flex gap-2">
                          {reminder.status === 'scheduled' && (
                            <button 
                              onClick={() => sendReminder(reminder)}
                              className="p-2 bg-gold/10 text-gold rounded-lg hover:bg-gold hover:text-black transition-all"
                              title="Send Now"
                            >
                              <ArrowRight size={14} />
                            </button>
                          )}
                          <button 
                            onClick={() => { 
                              setEditingReminder(reminder); 
                              setReminderPreviewData({ subject: reminder.subject, message: reminder.message });
                              setShowReminderModal(true); 
                            }} 
                            className="p-2 bg-zinc-100 dark:bg-white/5 text-zinc-500 dark:text-white rounded-lg hover:bg-gold hover:text-black transition-all"
                          >
                            <Edit size={14}/>
                          </button>
                          <button onClick={() => deleteReminder(reminder.id)} className="p-2 bg-zinc-100 dark:bg-white/5 text-zinc-500 dark:text-white rounded-lg hover:bg-red-500 hover:text-white transition-all"><Trash2 size={14}/></button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {view === 'site' && (
            <div className="space-y-10">
              <header>
                <h1 className="text-4xl font-serif italic mb-2 text-zinc-900 dark:text-white">Site <span className="text-zinc-200 dark:text-white/20">Settings</span></h1>
                <p className="text-[10px] uppercase tracking-widest text-zinc-400 dark:text-white/40 font-bold">Configure global aesthetics and hero systems</p>
              </header>

              <div className="max-w-3xl text-left">
                <form onSubmit={handleSaveSettings} className="bg-zinc-50 dark:bg-[#121212] border border-zinc-200 dark:border-white/5 rounded-2xl p-10 space-y-8 shadow-sm">
                  <div className="space-y-6">
                    <h3 className="text-xl font-serif italic border-b border-zinc-200 dark:border-white/5 pb-4 text-zinc-900 dark:text-white">Hero Configuration</h3>
                    <div className="space-y-1">
                      <label className="text-[10px] uppercase tracking-widest text-zinc-400 dark:text-white/40 font-bold">Hero Headline</label>
                      <input name="heroTitle" defaultValue={siteSettings?.heroTitle} required className="w-full bg-zinc-100 dark:bg-white/5 border border-zinc-200 dark:border-white/10 p-3 rounded outline-none focus:border-gold text-zinc-900 dark:text-white" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] uppercase tracking-widest text-zinc-400 dark:text-white/40 font-bold">Hero Accent Text</label>
                      <input name="heroSubtitle" defaultValue={siteSettings?.heroSubtitle} className="w-full bg-zinc-100 dark:bg-white/5 border border-zinc-200 dark:border-white/10 p-3 rounded outline-none focus:border-gold text-zinc-900 dark:text-white" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] uppercase tracking-widest text-zinc-400 dark:text-white/40 font-bold">Hero Cinematic URL</label>
                      <input name="heroImage" defaultValue={siteSettings?.heroImage} className="w-full bg-zinc-100 dark:bg-white/5 border border-zinc-200 dark:border-white/10 p-3 rounded outline-none focus:border-gold text-zinc-900 dark:text-white" />
                    </div>
                  </div>

                  <div className="space-y-6 pt-6">
                    <h3 className="text-xl font-serif italic border-b border-zinc-200 dark:border-white/5 pb-4 text-zinc-900 dark:text-white">Core Features</h3>
                    <p className="text-[10px] text-zinc-400 dark:text-white/40 uppercase tracking-widest font-bold">Update the three main value propositions displayed on home page</p>
                    
                    {[0, 1, 2].map(i => (
                      <div key={i} className="p-6 bg-zinc-100 dark:bg-white/[0.02] border border-zinc-200 dark:border-white/5 rounded-xl space-y-4">
                        <p className="text-[9px] font-bold text-gold uppercase tracking-widest">Feature {i+1}</p>
                        <div className="space-y-1">
                          <label className="text-[10px] uppercase tracking-widest text-zinc-300 dark:text-white/20 font-bold">Title</label>
                          <input 
                            name={`feature_${i}_title`} 
                            defaultValue={siteSettings?.features?.[i]?.title} 
                            className="w-full bg-zinc-100 dark:bg-white/5 border border-zinc-200 dark:border-white/10 p-2 rounded text-xs outline-none focus:border-gold text-zinc-900 dark:text-white" 
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] uppercase tracking-widest text-zinc-300 dark:text-white/20 font-bold">Description</label>
                          <textarea 
                            name={`feature_${i}_desc`} 
                            defaultValue={siteSettings?.features?.[i]?.description} 
                            rows={2}
                            className="w-full bg-zinc-100 dark:bg-white/5 border border-zinc-200 dark:border-white/10 p-2 rounded text-xs outline-none focus:border-gold text-zinc-900 dark:text-white" 
                          />
                        </div>
                      </div>
                    ))}
                  </div>

                  <button type="submit" className="w-full py-4 bg-gold text-black font-bold uppercase tracking-[0.3em] text-[11px] hover:bg-white transition-all shadow-xl">
                    Push Site Update
                  </button>
                </form>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Product Modal */}
      {showProductModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 backdrop-blur-xl bg-black/60">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-zinc-50 dark:bg-[#121212] border border-zinc-200 dark:border-white/10 p-10 w-full max-w-xl rounded-2xl shadow-3xl overflow-y-auto max-h-[90vh]"
          >
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-3xl font-serif italic text-zinc-900 dark:text-white">{editingProduct ? 'Edit Entity' : 'New Entity'}</h2>
              <button onClick={() => setShowProductModal(false)} className="p-2 hover:bg-zinc-200 dark:hover:bg-white/5 rounded-full text-zinc-400 dark:text-white transition-colors"><X size={24}/></button>
            </div>

            <form onSubmit={handleSaveProduct} className="space-y-6">
              <div className="space-y-1">
                <label className="text-[10px] uppercase tracking-widest text-zinc-400 dark:text-white/40 font-bold">Entity Name</label>
                <input name="name" defaultValue={editingProduct?.name} required className="w-full bg-zinc-100 dark:bg-white/5 border border-zinc-200 dark:border-white/10 p-3 rounded outline-none focus:border-gold text-zinc-900 dark:text-white" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] uppercase tracking-widest text-zinc-400 dark:text-white/40 font-bold">Visual URL</label>
                <input name="image" defaultValue={editingProduct?.image} required className="w-full bg-zinc-100 dark:bg-white/5 border border-zinc-200 dark:border-white/10 p-3 rounded outline-none focus:border-gold text-zinc-900 dark:text-white" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] uppercase tracking-widest text-zinc-400 dark:text-white/40 font-bold">Price (₱)</label>
                  <input name="price" type="number" defaultValue={editingProduct?.price} required className="w-full bg-zinc-100 dark:bg-white/5 border border-zinc-200 dark:border-white/10 p-3 rounded outline-none focus:border-gold text-zinc-900 dark:text-white" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] uppercase tracking-widest text-zinc-400 dark:text-white/40 font-bold">Category</label>
                  <select name="categoryId" defaultValue={editingProduct?.categoryId} className="w-full bg-zinc-100 dark:bg-white/5 border border-zinc-200 dark:border-white/10 p-3 rounded outline-none focus:border-gold text-zinc-900 dark:text-white">
                    {categories.map(c => <option key={c.id} value={c.id} className="bg-zinc-50 dark:bg-[#121212]">{c.name}</option>)}
                  </select>
                </div>
              </div>
              <div className="space-y-1 text-left">
                <label className="text-[10px] uppercase tracking-widest text-zinc-400 dark:text-white/40 font-bold">Description</label>
                <textarea name="description" defaultValue={editingProduct?.description} rows={3} className="w-full bg-zinc-100 dark:bg-white/5 border border-zinc-200 dark:border-white/10 p-3 rounded outline-none focus:border-gold text-zinc-900 dark:text-white" />
              </div>
              <div className="flex gap-8">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" name="available" defaultChecked={editingProduct?.available ?? true} className="accent-gold w-4 h-4" />
                  <span className="text-[10px] uppercase tracking-widest font-bold text-zinc-600 dark:text-white">Available</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" name="trackInventory" defaultChecked={editingProduct?.trackInventory} className="accent-gold w-4 h-4" />
                  <span className="text-[10px] uppercase tracking-widest font-bold text-zinc-600 dark:text-white">Track Stock</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" name="bestSeller" defaultChecked={editingProduct?.bestSeller} className="accent-primary w-4 h-4" />
                  <span className="text-[10px] uppercase tracking-widest font-bold text-zinc-600 dark:text-white">Hot Choice</span>
                </label>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] uppercase tracking-widest text-zinc-400 dark:text-white/40 font-bold">Initial / Current Stock</label>
                <input name="stock" type="number" defaultValue={editingProduct?.stock || 0} className="w-full bg-zinc-100 dark:bg-white/5 border border-zinc-200 dark:border-white/10 p-3 rounded outline-none focus:border-gold text-zinc-900 dark:text-white" />
              </div>

              <button type="submit" className="w-full py-4 bg-gold text-black font-bold uppercase tracking-[0.3em] text-[11px] hover:bg-white transition-all shadow-xl">
                Deploy Changes
              </button>
            </form>
          </motion.div>
        </div>
      )}

      {/* Event Modal */}
      {showEventModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 backdrop-blur-xl bg-black/60">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-zinc-50 dark:bg-[#121212] border border-zinc-200 dark:border-white/10 p-10 w-full max-w-xl rounded-2xl shadow-3xl overflow-y-auto max-h-[90vh]"
          >
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-3xl font-serif italic text-zinc-900 dark:text-white">{editingEvent ? 'Edit Happening' : 'New Happening'}</h2>
              <button onClick={() => setShowEventModal(false)} className="p-2 hover:bg-zinc-200 dark:hover:bg-white/5 rounded-full text-zinc-400 dark:text-white transition-colors"><X size={24}/></button>
            </div>

            <form onSubmit={handleSaveEvent} className="space-y-6">
              <div className="space-y-1">
                <label className="text-[10px] uppercase tracking-widest text-zinc-400 dark:text-white/40 font-bold">Event Title</label>
                <input name="title" defaultValue={editingEvent?.title} required className="w-full bg-zinc-100 dark:bg-white/5 border border-zinc-200 dark:border-white/10 p-3 rounded outline-none focus:border-gold text-zinc-900 dark:text-white" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] uppercase tracking-widest text-zinc-400 dark:text-white/40 font-bold">Visual URL</label>
                <input name="img" defaultValue={editingEvent?.img} required className="w-full bg-zinc-100 dark:bg-white/5 border border-zinc-200 dark:border-white/10 p-3 rounded outline-none focus:border-gold text-zinc-900 dark:text-white" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] uppercase tracking-widest text-zinc-400 dark:text-white/40 font-bold">Date</label>
                  <input name="date" type="text" placeholder="May 12, 2026" defaultValue={editingEvent?.date} required className="w-full bg-zinc-100 dark:bg-white/5 border border-zinc-200 dark:border-white/10 p-3 rounded outline-none focus:border-gold text-zinc-900 dark:text-white" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] uppercase tracking-widest text-zinc-400 dark:text-white/40 font-bold">Time</label>
                  <input name="time" type="text" placeholder="19:00" defaultValue={editingEvent?.time} required className="w-full bg-zinc-100 dark:bg-white/5 border border-zinc-200 dark:border-white/10 p-3 rounded outline-none focus:border-gold text-zinc-900 dark:text-white" />
                </div>
              </div>
              <div className="space-y-1 text-left">
                <label className="text-[10px] uppercase tracking-widest text-zinc-400 dark:text-white/40 font-bold">Happenings Info</label>
                <textarea name="desc" defaultValue={editingEvent?.desc} rows={3} className="w-full bg-zinc-100 dark:bg-white/5 border border-zinc-200 dark:border-white/10 p-3 rounded outline-none focus:border-gold text-zinc-900 dark:text-white" />
              </div>

              <button type="submit" className="w-full py-4 bg-gold text-black font-bold uppercase tracking-[0.3em] text-[11px] hover:bg-white transition-all shadow-xl">
                Deploy Happening
              </button>
            </form>
          </motion.div>
        </div>
      )}

      {/* Moment Modal */}
      {showMomentModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 backdrop-blur-xl bg-black/60">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-zinc-50 dark:bg-[#121212] border border-zinc-200 dark:border-white/10 p-10 w-full max-w-xl rounded-2xl shadow-3xl overflow-y-auto max-h-[90vh]"
          >
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-3xl font-serif italic text-zinc-900 dark:text-white">{editingMoment ? 'Edit Moment' : 'Post Moment'}</h2>
              <button onClick={() => setShowMomentModal(false)} className="p-2 hover:bg-zinc-200 dark:hover:bg-white/5 rounded-full text-zinc-400 dark:text-white transition-colors"><X size={24}/></button>
            </div>

            <form onSubmit={handleSaveMoment} className="space-y-6">
              <div className="space-y-1">
                <label className="text-[10px] uppercase tracking-widest text-zinc-400 dark:text-white/40 font-bold">Moment Title</label>
                <input name="title" defaultValue={editingMoment?.title} required className="w-full bg-zinc-100 dark:bg-white/5 border border-zinc-200 dark:border-white/10 p-3 rounded outline-none focus:border-gold text-zinc-900 dark:text-white" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] uppercase tracking-widest text-zinc-400 dark:text-white/40 font-bold">Visual URL</label>
                <input name="imageUrl" defaultValue={editingMoment?.imageUrl} required className="w-full bg-zinc-100 dark:bg-white/5 border border-zinc-200 dark:border-white/10 p-3 rounded outline-none focus:border-gold text-zinc-900 dark:text-white" />
              </div>
              <div className="space-y-1 text-left">
                <label className="text-[10px] uppercase tracking-widest text-zinc-400 dark:text-white/40 font-bold">Vibe description</label>
                <textarea name="description" defaultValue={editingMoment?.description} rows={3} className="w-full bg-zinc-100 dark:bg-white/5 border border-zinc-200 dark:border-white/10 p-3 rounded outline-none focus:border-gold text-zinc-900 dark:text-white" />
              </div>
              <div className="flex gap-8">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" name="featured" defaultChecked={editingMoment?.featured} className="accent-gold w-4 h-4" />
                  <span className="text-[10px] uppercase tracking-widest font-bold text-zinc-600 dark:text-white">Spotlight</span>
                </label>
              </div>

              <button type="submit" className="w-full py-4 bg-gold text-black font-bold uppercase tracking-[0.3em] text-[11px] hover:bg-white transition-all shadow-xl">
                Broadcase Moment
              </button>
            </form>
          </motion.div>
        </div>
      )}

      {/* Reminder Modal */}
      {showReminderModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 backdrop-blur-xl bg-black/60">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-zinc-50 dark:bg-[#121212] border border-zinc-200 dark:border-white/10 p-10 w-full max-w-xl rounded-2xl shadow-3xl overflow-y-auto max-h-[90vh] transition-colors"
          >
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-3xl font-serif italic text-zinc-900 dark:text-white">{editingReminder ? 'Edit Reminder' : 'Create Reminder'}</h2>
              <div className="flex gap-4 items-center">
                <button 
                  onClick={() => setShowReminderPreview(!showReminderPreview)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-[9px] uppercase tracking-widest font-bold border transition-all ${
                    showReminderPreview ? 'bg-gold border-gold text-black' : 'bg-zinc-100 dark:bg-white/5 border-zinc-200 dark:border-white/10 text-zinc-400 dark:text-white/40 hover:border-gold/50'
                  }`}
                >
                  <Eye size={12} />
                  {showReminderPreview ? 'Close Preview' : 'Show Preview'}
                </button>
                <button onClick={() => { setShowReminderModal(false); setSelectedEventIdForReminder(null); setShowReminderPreview(false); }} className="p-2 hover:bg-zinc-200 dark:hover:bg-white/5 rounded-full text-zinc-400 dark:text-white transition-colors"><X size={24}/></button>
              </div>
            </div>

            {showReminderPreview ? (
              <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300 text-left">
                <div className="bg-zinc-100 dark:bg-white/[0.02] border border-zinc-200 dark:border-white/5 rounded-2xl p-8 space-y-6">
                  <div>
                    <p className="text-[10px] uppercase tracking-widest text-zinc-300 dark:text-white/20 font-bold mb-2">Subject</p>
                    <p className="text-lg font-serif italic text-gold">{reminderPreviewData.subject || 'Event Reminder'}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-widest text-zinc-300 dark:text-white/20 font-bold mb-2">Message Body</p>
                    <div className="p-6 bg-zinc-50 dark:bg-black/40 border border-zinc-200 dark:border-white/5 rounded-xl text-sm leading-relaxed text-zinc-800 dark:text-white/80 whitespace-pre-wrap font-sans">
                      {reminderPreviewData.message || 'No content provided yet...'}
                    </div>
                  </div>
                  <div className="pt-6 border-t border-zinc-200 dark:border-white/5 flex gap-10 items-center">
                    <div>
                      <p className="text-[9px] uppercase tracking-widest text-zinc-300 dark:text-white/20 font-bold">Channel</p>
                      <p className="text-[10px] uppercase tracking-widest text-zinc-500 dark:text-white/60 font-bold">Email & In-App</p>
                    </div>
                    <div className="p-4 bg-gold/5 border border-gold/10 rounded-lg">
                      <p className="text-[8px] uppercase tracking-widest text-gold font-bold">Preview Environment</p>
                    </div>
                  </div>
                </div>
                <button 
                  onClick={() => setShowReminderPreview(false)}
                  className="w-full py-4 bg-zinc-100 dark:bg-white/5 border border-zinc-200 dark:border-white/10 text-zinc-900 dark:text-white font-bold uppercase tracking-[0.3em] text-[11px] hover:bg-gold hover:text-black transition-all"
                >
                  Return to Editor
                </button>
              </div>
            ) : (
              <form onSubmit={handleSaveReminder} className="space-y-6 text-left">
                <div className="space-y-1">
                  <label className="text-[10px] uppercase tracking-widest text-zinc-400 dark:text-white/40 font-bold">Target Event</label>
                  <select 
                    name="eventId" 
                    defaultValue={editingReminder?.eventId || selectedEventIdForReminder || ''} 
                    required 
                    className="w-full bg-zinc-100 dark:bg-white/5 border border-zinc-200 dark:border-white/10 p-3 rounded outline-none focus:border-gold text-zinc-900 dark:text-white transition-colors"
                  >
                    <option value="" className="bg-zinc-50 dark:bg-[#121212]">Select an event</option>
                    {events.map(e => (
                      <option key={e.id} value={e.id} className="bg-zinc-50 dark:bg-[#121212]">{e.title} ({e.date})</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] uppercase tracking-widest text-zinc-400 dark:text-white/40 font-bold">Reminder Subject</label>
                  <input 
                    name="subject" 
                    defaultValue={editingReminder?.subject || reminderPreviewData.subject} 
                    onChange={(e) => setReminderPreviewData(prev => ({ ...prev, subject: e.target.value }))}
                    placeholder="e.g. Don't forget your RSVP!" 
                    className="w-full bg-zinc-100 dark:bg-white/5 border border-zinc-200 dark:border-white/10 p-3 rounded outline-none focus:border-gold text-zinc-900 dark:text-white transition-colors" 
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] uppercase tracking-widest text-zinc-400 dark:text-white/40 font-bold">Message Content</label>
                  <textarea 
                    name="message" 
                    defaultValue={editingReminder?.message || reminderPreviewData.message} 
                    onChange={(e) => setReminderPreviewData(prev => ({ ...prev, message: e.target.value }))}
                    rows={5} 
                    required 
                    className="w-full bg-zinc-100 dark:bg-white/5 border border-zinc-200 dark:border-white/10 p-3 rounded outline-none focus:border-gold text-zinc-900 dark:text-white transition-colors" 
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase tracking-widest text-zinc-400 dark:text-white/40 font-bold">Schedule Date</label>
                    <input name="scheduledAt" type="datetime-local" defaultValue={editingReminder?.scheduledAt ? new Date(editingReminder.scheduledAt).toISOString().slice(0, 16) : ''} required className="w-full bg-zinc-100 dark:bg-white/5 border border-zinc-200 dark:border-white/10 p-3 rounded outline-none focus:border-gold text-zinc-900 dark:text-white transition-colors" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase tracking-widest text-zinc-400 dark:text-white/40 font-bold">Channel</label>
                    <select name="type" defaultValue={editingReminder?.type || 'both'} className="w-full bg-zinc-100 dark:bg-white/5 border border-zinc-200 dark:border-white/10 p-3 rounded outline-none focus:border-gold text-zinc-900 dark:text-white transition-colors">
                      <option value="in-app" className="bg-zinc-50 dark:bg-[#121212]">In-App Only</option>
                      <option value="email" className="bg-zinc-50 dark:bg-[#121212]">Email (Mock)</option>
                      <option value="both" className="bg-zinc-50 dark:bg-[#121212]">Both</option>
                    </select>
                  </div>
                </div>

                <button type="submit" className="w-full py-4 bg-gold text-black font-bold uppercase tracking-[0.3em] text-[11px] hover:bg-white transition-all shadow-xl">
                  {editingReminder ? 'Update Schedule' : 'Schedule Broadcase'}
                </button>
              </form>
            )}
          </motion.div>
        </div>
      )}

      {/* Order Details Modal */}
      {showOrderModal && selectedOrder && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 backdrop-blur-xl bg-black/60">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-zinc-50 dark:bg-[#0A0A0A] border border-zinc-200 dark:border-white/10 w-full max-w-4xl rounded-2xl shadow-3xl overflow-hidden flex flex-col max-h-[90vh]"
          >
            <div className="p-8 border-b border-zinc-200 dark:border-white/5 flex justify-between items-center bg-zinc-100 dark:bg-white/[0.02]">
              <div>
                <h2 className="text-2xl font-serif italic mb-1 text-zinc-900 dark:text-white">Order <span className="text-gold">Details</span></h2>
                <p className="text-[10px] uppercase tracking-widest text-zinc-400 dark:text-white/40 font-bold">Reference: #{selectedOrder.id}</p>
              </div>
              <button onClick={() => setShowOrderModal(false)} className="p-2 hover:bg-zinc-200 dark:hover:bg-white/5 rounded-full transition-colors text-zinc-400 dark:text-white"><X size={20}/></button>
            </div>

            <div className="flex-grow overflow-y-auto p-8 grid grid-cols-1 lg:grid-cols-3 gap-10">
              {/* Items List */}
              <div className="lg:col-span-2 space-y-8">
                <div>
                  <h3 className="text-[10px] uppercase tracking-widest text-zinc-300 dark:text-white/20 font-bold mb-6 border-b border-zinc-200 dark:border-white/5 pb-2">Itemized Breakdown</h3>
                  <div className="space-y-4">
                    {selectedOrder.items.map((item, idx) => (
                      <div key={idx} className="flex gap-4 items-center p-4 bg-zinc-100 dark:bg-white/[0.02] border border-zinc-200 dark:border-white/5 rounded-xl">
                        <div className="w-16 h-16 rounded-lg overflow-hidden bg-zinc-200 dark:bg-zinc-900 shrink-0 text-left">
                          {item.image && <img src={item.image} alt={item.name} className="w-full h-full object-cover" />}
                        </div>
                        <div className="flex-grow text-left">
                          <h4 className="font-serif italic text-lg leading-tight text-zinc-900 dark:text-white">{item.name}</h4>
                          <p className="text-[10px] uppercase tracking-widest text-zinc-400 dark:text-white/40 font-bold mt-1">Quantity: {item.quantity}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-bold text-gold">₱{item.price * item.quantity}</p>
                          <p className="text-[9px] text-zinc-400 dark:text-white/20 uppercase font-bold tracking-widest">₱{item.price} / unit</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-6 border-t border-zinc-200 dark:border-white/5 flex justify-between items-end">
                   <div className="text-left">
                     <p className="text-[10px] uppercase tracking-widest text-zinc-400 dark:text-white/40 font-bold mb-1">Payment Method</p>
                     <p className="text-sm font-serif italic text-zinc-900 dark:text-white">{selectedOrder.paymentMethod}</p>
                   </div>
                   <div className="text-right">
                     <p className="text-[10px] uppercase tracking-widest text-zinc-400 dark:text-white/40 font-bold mb-1">Grand Total</p>
                     <p className="text-4xl font-serif font-bold text-gold italic">₱{selectedOrder.total}</p>
                   </div>
                </div>
              </div>

              {/* Sidebar: Customer & History */}
              <div className="space-y-10 border-l border-zinc-200 dark:border-white/5 pl-10 text-left">
                <section>
                  <h3 className="text-[10px] uppercase tracking-widest text-zinc-300 dark:text-white/20 font-bold mb-4">Guest Profile</h3>
                  <div className="p-4 bg-gold/5 border border-gold/10 rounded-xl">
                    <p className="text-xs font-serif italic text-zinc-900 dark:text-white mb-1">Guest ID: {selectedOrder.customerId}</p>
                    <p className="text-[9px] uppercase tracking-widest text-gold font-bold">Fulfillment: {selectedOrder.type}</p>
                  </div>
                </section>

                <section>
                  <h3 className="text-[10px] uppercase tracking-widest text-zinc-300 dark:text-white/20 font-bold mb-4">Audit Trail</h3>
                  <div className="space-y-4">
                    {selectedOrder.statusHistory?.map((log, idx) => (
                      <div key={idx} className="relative pl-6 pb-4 border-l border-zinc-200 dark:border-white/10 last:border-0 last:pb-0">
                        <div className="absolute left-[-5px] top-1 w-2 h-2 rounded-full bg-gold shadow-[0_0_8px_rgba(212,175,55,0.4)]" />
                        <p className="text-[10px] uppercase tracking-widest font-bold text-zinc-700 dark:text-white/80">{log.status}</p>
                        <p className="text-[8px] text-zinc-400 dark:text-white/40 uppercase tracking-widest mt-0.5">
                          {log.timestamp?.toDate ? log.timestamp.toDate().toLocaleString() : new Date(log.timestamp).toLocaleString()}
                        </p>
                      </div>
                    )) || (
                      <p className="text-[10px] italic text-zinc-300 dark:text-white/20">No history available for this transaction.</p>
                    )}
                    <div className="relative pl-6">
                       <div className="absolute left-[-5px] top-1 w-2 h-2 rounded-full bg-zinc-300 dark:bg-white/20" />
                       <p className="text-[10px] uppercase tracking-widest font-bold text-zinc-400 dark:text-white/40">Created</p>
                       <p className="text-[8px] text-zinc-300 dark:text-white/20 uppercase tracking-widest mt-0.5">
                         {selectedOrder.createdAt?.toDate ? selectedOrder.createdAt.toDate().toLocaleString() : 'Initialization'}
                       </p>
                    </div>
                  </div>
                </section>

                <div className="pt-6 border-t border-zinc-200 dark:border-white/5">
                  <label className="text-[10px] uppercase tracking-widest text-zinc-400 dark:text-white/40 font-bold mb-3 block">Update System State</label>
                  <select 
                    value={selectedOrder.status}
                    onChange={(e) => updateOrderStatus(selectedOrder.id, e.target.value)}
                    className="w-full bg-zinc-100 dark:bg-white/5 border border-zinc-200 dark:border-white/10 p-3 rounded-lg text-[10px] uppercase font-bold tracking-[0.2em] outline-none focus:border-gold text-zinc-900 dark:text-white transition-colors"
                  >
                    {['pending', 'confirmed', 'cooking', 'ready', 'delivery', 'delivered', 'cancelled', 'completed'].map(status => (
                      <option key={status} value={status} className="bg-zinc-50 dark:bg-[#121212]">{status}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}

function AdminNavItem({ icon, label, active = false, onClick }: any) {
  return (
    <div 
      onClick={onClick}
      className={`p-3 text-[10px] uppercase tracking-widest cursor-pointer transition-all flex items-center gap-3 rounded-xl border border-transparent ${
        active 
          ? 'text-gold bg-gold/5 border-gold/10 font-bold' 
          : 'text-zinc-400 dark:text-white/40 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-white/5'
      }`}
    >
      <div className={`${active ? 'text-gold' : 'text-zinc-300 dark:text-white/20'}`}>
        {icon}
      </div>
      <span>{label}</span>
      {active && <div className="ml-auto w-1 h-4 bg-gold rounded-full" />}
    </div>
  );
}

function RibbonStat({ label, value, live = false }: any) {
  return (
    <div className="text-left text-zinc-900 dark:text-white">
      <p className="text-[9px] text-zinc-400 dark:text-white/40 uppercase tracking-[0.2em] font-bold mb-1">{label}</p>
      <div className="flex items-center gap-2">
        <p className="text-xl font-serif">{value}</p>
        {live && (
          <span className="flex items-center gap-1.5 text-[8px] font-bold text-[#22C55E] px-2 py-0.5 bg-green-500/10 border border-green-500/20 rounded">
            <span className="w-1 h-1 bg-green-500 rounded-full animate-pulse" />
            LIVE
          </span>
        )}
      </div>
    </div>
  );
}

function SidebarItem({ icon, label, active = false, badge }: { icon: any, label: string, active?: boolean, badge?: string }) {
  return (
    <div className={`
      flex items-center justify-between px-4 py-3 rounded-xl cursor-pointer transition-all
      ${active ? 'bg-gold/10 text-gold shadow-sm' : 'text-zinc-500 dark:text-white/40 hover:bg-zinc-100 dark:hover:bg-white/5 hover:text-zinc-900 dark:hover:text-white'}
    `}>
      <div className="flex items-center gap-3">
        {icon}
        <span className="text-sm font-medium">{label}</span>
      </div>
      {badge && (
        <span className="bg-primary/20 text-primary text-[10px] px-1.5 py-0.5 rounded-full font-bold">
          {badge}
        </span>
      )}
    </div>
  );
}

function StatCard({ icon, label, value, change }: { icon: any, label: string, value: string, change: string }) {
  const isUp = change.startsWith('+');
  return (
    <div className="luxury-card border-zinc-200 dark:border-none bg-zinc-50 dark:bg-white/[0.02]">
      <div className="flex items-center justify-between mb-4">
        <div className="w-10 h-10 rounded-xl bg-zinc-100 dark:bg-black flex items-center justify-center">
          {icon}
        </div>
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${isUp ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
          {change}
        </span>
      </div>
      <p className="text-zinc-400 dark:text-white/40 text-[10px] font-bold uppercase tracking-widest mb-1">{label}</p>
      <h3 className="text-2xl font-bold font-serif text-zinc-900 dark:text-white">{value}</h3>
    </div>
  );
}

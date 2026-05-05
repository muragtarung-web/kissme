import { useAuth } from '../hooks/useAuth';
import { useLanguage } from '../hooks/useLanguage';
import { useLoading } from '../hooks/useLoading';
import { motion, AnimatePresence } from 'motion/react';
import { Award, Star, TrendingUp, History, Package } from 'lucide-react';
import { Navigate, useNavigate, Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import LoadingScreen from '../components/LoadingScreen';

export default function Profile() {
  const { user, loading: authLoading } = useAuth();
  const { t } = useLanguage();
  const { showLoading, hideLoading } = useLoading();

  useEffect(() => {
    if (authLoading) {
      showLoading('Accessing secure guest terminal...');
    } else {
      hideLoading();
    }
  }, [authLoading]);

  if (authLoading) return null;
  if (!user) return <Navigate to="/login" />;

  const tierColors = {
    Bronze: 'from-orange-500/20 to-orange-700/20 text-orange-500 border-orange-500/50',
    Silver: 'from-zinc-400/20 to-zinc-600/20 text-zinc-400 border-zinc-400/50',
    Gold: 'from-amber-400/20 to-amber-600/20 text-gold border-gold/50'
  };

  const nextTierPoints = user.tier === 'Bronze' ? 1000 : user.tier === 'Silver' ? 5000 : 5000;
  const progress = Math.min((user.points / nextTierPoints) * 100, 100);

  if (user.role === 'admin') {
    return (
      <div className="max-w-7xl mx-auto px-6 py-24 text-white min-h-screen">
        <div className="flex flex-col md:flex-row items-center justify-between gap-12 mb-20 px-2">
          <div className="flex flex-col md:flex-row items-center gap-12">
            <div className="relative">
              <div className="w-40 h-40 rounded-[2.5rem] bg-gradient-to-br from-gold/20 to-black border border-gold/30 flex items-center justify-center text-5xl font-serif italic text-gold shadow-2xl">
                {user.displayName.charAt(0)}
              </div>
              <div className="absolute -bottom-4 -right-4 bg-gold text-black px-4 py-2 rounded-xl shadow-2xl font-bold uppercase tracking-widest text-[10px]">
                System Lead
              </div>
            </div>
            
            <div className="text-center md:text-left">
              <span className="text-gold uppercase tracking-[0.4em] text-[10px] font-bold mb-4 block">Secure Administrator Access</span>
              <h1 className="text-6xl font-serif font-bold italic mb-2">Welcome Back, <span className="text-zinc-600">Admin</span></h1>
              <p className="text-white/40 text-[10px] uppercase tracking-[0.4em] font-bold">{user.email}</p>
            </div>
          </div>

          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8 flex items-center gap-8 shadow-2xl">
            <div className="text-right">
              <p className="text-[10px] uppercase tracking-widest font-bold text-white/40 mb-1">Terminal Status</p>
              <p className="text-xl font-mono text-green-400 flex items-center justify-end gap-2">
                <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" /> ONLINE
              </p>
            </div>
            <div className="h-10 w-px bg-white/10" />
            <div className="text-right">
              <p className="text-[10px] uppercase tracking-widest font-bold text-white/40 mb-1">Last Sync</p>
              <p className="text-xl font-mono text-white">Just Now</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <AdminPortalCard 
            icon={<TrendingUp size={32} />} 
            title="Command Center" 
            desc="Global terminal control, financial overview, and occupancy monitoring."
            link="/admin"
            color="border-white/10 bg-white/5"
          />
          <AdminPortalCard 
            icon={<Award size={32} />} 
            title="POS Terminal" 
            desc="Real-time transaction interface with direct inventory deduction."
            link="/admin"
            color="border-gold/30 bg-gold/5"
          />
          <AdminPortalCard 
            icon={<Package size={32} />} 
            title="Entity CMS" 
            desc="Manage culinary selections, event soundscapes, and digital moments."
            link="/admin"
            color="border-white/10 bg-white/5"
          />
        </div>

        <div className="mt-20 border-t border-white/5 pt-20">
          <div className="flex items-center justify-between mb-12 text-left">
             <h3 className="text-[10px] uppercase tracking-[0.4em] text-white/20 font-bold">System Maintenance</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
             <MaintenanceBox label="Active Orders" value="24" />
             <MaintenanceBox label="Table Occupancy" value="85%" />
             <MaintenanceBox label="Staff Online" value="12" />
             <MaintenanceBox label="Daily Revenue" value="₱52.4k" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-6 py-24 text-white">
      <div className="flex flex-col md:flex-row items-center gap-12 mb-20 px-2">
        <div className="relative">
          <div className="w-32 h-32 rounded-3xl bg-gradient-to-br from-white/10 to-white/5 border border-white/10 flex items-center justify-center text-4xl font-serif italic text-white">
            {user.displayName.charAt(0)}
          </div>
          <div className="absolute -bottom-2 -right-2 bg-gold text-black p-2 rounded-xl shadow-xl">
             <Award size={20} />
          </div>
        </div>
        
        <div className="text-center md:text-left">
          <h1 className="text-5xl font-serif italic mb-2">{user.displayName}</h1>
          <p className="text-white/40 text-[10px] uppercase tracking-[0.4em] font-bold">{user.email}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Tier Card */}
        <div className={`p-10 rounded-2xl border transition-all duration-500 bg-gradient-to-br ${tierColors[user.tier]} relative overflow-hidden group shadow-none`}>
          <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform">
             <Star size={120} />
          </div>
          
          <span className="text-[10px] uppercase tracking-[0.4em] font-bold block mb-2">{t('loyaltyProgram')}</span>
          <h2 className="text-6xl font-serif italic font-bold mb-8">{user.tier} <span className="text-white/20">Tier</span></h2>
          
          <div className="space-y-6">
            <div className="flex justify-between items-end">
              <div>
                <p className="text-[10px] uppercase tracking-widest font-bold opacity-60 mb-1">{t('currentPoints')}</p>
                <p className="text-3xl font-mono font-bold">{user.points}</p>
              </div>
              {user.tier !== 'Gold' && (
                <p className="text-[10px] uppercase tracking-widest font-bold opacity-60">
                   {nextTierPoints - user.points} points to next level
                </p>
              )}
            </div>

            {user.tier !== 'Gold' && (
              <div className="h-1.5 w-full bg-black/20 rounded-full overflow-hidden">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  className="h-full bg-current shadow-[0_0_10px_currentColor]"
                />
              </div>
            )}
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 gap-4">
          <StatBox icon={<History size={18}/>} label="Orders" value="12" />
          <StatBox icon={<Package size={18}/>} label="Reserved" value="3" />
          <div className="col-span-2 p-8 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-between transition-colors">
             <div className="text-left">
                <p className="text-[10px] uppercase tracking-widest font-bold text-white/40 mb-1">Lifetime Savings</p>
                <p className="text-2xl font-serif font-bold text-white">₱4,250.00</p>
             </div>
             <div className="w-12 h-12 rounded-xl bg-gold/10 text-gold flex items-center justify-center shadow-inner">
                <Star size={24}/>
             </div>
          </div>
        </div>
      </div>

      {/* Benefits Section */}
      <div className="mt-20">
        <h3 className="text-[10px] uppercase tracking-[0.4em] text-white/40 font-bold mb-10 px-2 text-left">Your Exclusive Privileges</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          <Benefit label="Tier Discount" value="-10%" desc="Applied automatically to all dine-in selections." />
          <Benefit label="Event Access" value="Priority" desc="Early bird terminal locking for live soundscapes." />
          <Benefit label="Birthdays" value="Gift Box" desc="Complimentary degustation entity on your month." />
        </div>
      </div>

      {/* Promotions & Vouchers */}
      <div className="mt-20 px-2">
        <div className="flex items-center justify-between mb-10 text-left">
          <h3 className="text-[10px] uppercase tracking-[0.4em] text-white/40 font-bold">Vouchers & Offers</h3>
          <span className="text-[10px] uppercase tracking-widest text-gold font-bold">4 Available</span>
        </div>
        
        <div className="space-y-4">
          <motion.div 
            whileHover={{ scale: 1.01 }}
            className="p-6 bg-gradient-to-r from-gold/5 via-gold/10 to-transparent border border-gold/20 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-6 group cursor-pointer"
          >
            <div className="flex items-center gap-6">
              <div className="w-16 h-16 bg-gold flex flex-col items-center justify-center text-black rounded-xl">
                 <span className="text-xl font-bold leading-none">20%</span>
                 <span className="text-[8px] font-bold uppercase tracking-tighter">OFF</span>
              </div>
              <div className="text-left">
                <h4 className="text-lg font-bold uppercase tracking-tight text-white mb-1">Loyalty Perk: Weekend Brunch</h4>
                <p className="text-[10px] uppercase tracking-widest text-white/40 font-bold">Valid for groups of 4 or more. Expires in 3 days.</p>
              </div>
            </div>
            <button className="text-[10px] font-bold uppercase tracking-widest text-gold border border-gold px-6 py-2 group-hover:bg-gold group-hover:text-black transition-all">
              Use Voucher
            </button>
          </motion.div>

          <motion.div 
            whileHover={{ scale: 1.01 }}
            className="p-6 bg-white/[0.02] border border-white/5 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-6 group cursor-pointer"
          >
            <div className="flex items-center gap-6">
              <div className="w-16 h-16 bg-white/10 flex flex-col items-center justify-center text-white/60 rounded-xl">
                 <span className="text-xl font-bold leading-none">FREE</span>
                 <span className="text-[8px] font-bold uppercase tracking-tighter">DRINK</span>
              </div>
              <div className="text-left">
                <h4 className="text-lg font-bold uppercase tracking-tight text-white mb-1">New Member Bonus</h4>
                <p className="text-[10px] uppercase tracking-widest text-white/40 font-bold">Complimentary signature mocktail on your next visit.</p>
              </div>
            </div>
            <button className="text-[10px] font-bold uppercase tracking-widest text-white/40 border border-white/10 px-6 py-2 group-hover:bg-white group-hover:text-black transition-all">
              Applied
            </button>
          </motion.div>

          <div className="p-8 border border-dashed border-white/10 rounded-2xl text-center">
            <p className="text-[10px] uppercase tracking-widest text-white/20 font-bold">More offers unlocked at Silver Tier</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatBox({ icon, label, value }: any) {
  return (
    <div className="p-8 bg-white/5 border border-white/10 rounded-2xl transition-colors text-left">
      <div className="text-gold mb-4">{icon}</div>
      <p className="text-[10px] uppercase tracking-widest font-bold text-white/40 mb-1">{label}</p>
      <p className="text-2xl font-serif font-bold text-white">{value}</p>
    </div>
  );
}

function Benefit({ label, value, desc }: any) {
  return (
    <div className="p-8 bg-black/40 border border-white/5 rounded-2xl group hover:border-gold/30 transition-all text-left">
      <p className="text-gold text-[10px] font-bold uppercase tracking-widest mb-1">{label}</p>
      <p className="text-3xl font-serif italic mb-4 text-white">{value}</p>
      <p className="text-[10px] text-white/20 uppercase tracking-widest font-bold leading-relaxed">{desc}</p>
    </div>
  );
}

function AdminPortalCard({ icon, title, desc, link, color }: any) {
  const navigate = useNavigate();
  
  return (
    <div 
      onClick={() => navigate(link)}
      className={`p-10 rounded-3xl border ${color} hover:border-gold/50 transition-all cursor-pointer group text-left`}
    >
      <div className="text-gold mb-8 group-hover:scale-110 transition-transform duration-500">{icon}</div>
      <h3 className="text-2xl font-serif font-bold italic mb-4">{title}</h3>
      <p className="text-[10px] uppercase tracking-widest font-bold text-white/40 leading-loose">{desc}</p>
      <div className="mt-10 flex items-center justify-between">
         <span className="text-[9px] font-bold uppercase tracking-[0.3em] text-gold border-b border-gold/30 pb-1">Enter Terminal</span>
         <TrendingUp size={14} className="text-white/20 group-hover:text-gold transition-colors" />
      </div>
    </div>
  );
}

function MaintenanceBox({ label, value }: any) {
  return (
    <div className="p-6 bg-white/[0.02] border border-white/5 rounded-2xl text-left">
       <p className="text-[9px] uppercase tracking-widest font-bold text-white/20 mb-2">{label}</p>
       <p className="text-xl font-mono text-white">{value}</p>
    </div>
  );
}

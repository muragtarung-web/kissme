import { useAuth } from '../hooks/useAuth';
import { useLanguage } from '../hooks/useLanguage';
import { motion } from 'motion/react';
import { Award, Star, TrendingUp, History, Package } from 'lucide-react';
import { Navigate } from 'react-router-dom';

export default function Profile() {
  const { user, loading } = useAuth();
  const { t } = useLanguage();

  if (loading) return null;
  if (!user) return <Navigate to="/login" />;

  const tierColors = {
    Bronze: 'from-orange-500/20 to-orange-700/20 text-orange-500 border-orange-500/50',
    Silver: 'from-zinc-400/20 to-zinc-600/20 text-zinc-400 border-zinc-400/50',
    Gold: 'from-amber-400/20 to-amber-600/20 text-gold border-gold/50'
  };

  const nextTierPoints = user.tier === 'Bronze' ? 1000 : user.tier === 'Silver' ? 5000 : 5000;
  const progress = Math.min((user.points / nextTierPoints) * 100, 100);

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

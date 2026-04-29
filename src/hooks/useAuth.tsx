import React, { useState, useEffect, createContext, useContext } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, db } from '../lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { User as AppUser, LoyaltyTier } from '../types';

interface AuthContextType {
  user: AppUser | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>({ user: null, loading: true });

function calculateTier(points: number): LoyaltyTier {
  if (points >= 5000) return 'Gold';
  if (points >= 1000) return 'Silver';
  return 'Bronze';
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    return onAuthStateChanged(auth, async (fbUser) => {
      if (fbUser) {
        const docRef = doc(db, 'users', fbUser.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          const points = data.points || 0;
          setUser({ 
            id: fbUser.uid, 
            ...data, 
            points,
            tier: calculateTier(points) 
          } as AppUser);
        } else {
          setUser({
            id: fbUser.uid,
            email: fbUser.email || '',
            displayName: fbUser.displayName || 'Guest',
            role: 'customer',
            points: 0,
            tier: 'Bronze',
            createdAt: new Date().toISOString()
          } as AppUser);
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);

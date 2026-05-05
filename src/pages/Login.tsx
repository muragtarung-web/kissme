import { useNavigate } from 'react-router-dom';
import { auth, db } from '../lib/firebase';
import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { LogIn } from 'lucide-react';
import toast from 'react-hot-toast';

export default function Login() {
  const navigate = useNavigate();

  const handleGoogleLogin = async () => {
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      
      // Save user to firestore if first time
      const userRef = doc(db, 'users', user.uid);
      const userSnap = await getDoc(userRef);
      
      if (!userSnap.exists()) {
        await setDoc(userRef, {
          email: user.email,
          displayName: user.displayName,
          photoURL: user.photoURL,
          role: 'customer',
          points: 0,
          tier: 'Bronze',
          createdAt: new Date().toISOString()
        });
      }
      
      toast.success('Welcome to Kiss Me Restaurant!');
      navigate('/');
    } catch (error: any) {
      console.error('Login Error:', error);
      
      if (error.code === 'auth/unauthorized-domain') {
        const domain = window.location.hostname;
        toast.error(`Domain "${domain}" is not authorized. Please add it to your Firebase Console under Authentication > Settings > Authorized domains.`, {
          duration: 6000,
        });
      } else {
        toast.error('Failed to login. Please try again.');
      }
    }
  };

  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center px-4">
      <div className="luxury-card w-full max-w-md text-center">
        <h2 className="text-3xl font-serif font-bold mb-4 text-white">Welcome Back</h2>
        <p className="text-white/40 mb-8 uppercase text-[10px] tracking-[0.2em] font-bold">Join the exclusive circle of Kiss Me Food Corner</p>
        
        <button 
          onClick={handleGoogleLogin}
          className="w-full btn-gold !text-lg py-4 flex items-center justify-center gap-4 group"
        >
          <img src="https://www.google.com/favicon.ico" alt="google" className="w-6 h-6 grayscale group-hover:grayscale-0 transition-all" />
          Continue with Google
        </button>
        
        <p className="mt-8 text-[9px] text-white/20 uppercase tracking-widest font-bold">
          By continuing, you agree to our terms & conditions
        </p>
      </div>
    </div>
  );
}

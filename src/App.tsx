import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './hooks/useAuth';
import { LanguageProvider } from './hooks/useLanguage';
import { CartProvider } from './hooks/useCart';
import { LoadingProvider, useLoading } from './hooks/useLoading';
import LoadingScreen from './components/LoadingScreen';
import Layout from './components/Layout';
import Home from './pages/Home';
import Menu from './pages/Menu';
import Events from './pages/Events';
import Reservations from './pages/Reservations';
import AdminDashboard from './pages/admin/Dashboard';
import Login from './pages/Login';
import Profile from './pages/Profile';
import { ThemeProvider } from './hooks/useTheme';
import { Toaster } from 'react-hot-toast';

import { ProtectedRoute } from './components/ProtectedRoute';

import { AnimatePresence } from 'motion/react';

import { useAuth } from './hooks/useAuth';

function GlobalLoading() {
  const { isLoading, message } = useLoading();
  const { loading: authLoading } = useAuth();
  
  const activeLoading = isLoading || authLoading;
  const currentMessage = authLoading && !isLoading ? "Kiss me Store is Establishing Secure Link..." : message;

  return (
    <AnimatePresence>
      {activeLoading && <LoadingScreen message={currentMessage} />}
    </AnimatePresence>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <LanguageProvider>
        <LoadingProvider>
          <AuthProvider>
            <CartProvider>
              <BrowserRouter>
              <GlobalLoading />
              <Routes>
                <Route path="/admin" element={
                  <ProtectedRoute adminOnly>
                    <AdminDashboard />
                  </ProtectedRoute>
                } />
                <Route path="*" element={
                  <Layout>
                    <Routes>
                      <Route path="/" element={<Home />} />
                      <Route path="/menu" element={<Menu />} />
                      <Route path="/events" element={<Events />} />
                      <Route path="/reservations" element={
                        <ProtectedRoute>
                          <Reservations />
                        </ProtectedRoute>
                      } />
                      <Route path="/profile" element={
                        <ProtectedRoute>
                          <Profile />
                        </ProtectedRoute>
                      } />
                      <Route path="/login" element={<Login />} />
                    </Routes>
                  </Layout>
                } />
              </Routes>
              <Toaster position="bottom-right" toastOptions={{
                style: {
                  background: '#0D0D0D',
                  color: '#F5F5F5',
                  border: '1px solid rgba(255, 255, 255, 0.1)'
                }
              }} />
            </BrowserRouter>
          </CartProvider>
        </AuthProvider>
        </LoadingProvider>
      </LanguageProvider>
    </ThemeProvider>
  );
}


import { useState } from 'react';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import Home from './pages/Home';
import Gallery from './pages/Gallery';
import Auction from './pages/Auction';
import EscrowVault from './pages/EscrowVault';
import PreInspection from './pages/PreInspection';
import Support from './pages/Support';
import CarDetail from './pages/CarDetail';
import Dashboard from './pages/Dashboard';
import CreateAccount from './pages/CreateAccount';
import SignIn from './pages/SignIn';
import Showroom from './pages/Showroom';
import type { Car, User } from './types';

export type { Car, User };

interface AuthUser {
  name: string;
  email: string;
  role: 'private-seller' | 'dealer' | 'admin';
  dealership?: string;
}

export default function App() {
  const [page, setPage]               = useState('home');
  const [selectedCar, setSelectedCar] = useState<Car | null>(null);
  const [authUser, setAuthUser]        = useState<AuthUser | null>(null);
  const navigate = useNavigate();
  const location = useLocation();

  const viewCar = (car: Car) => {
    setSelectedCar(car);
    setPage('car-detail');
    navigate('/car/' + (car.id || car._id));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleLogin = (user: AuthUser) => {
    setAuthUser(user);
  };

  const handleSignOut = () => {
    setAuthUser(null);
    setPage('home');
    navigate('/');
  };

  const handleSetPage = (newPage: string) => {
    setPage(newPage);
    navigate('/' + newPage);
  };

  // Determine current page from URL
  const getCurrentPage = () => {
    const path = location.pathname;
    if (path === '/' || path === '') return 'home';
    if (path === '/gallery') return 'gallery';
    if (path === '/auction') return 'auction';
    if (path === '/escrow') return 'escrow';
    if (path === '/pre-inspection') return 'pre-inspection';
    if (path === '/support') return 'support';
    if (path.startsWith('/car/')) return 'car-detail';
    if (path === '/dashboard') return 'dashboard';
    if (path === '/create-account') return 'create-account';
    if (path === '/sign-in') return 'sign-in';
    if (path === '/showroom') return 'showroom';
    return 'home';
  };

  const currentPage = getCurrentPage();

  const renderPage = () => {
    switch (page) {
      case 'home':
        return <Home setPage={handleSetPage} viewCar={viewCar} />;
      case 'gallery':
        return <Gallery viewCar={viewCar} />;
      case 'showroom':
        return <Showroom />;
      case 'auction':
        return <Auction />;
      case 'escrow':
        return <EscrowVault />;
      case 'pre-inspection':
        return <PreInspection viewCar={viewCar} />;
      case 'support':
        return <Support />;
      case 'car-detail':
        return selectedCar
          ? <CarDetail car={selectedCar} setPage={handleSetPage} viewCar={viewCar} />
          : <Gallery viewCar={viewCar} />;
      case 'dashboard':
        return authUser
          ? <Dashboard setPage={handleSetPage} viewCar={viewCar} authUser={authUser} onSignOut={handleSignOut} />
          : <SignIn setPage={handleSetPage} onLogin={handleLogin} />;
      case 'create-account':
        return <CreateAccount setPage={handleSetPage} onLogin={handleLogin} />;
      case 'sign-in':
        return <SignIn setPage={handleSetPage} onLogin={handleLogin} />;
      default:
        return <Home setPage={handleSetPage} viewCar={viewCar} />;
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar
        currentPage={currentPage}
        setPage={handleSetPage}
        authUser={authUser}
        onSignOut={handleSignOut}
      />
      <main className="flex-1">
        <Routes>
          <Route path="/" element={renderPage()} />
          <Route path="/:page" element={renderPage()} />
          <Route path="/car/:id" element={renderPage()} />
        </Routes>
      </main>
      <Footer setPage={handleSetPage} />
    </div>
  );
}

import { useState } from 'react';
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
import type { Car, User } from './types';

export type { Car, User };

export default function App() {
  const [page, setPage]               = useState('home');
  const [selectedCar, setSelectedCar] = useState<Car | null>(null);
  const [authUser, setAuthUser]        = useState<User | null>(null);

  const viewCar = (car: Car) => {
    setSelectedCar(car);
    setPage('car-detail');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleLogin = (user: AuthUser) => {
    setAuthUser(user);
  };

  const handleSignOut = () => {
    setAuthUser(null);
    setPage('home');
  };

  const renderPage = () => {
    switch (page) {
      case 'home':
        return <Home setPage={setPage} viewCar={viewCar} />;
      case 'gallery':
        return <Gallery viewCar={viewCar} />;
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
          ? <CarDetail car={selectedCar} setPage={setPage} viewCar={viewCar} />
          : <Gallery viewCar={viewCar} />;
      case 'dashboard':
        return authUser
          ? <Dashboard setPage={setPage} viewCar={viewCar} authUser={authUser} onSignOut={handleSignOut} />
          : <SignIn setPage={setPage} onLogin={handleLogin} />;
      case 'create-account':
        return <CreateAccount setPage={setPage} onLogin={handleLogin} />;
      case 'sign-in':
        return <SignIn setPage={setPage} onLogin={handleLogin} />;
      default:
        return <Home setPage={setPage} viewCar={viewCar} />;
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar
        currentPage={page}
        setPage={setPage}
        authUser={authUser}
        onSignOut={handleSignOut}
      />
      <main className="flex-1">
        {renderPage()}
      </main>
      <Footer setPage={setPage} />
    </div>
  );
}

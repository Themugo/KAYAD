import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar.jsx';
import Footer from './components/Footer.jsx';
import HomePage from './pages/HomePage.jsx';
import BrowsePage from './pages/BrowsePage.jsx';
import AuctionPage from './pages/AuctionPage.jsx';
import CarDetailPage from './pages/CarDetailPage.jsx';
import AuthPage from './pages/AuthPage.jsx';

export default function App() {
  const [user, setUser] = useState(null);

  return (
    <BrowserRouter>
      <div className="app-root">
        <Navbar user={user} onLogout={() => setUser(null)} />
        <main className="main-content">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/browse" element={<BrowsePage />} />
            <Route path="/auctions" element={<AuctionPage />} />
            <Route path="/car/:id" element={<CarDetailPage />} />
            <Route path="/auth" element={<AuthPage onLogin={setUser} />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
        <Footer />
      </div>
    </BrowserRouter>
  );
}

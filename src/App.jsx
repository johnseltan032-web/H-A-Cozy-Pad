import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  useNavigate,
  useLocation,
} from 'react-router-dom';

import { API_BASE_URL } from './lib/api';

import AuthModal from './components/AuthModal';
import RegisterModal from './components/RegisterModal';
import HelpCenter from './pages/faq_page/HelpCenter';
import FaqManagement from './pages/faq_page/FaqManagement';
import Profile from './pages/Profile';
import Trips from './pages/Trips';

import ListedProperty from './pages/ListedProperty';
import ProtectedRoute from './components/ProtectedRoute';

// dashboard pages
import DashboardListings from './pages/dashboard_page/DashboardListings';
import DashboardReservations from './pages/dashboard_page/DashboardReservations';
import DashboardCalendar from './pages/dashboard_page/DashboardCalendar';
import DashboardOverview from './pages/dashboard_page/dashboardOverview';
import DashboardStatistics from './pages/dashboard_page/DashboardStatistics';
import DashboardActivityLog from './pages/dashboard_page/DashboardActivityLog';
import UserManagement from './pages/dashboard_page/UserManagement';
import Inbox from './pages/dashboard_page/Inbox';

// home page
import HomePage from './pages/home_page/HomePage';

// booking confirmation
import BookingConfirmation from './pages/booking_page/Bookingconfirmation';
import BookingConfirmation2 from './pages/booking_page/Bookingconfirmation_2';

import Chatbot from './components/Chatbot';
import MobileTabBar from './components/MobileTabBar';

// listing pages
import PlaceOffer from './pages/listing_page/PlaceOffer';
import UnitSelection from './pages/listing_page/UnitSelection';
import PlaceRate from './pages/listing_page/PlaceRate';
import PlaceDetail from './pages/listing_page/PlaceDetail';
import ListingPublish from './pages/listing_page/ListingPublish';
import PlaceImages from './pages/listing_page/PlaceImages';

import VerifyEmail from './pages/verify_email';

export default function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}

function AppContent() {
  const navigate = useNavigate();
  const location = useLocation();
  const isListingFlow =
    location.pathname === '/host/listing' || location.pathname.startsWith('/host/listing/');
  const isHostDashboard = location.pathname.startsWith('/host/');

  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [statusToast, setStatusToast] = useState('');
  const statusToastTimer = useRef(null);

  const [loginRedirect, setLoginRedirect] = useState('/');

  useEffect(() => {
    document.body.classList.toggle('listing-flow-active', isListingFlow);
    return () => document.body.classList.remove('listing-flow-active');
  }, [isListingFlow]);


  const handleOpenAuth = (redirectTo = '/') => {
    setLoginRedirect(redirectTo);
    setIsRegisterModalOpen(false);
    setIsAuthModalOpen(true);
  };

  const handleOpenRegister = () => {
    setIsAuthModalOpen(false);
    setIsRegisterModalOpen(true);
  };

  
  const handleLoginSuccess = (userData) => {
    setUser(userData);

    setIsAuthModalOpen(false);

    const role = String(userData?.role || '').toLowerCase();
    if (role === 'admin' || role === 'super_admin') {
      navigate('/host/overview');
    } else if (loginRedirect) {
      navigate(loginRedirect);
    }
  };

  useEffect(() => {
    fetch(`${API_BASE_URL}/check_auth.php`, {
      credentials: 'include',
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.authenticated) {
          setUser(data.user);
        } else {
          setUser(null);
        }
      })
      .catch(() => setUser(null))
      .finally(() => setIsLoading(false));

    const handleAuthChange = (event) => {
      if (event.detail?.loggedIn && event.detail?.user) {
        setUser(event.detail.user);
        if (!event.detail.suppressWelcomeToast) {
          const fullName = event.detail.user.fullName || event.detail.user.name || event.detail.user.full_name || 'User';
          setStatusToast(`Welcome, ${fullName}!`);
        }
      } else {
        setUser(null);
      }
    };

    const handleStatusToast = (event) => {
      if (typeof event.detail?.message === 'string') {
        setStatusToast(event.detail.message);
      }
    };

    window.addEventListener('auth-changed', handleAuthChange);
    window.addEventListener('app-status-toast', handleStatusToast);

    return () => {
      window.removeEventListener('auth-changed', handleAuthChange);
      window.removeEventListener('app-status-toast', handleStatusToast);
      if (statusToastTimer.current) clearTimeout(statusToastTimer.current);
    };
  }, []);

  useEffect(() => {
    if (!statusToast) return undefined;
    if (statusToastTimer.current) clearTimeout(statusToastTimer.current);
    statusToastTimer.current = setTimeout(() => setStatusToast(''), 3000);
    return () => {
      if (statusToastTimer.current) clearTimeout(statusToastTimer.current);
    };
  }, [statusToast]);

  return (
    <>
      <Routes>
        <Route
          path="/"
          element={
            <HomePage
              isMenuOpen={isMenuOpen}
              setIsMenuOpen={setIsMenuOpen}
              user={user}
              onLogout={() => setUser(null)}
              onOpenSignIn={() => handleOpenAuth(null)}
              onOpenRegister={handleOpenRegister}
            />
          }
        />

        <Route
          path="/property/:unitId"
          element={
            <ListedProperty
              isMenuOpen={isMenuOpen}
              setIsMenuOpen={setIsMenuOpen}
              user={user}
              onLogout={() => setUser(null)}
              onOpenSignIn={() => handleOpenAuth(null)}
              onOpenRegister={handleOpenRegister}
            />
          }
        />

        <Route path="/verify-email" element={<VerifyEmail />} />

        <Route
          element={
            <ProtectedRoute
              user={user}
              isLoading={isLoading}
              allowedRoles={['super_admin']}
            />
          }
        >
          <Route path="/host/faqs" element={<FaqManagement />} />
          <Route path="/host/FaqManagement" element={<FaqManagement />} />
        </Route>

        <Route
          path="/profile"
          element={
            <Profile
              user={user}
              isMenuOpen={isMenuOpen}
              setIsMenuOpen={setIsMenuOpen}
              onLogout={() => setUser(null)}
              onOpenSignIn={() => handleOpenAuth(null)}
              onOpenRegister={handleOpenRegister}
            />
          }
        />

        <Route
          element={
            <ProtectedRoute
              user={user}
              isLoading={isLoading}
              allowedRoles={['super_admin', 'admin']}
            />
          }
        >
          <Route path="/host/overview" element={<DashboardOverview />} />
          <Route
            path="/host/settings"
            element={
              <Profile
                user={user}
                onLogout={() => setUser(null)}
                isHostView
              />
            }
          />
          <Route path="/host/statistics" element={<DashboardStatistics user={user} />} />
          <Route
            element={
              <ProtectedRoute
                user={user}
                isLoading={isLoading}
                allowedRoles={['super_admin']}
              />
            }
          >
            <Route path="/host/activity-log" element={<DashboardActivityLog />} />
          </Route>
          <Route path="/host/expenses" element={<Navigate to="/host/statistics" replace />} />
          <Route path="/host/listings" element={<DashboardListings />} />
          <Route path="/listings" element={<DashboardListings />} />
          <Route path="/host/reservations" element={<DashboardReservations />} />
          <Route path="/host/calendar" element={<DashboardCalendar />} />
          <Route path="/host/inbox" element={<Inbox />} />
          <Route
            path="/host/listing"
            element={<Navigate to="/host/listing/UnitSelection" replace />}
          />
          <Route
            path="/host/listing/UnitSelection"
            element={<UnitSelection />}
          />
          <Route
            path="/host/listing/PlaceOffer"
            element={<PlaceOffer />}
          />
          <Route
            path="/host/listing/PlaceRate"
            element={<PlaceRate />}
          />
          <Route
            path="/host/listing/PlaceDetail"
            element={<PlaceDetail />}
          />
          <Route
            path="/host/listing/ListingPublish"
            element={<ListingPublish />}
          />
          <Route
            path="/host/listing/PlaceImages"
            element={<PlaceImages />}
          />
        </Route>

        <Route
          element={
            <ProtectedRoute
              user={user}
              isLoading={isLoading}
              allowedRoles={['super_admin', 'admin']}
            />
          }
        >
          <Route
            path="/host/users"
            element={<UserManagement />}
          />
        </Route>

        <Route
          path="/help"
          element={
            <HelpCenter
              isMenuOpen={isMenuOpen}
              setIsMenuOpen={setIsMenuOpen}
              user={user}
              onLogout={() => setUser(null)}
              onOpenSignIn={() => handleOpenAuth(null)}
              onOpenRegister={handleOpenRegister}
              onOpenChat={() => setIsChatOpen(true)}
            />
          }
        />

        <Route
          path="/trips"
          element={<Trips onOpenSignIn={() => handleOpenAuth(null)} />}
        />

        <Route
          path="/booking-confirmation"
          element={
            <BookingConfirmation
              user={user}
              onLogout={() => setUser(null)}
              isMenuOpen={isMenuOpen}
              setIsMenuOpen={setIsMenuOpen}
              onOpenSignIn={() => handleOpenAuth(null)}
              onOpenRegister={handleOpenRegister}
            />
          }
        />

        <Route
          path="/booking-confirmation-2"
          element={
            <BookingConfirmation2
              user={user}
              onLogout={() => setUser(null)}
              isMenuOpen={isMenuOpen}
              setIsMenuOpen={setIsMenuOpen}
              onOpenSignIn={() => handleOpenAuth(null)}
              onOpenRegister={handleOpenRegister}
            />
          }
        />
      </Routes>
      {statusToast && createPortal(
        <div role="status" className="header-status-toast flex items-center gap-3 rounded-lg bg-green-700 px-5 py-3 text-sm font-medium text-white shadow-lg">
          <span aria-hidden="true" className="text-lg leading-none">✓</span>
          {statusToast}
        </div>,
        document.body
      )}

      {!isListingFlow && <MobileTabBar onOpenChat={() => setIsChatOpen(true)} />}

      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onLoginSuccess={handleLoginSuccess}
        onSwitchToRegister={handleOpenRegister}
      />

      <RegisterModal
        isOpen={isRegisterModalOpen}
        onClose={() => setIsRegisterModalOpen(false)}
      />

      {!isListingFlow && !isHostDashboard && (
        <Chatbot
          isOpen={isChatOpen}
          onOpen={() => setIsChatOpen(true)}
          onClose={() => setIsChatOpen(false)}
        />
      )}
    </>
  );
}
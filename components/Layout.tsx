
import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Users, 
  Scissors, 
  Calendar, 
  ShoppingBag, 
  CreditCard, 
  Sparkles, 
  Menu,
  X,
  Crown,
  BarChart2,
  Bell,
  Tags,
  LogOut,
  Sparkle
} from 'lucide-react';
import { db, createNotification } from '../services/db';
import { authService } from '../services/auth';
import { Notification } from '../types';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [user, setUser] = useState(authService.getCurrentUser());
  const navigate = useNavigate();
  const location = useLocation();

  // Check for notifications periodically and update user state
  useEffect(() => {
    // Refresh user state on navigation (e.g. after login)
    setUser(authService.getCurrentUser());

    // Skip notification/system checks if on login page
    if (location.pathname === '/login') return;

    const checkNotifications = () => {
      const all = db.notifications.getAll();
      setUnreadCount(all.filter(n => !n.read).length);
    };

    // Run simple system checks (Simulation of backend cron jobs)
    const runSystemChecks = () => {
      const products = db.inventory.getAll();
      const existingNotifs = db.notifications.getAll();

      // Check Inventory
      products.forEach(p => {
        if (p.quantity <= p.minThreshold) {
           const alreadyNotified = existingNotifs.some(n => 
             n.type === 'alert' && n.relatedId === p.id && !n.read
           );
           if (!alreadyNotified) {
             createNotification('alert', 'Low Stock Alert', `${p.name} is running low (${p.quantity} left).`, p.id);
           }
        }
      });

      // Check Membership Renewals (Simulate "Next Month")
      const customers = db.customers.getAll();
      customers.forEach(c => {
        if (!c.membershipRenewalDate) return;
        const renewal = new Date(c.membershipRenewalDate);
        const today = new Date();
        const diffTime = renewal.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        if (diffDays <= 7 && diffDays >= 0) {
           const alreadyNotified = existingNotifs.some(n => 
             n.type === 'info' && n.relatedId === c.id && n.title.includes('Membership')
           );
           if (!alreadyNotified) {
             createNotification('info', 'Membership Expiry', `${c.name}'s membership renews in ${diffDays} days.`, c.id);
           }
        }
      });
      
      checkNotifications();
    };

    runSystemChecks();
    // In a real app, you might poll or use websockets.
    const interval = setInterval(() => {
        checkNotifications();
        // We could run system checks periodically too, but maybe less often
    }, 5000); 
    
    return () => clearInterval(interval);
  }, [location.pathname]); // Re-run when changing pages to ensure counts update

  // If we are on the login page, render just the children without layout
  // IMPORTANT: This must be AFTER all hooks are declared to avoid React Error #300
  if (location.pathname === '/login') {
      return <>{children}</>;
  }

  const handleLogout = () => {
      authService.logout();
      navigate('/login');
  };

  const navItems = [
    { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/appointments', icon: Calendar, label: 'Appointments' },
    { to: '/customers', icon: Users, label: 'Customers' },
    { to: '/staff', icon: Scissors, label: 'Staff' },
    { to: '/services', icon: Sparkle, label: 'Services' },
    { to: '/inventory', icon: ShoppingBag, label: 'Inventory' },
    { to: '/categories', icon: Tags, label: 'Categories' },
    { to: '/sales', icon: CreditCard, label: 'Sales' },
    { to: '/memberships', icon: Crown, label: 'Memberships' },
    { to: '/reports', icon: BarChart2, label: 'Reports' },
    { to: '/assistant', icon: Sparkles, label: 'Smart Assistant', highlight: true },
  ];

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Sidebar - Desktop */}
      <aside className="hidden md:flex md:flex-col w-64 bg-white border-r border-gray-200">
        <div className="flex items-center justify-center h-16 border-b border-gray-100">
          <h1 className="text-xl font-bold bg-gradient-to-r from-rose-500 to-purple-600 bg-clip-text text-transparent">
            The London Salon
          </h1>
        </div>
        <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors ${
                  isActive
                    ? 'bg-rose-50 text-rose-600'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                } ${item.highlight ? 'mt-4 border border-purple-100 bg-purple-50 text-purple-700 hover:bg-purple-100' : ''}`
              }
            >
              <item.icon className={`w-5 h-5 mr-3 ${item.highlight ? 'text-purple-600' : ''}`} />
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="p-4 border-t border-gray-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
                <div className="w-8 h-8 rounded-full bg-rose-100 flex items-center justify-center text-rose-600 font-bold">
                {user?.name?.charAt(0) || 'A'}
                </div>
                <div className="ml-3">
                <p className="text-sm font-medium text-gray-900">{user?.name || 'User'}</p>
                <p className="text-xs text-gray-500">{user?.role || 'Staff'}</p>
                </div>
            </div>
            <button 
                onClick={handleLogout}
                className="text-gray-400 hover:text-red-600"
                title="Logout"
            >
                <LogOut size={18} />
            </button>
          </div>
        </div>
      </aside>

      {/* Sidebar - Mobile */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="fixed inset-0 bg-gray-600 bg-opacity-75" onClick={() => setIsMobileMenuOpen(false)}></div>
          <div className="relative flex-1 flex flex-col max-w-xs w-full bg-white h-full">
            <div className="absolute top-0 right-0 -mr-12 pt-2">
              <button
                className="ml-1 flex items-center justify-center h-10 w-10 rounded-full focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <X className="h-6 w-6 text-white" />
              </button>
            </div>
            <div className="flex-1 h-0 pt-5 pb-4 overflow-y-auto">
              <div className="flex-shrink-0 flex items-center px-4">
                <h1 className="text-xl font-bold text-gray-900">The London Salon</h1>
              </div>
              <nav className="mt-5 px-2 space-y-1">
                {navItems.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={({ isActive }) =>
                      `flex items-center px-4 py-3 text-base font-medium rounded-md ${
                        isActive
                          ? 'bg-rose-50 text-rose-600'
                          : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                      }`
                    }
                  >
                    <item.icon className="w-6 h-6 mr-3" />
                    {item.label}
                  </NavLink>
                ))}
              </nav>
            </div>
            <div className="p-4 border-t border-gray-100 flex justify-between items-center">
                 <div className="flex items-center">
                    <div className="w-8 h-8 rounded-full bg-rose-100 flex items-center justify-center text-rose-600 font-bold">
                        {user?.name?.charAt(0) || 'A'}
                    </div>
                    <div className="ml-3">
                        <p className="text-sm font-medium text-gray-900">{user?.name || 'User'}</p>
                        <p className="text-xs text-gray-500">{user?.role || 'Staff'}</p>
                    </div>
                 </div>
                 <button onClick={handleLogout} className="text-gray-500 hover:text-red-600">
                    <LogOut size={20} />
                 </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex flex-col flex-1 w-0 overflow-hidden">
        <div className="flex justify-between md:justify-end items-center pl-1 pt-1 pr-4 sm:pl-3 sm:pt-3 bg-white border-b border-gray-200 h-16">
          <div className="md:hidden">
             <button
                className="-ml-0.5 -mt-0.5 h-12 w-12 inline-flex items-center justify-center rounded-md text-gray-500 hover:text-gray-900 focus:outline-none"
                onClick={() => setIsMobileMenuOpen(true)}
              >
                <Menu className="h-6 w-6" />
              </button>
          </div>
          
          <div className="flex items-center space-x-4">
            <button 
                onClick={() => navigate('/notifications')}
                className="relative p-2 text-gray-500 hover:text-gray-700 focus:outline-none"
            >
                <Bell className="h-6 w-6" />
                {unreadCount > 0 && (
                    <span className="absolute top-1 right-1 block h-4 w-4 rounded-full bg-red-500 text-white text-[10px] font-bold text-center leading-4">
                        {unreadCount}
                    </span>
                )}
            </button>
          </div>
        </div>
        <main className="flex-1 relative overflow-y-auto focus:outline-none bg-gray-50 p-6">
          {children}
        </main>
      </div>
    </div>
  );
};

export default Layout;

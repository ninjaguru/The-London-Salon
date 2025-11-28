
import React, { useState, useEffect, useRef } from 'react';
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
  Sparkle,
  Target,
  MapPin,
  Settings,
  Cloud,
  FileSpreadsheet
} from 'lucide-react';
import { db, createNotification, syncFromCloud } from '../services/db';
import { authService } from '../services/auth';
import { sheetsService } from '../services/sheets';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [user, setUser] = useState(authService.getCurrentUser());
  const [isCloudConfigured, setIsCloudConfigured] = useState(false);
  const [sheetViewUrl, setSheetViewUrl] = useState('');
  
  // Loading State
  const [isGlobalSyncing, setIsGlobalSyncing] = useState(false);
  
  // Ref to track if we have already synced this session to prevent re-sync on navigation
  const hasSynced = useRef(false);
  
  const navigate = useNavigate();
  const location = useLocation();

  // Auto-sync on login or app load if user exists
  useEffect(() => {
    // Only sync if user is logged in, we haven't synced this session, and we are not on login page
    if (user && !hasSynced.current && location.pathname !== '/login') {
       hasSynced.current = true; // Mark as synced immediately
       setIsGlobalSyncing(true);
       
       // Perform a background sync to get latest data from sheets
       syncFromCloud().then(res => {
         if (res.success) {
           console.log('Auto-sync successful');
         } else {
           console.warn('Auto-sync failed:', res.message);
         }
       }).finally(() => {
         // Add a small delay for better UX so it doesn't flash too fast
         setTimeout(() => setIsGlobalSyncing(false), 500);
       });
    }
  }, [user]); 

  // Check for notifications periodically and update user state
  useEffect(() => {
    // Refresh user state on navigation (e.g. after login)
    const currentUser = authService.getCurrentUser();
    // Only update state if user object actually changed to prevent firing other effects
    if (JSON.stringify(currentUser) !== JSON.stringify(user)) {
        setUser(currentUser);
    }
    
    setIsCloudConfigured(sheetsService.isConfigured());
    setSheetViewUrl(sheetsService.getViewUrl());

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
    
    const interval = setInterval(() => {
        checkNotifications();
    }, 5000); 
    
    return () => clearInterval(interval);
  }, [location.pathname]); 

  // Handle Logout
  const handleLogout = () => {
      authService.logout();
      hasSynced.current = false; // Reset sync status so next login triggers a sync
      navigate('/login');
  };

  const navItems = [
    { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/appointments', icon: Calendar, label: 'Appointments' },
    { to: '/customers', icon: Users, label: 'Customers' },
    { to: '/leads', icon: Target, label: 'Leads' },
    { to: '/staff', icon: Scissors, label: 'Staff' },
    { to: '/services', icon: Sparkle, label: 'Services' },
    { to: '/inventory', icon: ShoppingBag, label: 'Inventory' },
    { to: '/categories', icon: Tags, label: 'Categories' },
    { to: '/sales', icon: CreditCard, label: 'Sales' },
    { to: '/memberships', icon: Crown, label: 'Memberships' },
    { to: '/reports', icon: BarChart2, label: 'Reports' },
    { to: '/assistant', icon: Sparkles, label: 'Smart Assistant', highlight: true },
  ];

  if (user?.role === 'Admin') {
    navItems.push({ to: '/settings', icon: Settings, label: 'Settings', highlight: false });
  }

  // If we are on the login page, render just the children without layout
  // IMPORTANT: This must be AFTER all hooks are declared to avoid React Error #300
  if (location.pathname === '/login') {
      return <>{children}</>;
  }

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Loading Overlay */}
      {isGlobalSyncing && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-gray-900 bg-opacity-60 backdrop-blur-sm transition-opacity">
          <div className="bg-white p-6 rounded-xl shadow-2xl flex flex-col items-center animate-bounce-small">
            <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-b-4 border-rose-600 mb-4"></div>
            <h3 className="text-lg font-bold text-gray-800">Syncing Data</h3>
            <p className="text-sm text-gray-500 mt-1">Please wait while we update your salon data...</p>
          </div>
        </div>
      )}

      {/* Sidebar - Desktop */}
      <aside className="hidden md:flex md:flex-col w-64 bg-white border-r border-gray-200">
        <div className="flex flex-col items-center justify-center min-h-[7rem] border-b border-gray-100 p-4">
          <img src="/logo.png" alt="The London Salon" className="h-20 w-auto object-contain transition-all duration-300" onError={(e) => {
              // Fallback if logo missing
              e.currentTarget.style.display = 'none';
              e.currentTarget.nextElementSibling?.classList.remove('hidden');
          }}/>
          <h1 className="text-xl font-bold bg-gradient-to-r from-rose-500 to-purple-600 bg-clip-text text-transparent hidden text-center mt-2">
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
          
          <div className="mt-6 px-4 py-2 bg-gray-50 mx-2 rounded-md border border-gray-100">
              <div className="flex items-start text-xs text-gray-500">
                  <MapPin size={12} className="mt-0.5 mr-1 flex-shrink-0" />
                  <p>Vibgyor High School Road, Thubarahalli, Whitefield, Bengaluru</p>
              </div>
          </div>
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
              <div className="flex-shrink-0 flex items-center justify-center px-4 mb-4 border-b border-gray-100 pb-4">
                 <img src="/logo.png" alt="The London Salon" className="h-12 w-auto" />
              </div>
              <nav className="mt-2 px-2 space-y-1">
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
            {/* View Data Link - Admin Only */}
            {sheetViewUrl && user?.role === 'Admin' && (
              <a 
                href={sheetViewUrl} 
                target="_blank" 
                rel="noreferrer"
                className="hidden md:flex items-center text-gray-600 hover:text-green-600 text-xs font-medium bg-white border border-gray-200 px-3 py-1 rounded-full transition-colors"
                title="Open Google Sheet"
              >
                 <FileSpreadsheet className="w-3 h-3 mr-1.5" /> View Data
              </a>
            )}

            {isCloudConfigured && (
                <div title="Connected to Google Sheets" className="hidden md:flex items-center text-green-600 text-xs font-medium bg-green-50 px-2 py-1 rounded-full">
                    <Cloud className="w-3 h-3 mr-1" /> Online
                </div>
            )}

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


import React, { useState, useEffect } from 'react';
import { db, exportToCSV } from '../services/db';
import { authService } from '../services/auth';
import { Notification } from '../types';
import { Bell, Check, Trash2, Calendar, AlertTriangle, Info, User, Download } from 'lucide-react';

const Notifications: React.FC = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const user = authService.getCurrentUser();
  const isAdmin = user?.role === 'Admin';

  useEffect(() => {
    loadNotifications();
  }, []);

  const loadNotifications = () => {
    const all = db.notifications.getAll();
    // Sort by date desc
    setNotifications(all.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
  };

  const markAsRead = (id: string) => {
    const updated = notifications.map(n => n.id === id ? { ...n, read: true } : n);
    setNotifications(updated);
    db.notifications.save(updated);
  };

  const markAllAsRead = () => {
    const updated = notifications.map(n => ({ ...n, read: true }));
    setNotifications(updated);
    db.notifications.save(updated);
  };

  const deleteNotification = (id: string) => {
    if (!isAdmin) return;
    const updated = notifications.filter(n => n.id !== id);
    setNotifications(updated);
    db.notifications.save(updated);
  };

  const getIcon = (type: Notification['type']) => {
    switch (type) {
      case 'alert': return <AlertTriangle className="h-5 w-5 text-red-500" />;
      case 'reminder': return <Calendar className="h-5 w-5 text-blue-500" />;
      case 'staff': return <User className="h-5 w-5 text-purple-500" />;
      default: return <Info className="h-5 w-5 text-gray-500" />;
    }
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-3">
             <h2 className="text-2xl font-bold text-gray-800">Notifications</h2>
             {unreadCount > 0 && (
                 <span className="bg-red-100 text-red-800 text-xs font-bold px-2 py-1 rounded-full">
                     {unreadCount} New
                 </span>
             )}
        </div>
        
        <div className="flex gap-2">
            <button 
                onClick={() => exportToCSV(notifications, 'notifications')}
                className="flex items-center px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 shadow-sm"
            >
                <Download className="w-4 h-4 mr-2" /> Export
            </button>

            {unreadCount > 0 && (
                <button 
                    onClick={markAllAsRead}
                    className="text-sm text-indigo-600 hover:text-indigo-800 font-medium px-4 py-2"
                >
                    Mark all as read
                </button>
            )}
        </div>
      </div>

      <div className="bg-white shadow rounded-lg overflow-hidden divide-y divide-gray-200">
        {notifications.length === 0 ? (
            <div className="p-10 text-center text-gray-500 flex flex-col items-center">
                <Bell className="h-10 w-10 text-gray-300 mb-2" />
                <p>No notifications.</p>
            </div>
        ) : (
            notifications.map((notification) => (
                <div 
                    key={notification.id} 
                    className={`p-4 flex gap-4 transition-colors ${notification.read ? 'bg-white' : 'bg-blue-50'}`}
                >
                    <div className="flex-shrink-0 mt-1">
                        {getIcon(notification.type)}
                    </div>
                    <div className="flex-1">
                        <div className="flex justify-between items-start">
                            <h3 className={`text-sm font-medium ${notification.read ? 'text-gray-900' : 'text-blue-900'}`}>
                                {notification.title}
                            </h3>
                            <span className="text-xs text-gray-500 whitespace-nowrap ml-2">
                                {new Date(notification.date).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute:'2-digit'})}
                            </span>
                        </div>
                        <p className={`mt-1 text-sm ${notification.read ? 'text-gray-500' : 'text-blue-800'}`}>
                            {notification.message}
                        </p>
                    </div>
                    <div className="flex flex-col justify-center gap-2 ml-2">
                        {!notification.read && (
                            <button 
                                onClick={() => markAsRead(notification.id)}
                                className="text-gray-400 hover:text-blue-600"
                                title="Mark as read"
                            >
                                <Check size={18} />
                            </button>
                        )}
                        {isAdmin && (
                            <button 
                                onClick={() => deleteNotification(notification.id)}
                                className="text-gray-400 hover:text-red-600"
                                title="Delete"
                            >
                                <Trash2 size={18} />
                            </button>
                        )}
                    </div>
                </div>
            ))
        )}
      </div>
    </div>
  );
};

export default Notifications;

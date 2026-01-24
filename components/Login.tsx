import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../services/auth';
import { firebaseService } from '../services/firebase';
import { Lock, User, Settings, Save, ArrowLeft, AlertCircle } from 'lucide-react';

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Config State
  const [showConfig, setShowConfig] = useState(false);
  const [fbConfig, setFbConfig] = useState({
    apiKey: '',
    authDomain: '',
    projectId: '',
    storageBucket: '',
    messagingSenderId: '',
    appId: ''
  });

  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const user = await authService.login(email, password);
      setLoading(false);

      if (user) {
        navigate('/');
      }
    } catch (e: any) {
      setLoading(false);
      const msg = e.message || 'Login failed';
      setError(msg);
      // Auto-show config if not configured
      if (msg.includes('not configured') || msg.includes('api-key')) {
        setShowConfig(true);
      }
    }
  };

  const handleConfigSave = (e: React.FormEvent) => {
    e.preventDefault();
    firebaseService.setConfig(fbConfig);
    window.location.reload();
  };

  if (showConfig) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <div className="text-center">
            <h2 className="mt-2 text-center text-3xl font-bold text-gray-900">
              Setup Connection
            </h2>
            <p className="mt-2 text-center text-sm text-gray-600">
              Enter your Firebase Project details manually.
            </p>
          </div>
        </div>

        <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
          <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
            <form onSubmit={handleConfigSave} className="space-y-4">
              {['apiKey', 'authDomain', 'projectId', 'storageBucket', 'messagingSenderId', 'appId'].map((field) => (
                <div key={field}>
                  <label className="block text-xs font-medium text-gray-700 uppercase tracking-wide">{field}</label>
                  <input
                    type="text"
                    required
                    value={(fbConfig as any)[field]}
                    onChange={e => setFbConfig({ ...fbConfig, [field]: e.target.value })}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-rose-500 focus:border-rose-500 sm:text-xs font-mono"
                  />
                </div>
              ))}

              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowConfig(false)}
                  className="flex-1 flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" /> Back
                </button>
                <button
                  type="submit"
                  className="flex-1 flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-rose-600 hover:bg-rose-700 focus:outline-none"
                >
                  <Save className="w-4 h-4 mr-2" /> Save Config
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="text-center">
          <img
            src="/logo.png?v=2"
            alt="The London Salon"
            className="mx-auto h-32 w-auto mb-6 object-contain"
          />
          <h2 className="mt-2 text-center text-sm text-gray-600">
            Sign in to your account
          </h2>
        </div>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <form className="space-y-6" onSubmit={handleLogin}>
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email Address
              </label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="focus:ring-rose-500 focus:border-rose-500 block w-full pl-10 sm:text-sm border-gray-300 rounded-md py-2 border"
                  placeholder="admin@thelondonsalon.com"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Password
              </label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="focus:ring-rose-500 focus:border-rose-500 block w-full pl-10 sm:text-sm border-gray-300 rounded-md py-2 border"
                  placeholder="Password"
                />
              </div>
            </div>

            {error && (
              <div className="rounded-md bg-red-50 p-4">
                <div className="flex">
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-red-800 flex items-center">
                      <AlertCircle className="w-4 h-4 mr-2" />
                      {error}
                    </h3>
                    {(error.includes('configured') || error.includes('api-key')) && (
                      <p className="text-xs text-red-600 mt-1 underline cursor-pointer" onClick={() => setShowConfig(true)}>
                        Check Configuration
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            <div>
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-rose-600 hover:bg-rose-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-rose-500 disabled:opacity-50"
              >
                {loading ? 'Signing in...' : 'Sign in'}
              </button>
            </div>
          </form>

          <div className="mt-6 flex justify-center">
            <button onClick={() => setShowConfig(true)} className="flex items-center text-xs text-gray-400 hover:text-gray-600">
              <Settings className="w-3 h-3 mr-1" /> Configure Connection
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
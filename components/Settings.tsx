
import React, { useState, useEffect } from 'react';
import { firebaseService, FirebaseConfig, getFirebaseDb, getFirebaseAuth } from '../services/firebase';
import { db } from '../services/db';
import { doc, setDoc } from 'firebase/firestore';
import { Save, CheckCircle, AlertCircle, Copy, ExternalLink, Printer, Globe, Flame, RefreshCw, LogIn } from 'lucide-react';

const Settings: React.FC = () => {
  // Firebase State
  const [fbApiKey, setFbApiKey] = useState('');
  const [fbAuthDomain, setFbAuthDomain] = useState('');
  const [fbProjectId, setFbProjectId] = useState('');
  const [fbStorageBucket, setFbStorageBucket] = useState('');
  const [fbMsgId, setFbMsgId] = useState('');
  const [fbAppId, setFbAppId] = useState('');

  const [isSyncing, setIsSyncing] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  // QR Logic
  const publicMenuUrl = `${window.location.origin}${window.location.pathname}#/menu`;
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(publicMenuUrl)}`;

  useEffect(() => {
    const fbConfig = firebaseService.getConfig();
    if (fbConfig) {
      setFbApiKey(fbConfig.apiKey);
      setFbAuthDomain(fbConfig.authDomain);
      setFbProjectId(fbConfig.projectId);
      setFbStorageBucket(fbConfig.storageBucket);
      setFbMsgId(fbConfig.messagingSenderId);
      setFbAppId(fbConfig.appId);
    }
  }, []);

  const handleSave = () => {
    firebaseService.setConfig({
      apiKey: fbApiKey.trim(),
      authDomain: fbAuthDomain.trim(),
      projectId: fbProjectId.trim(),
      storageBucket: fbStorageBucket.trim(),
      messagingSenderId: fbMsgId.trim(),
      appId: fbAppId.trim()
    });

    setStatusMsg({ type: 'success', text: 'Settings saved successfully.' });
    setTimeout(() => setStatusMsg(null), 3000);
    // Refresh page after a delay to ensure Firebase re-initializes
    setTimeout(() => window.location.reload(), 2000);
  };

  const handleSyncToFirebase = async () => {
    const auth = getFirebaseAuth();

    if (!firebaseService.isConfigured()) {
      setStatusMsg({ type: 'error', text: 'Firebase is not configured yet.' });
      return;
    }

    if (!auth || !auth.currentUser) {
      setStatusMsg({ type: 'error', text: 'You must Logout and Log In again to establish a secure Firebase session.' });
      return;
    }

    setIsSyncing(true);
    setStatusMsg(null);
    const firestore = getFirebaseDb();

    try {
      if (!firestore) throw new Error("Firestore not initialized");

      const tables = Object.keys(db);
      for (const tableKey of tables) {
        const store = (db as any)[tableKey];
        const data = store.getAll();
        await setDoc(doc(firestore, 'salon_vault', store.tableName), {
          data,
          updatedAt: new Date().toISOString(),
          updatedBy: 'migration'
        });
      }
      setStatusMsg({ type: 'success', text: 'All data migrated to Firebase successfully!' });
    } catch (e: any) {
      console.error(e);
      setStatusMsg({ type: 'error', text: 'Migration failed: ' + e.message });
    } finally {
      setIsSyncing(false);
    }
  };

  const printFlyer = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
          <html>
              <head>
                  <title>Print Menu Flyer</title>
                  <style>
                      body { font-family: 'Inter', sans-serif; text-align: center; padding: 50px; }
                      .container { border: 2px solid #e11d48; border-radius: 20px; padding: 40px; max-width: 500px; margin: auto; }
                      h1 { color: #111827; margin-bottom: 10px; font-size: 24px; }
                      p { color: #6b7280; margin-bottom: 30px; }
                      .qr-box { background: white; padding: 20px; display: inline-block; border: 1px solid #eee; margin-bottom: 20px; }
                      .logo { height: 100px; margin-bottom: 20px; }
                      .footer { font-size: 12px; color: #9ca3af; margin-top: 40px; }
                  </style>
              </head>
              <body>
                  <div class="container">
                      <img src="${window.location.origin}/logo.png" class="logo" />
                      <h1>Scan to View Our Menu</h1>
                      <p>Scan the code below to browse our latest services, combos, and wallet packages.</p>
                      <div class="qr-box">
                          <img src="${qrCodeUrl}" width="200" />
                      </div>
                      <div class="footer">The London Salon | Premium Hair & Beauty</div>
                  </div>
                  <script>window.onload = () => { window.print(); window.close(); }</script>
              </body>
          </html>
      `);
    printWindow.document.close();
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-20">
      <div>
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Settings</h2>
        <p className="text-gray-600">Configure external integrations and system preferences.</p>
      </div>

      {/* Public Menu Section */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="bg-rose-100 p-2 rounded-lg text-rose-600">
            <Globe className="h-6 w-6" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900">Public Service Menu</h3>
            <p className="text-sm text-gray-500">Your digital menu for customers to scan in-salon.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
          <div className="space-y-4">
            <div className="p-4 bg-gray-50 rounded-lg border border-gray-100">
              <p className="text-xs font-bold text-gray-400 uppercase mb-2">Menu URL</p>
              <div className="flex items-center gap-2">
                <input
                  readOnly
                  value={publicMenuUrl}
                  className="bg-transparent text-sm text-gray-600 border-none p-0 focus:ring-0 flex-1 truncate"
                />
                <button
                  onClick={() => { navigator.clipboard.writeText(publicMenuUrl); alert('URL copied!'); }}
                  className="text-rose-600 hover:text-rose-700"
                >
                  <Copy size={16} />
                </button>
              </div>
            </div>
            <div className="flex gap-3">
              <a
                href={publicMenuUrl}
                target="_blank"
                rel="noreferrer"
                className="flex-1 bg-white border border-gray-300 py-2 rounded-lg text-sm font-bold flex items-center justify-center gap-2 hover:bg-gray-50"
              >
                <ExternalLink size={16} /> Preview
              </a>
              <button
                onClick={printFlyer}
                className="flex-1 bg-rose-600 text-white py-2 rounded-lg text-sm font-bold flex items-center justify-center gap-2 hover:bg-rose-700 shadow-sm"
              >
                <Printer size={16} /> Print Flyer
              </button>
            </div>
          </div>

          <div className="flex flex-col items-center justify-center p-6 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200">
            <img src={qrCodeUrl} alt="Menu QR Code" className="w-40 h-40 bg-white p-2 rounded-lg shadow-sm mb-3" />
            <p className="text-xs text-gray-500 font-medium">Scan code to test menu</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="bg-orange-100 p-2 rounded-lg">
            <Flame className="h-6 w-6 text-orange-600" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900">Firebase Integration</h3>
            <p className="text-sm text-gray-500">Real-time database and secure authentication.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">API Key</label>
            <input type="password" value={fbApiKey} onChange={e => setFbApiKey(e.target.value)} className="block w-full rounded-md border border-gray-300 px-3 py-2 sm:text-sm font-mono" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Project ID</label>
            <input type="text" value={fbProjectId} onChange={e => setFbProjectId(e.target.value)} className="block w-full rounded-md border border-gray-300 px-3 py-2 sm:text-sm font-mono" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Auth Domain</label>
            <input type="text" value={fbAuthDomain} onChange={e => setFbAuthDomain(e.target.value)} className="block w-full rounded-md border border-gray-300 px-3 py-2 sm:text-sm font-mono" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">App ID</label>
            <input type="text" value={fbAppId} onChange={e => setFbAppId(e.target.value)} className="block w-full rounded-md border border-gray-300 px-3 py-2 sm:text-sm font-mono" />
          </div>
        </div>

        <div className="pt-4 flex justify-between items-center bg-orange-50/50 -mx-6 -mb-6 p-6 rounded-b-lg border-t border-orange-100">
          <div className="flex gap-3">
            <button onClick={handleSave} className="bg-orange-600 text-white px-4 py-2 rounded-md hover:bg-orange-700 flex items-center shadow-sm font-bold">
              <Save size={18} className="mr-2" /> Save Config
            </button>
            <button
              onClick={handleSyncToFirebase}
              disabled={isSyncing || !fbApiKey}
              className="bg-white border border-orange-200 text-orange-700 px-4 py-2 rounded-md hover:bg-orange-50 flex items-center shadow-sm disabled:opacity-50"
            >
              {isSyncing ? <RefreshCw className="animate-spin mr-2" size={18} /> :
                (!getFirebaseAuth()?.currentUser) ? <LogIn size={18} className="mr-2" /> :
                  <RefreshCw size={18} className="mr-2" />
              }
              {(!getFirebaseAuth()?.currentUser) ? 'Login to Sync' : 'Push Data to Firebase'}
            </button>
          </div>

          {statusMsg && (
            <div className={`flex items-center text-sm font-medium ${statusMsg.type === 'success' ? 'text-green-600' : 'text-red-600'}`}>
              {statusMsg.type === 'success' ? <CheckCircle size={16} className="mr-1" /> : <AlertCircle size={16} className="mr-1" />}
              {statusMsg.text}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Settings;


import React, { useState, useEffect } from 'react';
import { sheetsService, GOOGLE_APPS_SCRIPT_CODE } from '../services/sheets';
import { syncFromCloud } from '../services/db';
import { Save, RefreshCw, CheckCircle, AlertCircle, Copy, FileSpreadsheet, ExternalLink } from 'lucide-react';

const Settings: React.FC = () => {
  const [scriptUrl, setScriptUrl] = useState('');
  const [viewUrl, setViewUrl] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{type: 'success' | 'error', text: string} | null>(null);

  useEffect(() => {
    setScriptUrl(sheetsService.getScriptUrl());
    setViewUrl(sheetsService.getViewUrl());
  }, []);

  const handleSave = () => {
    sheetsService.setScriptUrl(scriptUrl.trim());
    sheetsService.setViewUrl(viewUrl.trim());
    setStatusMsg({ type: 'success', text: 'Settings saved successfully.' });
    setTimeout(() => setStatusMsg(null), 3000);
  };

  const handleSync = async () => {
    setIsSyncing(true);
    setStatusMsg(null);
    try {
      const result = await syncFromCloud();
      if (result.success) {
        setStatusMsg({ type: 'success', text: result.message });
      } else {
        setStatusMsg({ type: 'error', text: result.message });
      }
    } catch (e) {
      setStatusMsg({ type: 'error', text: 'Sync failed.' });
    } finally {
      setIsSyncing(false);
    }
  };

  const copyCode = () => {
    navigator.clipboard.writeText(GOOGLE_APPS_SCRIPT_CODE);
    alert('Code copied to clipboard!');
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Settings</h2>
        <p className="text-gray-600">Configure external integrations and system preferences.</p>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="bg-green-100 p-2 rounded-lg">
            <FileSpreadsheet className="h-6 w-6 text-green-700" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900">Google Sheets Integration</h3>
            <p className="text-sm text-gray-500">Connect your salon data to a Google Sheet for backup and external analysis.</p>
          </div>
        </div>

        <div className="space-y-4">
           {/* Web App URL */}
           <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                  Google Apps Script Web App URL
                  <span className="text-xs text-gray-500 font-normal ml-2">(from Deploy &gt; Web App)</span>
              </label>
              <input 
                type="url" 
                value={scriptUrl}
                onChange={(e) => setScriptUrl(e.target.value)}
                placeholder="https://script.google.com/macros/s/.../exec"
                className="block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-rose-500 focus:ring-rose-500 sm:text-sm"
              />
           </div>

           {/* View URL */}
           <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                  Google Spreadsheet URL
                  <span className="text-xs text-gray-500 font-normal ml-2">(to enable "View Data" button)</span>
              </label>
              <input 
                type="url" 
                value={viewUrl}
                onChange={(e) => setViewUrl(e.target.value)}
                placeholder="https://docs.google.com/spreadsheets/d/..."
                className="block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-rose-500 focus:ring-rose-500 sm:text-sm"
              />
           </div>

           <div className="pt-2">
                <button 
                    onClick={handleSave}
                    className="bg-gray-800 text-white px-4 py-2 rounded-md hover:bg-gray-700 flex items-center shadow-sm"
                 >
                    <Save size={18} className="mr-2" /> Save Settings
                 </button>
           </div>

           <hr className="border-gray-100 my-4"/>

           <div className="flex items-center justify-between bg-gray-50 p-4 rounded-md border border-gray-200">
              <div className="flex items-center gap-2">
                 {isSyncing ? <RefreshCw className="animate-spin text-indigo-600" /> : <RefreshCw className="text-gray-400" />}
                 <div>
                    <span className="text-sm font-medium text-gray-700 block">Manual Sync</span>
                    <span className="text-xs text-gray-500">Pull latest data from the connected sheet</span>
                 </div>
              </div>
              <button 
                onClick={handleSync}
                disabled={!scriptUrl || isSyncing}
                className="text-indigo-600 hover:text-indigo-800 text-sm font-medium disabled:opacity-50 px-3 py-1 border border-indigo-200 rounded hover:bg-white transition-colors"
              >
                Pull Data
              </button>
           </div>

           {statusMsg && (
             <div className={`p-3 rounded-md flex items-center text-sm ${statusMsg.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
                {statusMsg.type === 'success' ? <CheckCircle size={16} className="mr-2" /> : <AlertCircle size={16} className="mr-2" />}
                {statusMsg.text}
             </div>
           )}
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
         <h3 className="text-lg font-bold text-gray-900 mb-4">Setup Instructions</h3>
         <ol className="list-decimal list-inside space-y-3 text-sm text-gray-600">
             <li>Create a new <strong>Google Sheet</strong> in your Google Drive.</li>
             <li>Go to <strong>Extensions &gt; Apps Script</strong>.</li>
             <li>Delete any code in <code>Code.gs</code> and paste the script below.</li>
             <li>Click <strong>Deploy &gt; New Deployment</strong>.</li>
             <li>Select type: <strong>Web app</strong>.</li>
             <li>Set <em>Execute as:</em> <strong>Me</strong>.</li>
             <li>Set <em>Who has access:</em> <strong>Anyone</strong> (This allows the app to connect without login prompt).</li>
             <li>Click <strong>Deploy</strong> and copy the <strong>Web App URL</strong>.</li>
             <li>Paste the Web App URL in the first field above.</li>
             <li>Copy the browser URL of your Google Sheet and paste it in the second field above.</li>
         </ol>

         <div className="mt-4 relative">
            <div className="absolute top-2 right-2">
                <button onClick={copyCode} className="text-xs bg-gray-200 hover:bg-gray-300 px-2 py-1 rounded flex items-center text-gray-700">
                    <Copy size={12} className="mr-1" /> Copy Code
                </button>
            </div>
            <pre className="bg-gray-900 text-gray-100 p-4 rounded-md text-xs overflow-x-auto h-64">
                {GOOGLE_APPS_SCRIPT_CODE}
            </pre>
         </div>
      </div>
    </div>
  );
};

export default Settings;

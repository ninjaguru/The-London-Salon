
export interface SheetResponse {
  status: 'success' | 'error';
  message?: string;
  data?: any;
}

const STORAGE_KEY_URL = 'salon_google_sheet_url';
const STORAGE_KEY_VIEW_URL = 'salon_google_sheet_view_url';

export const sheetsService = {
  // Get the configured Web App URL
  getScriptUrl: (): string => {
    return localStorage.getItem(STORAGE_KEY_URL) || '';
  },

  // Save the Web App URL
  setScriptUrl: (url: string) => {
    localStorage.setItem(STORAGE_KEY_URL, url);
  },

  // Get the configured Spreadsheet View URL
  getViewUrl: (): string => {
    return localStorage.getItem(STORAGE_KEY_VIEW_URL) || '';
  },

  // Save the Spreadsheet View URL
  setViewUrl: (url: string) => {
    localStorage.setItem(STORAGE_KEY_VIEW_URL, url);
  },

  // Check if configured
  isConfigured: (): boolean => {
    return !!localStorage.getItem(STORAGE_KEY_URL);
  },

  // Fetch all data (Pull)
  readAll: async (): Promise<SheetResponse> => {
    const url = sheetsService.getScriptUrl();
    if (!url) return { status: 'error', message: 'Script URL not configured' };

    try {
      const response = await fetch(`${url}?action=readAll`);
      const json = await response.json();
      return json;
    } catch (error) {
      console.error('Sheets Read Error:', error);
      return { status: 'error', message: 'Failed to fetch from Google Sheets' };
    }
  },

  // Write specific table data (Push)
  write: async (tableName: string, data: any[]): Promise<SheetResponse> => {
    const url = sheetsService.getScriptUrl();
    if (!url) return { status: 'error', message: 'Script URL not configured' };

    try {
      // We use POST with 'no-cors' if using pure fetch in some envs, but GAS web app usually supports CORS if deployed correctly.
      // However, to send JSON body to GAS `doPost`, we usually need text/plain to avoid preflight issues in some strict browser sandboxes,
      // or rely on the script handling standard CORS. 
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain;charset=utf-8', // Bypass complex CORS preflight
        },
        body: JSON.stringify({
          action: 'write',
          tab: tableName,
          data: data
        })
      });

      const json = await response.json();
      return json;
    } catch (error) {
      console.error('Sheets Write Error:', error);
      return { status: 'error', message: 'Failed to write to Google Sheets' };
    }
  }
};

export const GOOGLE_APPS_SCRIPT_CODE = `
// -----------------------------------------------------------
// COPY THIS CODE INTO EXTENSIONS > APPS SCRIPT IN GOOGLE SHEETS
// DEPLOY AS WEB APP > ACCESS: ANYONE
// -----------------------------------------------------------

function doGet(e) {
  return handleRequest(e);
}

function doPost(e) {
  return handleRequest(e);
}

function handleRequest(e) {
  const lock = LockService.getScriptLock();
  lock.tryLock(10000);

  try {
    const action = e.parameter.action || (e.postData && JSON.parse(e.postData.contents).action);
    
    if (action === 'readAll') {
      return readAllTables();
    } else if (action === 'write') {
      const body = JSON.parse(e.postData.contents);
      return writeTable(body.tab, body.data);
    } else {
      return response({status: 'error', message: 'Invalid action'});
    }
  } catch (err) {
    return response({status: 'error', message: err.toString()});
  } finally {
    lock.releaseLock();
  }
}

function readAllTables() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const result = {};
  const sheets = ss.getSheets();

  sheets.forEach(sheet => {
    const name = sheet.getName();
    const data = sheet.getDataRange().getValues();
    if (data.length > 1) {
      const headers = data[0];
      const rows = data.slice(1);
      result[name] = rows.map(row => {
        const obj = {};
        headers.forEach((h, i) => {
          let val = row[i];
          // Try to parse JSON strings back to objects (for arrays/objects stored as string)
          if (typeof val === 'string' && (val.startsWith('[') || val.startsWith('{'))) {
            try { val = JSON.parse(val); } catch(e) {}
          }
          obj[h] = val;
        });
        return obj;
      });
    } else {
      result[name] = [];
    }
  });

  return response({status: 'success', data: result});
}

function writeTable(tabName, data) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(tabName);
  
  if (!sheet) {
    sheet = ss.insertSheet(tabName);
  }

  // Clear existing content
  sheet.clear();

  if (!data || data.length === 0) {
    return response({status: 'success', message: 'Cleared table'});
  }

  // Extract headers
  const headers = Object.keys(data[0]);
  const rows = data.map(item => headers.map(h => {
    const val = item[h];
    // Stringify objects/arrays
    return (typeof val === 'object' && val !== null) ? JSON.stringify(val) : val;
  }));

  // Write headers
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]).setFontWeight('bold');
  
  // Write data
  sheet.getRange(2, 1, rows.length, headers.length).setValues(rows);

  return response({status: 'success'});
}

function response(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
`;

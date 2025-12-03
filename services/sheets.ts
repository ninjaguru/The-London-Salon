
export interface SheetResponse {
  status: 'success' | 'error';
  message?: string;
  data?: any;
}

const STORAGE_KEY_URL = 'salon_google_sheet_url';
const STORAGE_KEY_VIEW_URL = 'salon_google_sheet_view_url';

// Hardcoded Defaults provided by user
const DEFAULT_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbywki4ZvZsoDSaBlhyhD8ocBFI-9bCxpI1wTMktX3VYKgAraTcb9ZFiDu5GuAKrZEDstg/exec';
const DEFAULT_VIEW_URL = 'https://docs.google.com/spreadsheets/d/1XQxJD-qSNQZZqMEMaXLS5eAa69V4NZi3IeA8L1XG-pM/edit?gid=0#gid=0';

export const sheetsService = {
  // Get the configured Web App URL (or default)
  getScriptUrl: (): string => {
    try {
        return localStorage.getItem(STORAGE_KEY_URL) || DEFAULT_SCRIPT_URL;
    } catch(e) { return DEFAULT_SCRIPT_URL; }
  },

  // Save the Web App URL
  setScriptUrl: (url: string) => {
    try { localStorage.setItem(STORAGE_KEY_URL, url); } catch(e) {}
  },

  // Get the configured Spreadsheet View URL (or default)
  getViewUrl: (): string => {
    try {
        return localStorage.getItem(STORAGE_KEY_VIEW_URL) || DEFAULT_VIEW_URL;
    } catch(e) { return DEFAULT_VIEW_URL; }
  },

  // Save the Spreadsheet View URL
  setViewUrl: (url: string) => {
    try { localStorage.setItem(STORAGE_KEY_VIEW_URL, url); } catch(e) {}
  },

  // Check if configured (Always true now due to defaults)
  isConfigured: (): boolean => {
    return !!sheetsService.getScriptUrl();
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

  // Read a specific page of data (Pull Pagination)
  readPage: async (tableName: string, page: number, pageSize: number): Promise<SheetResponse> => {
    const url = sheetsService.getScriptUrl();
    if (!url) return { status: 'error', message: 'Script URL not configured' };

    try {
      const response = await fetch(`${url}?action=readPage&table=${tableName}&page=${page}&pageSize=${pageSize}`);
      const json = await response.json();
      return json;
    } catch (error) {
      console.error('Sheets Read Page Error:', error);
      return { status: 'error', message: 'Failed to fetch page from Google Sheets' };
    }
  },

  // Write specific table data (Push)
  write: async (tableName: string, data: any[]): Promise<SheetResponse> => {
    const url = sheetsService.getScriptUrl();
    if (!url) return { status: 'error', message: 'Script URL not configured' };

    try {
      // We use POST with text/plain to avoid CORS preflight issues in some restricted environments
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain;charset=utf-8', 
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
    } else if (action === 'readPage') {
      return readTablePage(e.parameter.table, e.parameter.page, e.parameter.pageSize);
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
    // For large tables like Customers/Appointments, limit initial sync to first 20 rows to prevent timeout
    let limit = -1; 
    if (name === 'Customers' || name === 'Appointments') {
        limit = 21; // Header + 20 rows
    }

    const lastRow = sheet.getLastRow();
    const lastCol = sheet.getLastColumn();
    
    if (lastRow > 1) {
        const rowsToRead = (limit > 0 && limit < lastRow) ? limit : lastRow;
        const data = sheet.getRange(1, 1, rowsToRead, lastCol).getValues();
        
        const headers = data[0];
        const rows = data.slice(1);
        result[name] = rows.map(row => {
            const obj = {};
            headers.forEach((h, i) => {
            let val = row[i];
            // Try to parse JSON strings back to objects
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

function readTablePage(tableName, page, pageSize) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(tableName);
  
  if (!sheet) return response({status: 'error', message: 'Table not found'});

  const p = parseInt(page) || 1;
  const ps = parseInt(pageSize) || 20;
  const startRow = (p - 1) * ps + 2; // +2 because row 1 is header
  
  const lastRow = sheet.getLastRow();
  const lastCol = sheet.getLastColumn();
  
  if (lastRow <= 1) return response({status: 'success', data: [], total: 0});
  
  // Get Headers
  const headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
  
  // Get Data
  let rows = [];
  if (startRow <= lastRow) {
      const rowsToRead = Math.min(ps, lastRow - startRow + 1);
      const data = sheet.getRange(startRow, 1, rowsToRead, lastCol).getValues();
      rows = data.map(row => {
        const obj = {};
        headers.forEach((h, i) => {
          let val = row[i];
          if (typeof val === 'string' && (val.startsWith('[') || val.startsWith('{'))) {
            try { val = JSON.parse(val); } catch(e) {}
          }
          obj[h] = val;
        });
        return obj;
      });
  }

  return response({
      status: 'success', 
      data: rows, 
      total: lastRow - 1,
      page: p
  });
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

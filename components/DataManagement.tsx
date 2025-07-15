import React, { useState, useRef, useEffect } from 'react';
import { Employee } from '../types';
import { parsePerformanceData } from '../services/parser';
import { parseEmployeeCSV, validateEmployeeData } from '../services/csvParser';
import ResolveEmployeesDialog from './ResolveEmployeesDialog';
import { api, UploadSession } from '../services/api';
import { IconClipboardData, IconAnalyze, IconSparkles, IconUsers } from './Icons';

interface DataManagementProps {
  employees: Employee[];
  onDataUpdate: (employees: Employee[], sessionName?: string) => void;
}

const DataManagement: React.FC<DataManagementProps> = ({ employees, onDataUpdate }) => {
  const [rawText, setRawText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploadSessions, setUploadSessions] = useState<UploadSession[]>([]);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [sessionName, setSessionName] = useState('');
  const [selectedSessions, setSelectedSessions] = useState<Set<string>>(new Set());
  const [showMergeOptions, setShowMergeOptions] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [resolveModal, setResolveModal] = useState<{unknown: string[]; orgMap: Record<string, string>} | null>(null);

  const detectDataType = (data: string): 'employee_roster' | 'performance_data' => {
    const lines = data.trim().split('\n').filter(line => line.trim().length > 1);
    if (lines.length < 1) return 'performance_data'; // default fallback
    
    const header = lines[0].toLowerCase();
    
    // Check for employee roster headers (Indonesian)
    const employeeRosterKeywords = ['nama', 'nip', 'gol', 'pangkat', 'jabatan'];
    const foundEmployeeKeywords = employeeRosterKeywords.filter(keyword => 
      header.includes(keyword)
    );
    
    // Check for performance data headers (employee names in brackets)
    const hasBracketedNames = header.includes('[') && header.includes(']');
    
    // If 3+ employee roster keywords found, it's employee roster data
    if (foundEmployeeKeywords.length >= 3) {
      console.log('Detected employee roster data based on keywords:', foundEmployeeKeywords);
      return 'employee_roster';
    }
    
    // If bracketed names found, it's performance data
    if (hasBracketedNames) {
      console.log('Detected performance data based on bracketed names');
      return 'performance_data';
    }
    
    // Default to performance data if unclear
    console.log('Could not clearly detect data type, defaulting to performance data');
    return 'performance_data';
  };

  const extractEmployeeNamesFromData = (data: string): string[] => {
    console.log('=== EXTRACTING EMPLOYEE NAMES ===');
    console.log('Raw data length:', data.length);
    console.log('First 200 chars:', data.substring(0, 200));
    
    const lines = data.trim().split('\n').filter(line => line.trim().length > 1);
    if (lines.length < 1) return [];
    
    const header = lines[0];
    console.log('Header line:', header.substring(0, 300) + '...');
    const employeeNames: string[] = [];
    
    // Enhanced delimiter detection for Google Sheets copy-paste
    const commaCount = (header.match(/,/g) || []).length;
    const tabCount = (header.match(/\t/g) || []).length;
    const multiSpaceCount = (header.match(/\s{2,}/g) || []).length; // 2+ consecutive spaces
    
    let delimiter = ',';
    let isSpaceDelimited = false;
    
    // Priority: tabs > multiple spaces > commas
    if (tabCount > 0) {
      delimiter = '\t';
    } else if (multiSpaceCount > 0 && multiSpaceCount >= commaCount) {
      // Use regex-based splitting for multiple spaces
      isSpaceDelimited = true;
    } else {
      delimiter = ',';
    }
    
    console.log(`Header delimiter detection - tabs: ${tabCount}, multi-spaces: ${multiSpaceCount}, commas: ${commaCount}, chosen: ${isSpaceDelimited ? 'multi-space' : delimiter}`);

    let fields = [];
    if (isSpaceDelimited) {
      // Split on 2+ consecutive spaces, then trim each field
      fields = header.split(/\s{2,}/).map(field => field.trim()).filter(field => field.length > 0);
    } else {
      // Standard delimiter parsing
      let currentField = '';
      let inQuotes = false;
      
      for (let i = 0; i < header.length; i++) {
        const char = header[i];
        if (char === '"') {
          if (inQuotes && i < header.length - 1 && header[i + 1] === '"') {
            currentField += '"';
            i++;
          } else {
            inQuotes = !inQuotes;
          }
        } else if (char === delimiter && !inQuotes) {
          fields.push(currentField.trim());
          currentField = '';
        } else {
          currentField += char;
        }
      }
      fields.push(currentField.trim());
      fields = fields.filter(field => field.length > 0);
    }
    
    console.log('Total fields parsed:', fields.length);
    console.log('Sample fields:', fields.slice(0, 5));
    
    // Extract employee names from headers like "Competency [Employee Name]"
    fields.forEach(field => {
      const match = field.match(/\[(.*?)\]/);
      if (match) {
        let employeeName = match[1].trim();
        // Remove leading numbering like "1." or "4. "
        employeeName = employeeName.replace(/^\d+\.?\s*/, '');
        if (employeeName && !employeeNames.includes(employeeName)) {
          employeeNames.push(employeeName);
        }
      }
    });
    
    console.log('=== EXTRACTION COMPLETE ===');
    console.log('Total employees found:', employeeNames.length);
    console.log('Employee names:', employeeNames);
    
    return employeeNames;
  };

  const handleProcessData = async () => {
    if (!rawText.trim()) {
      setError('Please paste the data into the text area.');
      return;
    }
    setIsLoading(true);
    setError(null);
    
    setTimeout(async () => {
      try {
        // Detect data type first
        const dataType = detectDataType(rawText);
        console.log('Detected data type:', dataType);
        
        if (dataType === 'employee_roster') {
          // Handle employee roster data import
          console.log('Processing as employee roster data...');
          
          try {
            const parsedEmployees = parseEmployeeCSV(rawText);
            const validation = validateEmployeeData(parsedEmployees);
            
            if (!validation.valid) {
              setError(`Data tidak valid:\n${validation.errors.join('\n')}`);
              return;
            }
            
            // Import employee roster data to database
            await api.importEmployeesFromCSV(parsedEmployees);
            
            // Show success message
            setError(null);
            setRawText('');
            
            // Create a simple success notification for employee roster import
            const successMessage = `✅ Berhasil mengimpor ${parsedEmployees.length} data pegawai ke database!\n\nSekarang Anda bisa mengimpor data kinerja yang menggunakan nama-nama pegawai ini.`;
            alert(successMessage);
            
            return;
          } catch (err) {
            console.error('Employee roster import error:', err);
            const errorMessage = err instanceof Error ? err.message : 'Unknown error';
            setError(`Gagal mengimpor data pegawai: ${errorMessage}`);
            return;
          } finally {
            setIsLoading(false);
          }
        }
        
        // Handle performance data (existing logic)
        // Extract employee names from performance data
        const employeeNamesInData = extractEmployeeNamesFromData(rawText);
        console.log('=== DEBUGGING EMPLOYEE MATCHING ===');
        console.log('Employee names found in performance data:', employeeNamesInData);
        console.log('Total performance data employees:', employeeNamesInData.length);
        
        // Fetch organizational level mapping from database
        let orgLevelMapping: { [key: string]: string } = {};
        try {
          orgLevelMapping = await api.getEmployeeOrgLevelMapping();
          console.log('=== DATABASE EMPLOYEES ===');
          console.log('Employee names in database:', Object.keys(orgLevelMapping));
          console.log('Total employees in database:', Object.keys(orgLevelMapping).length);
          console.log('Full organizational mapping:', orgLevelMapping);
          
          if (Object.keys(orgLevelMapping).length === 0) {
            console.warn('WARNING: No employee data found in employee_database table!');
            console.log('Make sure to import employee data first via "Manage Employees" page');
          }
          
          // Test direct matching for first few employees
          console.log('=== DIRECT MATCHING TEST ===');
          employeeNamesInData.slice(0, 5).forEach(name => {
            const directMatch = orgLevelMapping[name];
            console.log(`Testing "${name}": ${directMatch ? '✅ FOUND' : '❌ NOT FOUND'} (${directMatch || 'none'})`);
          });
          
        } catch (mappingError) {
          console.error('Error fetching organizational level mapping:', mappingError);
          console.log('No organizational level mapping available, using defaults');
        }
        
        // Helper function to normalize names for comparison
        const normalizeName = (name: string): string => {
          // List of common Indonesian academic titles and honorifics to strip out
          const stopWords = [
            'st', 'sh', 'se', 'mm', 'si', 'sk', 'sos', 'ssos', 'sap', 'skep',
            'ners', 'mi', 'mps', 'sp', 'kom', 'stp', 'ap', 'pd', 'map', 'msc',
            'ma', 'mph', 'dra', 'dr', 'ir', 'amd'
          ];
          const titleRegex = new RegExp(`\\b(${stopWords.join('|')})\\b`, 'g');

          return name
            .toLowerCase()
            .replace(/[.,\-_]/g, '') // Remove punctuation characters
            .replace(/\s+/g, ' ') // Collapse multiple spaces first
            .replace(titleRegex, '') // Remove detected titles/qualifications
            .replace(/\s+/g, ' ') // Collapse spaces again after removals
            .trim();
        };
        
        // Enhanced fuzzy matching with Levenshtein distance
        const calculateSimilarity = (str1: string, str2: string): number => {
          const longer = str1.length > str2.length ? str1 : str2;
          const shorter = str1.length > str2.length ? str2 : str1;
          
          if (longer.length === 0) return 1.0;
          
          const editDistance = levenshteinDistance(longer, shorter);
          return (longer.length - editDistance) / longer.length;
        };
        
        const levenshteinDistance = (str1: string, str2: string): number => {
          const matrix = [];
          for (let i = 0; i <= str2.length; i++) {
            matrix[i] = [i];
          }
          for (let j = 0; j <= str1.length; j++) {
            matrix[0][j] = j;
          }
          for (let i = 1; i <= str2.length; i++) {
            for (let j = 1; j <= str1.length; j++) {
              if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
                matrix[i][j] = matrix[i - 1][j - 1];
              } else {
                matrix[i][j] = Math.min(
                  matrix[i - 1][j - 1] + 1,
                  matrix[i][j - 1] + 1,
                  matrix[i - 1][j] + 1
                );
              }
            }
          }
          return matrix[str2.length][str1.length];
        };
        
        // Create a normalized mapping for better matching
        const normalizedOrgMapping: { [key: string]: string } = {};
        const originalToNormalizedMap: { [key: string]: string } = {};
        
        Object.keys(orgLevelMapping).forEach(originalName => {
          const normalized = normalizeName(originalName);
          normalizedOrgMapping[normalized] = orgLevelMapping[originalName];
          originalToNormalizedMap[normalized] = originalName;
        });
        
        // Check for unknown employees with enhanced fuzzy matching
        const unknownEmployees: string[] = [];
        const fuzzyMatchedEmployees: { [key: string]: string } = {};
        
        employeeNamesInData.forEach(name => {
          const normalizedName = normalizeName(name);
          
          // Direct exact match
          if (orgLevelMapping[name]) {
            console.log(`✅ Exact match: "${name}"`);
            return;
          }
          
          // Normalized exact match
          if (normalizedOrgMapping[normalizedName]) {
            fuzzyMatchedEmployees[name] = normalizedOrgMapping[normalizedName];
            console.log(`🔄 Normalized match: "${name}" -> "${originalToNormalizedMap[normalizedName]}"`);
            return;
          }
          
          // Enhanced fuzzy matching with similarity threshold
          let bestMatch = '';
          let bestSimilarity = 0;
          const SIMILARITY_THRESHOLD = 0.8; // 80% similarity required
          
          Object.keys(orgLevelMapping).forEach(dbName => {
            const normalizedDbName = normalizeName(dbName);
            const similarity = calculateSimilarity(normalizedName, normalizedDbName);
            
            if (similarity > bestSimilarity && similarity >= SIMILARITY_THRESHOLD) {
              bestSimilarity = similarity;
              bestMatch = dbName;
            }
          });
          
          if (bestMatch) {
            fuzzyMatchedEmployees[name] = orgLevelMapping[bestMatch];
            console.log(`🎯 Fuzzy match (${(bestSimilarity * 100).toFixed(1)}%): "${name}" -> "${bestMatch}"`);
            return;
          }
          
          // No match found
          console.log(`❌ No match found for: "${name}" (normalized: "${normalizedName}")`);
          unknownEmployees.push(name);
        });
        
        console.log('Unknown employees after fuzzy matching:', unknownEmployees);
        console.log('Fuzzy matched employees:', fuzzyMatchedEmployees);
        
        // Add fuzzy matches to the orgLevelMapping
        Object.entries(fuzzyMatchedEmployees).forEach(([originalName, orgLevel]) => {
          orgLevelMapping[originalName] = orgLevel;
        });
        
        if (unknownEmployees.length > 0) {
          setResolveModal({ unknown: unknownEmployees, orgMap: orgLevelMapping as Record<string,string> });
          setIsLoading(false);
          return;
        }
        
        // If still any unknown (should be none here), default them to Staff/Other
        unknownEmployees.forEach(name => {
          orgLevelMapping[name] = 'Staff/Other';
        });
        
        console.log('Starting performance data parsing...');
        const parsedData = parsePerformanceData(rawText, undefined, orgLevelMapping);
        console.log('Parsing completed successfully:', parsedData.length, 'employees');
        const sortedData = parsedData.sort((a, b) => a.name.localeCompare(b.name));
        onDataUpdate(sortedData);
        // Automatically open save dialog and ask for month/year identifier
        const now = new Date();
        const defaultName = `${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`;
        setSessionName(defaultName);
        setShowSaveDialog(true);
        setRawText('');
      } catch (e) {
        console.error('Parsing error details:', e);
        if (e instanceof Error) {
          let errorMessage = `Parsing error: ${e.message}`;
          
          // Provide specific guidance based on common error patterns
          if (e.message.includes('header row')) {
            errorMessage += '\n\nTips:\n• Ensure the first row contains column headers\n• Headers should include employee names in brackets like: "Competency [Employee Name]"';
          } else if (e.message.includes('numeric scores')) {
            errorMessage += '\n\nTips:\n• Ensure data rows contain numeric scores (10, 65, 75, etc.) or string ratings\n• Supported string ratings: "Baik" (75), "Sangat Baik" (85), "Kurang Baik" (65)\n• Check for missing or invalid values in score columns';
          } else if (e.message.includes('format')) {
            errorMessage += '\n\nSupported formats:\n• Standard CSV with quoted fields\n• Headers: "Competency [Employee Name]"\n• Multiple assessment rows per employee are supported';
          }
          
          setError(errorMessage);
        } else {
          setError('An unknown error occurred during parsing. Please check the console for more details.');
        }
      } finally {
        setIsLoading(false);
      }
    }, 50);
  };

  const handleResolveSubmit = async (mapping: Record<string, { chosenName: string; orgLevel: string; isNew: boolean }>) => {
    if (!resolveModal) return;
    try {
      // add new employees if needed
      for (const [orig, value] of Object.entries(mapping)) {
        if (value.isNew) {
          await api.addEmployee(value.chosenName, '-', 'N/A', '-', '-', '-', value.orgLevel);
        }
        // map original column name to chosen org level for parsing
        resolveModal.orgMap[orig] = value.orgLevel;
      }
      setResolveModal(null);
      // Re-run parsing with updated mapping
      setIsLoading(true);
      setTimeout(() => {
        try {
          const parsed = parsePerformanceData(rawText, undefined, resolveModal.orgMap);
          const sorted = parsed.sort((a, b) => a.name.localeCompare(b.name));
          onDataUpdate(sorted);
          setShowSaveDialog(true);
          setSessionName(`${new Date().getMonth() + 1}/${new Date().getFullYear()}`);
          setRawText('');
        } catch (e) {
          console.error(e);
          setError('Failed after resolving employees.');
        } finally {
          setIsLoading(false);
        }
      }, 10);
    } catch (e) {
      console.error(e);
      setError('Error while saving resolved employees.');
    }
  };

  const handleResolveCancel = () => {
    setResolveModal(null);
  };

  const handleFileUpload = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      setRawText(text);
    };
    reader.readAsText(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const files = e.dataTransfer.files;
    if (files.length > 0 && files[0].type === 'text/csv') {
      handleFileUpload(files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const exportData = () => {
    if (employees.length === 0) return;
    
    const csvData = employees.map(emp => {
      const avgScore = emp.performance.reduce((s, p) => s + p.score, 0) / emp.performance.length;
      return {
        Name: emp.name,
        Job: emp.job,
        'Average Score': avgScore.toFixed(2),
        ...emp.performance.reduce((acc, perf) => ({
          ...acc,
          [perf.name]: perf.score
        }), {})
      };
    });

    const headers = Object.keys(csvData[0]);
    const csvContent = [
      headers.join(','),
      ...csvData.map(row => headers.map(header => `"${row[header as keyof typeof row]}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'employee-performance-data.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const clearData = () => {
    setRawText('');
    onDataUpdate([]);
    setError(null);
  };

  const loadUploadSessions = async () => {
    try {
      const sessions = await api.getAllUploadSessions();
      setUploadSessions(sessions);
    } catch (error) {
      console.error('Failed to load upload sessions:', error);
    }
  };

  const saveCurrentSession = async () => {
    if (employees.length === 0) return;
    
    try {
      await onDataUpdate(employees, sessionName);
      setShowSaveDialog(false);
      setSessionName('');
      await loadUploadSessions();
    } catch (error) {
      setError('Failed to save session');
    }
  };

  const loadSession = async (session: UploadSession) => {
    try {
      const employees = await api.getEmployeeDataBySession(session.session_id);
      if (employees) {
        onDataUpdate(employees);
      }
    } catch (error) {
      setError('Failed to load session');
    }
  };

  const deleteSession = async (sessionId: string) => {
    try {
      await api.deleteUploadSession(sessionId);
      await loadUploadSessions();
    } catch (error) {
      setError('Failed to delete session');
    }
  };

  const handleSessionSelection = (sessionId: string, checked: boolean) => {
    const newSelected = new Set(selectedSessions);
    if (checked) {
      newSelected.add(sessionId);
    } else {
      newSelected.delete(sessionId);
    }
    setSelectedSessions(newSelected);
  };

  const mergeSelectedSessions = async () => {
    if (selectedSessions.size < 2) {
      setError('Please select at least 2 sessions to merge');
      return;
    }
    
    try {
      setIsLoading(true);
      const allEmployees: Employee[] = [];
      
      // Fetch data from all selected sessions
      for (const sessionId of selectedSessions) {
        const employees = await api.getEmployeeDataBySession(sessionId);
        allEmployees.push(...employees);
      }
      
      // Remove duplicates based on employee name
      const uniqueEmployees = allEmployees.reduce((acc, current) => {
        const existing = acc.find(emp => emp.name === current.name);
        if (!existing) {
          acc.push(current);
        }
        return acc;
      }, [] as Employee[]);
      
      const mergedSessionName = `Merged ${selectedSessions.size} sessions - ${new Date().toLocaleString()}`;
      onDataUpdate(uniqueEmployees, mergedSessionName);
      setSelectedSessions(new Set());
      setShowMergeOptions(false);
      setError(null);
    } catch (error) {
      setError('Failed to merge sessions');
    } finally {
      setIsLoading(false);
    }
  };

  const selectAllSessions = () => {
    const allIds = new Set(uploadSessions.map(s => s.session_id));
    setSelectedSessions(allIds);
  };

  const clearSelection = () => {
    setSelectedSessions(new Set());
  };

  useEffect(() => {
    loadUploadSessions();
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Data Management
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Import, export, and manage performance data
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-gray-900 shadow-xl rounded-2xl p-6 border border-gray-200 dark:border-gray-700">
          <h2 className="flex items-center text-2xl font-bold text-gray-800 dark:text-gray-200 mb-4">
            <IconClipboardData className="w-8 h-8 mr-3 text-gray-500"/>
            Import Data
          </h2>
          
          <div 
            className={`border-2 border-dashed rounded-lg p-4 mb-4 transition-colors ${
              isDragOver 
                ? 'border-blue-400 bg-blue-50 dark:bg-blue-900/20' 
                : 'border-gray-300 dark:border-gray-600'
            }`}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
          >
            <div className="text-center">
              <IconClipboardData className="w-12 h-12 mx-auto text-gray-400 mb-2" />
              <p className="text-gray-600 dark:text-gray-400">
                Drag & drop CSV file here or 
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="text-blue-600 hover:text-blue-700 ml-1"
                >
                  browse
                </button>
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFileUpload(file);
                }}
              />
            </div>
          </div>

          <textarea
            value={rawText}
            onChange={(e) => setRawText(e.target.value)}
            placeholder="Paste CSV data here...

Supported data types:

🏢 EMPLOYEE ROSTER DATA:
- Headers: No., Nama, NIP, Gol, Pangkat, Jabatan, Sub-Jabatan
- Use this to import employee basic information first

📊 PERFORMANCE DATA:
- Headers with employee names in brackets: 'Competency [Employee Name]'  
- Data rows with numeric scores (10, 65, 75, etc.) or string ratings
- Supported string ratings: "Baik" (75), "Sangat Baik" (85), "Kurang Baik" (65)
- Multiple assessment rows per employee supported

The system will auto-detect the data type and process accordingly."
            className="w-full h-60 p-4 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-800 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 text-sm font-mono mb-4"
          />
          
          <div className="flex gap-3">
            <button
              onClick={handleProcessData}
              disabled={isLoading || !rawText.trim()}
              className="flex-1 inline-flex items-center justify-center px-6 py-3 bg-gradient-to-r from-blue-600 to-teal-500 text-white font-bold rounded-lg shadow-lg hover:shadow-xl hover:from-blue-700 hover:to-teal-600 disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-105 transition-all duration-300"
            >
              {isLoading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Processing...
                </>
              ) : (
                <>
                  <IconAnalyze className="w-5 h-5 mr-2"/>
                  Analyze Data
                </>
              )}
            </button>
            
            <button
              onClick={clearData}
              className="px-6 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              Clear
            </button>
          </div>

          {error && (
            <div className="bg-red-100 dark:bg-red-900/50 border-l-4 border-red-500 text-red-700 dark:text-red-300 p-4 rounded-lg mt-4" role="alert">
              <p className="font-bold">Error</p>
              <p>{error}</p>
            </div>
          )}
        </div>

        <div className="bg-white dark:bg-gray-900 shadow-xl rounded-2xl p-6 border border-gray-200 dark:border-gray-700">
          <h2 className="flex items-center text-2xl font-bold text-gray-800 dark:text-gray-200 mb-4">
            <IconSparkles className="w-8 h-8 mr-3 text-gray-500"/>
            Current Dataset
          </h2>
          
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
                <p className="text-sm text-gray-600 dark:text-gray-400">Total Employees</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{employees.length}</p>
              </div>
              <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
                <p className="text-sm text-gray-600 dark:text-gray-400">Competencies</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {employees.length > 0 ? employees[0].performance.length : 0}
                </p>
              </div>
            </div>
            
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {employees.map((emp, index) => (
                <div key={index} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-800 rounded">
                  <span className="font-medium text-gray-900 dark:text-white">{emp.name}</span>
                  <span className="text-sm text-gray-600 dark:text-gray-400">{emp.job}</span>
                </div>
              ))}
            </div>
            
            <div className="flex gap-3 pt-4">
              <button
                onClick={() => setShowSaveDialog(true)}
                disabled={employees.length === 0}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Save Dataset
              </button>
              
              <button
                onClick={exportData}
                disabled={employees.length === 0}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Export CSV
              </button>
              
              <button
                onClick={() => {
                  const jsonData = JSON.stringify(employees, null, 2);
                  const blob = new Blob([jsonData], { type: 'application/json' });
                  const url = window.URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = 'employee-data.json';
                  a.click();
                  window.URL.revokeObjectURL(url);
                }}
                disabled={employees.length === 0}
                className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Export JSON
              </button>
            </div>
          </div>
        </div>
      </div>

      {uploadSessions.length > 0 && (
        <div className="bg-white dark:bg-gray-900 shadow-xl rounded-2xl p-6 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <h2 className="flex items-center text-2xl font-bold text-gray-800 dark:text-gray-200">
              <IconUsers className="w-8 h-8 mr-3 text-gray-500"/>
              Saved Datasets
            </h2>
            <div className="flex gap-2">
              <button
                onClick={() => setShowMergeOptions(!showMergeOptions)}
                className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
              >
                {showMergeOptions ? 'Cancel' : 'Merge Datasets'}
              </button>
            </div>
          </div>
          
          {showMergeOptions && (
            <div className="mb-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
              <p className="text-sm text-blue-800 dark:text-blue-200 mb-3">
                Select multiple sessions to merge them together. Selected: {selectedSessions.size}
              </p>
              <div className="flex gap-2 mb-3">
                <button
                  onClick={selectAllSessions}
                  className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  Select All
                </button>
                <button
                  onClick={clearSelection}
                  className="px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-50 dark:hover:bg-gray-800"
                >
                  Clear
                </button>
                <button
                  onClick={mergeSelectedSessions}
                  disabled={selectedSessions.size < 2 || isLoading}
                  className="px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? 'Merging...' : `Merge ${selectedSessions.size} Sessions`}
                </button>
              </div>
            </div>
          )}
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {uploadSessions.map((session) => (
              <div key={session.session_id} className={`bg-gray-50 dark:bg-gray-800 rounded-lg p-4 border ${selectedSessions.has(session.session_id) ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'border-gray-200 dark:border-gray-700'}`}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center">
                    {showMergeOptions && (
                      <input
                        type="checkbox"
                        checked={selectedSessions.has(session.session_id)}
                        onChange={(e) => handleSessionSelection(session.session_id, e.target.checked)}
                        className="mr-3 w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                      />
                    )}
                    <h3 className="font-semibold text-gray-900 dark:text-white truncate">
                      {session.session_name}
                    </h3>
                  </div>
                  {!showMergeOptions && (
                    <button
                      onClick={() => deleteSession(session.session_id)}
                      className="text-red-500 hover:text-red-700 text-sm"
                      title="Delete session"
                    >
                      ✕
                    </button>
                  )}
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                  {session.employee_count} employees
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-500 mb-3">
                  {new Date(session.upload_timestamp).toLocaleDateString()}
                </p>
                {!showMergeOptions && (
                  <button
                    onClick={() => loadSession(session)}
                    className="w-full px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors text-sm"
                  >
                    Load Session
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Save Dataset Dialog */}
      {showSaveDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-900 rounded-lg p-6 w-96 border border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
              Save Dataset
            </h3>
            <input
              type="month"
              placeholder="MM/YYYY e.g. 07/2025"
              value={sessionName}
              onChange={(e) => setSessionName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white mb-4"
              autoFocus
            />
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowSaveDialog(false);
                  setSessionName('');
                }}
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800"
              >
                Cancel
              </button>
              <button
                onClick={saveCurrentSession}
                disabled={!sessionName.trim()}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    {resolveModal && (
      <ResolveEmployeesDialog
        unknownEmployees={resolveModal.unknown}
        onSubmit={handleResolveSubmit}
        onCancel={handleResolveCancel}
      />
    )}
  </div>
 );
};

export default DataManagement;
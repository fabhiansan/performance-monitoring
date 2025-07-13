import React, { useEffect, useState } from 'react';
import { api } from '../services/api';

interface Suggestion {
  name: string;
  organizational_level: string;
}

interface ResolveEmployeesDialogProps {
  unknownEmployees: string[];
  onSubmit: (mapping: Record<string, { chosenName: string; orgLevel: string; isNew: boolean }>) => void;
  onCancel: () => void;
}

/**
 * Modal dialog that lets user resolve unknown employee names found in performance CSV.
 * For each unknown name we query backend suggestions and allow user to map to an existing
 * employee or register as new. Returns mapping on submit.
 */
const ResolveEmployeesDialog: React.FC<ResolveEmployeesDialogProps> = ({ unknownEmployees, onSubmit, onCancel }) => {
  const [loading, setLoading] = useState(true);
  const [suggestionsMap, setSuggestionsMap] = useState<Record<string, Suggestion[]>>({});
  const [selection, setSelection] = useState<Record<string, string>>({});

  // Fetch suggestions for each unknown employee
  useEffect(() => {
    let mounted = true;
    const fetchAll = async () => {
      const resMap: Record<string, Suggestion[]> = {};
      for (const name of unknownEmployees) {
        try {
          // Use API service to get employee suggestions
          const suggestions = await api.getEmployeeSuggestions(name);
          resMap[name] = suggestions;
        } catch (error) {
          console.error(`Failed to get suggestions for ${name}:`, error);
          resMap[name] = [];
        }
      }
      if (mounted) {
        setSuggestionsMap(resMap);
        setLoading(false);
      }
    };
    fetchAll();
    return () => {
      mounted = false;
    };
  }, [unknownEmployees]);

  const handleSelect = (orig: string, value: string) => {
    setSelection(prev => ({ ...prev, [orig]: value }));
  };

  const handleSubmit = () => {
    const mapping: Record<string, { chosenName: string; orgLevel: string; isNew: boolean }> = {};
    unknownEmployees.forEach(name => {
      const chosen = selection[name] || '__NEW__';
      const isNew = chosen === '__NEW__';
      const orgLevel = isNew ? 'Staff/Other' : (suggestionsMap[name]?.find(s => s.name === chosen)?.organizational_level || 'Staff/Other');
      mapping[name] = { chosenName: isNew ? name : chosen, orgLevel, isNew };
    });
    onSubmit(mapping);
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
        <div className="bg-white dark:bg-gray-900 rounded-lg p-6 shadow-lg text-center text-gray-800 dark:text-gray-100">
          Loading suggestions...
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
      <div className="bg-white dark:bg-gray-900 rounded-lg p-6 shadow-xl w-full max-w-2xl">
        <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">Resolve Unknown Employees</h2>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">Please match each name to an existing employee or choose "New Employee".</p>
        <div className="max-h-96 overflow-y-auto">
          {unknownEmployees.map(name => (
            <div key={name} className="flex items-center space-x-4 py-2 border-b border-gray-200 dark:border-gray-700">
              <div className="flex-1 text-sm font-medium text-gray-800 dark:text-gray-100">{name}</div>
              <select
                className="bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded px-2 py-1 text-sm text-gray-800 dark:text-gray-100"
                value={selection[name] || '__NEW__'}
                onChange={e => handleSelect(name, e.target.value)}
              >
                <option value="__NEW__">Pegawai Baru</option>
                {(suggestionsMap[name] || []).map(s => (
                  <option key={s.name} value={s.name}>{`${s.name} (${s.organizational_level})`}</option>
                ))}
              </select>
            </div>
          ))}
        </div>
        <div className="mt-6 flex justify-end space-x-3">
          <button onClick={onCancel} className="px-4 py-2 rounded bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-100">Batal</button>
          <button onClick={handleSubmit} className="px-4 py-2 rounded bg-blue-600 text-white">Simpan</button>
        </div>
      </div>
    </div>
  );
};

export default ResolveEmployeesDialog;

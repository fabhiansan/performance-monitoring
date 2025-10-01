import React, { useEffect, useState } from 'react';
import { api } from '../../services/api';
import { Modal, Button, Select } from '../../design-system';

interface Suggestion {
  id: number;
  name: string;
  organizational_level: string | null;
}

interface ResolveEmployeesDialogProps {
  unknownEmployees: string[];
  onSubmit: (_mapping: Record<string, { chosenName: string; orgLevel: string; isNew: boolean }>) => void;
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

  // Auto-select exact matches after suggestions are loaded
  useEffect(() => {
    if (loading || Object.keys(suggestionsMap).length === 0) return;
    
    const autoSelections: Record<string, string> = {};
    
    unknownEmployees.forEach(unknownName => {
      const suggestions = suggestionsMap[unknownName] || [];
      
      // Look for exact match (case-insensitive)
      const exactMatch = suggestions.find(s => 
        s.name.toLowerCase().trim() === unknownName.toLowerCase().trim()
      );
      
      if (exactMatch) {
        autoSelections[unknownName] = exactMatch.name;
      }
    });
    
    // Only update selection if we found auto-matches
    if (Object.keys(autoSelections).length > 0) {
      setSelection(prev => ({ ...prev, ...autoSelections }));
    }
  }, [loading, suggestionsMap, unknownEmployees]);

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
    
    // Proceed with default behavior – parent will handle any new employee logic
    onSubmit(mapping);
  };

  if (loading) {
    return (
      <Modal open={true} onClose={() => {}} size="sm" closeOnBackdropClick={false} closeOnEscape={false}>
        <Modal.Body>
          <div className="text-center text-gray-800 dark:text-gray-100">
            Loading suggestions...
          </div>
        </Modal.Body>
      </Modal>
    );
  }

  return (
    <Modal 
      open={true} 
      onClose={onCancel} 
      size="2xl"
      title="Resolve Unknown Employees"
      closeOnBackdropClick={false}
    >
      <Modal.Body>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          Please match each name to an existing employee or choose &quot;New Employee&quot;.
        </p>
        <div className="max-h-96 overflow-y-auto">
          {unknownEmployees.map(name => {
            const options = [
              { value: '__NEW__', label: 'Pegawai Baru' },
              ...(suggestionsMap[name] || []).map(s => ({
                value: s.name,
                label: `${s.name}${s.organizational_level ? ` (${s.organizational_level})` : ''}`
              }))
            ];

            return (
              <div key={name} className="flex items-center space-x-4 py-2 border-b border-gray-200 dark:border-gray-700">
                <div className="flex-1 text-sm font-medium text-gray-800 dark:text-gray-100">{name}</div>
                <div className="min-w-0 flex-shrink-0 w-64">
                  <Select
                    options={options}
                    value={selection[name] || '__NEW__'}
                    onChange={(value) => handleSelect(name, value as string)}
                    size="sm"
                    placeholder="Pilih pegawai..."
                  />
                </div>
              </div>
            );
          })}
        </div>
      </Modal.Body>
      <Modal.Footer>
        <div className="flex justify-end space-x-3">
          <Button onClick={onCancel} variant="outline" size="md">
            Batal
          </Button>
          <Button onClick={handleSubmit} variant="primary" size="md">
            Simpan
          </Button>
        </div>
      </Modal.Footer>
    </Modal>
  );
};

export default ResolveEmployeesDialog;

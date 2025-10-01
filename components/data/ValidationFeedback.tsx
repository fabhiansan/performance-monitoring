import React, { useState } from 'react';
import { ValidationResult, ValidationError, ValidationWarning, getValidationSeverity, getValidationMessage } from '../../services/validationService';

interface ValidationFeedbackProps {
  validation: ValidationResult;
  className?: string;
}

const ValidationFeedback: React.FC<ValidationFeedbackProps> = ({ validation, className = '' }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const severity = getValidationSeverity(validation);

  const getSeverityStyles = (severity: string) => {
    switch (severity) {
      case 'success':
        return 'bg-green-100 dark:bg-green-900/50 border-green-500 text-green-800 dark:text-green-200';
      case 'warning':
        return 'bg-yellow-100 dark:bg-yellow-900/50 border-yellow-500 text-yellow-800 dark:text-yellow-200';
      case 'error':
        return 'bg-red-100 dark:bg-red-900/50 border-red-500 text-red-800 dark:text-red-200';
      case 'critical':
        return 'bg-red-200 dark:bg-red-800/50 border-red-600 text-red-900 dark:text-red-100';
      default:
        return 'bg-gray-100 dark:bg-gray-900/50 border-gray-500 text-gray-800 dark:text-gray-200';
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'success':
        return '✅';
      case 'warning':
        return '⚠️';
      case 'error':
        return '❌';
      case 'critical':
        return '🚨';
      default:
        return 'ℹ️';
    }
  };

  const renderErrorItem = (error: ValidationError, index: number) => (
    <div key={index} className="text-sm py-2 px-3 bg-red-50 dark:bg-red-900/30 rounded border-l-4 border-red-500 mb-2">
      <div className="font-medium text-red-800 dark:text-red-200">
        {error.employeeName ? `${error.employeeName}: ` : ''}{error.message}
      </div>
      {error.details && (
        <div className="text-red-600 dark:text-red-300 text-xs mt-1">{error.details}</div>
      )}
      {error.affectedCount && (
        <div className="text-red-600 dark:text-red-300 text-xs mt-1">Terdampak: {error.affectedCount} item</div>
      )}
    </div>
  );

  const renderWarningItem = (warning: ValidationWarning, index: number) => (
    <div key={index} className="text-sm py-2 px-3 bg-yellow-50 dark:bg-yellow-900/30 rounded border-l-4 border-yellow-500 mb-2">
      <div className="font-medium text-yellow-800 dark:text-yellow-200">
        {warning.employeeName ? `${warning.employeeName}: ` : ''}{warning.message}
      </div>
      {warning.details && (
        <div className="text-yellow-600 dark:text-yellow-300 text-xs mt-1">{warning.details}</div>
      )}
      {warning.affectedCount && (
        <div className="text-yellow-600 dark:text-yellow-300 text-xs mt-1">Terdampak: {warning.affectedCount} item</div>
      )}
    </div>
  );

  const getDataQualityBadge = (completeness: number) => {
    if (completeness >= 90) {
      return <span className="px-2 py-1 bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-200 text-xs rounded-full">Sangat Baik</span>;
    } else if (completeness >= 80) {
      return <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-200 text-xs rounded-full">Baik</span>;
    } else if (completeness >= 70) {
      return <span className="px-2 py-1 bg-yellow-100 dark:bg-yellow-900/50 text-yellow-800 dark:text-yellow-200 text-xs rounded-full">Cukup</span>;
    } else {
      return <span className="px-2 py-1 bg-red-100 dark:bg-red-900/50 text-red-800 dark:text-red-200 text-xs rounded-full">Kurang</span>;
    }
  };

  return (
    <div className={`border-l-4 p-4 rounded-lg ${getSeverityStyles(severity)} ${className}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <span className="text-xl mr-2">{getSeverityIcon(severity)}</span>
          <div>
            <p className="font-medium">{getValidationMessage(validation)}</p>
            <div className="flex items-center space-x-4 mt-2 text-sm">
              <span>Kelengkapan: {validation.summary.dataCompleteness}%</span>
              {getDataQualityBadge(validation.summary.dataCompleteness)}
              <span>Valid: {validation.summary.validEmployees}/{validation.summary.totalEmployees}</span>
            </div>
          </div>
        </div>
        
        {(validation.errors.length > 0 || validation.warnings.length > 0) && (
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-sm px-3 py-1 rounded hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
          >
            {isExpanded ? 'Sembunyikan Detail' : 'Tampilkan Detail'}
          </button>
        )}
      </div>

      {isExpanded && (
        <div className="mt-4 space-y-3">
          {/* Summary Section */}
          <div className="bg-white/50 dark:bg-black/20 p-3 rounded">
            <h4 className="font-medium mb-2">Ringkasan Data</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="font-medium">Total Pegawai:</span>
                <br />{validation.summary.totalEmployees}
              </div>
              <div>
                <span className="font-medium">Pegawai Valid:</span>
                <br />{validation.summary.validEmployees}
              </div>
              <div>
                <span className="font-medium">Total Kompetensi:</span>
                <br />{validation.summary.totalCompetencies}
              </div>
              <div>
                <span className="font-medium">Kualitas Skor:</span>
                <br />{validation.summary.scoreQuality}
              </div>
            </div>
            
            {validation.summary.missingCompetencies.length > 0 && (
              <div className="mt-3">
                <span className="font-medium text-red-700 dark:text-red-300">Kompetensi Wajib yang Hilang:</span>
                <div className="text-sm mt-1">
                  {validation.summary.missingCompetencies.map((comp, i) => (
                    <span key={i} className="inline-block bg-red-100 dark:bg-red-900/50 text-red-800 dark:text-red-200 px-2 py-1 rounded-full text-xs mr-1 mb-1">
                      {comp}
                    </span>
                  ))}
                </div>
              </div>
            )}
            
            {validation.summary.requiredCompetencies.length > 0 && (
              <div className="mt-3">
                <span className="font-medium text-green-700 dark:text-green-300">Kompetensi Wajib Terpenuhi:</span>
                <div className="text-sm mt-1">
                  {validation.summary.requiredCompetencies.map((comp, i) => (
                    <span key={i} className="inline-block bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-200 px-2 py-1 rounded-full text-xs mr-1 mb-1">
                      {comp}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Errors Section */}
          {validation.errors.length > 0 && (
            <div>
              <h4 className="font-medium text-red-800 dark:text-red-200 mb-2">
                Galat ({validation.errors.length})
              </h4>
              <div className="space-y-2">
                {validation.errors.map(renderErrorItem)}
              </div>
            </div>
          )}

          {/* Warnings Section */}
          {validation.warnings.length > 0 && (
            <div>
              <h4 className="font-medium text-yellow-800 dark:text-yellow-200 mb-2">
                Peringatan ({validation.warnings.length})
              </h4>
              <div className="space-y-2">
                {validation.warnings.map(renderWarningItem)}
              </div>
            </div>
          )}

          {/* Recommendations */}
          {(validation.errors.length > 0 || validation.warnings.length > 0) && (
            <div className="bg-blue-50 dark:bg-blue-900/30 p-3 rounded border-l-4 border-blue-500">
              <h4 className="font-medium text-blue-800 dark:text-blue-200 mb-2">Rekomendasi</h4>
              <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-1 list-disc ml-4">
                {validation.summary.missingCompetencies.length > 0 && (
                  <li>Impor dataset kinerja lengkap yang mencakup seluruh kompetensi wajib</li>
                )}
                {validation.summary.dataCompleteness < 80 && (
                  <li>Pastikan seluruh data kinerja pegawai sudah disertakan dalam impor</li>
                )}
                {validation.errors.some(e => e.type === 'invalid_score') && (
                  <li>Periksa nilai skor yang tidak valid dan pastikan semua skor berada antara 0-100</li>
                )}
                {validation.warnings.some(w => w.type === 'org_level_default') && (
                  <li>Pertimbangkan mengimpor data daftar pegawai terlebih dahulu untuk mendapatkan level organisasi yang akurat</li>
                )}
                {validation.errors.length === 0 && validation.warnings.length > 0 && (
                  <li>Data dapat digunakan tetapi sebaiknya tindak lanjuti peringatan untuk akurasi yang lebih baik</li>
                )}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ValidationFeedback;

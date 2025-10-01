import React from 'react';
import { Button, Card } from '../../design-system';
import { IconUsers, IconClipboardData, IconUpload } from './Icons';

interface EmptyStateProps {
  type?: 'no-employees' | 'no-session-data' | 'no-performance-data';
  onNavigateToManagement?: () => void;
  onNavigateToDataImport?: () => void;
}

const EmptyState: React.FC<EmptyStateProps> = ({
  type = 'no-employees',
  onNavigateToManagement,
  onNavigateToDataImport
}) => {
  const config = {
    'no-employees': {
      title: 'Dashboard Penilaian Kinerja',
      subtitle: 'Pegawai Dinas Sosial',
      description: 'Selamat datang! Untuk memulai, silakan tambahkan data pegawai terlebih dahulu.',
      action: 'Kelola Data Pegawai',
      onClick: onNavigateToManagement,
      showSteps: true
    },
    'no-session-data': {
      title: 'Tidak Ada Data di Sesi Ini',
      subtitle: '',
      description: 'Sesi yang dipilih belum memiliki data pegawai. Silakan impor data untuk sesi ini.',
      action: 'Impor Data',
      onClick: onNavigateToDataImport,
      showSteps: false
    },
    'no-performance-data': {
      title: 'Belum Ada Data Kinerja',
      subtitle: '',
      description: 'Data pegawai sudah ada, tetapi belum ada data penilaian kinerja. Silakan impor data kinerja.',
      action: 'Impor Data Kinerja',
      onClick: onNavigateToDataImport,
      showSteps: false
    }
  };

  const { title, subtitle, description, action, onClick, showSteps } = config[type];

  return (
    <div className="h-full flex items-center justify-center px-4 py-6">
      <Card variant="elevated" size="lg" className="max-w-4xl w-full">
        <Card.Body className="text-center py-6 px-6 md:px-10">
          {/* Icon Showcase */}
          <div className="flex justify-center gap-4 mb-6">
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 p-4 rounded-2xl shadow-md transform hover:scale-105 transition-transform duration-300">
              <IconUsers className="w-12 h-12 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="bg-gradient-to-br from-teal-50 to-teal-100 dark:from-teal-900/20 dark:to-teal-800/20 p-4 rounded-2xl shadow-md transform hover:scale-105 transition-transform duration-300">
              <IconClipboardData className="w-12 h-12 text-teal-600 dark:text-teal-400" />
            </div>
            <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 p-4 rounded-2xl shadow-md transform hover:scale-105 transition-transform duration-300">
              <IconUpload className="w-12 h-12 text-purple-600 dark:text-purple-400" />
            </div>
          </div>

          {/* Main Heading */}
          <h1 className="text-2xl md:text-3xl lg:text-4xl font-extrabold mb-3 bg-clip-text text-transparent bg-gradient-to-r from-blue-600 via-teal-500 to-purple-600 dark:from-blue-400 dark:via-teal-400 dark:to-purple-400">
            {title}
          </h1>
          {subtitle && (
            <h2 className="text-xl md:text-2xl font-bold text-gray-700 dark:text-gray-300 mb-4">
              {subtitle}
            </h2>
          )}

          {/* Description */}
          <p className="text-base md:text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto mb-6">
            {description}
          </p>

          {/* Steps Guide */}
          {showSteps && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 max-w-3xl mx-auto">
              <div className="bg-gradient-to-br from-gray-50 to-white dark:from-gray-800 dark:to-gray-850 rounded-xl p-6 border-2 border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-shadow duration-300">
                <div className="bg-blue-100 dark:bg-blue-600 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4 shadow-md">
                  <span className="text-blue-700 dark:text-white text-xl font-bold">1</span>
                </div>
                <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Import Pegawai</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Tambahkan data pegawai dari file CSV atau input manual
                </p>
              </div>

              <div className="bg-gradient-to-br from-gray-50 to-white dark:from-gray-800 dark:to-gray-850 rounded-xl p-6 border-2 border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-shadow duration-300">
                <div className="bg-teal-100 dark:bg-teal-500 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4 shadow-md">
                  <span className="text-teal-700 dark:text-white text-xl font-bold">2</span>
                </div>
                <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Data Kinerja</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Upload data penilaian kinerja pegawai
                </p>
              </div>

              <div className="bg-gradient-to-br from-gray-50 to-white dark:from-gray-800 dark:to-gray-850 rounded-xl p-6 border-2 border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-shadow duration-300">
                <div className="bg-purple-100 dark:bg-purple-500 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4 shadow-md">
                  <span className="text-purple-700 dark:text-white text-xl font-bold">3</span>
                </div>
                <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Analisis</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Lihat dashboard dan analisis performa
                </p>
              </div>
            </div>
          )}

          {/* Call to Action */}
          {onClick && (
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Button
                onClick={onClick}
                variant="primary"
                size="lg"
                leftIcon={<IconUsers className="w-5 h-5" />}
                className="transform hover:scale-105 transition-transform duration-300 shadow-lg hover:shadow-xl"
              >
                {action}
              </Button>
            </div>
          )}

          {/* Additional Info */}
          {showSteps && (
            <div className="mt-10 pt-8 border-t border-gray-200 dark:border-gray-700">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                <span className="font-semibold">💡 Tips:</span> Anda dapat mengimport data pegawai dalam format CSV atau menambahkan satu per satu secara manual.
              </p>
            </div>
          )}
        </Card.Body>
      </Card>
    </div>
  );
};

export default EmptyState;

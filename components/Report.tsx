import React, { useState, useRef } from 'react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { Employee } from '../types';

interface ReportProps {
  employees: Employee[];
}

const Report: React.FC<ReportProps> = ({ employees }) => {
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const reportRef = useRef<HTMLDivElement>(null);

  const generatePDF = async () => {
    if (!selectedEmployee || !reportRef.current) return;

    setIsGenerating(true);
    try {
      const canvas = await html2canvas(reportRef.current, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff'
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('portrait', 'mm', 'a4');
      
      const imgWidth = 210;
      const pageHeight = 295;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;

      let position = 0;

      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      pdf.save(`Laporan_Kinerja_${selectedEmployee.name.replace(/\s+/g, '_')}_2024.pdf`);
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Terjadi kesalahan saat menghasilkan PDF');
    } finally {
      setIsGenerating(false);
    }
  };

  const calculateTotalScore = () => {
    if (!selectedEmployee) return 0;
    const total = selectedEmployee.performance.reduce((sum, perf) => sum + perf.score, 0);
    return total;
  };

  const getPerformanceLevel = (score: number) => {
    if (score >= 90) return 'SANGAT BAIK';
    if (score >= 80) return 'BAIK';
    if (score >= 70) return 'KURANG BAIK';
    return 'SANGAT KURANG';
  };

  const getCurrentDate = () => {
    const now = new Date();
    return now.toLocaleDateString('id-ID', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  return (
    <div className="max-w-7xl mx-auto p-6 bg-white dark:bg-gray-900">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4 text-center">
          Laporan Penilaian Kinerja Pegawai Dinas Sosial
        </h1>
        
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Pilih Pegawai:
            </label>
            <select
              value={selectedEmployee?.name || ''}
              onChange={(e) => {
                const emp = employees.find(emp => emp.name === e.target.value);
                setSelectedEmployee(emp || null);
              }}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            >
              <option value="">-- Pilih Pegawai --</option>
              {employees.map((emp, index) => (
                <option key={index} value={emp.name}>{emp.name}</option>
              ))}
            </select>
          </div>
          
          <div className="flex items-end">
            <button
              onClick={generatePDF}
              disabled={!selectedEmployee || isGenerating}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isGenerating ? (
                <>
                  <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                  Menghasilkan PDF...
                </>
              ) : (
                <>
                  📄 Unduh PDF
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {selectedEmployee && (
        <>
          {/* Editable Table for Copy/Paste */}
          <div className="mb-8 bg-gray-50 dark:bg-gray-800 p-6 rounded-lg border">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              📋 Tabel Data (Untuk Copy & Paste)
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm">
                <thead>
                  <tr className="bg-gray-100 dark:bg-gray-600">
                    <th className="border border-gray-300 dark:border-gray-500 p-2 text-left text-gray-900 dark:text-white">NO.</th>
                    <th className="border border-gray-300 dark:border-gray-500 p-2 text-left text-gray-900 dark:text-white">KOMPONEN / KRITERIA</th>
                    <th className="border border-gray-300 dark:border-gray-500 p-2 text-center text-gray-900 dark:text-white">BOBOT</th>
                    <th className="border border-gray-300 dark:border-gray-500 p-2 text-center text-gray-900 dark:text-white">NILAI</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="border border-gray-300 dark:border-gray-500 p-2 font-semibold text-gray-900 dark:text-white">I.</td>
                    <td className="border border-gray-300 dark:border-gray-500 p-2 font-semibold text-gray-900 dark:text-white">PERILAKU KERJA (30%)</td>
                    <td className="border border-gray-300 dark:border-gray-500 p-2 text-center font-semibold text-gray-900 dark:text-white">25.50</td>
                    <td className="border border-gray-300 dark:border-gray-500 p-2 text-center font-semibold text-gray-900 dark:text-white">
                      {(selectedEmployee.performance.slice(0, 5).reduce((sum, perf) => sum + perf.score, 0) * 0.3 / 5).toFixed(2)}
                    </td>
                  </tr>
                  {selectedEmployee.performance.slice(0, 5).map((perf, index) => (
                    <tr key={index}>
                      <td className="border border-gray-300 dark:border-gray-500 p-2 text-gray-700 dark:text-gray-300">{index + 1}</td>
                      <td className="border border-gray-300 dark:border-gray-500 p-2 text-gray-700 dark:text-gray-300">{perf.name}</td>
                      <td className="border border-gray-300 dark:border-gray-500 p-2 text-center text-gray-700 dark:text-gray-300"></td>
                      <td className="border border-gray-300 dark:border-gray-500 p-2 text-center text-gray-700 dark:text-gray-300">{perf.score.toFixed(2)}</td>
                    </tr>
                  ))}
                  <tr>
                    <td className="border border-gray-300 dark:border-gray-500 p-2 font-semibold text-gray-900 dark:text-white">II.</td>
                    <td className="border border-gray-300 dark:border-gray-500 p-2 font-semibold text-gray-900 dark:text-white">KUALITAS KINERJA (50%)</td>
                    <td className="border border-gray-300 dark:border-gray-500 p-2 text-center font-semibold text-gray-900 dark:text-white">42.50</td>
                    <td className="border border-gray-300 dark:border-gray-500 p-2 text-center font-semibold text-gray-900 dark:text-white">
                      {(selectedEmployee.performance.slice(5, 8).reduce((sum, perf) => sum + perf.score, 0) * 0.5 / 3).toFixed(2)}
                    </td>
                  </tr>
                  {selectedEmployee.performance.slice(5, 8).map((perf, index) => (
                    <tr key={index + 5}>
                      <td className="border border-gray-300 dark:border-gray-500 p-2 text-gray-700 dark:text-gray-300">{index + 1}</td>
                      <td className="border border-gray-300 dark:border-gray-500 p-2 text-gray-700 dark:text-gray-300">{perf.name}</td>
                      <td className="border border-gray-300 dark:border-gray-500 p-2 text-center text-gray-700 dark:text-gray-300"></td>
                      <td className="border border-gray-300 dark:border-gray-500 p-2 text-center text-gray-700 dark:text-gray-300">{perf.score.toFixed(2)}</td>
                    </tr>
                  ))}
                  <tr>
                    <td className="border border-gray-300 dark:border-gray-500 p-2 font-semibold text-gray-900 dark:text-white">III.</td>
                    <td className="border border-gray-300 dark:border-gray-500 p-2 font-semibold text-gray-900 dark:text-white">PENILAIAN PIMPINAN (20%)</td>
                    <td className="border border-gray-300 dark:border-gray-500 p-2 text-center font-semibold text-gray-900 dark:text-white">17.00</td>
                    <td className="border border-gray-300 dark:border-gray-500 p-2 text-center font-semibold text-gray-900 dark:text-white">17.00</td>
                  </tr>
                  <tr className="bg-yellow-100 dark:bg-yellow-900">
                    <td className="border border-gray-300 dark:border-gray-500 p-2 font-bold text-gray-900 dark:text-white" colSpan={2}>NILAI AKHIR</td>
                    <td className="border border-gray-300 dark:border-gray-500 p-2 text-center font-bold text-gray-900 dark:text-white">85.00</td>
                    <td className="border border-gray-300 dark:border-gray-500 p-2 text-center font-bold text-gray-900 dark:text-white">{calculateTotalScore().toFixed(2)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-3">
              💡 Tip: Anda dapat memilih dan menyalin data dari tabel di atas untuk digunakan di aplikasi lain.
            </p>
          </div>

          {/* PDF Report View */}
          <div 
            ref={reportRef}
            className="bg-white p-8 border border-gray-300"
            style={{ 
              width: '210mm', 
              minHeight: '297mm',
              margin: '0 auto',
              fontFamily: 'Times, serif',
              fontSize: '12px',
              lineHeight: '1.4'
            }}
          >
          {/* Header */}
          <div className="text-center mb-8">
            <div className="flex items-center justify-center mb-4">
              <div className="mr-4">
                <div className="w-16 h-16 bg-gray-200 border-2 border-black flex items-center justify-center">
                  <span className="text-xs font-bold">LOGO</span>
                </div>
              </div>
              <div className="text-center">
                <h2 className="font-bold text-sm mb-1">PEMERINTAH PROVINSI KALIMANTAN SELATAN</h2>
                <h2 className="font-bold text-sm mb-2">DINAS SOSIAL</h2>
                <p className="text-xs">Jalan Jenderal A. Yani Km 4,5 Komplek Gubernur Kode Pos 70234</p>
                <p className="text-xs">Telepon: (0511) 52 3854, Fax: (0511) 5265410</p>
                <p className="text-xs">Email: dinsos@kalselprov.go.id Website: www.dinsos.kalselprov.go.id</p>
              </div>
            </div>
            
            <div className="border-t-2 border-black pt-4">
              <h3 className="font-bold text-sm mb-2">
                HASIL PENILAIAN KINERJA PEGAWAI DINAS SOSIAL PROVINSI<br />
                KALIMANTAN SELATAN SEMESTER I TAHUN 2024
              </h3>
            </div>
          </div>

          {/* Content */}
          <div className="mb-6">
            <p className="text-xs mb-4 text-justify">
              Penilaian Kinerja oleh seluruh pegawai Dinas Sosial Provinsi 
              Kalimantan Selatan sesuai dengan Semester I Tahun 2024 berdasarkan dari 
              Kualitas Kinerja dengan melalui form yang disediakan tiap akhir semester, 
              dengan penilaian terdapat sebagai berikut:
            </p>
          </div>

          <div className="flex gap-8 mb-6">
            {/* Left Side - Criteria */}
            <div className="flex-1">
              <table className="w-full border-collapse border border-black text-xs">
                <thead>
                  <tr>
                    <th className="border border-black p-2 bg-gray-100 text-center font-bold">NO.</th>
                    <th className="border border-black p-2 bg-gray-100 text-center font-bold">KRITERIA</th>
                    <th className="border border-black p-2 bg-gray-100 text-center font-bold">BOBOT</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="border border-black p-2 text-center font-bold">A.</td>
                    <td className="border border-black p-2 font-bold">PERILAKU KERJA</td>
                    <td className="border border-black p-2 text-center font-bold">30%</td>
                  </tr>
                  {selectedEmployee.performance.slice(0, 5).map((perf, index) => (
                    <tr key={index}>
                      <td className="border border-black p-1 text-center">{index + 1}.</td>
                      <td className="border border-black p-1">{perf.name}</td>
                      <td className="border border-black p-1 text-center"></td>
                    </tr>
                  ))}
                  
                  <tr>
                    <td className="border border-black p-2 text-center font-bold">B.</td>
                    <td className="border border-black p-2 font-bold">KUALITAS KINERJA</td>
                    <td className="border border-black p-2 text-center font-bold">50%</td>
                  </tr>
                  {selectedEmployee.performance.slice(5, 8).map((perf, index) => (
                    <tr key={index + 5}>
                      <td className="border border-black p-1 text-center">{index + 1}.</td>
                      <td className="border border-black p-1">{perf.name}</td>
                      <td className="border border-black p-1 text-center"></td>
                    </tr>
                  ))}
                  
                  <tr>
                    <td className="border border-black p-2 text-center font-bold">C.</td>
                    <td className="border border-black p-2 font-bold">PENILAIAN PIMPINAN</td>
                    <td className="border border-black p-2 text-center font-bold">20%</td>
                  </tr>
                  
                  <tr>
                    <td className="border border-black p-2 text-center font-bold" colSpan={2}>TOTAL</td>
                    <td className="border border-black p-2 text-center font-bold">100%</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Right Side - Scores */}
            <div className="flex-1">
              <div className="mb-4">
                <h4 className="font-bold text-xs mb-2 text-center">
                  KERTAS KERJA EVALUASI PENGUKURAN KINERJA ESELON IV<br />
                  DINAS SOSIAL PROVINSI KALIMANTAN SELATAN SEMESTER I<br />
                  TAHUN 2024
                </h4>
              </div>

              <table className="w-full border-collapse border border-black text-xs">
                <thead>
                  <tr>
                    <th className="border border-black p-2 bg-gray-100 text-center font-bold">NO.</th>
                    <th className="border border-black p-2 bg-gray-100 text-center font-bold">KOMPONEN / KRITERIA</th>
                    <th className="border border-black p-2 bg-gray-100 text-center font-bold">BOBOT</th>
                    <th className="border border-black p-2 bg-gray-100 text-center font-bold">NILAI</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="border border-black p-2 text-center font-bold">I.</td>
                    <td className="border border-black p-2 font-bold">PERILAKU KERJA (30%)</td>
                    <td className="border border-black p-2 text-center font-bold">25.50</td>
                    <td className="border border-black p-2 text-center font-bold">23.65</td>
                  </tr>
                  {selectedEmployee.performance.slice(0, 5).map((perf, index) => (
                    <tr key={index}>
                      <td className="border border-black p-1 text-center">{index + 1}</td>
                      <td className="border border-black p-1">{perf.name}</td>
                      <td className="border border-black p-1 text-center"></td>
                      <td className="border border-black p-1 text-center">{perf.score.toFixed(2)}</td>
                    </tr>
                  ))}
                  
                  <tr>
                    <td className="border border-black p-2 text-center font-bold">II.</td>
                    <td className="border border-black p-2 font-bold">KUALITAS KINERJA (50%)</td>
                    <td className="border border-black p-2 text-center font-bold">42.50</td>
                    <td className="border border-black p-2 text-center font-bold">39.45</td>
                  </tr>
                  {selectedEmployee.performance.slice(5, 8).map((perf, index) => (
                    <tr key={index + 5}>
                      <td className="border border-black p-1 text-center">{index + 1}</td>
                      <td className="border border-black p-1">{perf.name}</td>
                      <td className="border border-black p-1 text-center"></td>
                      <td className="border border-black p-1 text-center">{perf.score.toFixed(2)}</td>
                    </tr>
                  ))}
                  
                  <tr>
                    <td className="border border-black p-2 text-center font-bold">III.</td>
                    <td className="border border-black p-2 font-bold">PENILAIAN PIMPINAN (20%)</td>
                    <td className="border border-black p-2 text-center font-bold">17.00</td>
                    <td className="border border-black p-2 text-center font-bold">17.00</td>
                  </tr>
                  
                  <tr>
                    <td className="border border-black p-2 text-center font-bold" colSpan={2}>NILAI AKHIR</td>
                    <td className="border border-black p-2 text-center font-bold">85.00</td>
                    <td className="border border-black p-2 text-center font-bold">{calculateTotalScore().toFixed(2)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Performance Summary */}
          <div className="mb-6 text-xs">
            <p className="mb-2">
              <strong>Predikat Skor akhir penilaian Penilaian Pegawai dengan kinerja terbaik sebagai berikut:</strong>
            </p>
            <div className="ml-4 mb-4">
              <p>a. <strong>SANGAT BAIK</strong> : ≥ 90.00</p>
              <p>b. <strong>BAIK</strong> : 70.00 - 79.99</p>
              <p>c. <strong>KURANG BAIK</strong> : 65.00 - 69.99</p>
              <p>d. <strong>SANGAT KURANG</strong> : &lt; 65.00</p>
            </div>
            <p className="mb-4">
              Kepala Sub Bagian Perencanaan dan Pelaporan <strong>HANDAYATI EKA WARDANI, SE, MM</strong> memperoleh predikat <strong>"{getPerformanceLevel(calculateTotalScore())}"</strong> dengan nilai <strong>{calculateTotalScore().toFixed(2)}</strong>.
            </p>
          </div>

          {/* Footer */}
          <div className="flex justify-end mt-8">
            <div className="text-center text-xs">
              <p className="mb-16">Banjarmasin, {getCurrentDate()}</p>
              <p className="font-bold">MUHAMMAD UN, A.KS, M.LKom</p>
              <p className="font-bold">Pj. KEPALA DINAS SOSIAL</p>
              <p className="font-bold">PROVINSI KALIMANTAN SELATAN</p>
            </div>
          </div>
        </div>
        </>
      )}
      
      {!selectedEmployee && (
        <div className="text-center py-12 text-gray-500 dark:text-gray-400">
          <p className="text-lg">Pilih pegawai untuk melihat laporan kinerja</p>
        </div>
      )}
    </div>
  );
};

export default Report;
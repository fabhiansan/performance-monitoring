import React from 'react';
import { Employee } from '../../types';
import { useReportGeneration } from '../../hooks/useReportGeneration';
import { ReportFormattingService } from '../../services/reportFormattingService';
import { Button, Input, Select, Alert, Card } from '../../design-system';

interface ReportEnhancedProps {
  employees: Employee[];
}

const BORDER_CLASS = 'border border-gray-300 dark:border-gray-500';
const TEXT_CLASS = 'text-gray-700 dark:text-gray-300';
const HEADER_TEXT_CLASS = 'font-semibold text-gray-900 dark:text-white';

const ReportEnhanced: React.FC<ReportEnhancedProps> = ({ employees }) => {
  const { state, actions, data, reportRef } = useReportGeneration();

  const employeeOptions = employees.map(emp => ({
    value: emp.name,
    label: emp.name
  }));

  const semesterOptions = [
    { value: '1', label: 'I' },
    { value: '2', label: 'II' }
  ];

  const handleEmployeeChange = (value: string | number) => {
    const employee = employees.find(emp => emp.name === value) || null;
    actions.setSelectedEmployee(employee);
  };

  const formatCriteriaTableData = data.reportMetadata && state.selectedEmployee 
    ? ReportFormattingService.formatCriteriaTable(state.selectedEmployee)
    : [];

  const performanceLevelDescriptions = ReportFormattingService.getPerformanceLevelDescriptions();

  return (
    <div className="max-w-7xl mx-auto p-6 bg-white dark:bg-gray-900">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4 text-center">
          Laporan Penilaian Kinerja Pegawai Dinas Sosial
        </h1>
        
        <Card className="mb-6">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Pilih Pegawai:
              </label>
              <Select
                value={state.selectedEmployee?.name || ''}
                onChange={handleEmployeeChange}
                placeholder="-- Pilih Pegawai --"
                options={employeeOptions}
              />
            </div>

            <div className="flex flex-col sm:flex-row gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Semester:
                </label>
                <Select
                  value={state.semester.toString()}
                  onChange={(value: string | number) => actions.setSemester(Number(value))}
                  options={semesterOptions}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Tahun:
                </label>
                <Input
                  type="number"
                  value={state.year.toString()}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => actions.setYear(Number(e.target.value))}
                  min="2020"
                  max="2030"
                  className="w-24"
                />
              </div>

              <div className="flex items-end">
                <Button
                  onClick={actions.generatePDF}
                  disabled={!data.isValidConfig || state.isGenerating}
                  loading={state.isGenerating}
                >
                  {state.isGenerating ? 'Menghasilkan PDF...' : '📄 Unduh PDF'}
                </Button>
              </div>
            </div>
          </div>
        </Card>

        {state.error && (
          <Alert 
            variant="error" 
            className="mb-6"
            onDismiss={actions.clearError}
          >
            {state.error}
          </Alert>
        )}
      </div>

      {state.selectedEmployee && data.performanceScores && data.reportMetadata && (
        <>
          {/* Editable Table for Copy/Paste */}
          <Card className="mb-8 bg-gray-50 dark:bg-gray-800">
            <h3 className={`text-lg ${HEADER_TEXT_CLASS} mb-4`}>
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
                  {data.formattedTableData?.map((row, index) => (
                    <tr 
                      key={index}
                      className={row.isTotal ? 'bg-yellow-100 dark:bg-yellow-900' : ''}
                    >
                      <td className={`${BORDER_CLASS} p-2 ${row.isHeader || row.isTotal ? HEADER_TEXT_CLASS : TEXT_CLASS}`}>
                        {row.number}
                      </td>
                      <td className={`${BORDER_CLASS} p-2 ${row.isHeader || row.isTotal ? HEADER_TEXT_CLASS : TEXT_CLASS}`}>
                        {row.component}
                      </td>
                      <td className={`${BORDER_CLASS} p-2 text-center ${row.isHeader || row.isTotal ? 'HEADER_TEXT_CLASS' : TEXT_CLASS}`}>
                        {row.weight}
                      </td>
                      <td className={`${BORDER_CLASS} p-2 text-center ${row.isHeader || row.isTotal ? 'HEADER_TEXT_CLASS' : TEXT_CLASS}`}>
                        {row.value}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-3">
              💡 Tip: Anda dapat memilih dan menyalin data dari tabel di atas untuk digunakan di aplikasi lain.
            </p>
          </Card>

          {/* PDF Report View */}
          <div 
            ref={reportRef}
            className="bg-white p-8 border border-gray-300"
            style={{ 
              width: '297mm', 
              minHeight: '210mm',
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
                  {ReportFormattingService.formatReportTitle(data.reportMetadata).split('\n').map((line, i) => (
                    <span key={i}>
                      {line}
                      {i === 0 && <br />}
                    </span>
                  ))}
                </h3>
              </div>
            </div>

            {/* Content */}
            <div className="mb-6">
              <p className="text-xs mb-4 text-justify">
                Penilaian Kinerja oleh seluruh pegawai Dinas Sosial Provinsi 
                Kalimantan Selatan sesuai dengan Semester {ReportFormattingService.formatSemesterText(state.semester)} Tahun {state.year} berdasarkan dari 
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
                    {formatCriteriaTableData.map((row, index) => (
                      <tr key={index}>
                        <td className={`border border-black p-${row.isHeader ? '2' : '1'} text-center ${row.isHeader ? 'font-bold' : ''}`}>
                          {row.number}
                        </td>
                        <td className={`border border-black p-${row.isHeader ? '2' : '1'} ${row.isHeader ? 'font-bold' : ''}`}>
                          {row.criteria}
                        </td>
                        <td className={`border border-black p-${row.isHeader ? '2' : '1'} text-center ${row.isHeader ? 'font-bold' : ''}`}>
                          {row.weight}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Right Side - Scores */}
              <div className="flex-1">
                <div className="mb-4">
                  <h4 className="font-bold text-xs mb-2 text-center">
                    {ReportFormattingService.formatWorksheetTitle(data.reportMetadata).split('\n').map((line, i) => (
                      <span key={i}>
                        {line}
                        {i < 2 && <br />}
                      </span>
                    ))}
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
                    {data.formattedTableData?.map((row, index) => (
                      <tr key={index}>
                        <td className={`border border-black p-${row.isHeader || row.isTotal ? '2' : '1'} text-center ${row.isHeader || row.isTotal ? 'font-bold' : ''}`}>
                          {row.number}
                        </td>
                        <td className={`border border-black p-${row.isHeader || row.isTotal ? '2' : '1'} ${row.isHeader || row.isTotal ? 'font-bold' : ''}`}>
                          {row.component}
                        </td>
                        <td className={`border border-black p-${row.isHeader || row.isTotal ? '2' : '1'} text-center ${row.isHeader || row.isTotal ? 'font-bold' : ''}`}>
                          {row.weight}
                        </td>
                        <td className={`border border-black p-${row.isHeader || row.isTotal ? '2' : '1'} text-center ${row.isHeader || row.isTotal ? 'font-bold' : ''}`}>
                          {row.value}
                        </td>
                      </tr>
                    ))}
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
                {performanceLevelDescriptions.map((desc, index) => (
                  <p key={index}>
                    {String.fromCharCode(97 + index)}. <strong>{desc.level}</strong> : {desc.range}
                  </p>
                ))}
              </div>
              <p className="mb-4">
                {data.performanceLevel && data.performanceScores && 
                  ReportFormattingService.formatPerformanceSummaryText(
                    state.selectedEmployee,
                    data.performanceLevel,
                    data.performanceScores.totalScore
                  )
                }
              </p>
            </div>

            {/* Footer */}
            <div className="flex justify-end mt-8">
              <div className="text-center text-xs">
                <p className="mb-16">Banjarmasin, {data.reportMetadata.generatedDate}</p>
                <p className="font-bold">MUHAMMAD FARHANIE, SP., MM</p>
                <p className="font-bold">Pembina Tingkat 1, IV/b</p>
                <p className="font-bold">NIP. 19700513 199003 1 007 </p>
              </div>
            </div>
          </div>
        </>
      )}
      
      {!state.selectedEmployee && (
        <div className="text-center py-12 text-gray-500 dark:text-gray-400">
          <p className="text-lg">Pilih pegawai untuk melihat laporan kinerja</p>
        </div>
      )}
    </div>
  );
};

export default ReportEnhanced;

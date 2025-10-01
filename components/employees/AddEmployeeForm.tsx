import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { categorizeOrganizationalLevel, determineOrganizationalLevelFromPosition, inferEselonFromGolongan } from '../../utils/organizationalLevels';
import { Button, Input, Select } from '../../design-system';
import { Employee } from '../../types';

// Constants for repeated string literals
const DEFAULT_ORGANIZATIONAL_LEVEL = 'Staff/Other';

interface AddEmployeeFormProps {
  onEmployeeAdded: () => void;
  onCancel: () => void;
  employee?: Employee; // For edit mode
  isEditMode?: boolean;
}

const AddEmployeeForm: React.FC<AddEmployeeFormProps> = ({ onEmployeeAdded, onCancel, employee, isEditMode = false }) => {
  const [name, setName] = useState(employee?.name || '');
  const [nip, setNip] = useState(employee?.nip || '');
  const [gol, setGol] = useState(employee?.gol || '');
  const [pangkat, setPangkat] = useState(employee?.pangkat || '');
  const [position, setPosition] = useState(employee?.position || '');
  const [subPosition, setSubPosition] = useState(employee?.sub_position || '');
  const [organizationalLevel, setOrganizationalLevel] = useState(employee?.organizational_level || DEFAULT_ORGANIZATIONAL_LEVEL);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<{ name?: string; nip?: string; gol?: string; pangkat?: string; position?: string; subPosition?: string; organizationalLevel?: string }>({});

  // Organizational level options for Select component
  const organizationalLevelOptions = [
    { value: DEFAULT_ORGANIZATIONAL_LEVEL, label: DEFAULT_ORGANIZATIONAL_LEVEL },
    { value: 'Eselon II', label: 'Eselon II' },
    { value: 'Eselon III', label: 'Eselon III' },
    { value: 'Eselon IV', label: 'Eselon IV' },
    { value: 'Staff ASN Sekretariat', label: 'Staff ASN Sekretariat' },
    { value: 'Staff Non ASN Sekretariat', label: 'Staff Non ASN Sekretariat' },
    { value: 'Staff ASN Bidang Hukum', label: 'Staff ASN Bidang Hukum' },
    { value: 'Staff ASN Bidang Pemberdayaan Sosial', label: 'Staff ASN Bidang Pemberdayaan Sosial' },
    { value: 'Staff Non ASN Bidang Pemberdayaan Sosial', label: 'Staff Non ASN Bidang Pemberdayaan Sosial' },
    { value: 'Staff ASN Bidang Rehabilitasi Sosial', label: 'Staff ASN Bidang Rehabilitasi Sosial' },
    { value: 'Staff Non ASN Bidang Rehabilitasi Sosial', label: 'Staff Non ASN Bidang Rehabilitasi Sosial' },
    { value: 'Staff ASN Bidang Perlindungan dan Jaminan Sosial', label: 'Staff ASN Bidang Perlindungan dan Jaminan Sosial' },
    { value: 'Staff Non ASN Bidang Perlindungan dan Jaminan Sosial', label: 'Staff Non ASN Bidang Perlindungan dan Jaminan Sosial' },
    { value: 'Staff ASN Bidang Penanganan Bencana', label: 'Staff ASN Bidang Penanganan Bencana' },
    { value: 'Staff Non ASN Bidang Penanganan Bencana', label: 'Staff Non ASN Bidang Penanganan Bencana' },
  ];

  // Update form fields when employee prop changes (for queue processing)
  useEffect(() => {
    if (employee) {
      setName(employee.name || '');
      setNip(employee.nip || '');
      setGol(employee.gol || '');
      setPangkat(employee.pangkat || '');
      setPosition(employee.position || '');
      setSubPosition(employee.sub_position || '');
      setOrganizationalLevel(employee.organizational_level || DEFAULT_ORGANIZATIONAL_LEVEL);
      setErrors({});
    }
  }, [employee]);

  // Auto-infer organizational level based on golongan and position
  useEffect(() => {
    if (gol.trim() || position.trim() || subPosition.trim()) {
      const positionBasedLevel = determineOrganizationalLevelFromPosition(position, subPosition);
      const inferredLevel = categorizeOrganizationalLevel(positionBasedLevel, gol.trim());
      
      // Only auto-update if current value is default or if we have a better inference
      if (organizationalLevel === DEFAULT_ORGANIZATIONAL_LEVEL || (gol.trim() && inferEselonFromGolongan(gol.trim()) !== 'Staff')) {
        setOrganizationalLevel(inferredLevel);
      }
    }
  }, [gol, position, subPosition, organizationalLevel]);

  const validateForm = () => {
    const newErrors: { name?: string; nip?: string; gol?: string; pangkat?: string; position?: string; subPosition?: string } = {};
    
    // Only name and gol are required
    if (!name.trim()) {
      newErrors.name = 'Nama wajib diisi';
    }
    
    if (!gol.trim()) {
      newErrors.gol = 'Golongan wajib diisi';
    }
    
    // Optional field validation - empty fields will be set to "-"
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      // Prepare data with default values for empty fields
      const employeeData = {
        name: name.trim(),
        nip: nip.trim() || '-',
        gol: gol.trim(),
        pangkat: pangkat.trim() || '-',
        position: position.trim() || '-',
        subPosition: subPosition.trim() || '-',
        organizationalLevel: organizationalLevel || DEFAULT_ORGANIZATIONAL_LEVEL
      };
      
      if (isEditMode && employee && employee.id) {
        await api.updateEmployee(
          employee.id, 
          employeeData.name, 
          employeeData.nip, 
          employeeData.gol, 
          employeeData.pangkat, 
          employeeData.position, 
          employeeData.subPosition,
          employeeData.organizationalLevel
        );
      } else {
        await api.addEmployee(
          employeeData.name, 
          employeeData.nip, 
          employeeData.gol, 
          employeeData.pangkat, 
          employeeData.position, 
          employeeData.subPosition,
          employeeData.organizationalLevel
        );
      }
      onEmployeeAdded();
    } catch (error) {
      console.error(`Kesalahan saat ${isEditMode ? 'memperbarui' : 'menambahkan'} pegawai:`, error);
      setErrors({ name: `Gagal ${isEditMode ? 'mengubah' : 'menambahkan'} pegawai. Silakan coba lagi.` });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-8 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-gradient-to-r from-green-500 to-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={isEditMode ? "M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" : "M12 4v16m8-8H4"} />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            {isEditMode ? 'Ubah Pegawai' : 'Tambah Pegawai Baru'}
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            {isEditMode ? 'Perbarui data pegawai' : 'Masukkan data pegawai baru'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Input
                id="name"
                label="Nama Lengkap"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Masukkan nama lengkap"
                disabled={isSubmitting}
                required
                state={errors.name ? 'error' : 'default'}
                {...(errors.name && { errorMessage: errors.name })}
                size="lg"
                multiline={false}
              />
            </div>

            <div>
              <Input
                id="nip"
                label="NIP"
                value={nip}
                onChange={(e) => setNip(e.target.value)}
                placeholder="19660419 198910 1 001"
                disabled={isSubmitting}
                state={errors.nip ? 'error' : 'default'}
                {...(errors.nip && { errorMessage: errors.nip })}
                helpText="(opsional)"
                size="lg"
                multiline={false}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Input
                id="gol"
                label="Golongan"
                value={gol}
                onChange={(e) => setGol(e.target.value)}
                placeholder="IV/c"
                disabled={isSubmitting}
                required
                state={errors.gol ? 'error' : 'default'}
                {...(errors.gol && { errorMessage: errors.gol })}
                size="lg"
                multiline={false}
              />
            </div>

            <div>
              <Input
                id="pangkat"
                label="Pangkat"
                value={pangkat}
                onChange={(e) => setPangkat(e.target.value)}
                placeholder="Pembina Utama Muda"
                disabled={isSubmitting}
                state={errors.pangkat ? 'error' : 'default'}
                {...(errors.pangkat && { errorMessage: errors.pangkat })}
                helpText="(opsional)"
                size="lg"
                multiline={false}
              />
            </div>
          </div>

          <div>
            <Input
              id="position"
              label="Jabatan"
              value={position}
              onChange={(e) => setPosition(e.target.value)}
              placeholder="Plt. Kepala Dinas Sosial"
              disabled={isSubmitting}
              state={errors.position ? 'error' : 'default'}
              {...(errors.position && { errorMessage: errors.position })}
              helpText="(opsional)"
              size="lg"
              multiline={false}
            />
          </div>

          <div>
            <Input
              id="subPosition"
              label="Sub-Jabatan"
              value={subPosition}
              onChange={(e) => setSubPosition(e.target.value)}
              placeholder="Provinsi Kalimantan Selatan"
              disabled={isSubmitting}
              state={errors.subPosition ? 'error' : 'default'}
              {...(errors.subPosition && { errorMessage: errors.subPosition })}
              helpText="(opsional)"
              size="lg"
              multiline={false}
            />
          </div>

          <div>
            <Select
              label="Tingkat Organisasi (opsional)"
              options={organizationalLevelOptions}
              value={organizationalLevel}
              onChange={(value) => setOrganizationalLevel(value as string)}
              disabled={isSubmitting}
              state={errors.organizationalLevel ? 'error' : 'default'}
              {...(errors.organizationalLevel && { error: errors.organizationalLevel })}
            />
          </div>

          <div className="flex gap-4 pt-4">
            <Button
              type="button"
              onClick={onCancel}
              disabled={isSubmitting}
              variant="outline"
              size="lg"
              fullWidth
            >
              Batal
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              variant="success"
              size="lg"
              fullWidth
              loading={isSubmitting}
            >
              {isEditMode ? 'Simpan Perubahan' : 'Tambah Pegawai'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddEmployeeForm;

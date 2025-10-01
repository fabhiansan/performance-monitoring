import { describe, it, expect } from 'vitest';
import { DataParserService } from '../services/dataParser';
import { DataRecoveryService } from '../services/dataRecovery';
import { DatabaseOperationsService } from '../services/databaseOperations';
import { Employee } from '../types';

describe('Data Services', () => {
  describe('DataParserService', () => {
    it('should parse valid JSON employee data', async () => {
      const parser = new DataParserService();
      const validJson = JSON.stringify([
        {
          name: 'John Doe',
          performance: [{ name: 'Leadership', score: 85 }],
          organizational_level: 'Manager'
        }
      ]);

      const result = await parser.parsePerformanceData(validJson);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data!.length).toBe(1);
      expect(result.data![0].name).toBe('John Doe');
    });

    it('should handle corrupted JSON with auto-fix', async () => {
      const parser = new DataParserService();
      const corruptedJson = `[{name: "John Doe", performance: [{name: "Leadership", score: 85}]}]`;

      const result = await parser.parsePerformanceData(corruptedJson, { autoFix: true });

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
    });

    it('should return failure for completely invalid data', async () => {
      const parser = new DataParserService();
      const invalidJson = 'this is not json at all';

      const result = await parser.parsePerformanceData(invalidJson, { maxRecoveryAttempts: 1 });

      expect(result.success).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('DataRecoveryService', () => {
    it('should recover employee data with missing fields', async () => {
      const recovery = new DataRecoveryService();
      const incompleteEmployees: Employee[] = [
        {
          name: '',
          performance: [],
          organizational_level: ''
        }
      ];

      const result = await recovery.recoverEmployeeData(incompleteEmployees, { 
        useDefaultValues: true 
      });

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      const employee = result.data?.[0];
      expect(employee?.name).toBeTruthy();
      expect((employee?.performance ?? []).length).toBeGreaterThan(0);
      expect(employee?.organizational_level).toBeTruthy();
    });

    it('should calculate quality score correctly', async () => {
      const recovery = new DataRecoveryService();
      const highQualityEmployees: Employee[] = [
        {
          name: 'John Doe',
          performance: [
            { name: 'Leadership', score: 85 },
            { name: 'Communication', score: 90 }
          ],
          organizational_level: 'Senior Manager'
        }
      ];

      const result = await recovery.recoverEmployeeData(highQualityEmployees);

      expect(result.success).toBe(true);
      expect(result.qualityScore).toBeGreaterThan(80);
    });

    it('should apply default values when requested', () => {
      const recovery = new DataRecoveryService();
      const employees: Employee[] = [
        {
          name: 'John Doe',
          performance: [],
          organizational_level: ''
        }
      ];

      const result = recovery.applyDefaultValues(employees);

      expect(result.recordsModified).toBe(1);
      const employee = result.data[0];
      expect((employee.performance ?? []).length).toBeGreaterThan(0);
      expect(employee.organizational_level).toBeTruthy();
    });
  });

  describe('DatabaseOperationsService', () => {
    it('should successfully store employee data', async () => {
      const operations = new DatabaseOperationsService();
      const employees: Employee[] = [
        {
          name: 'John Doe',
          performance: [{ name: 'Leadership', score: 85 }],
          organizational_level: 'Manager'
        }
      ];

      const result = await operations.storeEmployeeData(employees);

      expect(result.success).toBe(true);
      expect(result.metadata.recordsProcessed).toBe(1);
      expect(result.metadata.operation).toBe('store_employee_data');
    });

    it('should generate error reports', () => {
      const operations = new DatabaseOperationsService();
      const mockResult = {
        success: false,
        errors: ['Test error'],
        warnings: ['Test warning'],
        metadata: {
          operation: 'test_operation',
          timestamp: '2023-01-01T00:00:00.000Z',
          recordsProcessed: 10,
          recordsRecovered: 2,
          dataQualityScore: 75
        }
      };

      const report = operations.generateErrorReport(mockResult);

      expect(report).toContain('test_operation');
      expect(report).toContain('Test error');
      expect(report).toContain('Test warning');
      expect(report).toContain('75%');
    });

    it('should provide quality descriptions', () => {
      const operations = new DatabaseOperationsService();

      expect(operations.getQualityDescription(95)).toBe('excellent');
      expect(operations.getQualityDescription(75)).toBe('good');
      expect(operations.getQualityDescription(50)).toBe('fair');
      expect(operations.getQualityDescription(25)).toBe('poor');
    });
  });

  describe('Service Integration', () => {
    it('should work together in a processing pipeline', async () => {
      const parser = new DataParserService();
      const recovery = new DataRecoveryService();
      const operations = new DatabaseOperationsService();

      // Step 1: Parse data
      const testData = JSON.stringify([
        {
          id: 1,
          name: 'John Doe',
          nip: '123456',
          gol: 'III/c',
          pangkat: 'Penata',
          position: 'Manager',
          sub_position: 'Team Lead',
          performance: [{ name: 'Leadership', score: 85 }],
          organizational_level: 'Manager'
        }
      ]);

      const parseResult = await parser.parsePerformanceData(testData);
      expect(parseResult.success).toBe(true);

      // Step 2: Recover/enhance data
      const recoveryResult = await recovery.recoverEmployeeData(parseResult.data!);
      expect(recoveryResult.success).toBe(true);

      // Step 3: Store data
      const storeResult = await operations.storeEmployeeData(recoveryResult.data!);
      expect(storeResult.success).toBe(true);

      // Verify the pipeline maintained data integrity
      expect(recoveryResult.data![0].name).toBe('John Doe');
      expect(storeResult.metadata.recordsProcessed).toBe(1);
    });
  });
});

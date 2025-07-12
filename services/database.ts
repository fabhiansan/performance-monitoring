import { Employee } from '../types';

interface Dataset {
  id: string;
  name: string;
  employees: Employee[];
  createdAt: Date;
  updatedAt: Date;
}

class DatabaseService {
  private dbName = 'PerformanceAnalyzerDB';
  private version = 1;
  private db: IDBDatabase | null = null;

  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);

      request.onerror = () => {
        reject(new Error('Failed to open database'));
      };

      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        // Create datasets store
        if (!db.objectStoreNames.contains('datasets')) {
          const store = db.createObjectStore('datasets', { keyPath: 'id' });
          store.createIndex('name', 'name', { unique: false });
          store.createIndex('createdAt', 'createdAt', { unique: false });
        }

        // Create current dataset store (for active dataset)
        if (!db.objectStoreNames.contains('currentDataset')) {
          db.createObjectStore('currentDataset', { keyPath: 'key' });
        }
      };
    });
  }

  async saveDataset(name: string, employees: Employee[]): Promise<string> {
    if (!this.db) await this.init();

    const dataset: Dataset = {
      id: Date.now().toString(),
      name: name || `Dataset ${new Date().toLocaleDateString()}`,
      employees,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    return new Promise((resolve, reject) => {
      if (!this.db) return reject(new Error('Database not initialized'));

      const transaction = this.db.transaction(['datasets'], 'readwrite');
      const store = transaction.objectStore('datasets');
      const request = store.add(dataset);

      request.onsuccess = () => {
        resolve(dataset.id);
      };

      request.onerror = () => {
        reject(new Error('Failed to save dataset'));
      };
    });
  }

  async updateDataset(id: string, employees: Employee[]): Promise<void> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      if (!this.db) return reject(new Error('Database not initialized'));

      const transaction = this.db.transaction(['datasets'], 'readwrite');
      const store = transaction.objectStore('datasets');
      const getRequest = store.get(id);

      getRequest.onsuccess = () => {
        const dataset = getRequest.result;
        if (dataset) {
          dataset.employees = employees;
          dataset.updatedAt = new Date();
          
          const updateRequest = store.put(dataset);
          updateRequest.onsuccess = () => resolve();
          updateRequest.onerror = () => reject(new Error('Failed to update dataset'));
        } else {
          reject(new Error('Dataset not found'));
        }
      };

      getRequest.onerror = () => {
        reject(new Error('Failed to get dataset'));
      };
    });
  }

  async getAllDatasets(): Promise<Dataset[]> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      if (!this.db) return reject(new Error('Database not initialized'));

      const transaction = this.db.transaction(['datasets'], 'readonly');
      const store = transaction.objectStore('datasets');
      const request = store.getAll();

      request.onsuccess = () => {
        const datasets = request.result.sort((a: Dataset, b: Dataset) => 
          new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
        );
        resolve(datasets);
      };

      request.onerror = () => {
        reject(new Error('Failed to get datasets'));
      };
    });
  }

  async getDataset(id: string): Promise<Dataset | null> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      if (!this.db) return reject(new Error('Database not initialized'));

      const transaction = this.db.transaction(['datasets'], 'readonly');
      const store = transaction.objectStore('datasets');
      const request = store.get(id);

      request.onsuccess = () => {
        resolve(request.result || null);
      };

      request.onerror = () => {
        reject(new Error('Failed to get dataset'));
      };
    });
  }

  async deleteDataset(id: string): Promise<void> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      if (!this.db) return reject(new Error('Database not initialized'));

      const transaction = this.db.transaction(['datasets'], 'readwrite');
      const store = transaction.objectStore('datasets');
      const request = store.delete(id);

      request.onsuccess = () => {
        resolve();
      };

      request.onerror = () => {
        reject(new Error('Failed to delete dataset'));
      };
    });
  }

  async saveCurrentDataset(employees: Employee[]): Promise<void> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      if (!this.db) return reject(new Error('Database not initialized'));

      const transaction = this.db.transaction(['currentDataset'], 'readwrite');
      const store = transaction.objectStore('currentDataset');
      const request = store.put({
        key: 'current',
        employees,
        timestamp: new Date()
      });

      request.onsuccess = () => {
        resolve();
      };

      request.onerror = () => {
        reject(new Error('Failed to save current dataset'));
      };
    });
  }

  async getCurrentDataset(): Promise<Employee[]> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      if (!this.db) return reject(new Error('Database not initialized'));

      const transaction = this.db.transaction(['currentDataset'], 'readonly');
      const store = transaction.objectStore('currentDataset');
      const request = store.get('current');

      request.onsuccess = () => {
        const result = request.result;
        resolve(result ? result.employees : []);
      };

      request.onerror = () => {
        reject(new Error('Failed to get current dataset'));
      };
    });
  }

  async clearCurrentDataset(): Promise<void> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      if (!this.db) return reject(new Error('Database not initialized'));

      const transaction = this.db.transaction(['currentDataset'], 'readwrite');
      const store = transaction.objectStore('currentDataset');
      const request = store.delete('current');

      request.onsuccess = () => {
        resolve();
      };

      request.onerror = () => {
        reject(new Error('Failed to clear current dataset'));
      };
    });
  }
}

export const db = new DatabaseService();
export type { Dataset };
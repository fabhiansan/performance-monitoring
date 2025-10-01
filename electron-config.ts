import { app } from 'electron';
import { join } from 'path';
import { readFileSync, writeFileSync, existsSync } from 'fs';

interface ElectronConfigData {
  geminiApiKey: string;
  serverPort: number;
  version: string;
  [key: string]: unknown;
}

class ElectronConfig {
  private configPath: string;
  private config: ElectronConfigData;

  constructor() {
    this.configPath = join(app.getPath('userData'), 'config.json');
    this.config = this.loadConfig();
  }

  loadConfig(): ElectronConfigData {
    try {
      if (existsSync(this.configPath)) {
        const configData = readFileSync(this.configPath, 'utf8');
        return JSON.parse(configData);
      }
    } catch (error) {
      console.warn('Failed to load config:', error instanceof Error ? error.message : 'Unknown error');
    }
    
    // Return default config
    return {
      geminiApiKey: '',
      serverPort: 3002,
      version: '1.0.0'
    };
  }

  saveConfig(): boolean {
    try {
      writeFileSync(this.configPath, JSON.stringify(this.config, null, 2));
      return true;
    } catch (error) {
      console.error('Failed to save config:', error);
      return false;
    }
  }

  get(key: string): unknown {
    return this.config[key];
  }

  set(key: string, value: unknown): boolean {
    this.config[key] = value;
    return this.saveConfig();
  }

  getGeminiApiKey(): string {
    return this.config.geminiApiKey;
  }

  setGeminiApiKey(apiKey: string): boolean {
    return this.set('geminiApiKey', apiKey);
  }

  getConfigPath(): string {
    return this.configPath;
  }
}

export default ElectronConfig;

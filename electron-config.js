import { app } from 'electron';
import { join } from 'path';
import { readFileSync, writeFileSync, existsSync } from 'fs';

class ElectronConfig {
  constructor() {
    this.configPath = join(app.getPath('userData'), 'config.json');
    this.config = this.loadConfig();
  }

  loadConfig() {
    try {
      if (existsSync(this.configPath)) {
        const configData = readFileSync(this.configPath, 'utf8');
        return JSON.parse(configData);
      }
    } catch (error) {
      console.warn('Failed to load config:', error.message);
    }
    
    // Return default config
    return {
      geminiApiKey: '',
      serverPort: 3001,
      version: '1.0.0'
    };
  }

  saveConfig() {
    try {
      writeFileSync(this.configPath, JSON.stringify(this.config, null, 2));
      return true;
    } catch (error) {
      console.error('Failed to save config:', error);
      return false;
    }
  }

  get(key) {
    return this.config[key];
  }

  set(key, value) {
    this.config[key] = value;
    return this.saveConfig();
  }

  getGeminiApiKey() {
    return this.config.geminiApiKey;
  }

  setGeminiApiKey(apiKey) {
    return this.set('geminiApiKey', apiKey);
  }

  getConfigPath() {
    return this.configPath;
  }
}

export default ElectronConfig;
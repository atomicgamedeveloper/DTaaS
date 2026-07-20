export interface IConfig {
  loadConfig(configPath?: string): void;
  getHostname(): string;
  getPort(): number;
  getCorsAllowOrigin(): string;
  getAuthToken(): string;
  getTls(): boolean;
  getCertsDirectory(): string;
  getLogFilePath(): string;
  getMaxPayloadBytes(): number;
  getLogMaxBytes(): number;
  getLogRetentionFiles(): number;
}

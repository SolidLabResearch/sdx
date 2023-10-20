import { autoInjectable, singleton } from 'tsyringe';
import { SdxConfig } from '../types.js';
import { PATH_SDX_CONFIG } from '../constants.js';
import { readFile } from 'fs/promises';
import { readFileSync } from 'fs';

@autoInjectable()
@singleton()
export class ConfigService {
  /**
   * Read and parse the sdx config file async
   * @returns
   */
  async getSdxConfig(): Promise<SdxConfig> {
    const file = await readFile(PATH_SDX_CONFIG);
    return JSON.parse(file.toString());
  }

  /**
   * Read and parse the sdx config file sync
   * @returns
   */
  getSdxConfigSync(): SdxConfig {
    const file = readFileSync(PATH_SDX_CONFIG);
    return JSON.parse(file.toString());
  }
}

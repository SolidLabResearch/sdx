import { autoInjectable, singleton } from 'tsyringe';
import { SdxConfig } from '../types.js';
import { PATH_SDX_CONFIG } from '../constants.js';
import { readFile } from 'fs/promises';

@autoInjectable()
@singleton()
export class ConfigService {
  /**
   * Read and parse the sdx config file
   * @returns
   */
  async getSdxConfig(): Promise<SdxConfig> {
    const file = await readFile(PATH_SDX_CONFIG);
    return JSON.parse(file.toString());
  }
}

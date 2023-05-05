import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { autoInjectable, singleton } from 'tsyringe';
import { PATH_DOT_SDX_FOLDER, PATH_SDX_LIST_CACHE } from '../constants.js';

@autoInjectable()
@singleton()
export class CacheService {
  storeListToCache<T>(list: T[]): void {
    if (!existsSync(PATH_DOT_SDX_FOLDER)) {
      mkdirSync(PATH_DOT_SDX_FOLDER, { recursive: true });
    }
    writeFileSync(PATH_SDX_LIST_CACHE, JSON.stringify(list), { flag: 'w' });
  }

  readListFromCache<T>(): T[] {
    return JSON.parse(readFileSync(PATH_SDX_LIST_CACHE).toString());
  }
}

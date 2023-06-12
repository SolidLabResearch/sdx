import chalk from 'chalk';
import { readFileSync } from 'fs';
import { autoInjectable, singleton } from 'tsyringe';
import { PATH_SDX_CONFIG } from '../constants.js';
import { SdxConfig, SdxRepository } from '../types.js';
import { BackendService } from './backend.service.js';
import { CacheService } from './cache.service.js';

@singleton()
@autoInjectable()
export class SearchService {
  private repositories: SdxRepository[];

  constructor(private backend?: BackendService, private cache?: CacheService) {
    this.repositories = this.fetchRepositories();
  }

  async search(query: string): Promise<void> {
    const results = await this.backend!.searchType(query);
    if (results) {
      // Sort results by downloads
      const sortedResults = results.sort(
        (a, b) =>
          (b.typePackage.downloads ?? 0) - (a.typePackage.downloads ?? 0)
      );
      // store in cache for later use of indexes
      this.cache!.storeListToCache(
        sortedResults.map(({ typePackage }) => typePackage)
      );
      // Format output
      const tx = results.map(({ typeMatches, typePackage }) => {
        const { id, name, downloads } = typePackage;
        let matchingTypes = typeMatches.slice(0, 3).map(iriToName).join(`, `);
        if (typeMatches.length > 3) {
          matchingTypes += ', ...';
        }
        return {
          matchingTypes,
          name,
          // id,
          downloads
        };
      });
      this.outputResults(tx);
    }
  }

  private fetchRepositories(): SdxRepository[] {
    try {
      const sdxConfig: SdxConfig = JSON.parse(
        readFileSync(PATH_SDX_CONFIG).toString()
      );
      return sdxConfig.repositories;
    } catch {
      return [];
    }
  }

  private outputResults(results: any[]): void {
    console.table(results);
    console.log(
      chalk.yellow(
        `Install a type package using \`sdx install package <index>\``
      )
    );
  }
}

function iriToName(iri: string): string {
  const idx = iri.lastIndexOf('#');
  return idx > -1 ? iri.slice(idx + 1) : iri;
}

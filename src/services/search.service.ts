import chalk from 'chalk';
import { readFileSync } from 'fs';
import { autoInjectable, singleton } from 'tsyringe';
import { PATH_SDX_CONFIG } from '../constants.js';
import { SdxConfig, SolidCatalog } from '../types.js';
import { BackendService } from './backend.service.js';
import { CacheService } from './cache.service.js';

@singleton()
@autoInjectable()
export class SearchService {
  private repositories: SolidCatalog[];

  constructor(private backend?: BackendService, private cache?: CacheService) {
    this.repositories = this.fetchRepositories();
  }

  async search(query: string): Promise<void> {
    const results = await this.backend!.searchShape(query);
    if (results) {
      // Sort results by downloads
      const sortedResults = results.sort(
        (a, b) =>
          (b.shapePackage.downloads ?? 0) - (a.shapePackage.downloads ?? 0)
      );
      // store in cache for later use of indexes
      this.cache!.storeListToCache(
        sortedResults.map(({ shapePackage }) => shapePackage)
      );
      // Format output
      const tx = results.map(({ shapeMatches, shapePackage }) => {
        const { id, name, downloads } = shapePackage;
        let matchingTypes = shapeMatches.slice(0, 3).map(iriToName).join(`, `);
        if (shapeMatches.length > 3) {
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

  private fetchRepositories(): SolidCatalog[] {
    try {
      const sdxConfig: SdxConfig = JSON.parse(
        readFileSync(PATH_SDX_CONFIG).toString()
      );
      return sdxConfig.catalogs;
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

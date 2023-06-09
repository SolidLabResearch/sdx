import { readFileSync } from 'fs';
import { map, tap } from 'rxjs/operators/index.js';
import { autoInjectable, singleton } from 'tsyringe';
import { PATH_SDX_CONFIG } from '../constants.js';
import { SdxConfig, SdxRepository } from '../types.js';
import { BackendService } from './backend.service.js';
import { CacheService } from './cache.service.js';
import chalk from 'chalk';

@singleton()
@autoInjectable()
export class SearchService {
  private repositories: SdxRepository[];

  constructor(private backend?: BackendService, private cache?: CacheService) {
    this.repositories = this.fetchRepositories();
  }

  search(query: string): void {
    this.backend!.searchType(query)
      .pipe(
        map((results) =>
          results.sort(
            (a, b) =>
              (b.typePackage.downloads ?? 0) - (a.typePackage.downloads ?? 0)
          )
        ),
        tap((results) =>
          this.cache!.storeListToCache(
            results.map(({ typePackage }) => typePackage)
          )
        )
      )
      .subscribe((results) => {
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
      });
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

import { readFileSync } from "fs";
import { map, tap } from "rxjs/operators/index.js";
import { autoInjectable, singleton } from "tsyringe";
import { PATH_SDX_CONFIG } from "../constants.js";
import { SdxConfig, SdxRepository } from "../types.js";
import { BackendService } from "./backend.service.js";
import { CacheService } from "./cache.service.js";


@singleton()
@autoInjectable()
export class SearchService {
    private repositories: SdxRepository[];

    constructor(
        private backend?: BackendService,
        private cache?: CacheService) {
        this.repositories = this.fetchRepositories()
    }

    search(type: string): void {
        this.backend!.searchType(type)
            .pipe(
                map(results => results.sort((a, b) => b.downloads - a.downloads)),
                tap(results => this.cache!.storeListToCache(results))
            )
            .subscribe(results => {
                const tx = results
                    .map(({ id, name, downloads }) => ({ name, id, downloads }))
                console.table(tx);
            });
    }

    private fetchRepositories(): SdxRepository[] {
        try {
            const sdxConfig: SdxConfig = JSON.parse(readFileSync(PATH_SDX_CONFIG).toString());
            return sdxConfig.repositories;
        } catch {
            return [];
        }

    }

}

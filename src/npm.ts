import { NpmDownloadsPointResult, NpmSearchResult } from "./types.js";

const scope: 'solid' | 'solidlab' = 'solid';

export class Npm {
    readonly registryUrl = 'https://registry.npmjs.org';
    readonly apiUrl = 'https://api.npmjs.org';

    constructor() { }

    /**
     * Search for a type on NPM under the configured scope (@solid or @solidlab normally)
     * @param type Name of the type
     */
    async search(type: string): Promise<void> {
        const path = [this.registryUrl, '-/v1/search'].join('/');
        const url = `${path}?text=scope:${scope} ${type}&quality=0.7&popularity=1.0&maintenance=0`;
        const json: NpmSearchResult = await (await fetch(url)).json() as NpmSearchResult;
        const packages = json.objects.map(obj => obj.package);
        
        // No results: stop here
        if (packages.length === 0) {
            console.log('No types found. Maybe try broadening your search?');
            console.log();
            return;
        }

        const downloads = await this.fetchDownloads(packages.map(p => p.name));
        const results = packages.map(p => ({ name: p.name, version: p.version, description: this.trim(p.description), downloads: downloads[p.name] }))
        console.table(results);
    }

    /**
     * Fetch last weeks downloads number for a list of packages.
     * @param names Names of the types
     * @returns 
     */
    private async fetchDownloads(names: string[]): Promise<Record<string, number>> {
        const path = [this.apiUrl, 'downloads/point/last-month'].join('/');
        const urls = names.map(name => path + '/' + name);
        const responses: Record<string, any>[] = await Promise.all(urls.map(u => fetch(u).then(r => r.json())));
        return responses.reduce((acc, cur) => {
            acc[cur.package] = cur.downloads;
            return acc;
        }, {});
    }

    private trim(text: string, length: number = 80) {
        return text.length > length ? text.slice(0, length) + '...' : text;
    }
}

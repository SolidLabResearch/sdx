import { createRequire } from "module";
import { InitOptions, SolidManifest } from "./types.js";
import { noResults } from "./util.js";
import { readFileSync } from 'fs';

// const require = createRequire(import.meta.url);

export class Project {

    listTypes(options: InitOptions): any {
        const manifest: SolidManifest = JSON.parse(readFileSync('.solidmanifest').toString());
        const results = Object.entries(manifest.types)
            // .filter(dep => dep[0].startsWith(`@solid-types/`))
            .map(dep => ({ name: dep[0], version: dep[1] }));
        if (results.length === 0) {
            noResults();
            return;
        }
        console.table(results)
    }

}

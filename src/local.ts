import { createRequire } from "module";
import { ProgramOptions, Scope } from "./types.js";
import { noResults } from "./util.js";

const require = createRequire(import.meta.url);

export class Local {

    listTypes(options: ProgramOptions): any {
        const dependencies: Record<string, string> = require("../package.json").dependencies;
        const results = Object.entries(dependencies)
            .filter(dep => dep[0].startsWith(`@solid-types/`))
            .map(dep => ({ name: dep[0], version: dep[1] }));
        if (results.length === 0) {
            noResults();
            return;
        }
        console.table(results)
    }

}

import { createRequire } from "module";
import { ProgramOptions, Scope } from "./types.js";
import { noResults } from "./util.js";

const require = createRequire(import.meta.url);

export class Local {

    listTypes(options: ProgramOptions): any {
        const scope = options.test ? Scope.TEST : Scope.PRODUCTION;
        const dependencies: Record<string, string> = require("../package.json").dependencies;
        const results = Object.entries(dependencies)
            .filter(dep => dep[0].startsWith(`@${scope}/`))
            .map(dep => ({ name: dep[0], version: dep[1] }));
        if (results.length === 0) {
            noResults();
            return;
        }
        console.table(results)
    }

}

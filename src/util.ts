import { PathLike } from "fs";
import { mkdir } from "fs/promises";

/**
 * Report to console that there are no results, with optional extra phrase.
 */
export function noResults(extraPhrase?: string): void {
    let txt = ('No results found.');
    if (extraPhrase) {
        txt += ` ${extraPhrase}`;
    }
    console.log(txt);
    console.log();
}

export const SOLID_PURPLE = '#7C4DFF';


/**
 * Recursively create a directory at the given `path`.
 *
 * @param {String} path
 */
export async function ensureDir(path: PathLike) {
    await mkdir(path, { recursive: true })
}

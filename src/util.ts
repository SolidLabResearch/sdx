
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

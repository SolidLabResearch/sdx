import { PathLike } from "fs";
import { mkdir } from "fs/promises";
import { GraphQLList, GraphQLNonNull, GraphQLScalarType, GraphQLType, isListType, isNonNullType, isScalarType } from "graphql";

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

export const capitalize = (str: string): string => str.slice(0, 1).toUpperCase() + str.slice(1);
export const decapitalize = (str: string): string => str.slice(0, 1).toLowerCase() + str.slice(1);
export const plural = (str: string): string => `${str}Collection`;


export const isOrContainsScalar = (type: unknown): type is GraphQLScalarType<unknown,unknown> => isScalarType(type)
|| (isNonNullType(type) && isOrContainsScalar(type.ofType))
|| (isListType(type) && isOrContainsScalar(type.ofType));

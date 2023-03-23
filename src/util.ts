import { PathLike } from "fs";
import { mkdir } from "fs/promises";
import { GraphQLEnumType, GraphQLInterfaceType, GraphQLList, GraphQLNonNull, GraphQLObjectType, GraphQLOutputType, GraphQLScalarType, GraphQLType, GraphQLUnionType, isListType, isNonNullType, isObjectType, isScalarType } from "graphql";
import { GraphQLInputObjectType } from "graphql/type/definition.js";

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


export const isOrContainsScalar = (type: unknown): type is GraphQLScalarType<unknown, unknown> => isScalarType(type)
    || (isNonNullType(type) && isOrContainsScalar(type.ofType))
    || (isListType(type) && isOrContainsScalar(type.ofType));

export const isOrContainsObjectType = (type: unknown): type is GraphQLObjectType<any, any> => isObjectType(type)
    || (isNonNullType(type) && isOrContainsObjectType(type.ofType))
    || (isListType(type) && isOrContainsObjectType(type.ofType));

    export const isOrContainsInputObjectType = (type: unknown): type is GraphQLInputObjectType => isObjectType(type)
    || (isNonNullType(type) && isOrContainsInputObjectType(type.ofType))
    || (isListType(type) && isOrContainsInputObjectType(type.ofType));

export const toActualType = (type: GraphQLOutputType): GraphQLObjectType | GraphQLScalarType<unknown, unknown> | GraphQLInterfaceType | GraphQLUnionType | GraphQLEnumType => {
    return isListType(type) ? toActualType(type.ofType)
        : isNonNullType(type) ? toActualType(type.ofType)
            : isObjectType(type) ? type
                : type
}

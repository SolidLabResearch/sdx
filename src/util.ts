import { PathLike } from 'fs';
import { mkdir } from 'fs/promises';
import {
  GraphQLEnumType,
  GraphQLInterfaceType,
  GraphQLObjectType,
  GraphQLOutputType,
  GraphQLScalarType,
  GraphQLUnionType,
  isListType,
  isNonNullType,
  isObjectType,
  isScalarType
} from 'graphql';
import { GraphQLInputObjectType } from 'graphql/type/definition.js';
import { Quad, Quad_Subject, Store } from 'n3';

/**
 * Report to console that there are no results, with optional extra phrase.
 */
export function noResults(extraPhrase?: string): void {
  let txt = 'No results found.';
  if (extraPhrase) {
    txt += ` ${extraPhrase}`;
  }
  console.log(txt);
  console.log();
}

export const SOLID_PURPLE = '#7C4DFF';
export const SOLID_WARN = '#FF6700';

/**
 * Recursively create a directory at the given `path`.
 *
 * @param {String} path
 */
export async function ensureDir(path: PathLike) {
  await mkdir(path, { recursive: true });
}

export const capitalize = (str: string): string =>
  str.slice(0, 1).toUpperCase() + str.slice(1);
export const decapitalize = (str: string): string =>
  str.slice(0, 1).toLowerCase() + str.slice(1);
export const plural = (str: string): string => `${str}Collection`;

export const isOrContainsScalar = (
  type: unknown
): type is GraphQLScalarType<unknown, unknown> =>
  isScalarType(type) ||
  (isNonNullType(type) && isOrContainsScalar(type.ofType)) ||
  (isListType(type) && isOrContainsScalar(type.ofType));

export const isOrContainsObjectType = (
  type: unknown
): type is GraphQLObjectType<any, any> =>
  isObjectType(type) ||
  (isNonNullType(type) && isOrContainsObjectType(type.ofType)) ||
  (isListType(type) && isOrContainsObjectType(type.ofType));

export const isOrContainsInputObjectType = (
  type: unknown
): type is GraphQLInputObjectType =>
  isObjectType(type) ||
  (isNonNullType(type) && isOrContainsInputObjectType(type.ofType)) ||
  (isListType(type) && isOrContainsInputObjectType(type.ofType));

export const toActualType = (
  type: GraphQLOutputType
):
  | GraphQLObjectType
  | GraphQLScalarType<unknown, unknown>
  | GraphQLInterfaceType
  | GraphQLUnionType
  | GraphQLEnumType => {
  return isListType(type)
    ? toActualType(type.ofType)
    : isNonNullType(type)
    ? toActualType(type.ofType)
    : isObjectType(type)
    ? type
    : type;
};

export function parseNameFromUri(uriString: string): string {
  try {
    const uri = new URL(uriString);
    // If the URI has a fragment, use fragment, otherwise use the last path segment
    return uri.hash.length > 0
      ? uri.hash.slice(1)
      : uri.pathname.slice(uri.pathname.lastIndexOf('/') + 1);
  } catch (err: any) {
    return uriString.startsWith('#') || uriString.startsWith('/')
      ? uriString.slice(1)
      : uriString;
  }
}

export function groupBySubject(quads: Quad[]): Map<Quad_Subject, Quad[]> {
  return quads.reduce((index, quad) => {
    if (index.has(quad.subject)) {
      index.get(quad.subject)!.push(quad);
    } else {
      index.set(quad.subject, [quad]);
    }
    return index;
  }, new Map<Quad_Subject, Quad[]>());
}

export function printQuads(quads: Quad[] | Store, label?: string) {
  if (label) {
    console.log(`${label} ==> `);
  }
  const q = Array.isArray(quads)
    ? quads
    : quads.getQuads(null, null, null, null);
  q.forEach((q) =>
    console.log(`[${q.subject.value} ${q.predicate.value} ${q.object.value}]`)
  );
}

/**
 * Replace fieldName characters that are illegal by underscores
 */
export function cleanseName(fieldName: string): string {
  return fieldName.replace(/[^_a-zA-Z]/g, '_');
}

import {
  DirectiveLocation,
  GraphQLArgument,
  GraphQLDirective,
  GraphQLField,
  GraphQLObjectType,
  GraphQLSchema
} from 'graphql';
import {
  GraphQLInputField,
  GraphQLInputObjectType,
  isInputObjectType,
  isInputType,
  isObjectType
} from 'graphql/type/definition.js';
import { autoInjectable, singleton } from 'tsyringe';
import { Context } from '../lib/context.js';

const DOUBLE_NEWLINE = '\n\n';
const SINGLE_NEWLINE = '\n';
const SPACE = ' ';
const COMMA_SPACE = ', ';
const INDENT = `${SPACE}${SPACE}`;
const INTERNAL_TYPE_START = '__';

@singleton()
@autoInjectable()
export class SchemaPrinterService {
  /**
   * Outputs a complete GraphQL SDL compliant Schema as string
   * @param schema
   * @returns
   */
  printSchema(schema: GraphQLSchema): string {
    return [
      printSchemaEntry(schema),
      printDirectiveDefinitions(schema).join(DOUBLE_NEWLINE),
      printRootTypes(schema).join(DOUBLE_NEWLINE),
      printTypes(schema).join(DOUBLE_NEWLINE),
      printInputs(schema).join(DOUBLE_NEWLINE)
    ].join(DOUBLE_NEWLINE);
  }
}

/**
 * Prints the schema node of the schema
 * @param schema
 * @returns
 */
function printSchemaEntry(schema: GraphQLSchema): string {
  const query = schema.getQueryType();
  const mutation = schema.getMutationType();
  const lines = [];
  lines.push('schema {');
  if (query) {
    lines.push(`${INDENT}query: ${query.name}`);
  }
  if (mutation) {
    lines.push(`${INDENT}mutation: ${mutation.name}`);
  }
  lines.push('}');
  return lines.join(SINGLE_NEWLINE);
}

/**
 * Prints the directive definition nodes of the schema.
 * @param schema
 * @returns
 */
function printDirectiveDefinitions(schema: GraphQLSchema): string[] {
  const directives = schema.getDirectives();
  const printDirectiveDefinition = (dir: GraphQLDirective): string => {
    let result = `directive @${dir.name}`;
    if (dir.args && dir.args.length > 0) {
      result += `(${dir.args
        .map((arg) => `${arg.name}: ${arg.type.toString()}`)
        .join(COMMA_SPACE)})`;
    }
    result += ` on ${dir.locations
      .map((loc) => DirectiveLocation[loc])
      .join(' | ')}`;
    return result;
  };
  return directives.map((directive) => printDirectiveDefinition(directive));
}

/**
 * Prints the root types of the schema
 * @param schema
 * @returns
 */
function printRootTypes(schema: GraphQLSchema): string[] {
  const query = schema.getQueryType();
  const mutation = schema.getMutationType();
  const types: string[] = [];
  if (query) {
    types.push(printType(query));
  }
  if (mutation) {
    types.push(printType(mutation));
  }
  return types;
}

/**
 * Prints the ObjectTypes of the schema
 * @param schema
 * @returns
 */
function printTypes(schema: GraphQLSchema): string[] {
  const rootTypes = [
    schema.getQueryType()?.name,
    schema.getMutationType()?.name,
    schema.getSubscriptionType()?.name
  ].filter((t) => !!t);
  const types = Object.values(schema.getTypeMap())
    // Remove internal types
    .filter((type) => !type.name.startsWith(INTERNAL_TYPE_START))
    // Only ObjectType
    .filter((type) => isObjectType(type))
    // Remove RootQueryType, RootMutationType or RootSubscriptionType
    .filter((type) => !rootTypes.includes(type.name));
  return types
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((type) => printType(type as GraphQLObjectType));
}

/**
 * Print a single ObjectType
 * @param type
 * @returns
 */
function printType(type: GraphQLObjectType): string {
  const fields = Object.values(type.getFields());
  const lines = [];
  if (type.description) {
    lines.push(`"${type.description}"`);
  }
  let typeLine = `type ${type.toString()}`;
  if ('directives' in type.extensions) {
    typeLine += printDirectives(type.extensions.directives!);
  }
  typeLine += ' {';
  lines.push(typeLine);
  lines.push(
    ...fields
      .sort(sortAlphaExcept(['id', 'delete', 'update'], (field) => field.name))
      .map((field) => printField(field, false))
  );
  lines.push('}');
  return fields.length > 0 ? lines.join(SINGLE_NEWLINE) : '';
}

/**
 * Prints the InputObjectTypes of the schema
 * @param schema
 * @returns
 */
function printInputs(schema: GraphQLSchema): string[] {
  const rootTypes = [
    schema.getQueryType()?.name,
    schema.getMutationType()?.name,
    schema.getSubscriptionType()?.name
  ].filter((t) => !!t);
  const types = Object.values(schema.getTypeMap())
    // Remove internal types
    .filter((type) => !type.name.startsWith(INTERNAL_TYPE_START))
    // Only ObjectType
    .filter((type) => isInputObjectType(type))
    // Remove RootQueryType, RootMutationType or RootSubscriptionType
    .filter((type) => !rootTypes.includes(type.name));
  return types
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((type) => printInput(type as GraphQLInputObjectType));
}

/**
 * Print a single InputObjectType
 * @param type
 * @returns
 */
function printInput(type: GraphQLInputObjectType): string {
  const fields = Object.values(type.getFields());
  const lines = [];
  if (type.description) {
    lines.push(`"${type.description}"`);
  }
  let typeLine = `input ${type.toString()}`;
  if ('directives' in type.extensions) {
    typeLine += printDirectives(type.extensions.directives!);
  }
  typeLine += ' {';
  lines.push(typeLine);
  lines.push(
    ...fields
      .sort(sortAlphaExcept(['id', 'slug'], (field) => field.name))
      .map((field) => printField(field, true))
  );
  lines.push('}');
  return fields.length > 0 ? lines.join(SINGLE_NEWLINE) : '';
}

/**
 * Print a single Field
 * @param field
 * @returns
 */
function printField(
  field: GraphQLField<any, any> | GraphQLInputField,
  inputFields: boolean
): string {
  // console.log('field', field.type, field)
  let result = '';
  if (field.description) {
    result += `${INDENT}"${field.description}"${SINGLE_NEWLINE}`;
  }
  result += `${INDENT}${field.name}`;
  if (
    !inputFields &&
    (field as GraphQLField<any, any>).args &&
    (field as GraphQLField<any, any>).args.length > 0
  ) {
    result += printArgs((field as GraphQLField<any, any>).args);
  }
  result += `: ${field.type.toString()}`;
  if ('directives' in field.extensions) {
    result += printDirectives(field.extensions.directives!);
  }
  return result;
}

/**
 * Print an Argument list
 * @param args
 * @returns
 */
function printArgs(args: readonly GraphQLArgument[]): string {
  return `(${args
    .map((arg) => `${arg.name}: ${arg.type.toString()}`)
    .join(COMMA_SPACE)})`;
}

/**
 * Print a Directives list
 * @param directivesMap The map under the `extensions.directives` field
 * @returns
 */
function printDirectives(directivesMap: Record<string, any>): string {
  return Object.entries(directivesMap)
    .map(([name, val]) => {
      let res = ` @${name}`;
      const args = Object.entries(val);
      if (args && args.length > 0) {
        res += `(${args.map(([prop, value]) => `${prop}: "${value}"`)})`;
      }
      return res;
    })
    .join(SPACE);
}

// function that sorts two objects alphabetically based on their name property, but a given array of names goes first in the order of that array
function sortAlphaExcept<T>(
  first: string[],
  fieldSelector: (obj: T) => string
) {
  return function sortAlfa(aObj: T, bObj: T): number {
    const a = fieldSelector(aObj);
    const b = fieldSelector(bObj);
    if (!first.includes(a) && !first.includes(b)) {
      return a.localeCompare(b);
    }
    if (first.includes(a) && !first.includes(b)) {
      return -1;
    }
    if (!first.includes(a) && first.includes(b)) {
      return 1;
    }
    return first.indexOf(a) - first.indexOf(b);
  };
}

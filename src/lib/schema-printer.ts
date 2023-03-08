import { DirectiveLocation, GraphQLArgument, GraphQLDirective, GraphQLField, GraphQLObjectType, GraphQLSchema } from "graphql";
import { autoInjectable, singleton } from "tsyringe";
import { Context } from "./context.js";

@singleton()
@autoInjectable()
export class SchemaPrinter {

    printSchema(schema: GraphQLSchema, context: Context): string {
        let lines: [];
    
        return [
            printSchemaEntry(schema).join('\n'),
            printDirectiveDefinitions(schema).join('\n\n'),
            printRootTypes(schema).join('\n'),
            printTypes(schema, context.getGraphQLTypes()).join('\n\n')
        ].join('\n\n');
    }
}
    function printSchemaEntry(schema: GraphQLSchema): string[] {
        const query = schema.getQueryType();
        const mutation = schema.getMutationType();
        const lines = [];
        lines.push('schema {');
        if (query) { lines.push(`  query: ${query.name}`) }
        if (mutation) { lines.push(`  mutation: ${mutation.name}`) }
        lines.push('}');
        return lines;
    }
    
    function printDirectiveDefinitions(schema: GraphQLSchema): string[] {
        const directives = schema.getDirectives();
        const printDirectiveDefinition = (dir: GraphQLDirective): string => {
            let result = `directive @${dir.name}`;
            if (dir.args && dir.args.length > 0) {
                result += `(${dir.args.map(arg => `${arg.name}: ${arg.type.toString()}`).join(', ')})`;
            }
            result += ` on ${dir.locations.map(loc => DirectiveLocation[loc]).join(' | ')}`;
            return result;
        }
        return directives.map(directive => printDirectiveDefinition(directive));
    }
    
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
    
    function printTypes(schema: GraphQLSchema, types: GraphQLObjectType[]): string[] {
        return types.map(type => printType(type as GraphQLObjectType));
    }
    
    function printType(type: GraphQLObjectType): string {
        const fields = Object.values(type.getFields()!);
        let lines = [];
        if (type.description) {
            lines.push(`"${type.description}"`);
        }
        let typeLine = `type ${type.toString()}`;
        if ('directives' in type.extensions) {
            typeLine += printDirectives(type.extensions.directives!);
        }
        typeLine += ' {';
        lines.push(typeLine);
        lines.push(...fields.map(field => printField(field)));
        lines.push('}')
        return lines.join('\n');
    }
    
    
    function printField(field: GraphQLField<any, any>): string {
        let result = '';
        if (field.description) {
            result += `  "${field.description}"\n`;
        }
        result += `  ${field.name}`;
        if (field.args && field.args.length > 0) {
            result += printArgs(field.args);
        }
        result += `: ${field.type.toString()}`;
        if ('directives' in field.extensions) {
            result += printDirectives(field.extensions.directives!)
        }
        return result;
    }
    
    function printArgs(args: readonly GraphQLArgument[]): string {
        return `(${args.map(arg => `${arg.name}: ${arg.type.toString()}`).join(', ')})`;
    }
    
    function printDirectives(directivesMap: Record<string, any>): string {
        return Object.entries(directivesMap).map(([name, val]) => {
            let res = ` @${name}`;
            const args = Object.entries(val);
            if (args && args.length > 0) {
                res += `(${args.map(([prop, value]) => `${prop}: "${value}"`)})`;
            }
            return res;
        }).join(' ');
    }
    

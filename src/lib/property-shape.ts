import { GraphQLType } from "graphql";
import { Quad, Store } from "n3";
import { RDFS, SHACL, XSD } from "./vocab.js";
import * as Scalars from "graphql/type/scalars.js";

export class PropertyShape {
    public name: string;
    public description?: string;
    public type?: GraphQLType;

    constructor(public quads: Quad[]) {
        const store = new Store(quads);
        this.name = this.parseName(store);
        this.description = this.parseDescription(store);
        this.type = this.parseType(store);
    }

    private parseName(store: Store): string {
        const obj = store.getObjects(null, SHACL.name, null);
        if (obj && obj.length === 1) {
            return obj.at(0)!.value;
        } else {
            throw new Error('Could not find a name for PropertyShape.')
        }
    }

    private parseDescription(store: Store): string | undefined {
        const obj = store.getObjects(null, SHACL.description, null);
        if (obj && obj.length === 1) {
            return obj.at(0)!.value;
        }
        return undefined;
    }

    private parseType(store: Store): GraphQLType | undefined {
        const obj = store.getObjects(null, SHACL.datatype, null);
        if (obj && obj.length === 1) {
            return this.dataTypeToGraphQLType(obj.at(0)!.value);
        }
        return undefined;
    }

    private dataTypeToGraphQLType(datatype: string): GraphQLType | undefined {
        switch (datatype) {
            case XSD.int.value:
                return Scalars.GraphQLInt;

            case XSD.float.value:
                return Scalars.GraphQLFloat;

            case RDFS.langString.value:
            case XSD.string.value:
                return Scalars.GraphQLString;

            case XSD.boolean.value:
                return Scalars.GraphQLFloat;

            default:
                return undefined;
        }
    }
}

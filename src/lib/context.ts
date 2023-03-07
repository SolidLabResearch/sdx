import { Quad, Store } from "n3";
import { Shape } from "./shape.js";
import { RDFS, SHACL } from "./vocab.js";
import { GraphQLObjectType, GraphQLType } from "graphql";
import { groupBySubject } from "./util.js";

export class Context {
    private _store: Store;
    private _shapeStore: Store;
    private _blankNodeStore: Store;
    private _graphQLTypes: GraphQLObjectType[] = [];

    constructor(quads: Quad[]) {
        this._store = new Store(quads);
        this._blankNodeStore = new Store(this._store
            .getQuads(null, null, null, null)
            .filter(q => q.subject.termType === 'BlankNode'));
        this._shapeStore = new Store(this._store
            .getSubjects(RDFS.a, SHACL.NodeShape, null)
            .flatMap(sub => this._store.getQuads(sub, null, null, null)));
    }

    /**
     * Store with Quads that have only quads that are `?sub a shacl:NodeSahpe`
     * @returns 
     */
    getShapeStore(): Store {
        return this._shapeStore;
    }

    /**
     * Store with only Quads that have subject with type BlankNode
     * @returns 
     */
    getBlankNodeStore(): Store {
        return this._blankNodeStore;
    }

    /**
     * A store with all quads.
     * @returns 
     */
    getStore(): Store {
        return this._store;
    }

    setGraphQLTypes(graphQLTypes: GraphQLObjectType[]) {
        this._graphQLTypes = graphQLTypes;
    }

    getGraphQLTypes(): GraphQLObjectType[] {
        return this._graphQLTypes;
    }

    /**
     * Retrieve all Shapes in this context
     * @returns 
     */
    allShapes(): Shape[] {
        const shapes: Shape[] = [];
        for (const entry of groupBySubject(this._shapeStore).entries()) {
            shapes.push(new Shape(entry[1], this));
        }
        return shapes;
    }
}

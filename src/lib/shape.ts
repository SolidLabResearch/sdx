import { BlankNode, Quad, Store } from "n3";
import { PropertyShape } from "./property-shape.js";
import { RDFS, SHACL } from './vocab.js';

export class Shape {
    public name: string;
    public propertyShapes: PropertyShape[];


    /**
     * Parse relevant quads to Shapes
     * @param quads The quads that make up the Shape
     * @param context Any toplevel quads that have a BlankNode subject
     */
    constructor(public quads: Quad[], private context: Store) {
        const store = new Store(quads);
        this.name = this.parseName(store);
        this.propertyShapes = this.parsePropertyShapes(store, context);

    }

    private parseName(store: Store): string {
        const sub = store.getSubjects(RDFS.a, SHACL.NodeShape, null);
        if (sub && sub.length === 1 && sub.at(0)!.value.indexOf('#') > -1) {
            return sub.at(0)!.value.split('#').at(-1)!;
        }
        else {
            throw new Error('There must be just one Subject for \'a\' NodeShape.')
        }
    }

    private parsePropertyShapes(store: Store, context: Store): PropertyShape[] {
        // Get all quads with a sh:property predicate
        return store.getQuads(null, SHACL.property, null, null)
            .map(({object: quadObject}) => {
                if (quadObject.termType === 'BlankNode') {
                    return new PropertyShape(context.getQuads(quadObject, null, null, null));
                }
            })
            .filter(item => item !== undefined) as PropertyShape[];
    }
}

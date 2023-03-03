import { Quad, Store } from "n3";
import { RDFS, SHACL } from './vocab.js';

export class Shape {
    public name: string;



    constructor(public quads: Quad[]) {
        const store = new Store(quads);
        this.name = this.parseName(store);
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
}

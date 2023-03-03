import { DataFactory } from "n3";

const { namedNode } = DataFactory;

export const RDFS = {
    a: namedNode('http://www.w3.org/1999/02/22-rdf-syntax-ns#type')
}

export const SHACL = {
    NodeShape: namedNode('http://www.w3.org/ns/shacl#NodeShape')
}

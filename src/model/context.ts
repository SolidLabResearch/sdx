import { GraphQLObjectType } from 'graphql';
import { GraphQLInputObjectType } from 'graphql/type/definition.js';
import { Quad, Store } from 'n3';
import { groupBySubject } from '../util.js';
import { Shape } from './shape.js';
import { RDFS, SHACL } from './vocab.js';

export class Context {
  private store: Store;
  private shapes: Shape[];
  private types: GraphQLObjectType[];
  private blankNodes: Quad[];
  private inputTypes: GraphQLInputObjectType[] = [];

  /**
   * Context object for conversion from SHACL to GraphQL Schema
   * @param quads All quads
   * @param objectTypeConverter A function (closure) that converts a Shape into a GraphQLObjectType
   */
  constructor(
    quads: Quad[],
    objectTypeConverter: (shape: Shape) => GraphQLObjectType
  ) {
    this.store = new Store(quads);
    this.blankNodes = this.extractBlankNodes(quads);
    this.shapes = this.extractShapes(this.store);
    this.types = this.extractTypes(this.shapes, objectTypeConverter);
  }

  /**
   * A store with all quads.
   * @returns
   */
  getStore(): Store {
    return this.store;
  }

  getGraphQLObjectTypes(): GraphQLObjectType[] {
    return this.types;
  }

  getBlankNodes(): Quad[] {
    return this.blankNodes;
  }

  getInputTypes(): GraphQLInputObjectType[] {
    return this.inputTypes;
  }

  private extractShapes(store: Store): Shape[] {
    const shapes: Shape[] = [];
    const quads: Quad[] = store
      .getSubjects(RDFS.a, SHACL.NodeShape, null)
      .flatMap((sub) => store.getQuads(sub, null, null, null));
    for (const entry of groupBySubject(quads).entries()) {
      shapes.push(new Shape(entry[1], this));
    }
    return shapes;
  }

  private extractTypes(
    shapes: Shape[],
    objectTypeConverter: (shape: Shape) => GraphQLObjectType
  ): GraphQLObjectType[] {
    return shapes.map(objectTypeConverter);
  }

  private extractBlankNodes(quads: Quad[]): Quad[] {
    return quads.filter((quad) => quad.subject.termType === 'BlankNode');
  }
}

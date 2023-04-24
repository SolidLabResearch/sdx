import { PathLike } from "fs";
import { lstat, readdir, readFile } from "fs/promises";
import { GraphQLObjectType, GraphQLSchema } from "graphql";
import { DirectiveLocation } from "graphql/language/directiveLocation.js";
import {
  GraphQLField,
  GraphQLFieldConfig,
  GraphQLInputField,
  GraphQLInputFieldConfig,
  GraphQLInputObjectType,
  GraphQLInputType,
  GraphQLList,
  GraphQLNonNull,
  GraphQLObjectTypeConfig,
  GraphQLOutputType,
  GraphQLType,
  isListType,
  isNonNullType,
  ThunkObjMap,
} from "graphql/type/definition.js";
import { GraphQLDirective } from "graphql/type/directives.js";
import * as Scalars from "graphql/type/scalars.js";
import { Parser, Quad } from "n3";
import { autoInjectable, singleton } from "tsyringe";
import { ERROR } from "../constants.js";
import { Context } from "../lib/context.js";
import { PropertyShape } from "../lib/model/property-shape.js";
import { Shape } from "../lib/model/shape.js";
import {
  capitalize,
  decapitalize,
  isOrContainsObjectType,
  isOrContainsScalar,
  plural,
  toActualType,
} from "../util.js";

const ID_FIELD: { id: GraphQLFieldConfig<any, any> } = {
  id: {
    description:
      "Auto-generated property that will be assigned to the `iri` of the Thing that is being queried.",
    type: new GraphQLNonNull(Scalars.GraphQLID),
    extensions: {
      directives: {
        identifier: {},
      },
    },
  },
} as const;

const ID_MUTATOR_FIELD: { id: GraphQLInputFieldConfig } = {
  id: {
    description: `Optional URI to use as an identifier for the new instance. One of the 'id' or 'slug' fields must be set!`,
    type: Scalars.GraphQLID,
  },
} as const;

const SLUG_MUTATOR_FIELD: { slug: GraphQLInputFieldConfig } = {
  slug: {
    description: `Optional slug that is combined with the context of the request to generate an identifier for the new instance. One of the 'id' or 'slug' fields must be set!`,
    type: Scalars.GraphQLString,
  },
} as const;

const IDENTIFIER_DIRECTIVE = new GraphQLDirective({
  name: "identifier",
  locations: [DirectiveLocation.FIELD_DEFINITION],
});

const IS_DIRECTIVE = new GraphQLDirective({
  name: "is",
  args: { class: { type: Scalars.GraphQLString } },
  locations: [DirectiveLocation.OBJECT, DirectiveLocation.INPUT_OBJECT],
});

const PROPERTY_DIRECTIVE = new GraphQLDirective({
  name: "property",
  args: { iri: { type: Scalars.GraphQLString } },
  locations: [
    DirectiveLocation.FIELD_DEFINITION,
    DirectiveLocation.INPUT_FIELD_DEFINITION,
  ],
});

const ROOT_QUERY_TYPE = "Query";
const ROOT_MUTATION_TYPE = "Mutation";

@singleton()
@autoInjectable()
export class ShaclParserService {
  private parser: Parser;

  constructor() {
    this.parser = new Parser({ format: "turtle" });
  }

  async parseSHACL(
    path: PathLike,
    ingoreFileNames: string[] = []
  ): Promise<GraphQLSchema> {
    const stat = await lstat(path);
    if (stat.isDirectory() && (await readdir(path)).length === 0) {
      throw ERROR.NO_SHACL_SCHEMAS;
    }

    const parsePath = async (pathLike: PathLike): Promise<Quad[]> => {
      if (ingoreFileNames.includes(pathLike.toString())) {
        return [];
      }
      const stat = await lstat(pathLike);
      let quads: Quad[] = [];
      if (stat.isDirectory()) {
        for (const fileName of await readdir(pathLike)) {
          if (!ingoreFileNames.includes(fileName)) {
            quads.push(...(await parsePath(`${pathLike}/${fileName}`)));
          }
        }
      } else {
        const source = await readFile(pathLike);
        quads.push(...this.parser.parse(source.toString()));
      }
      return quads;
    };

    const context = new Context(await parsePath(path), this.generateObjectType);

    // Generate Schema
    return new GraphQLSchema({
      query: this.generateQueryEntryPoints(context.getGraphQLObjectTypes()),
      mutation: this.generateMutationEntryPoints(context),
      directives: [IS_DIRECTIVE, PROPERTY_DIRECTIVE, IDENTIFIER_DIRECTIVE],
      // types: context.getInputTypes()
    });
  }

  /**
   * Generates the entry points for the GraphQL Query schema
   * @param types
   * @returns
   */
  private generateQueryEntryPoints(
    types: GraphQLObjectType[]
  ): GraphQLObjectType {
    const query = new GraphQLObjectType({
      name: ROOT_QUERY_TYPE,
      fields: types.reduce(
        (prev, type) => ({
          ...prev,
          // Singular type
          [decapitalize(type.name)]: {
            type,
            args: { id: { type: Scalars.GraphQLString } },
          },
          // Multiple types
          [plural(decapitalize(type.name))]: {
            type: new GraphQLList(type),
          },
        }),
        {}
      ),
    } as GraphQLObjectTypeConfig<any, any>);

    return query;
  }

  /**
   * Generates a Mutation EntryPoint RootMutationType
   * @param types
   * @returns
   */
  private generateMutationEntryPoints(context: Context): GraphQLObjectType {
    const types = context.getGraphQLObjectTypes();
    const mutation = new GraphQLObjectType({
      name: ROOT_MUTATION_TYPE,
      fields: types.reduce((prev, type) => {
        const createName = `create${capitalize(type.name)}`;
        const mutateName = `mutate${capitalize(type.name)}`;
        return {
          ...prev,
          // create type
          [createName]: {
            type: new GraphQLNonNull(type),
            args: {
              input: {
                type: new GraphQLNonNull(
                  this.generateInputObjectType(
                    type,
                    `${capitalize(createName)}Input`,
                    "create",
                    context
                  )
                ),
              },
            },
          },
          // edit types
          [mutateName]: {
            type: this.generateMutationObjectType(type, context),
            args: { id: { type: new GraphQLNonNull(Scalars.GraphQLID) } },
          },
        };
      }, {}),
    });
    return mutation;
  }

  /**
   * Generates an InputObject type, typically used as an argument in a mutator (always NonNull)
   * @param type
   * @param name
   * @returns
   */
  private generateInputObjectType(
    type: GraphQLObjectType,
    name: string,
    mutationType: "create" | "update",
    context: Context
  ): GraphQLInputObjectType {
    let inputType = context.getInputTypes().find((type) => name === type.name);
    if (!inputType) {
      let fields = Object.fromEntries(
        Object.entries(type.getFields())
          .filter(([_, field]) => isOrContainsScalar(field.type))
          .filter(([_, field]) => !isIdentifier(field))
          .map(([name, field]) => [name, toInputField(field, mutationType)])
      );
      if (mutationType === "create") {
        fields = {
          ...ID_MUTATOR_FIELD,
          ...SLUG_MUTATOR_FIELD,
          ...fields,
        };
      }
      inputType = new GraphQLInputObjectType({
        name,
        fields,
        extensions: type.extensions,
      }) as GraphQLInputObjectType;
      context.getInputTypes().push(inputType);
    }
    return inputType;
  }

  /**
   * Generate the Mutation Type for existing Types
   * @param type Original ObjectType
   * @param context
   * @returns
   */
  private generateMutationObjectType(
    type: GraphQLObjectType,
    context: Context
  ): GraphQLObjectType {
    return new GraphQLObjectType({
      name: `${capitalize(type.name)}Mutation`,
      fields: this.generateMutationObjectTypeFields(type, context),
      extensions: type.extensions,
    });
  }

  /**
   * Generate the fields for a MutationObjectType
   * @param type Original ObjectType
   * @param context
   * @returns
   */
  private generateMutationObjectTypeFields(
    type: GraphQLObjectType,
    context: Context
  ): ThunkObjMap<GraphQLFieldConfig<any, any>> {
    // Delete operation is always present
    let fields: ThunkObjMap<GraphQLFieldConfig<any, any>> = {
      delete: { type: new GraphQLNonNull(type) },
    };

    // Update operation if InputObject contains at least 1 scalar field.
    const inputType = this.generateInputObjectType(
      type,
      `Update${capitalize(type.name)}Input`,
      "update",
      context
    );
    if (Object.keys(inputType.getFields()).length > 0) {
      fields.update = {
        type: new GraphQLNonNull(type),
        args: { input: { type: new GraphQLNonNull(inputType) } },
      };
    }

    // Add opreations for other non-scalar fields
    const extra = Object.values(type.getFields()).reduce((acc, field) => {
      if (isOrContainsObjectType(field.type)) {
        const isListLike =
          isListType(field.type) ||
          (isNonNullType(field.type) && isListType(field.type.ofType));
        acc = {
          ...acc,
          ...(isListLike
            ? this.generateMutationObjectTypeFieldsForCollection(
                field,
                type,
                context
              ) // arrayLike
            : this.generateMutationObjectTypeFieldsForSingular(
                field,
                type,
                context
              )), // singular
        };
      }
      return acc;
    }, {} as ThunkObjMap<GraphQLFieldConfig<any, any>>);
    return { ...fields, ...extra };
  }

  /**
   * Generate fields for a MutationObjectType when the field of the original has a collection return type
   * @param field Original field
   * @param parentType Original Object Type
   * @param context
   * @returns
   */
  private generateMutationObjectTypeFieldsForCollection(
    field: GraphQLField<any, any>,
    parentType: GraphQLOutputType,
    context: Context
  ): ThunkObjMap<GraphQLFieldConfig<any, any>> {
    const addName = `add${capitalize(field.name)}`;
    const removeName = `remove${capitalize(field.name)}`;
    const linkName = `link${capitalize(field.name)}`;
    const unlinkName = `unlink${capitalize(field.name)}`;
    const returnType = new GraphQLNonNull(parentType);
    const fieldType = toActualType(field.type) as GraphQLObjectType;
    return {
      [addName]: {
        type: returnType,
        args: {
          input: {
            type: new GraphQLNonNull(
              this.generateInputObjectType(
                fieldType,
                `Create${capitalize(fieldType.name)}Input`,
                "create",
                context
              )
            ),
          },
        },
      },
      [removeName]: {
        type: returnType,
        args: { id: { type: new GraphQLNonNull(Scalars.GraphQLID) } },
      },
      [linkName]: {
        type: returnType,
        args: { id: { type: new GraphQLNonNull(Scalars.GraphQLID) } },
      },
      [unlinkName]: {
        type: returnType,
        args: { id: { type: new GraphQLNonNull(Scalars.GraphQLID) } },
      },
    };
  }

  /**
   * Generate fields for a MutationObjectType when the field of the original has a singular return type
   * @param field Original field
   * @param parentType Original Object Type
   * @param context
   * @returns
   */
  private generateMutationObjectTypeFieldsForSingular(
    field: GraphQLField<any, any>,
    parentType: GraphQLOutputType,
    context: Context
  ): ThunkObjMap<GraphQLFieldConfig<any, any>> {
    const setName = `set${capitalize(field.name)}`;
    const clearName = `clear${capitalize(field.name)}`;
    const linkName = `link${capitalize(field.name)}`;
    const unlinkName = `unlink${capitalize(field.name)}`;
    const returnType = new GraphQLNonNull(parentType);
    const fieldType = toActualType(field.type) as GraphQLObjectType;
    return {
      [setName]: {
        type: returnType,
        args: {
          input: {
            type: new GraphQLNonNull(
              this.generateInputObjectType(
                fieldType,
                `Create${capitalize(fieldType.name)}Input`,
                "create",
                context
              )
            ),
          },
        },
      },
      [clearName]: {
        type: returnType,
      },
      [linkName]: {
        type: returnType,
        args: { id: { type: new GraphQLNonNull(Scalars.GraphQLID) } },
      },
      [unlinkName]: {
        type: returnType,
        args: { id: { type: new GraphQLNonNull(Scalars.GraphQLID) } },
      },
    };
  }

  /**
   * Generates a GraphQLObjectType from a Shape
   * @param shape
   * @returns
   */
  private generateObjectType(shape: Shape): GraphQLObjectType {
    const applyMinMaxCount = (
      propertyShape: PropertyShape,
      type: GraphQLType
    ): GraphQLList<GraphQLType> | GraphQLNonNull<GraphQLType> | GraphQLType => {
      let result:
        | GraphQLList<GraphQLType>
        | GraphQLNonNull<GraphQLType>
        | GraphQLType = type;
      // collection
      if (
        !propertyShape.maxCount ||
        (propertyShape.maxCount && propertyShape.maxCount > 1)
      ) {
        result = new GraphQLList(result);
      }
      if (propertyShape.minCount && propertyShape.minCount > 0) {
        result = new GraphQLNonNull(result);
      }
      return result;
    };
    const props = () =>
      shape.propertyShapes.reduce((prev, prop) => {
        const propType = prop.type ?? prop.class();
        if (!propType) {
          return prev;
        } else {
          return {
            ...prev,
            [prop.name]: {
              type: applyMinMaxCount(prop, propType!),
              description: prop.description,
              extensions: {
                directives: {
                  property: { iri: prop.path },
                },
              },
            } as GraphQLFieldConfig<any, any>,
          };
        }
      }, ID_FIELD);
    return new GraphQLObjectType({
      name: shape.name,
      fields: props,
      extensions: {
        directives: {
          is: { class: shape.targetClass },
        },
      },
    });
  }
}

function toInputField(
  field: GraphQLField<any, any>,
  mutationType: "create" | "update"
): GraphQLInputFieldConfig {
  let fieldType = toScalarInputType(field.type);
  // If mutationType is 'update', make the field nullable
  fieldType =
    mutationType === "update" && isNonNullType(fieldType)
      ? fieldType.ofType
      : fieldType;
  return {
    type: fieldType,
    description: field.description,
    extensions: field.extensions,
  };
}

function toScalarInputType(
  type: GraphQLOutputType,
  modifiers: { collection?: boolean; nonNull?: boolean } = {}
): GraphQLInputType {
  if (isListType(type)) {
    let res = toScalarInputType(type.ofType, { collection: true });
    if (modifiers.collection) {
      res = new GraphQLList(res);
    }
    if (modifiers.nonNull) {
      res = new GraphQLNonNull(res);
    }
    return res;
  }
  if (isNonNullType(type)) {
    let res = toScalarInputType(type.ofType, { nonNull: true });
    if (modifiers.collection) {
      res = new GraphQLList(res);
    }
    if (modifiers.nonNull) {
      res = new GraphQLNonNull(res);
    }
    return res;
  }
  let res: GraphQLInputType = Scalars.specifiedScalarTypes.find(
    (t) => t.name === type.toString()
  )!;
  if (!res) {
    throw new Error(`${type.toString()} is not a Scalar!`);
  }
  if (modifiers.collection) {
    res = new GraphQLList(res);
  }
  if (modifiers.nonNull) {
    res = new GraphQLNonNull(res);
  }
  return res;
}

/**
 * Whether this field is annotated with the @identifier directive
 * @param field
 * @returns
 */
function isIdentifier(field: GraphQLField<any, any> | GraphQLInputField) {
  const directives = field.extensions.directives as any;
  return directives && directives["identifier"];
}

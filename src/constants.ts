// CLI paths
export const PATH_SDX_CONFIG = '.sdxconfig';
export const PATH_SOLID_MANIFEST = '.solidmanifest';
export const PATH_PACKAGE_JSON = 'package.json';
export const PATH_DOT_SDX_FOLDER = '.sdx';
export const PATH_SDX_LIST_CACHE = `${PATH_DOT_SDX_FOLDER}/list.cache`;

// Generate paths
export const PATH_SDX_GENERATE_FOLDER = `src/.sdx-gen`;
export const PATH_SDX_GENERATE_SHACL_FOLDER = `${PATH_SDX_GENERATE_FOLDER}/shacl`;
export const PATH_SDX_GENERATE_GRAPHQL_FOLDER = `${PATH_SDX_GENERATE_FOLDER}/graphql`;
export const PATH_SDX_GENERATE_GRAPHQL_SCHEMA = `${PATH_SDX_GENERATE_GRAPHQL_FOLDER}/schema.graphqls`;
export const PATH_SDX_GENERATE_SDK = `${PATH_SDX_GENERATE_FOLDER}/sdk.generated.ts`;
export const PATH_GRAPHQL_RC = `.graphqlrc.yml`;
export const PATH_GRAPHQL_QUERIES_FOLDER = `src/gql`;
export const PATH_GRAPHQL_QUERIES = `${PATH_GRAPHQL_QUERIES_FOLDER}/queries.graphql`;

export const enum ERROR {
  NO_SHACL_SCHEMAS = `No shacl schema's`
}

export const LIB_DEPENDENCIES = ['@solidlab/sdx-sdk@1.0.0-beta.18'];
export const LIB_DEV_DEPENDENCIES = ['@solidlab/sdx@6.0.4'];

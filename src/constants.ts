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

// Other
export const PATH_SRC_GRAPHQL_QUERIES = `src/gql`;

//Demo
export const TEST_SHACL_FILE_PATH = '.assets/shacl/test.ttl';
export const TEST_COMPLEX_SHACL_FILE_PATH = '.assets/shacl/test-complex.ttl';
export const TEST_GRAPHQL_FILE_PATH = '.assets/graphql/schema.graphqls';
export const TARGET_GRAPHQL_FILE_PATH = '.assets/graphql/target.graphqls';
export const DEMO_POD_URI = 'http://localhost:3000';
export const DEMO_POD_SCHEMAS_URI = `${DEMO_POD_URI}/schemas`;

export const enum ERROR {
  NO_SHACL_SCHEMAS = `No shacl schema's`
}

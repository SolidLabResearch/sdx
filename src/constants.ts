export const PATH_SDX_CONFIG = '.sdxconfig';
export const PATH_SOLID_MANIFEST = '.solidmanifest';
export const PATH_SDX_TYPES_FOLDER = 'sdx-types';
export const PATH_PACKAGE_JSON = 'package.json';
export const PATH_DOT_SDX_FOLDER = '.sdx'
export const PATH_SDX_LIST_CACHE = `${PATH_DOT_SDX_FOLDER}/list.cache`;
export const PATH_SDX_SHACL_CACHE_FOLDER = `src/${PATH_DOT_SDX_FOLDER}/shacl`;
export const PATH_SDX_GRAPHQL_CACHE_FOLDER = `src/${PATH_DOT_SDX_FOLDER}/graphql`;
export const PATH_SDX_GRAPHQL_SCHEMA = `src/${PATH_DOT_SDX_FOLDER}/graphql/schema.graphqls`;
export const PATH_SRC_GRAPHQL = `src/graphql`;

export const PATH_SDX_SDK_GENERATED = `src/${PATH_DOT_SDX_FOLDER}/sdk.generated.ts`;


export const TEST_SHACL_FILE_PATH = '.assets/shacl/test.ttl';
export const TEST_COMPLEX_SHACL_FILE_PATH = '.assets/shacl/test-complex.ttl';
// export const TEST_SHACL_FILE_PATH = '.assets/shacl/adresregister-SHACL.ttl';
export const TEST_GRAPHQL_FILE_PATH = '.assets/graphql/schema.graphqls';
export const TARGET_GRAPHQL_FILE_PATH = '.assets/graphql/target.graphqls';
export const DEMO_POD_URI = 'http://localhost:3000';
export const DEMO_POD_SCHEMAS_URI = `${DEMO_POD_URI}/schemas`;


export const enum ERROR {
    NO_SHACL_SCHEMAS = `No shacl schema's`
}

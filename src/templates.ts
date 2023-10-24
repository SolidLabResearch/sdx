import { SdxConfig, SolidManifest } from './types.js';

export const DEFAULT_SDX_CONFIG: SdxConfig = {
  formatVersion: '1.0.0',
  catalogs: [{ name: 'SolidLab Catalog', uri: 'https://catalog.solidlab.be' }],
  options: {
    autoGenerate: true,
    rawRequest: false
  }
};

export const DEFAULT_SOLID_MANIFEST: SolidManifest = {
  formatVersion: '1.0.0',
  name: 'my-solid-app',
  author: '',
  license: 'ISC',
  shapePackages: []
};

export const GRAPHQL_RC = `# .graphqlrc.yml
schema: src/.sdx-gen/graphql/schema.graphqls
documents: src/gql/**/*.graphql`;

import { SdxConfig, SolidManifest } from './types.js';

export const DEFAULT_SDX_CONFIG: SdxConfig = {
  formatVersion: '1.0.0',
  repositories: [],
  options: {
    autoGenerate: true
  }
};

export const DEFAULT_SOLID_MANIFEST: SolidManifest = {
  formatVersion: '1.0.0',
  name: 'my-solid-app',
  author: '',
  license: 'ISC',
  typePackages: []
};

export const GRAPHQL_RC = `# .graphqlrc.yml
schema: src/.sdx-gen/graphql/schema.graphqls
documents: src/gql/**/*.graphql`;

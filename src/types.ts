export interface InitOptions {
  force: boolean;
  name?: string;
}

export interface SdxConfig {
  formatVersion: string;
  repositories: SdxRepository[];
  options?: SdxConfigOptions;
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface SdxConfigOptions {}

export interface SolidManifest {
  formatVersion: string;
  name: string;
  author: string;
  license: string;
  types: SolidType[];
}

export interface SdxRepository {
  name: string;
  uri: string;
}

export interface SolidPackage extends Dated {
  id: string;
  maintainers: string[];
  name?: string;
  description?: string;
  license?: string;
  author?: string;
  homepage?: string;
  repository?: string;
  downloads?: number;
}

export interface SolidType extends Dated {
  id: string;
  packageIdentifier: string;
  name?: string;
  description?: string;
  properties: SolidTypeProperty[];
}

export interface SolidTypeProperty {
  class: string | null;
  name: string;
  path: string | null;
  description: string | null;
  datatype: string | null;
  minCount: number | null;
  maxCount: number | null;
}

export interface Page<T> {
  items: T[];
  cursor?: string;
  count?: number;
}

export interface Dated {
  createdAt: string;
  lastModifiedAt?: string;
}

/**
 * Arguments for querying the API in case of collections.
 */
export interface PageArgs {
  /** Cursor pointing to the next {@link Page} */
  cursor?: string;
  /** Filter to filter the results */
  filter?: string;
  /** Limits the number of items in a page */
  limit?: number;

  /** Order by a field, append with <space> desc|asc */
  orderBy?: string;
}

/**
 * Arguments for filtering, cursor property cannot be used.
 */
export type FilterArgs = Omit<PageArgs, 'cursor'>;

export interface PackageImportReport {
  typesCreated: string[];
  typesUpdated: string[];
}

export interface SearchTypeOutput {
  typePackage: SolidPackage;
  typeMatches: string[];
}

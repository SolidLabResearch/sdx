import axios, { AxiosResponse } from 'axios';
import { autoInjectable } from 'tsyringe';
import {
  Page,
  PageArgs,
  SearchTypeOutput,
  SolidType,
  SolidTypePackage
} from '../types.js';

const API_ROOT = '/api';
const apiHost = 'https://catalog.solid.discover.ilabt.imec.be';

/**
 * Creates a URL with the {@link API_ROOT}, path, and args appended as querystring.
 * @param path - Path of the api
 * @param args - QueryArgs to append
 * @returns
 */
function url(path: string, args: PageArgs = {}): string {
  const query = Object.entries(args)
    .map(
      (entry) =>
        encodeURIComponent(entry[0]) + '=' + encodeURIComponent(entry[1])
    )
    .join('&');
  const url = `${apiHost}${API_ROOT}/${path}`;
  return query.length === 0 ? url : `${url}?${query}`;
}

@autoInjectable()
export class BackendService {
  private http = axios;

  /**
   * Search for a type.
   *
   * @param query - Term to search for
   */
  async searchPackage(query: string): Promise<SolidTypePackage[]> {
    return safe(
      this.http.post<SolidTypePackage[]>(url('search/package'), {
        keyword: query
      })
    );
  }

  /**
   * List all types.
   */
  async listTypes(args?: PageArgs): Promise<Page<SolidType>> {
    return safe(this.http.get<Page<SolidType>>(url('types', args)));
  }

  /**
   * Search for a type.
   *
   * @param query - Term to search for
   */
  async searchType(query: string): Promise<SearchTypeOutput[]> {
    return safe(
      this.http.post<SearchTypeOutput[]>(url('search/type'), { keyword: query })
    );
  }

  /**
   * Get a type
   * @param id - Id of the type.
   */
  async getType(id: string): Promise<SolidType> {
    return safe(this.http.get<SolidType>(url(`types/${id}`)));
  }

  /**
   * Get the scheme of a type.
   * @param id - Id of the type.
   */
  async getTypeScheme(id: string): Promise<string> {
    return safe(
      this.http.get(url(`types/${id}/scheme`), {
        headers: { 'content-type': 'text/turtle' }
      })
    );
  }

  /**
   * @deprecated Demo purpose only!
   */
  async demoDownloadSchema(iri: string): Promise<string> {
    return safe(
      this.http.get(iri, { headers: { 'content-type': 'text/turtle' } })
    );
  }

  /**
   * Get a type package
   * @param id - Id of the type.
   */
  async getTypePackage(id: string): Promise<SolidTypePackage> {
    return safe(this.http.get<SolidTypePackage>(url(`packages/${id}`)));
  }

  /**
   * Dowload the SHACL of a type package
   */
  async getTypePackageShacl(id: string): Promise<string> {
    console.log('downloading from api:', url(`packages/${id}/download)`));
    return safe(
      this.http.get(url(`packages/${id}/download`), {
        headers: { 'content-type': 'text/turtle' }
      })
    );
  }
}

const safe = async <T>(promise: Promise<AxiosResponse<T>>) => {
  const result = await promise;
  if (result.status === 200) {
    return result.data;
  } else {
    throw Error(`${result.status} ${result.statusText}`);
  }
};

import { RxHR, RxHttpRequestResponse } from '@akanass/rx-http-request';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators/index.js';
import { autoInjectable } from 'tsyringe';
import {
  Page,
  PageArgs,
  SearchTypeOutput,
  SolidTypePackage,
  SolidType
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
  private http = RxHR;

  /**
   * Search for a type.
   *
   * @param query - Term to search for
   */
  searchPackage(query: string): Observable<SolidTypePackage[]> {
    return this.http
      .post<SolidTypePackage[]>(url('search/package'), {
        json: true,
        body: { keyword: query }
      })
      .pipe(map(mapToResultOrError));
  }

  /**
   * List all types.
   */
  listTypes(args?: PageArgs): Observable<Page<SolidType>> {
    return this.http
      .get<Page<SolidType>>(url('types', args), { json: true })
      .pipe(map(mapToResultOrError));
  }

  /**
   * Search for a type.
   *
   * @param query - Term to search for
   */
  searchType(query: string): Observable<SearchTypeOutput[]> {
    return this.http
      .post<SolidType[]>(url('search/type'), {
        body: { keyword: query },
        json: true
      })
      .pipe(map(mapToResultOrError));
  }

  /**
   * Get a type
   * @param id - Id of the type.
   */
  getType(id: string): Observable<SolidType> {
    return this.http
      .get<SolidType>(url(`types/${id}`), { json: true })
      .pipe(map(mapToResultOrError));
  }

  /**
   * Get the scheme of a type.
   * @param id - Id of the type.
   */
  getTypeScheme(id: string): Observable<string> {
    return this.http
      .get(url(`types/${id}/scheme`), {
        headers: { 'content-type': 'text/turtle' }
      })
      .pipe(map(mapToResultOrError));
  }

  /**
   * @deprecated Demo purpose only!
   */
  demoDownloadSchema(iri: string): Observable<string> {
    return this.http
      .get(iri, { headers: { 'content-type': 'text/turtle' } })
      .pipe(map(mapToResultOrError));
  }

  /**
   * Get a type package
   * @param id - Id of the type.
   */
  getTypePackage(id: string): Observable<SolidTypePackage> {
    return this.http
      .get<SolidTypePackage>(url(`packages/${id}`), { json: true })
      .pipe(map(mapToResultOrError));
  }

  /**
   * Dowload the SHACL of a type package
   */
  getTypePackageShacl(id: string): Observable<string> {
    console.log('downloading from api:', url(`packages/${id}/download)`));
    return this.http
      .get(url(`packages/${id}/download`), {
        headers: { 'content-type': 'text/turtle' }
      })
      .pipe(map(mapToResultOrError));
  }
}

const mapToResultOrError = (result: RxHttpRequestResponse, index: number) => {
  if (result.response.statusCode === 200) {
    return result.body;
  } else {
    throw Error(
      `${result.response.statusCode} ${result.response.statusMessage}`
    );
  }
};

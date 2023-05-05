import { RxHR, RxHttpRequestResponse } from '@akanass/rx-http-request';
import { Observable, OperatorFunction, throwError } from 'rxjs';
import { map } from 'rxjs/operators/index.js';
import { autoInjectable, injectable, isValueProvider } from 'tsyringe';
import { DEMO_POD_SCHEMAS_URI } from '../constants.js';
import { Page, PageArgs, SolidType } from '../types.js';

const API_ROOT = '/api';
const apiHost = 'http://127.0.0.1:8080';

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
  searchType(query: string): Observable<SolidType[]> {
    return this.http
      .post<SolidType[]>(url('type-search'), {
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

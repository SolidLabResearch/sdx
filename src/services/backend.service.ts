import { RxHR, RxHttpRequestResponse } from "@akanass/rx-http-request";
import { Observable, OperatorFunction, throwError } from "rxjs";
import { map } from "rxjs/operators/index.js";
import { autoInjectable, injectable, isValueProvider } from "tsyringe";
import { Page, PageArgs, SolidType } from "../types.js";

const API_ROOT = '/api';
const apiHost = 'http://127.0.0.1:8080'

/**
 * Creates a URL with the {@link API_ROOT}, path, and args appended as querystring.
 * @param path - Path of the api
 * @param args - QueryArgs to append
 * @returns 
 */
function url(path: string, args: PageArgs = {}): string {
    const query = Object.entries(args).map((entry) => encodeURIComponent(entry[0]) + '=' + encodeURIComponent(entry[1])).join('&');
    const url = `${apiHost}${API_ROOT}/${path}`;
    return query.length === 0 ? url : `${url}?${query}`;
}

@autoInjectable()
export class BackendService {
    private http = RxHR;

    constructor() { }

    /**
     * List all types.
     */
    listTypes(args?: PageArgs): Observable<Page<SolidType>> {
        return this.http.get<Page<SolidType>>(url('types', args))
            .pipe(map(mapToResultOrError));
    }

    /**
    * Search for a type.
    * 
    * @param query - Term to search for
    */
    searchType(query: string): Observable<SolidType[]> {
        return this.http.post<SolidType[]>(url('type-search'), { body: { keyword: query }, json: true })
            .pipe(map(mapToResultOrError));
    }

}

const mapToResultOrError = (result: RxHttpRequestResponse, index: number) => {
    if (result.response.statusCode === 200) {
        return result.body;
    } else {
        throw Error(`${result.response.statusCode}: ${result.response.statusMessage}`);
    }

}

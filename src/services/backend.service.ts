import { RxHR } from "@akanass/rx-http-request";
import { Observable } from "rxjs";
import { map } from "rxjs/operators/index.js";
import { autoInjectable, injectable } from "tsyringe";
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

    constructor() {}

    listTypes(args?: PageArgs): Observable<Page<SolidType>> {
        return RxHR.get<Page<SolidType>>(url('types', args)).pipe(map(res => res.body));
    }

}

import { autoInjectable } from "tsyringe";
import { Page, PageArgs } from "../types.js";
import { BackendService } from "./backend.service.js";
import { Observable, EMPTY, of } from 'rxjs';
import { map, expand, concatMap, toArray } from 'rxjs/operators/index.js';

@autoInjectable()
export class FlowService {

    constructor(private backend?: BackendService) { }

    from<T>(fn: (args?: PageArgs) => Observable<Page<T>>): Flow<T> {
        const boundFn = fn.bind(this.backend);

        return {
            toOneArray: (args: Omit<PageArgs, 'cursor'> = {}): Observable<T[]> => {
                return readAll(boundFn, args);
            },

            stream: (args: Omit<PageArgs, 'cursor'> = {}): Observable<T[]> => {
                return streamPerPage(boundFn, args);
            }
        }
    }

}

interface Flow<T> {
    /**
     * Follow all pages and collect as one big array of type T.
     * @param args 
     */
    toOneArray(args?: Omit<PageArgs, 'cursor'>): Observable<T[]>;

    /**
     * Stream each pages items T array.
     * @param args 
     */
    stream(args?: Omit<PageArgs, 'cursor'>): Observable<T[]>;
}

function readAll<T>(fn: (args?: PageArgs) => Observable<Page<T>>, args: PageArgs = {}): Observable<T[]> {
    return fn(args).pipe(
        expand(page => page.cursor ? fn({ ...args, cursor: page.cursor }) : EMPTY),
        concatMap(page => of(...page?.items ?? [])),
        toArray()
    );
}

function streamPerPage<T>(fn: (args?: PageArgs) => Observable<Page<T>>, args: PageArgs = {}): Observable<T[]> {
    return fn(args).pipe(
        expand(page => page.cursor ? fn({ ...args, cursor: page.cursor }) : EMPTY),
        map(page => page?.items ?? [])
    );
}

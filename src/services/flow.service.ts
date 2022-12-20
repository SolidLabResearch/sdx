import { autoInjectable } from "tsyringe";
import { FilterArgs, Page, PageArgs } from "../types.js";
import { BackendService } from "./backend.service.js";
import { Observable, EMPTY, of } from 'rxjs';
import { map, expand, concatMap, toArray } from 'rxjs/operators/index.js';

@autoInjectable()
export class FlowService {
    private filterArgs: FilterArgs = {};

    constructor(private backend?: BackendService) { }

    from<T>(fn: (pageArgs?: PageArgs) => Observable<Page<T>>, filterArgs?: FilterArgs): Flow<T> {
        this.filterArgs = filterArgs || {};
        const boundFn = fn.bind(this.backend);
    
        return {
          toOneArray: (): Observable<T[]> => {
            return readAll(boundFn, this.filterArgs);
          },
    
          stream: (): Observable<T[]> => {
            return streamPerPage(boundFn, this.filterArgs);
          }
        }
      }

}

interface Flow<T> {
    /**
     * Follow all pages and collect as one big array of type T.
     */
    toOneArray(): Observable<T[]>;
  
    /**
     * Stream each pages items T array.
     */
    stream(): Observable<T[]>;
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

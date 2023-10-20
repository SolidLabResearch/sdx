import axios, { AxiosResponse } from 'axios';
import chalk from 'chalk';
import { autoInjectable } from 'tsyringe';
import {
  Page,
  PageArgs,
  SearchShapeOutput,
  Shape,
  ShapePackage
} from '../types.js';
import { SOLID_WARN } from '../util.js';
import { ConfigService } from './config.service.js';

const API_ROOT = '/api';

/**
 * Creates a URL with the {@link API_ROOT}, path, and args appended as querystring.
 * @param path - Path of the api
 * @param args - QueryArgs to append
 * @returns
 */
function url(path: string, args: PageArgs = {}): string {
  const { catalogs } = config.getSdxConfigSync();
  if (catalogs.length > 1) {
    console.log(
      chalk.hex(SOLID_WARN)(
        `Multiple catalogs found! This is not yet supported: using the first one (${catalogs[0]?.name})!`
      )
    );
  }
  const apiHost = catalogs[0]?.uri ?? 'https://catalog.solidlab.be';
  const query = Object.entries(args)
    .map(
      (entry) =>
        encodeURIComponent(entry[0]) + '=' + encodeURIComponent(entry[1])
    )
    .join('&');
  const url = `${apiHost}${API_ROOT}/${path}`;
  return query.length === 0 ? url : `${url}?${query}`;
}

const config = new ConfigService();

@autoInjectable()
export class BackendService {
  private http = axios;

  /**
   * Search for a type.
   *
   * @param query - Term to search for
   */
  async searchPackage(query: string): Promise<ShapePackage[]> {
    return safe(
      this.http.post<ShapePackage[]>(url('search/package'), {
        keyword: query
      })
    );
  }

  /**
   * List all shapes.
   */
  async listShapes(args?: PageArgs): Promise<Page<Shape>> {
    return safe(this.http.get<Page<Shape>>(url('shapes', args)));
  }

  /**
   * Search for a shape.
   *
   * @param query - Term to search for
   */
  async searchShape(query: string): Promise<SearchShapeOutput[]> {
    return safe(
      this.http.post<SearchShapeOutput[]>(url('search/shape'), {
        keyword: query
      })
    );
  }

  /**
   * Get a type
   * @param id - Id of the type.
   */
  async getShape(id: string): Promise<Shape> {
    return safe(this.http.get<Shape>(url(`shapes/${id}`)));
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
  async getShapePackage(id: string): Promise<ShapePackage> {
    return safe(this.http.get<ShapePackage>(url(`packages/${id}`)));
  }

  /**
   * Dowload the SHACL of a type package
   */
  async getShapePackageShacl(id: string): Promise<string> {
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

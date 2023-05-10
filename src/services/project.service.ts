import chalk from 'chalk';
import { createHash } from 'crypto';
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync
} from 'fs';
import { forkJoin } from 'rxjs';
import { autoInjectable, singleton } from 'tsyringe';
import {
  DEMO_POD_SCHEMAS_URI,
  PATH_SDX_GENERATE_SHACL_FOLDER,
  PATH_SOLID_MANIFEST
} from '../constants.js';
import { InitOptions, SolidManifest, SolidType } from '../types.js';
import { noResults, SOLID_PURPLE } from '../util.js';
import { BackendService } from './backend.service.js';
import { CacheService } from './cache.service.js';
import { SearchService } from './search.service.js';
import { ProjectBuilder } from '../project-builder.js';

// const require = createRequire(import.meta.url);
@autoInjectable()
@singleton()
export class ProjectService {
  constructor(
    private backend?: BackendService,
    private search?: SearchService,
    private cache?: CacheService
  ) {}

  async initProject(options: InitOptions): Promise<void> {
    new ProjectBuilder().initProject(options);
  }

  listTypes(): any {
    const manifest: SolidManifest = JSON.parse(
      readFileSync(PATH_SOLID_MANIFEST).toString()
    );
    const results = Object.values(manifest.types).map(({ name, id }) => ({
      name,
      id
    }));
    if (results.length === 0) {
      noResults();
      return;
    }
    this.cache?.storeListToCache<Partial<SolidType>>(results);
    console.table(results);
  }

  installType(iriOrIdx: string): void {
    let iri = iriOrIdx;
    const idx = parseInt(iriOrIdx);
    if (!isNaN(idx)) {
      iri = this.cache!.readListFromCache<SolidType>()[idx].id!;
    }
    if (!iri) {
      console.error('A type with that index cannot be found!');
    }

    console.log(chalk.hex(SOLID_PURPLE)(`Installing type ${iri}`));

    const id = encodeURIComponent(iri);
    forkJoin([
      this.backend!.getType(id),
      this.backend!.getTypeScheme(id)
    ]).subscribe(([type, scheme]) => {
      this.saveSolidTypeToManifest(type);
      this.storeSchemeToDisk(iri, scheme);
    });
  }

  unInstallType(iriOrIdx: string): void {
    let iri = iriOrIdx;
    const idx = parseInt(iriOrIdx);
    if (!isNaN(idx)) {
      iri = this.cache!.readListFromCache<SolidType>()[idx].id!;
    }
    if (!iri) {
      console.error('A type with that index cannot be found!');
    }

    console.log(chalk.hex(SOLID_PURPLE)(`Uninstalling type ${iri}`));

    this.removeSchemeFromDisk(iri);
    this.removeSolidTypeToManifest(iri);
  }

  /**
   *
   * @deprecated For demo purpose only
   */
  async demoInstallSchema(schemaName: string): Promise<void> {
    const iri = `${DEMO_POD_SCHEMAS_URI}/${schemaName}.ttl`;
    try {
      const schema = await this.backend!.demoDownloadSchema(iri).toPromise();
      console.log(chalk.hex(SOLID_PURPLE)(`Installing schema ${iri}`));
      this.storeSchemeToDisk(iri, schema);
    } catch (err: any) {
      console.log(chalk.redBright(`Could not install schema (${err})`));
    }
  }

  /**
   *
   * @deprecated For demo purpose only
   */
  async demoRemoveSchema(schemaName: string): Promise<void> {
    const iri = `${DEMO_POD_SCHEMAS_URI}/${schemaName}.ttl`;
    console.log(chalk.hex(SOLID_PURPLE)(`Uninstalling schema ${iri}`));
    this.removeSchemeFromDisk(iri);
  }

  private removeSchemeFromDisk(id: string) {
    if (!existsSync(PATH_SDX_GENERATE_SHACL_FOLDER)) {
      return;
    }

    const needle = this.hash(id);
    for (const file of readdirSync(PATH_SDX_GENERATE_SHACL_FOLDER)) {
      if (file === needle) {
        const filePath = PATH_SDX_GENERATE_SHACL_FOLDER + '/' + file;
        rmSync(filePath);
        return;
      }
    }
    this.generateIndex();
  }

  private storeSchemeToDisk(id: string, scheme: string) {
    if (!existsSync(PATH_SDX_GENERATE_SHACL_FOLDER)) {
      mkdirSync(PATH_SDX_GENERATE_SHACL_FOLDER, { recursive: true });
    }
    const filePath = PATH_SDX_GENERATE_SHACL_FOLDER + '/' + this.hash(id);
    writeFileSync(filePath, scheme);
    this.generateIndex();
  }

  private hash(msg: string): string {
    const sha = createHash('sha1');
    sha.update(msg);
    return sha.digest('hex');
  }

  private saveSolidTypeToManifest(type: SolidType): void {
    const manifest: SolidManifest = JSON.parse(
      readFileSync(PATH_SOLID_MANIFEST).toString()
    );
    const idx = manifest.types.findIndex((tt) => tt.id === type.id);
    if (idx > -1) {
      manifest.types[idx] = type;
    } else {
      manifest.types.push(type);
    }
    writeFileSync(PATH_SOLID_MANIFEST, JSON.stringify(manifest, null, 4), {
      flag: 'w'
    });
  }

  private removeSolidTypeToManifest(typeId: string): void {
    const manifest: SolidManifest = JSON.parse(
      readFileSync(PATH_SOLID_MANIFEST).toString()
    );
    const idx = manifest.types.findIndex((tt) => tt.id === typeId);
    if (idx > -1) {
      manifest.types.splice(idx, 1);
      writeFileSync(PATH_SOLID_MANIFEST, JSON.stringify(manifest, null, 4), {
        flag: 'w'
      });
    }
  }

  private generateIndex() {
    const fileNames = readdirSync(PATH_SDX_GENERATE_SHACL_FOLDER);
    const content = {
      entries: fileNames.filter((name) => name !== 'index.json')
    };
    console.log(content);
    writeFileSync(
      `${PATH_SDX_GENERATE_SHACL_FOLDER}/index.json`,
      JSON.stringify(content, null, 4),
      { flag: 'w' }
    );
  }
}

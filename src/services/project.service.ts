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
import { autoInjectable, singleton } from 'tsyringe';
import {
  PATH_SDX_GENERATE_SHACL_FOLDER,
  PATH_SOLID_MANIFEST
} from '../constants.js';
import { ProjectBuilder } from '../project-builder.js';
import { InitOptions, ShapePackage, SolidManifest } from '../types.js';
import { noResults, SOLID_PURPLE } from '../util.js';
import { BackendService } from './backend.service.js';
import { CacheService } from './cache.service.js';
import { GeneratorService } from './generator.service.js';

// const require = createRequire(import.meta.url);
@autoInjectable()
@singleton()
export class ProjectService {
  constructor(
    private backend?: BackendService,
    private cache?: CacheService,
    private generator?: GeneratorService
  ) {}

  /**
   * Initialise a new project.
   * This sets up all necessary files and directories, including the package.json if it is not present.
   * @param options
   */
  async initProject(
    name: string | undefined,
    options: InitOptions
  ): Promise<void> {
    new ProjectBuilder().initProject(name, options);
  }

  listShapePackages(): any {
    const manifest: SolidManifest = JSON.parse(
      readFileSync(PATH_SOLID_MANIFEST).toString()
    );
    const results = Object.values(manifest.shapePackages).map(
      ({ name, id }) => ({
        name,
        id
      })
    );
    if (results.length === 0) {
      noResults();
      return;
    }
    this.cache?.storeListToCache<Partial<ShapePackage>>(results);
    console.table(results);
  }

  async installShapePackage(iriOrIdx: string): Promise<void> {
    let iri = iriOrIdx;
    const idx = parseInt(iriOrIdx);
    if (!isNaN(idx)) {
      iri = this.cache!.readListFromCache<ShapePackage>()[idx].id!;
    }
    if (!iri) {
      console.error('A shape package with that index cannot be found!');
    }

    console.log(chalk.hex(SOLID_PURPLE)(`Installing shape package ${iri}`));

    const id = encodeURIComponent(iri);
    const [shapePackage, scheme] = await Promise.all([
      this.backend!.getShapePackage(id),
      this.backend!.getShapePackageShacl(id)
    ]);

    this.saveShapeToManifest(shapePackage);
    this.storeSchemeToDisk(iri, scheme);
    this.generator!.notify({ shaclChanged: true });
  }

  unInstallShapePackage(iriOrIdx: string): void {
    let iri = iriOrIdx;
    const idx = parseInt(iriOrIdx);
    if (!isNaN(idx)) {
      iri = this.cache!.readListFromCache<ShapePackage>()[idx].id!;
    }
    if (!iri) {
      console.error('A type with that index cannot be found!');
    }

    console.log(chalk.hex(SOLID_PURPLE)(`Uninstalling type package ${iri}`));

    this.removeSchemeFromDisk(iri);
    this.removeSolidTypeToManifest(iri);
    this.generator!.notify({ shaclChanged: true });
  }

  // /**
  //  *
  //  * @deprecated For demo purpose only
  //  */
  // async demoInstallSchema(schemaName: string): Promise<void> {
  //   const iri = `${DEMO_POD_SCHEMAS_URI}/${schemaName}.ttl`;
  //   try {
  //     const schema = await this.backend!.demoDownloadSchema(iri);
  //     console.log(chalk.hex(SOLID_PURPLE)(`Installing schema ${iri}`));
  //     this.storeSchemeToDisk(iri, schema);
  //   } catch (err: any) {
  //     console.log(chalk.redBright(`Could not install schema (${err})`));
  //   }
  // }

  // /**
  //  *
  //  * @deprecated For demo purpose only
  //  */
  // async demoRemoveSchema(schemaName: string): Promise<void> {
  //   const iri = `${DEMO_POD_SCHEMAS_URI}/${schemaName}.ttl`;
  //   console.log(chalk.hex(SOLID_PURPLE)(`Uninstalling schema ${iri}`));
  //   this.removeSchemeFromDisk(iri);
  // }

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
    // this.generateIndex();
  }

  private storeSchemeToDisk(id: string, scheme: string) {
    if (!existsSync(PATH_SDX_GENERATE_SHACL_FOLDER)) {
      mkdirSync(PATH_SDX_GENERATE_SHACL_FOLDER, { recursive: true });
    }
    const filePath = PATH_SDX_GENERATE_SHACL_FOLDER + '/' + this.hash(id);
    writeFileSync(filePath, scheme);
    // this.generateIndex();
  }

  private hash(msg: string): string {
    const sha = createHash('sha1');
    sha.update(msg);
    return sha.digest('hex');
  }

  private saveShapeToManifest(shapePackage: ShapePackage): void {
    const manifest: SolidManifest = JSON.parse(
      readFileSync(PATH_SOLID_MANIFEST).toString()
    );
    const idx = manifest.shapePackages.findIndex(
      (tt) => tt.id === shapePackage.id
    );
    if (idx > -1) {
      manifest.shapePackages[idx] = shapePackage;
    } else {
      manifest.shapePackages.push(shapePackage);
    }
    writeFileSync(PATH_SOLID_MANIFEST, JSON.stringify(manifest, null, 4), {
      flag: 'w'
    });
  }

  private removeSolidTypeToManifest(id: string): void {
    const manifest: SolidManifest = JSON.parse(
      readFileSync(PATH_SOLID_MANIFEST).toString()
    );
    const idx = manifest.shapePackages.findIndex((tt) => tt.id === id);
    if (idx > -1) {
      manifest.shapePackages.splice(idx, 1);
      writeFileSync(PATH_SOLID_MANIFEST, JSON.stringify(manifest, null, 4), {
        flag: 'w'
      });
    }
  }
}

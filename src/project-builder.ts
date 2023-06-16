import chalk from 'chalk';
import { execSync } from 'child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import prompts, { PromptObject } from 'prompts';
import {
  PATH_PACKAGE_JSON,
  PATH_SDX_CONFIG,
  PATH_SOLID_MANIFEST
} from './constants.js';
import { DEFAULT_SDX_CONFIG, DEFAULT_SOLID_MANIFEST } from './templates.js';
import { InitOptions } from './types.js';
import { SOLID_PURPLE, SOLID_WARN } from './util.js';
import { cwd } from 'process';
import path from 'path';

export class ProjectBuilder {
  /**
   * Interactively initialize a new project.
   * @param name Name of the project (creates folder with that name in current directory)
   * @param options Options
   */
  async initProject(
    name: string | undefined,
    options: InitOptions
  ): Promise<void> {
    // Gather inputs
    const skipPackageJson = this.packageJsonExists(name) && !options.force;

    this.logPurple('Initializing workspace, first some questions ...');

    if (skipPackageJson) {
      this.logWarning(
        'Existing package.json found: workspace initialisation aborted! (override with --force)'
      );
      return;
    }

    const inputs = await this.promptInput(skipPackageJson, name);

    // Create directory if not exists and set
    if (name) {
      if (!existsSync(name)) {
        mkdirSync(name);
      }
    }

    // .solidmanifestc
    this.initSolidManifest(inputs, name);

    // .sdxconfig
    this.initSdxConfig(name);

    // If no package.json, then create one
    this.initPackageJson(skipPackageJson, inputs, name);

    // Install libraries
    if (!options.noLibs) {
      this.installLibraries(name);
    }

    this.logPurple('Successfully set up workspace!');
    chalk.reset();
  }

  private async promptInput(skipPackageJson: boolean, name?: string) {
    const nameIsDot = name === '.' || name === './' || name === '.\\';
    const dirName = cwd().substring(cwd().lastIndexOf(path.sep) + 1);
    const questions: PromptObject<string>[] =
      name && !nameIsDot
        ? []
        : [
            {
              type: 'text',
              name: 'projectName',
              message: 'What is the name of your project?',
              initial: nameIsDot ? dirName : 'my-solid-app'
            }
          ];

    if (!skipPackageJson) {
      questions.push(
        {
          type: 'text',
          name: 'description',
          message: 'How would you describe your project in one line?'
        },
        {
          type: 'text',
          name: 'author',
          message: 'Who is the author of this project?'
        },
        {
          type: 'text',
          name: 'license',
          message: 'Which license do you want to use?',
          initial: 'ISC'
        }
      );
    }

    return prompts(questions);
  }

  private initSdxConfig(folder?: string) {
    this.logPurple('Writing .sdxconfig ...');
    const path = folder ? `${folder}/${PATH_SDX_CONFIG}` : PATH_SDX_CONFIG;
    try {
      writeFileSync(path, JSON.stringify(DEFAULT_SDX_CONFIG, null, 4));
    } catch {
      throw new Error(`Error while writing ${path} to the filesystem.`);
    }
  }

  private initSolidManifest(inputs: any, folder?: string) {
    this.logPurple('Writing .solidmanifest ...');
    const path = folder
      ? `${folder}/${PATH_SOLID_MANIFEST}`
      : PATH_SOLID_MANIFEST;
    try {
      const manifest = DEFAULT_SOLID_MANIFEST;
      manifest.name = inputs.projectName;
      manifest.author = inputs.author;
      manifest.license = inputs.license;
      writeFileSync(path, JSON.stringify(manifest, null, 4));
    } catch {
      throw new Error(`Error while writing ${path} to the filesystem.`);
    }
  }

  private initPackageJson(
    skipPackageJson: boolean,
    inputs: any,
    folder?: string
  ) {
    const path = folder ? `${folder}/${PATH_PACKAGE_JSON}` : PATH_PACKAGE_JSON;
    try {
      this.logPurple('Writing package.json ...');
      execSync(folder ? `cd ${folder} && npm init -y` : 'npm init -y');
      const packageJson = JSON.parse(readFileSync(path).toString());
      packageJson['name'] = inputs.projectName;
      packageJson['description'] = inputs.description;
      packageJson['author'] = inputs.author;
      packageJson['license'] = inputs.license;
      packageJson['types'] = 'sdx-types/index.d.ts';
      writeFileSync(path, JSON.stringify(packageJson, null, 4), {
        flag: 'w'
      });
    } catch {
      throw new Error(`Error while writing ${path} to the filesystem.`);
    }
  }

  private packageJsonExists(folder?: string): boolean {
    const path = folder ? `${folder}/${PATH_PACKAGE_JSON}` : PATH_PACKAGE_JSON;
    try {
      readFileSync(path);
      return true;
    } catch {
      return false;
    }
  }

  private installLibraries(folder?: string) {
    if (folder) {
      execSync(`cd ${folder}`);
    }
    try {
      this.logPurple('Installing @solidlab/sdx (local CLI tool)...');
      execSync(
        folder
          ? `cd ${folder} && npm i -D @solidlab/sdx`
          : 'npm i -D @solidlab/sdx'
      );
    } catch {
      throw new Error(`Error while installing @solidlab/sdx!`);
    }
    try {
      this.logPurple('Installing @solidlab/sdx-sdk (SDK library)...');
      execSync(
        folder
          ? `cd ${folder} && npm i -S @solidlab/sdx-sdk`
          : 'npm i -S @solidlab/sdx-sdk'
      );
    } catch {
      throw new Error(`Error while installing @solidlab/sdx-sdk!`);
    }
  }

  private logPurple(text: string): void {
    console.log(chalk.hex(SOLID_PURPLE)(text));
  }

  private logWarning(text: string): void {
    console.log(chalk.hex(SOLID_WARN)(text));
  }
}

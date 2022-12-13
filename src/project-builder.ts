import chalk from "chalk";
import { execSync } from "child_process";
import { mkdirSync, readFileSync, writeFileSync } from "fs";
import prompts, { PromptObject } from 'prompts';
import { DEFAULT_SDX_CONFIG, DEFAULT_SOLID_MANIFEST } from "./templates.js";
import { InitOptions } from "./types.js";
import { SOLID_PURPLE } from "./util.js";

const PATH_SDX_CONFIG = '.sdxconfig';
const PATH_SOLID_MANIFEST = '.solidmanifest';
const PATH_SDX_TYPES_FOLDER = 'sdx-types';
const PATH_PACKAGE_JSON = 'package.json';

export class ProjectBuilder {


    async initProject(options: InitOptions) {
        console.log(options);
        // Gather inputs
        this.logPurple('Initializing workspace, first some questions ...');
        const skipPackageJson = this.packageJsonExists() && !options.force;
        const inputs = await this.promptInput(skipPackageJson);

        // .solidmanifest
        this.logPurple('Writing .solidmanifest ...');
        this.initSolidManifest(inputs);

        // .sdxconfig
        this.logPurple('Writing .sdxconfig ...');
        this.initSdxConfig();

        // Create types folder
        this.logPurple('Creating sdx-types folder ...');
        this.initSdxTypesFolder();

        // If no package.json, then create one
        this.initPackageJson(skipPackageJson, inputs);

        this.logPurple('Successfully set up workspace!');
        chalk.reset();

    }

    private async promptInput(skipPackageJson: boolean) {
        const questions: PromptObject<string>[] = [{
            type: 'text',
            name: 'projectName',
            message: 'What is the name of your project?',
            initial: 'my-solid-app'
        }];

        if (!skipPackageJson) {
            questions.push(
                {
                    type: 'text',
                    name: 'description',
                    message: 'How would you describe your project in one line?',
                },
                {
                    type: 'text',
                    name: 'author',
                    message: 'Who is the author of this project?',
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

    private initSdxConfig() {
        try {
            writeFileSync(PATH_SDX_CONFIG, JSON.stringify(DEFAULT_SDX_CONFIG, null, 4));
        } catch {
            throw new Error(`Error while writing ${PATH_SDX_CONFIG} to the filesystem.`)
        }
    }

    private initSolidManifest(inputs: any) {
        try {
            const manifest = DEFAULT_SOLID_MANIFEST;
            manifest.name = inputs.projectName;
            manifest.author = inputs.author;
            manifest.license = inputs.license;
            writeFileSync(PATH_SOLID_MANIFEST, JSON.stringify(manifest, null, 4));
        } catch {
            throw new Error(`Error while writing ${PATH_SDX_CONFIG} to the filesystem.`)
        }
    }

    private initSdxTypesFolder() {
        try {
            mkdirSync(PATH_SDX_TYPES_FOLDER);
        } catch { };
    }

    private initPackageJson(skipPackageJson: boolean, inputs: any) {
        if (skipPackageJson) {
            console.log(chalk.hex('#ff781f')('Existing package.json found, I am not touching it! (or use --force)'))
            return;
        }

        try {
            this.logPurple('Writing package.json ...');
            execSync('npm init -y');
            const packageJson = JSON.parse(readFileSync(PATH_PACKAGE_JSON).toString());
            packageJson['name'] = inputs.projectName;
            packageJson['description'] = inputs.description;
            packageJson['author'] = inputs.author;
            packageJson['license'] = inputs.license;
            packageJson['types'] = 'sdx-types/index.d.ts';
            writeFileSync(PATH_PACKAGE_JSON, JSON.stringify(packageJson, null, 4), { flag: 'w' });
        } catch {
            throw new Error(`Error while writing ${PATH_PACKAGE_JSON} to the filesystem.`)
        }

    }

    private packageJsonExists(): boolean {
        try {
            const packageJson = readFileSync(PATH_PACKAGE_JSON);
            return true;
        } catch {
            return false;
        }
    }

    private logPurple(text: string): void {
        console.log(chalk.hex(SOLID_PURPLE)(text));
    }
}

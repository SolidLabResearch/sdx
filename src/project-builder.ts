import chalk from "chalk";
import { mkdirSync, readFileSync, writeFileSync } from "fs";
import { DEFAULT_SDX_CONFIG, DEFAULT_SOLID_MANIFEST } from "./templates.js";
import { SOLID_PURPLE } from "./util.js";
import prompts, { PromptObject } from 'prompts';
import { execSync } from "child_process";
import { ProgramOptions } from "./types.js";

const PATH_SDX_CONFIG = '.sdxconfig';
const PATH_SOLID_MANIFEST = '.solidmanifest';
const PATH_SDX_TYPES_FOLDER = 'sdx-types';
const PATH_PACKAGE_JSON = 'package.json';

export class ProjectBuilder {


    async initProject(options: ProgramOptions) {
        console.log(options);
        // Gather inputs
        this.logPurple('Initializing workspace, first some questions ...');
        const skipPackageJson = this.packageJsonExists() && !options.force;
        const inputs = await this.promptInput(skipPackageJson);

        // .solidmanifest
        this.logPurple('Writing .solidmanifest ...');
        this.initSolidManifest(inputs.projectName);

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
        const questions = [{
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
                } as any,
                {
                    type: 'text',
                    name: 'author',
                    message: 'Who is the author of this project?',
                } as any
            );
        }

        return prompts(questions as any);
    }

    private initSdxConfig() {
        try {
            writeFileSync(PATH_SDX_CONFIG, JSON.stringify(DEFAULT_SDX_CONFIG, null, 4));
        } catch {
            throw new Error(`Error while writing ${PATH_SDX_CONFIG} to the filesystem.`)
        }
    }

    private initSolidManifest(projectName: string) {
        try {
            const manifest = DEFAULT_SOLID_MANIFEST;
            manifest.name = projectName;
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
            console.log(chalk.hex('#ff781f')('Existing package.json found, I am not touching it!'))
            return;
        }

        try {
            this.logPurple('Writing package.json ...');
            execSync('npm init -y');
            const packageJson = JSON.parse(readFileSync(PATH_PACKAGE_JSON).toString());
            packageJson['name'] = inputs.projectName;
            packageJson['description'] = inputs.description;
            packageJson['author'] = inputs.author;
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

import { readFileSync } from "fs";
import { PATH_SDX_CONFIG, PATH_SOLID_MANIFEST } from "./constants.js";
import { SdxConfig, SdxRepository, SolidManifest } from "./types.js";

export class Searcher {
    private repositories: SdxRepository[];

    constructor() {
        const sdxConfig: SdxConfig = JSON.parse(readFileSync(PATH_SDX_CONFIG).toString());
        this.repositories = sdxConfig.repositories;
    }

    search(type: string) {

    }
}

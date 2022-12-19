import { readFileSync } from "fs";
import { autoInjectable, singleton } from "tsyringe";
import { PATH_SDX_CONFIG } from "../constants.js";
import { BackendService } from "./backend.service.js";
import { FlowService } from "./flow.service.js";
import { SdxConfig, SdxRepository } from "../types.js";

@autoInjectable()
@singleton()
export class SearchService {
    private repositories: SdxRepository[];

    constructor(private backend?: BackendService, private flow?: FlowService) {
        const sdxConfig: SdxConfig = JSON.parse(readFileSync(PATH_SDX_CONFIG).toString());
        this.repositories = sdxConfig.repositories;
    }

    search(type: string): void {
        this.flow!.from(this.backend!.listTypes).toOneArray().subscribe(res => console.log(res));
        this.backend!.searchType(type).subscribe(res => console.log(res), err => {});
    }
}

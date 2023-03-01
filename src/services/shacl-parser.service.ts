import { autoInjectable, singleton } from "tsyringe";
import millan from 'millan';
import { readFile } from "fs/promises";
import { PathLike } from "fs";
import { IToken } from "millan/dist/types/helpers/chevrotain/types.js";
// import { ShaclParser } from "millan/dist/types/shacl/ShaclParser.js";

const { ShaclParser } = millan;


@singleton()
@autoInjectable()
export class ShaclParserService {
    private parser: millan.ShaclParser;

    constructor() {
        this.parser = new ShaclParser();
    }

    async parseShacl(path: PathLike): Promise<void> {
        const str = await readFile(path);
        const tokens = this.parser.tokenize(str.toString());
        this.convertToGraphQL(tokens);
    }

    convertToGraphQL(tokens: IToken[]) {
        tokens.forEach(token => {
            console.log(token.image, token.tokenType?.tokenName, token.tokenType?.isParent ? 'parent' : '-');
        })
    }

}

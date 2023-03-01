export class SdxClient {

    async query<T>(query: string): Promise<T> {
        throw new Error("Method not implemented.");
    }

    async mutation(mutation: string): Promise<void> {
        throw new Error("Method not implemented.");
    }
    
}

export abstract class Inflector {
  public errors: string[] = [];

  abstract getInflections(phrase: string, options: any): Promise<string[]>;
}

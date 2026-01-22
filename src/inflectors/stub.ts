import {Inflector} from './base';

export class StubInflector extends Inflector {
  async getInflections(phrase: string, _options: any): Promise<string[]> {
    switch (phrase) {
      case "Василий Афанасьевич Пупкин":
        return ['Василия Афанасьевича Пупкина', 'Василию Афанасьевичу Пупкину'];
      case "Вася":
        return ['Васи', 'Васе'];
      case "стол":
        return ['стола', 'столу'];
      default:
        return ['кого-то', 'кому-то'];
    }
  }
}

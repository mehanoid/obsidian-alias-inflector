export abstract class Inflector {
	public errors: string[] = [];
	abstract getInflections(phrase: string, options: any): Promise<string[]>;
}

export class MorpherInflector extends Inflector {
	async getInflections(phrase: string, {includePlural}: any) {
		const responseJson = await this.httpGetMorpher(phrase);
		if (responseJson["message"]) {
			this.errors.push(`Could not get inflections for "${phrase}": ${responseJson["message"]}`);
			return []
		}
		const inflectionsData = [
			responseJson,
			(includePlural ? responseJson["множественное"] : null),
		]

		const inflections =
			inflectionsData
				.filter(v => !!v)
				.map(json => this.extractStringValues(json))
				.flat()
		return [...new Set(inflections)];
	}

	private async httpGetMorpher(noteName: string) {
		const encodedNoteName = encodeURIComponent(noteName);
		const url = `https://ws3.morpher.ru/russian/declension?format=json&s=${encodedNoteName}`;

		const response = await this.fetchWithTimeout(url);
		return await response.json();
	}

	private async fetchWithTimeout(resource: string, options = { timeout: 15000 }) {
		const controller = new AbortController();
		const id = setTimeout(() => controller.abort(), options.timeout);

		const response = await fetch(resource, {
			signal: controller.signal
		});
		clearTimeout(id);

		return response;
	}

	private extractStringValues(json: any): string[] {
		if (!json) return [];
		return Object.values(json).filter(value => typeof value === 'string') as string[];
	}
}

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

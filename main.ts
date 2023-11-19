// const fm = require('front-matter');
// import fm from 'front-matter';
import {
	App,
	Modal,
	Notice,
	parseFrontMatterAliases,
	parseYaml,
	Plugin,
	PluginSettingTab,
	Setting,
	stringifyYaml,
	TFile
} from 'obsidian';

// Remember to rename these classes and interfaces!

interface MyPluginSettings {
	mySetting: string;
}

const DEFAULT_SETTINGS: MyPluginSettings = {
	mySetting: 'default'
}

export default class MyPlugin extends Plugin {
	settings: MyPluginSettings;
	frontMatterRegex = /^---+\n(?<frontmatter>(?:.|\n)*)---+/um;

	async onload() {
		await this.loadSettings();

		this.addCommand({
			id: 'add-aliases-with-inflections',
			name: 'Add aliases with inflections',
			editorCallback: async (editor, view) => {
				const file = view.file;
				if (!file) {
					return;
				}

				const modal = new AddAliasesModal(this.app);
				modal.open();

				const {includePlural} = await modal.results;

				// Execute your command
				const noteName = file.basename; // Get the name of the current note

				try {
					const fileContent = await this.app.vault.read(file);
					const frontMatterData = this.parseFrontMatter(fileContent);

					// Updating aliases in frontMatterData
					frontMatterData.aliases = await this.getUpdatedAliases(noteName, frontMatterData, {includePlural});
					// frontMatterData.inflected = true;

					const wasUpdated = await this.saveFrontMatter(file, fileContent, frontMatterData);

					// Trigger the necessary workspace actions
					await this.app.workspace.trigger('file-menu:sync-vault');

					if (wasUpdated) {
						new Notice('Aliases updated');
					} else {
						new Notice('Aliases are already inflected');
					}
				} catch (error) {
					console.error('Error fetching inflections:', error);
					new Notice('Error fetching inflections');
				}
			},
		});

		// This adds a settings tab so the user can configure various aspects of the plugin
		this.addSettingTab(new SampleSettingTab(this.app, this));

		// // If the plugin hooks up any global DOM events (on parts of the app that doesn't belong to this plugin)
		// // Using this function will automatically remove the event listener when this plugin is disabled.
		// this.registerDomEvent(document, 'click', (evt: MouseEvent) => {
		// 	console.log('click', evt);
		// });
		//
		// // When registering intervals, this function will automatically clear the interval when the plugin is disabled.
		// this.registerInterval(window.setInterval(() => console.log('setInterval'), 5 * 60 * 1000));
	}

	private parseFrontMatter(fileContent: string) {
		// Retrieving the YAML frontmatter block
		const frontMatterMatch = this.frontMatterRegex.exec(fileContent);
		const frontMatterContent = frontMatterMatch?.groups?.frontmatter || '';

		// Parsing an existing YAML frontmatter
		return parseYaml(frontMatterContent) || {};
	}

	private async getUpdatedAliases(noteName: string, frontMatterData: any, options: any) {
		let inflectionGroups: { [key: string]: string[] } = {};
		const inflections: string[] = [];
		// Get the array of existing aliases from the frontmatter data
		const originalAliases = parseFrontMatterAliases(frontMatterData) || [];
		const originalNames = [noteName, ...originalAliases]

		for (const alias of originalNames) {
			if (!inflections.includes(alias)) {
				const aliasInflections = await this.getInflections(alias, options);
				inflectionGroups = {
					...inflectionGroups,
					[alias]: aliasInflections,
				}
				inflections.push(...aliasInflections);
			}
		}

		let nominativeNames = Object.keys(inflectionGroups).slice(1);
		let inflectedNames = Object.values(inflectionGroups).flat();
		return this.getUniqueValues([...nominativeNames, ...inflectedNames].filter(a => a !== noteName));
	}

	private getUniqueValues(array: string[]): string[] {
		return array.filter((value, index, self) => self.indexOf(value) === index);
	}

	private async saveFrontMatter(file: TFile, fileContent: string, frontMatterData: any) {
		// Convert the updated frontMatter data back to the YAML format
		const updatedFrontMatterContent = stringifyYaml(frontMatterData);

		// Generate the updated content of the file with the changed frontmatter
		let updatedFileContent;
		if (this.frontMatterRegex.exec(fileContent)) {
			// Replace the existing frontmatter with the updated frontmatter content
			updatedFileContent = fileContent.replace(
				this.frontMatterRegex,
				`---\n${updatedFrontMatterContent}---`
			);
		} else {
			// Add a new frontmatter block at the beginning of the file
			updatedFileContent = `---\n${updatedFrontMatterContent}---\n${fileContent}`;
		}

		// Save the updated file content
		await this.app.vault.modify(file, updatedFileContent);
		// Return true if any content was updated
		return fileContent !== updatedFileContent
	}

	onunload() {

	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}

	// Make an HTTP request to fetch the inflections
	private async getInflections(phrase: string, {includePlural}: any) {
		// return this.getInflectionsStub(noteName)

		// Construct the URL to fetch inflections
		const responseJson = await this.httpGetMorpher(phrase);
		// const responseJson = await this.httpGetMorpherStub(phrase);
		if (responseJson["message"]) {
			new Notice(`Could not get inflections for ${phrase}: ${responseJson["message"]}`);
			return []
		}
		const inflectionsData = [
			responseJson,
			(includePlural ? responseJson["множественное"] : null),
		]

		// Extract the relevant inflections from the response
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

	private async httpGetMorpherStub(noteName: string) : Promise<any> {
		return Promise.resolve({
		  "Р": "стола",
		  "Д": "столу",
		  "В": "стол",
		  "Т": "столом",
		  "П": "столе",
		  "множественное": {
		    "И": "столы",
		    "Р": "столов",
		    "Д": "столам",
		    "В": "столы",
		    "Т": "столами",
		    "П": "столах"
		  }
		})
	}

	private extractStringValues(json: any): string[] {
		if (!json) return [];
		return Object.values(json).filter(value => typeof value === 'string') as string[];
	}

	private getInflectionsStub(noteName: string) {
		switch (noteName) {
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

	private async fetchWithTimeout(resource: string, {timeout = 15000, ...options} = {}) {
	  const controller = new AbortController();
	  const id = setTimeout(() => controller.abort(), timeout);

	  const response = await fetch(resource, {
	    ...options,
	    signal: controller.signal
	  });
	  clearTimeout(id);

	  return response;
	}
}

class AddAliasesModal extends Modal {
	results: Promise<{includePlural: boolean}>;
	resolver: (value: {includePlural: boolean}) => void;

	constructor(app: App) {
		super(app);
		this.results = new Promise((resolve) => this.resolver = resolve);
	}

	onOpen() {
		let {contentEl} = this;

		contentEl.empty();

		let formEl = contentEl.createEl('form');

		let divEl = formEl.createEl('div', { cls: 'setting-item' });

		let checkboxLabel = divEl.createEl('label');
		let checkbox = checkboxLabel.createEl('input', { attr: { type: 'checkbox', checked: true } });
		checkboxLabel.appendText(' Plural');

		// Create setting-item wrapper div
		let buttonWrapper = formEl.createEl('div', { cls: 'setting-item' });

		// Create button inside the wrapper
		let okButton = buttonWrapper.createEl('button', { text: 'OK', cls: 'mod-cta' });
		okButton.addEventListener('click', (e) => {
			e.preventDefault();
			this.resolver({ includePlural: checkbox.checked });
			this.close();
		});
	}

	onClose() {
		let {contentEl} = this;
		contentEl.empty();
	}
}

class SampleSettingTab extends PluginSettingTab {
	plugin: MyPlugin;

	constructor(app: App, plugin: MyPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const {containerEl} = this;

		containerEl.empty();

		containerEl.createEl('h2', {text: 'Settings for my awesome plugin.'});

		new Setting(containerEl)
			.setName('Setting #1')
			.setDesc('It\'s a secret')
			.addText(text => text
				.setPlaceholder('Enter your secret')
				.setValue(this.plugin.settings.mySetting)
				.onChange(async (value) => {
					console.log('Secret: ' + value);
					this.plugin.settings.mySetting = value;
					await this.plugin.saveSettings();
				}));
	}
}

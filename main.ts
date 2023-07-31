// const fm = require('front-matter');
// import fm from 'front-matter';
import {
	App,
	MarkdownView,
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
			// Modify the frontmatter of the file to include the inflections
			editorCallback: async (editor, view) => {
				const file = view.file;
				if (!file) {
					return
				}

				const noteName = file.basename; // Get the name of the current note

				try {
					const fileContent = await this.app.vault.read(file);
					const frontMatterData = this.parseFrontMatter(fileContent);

					// Updating aliases in frontMatterData
					frontMatterData.aliases = await this.getUpdatedAliases(noteName, frontMatterData);
					// frontMatterData.inflected = true;

					await this.saveFrontMatter(file, fileContent, frontMatterData);

					// Trigger the necessary workspace actions
					await this.app.workspace.trigger('file-menu:sync-vault');
				} catch (error) {
					console.error('Error fetching inflections:', error);
					new Notice('Error fetching inflections');
				}
			},
		});

		// This adds a settings tab so the user can configure various aspects of the plugin
		this.addSettingTab(new SampleSettingTab(this.app, this));

		// If the plugin hooks up any global DOM events (on parts of the app that doesn't belong to this plugin)
		// Using this function will automatically remove the event listener when this plugin is disabled.
		this.registerDomEvent(document, 'click', (evt: MouseEvent) => {
			console.log('click', evt);
		});

		// When registering intervals, this function will automatically clear the interval when the plugin is disabled.
		this.registerInterval(window.setInterval(() => console.log('setInterval'), 5 * 60 * 1000));
	}

	private parseFrontMatter(fileContent: string) {
		// Retrieving the YAML frontmatter block
		const frontMatterMatch = this.frontMatterRegex.exec(fileContent);
		const frontMatterContent = frontMatterMatch?.groups?.frontmatter || '';

		// Parsing an existing YAML frontmatter
		return parseYaml(frontMatterContent) || {};
	}

	private async getUpdatedAliases(noteName: string, frontMatterData: any) {
		let inflectionGroups: { [key: string]: string[] } = {};
		const inflections: string[] = [];
		// Get the array of existing aliases from the frontmatter data
		const originalAliases = parseFrontMatterAliases(frontMatterData) || [];
		const originalNames = [noteName, ...originalAliases]

		for (const alias of originalNames) {
			if (!inflections.includes(alias)) {
				const aliasInflections = await this.getInflections(alias);
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
	private async getInflections(noteName: string) {
		// return this.getInflectionsStub(noteName)

		// Construct the URL to fetch inflections
		const encodedNoteName = encodeURIComponent(noteName);
		const url = `https://ws3.morpher.ru/russian/declension?format=json&s=${encodedNoteName}`;

		const response = await fetch(url);
		const responseJson = await response.json();

		// Extract the relevant inflections from the response
		const inflections =
			[responseJson, responseJson["множественное"]]
				.map(json => this.extractStringValues(json))
				.flat()
		return [...new Set(inflections)];
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
			default:
				return ['кого-то', 'кому-то'];
		}
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

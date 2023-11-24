import {
	Notice,
	parseFrontMatterAliases,
	parseYaml,
	Plugin,
	stringifyYaml,
	TFile
} from 'obsidian';
import { Settings, DEFAULT_SETTINGS, AlInfSettingTab } from './src/settings';
import AddAliasesModal from './src/add_aliases_modal';
import { MorpherInflector, StubInflector, Inflector } from './src/inflector';

export default class AlInfPlugin extends Plugin {
	settings: Settings;
	frontMatterRegex = /^---+\n(?<frontmatter>(?:.|\n)*)---+/um;
	inflector: Inflector

	async onload() {
		this.inflector = new MorpherInflector();
		// this.inflector = new StubInflector();
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
		this.addSettingTab(new AlInfSettingTab(this.app, this));

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
				const aliasInflections = await this.inflector.getInflections(alias, options);
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
}

import {
	Notice,
	parseFrontMatterAliases,
	parseYaml,
	Plugin,
	stringifyYaml,
	TFile
} from 'obsidian';
import { Settings, DEFAULT_SETTINGS, AlInfSettingTab } from './settings';
import AddAliasesModal from './add_aliases_modal';
import { MorpherInflector, StubInflector, Inflector } from './inflector';

export default class AlInfPlugin extends Plugin {
	settings: Settings;
	frontMatterRegex = /^---+\n(?<frontmatter>(?:.|\n)*)---+/um;
	inflector: Inflector

	async onload() {
		await this.loadSettings();
		this.setInflector();

		this.addCommand({
			id: 'add-aliases-with-inflections',
			name: 'Add aliases with inflections',
			callback: async () => {
				const file = this.app.workspace.getActiveFile()
				if (!file) {
					return;
				}

				let fileContent = await this.app.vault.read(file);
				let frontMatterData = this.parseFrontMatter(fileContent);
				let includePlural = true;
				let inflectFilename = true;


				if ("alinf-inflect-file-name" in frontMatterData) {
					if (frontMatterData["alinf-inflect-file-name"] === false) {
						inflectFilename = false;
					}
				}

				if ("alinf-include-plural" in frontMatterData) {
					if (frontMatterData["alinf-include-plural"] === false) {
						includePlural = false;
					}
				}

				const modal = new AddAliasesModal(this.app, {
					includePluralDefault: includePlural,
					inflectFilenameDefault: inflectFilename,
				});
				modal.open();

				({inflectFilename, includePlural} = await modal.results);

				// Execute your command
				const noteName = file.basename; // Get the name of the current note

				try {
					fileContent = await this.app.vault.read(file);
					frontMatterData = this.parseFrontMatter(fileContent);

					const aliases = parseFrontMatterAliases(frontMatterData) || [];
					if (!("alinf-inflectable-aliases" in frontMatterData) && aliases.length) {
						frontMatterData["alinf-inflectable-aliases"] = aliases
					}
					// Updating aliases in frontMatterData
					frontMatterData.aliases = await this.getUpdatedAliases(noteName, frontMatterData, {
						includePlural, inflectFilename
					});
					if (this.inflector.errors.length) {
						new Notice(this.inflector.errors.join('\n\n'))
						this.inflector.errors = []
					}
					frontMatterData["alinf-include-plural"] = includePlural;
					frontMatterData["alinf-inflect-file-name"] = inflectFilename;

					const wasUpdated = await this.saveFrontMatter(file, fileContent, frontMatterData);

					// Trigger the necessary workspace actions
					this.app.workspace.trigger('file-menu:sync-vault');

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

	private setInflector() {
		switch (this.settings.inflector) {
			case 'morpher':
				this.inflector = new MorpherInflector();
				break;
			case 'stub':
				this.inflector = new StubInflector();
		}
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

		let originalNames: string[] = [];

		if (options.inflectFilename) {
			originalNames.push(noteName);
		}

		if ("alinf-inflectable-aliases" in frontMatterData) {
			// If the front matter contains alinf-inflectable-aliases, then use these names
			originalNames = originalNames.concat(frontMatterData["alinf-inflectable-aliases"] || []);
		}
		else if ("aliases" in frontMatterData) {
			// If the front matter contains aliases, then use these names
			originalNames = originalNames.concat(parseFrontMatterAliases(frontMatterData) || []);
		}

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

		const nominativeNames = Object.keys(inflectionGroups).slice(1);
		const inflectedNames = Object.values(inflectionGroups).flat();
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

	// onunload() {
	//
	// }

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		this.setInflector();
		await this.saveData(this.settings);
	}
}

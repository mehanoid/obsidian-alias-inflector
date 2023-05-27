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

		// This creates an icon in the left ribbon.
		const ribbonIconEl = this.addRibbonIcon('dice', 'Sample Plugin', (evt: MouseEvent) => {
			// Called when the user clicks the icon.
			new Notice('Hello, you! Пыщ пыщ!!!');
		});
		// Perform additional things with the ribbon
		ribbonIconEl.addClass('my-plugin-ribbon-class');

		// This adds a status bar item to the bottom of the app. Does not work on mobile apps.
		const statusBarItemEl = this.addStatusBarItem();
		statusBarItemEl.setText('Status Bar Text');

		// This adds a simple command that can be triggered anywhere
		this.addCommand({
			id: 'open-sample-modal-simple',
			name: 'Open sample modal (simple)',
			callback: () => {
				new SampleModal(this.app).open();
			}
		});

		this.addCommand({
			id: 'add-aliases-with-inflections',
			name: 'Add aliases with inflections',
			editorCallback: async (editor, view) => {
				if (!view.file) {
					return
				}

				const noteName = view.file.basename; // Get the name of the current note

				try {
					// Modify the frontmatter of the file to include the inflections
					const filePath = view.file.path;
					const file = this.app.vault.getAbstractFileByPath(filePath);
					if (!file || !(file instanceof TFile)) {
						console.error('Invalid file:', filePath);
						return;
					}
					const fileContent = await this.app.vault.read(file);

					// Retrieving the YAML frontmatter block
					const frontMatterMatch = this.frontMatterRegex.exec(fileContent);
					const frontMatterContent = frontMatterMatch?.groups?.frontmatter || '';

					// Parsing an existing YAML frontmatter
					const frontMatterData = parseYaml(frontMatterContent) || {};

					// Updating aliases in frontMatterData
					frontMatterData.aliases = await this.getUpdatedAliases(noteName, frontMatterData);

					// Convert the updated frontMatter data back to the YAML format
					const updatedFrontMatterContent = stringifyYaml(frontMatterData);

					// Generate the updated content of the file with the changed frontmatter
					let updatedFileContent;
					if (frontMatterMatch) {
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

					// Trigger the necessary workspace actions
					await this.app.workspace.trigger('file-menu:sync-vault');
				} catch (error) {
					console.error('Error fetching inflections:', error);
					new Notice('Error fetching inflections');
				}
			},
		});

		// This adds a complex command that can check whether the current state of the app allows execution of the command
		this.addCommand({
			id: 'open-sample-modal-complex',
			name: 'Open sample modal (complex)',
			checkCallback: (checking: boolean) => {
				// Conditions to check
				const markdownView = this.app.workspace.getActiveViewOfType(MarkdownView);
				if (markdownView) {
					// If checking is true, we're simply "checking" if the command can be run.
					// If checking is false, then we want to actually perform the operation.
					if (!checking) {
						new SampleModal(this.app).open();
					}

					// This command will only show up in Command Palette when the check function returns true
					return true;
				}
			}
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

	private async getUpdatedAliases(noteName: string, frontMatterData: any) {
		const inflections = await this.getInflections(noteName);
		// Get the array of existing aliases from the frontmatter data
		const existingAliases = parseFrontMatterAliases(frontMatterData) || [];

		// Check if any of the existing aliases need to be updated
		const aliasesToUpdate = [];
		for (const alias of existingAliases) {
			if (!inflections.includes(alias)) {
				aliasesToUpdate.push(alias);
				const aliasInflections = await this.getInflections(alias);
				inflections.push(...aliasInflections);
			}
		}

		// Combine existing aliases with new inflections
		const updatedAliases = [...new Set([...existingAliases, ...(inflections)])];
		return updatedAliases;
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
		return this.getInflectionsStub(noteName)

		// // Construct the URL to fetch inflections
		// const encodedNoteName = encodeURIComponent(noteName);
		// const url = `https://ws3.morpher.ru/russian/declension?format=json&s=${encodedNoteName}`;
		//
		// const response = await fetch(url);
		// const inflections = await response.json();
		//
		// // Extract the relevant inflections from the response
		// const declensions = Object.values(inflections).filter(value => typeof value === 'string');
		// return [...new Set(declensions)];
	}

	// Make an HTTP request to fetch the inflections
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

class SampleModal extends Modal {
	constructor(app: App) {
		super(app);
	}

	onOpen() {
		const {contentEl} = this;
		contentEl.setText('Woah!');
	}

	onClose() {
		const {contentEl} = this;
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

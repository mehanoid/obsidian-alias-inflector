import {
	App,
	PluginSettingTab,
	Setting
} from 'obsidian';
import type AlInfPlugin from './main.js';

export interface Settings {
	inflector: string;
	debug: boolean;
	inflectFilename: boolean;
	includePlural: boolean;
	showInflectionModal: boolean;
}

export const DEFAULT_SETTINGS: Settings = {
	inflector: 'morpher',
	debug: false,
	inflectFilename: true,
	includePlural: true,
	showInflectionModal: true
}

export class AlInfSettingTab extends PluginSettingTab {
	plugin: AlInfPlugin;

	constructor(app: App, plugin: AlInfPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const {containerEl} = this;

		containerEl.empty();

		containerEl.createEl('h2', {text: 'Alias Inflector'});

		// Default options - always available
		const options = [
			{key: 'morpher', display: 'Morpher.ru'}
		];

		// In Debug mode, add additional options
		if (this.plugin.settings.debug) {
			options.push({key: 'stub', display: 'Stub (for debugging)'});
		}

		new Setting(containerEl)
			.setName('Inflector')
			.setDesc('Service used for fetching inflections')
			.addDropdown(dropdown => {
				options.forEach(option => {
					dropdown.addOption(option.key, option.display);
				});
				dropdown
					.setValue(this.plugin.settings.inflector)
					.onChange(async (value) => {
						this.plugin.settings.inflector = value;
						await this.plugin.saveSettings();
					});
			});

		new Setting(containerEl)
			.setName('Inflect file name')
			.setDesc('By default, inflect not only the aliases but also the file name')
			.addToggle(toggle => {
				toggle
					.setValue(this.plugin.settings.inflectFilename)
					.onChange(async (value) => {
						this.plugin.settings.inflectFilename = value;
						await this.plugin.saveSettings();
					});
			});

		new Setting(containerEl)
			.setName('Include plural')
			.setDesc('By default, include the plural form in the list of aliases')
			.addToggle(toggle => {
				toggle
					.setValue(this.plugin.settings.includePlural)
					.onChange(async (value) => {
						this.plugin.settings.includePlural = value;
						await this.plugin.saveSettings();
					});
			});

		new Setting(containerEl)
			.setName('Show inflection modal')
			.setDesc('The "Add aliases" command displays a modal that allows you to set different inflection options for the current file')
			.addToggle(toggle => {
				toggle
					.setValue(this.plugin.settings.showInflectionModal)
					.onChange(async (value) => {
						this.plugin.settings.showInflectionModal = value;
						await this.plugin.saveSettings();
					});
			});
	}
}

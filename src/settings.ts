import {
	App,
	PluginSettingTab,
	Setting
} from 'obsidian';
import type AlInfPlugin from './main.js';

export interface Settings {
	inflector: string;
	debug: boolean;
}

export const DEFAULT_SETTINGS: Settings = {
	inflector: 'morpher',
	debug: false
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
		let options = [
			{key: 'morpher', display: 'Morpher'}
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
	}
}

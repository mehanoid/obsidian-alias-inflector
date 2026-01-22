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
  openaiApiKey: string;
  openaiApiUrl: string;
  openaiModel: string;
}

export const DEFAULT_SETTINGS: Settings = {
  inflector: 'morpher',
  debug: false,
  inflectFilename: true,
  includePlural: true,
  showInflectionModal: true,
  openaiApiKey: '',
  openaiApiUrl: 'https://api.openai.com/v1',
  openaiModel: 'gpt-5.2'
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
    const inflectorOptions = [
      {key: 'morpher', display: 'Morpher.ru'},
      {key: 'openai', display: 'OpenAI Compatible API'}
    ];

    // In Debug mode, add additional options
    if (this.plugin.settings.debug) {
      inflectorOptions.push({key: 'stub', display: 'Stub (for debugging)'});
    }

    new Setting(containerEl)
      .setName('Inflector')
      .setDesc('Service used for fetching inflections')
      .addDropdown(dropdown => {
        inflectorOptions.forEach(option => {
          dropdown.addOption(option.key, option.display);
        });
        dropdown
          .setValue(this.plugin.settings.inflector)
          .onChange(async (value) => {
            this.plugin.settings.inflector = value;
            await this.plugin.saveSettings();
            this.display();
          });
      });

    // OpenAI specific settings
    if (this.plugin.settings.inflector === 'openai') {
      new Setting(containerEl)
        .setName('OpenAI API Key (Optional)')
        .setDesc('Your OpenAI API key or compatible service token. Leave empty for local models (Ollama, LM Studio, etc.)')
        .addText(text => {
          text
            .setPlaceholder('sk-... (optional)')
            .setValue(this.plugin.settings.openaiApiKey)
            .onChange(async (value) => {
              this.plugin.settings.openaiApiKey = value;
              await this.plugin.saveSettings();
            });
          text.inputEl.type = 'password';
        });

      new Setting(containerEl)
        .setName('OpenAI API URL')
        .setDesc('Base URL for the OpenAI API (default: https://api.openai.com/v1)')
        .addText(text => {
          text
            .setPlaceholder('https://api.openai.com/v1')
            .setValue(this.plugin.settings.openaiApiUrl)
            .onChange(async (value) => {
              this.plugin.settings.openaiApiUrl = value || 'https://api.openai.com/v1';
              await this.plugin.saveSettings();
            });
        });

      new Setting(containerEl)
        .setName('OpenAI Model')
        .setDesc('Model to use (e.g., gpt-5.2)')
        .addText(text => {
          text
            .setPlaceholder('gpt-5.2')
            .setValue(this.plugin.settings.openaiModel)
            .onChange(async (value) => {
              this.plugin.settings.openaiModel = value || 'gpt-5.2';
              await this.plugin.saveSettings();
            });
        });
    }

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

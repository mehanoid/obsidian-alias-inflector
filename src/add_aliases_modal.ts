import {App, Modal} from 'obsidian';
import InflectionOptions from "./inflection_options";

export default class AddAliasesModal extends Modal {
  results: Promise<{ includePlural: boolean, inflectFilename: boolean }>;
  resolver: (value: { includePlural: boolean, inflectFilename: boolean }) => void;
  defaultOptions: InflectionOptions;

  constructor(app: App, defaultOptions: InflectionOptions) {
    super(app);
    this.defaultOptions = defaultOptions;
    this.results = new Promise((resolve) => this.resolver = resolve);
  }

  onOpen() {
    const {contentEl} = this;

    contentEl.empty();

    const formEl = contentEl.createEl('form');

    const inflectDivEl = formEl.createEl('div', {cls: 'setting-item'});
    const inflectCheckboxLabel = inflectDivEl.createEl('label');
    const inflectCheckbox = this.defaultOptions.inflectFilename
      ? inflectCheckboxLabel.createEl('input', {attr: {type: 'checkbox', checked: true}})
      : inflectCheckboxLabel.createEl('input', {attr: {type: 'checkbox'}});
    inflectCheckboxLabel.appendText(' Inflect file name');

    const divEl = formEl.createEl('div', {cls: 'setting-item'});
    const pluralLabel = divEl.createEl('label');
    const pluralCheckbox = this.defaultOptions.includePlural
      ? pluralLabel.createEl('input', {attr: {type: 'checkbox', checked: true}})
      : pluralLabel.createEl('input', {attr: {type: 'checkbox'}});
    pluralLabel.appendText(' Include plural');

    // Create setting-item wrapper div
    const buttonWrapper = formEl.createEl('div', {cls: 'setting-item'});

    // Create button inside the wrapper
    const okButton = buttonWrapper.createEl('button', {text: 'OK', cls: 'mod-cta'});
    okButton.addEventListener('click', (e) => {
      e.preventDefault();
      this.resolver({includePlural: pluralCheckbox.checked, inflectFilename: inflectCheckbox.checked});
      this.close();
    });
  }

  onClose() {
    const {contentEl} = this;
    contentEl.empty();
  }
}

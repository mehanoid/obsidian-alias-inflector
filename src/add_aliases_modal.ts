import { App, Modal } from 'obsidian';

export default class AddAliasesModal extends Modal {
	results: Promise<{includePlural: boolean, inflectFilename: boolean}>;
	resolver: (value: {includePlural: boolean, inflectFilename: boolean}) => void;
	includePluralDefault: boolean;
	inflectFilenameDefault: boolean;

	constructor(app: App, { inflectFilenameDefault = true, includePluralDefault = true} = {}) {
		super(app);
		this.inflectFilenameDefault = inflectFilenameDefault;
		this.includePluralDefault = includePluralDefault;
		this.results = new Promise((resolve) => this.resolver = resolve);
	}

	onOpen() {
		const {contentEl} = this;

		contentEl.empty();

		const formEl = contentEl.createEl('form');

		const inflectDivEl = formEl.createEl('div', { cls: 'setting-item' });
		const inflectCheckboxLabel = inflectDivEl.createEl('label');
		const inflectCheckbox = this.inflectFilenameDefault
			? inflectCheckboxLabel.createEl('input', { attr: { type: 'checkbox', checked: true } })
			: inflectCheckboxLabel.createEl('input', { attr: { type: 'checkbox' } });
		inflectCheckboxLabel.appendText(' Inflect file name');

		const divEl = formEl.createEl('div', { cls: 'setting-item' });
		const pluralLabel = divEl.createEl('label');
		const pluralCheckbox = this.includePluralDefault
			? pluralLabel.createEl('input', { attr: { type: 'checkbox', checked: true } })
			: pluralLabel.createEl('input', { attr: { type: 'checkbox' } });
		pluralLabel.appendText(' Plural');

		// Create setting-item wrapper div
		const buttonWrapper = formEl.createEl('div', { cls: 'setting-item' });

		// Create button inside the wrapper
		const okButton = buttonWrapper.createEl('button', { text: 'OK', cls: 'mod-cta' });
		okButton.addEventListener('click', (e) => {
			e.preventDefault();
			this.resolver({ includePlural: pluralCheckbox.checked, inflectFilename: inflectCheckbox.checked });
			this.close();
		});
	}

	onClose() {
		const {contentEl} = this;
		contentEl.empty();
	}
}

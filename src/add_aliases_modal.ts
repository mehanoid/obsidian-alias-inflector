import { App, Modal } from 'obsidian';

export default class AddAliasesModal extends Modal {
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

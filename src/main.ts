import {Notice, parseFrontMatterAliases, Plugin, TFile} from 'obsidian';
import {AlInfSettingTab, DEFAULT_SETTINGS, Settings} from './settings';
import InflectionOptions from "./inflection_options";
import AddAliasesModal from './add_aliases_modal';
import {Inflector, MorpherInflector, StubInflector} from './inflector';

export default class AlInfPlugin extends Plugin {
  settings: Settings;
  inflector: Inflector

  async onload() {
    await this.loadSettings();
    this.setInflector();

    this.addCommand({
      id: 'add-aliases-with-inflections',
      name: 'Add aliases with inflections',
      callback: this.addAliasesWithInflectionsCallback.bind(this)
    });

    this.addSettingTab(new AlInfSettingTab(this.app, this));
  }

  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings() {
    this.setInflector();
    await this.saveData(this.settings);
  }

  private async addAliasesWithInflectionsCallback() {
    const file = this.app.workspace.getActiveFile()

    if (!file) {
      return;
    }

    const frontMatter = this.app.metadataCache.getFileCache(file)?.frontmatter ?? {};
    let options = this.loadInflectionOptions(frontMatter);

    if (this.settings.showInflectionModal) {
      const modal = new AddAliasesModal(this.app, options);
      modal.open();
      options = await modal.results;
    }
    await this.updateAliases(file, frontMatter, options);
    this.app.workspace.trigger('file-menu:sync-vault');
  }

  private loadInflectionOptions(frontMatter: any) : InflectionOptions {
    let includePlural = this.settings.includePlural;
    let inflectFilename = this.settings.inflectFilename;

    if ("alinf-inflect-file-name" in frontMatter) {
      inflectFilename = frontMatter["alinf-inflect-file-name"];
    }

    if ("alinf-include-plural" in frontMatter) {
      includePlural = frontMatter["alinf-include-plural"];
    }

    return {includePlural, inflectFilename};
  }

  private async updateAliases(file: TFile, frontMatter: any, options: InflectionOptions) {
    try {
      const oldAliases = parseFrontMatterAliases(frontMatter) || [];
      const newAliases = await this.buildNewAliases(file.basename, frontMatter, options);

      await this.app.fileManager.processFrontMatter(file, async (frontMatter) => {
        frontMatter.aliases = newAliases;
        frontMatter["alinf-include-plural"] = options.includePlural;
        frontMatter["alinf-inflect-file-name"] = options.inflectFilename;
        if (!("alinf-inflectable-aliases" in frontMatter) && oldAliases.length) {
          frontMatter["alinf-inflectable-aliases"] = oldAliases
        }
      })

      this.showNoticeOnUpdate(JSON.stringify(oldAliases) !== JSON.stringify(newAliases));
    } catch (error) {
      console.error('Error fetching inflections:', error);
      new Notice('Error fetching inflections');
    }
  }
  private showNoticeOnUpdate(wasUpdated: boolean) {
    if (wasUpdated) {
      new Notice('Aliases updated');
    } else {
      new Notice('Aliases are already inflected');
    }
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

  private async buildNewAliases(noteName: string, frontMatter: any, options: InflectionOptions) {
    let inflectionGroups: { [key: string]: string[] } = {};
    const inflections: string[] = [];

    let originalNames: string[] = [];

    if (options.inflectFilename) {
      originalNames.push(noteName);
    }

    if ("alinf-inflectable-aliases" in frontMatter) {
      // If the front matter contains alinf-inflectable-aliases, then use these names
      originalNames = originalNames.concat(frontMatter["alinf-inflectable-aliases"] || []);
    } else if ("aliases" in frontMatter) {
      // If the front matter contains aliases, then use these names
      originalNames = originalNames.concat(parseFrontMatterAliases(frontMatter) || []);
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

    if (this.inflector.errors.length) {
      new Notice(this.inflector.errors.join('\n\n'))
      this.inflector.errors = []
    }

    const nominativeNames = Object.keys(inflectionGroups).slice(1);
    const inflectedNames = Object.values(inflectionGroups).flat();
    return this.getUniqueValues([...nominativeNames, ...inflectedNames].filter(a => a !== noteName));
  }

  private getUniqueValues(array: string[]): string[] {
    return array.filter((value, index, self) => self.indexOf(value) === index);
  }

  // onunload() {
  //
  // }
}

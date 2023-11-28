import {
  Notice,
  parseFrontMatterAliases,
  parseYaml,
  Plugin,
  stringifyYaml,
  TFile
} from 'obsidian';
import {Settings, DEFAULT_SETTINGS, AlInfSettingTab} from './settings';
import AddAliasesModal from './add_aliases_modal';
import {MorpherInflector, StubInflector, Inflector} from './inflector';

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

    const fileContent = await this.app.vault.read(file);
    const frontMatterData = this.parseFrontMatter(fileContent);
    let {includePlural, inflectFilename} = this.loadSettingsFromFrontMatter(frontMatterData);

    if (this.settings.showInflectionModal) {
      const modal = new AddAliasesModal(this.app, {
        includePluralDefault: includePlural,
        inflectFilenameDefault: inflectFilename,
      });
      modal.open();
      ({inflectFilename, includePlural} = await modal.results);
    }
    await this.updateAliases(file, fileContent, frontMatterData, includePlural, inflectFilename);
    this.app.workspace.trigger('file-menu:sync-vault');
  }

  private loadSettingsFromFrontMatter(frontMatterData: any) {
    let includePlural = this.settings.includePlural;
    let inflectFilename = this.settings.inflectFilename;

    if ("alinf-inflect-file-name" in frontMatterData) {
      inflectFilename = frontMatterData["alinf-inflect-file-name"];
    }

    if ("alinf-include-plural" in frontMatterData) {
      includePlural = frontMatterData["alinf-include-plural"];
    }

    return {includePlural, inflectFilename};
  }

  private async updateAliases(file: TFile, fileContent: string, frontMatterData: any,
                              includePlural: boolean, inflectFilename: boolean) {
    try {
      fileContent = await this.app.vault.read(file);
      frontMatterData = this.parseFrontMatter(fileContent);

      this.updateFrontMatterDataWithAliases(frontMatterData);
      await this.updateFrontMatterDataWithInflections(frontMatterData, file.basename,
        includePlural, inflectFilename);


      frontMatterData["alinf-include-plural"] = includePlural;
      frontMatterData["alinf-inflect-file-name"] = inflectFilename;

      const wasUpdated = await this.saveFrontMatter(file, fileContent, frontMatterData);
      this.showNoticeOnUpdate(wasUpdated);
    } catch (error) {
      console.error('Error fetching inflections:', error);
      new Notice('Error fetching inflections');
    }
  }

  private updateFrontMatterDataWithAliases(frontMatterData: any) {
    const aliases = parseFrontMatterAliases(frontMatterData) || [];
    if (!("alinf-inflectable-aliases" in frontMatterData) && aliases.length) {
      frontMatterData["alinf-inflectable-aliases"] = aliases
    }
  }

  private async updateFrontMatterDataWithInflections(frontMatterData: any, noteName: string,
                                                     includePlural: boolean, inflectFilename: boolean) {
    frontMatterData.aliases = await this.getUpdatedAliases(noteName, frontMatterData, {
      includePlural, inflectFilename
    });
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
    } else if ("aliases" in frontMatterData) {
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
}

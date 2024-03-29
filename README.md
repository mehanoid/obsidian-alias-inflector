# Obsidian Alias Inflector

Плагин позволяет одной командой добавить все возможные склонения слова или словосочетания в качестве alias-ов.
Для получения списка склонений в данный момент используется онлайн сервис [morpher.ru](https://morpher.ru). Возможно, в
будущем добавится поддержка других сервисов, например, OpenAI.

## Возможности:

- склонение названия заметки
- склонение всех словосочетаний, добавленных пользователем в качестве alias-ов
- добавление в качестве alias-ов всех падежей склоняемого словосочетания
- добавление в качестве alias-ов единственного и множественного числа склоняемого словосочетания

## Использование

Для использования нужно выбрать в палитре команд "Alias Inflector: Add aliases with inflections".
Для команды доступны следующие опции:

- **Inflect file name**: нужно ли склонять название файла, или только alias-ы
- **Include plural**: добавлять ли в качестве alias-ов форму множественного числа

Кроме того, плагин использует следующие свойства Frontmatter:

- `alinf-inflect-file-name`: последнее использовавшееся значение опции **Inflect file name**. При последующем запуске
  команды используется как значение опций по умолчанию
- `alinf-include-plural`: последнее использовавшееся значение опции **Include plural**. При последующем запуске команды
  используется как значение опций по умолчанию
- `alinf-inflectable-aliases`: список словосочетаний в именительном падеже, используемый для склонений в дополнение к
  названию файла. При первом запуске команды заполняется значением свойства `aliases`

## Manually installing the plugin

- Copy over `main.js`, `styles.css`, `manifest.json` to your
  vault `VaultFolder/.obsidian/plugins/obsidian-alias-inflector/`.

## Development
* Clone this repo.
* Make sure your NodeJS is at least v16 (node --version).
* npm i or yarn to install dependencies.
* npm run dev to start compilation in watch mode.
  
## Tests and linters
* run tests: `yarn run test` 
* run linters: `yarn run lint` 

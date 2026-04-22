import editorconfig from './templates/.editorconfig.hbs?raw';
import gitignore from './templates/.gitignore.hbs?raw';
import prettierignore from './templates/.prettierignore.hbs?raw';
import prettierrc from './templates/.prettierrc.hbs?raw';
import LICENSE from './templates/LICENSE.hbs?raw';
import READMEMd from './templates/README.md.hbs?raw';
import packageJson from './templates/package.json.hbs?raw';
import tsconfigJson from './templates/tsconfig.json.hbs?raw';
import testsCreateTestJs from './templates/tests/create.test.js.hbs?raw';
import srcIndexTs from './templates/src/index.ts.hbs?raw';
import srcSchemaTs from './templates/src/schema.ts.hbs?raw';
import srcTypesTs from './templates/src/types.ts.hbs?raw';
import srcComponentsIndexTs from './templates/src/components/index.ts.hbs?raw';
import srcComponentsNameTs from './templates/src/components/[name].ts.hbs?raw';
import srcUtilsGetColorsTs from './templates/src/utils/getColors.ts.hbs?raw';
import srcUtilsGetComponentsTs from './templates/src/utils/getComponents.ts.hbs?raw';
import srcUtilsPickComponentTs from './templates/src/utils/pickComponent.ts.hbs?raw';
import srcUtilsConvertColorTs from './templates/src/utils/convertColor.ts.hbs?raw';
import srcHooksOnPreCreateTs from './templates/src/hooks/onPreCreate.ts.hbs?raw';
import srcHooksOnPostCreateTs from './templates/src/hooks/onPostCreate.ts.hbs?raw';

export const templates: Record<string, string> = {
  '.editorconfig': editorconfig,
  '.gitignore': gitignore,
  '.prettierrc': prettierrc,
  '.prettierignore': prettierignore,
  LICENSE: LICENSE,
  'README.md': READMEMd,
  'package.json': packageJson,
  'tsconfig.json': tsconfigJson,
  'tests/create.test.js': testsCreateTestJs,
  'src/index.ts': srcIndexTs,
  'src/schema.ts': srcSchemaTs,
  'src/types.ts': srcTypesTs,
  'src/components/index.ts': srcComponentsIndexTs,
  'src/components/[name].ts': srcComponentsNameTs,
  'src/utils/getColors.ts': srcUtilsGetColorsTs,
  'src/utils/getComponents.ts': srcUtilsGetComponentsTs,
  'src/utils/pickComponent.ts': srcUtilsPickComponentTs,
  'src/utils/convertColor.ts': srcUtilsConvertColorTs,
  'src/hooks/onPreCreate.ts': srcHooksOnPreCreateTs,
  'src/hooks/onPostCreate.ts': srcHooksOnPostCreateTs,
};

import fs from 'fs';
import path from 'path';
import prompts from 'prompts';

(async () => {
  const res = await prompts({
    type: 'text',
    name: 'name',
    message: 'config name',
  });

  const configDir = path.join(process.cwd(), 'config');
  const template = fs.readFileSync(
    path.join(process.cwd(), 'config-template.txt'),
    'utf-8'
  );
  const file = path.join(configDir, `${res.name}.json`);
  fs.writeFileSync(file, template, { encoding: 'utf-8' });
  console.log('✅ config file created');
})();

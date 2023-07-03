import { marpCli } from '@marp-team/marp-cli';
import axios from 'axios';
import { load } from 'cheerio';
import fs from 'fs';
import path from 'path';
import prompts from 'prompts';
import TurndownService from 'turndown';
import { ConfigDef } from './typings';

const turndownService = new TurndownService();

async function fetchHtml(url: string) {
  const response = await axios.get<string>(url);
  return response.data;
}

function saveMarkdownSync(filePath: string, markdown: string) {
  fs.writeFileSync(filePath, markdown, { encoding: 'utf-8' });
}

async function generatePdf(filePath: string) {
  return marpCli([filePath, '--pdf']);
}

const SEPARATOR = '\n\n---\n\n';

function getMarkdown(html: string, config: ConfigDef) {
  // `jQuery`
  const $ = load(html);
  const title = $(config.title).text().trim();
  const author = $(config.author).text().trim();
  const dateTime = $(config.dateTime).text().trim();

  const first = `# ${title}`;
  const second = `### ${author}\n${dateTime}`;

  const contents = $(config.content.selector)
    .children()
    .filter((_, element) => {
      return !config.content.exclude.some((excludeSelector) =>
        $(element).is(excludeSelector)
      );
    })
    .map((_, element) => {
      const html = $(element).html();
      return html ? turndownService.turndown(html) : null;
    })
    .toArray();
  const markdown = [first, second, ...contents].join(SEPARATOR);
  return { title, author, dateTime, markdown };
}

async function run(url: string, config: ConfigDef) {
  const html = await fetchHtml(url);
  const { title, markdown } = getMarkdown(html, config);

  const filePath = path.join(process.cwd(), 'output', `${title}.md`);
  saveMarkdownSync(filePath, markdown);
  const exitStatus = await generatePdf(filePath);
  if (exitStatus > 0) {
    console.error(`Failure (Exit status: ${exitStatus})`);
  } else {
    console.log('✅ SUCCESS!');
  }
}

const url = process.argv.slice(2)[0].trim();

if (!url) {
  console.error('url is required');
  process.exit(1);
}

const configDir = path.join(process.cwd(), 'config');

const options = (
  fs.readdirSync(configDir, {
    recursive: false,
  }) as string[]
).map((file) => {
  return {
    name: file.match(/(.*)\.json/)?.[1],
    path: path.join(configDir, file),
  };
});

(async () => {
  const res = await prompts({
    type: 'select',
    name: 'config',
    message: 'Please select a config',
    choices: options.map((opt) => ({ title: opt.name!, value: opt.path })),
  });

  run(url, require(res.config) as ConfigDef);
})();

import axios from "axios";
import { load } from "cheerio";
import TurndownService from "turndown";
import juejin from "./config/juejin.cn.json";
import { ConfigDef } from "./typings";
import path from "path";
import { marpCli } from "@marp-team/marp-cli";
import fs from "fs";

const turndownService = new TurndownService();

async function fetchHtml(url: string) {
  const response = await axios.get<string>(url);
  return response.data;
}

function saveMarkdownSync(filePath: string, markdown: string) {
  fs.writeFileSync(filePath, markdown, { encoding: "utf-8" });
}

async function generatePdf(filePath: string) {
  return marpCli([filePath, "--pdf"]);
}

const config = juejin as ConfigDef;

const SEPARATOR = "\n\n---\n\n";

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

async function run(url: string) {
  const html = await fetchHtml(url);
  const { title, markdown } = getMarkdown(html, config);

  const filePath = path.join(process.cwd(), "output", `${title}.md`);
  saveMarkdownSync(filePath, markdown);
  const exitStatus = await generatePdf(filePath);
  if (exitStatus > 0) {
    console.error(`Failure (Exit status: ${exitStatus})`);
  } else {
    console.log("✅ SUCCESS!");
  }
}

const url = process.argv.slice(2)[0].trim();

if (!url) {
  console.log("give me an url");
  process.exit(1);
}

console.log("url", url);

run(url);

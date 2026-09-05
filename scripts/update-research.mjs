#!/usr/bin/env node
// Scrapes the "Bolsas no país" / "Scholarships in Brazil" grants widget from a
// public FAPESP researcher profile, in both Portuguese and English (FAPESP
// publishes officially translated titles and abstracts for this widget), and
// writes assets/research.json. FAPESP's robots.txt allows crawling this page;
// this makes two infrequent, well-behaved requests.

import { writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const PROFILE_URL_PT =
  process.env.FAPESP_PROFILE_URL ||
  "https://bv.fapesp.br/pt/pesquisador/705016/marlon-fernandes-de-souza";
const PROFILE_URL_EN = PROFILE_URL_PT.replace("/pt/", "/en/");

const OUTPUT_PATH = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "assets",
  "research.json"
);
const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";

function decodeEntities(str) {
  return str
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .trim();
}

function stripTags(str) {
  return decodeEntities(str.replace(/<[^>]+>/g, ""));
}

function statusFromLabel(label) {
  var l = label.toLowerCase();
  if (l.indexOf("andamento") !== -1 || l.indexOf("upcoming") !== -1 || l.indexOf("ongoing") !== -1) return "ongoing";
  if (l.indexOf("conclu") !== -1 || l.indexOf("completed") !== -1) return "completed";
  return "other";
}

function parseGrants(html) {
  const marker = html.indexOf("Bolsas no país") !== -1
    ? html.indexOf("Bolsas no país")
    : html.indexOf("Scholarships in Brazil");
  if (marker === -1) return [];
  // The widget is a small, self-contained block right after the marker.
  const scope = html.slice(marker, marker + 8000);

  const items = [];
  const boxRe = /<span class="bv_h1">([^<]+)<\/span>[\s\S]*?<ul class="list-coloured">([\s\S]*?)<\/ul>/g;
  let boxMatch;

  while ((boxMatch = boxRe.exec(scope)) !== null) {
    const status = statusFromLabel(boxMatch[1]);
    const ulContent = boxMatch[2];

    const liRe = /<h3>[^<]*<\/h3><p>([\s\S]*?)<\/p><\/div><\/div><a href="([^"]+)">([\s\S]*?)<\/a>/g;
    let liMatch;
    while ((liMatch = liRe.exec(ulContent)) !== null) {
      items.push({
        status: status,
        title: stripTags(liMatch[3]),
        summary: stripTags(liMatch[1]),
        link: "https://bv.fapesp.br" + decodeEntities(liMatch[2])
      });
    }
  }

  return items;
}

async function fetchGrants(url) {
  const res = await fetch(url, { headers: { "User-Agent": USER_AGENT } });
  if (!res.ok) {
    throw new Error(`FAPESP request failed: HTTP ${res.status} for ${url}`);
  }
  return parseGrants(await res.text());
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  const ptItems = await fetchGrants(PROFILE_URL_PT);
  await sleep(1500);
  const enItems = await fetchGrants(PROFILE_URL_EN);

  if (ptItems.length === 0) {
    throw new Error("No grants parsed — FAPESP may have changed its page markup, or this profile has no grants widget.");
  }

  const items = ptItems.map((pt, i) => {
    const en = enItems[i] || pt;
    return {
      status: pt.status,
      en: { title: en.title, summary: en.summary, link: en.link },
      pt: { title: pt.title, summary: pt.summary, link: pt.link }
    };
  });

  const output = {
    generatedAt: new Date().toISOString(),
    profileUrl: { en: PROFILE_URL_EN, pt: PROFILE_URL_PT },
    items: items
  };

  await writeFile(OUTPUT_PATH, JSON.stringify(output, null, 2) + "\n", "utf8");
  console.log(`Wrote ${items.length} research items to ${OUTPUT_PATH}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

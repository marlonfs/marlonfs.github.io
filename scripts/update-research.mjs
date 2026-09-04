#!/usr/bin/env node
// Scrapes the "Bolsas no país" (grants) widget from a public FAPESP researcher
// profile and writes assets/research.json. FAPESP's robots.txt allows crawling
// this page; this makes one infrequent, well-behaved request.

import { writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const PROFILE_URL =
  process.env.FAPESP_PROFILE_URL ||
  "https://bv.fapesp.br/pt/pesquisador/705016/marlon-fernandes-de-souza";
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
  if (l.indexOf("andamento") !== -1) return "ongoing";
  if (l.indexOf("conclu") !== -1) return "completed";
  return "other";
}

function parseGrants(html) {
  const marker = html.indexOf("Bolsas no país");
  if (marker === -1) return [];
  // The widget is a small, self-contained block right after the marker.
  const scope = html.slice(marker, marker + 8000);

  const items = [];
  const boxRe = /<span class="bv_h1">([^<]+)<\/span>[\s\S]*?<ul class="list-coloured">([\s\S]*?)<\/ul>/g;
  let boxMatch;

  while ((boxMatch = boxRe.exec(scope)) !== null) {
    const status = statusFromLabel(boxMatch[1]);
    const ulContent = boxMatch[2];

    const liRe = /<h3>Resumo<\/h3><p>([\s\S]*?)<\/p><\/div><\/div><a href="([^"]+)">([\s\S]*?)<\/a>/g;
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

async function main() {
  const res = await fetch(PROFILE_URL, { headers: { "User-Agent": USER_AGENT } });
  if (!res.ok) {
    throw new Error(`FAPESP request failed: HTTP ${res.status} for ${PROFILE_URL}`);
  }
  const html = await res.text();
  const items = parseGrants(html);

  if (items.length === 0) {
    throw new Error("No grants parsed — FAPESP may have changed its page markup, or this profile has no 'Bolsas no país' widget.");
  }

  const output = {
    generatedAt: new Date().toISOString(),
    profileUrl: PROFILE_URL,
    items: items
  };

  await writeFile(OUTPUT_PATH, JSON.stringify(output, null, 2) + "\n", "utf8");
  console.log(`Wrote ${items.length} research items to ${OUTPUT_PATH}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

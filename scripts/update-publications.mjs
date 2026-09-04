#!/usr/bin/env node
// Scrapes a public Google Scholar profile and writes assets/publications.json.
// Google Scholar has no official API, so this parses the public HTML profile page.
// Run weekly by .github/workflows/update-publications.yml — keep requests infrequent
// and rate-limited to stay a well-behaved, occasional reader of a public page.

import { writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const SCHOLAR_USER_ID = process.env.SCHOLAR_USER_ID || "c22yUfAAAAAJ";
const OUTPUT_PATH = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "assets",
  "publications.json"
);
const PAGE_SIZE = 100;
const MAX_PAGES = 5; // safety cap: up to 500 publications
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

function parseRows(html) {
  const rows = [];
  const rowRe = /<tr class="gsc_a_tr">([\s\S]*?)<\/tr>/g;
  let rowMatch;

  while ((rowMatch = rowRe.exec(html)) !== null) {
    const row = rowMatch[1];

    const titleMatch = row.match(/<a href="([^"]+)" class="gsc_a_at">([\s\S]*?)<\/a>/);
    if (!titleMatch) continue;

    const link = "https://scholar.google.com" + decodeEntities(titleMatch[1]);
    const title = stripTags(titleMatch[2]);

    const grayDivs = [...row.matchAll(/<div class="gs_gray">([\s\S]*?)<\/div>/g)].map((m) => m[1]);
    const authors = grayDivs[0] ? stripTags(grayDivs[0]) : "";
    const venue = grayDivs[1] ? stripTags(grayDivs[1].replace(/<span class="gs_oph">[\s\S]*?<\/span>/, "")) : "";

    const yearMatch = row.match(/class="gsc_a_h gsc_a_hc gs_ibl">(\d{4})</);
    const year = yearMatch ? yearMatch[1] : null;

    const citedMatch = row.match(/class="gsc_a_ac gs_ibl">(\d+)</);
    const citedBy = citedMatch ? parseInt(citedMatch[1], 10) : 0;

    rows.push({ title, authors, venue, year, citedBy, link });
  }

  return rows;
}

async function fetchPage(cstart) {
  const url = `https://scholar.google.com/citations?user=${SCHOLAR_USER_ID}&hl=en&cstart=${cstart}&pagesize=${PAGE_SIZE}`;
  const res = await fetch(url, { headers: { "User-Agent": USER_AGENT } });
  if (!res.ok) {
    throw new Error(`Google Scholar request failed: HTTP ${res.status} for ${url}`);
  }
  return res.text();
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  const all = [];

  for (let page = 0; page < MAX_PAGES; page++) {
    const html = await fetchPage(page * PAGE_SIZE);
    const rows = parseRows(html);
    if (rows.length === 0) break;
    all.push(...rows);
    if (rows.length < PAGE_SIZE) break; // last page
    await sleep(2000);
  }

  if (all.length === 0) {
    throw new Error("No publications parsed — Google Scholar may have changed its page markup, or this run was blocked/rate-limited.");
  }

  all.sort((a, b) => {
    const yearDiff = (parseInt(b.year, 10) || 0) - (parseInt(a.year, 10) || 0);
    if (yearDiff !== 0) return yearDiff;
    return b.citedBy - a.citedBy;
  });

  const output = {
    generatedAt: new Date().toISOString(),
    profileUrl: `https://scholar.google.com/citations?user=${SCHOLAR_USER_ID}&hl=en`,
    items: all
  };

  await writeFile(OUTPUT_PATH, JSON.stringify(output, null, 2) + "\n", "utf8");
  console.log(`Wrote ${all.length} publications to ${OUTPUT_PATH}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

// Fetch rates -> decide whether to post -> render image + caption -> post.
//
//   node src/main.js --dry-run   make out/post.png and out/caption.txt, do not post
//   node src/main.js             post if something changed (or morning run)
//   node src/main.js --force     post even if nothing changed
//
// Environment:
//   FB_PAGE_ID, FB_PAGE_TOKEN   needed for a real post (GitHub Secrets)
//   SCHEDULE                    cron line of the scheduled run, set by the workflow
//   DRY_RUN=true / FORCE=true   same as the flags

import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { MORNING_CRON, OUT_DIR } from './config.js';
import { fetchLatest, extractRates } from './rates.js';
import { loadState, saveState, directions, hasChanged } from './state.js';
import { formatDateTime } from './format.js';
import { buildCaption } from './caption.js';
import { buildHtml, renderImage } from './render.js';
import { postPhoto } from './facebook.js';

const flag = (name) => process.argv.includes(`--${name}`) || process.env[name.toUpperCase().replace('-', '_')] === 'true';

async function setOutput(key, value) {
  if (!process.env.GITHUB_OUTPUT) return;
  const { appendFile } = await import('node:fs/promises');
  await appendFile(process.env.GITHUB_OUTPUT, `${key}=${value}\n`);
}

async function main() {
  const dryRun = flag('dry-run');
  const force = flag('force');
  const morning = (process.env.SCHEDULE || '').trim() === MORNING_CRON;

  console.log('Fetching rates...');
  const rates = extractRates(await fetchLatest());
  for (const [code, r] of Object.entries(rates)) console.log(`  ${code}: ${r.value}`);

  const state = await loadState();
  const changed = hasChanged(rates, state);
  console.log(`Changed since last post: ${changed}. Morning run: ${morning}. Force: ${force}.`);

  if (!changed && !morning && !force && !dryRun) {
    console.log('Nothing changed. Not posting.');
    await setOutput('posted', 'false');
    return;
  }

  const when = formatDateTime(new Date());
  const dirs = directions(rates, state);
  const caption = buildCaption(rates, when);

  await mkdir(OUT_DIR, { recursive: true });
  const imageFile = join(OUT_DIR, 'post.png');
  await renderImage(await buildHtml(rates, dirs, when), imageFile);
  await writeFile(join(OUT_DIR, 'caption.txt'), `${caption}\n`);
  console.log(`Image: ${imageFile}\nCaption:\n${caption}`);

  if (dryRun) {
    console.log(`Dry run: not posting${changed || morning ? '' : ' (and a real run would skip: nothing changed)'}.`);
    await setOutput('posted', 'false');
    return;
  }

  const result = await postPhoto({
    pageId: (process.env.FB_PAGE_ID || '').trim(),
    token: (process.env.FB_PAGE_TOKEN || '').trim(),
    imageFile,
    caption,
  });
  console.log(`Posted. Photo id: ${result.photoId}`);
  await saveState(rates, result);
  await setOutput('posted', 'true');
}

main().catch((err) => {
  console.error(`ERROR: ${err.message}`);
  process.exit(1);
});

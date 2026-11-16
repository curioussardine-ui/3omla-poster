import { readFile } from 'node:fs/promises';
import { GRAPH_API_VERSION } from './config.js';

// Publish a photo with a caption to a Facebook Page.
// Docs: https://developers.facebook.com/docs/graph-api/reference/page/photos/
// The token goes in the POST body (never in the URL) and is never printed.
export async function postPhoto({ pageId, token, imageFile, caption }) {
  if (!pageId || !/^\d+$/.test(pageId)) throw new Error('FB_PAGE_ID is missing or not a number');
  if (!token) throw new Error('FB_PAGE_TOKEN is missing');

  const form = new FormData();
  form.append('source', new Blob([await readFile(imageFile)], { type: 'image/png' }), 'rates.png');
  form.append('caption', caption);
  form.append('published', 'true');
  form.append('access_token', token);

  const url = `https://graph.facebook.com/${GRAPH_API_VERSION}/${pageId}/photos`;
  const res = await fetch(url, { method: 'POST', body: form, signal: AbortSignal.timeout(120000) });
  const body = await res.json().catch(() => ({}));

  if (!res.ok || body.error || !body.id) {
    const e = body.error || {};
    // Only safe fields from Meta's error; strip the token just in case.
    const msg = `Facebook error ${res.status}: ${e.type ?? ''} ${e.code ?? ''} ${e.message ?? 'no id returned'}`;
    throw new Error(msg.split(token).join('***'));
  }
  return { photoId: body.id, postId: body.post_id ?? null };
}

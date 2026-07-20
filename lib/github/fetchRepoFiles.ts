/**
 * Read-only helper: fetches specific file contents from the repo's main
 * branch via the GitHub Contents API. Used by the Diagnostician agent to
 * ground its diagnosis in the actual current code, and by the approval
 * flow to get the pre-patch content/sha before writing a fix branch.
 */

const GITHUB_OWNER = process.env.GITHUB_REPO_OWNER || 'sandhyasneha';
const GITHUB_REPO = process.env.GITHUB_REPO_NAME || 'archai-frontend';
const BASE_BRANCH = process.env.GITHUB_BASE_BRANCH || 'main';
const API_ROOT = 'https://api.github.com';

export async function fetchRepoFile(path: string): Promise<string> {
  const res = await fetch(
    `${API_ROOT}/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${path}?ref=${BASE_BRANCH}`,
    {
      headers: {
        Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
      },
    }
  );
  if (!res.ok) throw new Error(`Could not fetch ${path}: ${res.status} ${await res.text()}`);
  const data = await res.json();
  return Buffer.from(data.content, 'base64').toString('utf-8');
}

export async function fetchRepoFiles(
  paths: string[]
): Promise<Array<{ path: string; content: string }>> {
  return Promise.all(
    paths.map(async (path) => ({ path, content: await fetchRepoFile(path) }))
  );
}

/**
 * MVP heuristic for picking which files are "relevant" to a ticket, since
 * we don't have a code-search/embeddings index yet. Maps a few known
 * keywords in the ticket description to likely file paths.
 *
 * TODO (future improvement): replace with an actual search — e.g. GitHub's
 * code search API (`/search/code`) scoped to this repo — instead of this
 * fixed keyword map, once ticket volume justifies it.
 */
const KEYWORD_FILE_MAP: Record<string, string[]> = {
  download: ['app/api/blueprints/download/route.ts'],
  json: ['app/api/blueprints/download/route.ts'],
  login: ['lib/supabase/middleware.ts', 'app/(auth)/signin/page.tsx'],
  'sign in': ['lib/supabase/middleware.ts', 'app/(auth)/signin/page.tsx'],
  verify: ['lib/email/verification.ts'],
  billing: ['app/api/stripe/webhook/route.ts', 'app/api/stripe/checkout/route.ts'],
  upgrade: ['app/settings/page.tsx', 'app/api/stripe/checkout/route.ts'],
  brownfield: ['app/brownfield/page.tsx'],
  greenfield: ['app/greenfield/page.tsx'],
};

export function guessRelevantPaths(description: string): string[] {
  const lower = description.toLowerCase();
  const matches = new Set<string>();
  for (const [keyword, paths] of Object.entries(KEYWORD_FILE_MAP)) {
    if (lower.includes(keyword)) paths.forEach((p) => matches.add(p));
  }
  return Array.from(matches);
}

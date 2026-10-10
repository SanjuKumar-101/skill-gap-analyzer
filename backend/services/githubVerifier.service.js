const { getClient, extractJson, NIM_MODEL } = require('./nim.service');

/* ------------------------------------------------------------------ */
/* Configuration                                                       */
/* ------------------------------------------------------------------ */

const GITHUB_API_BASE = 'https://api.github.com';
const GITHUB_RAW_BASE = 'https://raw.githubusercontent.com';
const USER_AGENT = 'skillgo-verifier';

const MAX_FILES = 14;
const MAX_FILE_CHARS = 3500;
const MAX_TOTAL_CHARS = 22000;
const MAX_TREE_ENTRIES = 200;
const MAX_BLOB_BYTES = 400000;

const PRIORITY_FILENAMES = [
  'package.json',
  'requirements.txt',
  'pyproject.toml',
  'setup.py',
  'pom.xml',
  'build.gradle',
  'build.gradle.kts',
  'go.mod',
  'cargo.toml',
  'composer.json',
  'gemfile',
  'dockerfile',
  'docker-compose.yml',
  'docker-compose.yaml',
  'tsconfig.json',
  'angular.json',
  'next.config.js',
  'next.config.mjs',
  'vite.config.js',
  'vite.config.ts',
  'nuxt.config.js',
  'svelte.config.js',
  'makefile',
  'procfile',
];

const CORE_FILE_PATTERN =
  /(route|router|controller|service|model|middleware|handler|schema|repository|resolver|reducer|action|store|util|helper|config|server|app|index|main)/i;

const CODE_EXTENSIONS = [
  '.js',
  '.jsx',
  '.ts',
  '.tsx',
  '.mjs',
  '.cjs',
  '.py',
  '.java',
  '.kt',
  '.kts',
  '.go',
  '.rb',
  '.php',
  '.cs',
  '.rs',
  '.swift',
  '.vue',
  '.svelte',
  '.scala',
  '.dart',
  '.sh',
  '.sql',
  '.graphql',
  '.gql',
  '.yml',
  '.yaml',
  '.json',
  '.toml',
  '.tf',
];

const IGNORED_SEGMENTS = [
  'node_modules/',
  '/dist/',
  '/build/',
  '/.git/',
  '/vendor/',
  '/coverage/',
  '/out/',
  '/.next/',
  '/.nuxt/',
  '/target/',
  '/__snapshots__/',
  '/__mocks__/',
];

const IGNORED_FILENAMES = [
  'package-lock.json',
  'yarn.lock',
  'pnpm-lock.yaml',
  'composer.lock',
  'poetry.lock',
  'cargo.lock',
  'gemfile.lock',
  'go.sum',
];

const SYSTEM_PROMPT = [
  'You are a meticulous senior software engineer performing a proof-of-work code audit.',
  'You decide whether a developer has genuinely implemented a specific skill in a repository,',
  'based only on the file tree and source snippets you are given.',
  'You must respond with a single valid JSON object and nothing else.',
  'Do not wrap the JSON in Markdown code fences. Do not write any text before or after the JSON.',
].join(' ');

/* ------------------------------------------------------------------ */
/* Small helpers                                                       */
/* ------------------------------------------------------------------ */

function httpError(statusCode, message) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function toText(value) {
  if (value === null || value === undefined) {
    return '';
  }
  if (typeof value === 'string') {
    return value.trim();
  }
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  return '';
}

function baseName(filePath) {
  const parts = String(filePath).split('/');
  return parts[parts.length - 1] || '';
}

function encodePathSegments(filePath) {
  return String(filePath)
    .split('/')
    .map((segment) => encodeURIComponent(segment))
    .join('/');
}

/**
 * Extract `owner` and `repo` from a GitHub URL (or `owner/repo` shorthand).
 */
function parseGitHubUrl(input) {
  const raw = String(input || '').trim();

  if (!raw) {
    throw httpError(400, 'A GitHub repository URL is required.');
  }

  let candidate = raw.replace(/^git@github\.com:/i, 'https://github.com/');
  candidate = candidate.replace(/\s+/g, '');
  candidate = candidate.replace(/\/+$/, '');
  candidate = candidate.replace(/\.git$/i, '');

  let owner = '';
  let repo = '';

  const urlMatch = candidate.match(
    /^(?:https?:\/\/)?(?:www\.)?github\.com\/([^/]+)\/([^/?#]+)/i
  );

  if (urlMatch) {
    owner = urlMatch[1];
    repo = urlMatch[2];
  } else {
    const shortMatch = candidate.match(/^([^/\s]+)\/([^/\s?#]+)$/);
    if (shortMatch) {
      owner = shortMatch[1];
      repo = shortMatch[2];
    }
  }

  owner = String(owner || '').replace(/[^A-Za-z0-9_.-]/g, '');
  repo = String(repo || '').replace(/[^A-Za-z0-9_.-]/g, '');

  if (!owner || !repo) {
    throw httpError(
      400,
      'That does not look like a valid GitHub repository URL. Use https://github.com/owner/repo.'
    );
  }

  return { owner, repo };
}

/* ------------------------------------------------------------------ */
/* GitHub REST API access                                              */
/* ------------------------------------------------------------------ */

async function githubFetch(url) {
  const headers = {
    'User-Agent': USER_AGENT,
    Accept: 'application/vnd.github+json',
  };

  if (process.env.GITHUB_TOKEN) {
    headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  }

  let response;
  try {
    response = await fetch(url, { headers });
  } catch (networkError) {
    throw httpError(502, 'Could not reach the GitHub API. Please try again.');
  }

  if (!response.ok) {
    if (response.status === 404) {
      throw httpError(
        404,
        'Repository not found on GitHub. Make sure the repository is public and the URL is correct.'
      );
    }
    if (response.status === 403 || response.status === 429) {
      throw httpError(
        429,
        'GitHub API rate limit reached for this server. Please try again later.'
      );
    }
    throw httpError(502, `GitHub API request failed with status ${response.status}.`);
  }

  return response;
}

function isCandidateFile(filePath) {
  const lower = String(filePath).toLowerCase();

  if (IGNORED_SEGMENTS.some((segment) => lower.includes(segment))) {
    return false;
  }

  if (IGNORED_FILENAMES.some((name) => lower.endsWith(name))) {
    return false;
  }

  return CODE_EXTENSIONS.some((extension) => lower.endsWith(extension));
}

/**
 * Pick the most informative files from the repository tree: manifests,
 * configuration, and core route/controller/service/model source files.
 */
function selectKeyFiles(blobs) {
  const selected = [];
  const seen = new Set();

  const add = (filePath) => {
    if (!filePath || seen.has(filePath) || selected.length >= MAX_FILES) {
      return;
    }
    seen.add(filePath);
    selected.push(filePath);
  };

  const candidates = blobs.filter((blob) => isCandidateFile(blob.path));

  candidates
    .filter((blob) => PRIORITY_FILENAMES.includes(baseName(blob.path).toLowerCase()))
    .forEach((blob) => add(blob.path));

  candidates
    .filter((blob) => /(^|\/)(\.github\/workflows|config|configs|settings)\//i.test(blob.path))
    .forEach((blob) => add(blob.path));

  candidates
    .filter((blob) => CORE_FILE_PATTERN.test(baseName(blob.path)))
    .forEach((blob) => add(blob.path));

  candidates
    .filter((blob) => !seen.has(blob.path))
    .sort((a, b) => {
      const depthDiff = a.path.split('/').length - b.path.split('/').length;
      if (depthDiff !== 0) {
        return depthDiff;
      }
      return (a.size || 0) - (b.size || 0);
    })
    .forEach((blob) => add(blob.path));

  return selected;
}

async function fetchFileContent(owner, repo, branch, filePath) {
  const encodedPath = encodePathSegments(filePath);

  try {
    const rawResponse = await fetch(
      `${GITHUB_RAW_BASE}/${owner}/${repo}/${branch}/${encodedPath}`,
      { headers: { 'User-Agent': USER_AGENT } }
    );
    if (rawResponse.ok) {
      return await rawResponse.text();
    }
  } catch (rawError) {
    // Fall through to the authenticated contents API below.
  }

  const apiResponse = await githubFetch(
    `${GITHUB_API_BASE}/repos/${owner}/${repo}/contents/${encodedPath}?ref=${encodeURIComponent(
      branch
    )}`
  );

  const payload = await apiResponse.json();

  if (payload && payload.content && payload.encoding === 'base64') {
    return Buffer.from(payload.content, 'base64').toString('utf8');
  }

  if (typeof payload === 'string') {
    return payload;
  }

  return '';
}

async function collectRepoEvidence(owner, repo) {
  const repoResponse = await githubFetch(`${GITHUB_API_BASE}/repos/${owner}/${repo}`);
  const repoData = await repoResponse.json();

  const branch = repoData.default_branch || 'main';

  const treeResponse = await githubFetch(
    `${GITHUB_API_BASE}/repos/${owner}/${repo}/git/trees/${encodeURIComponent(branch)}?recursive=1`
  );
  const treeData = await treeResponse.json();

  const blobs = (Array.isArray(treeData.tree) ? treeData.tree : [])
    .filter((node) => node && node.type === 'blob' && node.path)
    .map((node) => ({ path: node.path, size: node.size || 0 }));

  const fileTree = blobs.slice(0, MAX_TREE_ENTRIES).map((blob) => blob.path);
  const selectedFiles = selectKeyFiles(blobs.filter((blob) => blob.size <= MAX_BLOB_BYTES));

  const snippets = [];
  let totalChars = 0;

  for (const filePath of selectedFiles) {
    if (totalChars >= MAX_TOTAL_CHARS) {
      break;
    }

    let content = '';
    try {
      content = await fetchFileContent(owner, repo, branch, filePath);
    } catch (readError) {
      content = '';
    }

    const trimmed = String(content || '').trim();
    if (!trimmed) {
      continue;
    }

    const remaining = MAX_TOTAL_CHARS - totalChars;
    const piece = trimmed.slice(0, Math.min(MAX_FILE_CHARS, remaining));

    snippets.push(`### FILE: ${filePath}\n${piece}`);
    totalChars += piece.length;
  }

  return {
    fullName: `${owner}/${repo}`,
    branch,
    description: toText(repoData.description),
    language: toText(repoData.language),
    stars: typeof repoData.stargazers_count === 'number' ? repoData.stargazers_count : 0,
    fileTree,
    selectedFiles,
    snippets,
  };
}

/* ------------------------------------------------------------------ */
/* AI audit                                                            */
/* ------------------------------------------------------------------ */

function buildAuditPrompt(skillName, evidence) {
  const lines = [
    `Target skill to verify: "${skillName}"`,
    '',
    `Repository: ${evidence.fullName}`,
    `Default branch: ${evidence.branch}`,
    evidence.language ? `Primary language: ${evidence.language}` : '',
    evidence.description ? `Description: ${evidence.description}` : '',
    '',
    'Repository file tree (partial):',
    evidence.fileTree.length > 0 ? evidence.fileTree.join('\n') : '(no files listed)',
    '',
    'Selected source file contents:',
    evidence.snippets.length > 0
      ? evidence.snippets.join('\n\n')
      : '(no readable source files were found)',
    '',
    `Audit this codebase to verify if the skill "${skillName}" is implemented.`,
    'Return a JSON object with EXACTLY this structure:',
    '{',
    '  "verified": true or false,',
    '  "confidenceScore": 0,',
    '  "evidenceSnippet": "verbatim code excerpt or file reference proving your verdict",',
    '  "explanation": "2 to 3 sentences explaining the verdict with specific file names"',
    '}',
    '',
    'Strict rules:',
    `- "verified" must be true only when you can point to concrete code in the provided snippets that implements "${skillName}".`,
    '- Do not credit a skill merely because a dependency is listed; look for usage in the code.',
    '- "confidenceScore" is an integer from 0 to 100 reflecting how certain you are.',
    '- "evidenceSnippet" must be copied verbatim from the provided snippets (keep it under ~40 lines). If you cannot find evidence, return the most relevant file reference or an empty string.',
    '- "explanation" must reference specific files or paths.',
    '- Do not add any other keys. Return JSON only.',
  ];

  return lines.filter((line) => line !== '').join('\n');
}

function normalizeVerification(raw) {
  const verified = raw && raw.verified === true;

  let confidence = Number(raw && raw.confidenceScore);
  if (!Number.isFinite(confidence)) {
    confidence = 0;
  }
  confidence = Math.max(0, Math.min(100, Math.round(confidence)));

  const evidenceSnippet = toText(raw && raw.evidenceSnippet).slice(0, 1600);
  const explanation = toText(raw && raw.explanation).slice(0, 1600);

  return {
    verified,
    confidenceScore: confidence,
    evidenceSnippet,
    explanation,
  };
}

async function runNimAudit(skillName, evidence) {
  const client = getClient();

  let completion;
  try {
    completion = await client.chat.completions.create({
      model: NIM_MODEL,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: buildAuditPrompt(skillName, evidence) },
      ],
      temperature: 0.1,
      top_p: 0.9,
      max_tokens: 1600,
    });
  } catch (error) {
    const wrapped = new Error(
      `NVIDIA NIM request failed: ${error && error.message ? error.message : 'unknown error'}`
    );
    wrapped.statusCode = error && error.status ? error.status : 502;
    throw wrapped;
  }

  const content =
    completion && completion.choices && completion.choices[0] && completion.choices[0].message
      ? completion.choices[0].message.content
      : '';

  return normalizeVerification(extractJson(content));
}

/* ------------------------------------------------------------------ */
/* Public API                                                          */
/* ------------------------------------------------------------------ */

/**
 * Fetch a public GitHub repository and ask NVIDIA NIM to verify whether the
 * given skill is actually implemented in the code.
 *
 * @param {{ skillName: string, githubUrl: string }} params
 * @returns {Promise<{verified: boolean, confidenceScore: number, evidenceSnippet: string, explanation: string, repoFullName: string, branch: string, filesScanned: number}>}
 */
async function verifySkillWithGitHub({ skillName, githubUrl }) {
  const skill = toText(skillName);

  if (!skill) {
    throw httpError(400, 'A skill name is required to verify.');
  }

  const { owner, repo } = parseGitHubUrl(githubUrl);
  const evidence = await collectRepoEvidence(owner, repo);
  const verification = await runNimAudit(skill, evidence);

  return {
    ...verification,
    repoFullName: evidence.fullName,
    branch: evidence.branch,
    filesScanned: evidence.snippets.length,
  };
}

module.exports = {
  verifySkillWithGitHub,
  parseGitHubUrl,
  selectKeyFiles,
};

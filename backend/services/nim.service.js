const OpenAI = require('openai');

/* ------------------------------------------------------------------ */
/* NVIDIA NIM configuration                                            */
/* ------------------------------------------------------------------ */

const NIM_BASE_URL = 'https://integrate.api.nvidia.com/v1';
const NIM_MODEL = process.env.NVIDIA_MODEL || 'nvidia/nemotron-3-super-120b-a12b';
const MAX_RESUME_CHARS = 14000;
const MAX_JD_CHARS = 6000;

let client = null;

/**
 * Lazily create (and cache) the NVIDIA NIM client using the OpenAI SDK
 * pointed at NVIDIA's OpenAI-compatible endpoint.
 */
function getClient() {
  if (!process.env.NVIDIA_API_KEY) {
    const error = new Error(
      'NVIDIA_API_KEY is not configured on the server. Add it to backend/.env to enable AI analysis.'
    );
    error.statusCode = 500;
    throw error;
  }

  if (!client) {
    client = new OpenAI({
      apiKey: process.env.NVIDIA_API_KEY,
      baseURL: NIM_BASE_URL,
    });
  }

  return client;
}

/* ------------------------------------------------------------------ */
/* Prompt engineering                                                  */
/* ------------------------------------------------------------------ */

const SYSTEM_PROMPT = [
  'You are an expert technical career coach and skills-gap analyst.',
  'You compare a candidate resume against a target role and produce a rigorous, role-specific report.',
  'You must respond with a single valid JSON object and nothing else.',
  'Do not wrap the JSON in Markdown code fences. Do not write any text before or after the JSON.',
  'Every string value must be plain text with no line breaks.',
].join(' ');

function buildUserPrompt(resumeText, targetRoleName, targetType) {
  const targetContext =
    targetType === 'company'
      ? `The candidate is targeting a role at the company "${targetRoleName}".`
      : targetType === 'studies'
      ? `The candidate is preparing for higher studies: ${targetRoleName}.`
      : `The candidate is targeting the role described by this job description:\n"""\n${targetRoleName.slice(
          0,
          MAX_JD_CHARS
        )}\n"""`;

  return [
    targetContext,
    '',
    'Here is the candidate resume, extracted from a PDF:',
    '"""',
    resumeText,
    '"""',
    '',
    'Analyse the resume against the target and return a JSON object with EXACTLY this structure:',
    '{',
    '  "parsedRequirements": ["requirement text", "requirement text"],',
    '  "gapAnalysis": [',
    '    { "skill": "skill name", "priority": "High", "reason": "why this is a gap for this target" }',
    '  ],',
    '  "weeklyModules": [',
    '    {',
    '      "week": 1,',
    '      "theme": "short theme for the week",',
    '      "tasks": ["concrete task", "concrete task", "concrete task"],',
    '      "quiz": {',
    '        "question": "a multiple-choice question about this week topic",',
    '        "options": ["option A", "option B", "option C", "option D"],',
    '        "correctAnswer": 0',
    '      }',
    '    }',
    '  ]',
    '}',
    '',
    'Strict rules:',
    '- parsedRequirements: 8 to 15 concise skills or qualifications that the target role requires.',
    '- gapAnalysis: 6 to 12 items covering both hard and soft skills. "priority" must be exactly one of "High", "Medium" or "Low". "reason" must explicitly compare the resume with the target.',
    '- weeklyModules: exactly 4 items with "week" values 1, 2, 3 and 4 and increasing difficulty.',
    '- Each quiz must have exactly 4 options and "correctAnswer" must be the 0-based index of the correct option.',
    '- Do not include any keys other than the ones shown above.',
    '- Return JSON only.',
  ].join('\n');
}

/* ------------------------------------------------------------------ */
/* Parsing and normalisation                                           */
/* ------------------------------------------------------------------ */

/**
 * Extract a JSON object from a model response that may contain extra text
 * or Markdown code fences.
 */
function extractJson(content) {
  if (!content || typeof content !== 'string') {
    const error = new Error('The AI model returned an empty response.');
    error.statusCode = 502;
    throw error;
  }

  const cleaned = content
    .replace(/```json/gi, '')
    .replace(/```/g, '')
    .trim();

  try {
    return JSON.parse(cleaned);
  } catch (directParseError) {
    const start = cleaned.indexOf('{');
    const end = cleaned.lastIndexOf('}');

    if (start !== -1 && end > start) {
      try {
        return JSON.parse(cleaned.slice(start, end + 1));
      } catch (sliceParseError) {
        const error = new Error('The AI model returned malformed JSON.');
        error.statusCode = 502;
        throw error;
      }
    }

    const error = new Error('The AI model did not return a JSON object.');
    error.statusCode = 502;
    throw error;
  }
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

function normalizePriority(value) {
  const text = toText(value).toLowerCase();
  if (text.startsWith('high')) {
    return 'High';
  }
  if (text.startsWith('med')) {
    return 'Medium';
  }
  return 'Low';
}

function normalizeRequirements(raw) {
  if (!Array.isArray(raw)) {
    return [];
  }

  return raw
    .map((item) => {
      if (typeof item === 'string') {
        return toText(item);
      }
      if (item && typeof item === 'object') {
        return toText(item.requirement || item.skill || item.name || item.label);
      }
      return toText(item);
    })
    .filter((item) => item.length > 0);
}

function normalizeGaps(raw) {
  if (!Array.isArray(raw)) {
    return [];
  }

  return raw
    .map((item) => {
      const record = item && typeof item === 'object' ? item : {};
      return {
        skill: toText(record.skill || record.name || record.title),
        priority: normalizePriority(record.priority || record.level),
        reason: toText(record.reason || record.rationale || record.why),
      };
    })
    .filter((item) => item.skill.length > 0);
}

function normalizeQuiz(raw) {
  const record = raw && typeof raw === 'object' ? raw : {};

  const options = Array.isArray(record.options)
    ? record.options.map((option) => toText(option)).filter((option) => option.length > 0)
    : [];

  let correct = record.correctAnswer;

  if (typeof correct === 'string') {
    const trimmed = correct.trim();
    if (/^[A-Fa-f]$/.test(trimmed)) {
      correct = trimmed.toUpperCase().charCodeAt(0) - 65;
    } else if (options.indexOf(trimmed) !== -1) {
      correct = options.indexOf(trimmed);
    } else {
      correct = parseInt(trimmed, 10);
    }
  }

  const validIndex =
    Number.isInteger(correct) && correct >= 0 && correct < options.length ? correct : 0;

  return {
    question: toText(record.question || record.prompt),
    options,
    correctAnswer: validIndex,
  };
}

function normalizeModules(raw) {
  const list = Array.isArray(raw) ? raw : [];

  return [0, 1, 2, 3].map((index) => {
    const item = list[index] && typeof list[index] === 'object' ? list[index] : {};

    const tasks = Array.isArray(item.tasks)
      ? item.tasks.map((task) => toText(task)).filter((task) => task.length > 0)
      : [];

    return {
      week: Number.isFinite(Number(item.week)) && Number(item.week) > 0 ? Number(item.week) : index + 1,
      theme: toText(item.theme || item.title) || `Week ${index + 1}`,
      tasks,
      quiz: normalizeQuiz(item.quiz),
    };
  });
}

/* ------------------------------------------------------------------ */
/* Public API                                                          */
/* ------------------------------------------------------------------ */

/**
 * Send the resume and target to NVIDIA NIM and return a normalised report.
 *
 * @param {string} resumeText Raw text extracted from the candidate's resume.
 * @param {string} targetRoleName Company name, higher-studies goal or job description text.
 * @param {'company'|'jd'|'studies'} targetType Type of target being analysed.
 * @returns {Promise<{parsedRequirements: string[], gapAnalysis: Array<{skill: string, priority: string, reason: string}>, weeklyModules: Array<object>}>}
 */
async function analyzeSkillGap(resumeText, targetRoleName, targetType) {
  const nimClient = getClient();

  const safeResume = String(resumeText || '').slice(0, MAX_RESUME_CHARS);

  let completion;

  try {
    completion = await nimClient.chat.completions.create({
      model: NIM_MODEL,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: buildUserPrompt(safeResume, String(targetRoleName || ''), targetType) },
      ],
      temperature: 0.2,
      top_p: 0.9,
      max_tokens: 4096,
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

  const raw = extractJson(content);

  return {
    parsedRequirements: normalizeRequirements(raw.parsedRequirements),
    gapAnalysis: normalizeGaps(raw.gapAnalysis),
    weeklyModules: normalizeModules(raw.weeklyModules),
  };
}

module.exports = {
  analyzeSkillGap,
  getClient,
  extractJson,
  NIM_MODEL,
  NIM_BASE_URL,
};

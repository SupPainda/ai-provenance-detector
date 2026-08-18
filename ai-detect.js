/**
 * ai-detect.js
 *
 * Shared AI detection engine for image metadata analysis.
 * Parses ExifTool text output into structured key-value pairs and evaluates
 * against a multi-tier rule set to determine if an image is AI-generated.
 */

// ---------------------------------------------------------------------------
// Known AI generator software identifiers (case-insensitive matching)
// ---------------------------------------------------------------------------
const AI_SOFTWARE_PATTERNS = [
  { pattern: /\bgpt[-_]?image\b/i, generator: 'ChatGPT / OpenAI' },
  { pattern: /\bdall[-·]?e\b/i, generator: 'DALL-E / OpenAI' },
  { pattern: /\bopenai\b/i, generator: 'OpenAI' },
  { pattern: /\bmidjourney\b/i, generator: 'Midjourney' },
  { pattern: /\badobe\s*firefly\b/i, generator: 'Adobe Firefly' },
  { pattern: /\bstable\s*diffusion\b/i, generator: 'Stable Diffusion' },
  { pattern: /\bautomatic1111\b/i, generator: 'Stable Diffusion (Automatic1111)' },
  { pattern: /\bcomfyui\b/i, generator: 'Stable Diffusion (ComfyUI)' },
  { pattern: /\binvokeai\b/i, generator: 'Stable Diffusion (InvokeAI)' },
  { pattern: /\bfooocus\b/i, generator: 'Stable Diffusion (Fooocus)' },
  { pattern: /\bleonardo(?:\.ai)?\b/i, generator: 'Leonardo.Ai' },
  { pattern: /\bideogram\b/i, generator: 'Ideogram' },
  { pattern: /\bflux\b/i, generator: 'Flux' },
  { pattern: /\bbing\s*image\s*creator\b/i, generator: 'Bing Image Creator' },
  { pattern: /\bgoogle\s*imagen\b/i, generator: 'Google Imagen' },
  { pattern: /\bgemini\b/i, generator: 'Google Gemini' },
];

// Tags that carry software / agent identity information
const SOFTWARE_TAG_KEYS = [
  'actions software agent name',
  'software',
  'creator tool',
  'history software agent',
  'claim generator info name',
  'processing software',
  'source',
];

// Tags containing IPTC digital source type
const DIGITAL_SOURCE_TAG_KEYS = ['actions digital source type', 'digital source type'];

// Stable Diffusion parameters pattern (PNG tEXt chunk)
const SD_PARAMS_REGEX = /Steps:\s*\d+.*?Sampler:\s*.+?CFG\s*scale:/is;

// Minimum number of non-system metadata tags expected in a normal image
const MIN_METADATA_TAG_COUNT = 5;

// System-level tags that don't count as real image metadata
const SYSTEM_TAG_GROUPS = ['exiftool', 'system', 'file', 'composite'];

// ---------------------------------------------------------------------------
// Parser: ExifTool text → structured tag list
// ---------------------------------------------------------------------------

/**
 * Parses ExifTool `-a -u -g1` text output into an array of { group, key, value } objects.
 *
 * ExifTool grouped output looks like:
 *   ---- GroupName ----
 *   Tag Name                        : Tag Value
 *
 * @param {string} text  Raw ExifTool stdout
 * @returns {{ group: string, key: string, value: string }[]}
 */
function parseExifToolOutput(text) {
  const tags = [];
  let currentGroup = '';
  const lines = text.split(/\r?\n/);

  for (const line of lines) {
    // Group header: ---- GroupName ----
    const groupMatch = line.match(/^-{4}\s+(.+?)\s+-{4}$/);
    if (groupMatch) {
      currentGroup = groupMatch[1].trim();
      continue;
    }

    // Tag line: Key                        : Value
    const tagMatch = line.match(/^(.+?)\s*:\s+(.+)$/);
    if (tagMatch) {
      tags.push({
        group: currentGroup,
        key: tagMatch[1].trim(),
        value: tagMatch[2].trim(),
      });
    }
  }

  return tags;
}

// ---------------------------------------------------------------------------
// Detection Engine
// ---------------------------------------------------------------------------

/**
 * Analyzes parsed ExifTool tags for AI generation evidence.
 *
 * @param {string} exifToolText  Raw ExifTool stdout text
 * @returns {{
 *   isAI: boolean,
 *   confidence: 'HIGH' | 'MEDIUM' | 'LOW',
 *   generator: string | null,
 *   reasons: string[],
 *   metadataStripped: boolean,
 *   matches: { tag: string, value: string, rule: string, confidence: string }[]
 * }}
 */
function analyzeAI(exifToolText) {
  const tags = parseExifToolOutput(exifToolText);

  const result = {
    isAI: false,
    confidence: 'LOW',
    generator: null,
    reasons: [],
    metadataStripped: false,
    matches: [],
  };

  // --------------------------------------------------
  // Check for stripped metadata
  // --------------------------------------------------
  const contentTags = tags.filter((t) => !SYSTEM_TAG_GROUPS.includes(t.group.toLowerCase()));

  if (contentTags.length < MIN_METADATA_TAG_COUNT) {
    result.metadataStripped = true;
    result.reasons.push(`Only ${contentTags.length} content metadata tag(s) found — metadata may have been stripped`);
    // Stripped = no proof, stays LOW
  }

  // --------------------------------------------------
  // Rule 1: IPTC Digital Source Type
  // --------------------------------------------------
  for (const tag of tags) {
    const keyLower = tag.key.toLowerCase();
    if (DIGITAL_SOURCE_TAG_KEYS.includes(keyLower)) {
      if (/trainedAlgorithmicMedia/i.test(tag.value)) {
        addMatch(result, 'HIGH', tag.key, tag.value, 'IPTC Digital Source Type: trainedAlgorithmicMedia');
        setGenerator(result, extractGeneratorFromTags(tags));
      }
      if (/compositeWithTrainedAlgorithmicMedia/i.test(tag.value)) {
        addMatch(result, 'HIGH', tag.key, tag.value, 'IPTC Digital Source Type: compositeWithTrainedAlgorithmicMedia');
        setGenerator(result, extractGeneratorFromTags(tags));
      }
    }
  }

  // --------------------------------------------------
  // Rule 2: C2PA Action = c2pa.created
  // --------------------------------------------------
  for (const tag of tags) {
    if (tag.key.toLowerCase() === 'actions action') {
      const actions = tag.value.split(',').map((a) => a.trim().toLowerCase());

      if (actions.includes('c2pa.created')) {
        // Check it's NOT also a camera capture
        if (!actions.includes('c2pa.captured')) {
          addMatch(
            result,
            'HIGH',
            tag.key,
            tag.value,
            'C2PA action indicates content was created (not captured by camera)',
          );
          setGenerator(result, extractGeneratorFromTags(tags));
        }
      }
    }
  }

  // --------------------------------------------------
  // Rule 3: Known AI software agent
  // --------------------------------------------------
  for (const tag of tags) {
    const keyLower = tag.key.toLowerCase();
    if (SOFTWARE_TAG_KEYS.includes(keyLower)) {
      for (const sw of AI_SOFTWARE_PATTERNS) {
        if (sw.pattern.test(tag.value)) {
          addMatch(result, 'HIGH', tag.key, tag.value, `Known AI software agent: ${sw.generator}`);
          setGenerator(result, sw.generator);
        }
      }
    }
  }

  // --------------------------------------------------
  // Rule 4: Stable Diffusion parameters chunk
  // --------------------------------------------------
  // SD embeds generation params in PNG tEXt as "parameters" key.
  // We check the raw text since ExifTool may render it as a single multi-line value.
  if (SD_PARAMS_REGEX.test(exifToolText)) {
    addMatch(
      result,
      'HIGH',
      'Parameters (PNG tEXt)',
      '(SD generation parameters detected)',
      'Stable Diffusion generation parameters found in PNG metadata',
    );
    setGenerator(result, 'Stable Diffusion');
  }

  // --------------------------------------------------
  // Rule 5: C2PA/JUMBF present without c2pa.captured
  // --------------------------------------------------
  const hasJUMBF = tags.some((t) => t.group.toLowerCase() === 'jumbf' || t.group.toLowerCase() === 'cbor');
  if (hasJUMBF && result.confidence !== 'HIGH') {
    // JUMBF/C2PA is present but none of the HIGH-confidence rules matched.
    // This could be a camera with C2PA (Sony, Leica) or an AI tool we don't recognize.
    const hasCaptured = tags.some((t) => t.key.toLowerCase() === 'actions action' && /c2pa\.captured/i.test(t.value));

    if (!hasCaptured) {
      addMatch(
        result,
        'MEDIUM',
        'JUMBF/CBOR group',
        '(present)',
        'C2PA/JUMBF provenance metadata present without camera capture action',
      );
    }
    // If c2pa.captured IS present, this is likely a real camera — don't flag.
  }

  // --------------------------------------------------
  // Rule 6: AI-related XMP Creator Tool (broader check)
  // --------------------------------------------------
  if (result.confidence !== 'HIGH') {
    for (const tag of tags) {
      const keyLower = tag.key.toLowerCase();
      if (keyLower === 'creator tool' || keyLower === 'history software agent') {
        for (const sw of AI_SOFTWARE_PATTERNS) {
          if (sw.pattern.test(tag.value)) {
            addMatch(result, 'MEDIUM', tag.key, tag.value, `AI-related creator tool: ${sw.generator}`);
            setGenerator(result, sw.generator);
          }
        }
      }
    }
  }

  return result;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function addMatch(result, confidence, tag, value, rule) {
  result.matches.push({ tag, value, rule, confidence });
  result.reasons.push(rule);

  // Promote confidence level (HIGH > MEDIUM > LOW)
  const rank = { LOW: 0, MEDIUM: 1, HIGH: 2 };
  if (rank[confidence] > rank[result.confidence]) {
    result.confidence = confidence;
  }

  if (confidence === 'HIGH' || confidence === 'MEDIUM') {
    result.isAI = true;
  }
}

function setGenerator(result, generator) {
  if (generator && !result.generator) {
    result.generator = generator;
  }
}

/**
 * Attempts to extract a generator name from software agent tags.
 */
function extractGeneratorFromTags(tags) {
  for (const tag of tags) {
    const keyLower = tag.key.toLowerCase();
    if (SOFTWARE_TAG_KEYS.includes(keyLower)) {
      for (const sw of AI_SOFTWARE_PATTERNS) {
        if (sw.pattern.test(tag.value)) {
          return sw.generator;
        }
      }
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

module.exports = { analyzeAI, parseExifToolOutput };

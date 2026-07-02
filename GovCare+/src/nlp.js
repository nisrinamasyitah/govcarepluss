import { pipeline, env } from '@xenova/transformers';

env.allowLocalModels = false;

// Ministry labels with descriptive text for better zero-shot accuracy
const ENTRIES = [
  { ministry: 'Health',                    label: 'health medical hospital clinic doctor nurse disease patient medicine treatment' },
  { ministry: 'Transport',                 label: 'public transport road traffic bus train highway toll parking accident' },
  { ministry: 'Education',                 label: 'school university college teacher student education exam scholarship curriculum' },
  { ministry: 'Works & Infrastructure',    label: 'road infrastructure construction drainage flood building pipe water electricity pothole' },
  { ministry: 'Home Affairs',              label: 'police crime robbery safety security immigration passport identity card enforcement' },
  { ministry: 'Environment & Cleanliness', label: 'rubbish garbage waste pollution environment cleanliness dirty river air quality mosquito' },
];

const LABELS = ENTRIES.map(e => e.label);

let _pipelinePromise = null;

function getPipeline() {
  if (!_pipelinePromise) {
    _pipelinePromise = pipeline('zero-shot-classification', 'Xenova/nli-deberta-v3-small');
  }
  return _pipelinePromise;
}

export async function bertClassify(text) {
  if (!text || text.trim().length < 10) return null;
  const classifier = await getPipeline();
  const output = await classifier(text.trim(), LABELS, { multi_label: false });

  const allScores = {};
  ENTRIES.forEach((e, i) => {
    const idx = output.labels.indexOf(LABELS[i]);
    allScores[e.ministry] = idx >= 0 ? Math.round(output.scores[idx] * 100) : 0;
  });

  const best = Object.entries(allScores).sort((a, b) => b[1] - a[1])[0];
  return {
    ministry:   best[0],
    confidence: Math.min(best[1], 97),
    allScores,
  };
}

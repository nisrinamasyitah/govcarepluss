import { pipeline, env } from '@xenova/transformers';

env.allowLocalModels = false;

const ENTRIES = [
  { ministry: 'Health',                    label: 'health medical hospital clinic doctor nurse disease patient medicine treatment sick injury' },
  { ministry: 'Transport',                 label: 'public transport road traffic bus train highway toll parking accident vehicle commute' },
  { ministry: 'Education',                 label: 'school university college teacher student education exam scholarship curriculum study learning' },
  { ministry: 'Works & Infrastructure',    label: 'road infrastructure construction drainage flood building pipe water electricity pothole street light lamp post repair broken maintenance' },
  { ministry: 'Home Affairs',              label: 'police crime robbery theft assault safety security immigration passport identity card enforcement law' },
  { ministry: 'Environment & Cleanliness', label: 'rubbish garbage waste pollution environment cleanliness dirty river air quality smoke mosquito pest rat' },
];

// Keyword fallback for Malay/low-confidence cases
const KEYWORDS = {
  'Health':                    ['hospital','klinik','doktor','ubat','sakit','penyakit','doctor','clinic','nurse','medicine','patient','disease','dengue','ambulance','health'],
  'Transport':                 ['bas','tren','lrt','mrt','lebuhraya','tol','kesesakan','bus','train','highway','traffic','toll','parking','transport','road accident'],
  'Education':                 ['sekolah','guru','pelajar','universiti','peperiksaan','school','teacher','student','university','exam','education','college','tuition'],
  'Works & Infrastructure':    ['jalan','lampu','bangunan','saliran','longkang','banjir','paip','pothole','road','streetlight','lamp','drain','flood','pipe','building','construction','infrastructure','electricity','water supply','repair','broken','rosak','gelap'],
  'Home Affairs':              ['polis','jenayah','dadah','keselamatan','pasport','mykad','police','crime','drug','safety','passport','immigration','robbery','theft'],
  'Environment & Cleanliness': ['sampah','sungai','pencemaran','bau','tikus','nyamuk','rubbish','garbage','pollution','river','mosquito','rat','dirty','waste','cleanliness'],
};

function keywordClassify(text) {
  const lower = text.toLowerCase();
  const scores = {};
  for (const [ministry, kws] of Object.entries(KEYWORDS)) {
    scores[ministry] = kws.filter(k => lower.includes(k)).length;
  }
  const total = Object.values(scores).reduce((a, b) => a + b, 0);
  if (total === 0) return null;
  const sorted = Object.entries(scores).sort((a, b) => b[1] - a[1]);
  const confidence = Math.min(Math.round((sorted[0][1] / total) * 100 * 1.5), 97);
  return { ministry: sorted[0][0], confidence, allScores: Object.fromEntries(sorted.map(([m, s]) => [m, Math.round((s / total) * 100)])) };
}

let _pipelinePromise = null;
function getPipeline() {
  if (!_pipelinePromise) _pipelinePromise = pipeline('zero-shot-classification', 'Xenova/nli-deberta-v3-small');
  return _pipelinePromise;
}

export async function bertClassify(text) {
  if (!text || text.trim().length < 10) return null;

  const classifier = await getPipeline();
  const labels = ENTRIES.map(e => e.label);
  const output = await classifier(text.trim(), labels, { multi_label: false });

  const allScores = {};
  ENTRIES.forEach((e, i) => {
    const idx = output.labels.indexOf(labels[i]);
    allScores[e.ministry] = idx >= 0 ? Math.round(output.scores[idx] * 100) : 0;
  });

  const best = Object.entries(allScores).sort((a, b) => b[1] - a[1])[0];
  const bertConfidence = best[1];

  // If BERT is uncertain (< 60%), defer to keyword classifier
  if (bertConfidence < 60) {
    const kw = keywordClassify(text);
    if (kw) return kw;
  }

  return { ministry: best[0], confidence: Math.min(bertConfidence, 97), allScores };
}

export const demoCases = [
  {
    title: 'Dry Soil Auto Pump ON',
    summary: 'Average soil below threshold triggers irrigation recommendation and ON state in automation log.',
    status: 'PASS',
  },
  {
    title: 'Tank Empty Warning',
    summary: 'When tank level falls below 20%, local alert is triggered and history alert entry is stored.',
    status: 'PASS',
  },
  {
    title: 'High Confidence Disease',
    summary: 'Disease confidence above 90% raises high-priority alert and enables spray decision flow.',
    status: 'PASS',
  },
  {
    title: 'Offline Cached Mode',
    summary: 'Dashboard falls back to last synced snapshot and queues write operations until sync resumes.',
    status: 'PASS',
  },
  {
    title: 'Wrong Object Rejection',
    summary: 'Non-leaf images are blocked from automation and marked INVALID_NON_LEAF_IMAGE.',
    status: 'PASS',
  },
] as const;

export const validationReportData = {
  metrics: [
    { label: 'Single Leaf Accuracy', value: 93 },
    { label: 'Whole Plant Accuracy', value: 89 },
    { label: 'Wrong Object Rejection', value: 95 },
    { label: 'Low Light Performance', value: 78 },
    { label: 'Field Background Robustness', value: 86 },
  ],
  notes: [
    'Validated on mixed field photos with noisy backgrounds.',
    'Confidence threshold optimized for low-end camera quality.',
    'Wrong-object gate enabled to reduce false spray actions.',
  ],
};

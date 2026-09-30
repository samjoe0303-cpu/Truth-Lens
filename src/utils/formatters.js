export function getVerdictConfig(verdict) {
  switch (verdict) {
    case 'True':
      return {
        label: 'True',
        bg: 'bg-emerald-500/10 dark:bg-emerald-500/20',
        text: 'text-emerald-700 dark:text-emerald-400',
        border: 'border-emerald-500/30',
        badgeBg: 'bg-emerald-600',
        ring: 'ring-emerald-500/30',
        indicator: 'bg-emerald-500',
        description: 'Verified with factual consensus from authoritative reporting.',
      };
    case 'Mostly True':
      return {
        label: 'Mostly True',
        bg: 'bg-emerald-500/10 dark:bg-emerald-500/20',
        text: 'text-emerald-700 dark:text-emerald-400',
        border: 'border-emerald-500/30',
        badgeBg: 'bg-emerald-600',
        ring: 'ring-emerald-500/30',
        indicator: 'bg-emerald-400',
        description: 'Accurate in key elements with minor technical nuances.',
      };
    case 'Misleading':
      return {
        label: 'Misleading',
        bg: 'bg-amber-500/10 dark:bg-amber-500/20',
        text: 'text-amber-800 dark:text-amber-400',
        border: 'border-amber-500/30',
        badgeBg: 'bg-amber-600',
        ring: 'ring-amber-500/30',
        indicator: 'bg-amber-500',
        description: 'Contains elements of truth stripped of crucial context or framed deceptively.',
      };
    case 'Mostly False':
      return {
        label: 'Mostly False',
        bg: 'bg-rose-500/10 dark:bg-rose-500/20',
        text: 'text-rose-700 dark:text-rose-400',
        border: 'border-rose-500/30',
        badgeBg: 'bg-rose-600',
        ring: 'ring-rose-500/30',
        indicator: 'bg-rose-500',
        description: 'Substantially contradicted by reliable public records and reporting.',
      };
    case 'False':
      return {
        label: 'False',
        bg: 'bg-rose-500/10 dark:bg-rose-500/20',
        text: 'text-rose-700 dark:text-rose-400',
        border: 'border-rose-500/30',
        badgeBg: 'bg-rose-600',
        ring: 'ring-rose-500/30',
        indicator: 'bg-rose-600',
        description: 'Directly contradicted or fabricated without credible foundation.',
      };
    case 'Unverifiable':
    default:
      return {
        label: 'Unverifiable',
        bg: 'bg-slate-500/10 dark:bg-slate-500/20',
        text: 'text-slate-700 dark:text-slate-300',
        border: 'border-slate-500/30',
        badgeBg: 'bg-slate-600',
        ring: 'ring-slate-500/30',
        indicator: 'bg-slate-400',
        description: 'Insufficient independent public documentation or conflicting primary evidence.',
      };
  }
}

export function getConfidenceAssessment(confidence) {
  if (confidence >= 85) {
    return { label: 'High Confidence', color: 'text-emerald-600 dark:text-emerald-400' };
  } else if (confidence >= 65) {
    return { label: 'Moderate Confidence', color: 'text-amber-600 dark:text-amber-400' };
  } else {
    return { label: 'Limited Confidence', color: 'text-slate-600 dark:text-slate-400' };
  }
}

export function formatFileSize(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

export function readFileAsBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      const dataUrl = reader.result;
      const base64 = dataUrl.split(',')[1] || '';
      
      // If it's a text file, also extract a short readable snippet
      if (file.type.startsWith('text/') || file.name.endsWith('.txt') || file.name.endsWith('.md')) {
        const textReader = new FileReader();
        textReader.onload = () => {
          const rawText = textReader.result || '';
          resolve({
            base64,
            previewUrl: dataUrl,
            textSnippet: rawText.slice(0, 300) + (rawText.length > 300 ? '...' : ''),
          });
        };
        textReader.onerror = () => resolve({ base64, previewUrl: dataUrl });
        textReader.readAsText(file);
      } else {
        resolve({
          base64,
          previewUrl: dataUrl,
        });
      }
    };

    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
}

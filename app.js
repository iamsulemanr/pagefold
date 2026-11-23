(() => {
  const $ = (id) => document.getElementById(id);
  const input = $('file-input');
  const dropzone = $('dropzone');
  const browseButton = $('browse-button');
  const convertButton = $('convert-button');
  const convertLabel = $('convert-label');
  const selectedFile = $('selected-file');
  const progressWrap = $('progress-wrap');
  const feedback = $('feedback');
  const result = $('result');
  let file = null;
  let markdown = '';
  let outputName = 'document.md';
  let busy = false;

  if (window.pdfjsLib) {
    window.pdfjsLib.GlobalWorkerOptions.workerSrc = './vendor/pdf.worker.min.js';
  }
  $('year').textContent = String(new Date().getFullYear());

  const bytesLabel = (bytes) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };
  const safeStem = (name) => name.replace(/\.pdf$/i, '').trim().replace(/[\\/:*?"<>|\u0000-\u001f]/g, '-').replace(/\s+/g, ' ').slice(0, 120) || 'document';
  const showFeedback = (message, kind = 'error') => {
    feedback.textContent = message;
    feedback.className = `feedback ${kind}`;
    feedback.classList.remove('hidden');
  };
  const hideFeedback = () => {
    feedback.textContent = '';
    feedback.className = 'feedback hidden';
  };
  const setProgress = (percent, message) => {
    $('progress-fill').style.width = `${percent}%`;
    $('progress-percent').textContent = `${percent}%`;
    $('progress-message').textContent = message;
  };
  const resetOutput = () => {
    result.classList.add('hidden');
    progressWrap.classList.add('hidden');
    hideFeedback();
    markdown = '';
  };
  const selectFile = (candidate) => {
    if (!candidate) return;
    if (busy) return;
    resetOutput();
    file = null;
    selectedFile.classList.add('hidden');
    convertButton.disabled = true;
    convertLabel.textContent = 'Choose a PDF to begin';
    const isPdf = candidate.type === 'application/pdf' || candidate.name.toLowerCase().endsWith('.pdf');
    if (!isPdf) {
      showFeedback('That file does not look like a PDF. Please choose a .pdf document.');
      return;
    }
    if (candidate.size === 0) {
      showFeedback('This file is empty. Choose a PDF with readable content.');
      return;
    }
    if (candidate.size > 100 * 1024 * 1024) {
      showFeedback('This file is larger than 100 MB. Try a smaller PDF for reliable browser processing.');
      return;
    }
    file = candidate;
    $('file-name').textContent = candidate.name;
    $('file-size').textContent = bytesLabel(candidate.size);
    selectedFile.classList.remove('hidden');
    convertButton.disabled = false;
    convertLabel.textContent = 'Convert to Markdown';
    hideFeedback();
  };
  const clearFile = () => {
    if (busy) return;
    file = null;
    input.value = '';
    selectedFile.classList.add('hidden');
    convertButton.disabled = true;
    convertLabel.textContent = 'Choose a PDF to begin';
    resetOutput();
  };

  browseButton.addEventListener('click', (event) => {
    event.stopPropagation();
    input.click();
  });
  dropzone.addEventListener('click', (event) => {
    if (event.target.closest('button')) return;
    input.click();
  });
  dropzone.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      input.click();
    }
  });
  input.addEventListener('change', () => {
    selectFile(input.files?.[0]);
    input.value = '';
  });
  $('remove-file').addEventListener('click', clearFile);
  $('convert-another').addEventListener('click', clearFile);
  ['dragenter', 'dragover'].forEach((type) => dropzone.addEventListener(type, (event) => {
    event.preventDefault();
    dropzone.classList.add('dragover');
  }));
  ['dragleave', 'drop'].forEach((type) => dropzone.addEventListener(type, (event) => {
    event.preventDefault();
    dropzone.classList.remove('dragover');
  }));
  dropzone.addEventListener('drop', (event) => selectFile(event.dataTransfer?.files?.[0]));

  const escapeMarkdown = (text) => text
    .replace(/\u0000/g, '')
    .replace(/[\t\u00a0 ]+/g, ' ')
    .replace(/ *\n */g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  const convert = async () => {
    if (!file || busy) return;
    resetOutput();
    if (!window.pdfjsLib) {
      showFeedback('The PDF reader did not load. Refresh the page and try again.');
      return;
    }
    busy = true;
    convertButton.disabled = true;
    $('remove-file').disabled = true;
    convertLabel.textContent = 'Reading your PDF…';
    progressWrap.classList.remove('hidden');
    setProgress(2, 'Opening your PDF…');
    try {
      const data = new Uint8Array(await file.arrayBuffer());
      const loadingTask = window.pdfjsLib.getDocument({ data, isEvalSupported: false });
      const pdf = await loadingTask.promise;
      const sections = [];
      for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
        setProgress(Math.max(4, Math.round(((pageNumber - 1) / pdf.numPages) * 94)), `Extracting page ${pageNumber} of ${pdf.numPages}…`);
        const page = await pdf.getPage(pageNumber);
        const content = await page.getTextContent();
        const lines = [];
        let previousY = null;
        let line = '';
        for (const item of content.items) {
          if (!('str' in item)) continue;
          const value = item.str.replace(/\s+/g, ' ').trim();
          if (!value) continue;
          const y = item.transform?.[5];
          if (previousY !== null && typeof y === 'number' && Math.abs(y - previousY) > 3.2) {
            if (line.trim()) lines.push(line.trim());
            line = '';
          } else if (line && !line.endsWith(' ') && !value.startsWith(' ') && item.hasEOL !== true) {
            line += ' ';
          }
          line += value;
          if (item.hasEOL) {
            if (line.trim()) lines.push(line.trim());
            line = '';
          }
          if (typeof y === 'number') previousY = y;
        }
        if (line.trim()) lines.push(line.trim());
        const pageText = escapeMarkdown(lines.join('\n'));
        sections.push(`## Page ${pageNumber}\n\n${pageText || '_No selectable text found on this page._'}`);
        page.cleanup();
        setProgress(Math.round((pageNumber / pdf.numPages) * 96), `Extracted page ${pageNumber} of ${pdf.numPages}`);
        await new Promise((resolve) => setTimeout(resolve, 0));
      }
      const title = safeStem(file.name);
      const date = new Date().toISOString().slice(0, 10);
      markdown = `# ${title}\n\n> Converted from **${file.name}** on ${date}.\n\n${sections.join('\n\n---\n\n')}\n`;
      outputName = `${title}.md`;
      const textOnly = sections.map((section) => section.replace(/^## Page \d+\n\n/, '')).join('\n\n');
      const chars = textOnly.length;
      const approxTokens = Math.ceil(chars / 4);
      $('result-pages').textContent = String(pdf.numPages);
      $('result-size').textContent = bytesLabel(new Blob([textOnly]).size);
      $('result-tokens').textContent = approxTokens.toLocaleString();
      result.classList.remove('hidden');
      progressWrap.classList.add('hidden');
      showFeedback('Done. Your PDF was processed locally in this browser.', 'success');
      convertLabel.textContent = 'Convert to Markdown';
      convertButton.disabled = false;
    } catch (error) {
      console.error('Pagefold conversion error:', error);
      progressWrap.classList.add('hidden');
      const message = error?.name === 'PasswordException'
        ? 'This PDF is password-protected. Unlock it and try again.'
        : 'We could not read this PDF. It may be damaged, encrypted, or unsupported.';
      showFeedback(message);
      convertLabel.textContent = 'Try conversion again';
      convertButton.disabled = false;
    } finally {
      busy = false;
      $('remove-file').disabled = false;
    }
  };
  convertButton.addEventListener('click', convert);
  $('download-button').addEventListener('click', () => {
    if (!markdown) return;
    const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = outputName;
    document.body.append(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  });
  $('copy-button').addEventListener('click', async () => {
    if (!markdown) return;
    try {
      await navigator.clipboard.writeText(markdown);
      showFeedback('Markdown copied to your clipboard.', 'success');
    } catch {
      showFeedback('Clipboard access was unavailable. Use the download button instead.', 'error');
    }
  });
})();

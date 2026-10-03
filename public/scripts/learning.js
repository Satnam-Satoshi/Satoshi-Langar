/* Optional local learning notes. No network requests, wallet access, or third-party code. */
(() => {
  'use strict';
  const prefix = 'satnam-satoshi-learning-v1:';
  document.querySelectorAll('[data-learning-progress]').forEach((root) => {
    const courseId = root.dataset.courseId;
    if (!['foundations', 'deep-dive', 'sovereignty'].includes(courseId)) return;
    let lessons;
    try { lessons = JSON.parse(root.dataset.lessons || '[]'); } catch { return; }
    if (!Array.isArray(lessons) || lessons.length !== 21 || lessons.some((item) => !item || typeof item.slug !== 'string' || typeof item.title !== 'string')) return;
    const known = new Set(lessons.map((item) => item.slug));
    const key = prefix + courseId;
    const current = root.dataset.lessonSlug;
    const controls = root.querySelector('[data-learning-controls]');
    const fallback = root.querySelector('[data-learning-fallback]');
    const status = root.querySelector('[data-learning-status]');
    const meter = root.querySelector('[data-learning-meter]');
    const toggle = root.querySelector('[data-learning-toggle]');
    const reset = root.querySelector('[data-learning-reset]');
    const confirmation = root.querySelector('[data-learning-confirm]');
    const confirm = root.querySelector('[data-learning-reset-confirm]');
    const cancel = root.querySelector('[data-learning-reset-cancel]');
    const exporter = root.querySelector('[data-learning-export]');
    const storageNote = root.querySelector('[data-learning-storage-note]');
    if (!controls || !status || !meter || !reset || !confirmation || !confirm || !cancel || !exporter || !storageNote) return;
    let completed = new Set();
    let savedAt = null;
    let warning = '';
    function read() {
      try {
        const raw = localStorage.getItem(key);
        if (raw) {
          const value = JSON.parse(raw);
          if (value.version !== 1 || !Array.isArray(value.completed)) throw new Error('Invalid progress data');
          completed = new Set(value.completed.filter((slug) => known.has(slug)));
          savedAt = typeof value.updatedAt === 'string' ? value.updatedAt : null;
        } else { completed = new Set(); savedAt = null; }
      } catch {
        warning = 'Saved progress could not be read. New marks stay in this page until browser storage is available.';
      }
    }
    function render() {
      status.textContent = `${completed.size} of ${lessons.length} lessons marked complete.${warning ? ' ' + warning : ''}`;
      meter.value = completed.size;
      if (toggle && known.has(current)) {
        const done = completed.has(current);
        toggle.textContent = done ? 'Mark this lesson incomplete' : 'Mark this lesson complete';
        toggle.setAttribute('aria-pressed', String(done));
      }
      document.querySelectorAll('[data-learning-completed]').forEach((label) => {
        if (known.has(label.dataset.learningCompleted)) label.hidden = !completed.has(label.dataset.learningCompleted);
      });
    }
    function persist() {
      savedAt = new Date().toISOString();
      try {
        localStorage.setItem(key, JSON.stringify({ version: 1, completed: [...completed], updatedAt: savedAt }));
        warning = '';
      } catch {
        warning = 'Browser storage is unavailable. These marks are temporary; export them before leaving.';
      }
      render();
    }
    read();
    render();
    controls.hidden = false;
    if (fallback) fallback.hidden = true;
    if (toggle && known.has(current)) toggle.addEventListener('click', () => {
      if (completed.has(current)) completed.delete(current); else completed.add(current);
      persist();
    });
    reset.addEventListener('click', () => { confirmation.hidden = false; confirm.focus(); });
    cancel.addEventListener('click', () => { confirmation.hidden = true; reset.focus(); });
    confirm.addEventListener('click', () => {
      completed.clear();
      persist();
      confirmation.hidden = true;
      reset.focus();
    });
    exporter.addEventListener('click', () => {
      try {
        const record = {
          format: 'Satnam Satoshi local learning notes', version: 1, courseId,
          exportedAt: new Date().toISOString(), updatedAt: savedAt,
          note: 'Self-reported completion, not a credential. Local record only; this site does not import exports.',
          completed: lessons.filter(({ slug }) => completed.has(slug)),
        };
        const url = URL.createObjectURL(new Blob([JSON.stringify(record, null, 2)], { type: 'application/json' }));
        const link = document.createElement('a');
        link.href = url;
        link.download = `satnam-satoshi-${courseId}-progress.json`;
        document.body.appendChild(link);
        link.click();
        link.remove();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
        status.textContent = `${completed.size} of ${lessons.length} lessons marked complete. Progress export prepared; check your browser downloads.`;
      } catch {
        status.textContent = 'The browser could not create the export. Your current marks are still shown on this page.';
      }
    });
    window.addEventListener('storage', (event) => {
      if (event.key === key || event.key === null) { warning = ''; completed = new Set(); read(); render(); }
    });
  });
})();

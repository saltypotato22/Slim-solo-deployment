(function() {
  'use strict';

  function exportToPNG(canvas, filename = 'fretboard.png') {
    if (!canvas) {
      console.error('Canvas element not found');
      return;
    }

    canvas.toBlob(function(blob) {
      if (!blob) {
        console.error('Failed to create blob from canvas');
        return;
      }

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 'image/png');
  }

  function exportToHighResPNG(canvas, filename = 'fretboard-hd.png', scale = 2) {
    if (!canvas) {
      console.error('Canvas element not found');
      return;
    }

    const originalWidth = canvas.width;
    const originalHeight = canvas.height;
    const ctx = canvas.getContext('2d');

    const tempCanvas = document.createElement('canvas');
    const tempCtx = tempCanvas.getContext('2d');

    tempCanvas.width = originalWidth * scale;
    tempCanvas.height = originalHeight * scale;

    tempCtx.scale(scale, scale);
    tempCtx.drawImage(canvas, 0, 0);

    exportToPNG(tempCanvas, filename);
  }

  function generateFilename(state) {
    const parts = [
      'fretboard',
      state.rootNote || 'C',
      state.scale || 'major',
      state.instrument || 'guitar',
      new Date().getTime()
    ];

    return parts.join('-') + '.png';
  }

  function exportWithState(canvas, state) {
    const filename = generateFilename(state);
    exportToPNG(canvas, filename);
  }

  window.SlimSolo = window.SlimSolo || {};
  window.SlimSolo.ExportManager = {
    exportToPNG,
    exportToHighResPNG,
    generateFilename,
    exportWithState
  };
})();
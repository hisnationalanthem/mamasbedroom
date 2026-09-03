(function () {
  const form = document.querySelector('#commission-form');
  if (!form) return;

  const requestIdDisplay = document.querySelector('[data-request-id]');
  const status = document.querySelector('[data-copy-status]');
  const submitButton = form.querySelector('[data-submit-request]');

  function setStatus(message, kind = '') {
    if (!status) return;
    status.textContent = message;
    status.classList.remove('is-success', 'is-error', 'is-working');
    if (kind) status.classList.add(`is-${kind}`);
  }

  function makeRequestId() {
    const now = new Date();
    const yy = String(now.getFullYear()).slice(-2);
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    const hh = String(now.getHours()).padStart(2, '0');
    const min = String(now.getMinutes()).padStart(2, '0');
    const suffix = Math.random().toString(36).slice(2, 5).toUpperCase();
    return `ANTHEM-${yy}${mm}${dd}-${hh}${min}-${suffix}`;
  }

  let requestId = sessionStorage.getItem('anthemDraftRequestId');
  if (!requestId) {
    requestId = makeRequestId();
    sessionStorage.setItem('anthemDraftRequestId', requestId);
  }

  if (requestIdDisplay) {
    requestIdDisplay.textContent = requestId;
  }

  // Graveyard prefill
  const params = new URLSearchParams(window.location.search);
  const graveyardId = params.get('graveyard_id');
  const graveyardTitle = params.get('graveyard_title');
  const commissionType = params.get('commission_type');

  const typeField = form.querySelector('#type');
  const detailsField = form.querySelector('#details');

  if (typeField && commissionType) {
    const matchingOption = Array.from(typeField.options).find(
      option => option.textContent.trim() === commissionType.trim()
    );
    if (matchingOption) typeField.value = matchingOption.value;
  }

  if (detailsField && (graveyardId || graveyardTitle) && !detailsField.value.trim()) {
    detailsField.value = [
      'REQUEST GRAVEYARD RESURRECTION',
      graveyardId ? `Graveyard ID: ${graveyardId}` : '',
      graveyardTitle ? `Request: ${graveyardTitle}` : '',
      '',
      'Additional notes / requested adjustments:'
    ].filter(Boolean).join('\n');
  }

  function chunkText(prefix, value, maxChunks = 12, chunkSize = 230) {
    const text = String(value || '').trim();
    const result = {};
    if (!text) return result;

    for (let i = 0; i < Math.min(maxChunks, Math.ceil(text.length / chunkSize)); i++) {
      result[`${prefix}-${i + 1}`] = text.slice(i * chunkSize, (i + 1) * chunkSize);
    }

    if (text.length > maxChunks * chunkSize) {
      result[`${prefix}-truncated`] = 'yes';
    }

    return result;
  }

  function formatRequest(data) {
    return [
      'COMMISSION REQUEST',
      '------------------',
      `Request ID: ${requestId}`,
      `Name / handle: ${data.get('name') || ''}`,
      `Contact: ${data.get('contact') || ''}`,
      `Commission type: ${data.get('type') || ''}`,
      `Add-ons / budget: ${data.get('budget') || ''}`,
      `Deadline / timing: ${data.get('timing') || ''}`,
      '',
      'Project details:',
      data.get('details') || '',
      '',
      'References / links:',
      data.get('references') || '',
      '',
      'I have read the TOS: Yes',
      '',
      'NOTE: This request is not approved until Anthem replies in writing',
      'with this request ID, the final scope, and the final CAD total.'
    ].join('\n');
  }

  async function copyBackup(text) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      return false;
    }
  }

  function submitTawkEvent(metadata) {
    return new Promise((resolve, reject) => {
      if (!window.Tawk_API || typeof window.Tawk_API.addEvent !== 'function') {
        reject(new Error('Tawk event API unavailable'));
        return;
      }

      window.Tawk_API.addEvent('commission-request', metadata, function (error) {
        if (error) reject(error);
        else resolve();
      });
    });
  }

  function setTawkRequestAttributes(data) {
    if (!window.Tawk_API || typeof window.Tawk_API.setAttributes !== 'function') {
      return;
    }

    const attrs = {
      'request-id': requestId.slice(0, 255),
      'commission-type': String(data.get('type') || '').slice(0, 255)
    };

    const handle = String(data.get('name') || '').trim();
    if (handle) attrs['request-handle'] = handle.slice(0, 255);

    window.Tawk_API.setAttributes(attrs, function () {});
  }

  form.addEventListener('submit', async event => {
    event.preventDefault();

    const data = new FormData(form);
    const name = String(data.get('name') || '').trim();
    const contact = String(data.get('contact') || '').trim();
    const details = String(data.get('details') || '').trim();

    if (!name) {
      setStatus('Add your name or handle before submitting.', 'error');
      form.querySelector('#name')?.focus();
      return;
    }

    if (!contact) {
      setStatus('Add a contact method before submitting.', 'error');
      form.querySelector('#contact')?.focus();
      return;
    }

    if (!details) {
      setStatus('Add the project details before submitting.', 'error');
      form.querySelector('#details')?.focus();
      return;
    }

    if (!data.get('tos')) {
      setStatus('Read and accept the TOS before submitting your commission request.', 'error');
      return;
    }

    const formatted = formatRequest(data);

    const metadata = {
      'request-id': requestId,
      'name-handle': name.slice(0, 255),
      'contact': contact.slice(0, 255),
      'commission-type': String(data.get('type') || '').slice(0, 255),
      'addons-budget': String(data.get('budget') || 'None listed').slice(0, 255),
      'timing': String(data.get('timing') || 'No timing listed').slice(0, 255),
      'tos': 'accepted',
      ...chunkText('details', data.get('details'), 12, 230),
      ...chunkText('references', data.get('references'), 8, 230)
    };

    submitButton.disabled = true;
    submitButton.textContent = 'Submitting…';
    setStatus(`Submitting ${requestId} to Anthem…`, 'working');

    const copied = await copyBackup(formatted);

    try {
      const ready =
        window.AnthemChat &&
        await window.AnthemChat.waitFor('addEvent', 9000);

      if (!ready) {
        throw new Error('Tawk.to did not become ready in time.');
      }

      setTawkRequestAttributes(data);
      await submitTawkEvent(metadata);

      sessionStorage.setItem('anthemLastSubmittedRequestId', requestId);
      sessionStorage.removeItem('anthemDraftRequestId');

      setStatus(
        copied
          ? `Request ${requestId} submitted to Anthem. A backup copy is also on your clipboard. Chat is opening now.`
          : `Request ${requestId} submitted to Anthem. Chat is opening now.`,
        'success'
      );

      if (window.AnthemChat) {
        await window.AnthemChat.openWhenReady();
      }

      submitButton.textContent = 'Request submitted';
    } catch (error) {
      if (window.AnthemChat) {
        await window.AnthemChat.openWhenReady();
      }

      setStatus(
        copied
          ? `Automatic submission could not be confirmed. Your request is copied—paste it into the open chat and press Send.`
          : `Automatic submission could not be confirmed. Please copy your form details manually into the open chat.`,
        'error'
      );

      submitButton.disabled = false;
      submitButton.textContent = 'Try submitting again';
    }
  });
})();

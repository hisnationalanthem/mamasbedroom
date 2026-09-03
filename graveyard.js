(function () {
  const root = document.querySelector('[data-graveyard-list]');
  if (!root || typeof GRAVEYARD_REQUESTS === 'undefined') return;

  const countEl = document.querySelector('[data-graveyard-count]');
  const emptyEl = document.querySelector('[data-graveyard-empty]');
  const filters = document.querySelectorAll('[data-graveyard-filter]');
  const searchInput = document.querySelector('[data-graveyard-search]');

  const statusLabels = {
    'available': 'Available',
    'message-first': 'Message First',
    'claimed': 'Claimed',
    'reserved': 'Reserved',
    'resurrected': 'Resurrected'
  };

  let activeFilter = 'available';

  function escapeHtml(value) {
    return String(value ?? '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  }

  function resurrectUrl(item) {
    const params = new URLSearchParams({
      graveyard_id: item.id,
      graveyard_title: item.title,
      commission_type: 'Resurrect a Request — $12 CAD'
    });
    return `commissions.html?${params.toString()}#request`;
  }

  function render() {
    const query = (searchInput?.value || '').trim().toLowerCase();

    const visible = GRAVEYARD_REQUESTS.filter(item => {
      const statusMatch = activeFilter === 'all' || item.status === activeFilter;
      const text = `${item.id} ${item.gender} ${item.title} ${item.note || ''}`.toLowerCase();
      const searchMatch = !query || text.includes(query);
      return statusMatch && searchMatch;
    });

    root.innerHTML = visible.map(item => {
      const canCommission = item.status === 'available';
      const mustMessage = item.status === 'message-first';

      let action = '';
      if (canCommission) {
        action = `<a class="btn btn-primary" href="${resurrectUrl(item)}">Resurrect this request</a>`;
      } else if (mustMessage) {
        action = `<button class="btn btn-dark" type="button" data-graveyard-chat>Message Anthem first</button>`;
      } else {
        action = `<span class="graveyard-unavailable">Not currently available</span>`;
      }

      return `
        <article class="card graveyard-request-card" data-status="${escapeHtml(item.status)}">
          <div class="graveyard-card-top">
            <span class="graveyard-id">${escapeHtml(item.id)}</span>
            <span class="graveyard-status status-${escapeHtml(item.status)}">${escapeHtml(statusLabels[item.status] || item.status)}</span>
          </div>
          <span class="card-kicker">${escapeHtml(item.gender)}</span>
          <h3>${escapeHtml(item.title)}</h3>
          ${item.note ? `<p class="graveyard-note">${escapeHtml(item.note)}</p>` : ''}
          <div class="graveyard-card-actions">${action}</div>
        </article>
      `;
    }).join('');

    if (countEl) {
      countEl.textContent = `${visible.length} ${visible.length === 1 ? 'request' : 'requests'} shown`;
    }

    if (emptyEl) {
      emptyEl.hidden = visible.length !== 0;
    }

    root.querySelectorAll('[data-graveyard-chat]').forEach(button => {
      button.addEventListener('click', () => {
        if (window.AnthemChat && window.AnthemChat.configured) {
          window.AnthemChat.open();
        } else {
          alert('Live chat is currently unavailable. Please use the site contact method instead.');
        }
      });
    });
  }

  filters.forEach(button => {
    button.addEventListener('click', () => {
      activeFilter = button.dataset.graveyardFilter;
      filters.forEach(btn => btn.classList.toggle('is-active', btn === button));
      render();
    });
  });

  searchInput?.addEventListener('input', render);
  render();
})();

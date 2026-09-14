export interface SearchPage {
  title: string;
  description: string;
  section: string;
  url: string;
  text: string;
}

interface SearchIndexEntry extends Omit<SearchPage, 'text'> {
  html: string;
}

export interface SearchResult extends SearchPage {
  score: number;
  snippet: string;
}

/** All query terms must match; page titles and descriptions rank above body text. */
export function searchPages(
  pages: readonly SearchPage[],
  query: string
): SearchResult[] {
  const terms = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (!terms.length) return [];
  return pages
    .map((page) => {
      const title = page.title.toLowerCase();
      const description = page.description.toLowerCase();
      const text = page.text.toLowerCase();
      const haystack = `${title} ${description} ${page.section.toLowerCase()} ${text}`;
      if (!terms.every((term) => haystack.includes(term))) return null;
      const score = terms.reduce(
        (total, term) =>
          total +
          (title.includes(term) ? 10 : description.includes(term) ? 5 : 1),
        0
      );
      const position = Math.min(
        ...terms.map((term) => text.indexOf(term)).filter((i) => i >= 0)
      );
      const start = Number.isFinite(position) ? Math.max(0, position - 60) : 0;
      const snippet = `${start ? '…' : ''}${page.text.slice(start, start + 180)}${page.text.length > start + 180 ? '…' : ''}`;
      return { ...page, score, snippet };
    })
    .filter((page): page is SearchResult => page !== null)
    .sort((a, b) => b.score - a.score || a.title.localeCompare(b.title));
}

function requireElement<K extends keyof HTMLElementTagNameMap>(
  id: string,
  tag: K
): HTMLElementTagNameMap[K] {
  const element = document.querySelector(`${tag}#${id}`);
  if (!element) throw new Error(`Missing search element: ${id}`);
  return element as HTMLElementTagNameMap[K];
}

if (typeof document !== 'undefined') {
  const trigger = requireElement('search-open', 'button');
  const dialog = requireElement('search-dialog', 'dialog');
  const input = requireElement('search-input', 'input');
  const status = requireElement('search-status', 'p');
  const results = requireElement('search-results', 'ul');
  let pages: SearchPage[] | undefined;
  let loading: Promise<SearchPage[]> | undefined;
  let previousFocus: Element | null = null;

  function render() {
    results.replaceChildren();
    if (!pages) return;
    if (!input.value.trim()) {
      status.textContent = 'Type to search all documentation.';
      return;
    }
    const matches = searchPages(pages, input.value);
    status.textContent = matches.length
      ? `${matches.length} result${matches.length === 1 ? '' : 's'}`
      : 'No results found. Try another search term.';
    for (const match of matches) {
      const item = document.createElement('li');
      const link = document.createElement('a');
      link.href = match.url;
      const section = document.createElement('small');
      section.textContent = match.section;
      const title = document.createElement('strong');
      title.textContent = match.title;
      const snippet = document.createElement('span');
      snippet.textContent = match.snippet || match.description;
      link.append(section, title, snippet);
      item.append(link);
      results.append(item);
    }
  }

  async function openSearch() {
    if (!dialog.open) {
      previousFocus = document.activeElement;
      dialog.showModal();
    }
    input.focus();
    input.select();
    if (pages) {
      render();
      return;
    }
    status.textContent = 'Loading documentation…';
    try {
      loading ??= fetch(new URL('./search-index.json', import.meta.url))
        .then((response) => {
          if (!response.ok) throw new Error('Search index unavailable');
          return response.json();
        })
        .then((entries: SearchIndexEntry[]) =>
          entries.map(({ html, ...entry }) => {
            const content = new DOMParser().parseFromString(
              html.replace(/<[^>]+>/g, ' $& '),
              'text/html'
            );
            return {
              ...entry,
              text: content.body.textContent.replace(/\s+/g, ' ').trim(),
            };
          })
        );
      pages = await loading;
      render();
    } catch {
      loading = undefined;
      status.textContent = 'Unable to load search. Close and reopen to retry.';
    }
  }

  trigger.addEventListener('click', openSearch);
  requireElement('search-close', 'button').addEventListener('click', () =>
    dialog.close()
  );
  dialog.addEventListener('close', () => {
    if (previousFocus instanceof HTMLElement) previousFocus.focus();
  });
  dialog.addEventListener('click', (event) => {
    if (event.target !== dialog) return;
    const rect = dialog.getBoundingClientRect();
    if (
      event.clientX < rect.left ||
      event.clientX > rect.right ||
      event.clientY < rect.top ||
      event.clientY > rect.bottom
    )
      dialog.close();
  });
  input.addEventListener('input', render);
  document.addEventListener('keydown', (event) => {
    if (
      (event.metaKey || event.ctrlKey) &&
      event.key.toLowerCase() === 'k' &&
      !event.isComposing
    ) {
      event.preventDefault();
      if (!event.repeat) openSearch();
    }
  });
  dialog.addEventListener('keydown', (event) => {
    if (event.isComposing || event.altKey || event.metaKey || event.ctrlKey)
      return;
    const links = [...results.querySelectorAll('a')];
    if (!links.length) return;
    const current = links.findIndex((link) => link === document.activeElement);
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      const next =
        event.key === 'ArrowDown'
          ? (current + 1) % links.length
          : current <= 0
            ? links.length - 1
            : current - 1;
      links[next]?.focus();
    } else if (event.key === 'Enter' && document.activeElement === input) {
      event.preventDefault();
      links[0]?.click();
    }
  });
}

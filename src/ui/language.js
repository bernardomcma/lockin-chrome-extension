/**
 * Language selector.
 *
 * The flags are inline SVG rather than emoji: Windows ships no glyphs for
 * regional-indicator pairs, so Chrome there renders U+1F1FA U+1F1F8 as the
 * letters "US" in boxes instead of a flag.
 *
 * Uses a compact trigger + popover menu so any number of languages fit cleanly
 * in the 344px popup header and on the summary page.
 */
import { LOCALES, currentLocale, setLocale } from '../utils/i18n.js';

const STRIPE = 16 / 7;

const FLAGS = {
  us: `
    <rect width="24" height="16" fill="#F7F7F7"/>
    <g fill="#B31942">
      <rect y="0" width="24" height="${STRIPE}"/>
      <rect y="${STRIPE * 2}" width="24" height="${STRIPE}"/>
      <rect y="${STRIPE * 4}" width="24" height="${STRIPE}"/>
      <rect y="${STRIPE * 6}" width="24" height="${STRIPE}"/>
    </g>
    <rect width="10.4" height="${STRIPE * 3.5}" fill="#0A3161"/>
    <g fill="#F7F7F7">
      <circle cx="2.1" cy="1.6" r="0.5"/><circle cx="5.2" cy="1.6" r="0.5"/>
      <circle cx="8.3" cy="1.6" r="0.5"/><circle cx="3.65" cy="4" r="0.5"/>
      <circle cx="6.75" cy="4" r="0.5"/><circle cx="2.1" cy="6.4" r="0.5"/>
      <circle cx="5.2" cy="6.4" r="0.5"/><circle cx="8.3" cy="6.4" r="0.5"/>
    </g>`,
  br: `
    <rect width="24" height="16" fill="#009B3A"/>
    <path d="M12 1.7 L22.3 8 L12 14.3 L1.7 8 Z" fill="#FEDF00"/>
    <circle cx="12" cy="8" r="3.5" fill="#002776"/>
    <path d="M8.9 6.9 A 3.5 3.5 0 0 0 15.1 9.4" stroke="#F7F7F7" stroke-width="0.9" fill="none"/>`,
  es: `
    <rect width="24" height="16" fill="#AA151B"/>
    <rect y="4" width="24" height="8" fill="#F1BF00"/>`,
  fr: `
    <rect width="8" height="16" fill="#0055A4"/>
    <rect x="8" width="8" height="16" fill="#FFFFFF"/>
    <rect x="16" width="8" height="16" fill="#EF4135"/>`,
  de: `
    <rect width="24" height="5.34" fill="#0A0A0A"/>
    <rect y="5.33" width="24" height="5.34" fill="#DD0000"/>
    <rect y="10.66" width="24" height="5.34" fill="#FFCE00"/>`,
  it: `
    <rect width="8" height="16" fill="#009246"/>
    <rect x="8" width="8" height="16" fill="#FFFFFF"/>
    <rect x="16" width="8" height="16" fill="#CE2B37"/>`,
  jp: `
    <rect width="24" height="16" fill="#FFFFFF"/>
    <circle cx="12" cy="8" r="4.5" fill="#BC002D"/>`,
  kr: `
    <rect width="24" height="16" fill="#FFFFFF"/>
    <circle cx="12" cy="8" r="4" fill="#CD2E3A"/>
    <path d="M8 8 A4 4 0 0 0 16 8 A2 2 0 0 0 12 8 A2 2 0 0 1 8 8 Z" fill="#0047A0"/>`,
  cn: `
    <rect width="24" height="16" fill="#DE2910"/>
    <circle cx="5.2" cy="4.6" r="1.9" fill="#FFDE00"/>
    <circle cx="9.2" cy="2.6" r="0.6" fill="#FFDE00"/>
    <circle cx="10.4" cy="4.3" r="0.6" fill="#FFDE00"/>
    <circle cx="10.2" cy="6.4" r="0.6" fill="#FFDE00"/>
    <circle cx="8.8" cy="7.9" r="0.6" fill="#FFDE00"/>`
};

function flagSvg(key) {
  return `<svg class="lang__flag" viewBox="0 0 24 16" aria-hidden="true" focusable="false">${
    FLAGS[key] || ''
  }</svg>`;
}

let outsideListener = null;

/**
 * Renders the language selector into `container`. Selecting a language only
 * writes storage; the page re-renders when it sees the change.
 */
export function renderLanguageTile(container) {
  container.textContent = '';

  const active = currentLocale();

  const trigger = document.createElement('button');
  trigger.type = 'button';
  trigger.className = 'lang-trigger';
  trigger.setAttribute('aria-haspopup', 'listbox');
  trigger.setAttribute('aria-expanded', 'false');
  trigger.setAttribute('aria-label', active.name);
  trigger.title = active.name;
  trigger.innerHTML = `${flagSvg(active.flag)}<span class="lang-trigger__code">${active.short}</span><span class="lang-trigger__caret" aria-hidden="true">▾</span>`;

  const menu = document.createElement('ul');
  menu.className = 'lang-menu';
  menu.setAttribute('role', 'listbox');
  menu.setAttribute('aria-label', 'Language');
  menu.hidden = true;

  for (const locale of LOCALES) {
    const li = document.createElement('li');
    li.setAttribute('role', 'none');

    const option = document.createElement('button');
    option.type = 'button';
    option.className = 'lang-option';
    option.setAttribute('role', 'option');
    option.dataset.code = locale.code;
    option.setAttribute('aria-selected', String(locale.code === active.code));
    option.innerHTML = `${flagSvg(locale.flag)}<span>${locale.name}</span>`;

    option.addEventListener('click', () => {
      menu.hidden = true;
      trigger.setAttribute('aria-expanded', 'false');
      void setLocale(locale.code);
    });

    li.append(option);
    menu.append(li);
  }

  const closeMenu = () => {
    menu.hidden = true;
    trigger.setAttribute('aria-expanded', 'false');
  };

  trigger.addEventListener('click', event => {
    event.stopPropagation();
    const opening = menu.hidden;
    menu.hidden = !opening;
    trigger.setAttribute('aria-expanded', String(opening));
  });

  menu.addEventListener('keydown', event => {
    if (event.key === 'Escape') {
      closeMenu();
      trigger.focus();
    }
  });

  if (outsideListener) {
    document.removeEventListener('click', outsideListener);
  }

  outsideListener = event => {
    if (!container.contains(event.target)) {
      closeMenu();
    }
  };
  document.addEventListener('click', outsideListener);

  container.append(trigger, menu);
}

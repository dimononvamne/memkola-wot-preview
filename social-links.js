/* MEMKOLA social links. Insert only real, public HTTPS destination URLs below.
 * Site admin passwords and Supabase configuration never belong in this file. */
window.MEMKOLA_SOCIAL_LINKS = {
  youtubeTanks: "https://www.youtube.com/@memkola",      // YouTube: канал про танки
  youtubeNight: "https://www.youtube.com/@masla4",      // YouTube: ночные стримы на ПК
  telegramGroup: "https://t.me/memkolawotblin",     // Telegram: группа / канал с новостями
  telegramChat: "https://t.me/+AZTdO7tyy0E1ODky",      // Telegram: чат для общения
  discordServer: "https://discord.gg/zBnUGVKcCf"      // Discord: ссылка-приглашение на сервер
};

(() => {
  const icons = {
    youtube: `<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="1.5" y="5" width="21" height="14" rx="4" fill="#f35858"/><path d="M10 8.6 16 12l-6 3.4z" fill="#fff"/></svg>`,
    telegram: `<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="11" fill="#58baf8"/><path fill="#fff" d="M18.7 6.9 16 18.7c-.2.8-.8.9-1.5.5l-4-2.9-1.9 1.8c-.2.3-.4.5-.9.5l.3-4 7.3-6.6c.3-.3-.1-.5-.5-.2L5.9 13.5 2.4 12.4c-.8-.2-.8-.7.1-1.1l15-5.7c.7-.3 1.3.2 1.2 1.3Z" transform="translate(1.5 0) scale(.93)"/></svg>`,
    discord: `<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="#a19cff" d="M19.5 5.5a18.8 18.8 0 0 0-4.5-1.4l-.5 1a17 17 0 0 0-5 0l-.5-1a19 19 0 0 0-4.5 1.4C1.7 9.6 1 13.7 1.4 17.8c1.6 1.2 3.4 2 5.3 2.5l1.1-1.8c-.6-.2-1.2-.5-1.8-.8l.5-.4c3.5 1.7 7.5 1.7 11 0l.5.4c-.6.3-1.2.6-1.8.8l1.1 1.8c1.9-.5 3.7-1.3 5.3-2.5.5-4.8-.8-8.9-3.1-12.3ZM8.9 15.5c-1 0-1.8-.9-1.8-2s.8-2 1.8-2 1.8.9 1.8 2-.8 2-1.8 2Zm6.2 0c-1 0-1.8-.9-1.8-2s.8-2 1.8-2 1.8.9 1.8 2-.8 2-1.8 2Z"/></svg>`
  };
  const items = [
    { key: 'youtubeTanks', platform: 'youtube', name: 'YouTube · MEMKOLA', caption: 'Танковый канал', hosts: ['youtube.com', 'youtu.be'] },
    { key: 'youtubeNight', platform: 'youtube', name: 'YouTube · MASLA4', caption: 'Ночные стримы на ПК', hosts: ['youtube.com', 'youtu.be'] },
    { key: 'telegramGroup', platform: 'telegram', name: 'Telegram · Группа', caption: 'Канал в Telegram', hosts: ['t.me', 'telegram.me'] },
    { key: 'telegramChat', platform: 'telegram', name: 'Telegram · Чат', caption: 'Чат подписчиков', hosts: ['t.me', 'telegram.me'] },
    { key: 'discordServer', platform: 'discord', name: 'Discord · Сервер', caption: 'Discord-сообщество', hosts: ['discord.gg', 'discord.com'] }
  ];
  function safeDestination(value, hosts) {
    try {
      const url = new URL(String(value || '').trim());
      if (url.protocol !== 'https:' || url.username || url.password) return '';
      const host = url.hostname.toLowerCase();
      if (!hosts.some(h => host === h || host.endsWith('.' + h))) return '';
      return url.href;
    } catch { return ''; }
  }
  function render() {
    const target = document.querySelector('.hero');
    if (!target || document.getElementById('memkola-socials')) return;
    const links = items.map(item => ({ ...item, url: safeDestination(window.MEMKOLA_SOCIAL_LINKS?.[item.key], item.hosts) })).filter(item => item.url);
    if (!links.length) return;  // No misleading dead buttons before links are provided.
    const section = document.createElement('section');
    section.id = 'memkola-socials';
    section.className = 'social-hub';
    section.setAttribute('aria-labelledby', 'social-hub-title');
    const header = document.createElement('div'); header.className = 'social-hub-head';
    header.innerHTML = '<div><span class="social-hub-kicker">MEMKOLA // COMMUNITY</span><h2 id="social-hub-title">Наши площадки</h2></div><p>Подписывайся, смотри стримы и общайся с танкистами.</p>';
    const grid = document.createElement('div'); grid.className = 'social-hub-grid';
    for (const item of links) {
      const a = document.createElement('a');
      a.className = 'social-link'; a.dataset.platform = item.platform;
      a.href = item.url; a.target = '_blank'; a.rel = 'noopener noreferrer';
      a.setAttribute('aria-label', `${item.name} — открыть ссылку`);
      const icon = document.createElement('span'); icon.className = 'social-link-icon'; icon.innerHTML = icons[item.platform];
      const label = document.createElement('span'); label.className = 'social-link-text';
      const name = document.createElement('span'); name.className = 'social-link-name'; name.textContent = item.name;
      const caption = document.createElement('span'); caption.className = 'social-link-caption'; caption.textContent = item.caption;
      label.append(name, caption);
      const arrow = document.createElement('span'); arrow.className = 'social-link-arrow'; arrow.textContent = '↗'; arrow.setAttribute('aria-hidden','true');
      a.append(icon, label, arrow); grid.append(a);
    }
    section.append(header, grid);
    target.insertAdjacentElement('afterend',section);
  }
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded',render,{once:true});
  else render();
})();

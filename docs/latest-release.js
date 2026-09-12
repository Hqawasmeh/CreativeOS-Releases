(() => {
  const style = document.createElement('link');
  style.rel = 'stylesheet';
  style.href = 'figma-exact.css?v=20260913-glitch2';
  document.head.appendChild(style);

  const REPO = 'Hqawasmeh/CreativeOS-Releases';
  const API = `https://api.github.com/repos/${REPO}/releases?per_page=100`;

  function parseVersion(tag = '') {
    const match = tag.match(/^v?(\d+)\.(\d+)\.(\d+)-rc\.(\d+)(?:\.(\d+))?$/i);
    if (!match) return null;
    return match.slice(1).map(v => Number(v || 0));
  }

  function compareVersions(a, b) {
    const av = parseVersion(a.tag_name);
    const bv = parseVersion(b.tag_name);
    if (!av && !bv) return new Date(b.published_at || 0) - new Date(a.published_at || 0);
    if (!av) return 1;
    if (!bv) return -1;
    for (let i = 0; i < Math.max(av.length, bv.length); i += 1) {
      const diff = (bv[i] || 0) - (av[i] || 0);
      if (diff) return diff;
    }
    return new Date(b.published_at || 0) - new Date(a.published_at || 0);
  }

  function findWindowsInstaller(release) {
    return (release.assets || []).find(asset => /^QanteakOS-Setup-.*\.exe$/i.test(asset.name) && !/\.blockmap$/i.test(asset.name));
  }

  async function updateDownloadLinks() {
    try {
      const response = await fetch(API, { headers: { Accept: 'application/vnd.github+json' }, cache: 'no-store' });
      if (!response.ok) return;
      const releases = (await response.json()).filter(r => !r.draft && findWindowsInstaller(r)).sort(compareVersions);
      const latest = releases[0];
      const installer = latest && findWindowsInstaller(latest);
      if (!installer?.browser_download_url) return;
      document.querySelectorAll('a[href*="github.com/Hqawasmeh/CreativeOS-Releases/releases/"]').forEach(link => {
        if (/QanteakOS-Setup-.*\.exe/i.test(link.getAttribute('href') || '')) link.href = installer.browser_download_url;
      });
    } catch (_) {}
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', updateDownloadLinks, { once: true });
  else updateDownloadLinks();
})();

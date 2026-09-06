(() => {
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

  function releaseLabel(tag = '') {
    const v = parseVersion(tag);
    if (!v) return tag.replace(/^v/i, '');
    const rc = v[3] || 0;
    const point = v[4] || 0;
    return point ? `RC${rc} V0.${point}` : `RC${rc}`;
  }

  function findWindowsInstaller(release) {
    return (release.assets || []).find(asset =>
      /^QanteakOS-Setup-.*\.exe$/i.test(asset.name) && !/\.blockmap$/i.test(asset.name)
    );
  }

  async function updateDownloadLinks() {
    try {
      const response = await fetch(API, {
        headers: { Accept: 'application/vnd.github+json' },
        cache: 'no-store'
      });
      if (!response.ok) throw new Error(`GitHub API ${response.status}`);

      const releases = (await response.json())
        .filter(release => !release.draft && findWindowsInstaller(release))
        .sort(compareVersions);

      const latest = releases[0];
      if (!latest) return;

      const installer = findWindowsInstaller(latest);
      if (!installer?.browser_download_url) return;

      document.querySelectorAll('a[href*="github.com/Hqawasmeh/CreativeOS-Releases/releases/"]').forEach(link => {
        const text = (link.textContent || '').toLowerCase();
        const href = link.getAttribute('href') || '';
        if (text.includes('download') || /QanteakOS-Setup-.*\.exe/i.test(href)) {
          link.href = installer.browser_download_url;
          link.dataset.releaseTag = latest.tag_name;
          link.setAttribute('aria-label', `Download Qanteak OS ${releaseLabel(latest.tag_name)} for Windows`);
        }
      });

      const topbar = document.querySelector('.topbar');
      if (topbar) topbar.textContent = `Qanteak OS ${releaseLabel(latest.tag_name)} — Windows beta access is open`;

      document.documentElement.dataset.latestQanteakRelease = latest.tag_name;
      window.QANTEAK_LATEST_RELEASE = {
        tag: latest.tag_name,
        name: latest.name,
        installer: installer.browser_download_url,
        publishedAt: latest.published_at
      };
    } catch (error) {
      console.warn('Could not refresh the latest Qanteak release. Using the website fallback link.', error);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', updateDownloadLinks, { once: true });
  } else {
    updateDownloadLinks();
  }
})();

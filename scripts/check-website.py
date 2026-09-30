from pathlib import Path
from html.parser import HTMLParser
from urllib.parse import urlsplit, unquote

D = Path(__file__).resolve().parents[1] / 'docs'

class Page(HTMLParser):
    def __init__(self, text):
        super().__init__()
        self.links = []
        self.ids = []
        self.h1 = 0
        self.title = ''
        self._in_title = False
        self.lang = ''
        self.meta = {}
        self.canonical = None
        self.main = 0
        self.nav = 0
        self.buttons = []
        self.feed(text)

    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if tag == 'html':
            self.lang = a.get('lang', '')
        if tag == 'main':
            self.main += 1
        if tag == 'nav':
            self.nav += 1
        if tag == 'h1':
            self.h1 += 1
        if tag == 'title':
            self._in_title = True
        if 'id' in a:
            self.ids.append(a['id'])
        if tag == 'meta' and a.get('name'):
            self.meta[a['name'].lower()] = a.get('content', '')
        if tag == 'link' and a.get('rel') == 'canonical':
            self.canonical = a.get('href')
        if tag == 'button':
            self.buttons.append(a)
        for key in ('href', 'src'):
            if a.get(key):
                self.links.append(a[key])

    def handle_endtag(self, tag):
        if tag == 'title':
            self._in_title = False

    def handle_data(self, data):
        if self._in_title:
            self.title += data

pages = {p.name: Page(p.read_text(encoding='utf-8')) for p in D.glob('*.html')}
errors = []

for name, p in pages.items():
    if p.lang.lower() != 'en':
        errors.append(f'{name}: html lang must be en')
    if not p.title.strip():
        errors.append(f'{name}: missing title')
    if p.h1 != 1:
        errors.append(f'{name}: expected one h1, found {p.h1}')
    if p.main != 1:
        errors.append(f'{name}: expected one main element, found {p.main}')
    if 'width=device-width' not in p.meta.get('viewport', ''):
        errors.append(f'{name}: missing responsive viewport')
    if not p.meta.get('description', '').strip():
        errors.append(f'{name}: missing meta description')
    if not p.canonical:
        errors.append(f'{name}: missing canonical URL')
    if len(p.ids) != len(set(p.ids)):
        duplicates = sorted({x for x in p.ids if p.ids.count(x) > 1})
        errors.append(f'{name}: duplicate ids {duplicates}')
    for button in p.buttons:
        if button.get('class', '').find('menu-toggle') >= 0:
            if button.get('aria-controls') != 'navigation':
                errors.append(f'{name}: menu toggle must control navigation')
            if button.get('aria-expanded') not in ('true', 'false'):
                errors.append(f'{name}: menu toggle missing aria-expanded')
    for link in p.links:
        u = urlsplit(link)
        if u.scheme or u.netloc or link.startswith('mailto:'):
            continue
        target = D / unquote(u.path or name)
        if not target.exists():
            errors.append(f'{name}: missing {link}')
        if u.fragment and target.name in pages and u.fragment not in pages[target.name].ids:
            errors.append(f'{name}: missing anchor {link}')

assert not errors, '\n'.join(errors)
print(
    f'PASS: {len(pages)} pages; local links/assets/anchors resolve; '
    'titles, descriptions, canonicals, responsive viewport, unique ids, '
    'one H1 and one main per page validated.'
)

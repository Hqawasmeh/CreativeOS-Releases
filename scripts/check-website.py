from pathlib import Path
from html.parser import HTMLParser
from urllib.parse import urlsplit,unquote
D=Path(__file__).resolve().parents[1]/'docs'
class Page(HTMLParser):
 def __init__(self,text):
  super().__init__();self.links=[];self.ids=set();self.h1=0;self.feed(text)
 def handle_starttag(self,tag,attrs):
  a=dict(attrs)
  if 'id' in a:self.ids.add(a['id'])
  if tag=='h1':self.h1+=1
  for key in ('href','src'):
   if a.get(key):self.links.append(a[key])
pages={p.name:Page(p.read_text()) for p in D.glob('*.html')}
errors=[]
for name,p in pages.items():
 if p.h1!=1:errors.append(f'{name}: expected one h1, found {p.h1}')
 for link in p.links:
  u=urlsplit(link)
  if u.scheme or u.netloc:continue
  target=D/unquote(u.path or name)
  if not target.exists():errors.append(f'{name}: missing {link}')
  if u.fragment and target.name in pages and u.fragment not in pages[target.name].ids:errors.append(f'{name}: missing anchor {link}')
assert not errors,'\n'.join(errors)
print(f'PASS: {len(pages)} pages; all local links, assets and anchors resolve; one H1 per page.')

import unittest, copy, json, tempfile, datetime as dt, subprocess
from pathlib import Path
from unittest.mock import patch
from renderer import validate,validate_evidence,render,wrap_measured
BASE=json.loads(Path('example-testnet.json').read_text())
EVIDENCE=Path('evidence.json').resolve()
CLOCK=dt.date(2026,11,16)
class Tests(unittest.TestCase):
 def test_valid(self):validate(BASE,today=CLOCK);validate_evidence(BASE,EVIDENCE)
 def bad(self,fn):
  m=copy.deepcopy(BASE);fn(m)
  with self.assertRaises((ValueError,KeyError,TypeError)):validate(m,today=CLOCK)
 def test_title(self):self.bad(lambda m:m.update(title='a'*49))
 def test_wide_glyph(self):self.bad(lambda m:m.update(title='W'*22))
 def test_wide_subtitle(self):self.bad(lambda m:m.update(subtitle='W'*50))
 def test_two_title_lines(self):
  lines=wrap_measured('VERIFY THE SOURCE BEFORE EVERY CLAIM',64,True,2)
  self.assertEqual(len(lines),2)
 def test_date(self):self.bad(lambda m:m.update(checked_date='2026-02-30'))
 def test_future(self):self.bad(lambda m:m.update(checked_date='2026-11-18'))
 def test_stale(self):self.bad(lambda m:m.update(checked_date='2020-01-01',edition_date='2020-01-01'))
 def test_stage(self):self.bad(lambda m:m.update(stage='guaranteed'))
 def test_theme(self):self.bad(lambda m:m.update(theme='evil'))
 def test_verification(self):self.bad(lambda m:m.update(verification={}))
 def test_http(self):self.bad(lambda m:m['sources'][0].update(url='http://example.com'))
 def test_handles(self):self.bad(lambda m:m['tags'][0].update(platform='Instagram'))
 def test_tag_target(self):self.bad(lambda m:m['tags'][0].update(linked_target='https://twitter.com/wrong'))
 def test_source(self):self.bad(lambda m:m['sources'][0].update(supports_claim=False))
 def test_missing_date(self):self.bad(lambda m:m.pop('event_date'))
 def test_too_many_tags(self):self.bad(lambda m:m.update(tags=m['tags']*4))
 def test_binding(self):self.bad(lambda m:m['binding'].pop('pdf_sha256'))
 def test_evidence_hash(self):
  m=copy.deepcopy(BASE);m['evidence_sha256']='0'*64
  with self.assertRaises(ValueError):validate_evidence(m,EVIDENCE)
 def test_claim_evidence(self):
  m=copy.deepcopy(BASE);m['claim']='Mainnet is live'
  with self.assertRaises(ValueError):validate_evidence(m,EVIDENCE)
 def test_missing_inkscape(self):
  with patch('renderer.shutil.which',return_value=None),tempfile.TemporaryDirectory() as d:
   with self.assertRaises(ValueError):render(BASE,d,EVIDENCE,today=CLOCK)
 def test_timeout(self):
  with patch('renderer.subprocess.run',side_effect=subprocess.TimeoutExpired('inkscape',60)) as run,tempfile.TemporaryDirectory() as d:
   with self.assertRaises(subprocess.TimeoutExpired):render(BASE,d,EVIDENCE,today=CLOCK)
   self.assertEqual(run.call_args.kwargs['timeout'],60)
   self.assertFalse(list(Path(d).glob('*.manifest.json')))
 def test_escape_deterministic_and_collision(self):
  m=copy.deepcopy(BASE);m['title']='<script> & TEST'
  with tempfile.TemporaryDirectory() as d:
   a=render(m,Path(d)/'a',EVIDENCE,today=CLOCK);b=render(m,Path(d)/'b',EVIDENCE,today=CLOCK)
   text=Path(a['artifact']['svg']).read_text()
   self.assertNotIn('<script>',text);self.assertIn('&lt;script&gt;',text)
   self.assertEqual(a['svg_sha256'],b['svg_sha256']);self.assertFalse(a['publishAllowed'])
   with self.assertRaises((ValueError,FileExistsError)):render(m,Path(d)/'a',EVIDENCE,today=CLOCK)
if __name__=='__main__':unittest.main()

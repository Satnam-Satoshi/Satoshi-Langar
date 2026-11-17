import copy, hashlib, importlib.util, io, json, pathlib, unittest
from PIL import Image
from pypdf import PdfReader
spec=importlib.util.spec_from_file_location('draft_render',pathlib.Path(__file__).with_name('render.py'));m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
def fixture():
    fact={'id':'fact-1','sourceId':'synthetic-source','statement':'A synthetic builder milestone is recorded for this renderer test. This is not real Litecoin reporting.','eventAt':'2026-11-17T12:00:00Z','asOf':'2026-11-17T12:00:00Z','retrievedAt':'2026-11-17T12:01:00Z','evidenceSha256':'a'*64,'limitations':['Synthetic fixture only. Testnet and mainnet are not interchangeable.']}
    return {'schemaVersion':1,'issueId':'synthetic-2026-11-17-r1','issueDate':'2026-11-17','title':'One network. Many frontiers.','sourceUrls':{'synthetic-source':'https://example.org/synthetic-source'},'draft':{'publishable':False,'effects':[],'stories':[{'id':'synthetic-story','title':'Build with evidence, not assumptions','publishable':False,'claimApproved':False,'facts':[fact],'gaps':[{'reason':'Additional ecosystem sources have not been verified.'}]}]}}
class RendererTests(unittest.TestCase):
    def test_actual_four_artifacts_bound_to_hashes(self):
        artifacts,manifest=m.render(fixture());self.assertEqual(set(artifacts),{'edition.pdf','reader.html','cover.png','promo.png'});self.assertFalse(manifest['publishable'])
        for key,content in artifacts.items():self.assertEqual(manifest['artifacts'][key],{'bytes':len(content),'sha256':hashlib.sha256(content).hexdigest()})
        pdf=PdfReader(io.BytesIO(artifacts['edition.pdf']));self.assertEqual(len(pdf.pages),2)
        for page in pdf.pages:self.assertIn(m.NOTICE,page.extract_text());self.assertFalse(page.get('/Annots'))
        self.assertIn('not real Litecoin reporting',' '.join(pdf.pages[1].extract_text().split()))
        for key,size in [('cover.png',(1080,1350)),('promo.png',(1200,630))]:
            image=Image.open(io.BytesIO(artifacts[key]));self.assertEqual(image.size,size);self.assertEqual(image.mode,'RGB')
    def test_deterministic_bytes_and_inert_escaped_text(self):
        value=fixture();value['draft']['stories'][0]['facts'][0]['statement']='<script>alert(1)</script> & untrusted source text'
        first,_=m.render(value);second,_=m.render(value);self.assertEqual(first,second);self.assertNotIn(b'<script>',first['reader.html']);self.assertIn(b'&lt;script&gt;',first['reader.html'])
    def test_approved_missing_source_and_unsafe_urls_rejected(self):
        for change in [lambda x:x['draft'].update(publishable=True),lambda x:x['draft']['stories'][0].update(claimApproved=True),lambda x:x.update(issueId='../old'),lambda x:x.update(sourceUrls={}),lambda x:x['sourceUrls'].update({'synthetic-source':'javascript:alert(1)'}),lambda x:x['sourceUrls'].update({'synthetic-source':'https://user:secret@example.org/'})]:
            value=fixture();change(value)
            with self.assertRaises((ValueError,TypeError)):m.render(value)
    def test_duplicate_json_unknown_fields_and_input_bounds(self):
        for raw in [b'{"a":1,"a":2}',b'{"n":NaN}',b'x'*262145]:
            with self.assertRaises(ValueError):m.parse_json(raw)
        value=fixture();value['other']='unapproved'
        with self.assertRaises(ValueError):m.render(value)
    def test_empty_story_explicit_gap_not_zero_statistic(self):
        value=fixture();value['draft']['stories'][0]['facts']=[];artifacts,_=m.render(value)
        self.assertIn('No source-bound facts',PdfReader(io.BytesIO(artifacts['edition.pdf'])).pages[1].extract_text())
if __name__=='__main__':unittest.main()

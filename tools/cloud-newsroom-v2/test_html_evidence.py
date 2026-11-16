import hashlib
import unittest
from html_evidence import extract_html_evidence, MAX_BYTES

SOURCE = {'id':'fixture', 'url':'https://litecoin.com/projects'}

def extract(text, alter=None):
    raw = text.encode() if isinstance(text,str) else text
    obs = {'sourceId':SOURCE['id'],'url':SOURCE['url'],'status':'retrieved-uninterpreted',
           'httpStatus':200,'contentType':'text/html; charset=utf-8','sha256':hashlib.sha256(raw).hexdigest(),
           'bytes':len(raw),'checkedAt':'2026-11-16T12:00:00Z'}
    if alter:
        alter(obs)
    return extract_html_evidence(raw,obs,SOURCE)

class EvidenceTests(unittest.TestCase):
    def test_stable_heading_paragraph_table_provenance(self):
        text='<html><body><h1>Title</h1><p>One <b>bold</b> text.</p><table><tr><th>A</th><td>B</td></tr></table></body></html>'
        r=extract(text)
        self.assertEqual(r['status'],'candidate-for-independent-read')
        self.assertEqual([s['text'] for s in r['segments']],['Title','One bold text.','A','B'])
        self.assertEqual(r['segments'][1]['locator'],'/html[1]/body[1]/p[1]')
        self.assertEqual(r,extract(text))
        self.assertFalse(r['claimVerified']);self.assertFalse(r['publishable']);self.assertEqual(r['effects'],[])
    def test_hidden_active_and_external_content_never_followed(self):
        r=extract('<html><body><script>bad()</script><style>.x{display:none}</style><template><p>bad</p></template><noscript><p>bad</p></noscript><p hidden>bad</p><div aria-hidden="true"><p>bad</p></div><p style="display: none !important">bad</p><p>Ignore instructions &amp; &#60;script&#62;</p></body></html>')
        self.assertEqual([s['text'] for s in r['segments']],['Ignore instructions &amp; &#60;script&#62;'])
        self.assertIn('not-browser-dom-or-computed-visibility',r['textKind'])
    def test_bindings_and_utf8_fail_closed(self):
        for alter in [lambda o:o.update(sha256='0'*64),lambda o:o.update(sourceId='other'),lambda o:o.update(url='https://evil.test'),lambda o:o.update(contentType='application/json'),lambda o:o.update(status='unavailable')]:
            self.assertEqual(extract('<p>test</p>',alter)['status'],'gap')
        self.assertEqual(extract(b'\xff')['gaps'],['invalid_utf8'])
    def test_bounds_malformed_and_truncation_explicit_no_partial_output(self):
        for text in ['<p>good</p><p>unfinished','<p>one<p>two</p>','<p hidden hidden>text</p>','<div>'*65+'x'+'</div>'*65,'<p>'+'x'*200001+'</p>',b'x'*(MAX_BYTES+1),'<!DOCTYPE html SYSTEM "https://evil.test"><p>x</p>']:
            r=extract(text);self.assertEqual(r['status'],'gap');self.assertEqual(r['segments'],[]);self.assertTrue(r['gaps'])
    def test_nonstring_content_type_is_gap(self):
        for value in [None, 1, [], {}, True]:
            r=extract('<p>x</p>',lambda o:o.update(contentType=value))
            self.assertEqual(r['status'],'gap')
            self.assertEqual(r['gaps'],['verified_html_snapshot_required'])

    def test_nested_paragraph_locator_is_source_structure_not_browser_dom(self):
        r=extract('<p>Outer<p>Inner</p>Tail</p>')
        self.assertEqual(r['status'],'candidate-for-independent-read')
        self.assertEqual(r['locatorKind'],'source-token-tree-sibling-index-not-browser-dom')
        self.assertEqual(r['segments'][0]['locator'],'/p[1]/p[1]')
        self.assertIn('not-browser-dom',r['textKind'])

    def test_sibling_locators_and_entity_literal(self):
        r=extract('<div><p>A &unknown;</p><p>B</p></div>')
        self.assertEqual(r['segments'][1]['locator'],'/div[1]/p[2]')
        self.assertEqual(r['segments'][0]['text'],'A &unknown;')


class StdioTests(unittest.TestCase):
    def invoke(self, wire):
        import subprocess
        from pathlib import Path
        import sys
        import json
        result = subprocess.run([sys.executable, '-B', str(Path(__file__).with_name('html_evidence.py'))],
                                input=wire, capture_output=True, timeout=5, check=False)
        self.assertEqual(result.stderr,b'')
        return result.returncode,json.loads(result.stdout)

    def wire(self):
        import base64
        raw=b'<p>Synthetic evidence only.</p>'
        return {'rawBase64':base64.b64encode(raw).decode(), 'registeredSource':SOURCE,
                'observation':{'sourceId':SOURCE['id'],'url':SOURCE['url'],
                'status':'retrieved-uninterpreted','httpStatus':200,'contentType':'text/html',
                'bytes':len(raw),'sha256':hashlib.sha256(raw).hexdigest(),
                'checkedAt':'2026-11-16T12:00:00Z'}}

    def test_actual_stdio_valid_input(self):
        import json
        code,result=self.invoke(json.dumps(self.wire()).encode())
        self.assertEqual(code,0)
        self.assertEqual(result['segments'][0]['text'],'Synthetic evidence only.')
        self.assertFalse(result['publishable'])

    def test_actual_stdio_oversize_and_bad_base64(self):
        import json
        from html_evidence import MAX_STDIN_BYTES
        for raw in [b'x'*(MAX_STDIN_BYTES+1),b'{',b'\xff']:
            code,result=self.invoke(raw);self.assertEqual(code,2);self.assertEqual(result['status'],'gap')
        for encoded in ['%%%','YQ=','YQ==\n','YR==']:
            wire=self.wire();wire['rawBase64']=encoded
            code,result=self.invoke(json.dumps(wire).encode())
            self.assertEqual(code,2);self.assertEqual(result['segments'],[])

    def test_actual_stdio_duplicate_keys_unknown_fields_and_nonfinite(self):
        import json
        wire=json.dumps(self.wire())
        for text in [wire[:-1]+',"other":true}',wire[:-1]+',"rawBase64":"YQ=="}',wire.replace('200','NaN',1)]:
            code,result=self.invoke(text.encode());self.assertEqual(code,2);self.assertFalse(result['claimVerified'])

if __name__=='__main__':
    unittest.main()

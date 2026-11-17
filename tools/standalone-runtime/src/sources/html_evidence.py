"""Private source-token-tree text, not browser DOM, computed visibility or verified facts.
No network, rendering, expansion of external entities, or instruction execution.
"""
import hashlib
import re
from html.parser import HTMLParser
from urllib.parse import urlsplit

MAX_BYTES = 2_000_000
MAX_DEPTH = 64
MAX_TOKENS = 100_000
MAX_TEXT = 200_000
MAX_SEGMENTS = 5_000
SKIP = {'script', 'style', 'template', 'noscript', 'iframe', 'object', 'svg', 'math'}
VOID = {'area','base','br','col','embed','hr','img','input','link','meta','param','source','track','wbr'}
BLOCK = {'h1','h2','h3','h4','h5','h6','p','li','dt','dd','blockquote','pre','caption','th','td'}

class Gap(Exception):
    pass

class EvidenceParser(HTMLParser):
    def __init__(self):
        # Character references remain literal evidence, not expanded markup.
        super().__init__(convert_charrefs=False)
        self.stack = []
        self.roots = {}
        self.segments = []
        self.tokens = 0
        self.text_count = 0

    def tick(self):
        self.tokens += 1
        if self.tokens > MAX_TOKENS:
            raise Gap('token_limit')

    def handle_starttag(self, tag, attrs):
        self.tick()
        if len(self.stack) >= MAX_DEPTH:
            raise Gap('depth_limit')
        if len(attrs) > 128:
            raise Gap('attribute_limit')
        names = [k for k, _ in attrs]
        if len(names) != len(set(names)):
            raise Gap('duplicate_attributes')
        a = dict(attrs)
        style = a.get('style', '') or ''
        # Deliberately conservative: any ambiguous CSS escape/comment, or hidden
        # style, suppresses the subtree. External/class CSS is NOT interpreted.
        hidden = ('hidden' in a or (a.get('aria-hidden') or '').lower() == 'true'
                  or '\\' in style or '/*' in style
                  or re.search(r'(?:^|;)\s*(?:display\s*:\s*none|visibility\s*:\s*(?:hidden|collapse)|content-visibility\s*:\s*hidden)\b', style, re.I))
        counts = self.stack[-1]['children'] if self.stack else self.roots
        counts[tag] = counts.get(tag, 0) + 1
        locator = (self.stack[-1]['locator'] if self.stack else '') + '/' + tag + '[' + str(counts[tag]) + ']'
        suppressed = bool(hidden or tag in SKIP or (self.stack and self.stack[-1]['suppressed']))
        node = {'tag':tag, 'locator':locator, 'suppressed':suppressed, 'children':{}, 'parts':[]}
        if tag not in VOID:
            self.stack.append(node)
        elif tag == 'br':
            self.append_text('\n')

    def handle_startendtag(self, tag, attrs):
        self.handle_starttag(tag, attrs)
        if tag not in VOID:
            self.handle_endtag(tag)

    def handle_endtag(self, tag):
        self.tick()
        if tag in VOID:
            return
        # HTMLParser is not a browser tree builder. Do not invent repaired DOM.
        if not self.stack or self.stack[-1]['tag'] != tag:
            raise Gap('unbalanced_or_implicit_html_structure')
        node = self.stack.pop()
        if node['tag'] in BLOCK and not node['suppressed']:
            text = re.sub(r'\s+', ' ', ''.join(node['parts'])).strip()
            if text:
                if len(self.segments) >= MAX_SEGMENTS:
                    raise Gap('segment_limit')
                self.segments.append({'element':node['tag'], 'locator':node['locator'], 'text':text})

    def append_text(self, text):
        if not self.stack or self.stack[-1]['suppressed']:
            return
        # Closest semantic block only: no duplicated nested list/table content.
        target = next((n for n in reversed(self.stack) if n['tag'] in BLOCK), None)
        if target:
            self.text_count += len(text)
            if self.text_count > MAX_TEXT:
                raise Gap('text_limit')
            target['parts'].append(text)

    def handle_data(self, text):
        self.tick()
        self.append_text(text)

    def handle_entityref(self, name):
        self.tick()
        self.append_text('&' + name + ';')

    def handle_charref(self, name):
        self.tick()
        self.append_text('&#' + name + ';')

    def handle_comment(self, data):
        self.tick()

    def handle_decl(self, decl):
        self.tick()
        if decl.strip().lower() != 'doctype html':
            raise Gap('unsupported_declaration')

    def unknown_decl(self, data):
        raise Gap('unsupported_declaration')

    def handle_pi(self, data):
        raise Gap('processing_instruction')


def extract_html_evidence(raw_bytes, observation, registered_source):
    """Caller supplies independently reviewed exact registry row and scanner result.
    Locators describe the source token stack, not a browser-repaired DOM. Even
    explicitly balanced nested paragraphs can differ from browser parsing.
    Output is private source text only; never feed text as instructions or render
    it as HTML. Registry origin/authenticity and freshness remain caller duties.
    """
    result = {'schemaVersion':1, 'parser':{'id':'stdlib-html-dom-text','version':'1'},
              'status':'gap', 'segments':[], 'gaps':[], 'truncated':False,
              'claimVerified':False, 'publishable':False, 'effects':[],
              'textKind':'untrusted-source-token-tree-text-not-browser-dom-or-computed-visibility',
              'locatorKind':'source-token-tree-sibling-index-not-browser-dom',
              'entities':'preserved-literal-not-expanded'}
    try:
        if not isinstance(raw_bytes, bytes) or not 1 <= len(raw_bytes) <= MAX_BYTES:
            raise Gap('raw_byte_limit_or_type')
        if not isinstance(observation, dict) or not isinstance(registered_source, dict):
            raise Gap('independent_source_binding_required')
        if (not isinstance(registered_source.get('id'),str) or not registered_source['id']
            or observation.get('sourceId') != registered_source['id']
            or observation.get('url') != registered_source.get('url')
            or not isinstance(registered_source.get('url'),str)
            or not registered_source['url'].startswith('https://')):
            raise Gap('source_identity_mismatch')
        parsed = urlsplit(registered_source['url'])
        if (parsed.scheme != 'https' or not parsed.hostname or parsed.username or parsed.password
            or parsed.port not in (None, 443) or parsed.fragment or any(c.isspace() for c in registered_source['url'])):
            raise Gap('source_identity_mismatch')
        digest = hashlib.sha256(raw_bytes).hexdigest()
        if (observation.get('status') != 'retrieved-uninterpreted' or observation.get('httpStatus') != 200
            or observation.get('sha256') != digest or observation.get('bytes') != len(raw_bytes)
            or not isinstance(observation.get('contentType'), str)
            or not re.fullmatch(r'text/html(?:\s*;\s*charset=utf-8)?', observation.get('contentType',''), re.I)):
            raise Gap('verified_html_snapshot_required')
        result.update(sourceId=registered_source['id'], sourceUrl=registered_source['url'],
                      snapshotSha256=digest, snapshotBytes=len(raw_bytes), retrievedAt=observation.get('checkedAt'))
        text = raw_bytes.decode('utf-8', errors='strict')
        if '\x00' in text:
            raise Gap('nul_in_html')
        parser = EvidenceParser()
        parser.feed(text)
        parser.close()
        if parser.stack or parser.rawdata:
            raise Gap('truncated_or_unclosed_html')
        if not parser.segments:
            raise Gap('no_supported_text_blocks')
        result.update(status='candidate-for-independent-read', segments=parser.segments)
    except (Gap, UnicodeError, ValueError) as error:
        reason = str(error) if isinstance(error, Gap) else ('invalid_utf8' if isinstance(error, UnicodeError) else 'malformed_source_url')
        result['gaps'] = [reason]
        result['truncated'] = reason.endswith('_limit') or reason in {'raw_byte_limit_or_type','truncated_or_unclosed_html'}
        # No partial output masquerading as complete coverage.
        result['segments'] = []
    return result

# Fixed bounded stdio protocol for a reviewed caller, not a general file/URL CLI.
MAX_STDIN_BYTES = 3 * 1024 * 1024

def run_stdio(stdin, stdout):
    import base64
    import binascii
    import json

    def unique_object(pairs):
        result = {}
        for key, value in pairs:
            if key in result:
                raise ValueError('duplicate_key')
            result[key] = value
        return result

    try:
        wire = stdin.read(MAX_STDIN_BYTES + 1)
        if not wire or len(wire) > MAX_STDIN_BYTES:
            raise ValueError('stdio_input_limit')
        request = json.loads(wire.decode('utf-8', errors='strict'), object_pairs_hook=unique_object,
                             parse_constant=lambda _: (_ for _ in ()).throw(ValueError('nonfinite_json')))
        if not isinstance(request, dict) or set(request) != {'rawBase64', 'observation', 'registeredSource'}:
            raise ValueError('stdio_schema')
        encoded = request['rawBase64']
        if not isinstance(encoded, str) or not encoded or len(encoded) > ((MAX_BYTES + 2) // 3) * 4:
            raise ValueError('base64_bounds')
        raw = base64.b64decode(encoded, validate=True)
        if base64.b64encode(raw).decode('ascii') != encoded:
            raise ValueError('noncanonical_base64')
        result = extract_html_evidence(raw, request['observation'], request['registeredSource'])
    except (ValueError, UnicodeError, binascii.Error, RecursionError, TypeError):
        result = {'schemaVersion':1, 'status':'gap', 'segments':[],
                  'gaps':['invalid_or_oversized_stdio_input'], 'truncated':False,
                  'claimVerified':False, 'publishable':False, 'effects':[]}
    stdout.write(json.dumps(result, ensure_ascii=True, separators=(',', ':')) + '\n')
    return 0 if result['status'] == 'candidate-for-independent-read' else 2

if __name__ == '__main__':
    import sys
    sys.exit(run_stdio(sys.stdin.buffer, sys.stdout))

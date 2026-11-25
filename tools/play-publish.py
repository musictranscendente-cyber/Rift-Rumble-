#!/usr/bin/env python3
"""Envia o Rift Rumble para a Google Play pela API (Google Play Developer API v3).

  upload  <arquivo.aab> <faixa> [notas]   envia o .aab e coloca na faixa (ex.: internal)
  promote <de> <para> [versionCode]       copia a versão da faixa <de> para <para> (ex.: internal production)

A chave da conta de serviço vem da variável PLAY_SERVICE_ACCOUNT_JSON (conteúdo do .json).
Precisa de: pip install google-auth requests
"""
import json
import os
import sys

from google.auth.transport.requests import AuthorizedSession
from google.oauth2 import service_account

PKG = os.environ.get('PLAY_PACKAGE', 'com.riftrumble.game')
API = 'https://androidpublisher.googleapis.com/androidpublisher/v3/applications/' + PKG
UPLOAD = 'https://androidpublisher.googleapis.com/upload/androidpublisher/v3/applications/' + PKG
LANG = 'en-US'  # idioma padrão da página da loja


def session():
    info = json.loads(os.environ['PLAY_SERVICE_ACCOUNT_JSON'])
    cred = service_account.Credentials.from_service_account_info(
        info, scopes=['https://www.googleapis.com/auth/androidpublisher'])
    return AuthorizedSession(cred)


def ok(r):
    if r.status_code >= 300:
        sys.exit('Erro da Google Play (%s): %s' % (r.status_code, r.text))
    return r.json() if r.text else {}


def commit(s, edit):
    ok(s.post('%s/edits/%s:commit' % (API, edit)))


def upload(path, track, notes=''):
    s = session()
    edit = ok(s.post(API + '/edits'))['id']
    with open(path, 'rb') as f:
        r = s.post('%s/edits/%s/bundles?uploadType=media' % (UPLOAD, edit), data=f,
                   headers={'Content-Type': 'application/octet-stream'}, timeout=600)
    code = str(ok(r)['versionCode'])
    rel = {'versionCodes': [code], 'status': 'completed'}
    if notes.strip():
        rel['releaseNotes'] = [{'language': LANG, 'text': notes.strip()[:500]}]
    ok(s.put('%s/edits/%s/tracks/%s' % (API, edit, track), json={'track': track, 'releases': [rel]}))
    commit(s, edit)
    print('Versão %s enviada para a faixa "%s".' % (code, track))


def promote(src, dst, code=None):
    s = session()
    edit = ok(s.post(API + '/edits'))['id']
    rels = ok(s.get('%s/edits/%s/tracks/%s' % (API, edit, src))).get('releases', [])
    if code:
        rels = [r for r in rels if code in r.get('versionCodes', [])]
    if not rels:
        sys.exit('Nenhuma versão %sna faixa "%s".' % (code + ' ' if code else '', src))
    best = max(rels, key=lambda r: max(int(c) for c in r['versionCodes']))
    codes = [max(best['versionCodes'], key=int)]
    rel = {'versionCodes': codes, 'status': 'completed'}
    if best.get('releaseNotes'):
        rel['releaseNotes'] = best['releaseNotes']
    ok(s.put('%s/edits/%s/tracks/%s' % (API, edit, dst), json={'track': dst, 'releases': [rel]}))
    commit(s, edit)
    print('Versão %s copiada de "%s" para "%s" (vai para a revisão do Google).' % (codes[0], src, dst))


if __name__ == '__main__':
    a = sys.argv[1:]
    if len(a) >= 3 and a[0] == 'upload':
        upload(a[1], a[2], a[3] if len(a) > 3 else '')
    elif len(a) >= 3 and a[0] == 'promote':
        promote(a[1], a[2], a[3] if len(a) > 3 and a[3] else None)
    else:
        sys.exit(__doc__)

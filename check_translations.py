import json
import os

print('File di base: it.json')
base = json.load(open('./client/src/locales/it.json'))
langs = ['en', 'fr', 'de', 'es', 'ru', 'nl', 'no', 'ro']

# Funzione per appiattire le chiavi JSON
def flatten(obj, prefix=''):
    res = {}
    for k, v in obj.items():
        key = prefix + ('.' if prefix else '') + k
        if isinstance(v, dict):
            res.update(flatten(v, key))
        else:
            res[key] = v
    return res

base_keys = set(flatten(base).keys())

for lang in langs:
    print(f'\n\nAnalisi file: {lang}.json')
    lang_file = json.load(open(f'./client/src/locales/{lang}.json'))
    lang_keys = set(flatten(lang_file).keys())
    
    missing = base_keys - lang_keys
    extra = lang_keys - base_keys
    
    print(f'Chiavi mancanti: {len(missing)}')
    for k in sorted(list(missing))[:20]:
        print(f'- {k}')
    if len(missing) > 20:
        print(f'...e altre {len(missing)-20} chiavi')
    
    print(f'\nChiavi extra: {len(extra)}')
    for k in sorted(list(extra))[:20]:
        print(f'- {k}')
    if len(extra) > 20:
        print(f'...e altre {len(extra)-20} chiavi')
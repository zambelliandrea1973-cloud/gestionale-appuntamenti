import json
import os

# Funzione per appiattire un dizionario JSON in chiavi e valori
def flatten_json(json_obj, prefix="", result=None):
    if result is None:
        result = {}
    
    for key, value in json_obj.items():
        new_key = f"{prefix}.{key}" if prefix else key
        if isinstance(value, dict):
            flatten_json(value, new_key, result)
        else:
            result[new_key] = value
    
    return result

# Carica tutti i file di traduzione
base_path = './client/src/locales/'
languages = ['it', 'en', 'fr', 'de', 'es', 'ru', 'nl', 'no', 'ro']
translations = {}

for lang in languages:
    file_path = os.path.join(base_path, f"{lang}.json")
    with open(file_path, 'r', encoding='utf-8') as f:
        translations[lang] = json.load(f)

# Appiattisci tutti i dizionari
flat_translations = {}
for lang, trans in translations.items():
    flat_translations[lang] = flatten_json(trans)

# Ottieni tutte le chiavi uniche
all_keys = set()
for lang, flat_trans in flat_translations.items():
    all_keys.update(flat_trans.keys())

# Stampa un sommario per ogni lingua
print("\n=== SOMMARIO COMPLETEZZA TRADUZIONI ===")
for lang in languages:
    total_keys = len(all_keys)
    keys_present = len(flat_translations[lang].keys())
    completion_percentage = (keys_present / total_keys) * 100
    print(f"{lang}: {keys_present}/{total_keys} chiavi ({completion_percentage:.2f}%)")

# Controllo per chiavi mancanti rispetto alla lingua base (italiano)
base_lang = 'it'
base_keys = set(flat_translations[base_lang].keys())

print(f"\n=== CHIAVI MANCANTI RISPETTO ALL'ITALIANO ({len(base_keys)} chiavi) ===")
for lang in languages:
    if lang == base_lang:
        continue
    
    lang_keys = set(flat_translations[lang].keys())
    missing_keys = base_keys - lang_keys
    
    if missing_keys:
        print(f"\n{lang}: {len(missing_keys)} chiavi mancanti")
        for key in sorted(missing_keys)[:10]:  # Mostra solo le prime 10 chiavi mancanti
            print(f"  - {key}")
        
        if len(missing_keys) > 10:
            print(f"  ... e altre {len(missing_keys) - 10} chiavi")
    else:
        print(f"\n{lang}: Nessuna chiave mancante")

# Controllo per incoerenze di lunghezza (possibili traduzioni incomplete o errate)
print("\n=== POSSIBILI INCOERENZE NELLE TRADUZIONI ===")
for lang in languages:
    if lang == base_lang:
        continue
    
    incoherencies = []
    for key in base_keys:
        if key in flat_translations[lang]:
            it_text = flat_translations[base_lang].get(key, "")
            lang_text = flat_translations[lang].get(key, "")
            
            # Verifica solo per stringhe non vuote
            if (isinstance(it_text, str) and isinstance(lang_text, str) and 
                len(it_text) > 0 and len(lang_text) > 0):
                
                it_len = len(it_text)
                lang_len = len(lang_text)
                
                # Se la lunghezza è molto diversa (meno della metà o più del doppio)
                if lang_len < it_len * 0.5 or lang_len > it_len * 2:
                    incoherencies.append((key, it_text, lang_text))
    
    if incoherencies:
        print(f"\n{lang}: {len(incoherencies)} possibili incoerenze")
        for i, (key, it_text, lang_text) in enumerate(incoherencies[:5]):  # Mostra solo le prime 5 incoerenze
            print(f"  {i+1}. {key}:")
            print(f"     IT: {it_text}")
            print(f"     {lang.upper()}: {lang_text}")
        
        if len(incoherencies) > 5:
            print(f"  ... e altre {len(incoherencies) - 5} incoerenze")
    else:
        print(f"\n{lang}: Nessuna incoerenza rilevata")
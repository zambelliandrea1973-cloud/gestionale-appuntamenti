import json
import os
import copy

print("=== SCRIPT DI SINCRONIZZAZIONE TRADUZIONI ===\n")

# Carica il file base (it.json)
base_path = './client/src/locales/'
with open(f'{base_path}it.json', 'r', encoding='utf-8') as f:
    base_json = json.load(f)

# Lista delle lingue da aggiornare
langs = ['en', 'fr', 'de', 'es', 'ru', 'nl', 'no', 'ro']

# Funzione per aggiornare ricorsivamente un dizionario con chiavi mancanti
def update_dict(target, source):
    added_keys = []
    
    for key, value in source.items():
        if key not in target:
            # Se la chiave non esiste nel target, la aggiungiamo con un tag di traduzione
            if isinstance(value, str):
                target[key] = f"[NEEDS TRANSLATION] {value}"
                added_keys.append(key)
            else:
                target[key] = copy.deepcopy(value)
                # Se è un dizionario, verifica ricorsivamente
                if isinstance(value, dict):
                    nested_added = update_dict(target[key], value)
                    for nested_key in nested_added:
                        added_keys.append(f"{key}.{nested_key}")
        elif isinstance(value, dict) and isinstance(target[key], dict):
            # Se entrambi sono dizionari, aggiorna ricorsivamente
            nested_added = update_dict(target[key], value)
            for nested_key in nested_added:
                added_keys.append(f"{key}.{nested_key}")
    
    return added_keys

# Funzione per rimuovere chiavi extra (non presenti nel source)
def remove_extra_keys(target, source):
    removed_keys = []
    
    keys_to_remove = []
    for key in target:
        if key not in source:
            keys_to_remove.append(key)
            removed_keys.append(key)
        elif isinstance(target[key], dict) and isinstance(source[key], dict):
            # Se entrambi sono dizionari, rimuovi ricorsivamente
            nested_removed = remove_extra_keys(target[key], source[key])
            for nested_key in nested_removed:
                removed_keys.append(f"{key}.{nested_key}")
    
    for key in keys_to_remove:
        del target[key]
    
    return removed_keys

# Processa ogni file di lingua
for lang in langs:
    lang_file_path = f'{base_path}{lang}.json'
    print(f"Sincronizzazione del file {lang}.json...")
    
    # Carica il file di lingua esistente
    with open(lang_file_path, 'r', encoding='utf-8') as f:
        lang_json = json.load(f)
    
    # Aggiungi chiavi mancanti
    added_keys = update_dict(lang_json, base_json)
    
    # Rimuovi chiavi extra
    removed_keys = remove_extra_keys(lang_json, base_json)
    
    # Salva il file aggiornato
    with open(lang_file_path, 'w', encoding='utf-8') as f:
        json.dump(lang_json, f, indent=2, ensure_ascii=False)
    
    print(f"  ✓ {len(added_keys)} chiavi aggiunte")
    print(f"  ✓ {len(removed_keys)} chiavi rimosse")
    if added_keys:
        print("  Chiavi aggiunte:")
        for key in sorted(added_keys)[:10]:  # Mostra solo le prime 10
            print(f"   - {key}")
        if len(added_keys) > 10:
            print(f"   ... e altre {len(added_keys) - 10} chiavi")
    print("")

print("✅ Tutti i file di localizzazione sono stati sincronizzati con successo!")
print("\nPROSSIMI PASSI:")
print("1. Esegui 'python3 check_translation_completeness.py' per verificare lo stato delle traduzioni")
print("2. Traduci manualmente le chiavi marcate con [NEEDS TRANSLATION]")
print("3. Verifica le incoerenze segnalate e correggi le traduzioni se necessario")
import json
import os
import copy

# Carica il file base (it.json)
with open('./client/src/locales/it.json', 'r', encoding='utf-8') as f:
    base_json = json.load(f)

# Lista delle lingue da aggiornare
langs = ['en', 'fr', 'de', 'es', 'ru', 'nl', 'no', 'ro']

# Funzione per aggiornare un dizionario con chiavi mancanti
def update_dict(target, source):
    for key, value in source.items():
        if key not in target:
            # Se la chiave non esiste nel target, la aggiungiamo
            target[key] = f"[NEEDS TRANSLATION] {value}" if isinstance(value, str) else copy.deepcopy(value)
        elif isinstance(value, dict) and isinstance(target[key], dict):
            # Se entrambi sono dizionari, aggiorna ricorsivamente
            update_dict(target[key], value)

# Funzione per rimuovere chiavi extra (non presenti nel source)
def remove_extra_keys(target, source):
    keys_to_remove = []
    for key in target:
        if key not in source:
            keys_to_remove.append(key)
        elif isinstance(target[key], dict) and isinstance(source[key], dict):
            # Se entrambi sono dizionari, rimuovi ricorsivamente
            remove_extra_keys(target[key], source[key])
    
    for key in keys_to_remove:
        del target[key]

# Processa ogni file di lingua
for lang in langs:
    lang_file_path = f'./client/src/locales/{lang}.json'
    
    # Carica il file di lingua esistente
    with open(lang_file_path, 'r', encoding='utf-8') as f:
        lang_json = json.load(f)
    
    # Crea una copia del file di lingua per confronto
    lang_json_before = copy.deepcopy(lang_json)
    
    # Aggiungi chiavi mancanti
    update_dict(lang_json, base_json)
    
    # Rimuovi chiavi extra
    remove_extra_keys(lang_json, base_json)
    
    # Classe per il conteggio delle modifiche
    class ChangeCounter:
        def __init__(self):
            self.added_count = 0
            self.removed_count = 0
        
        # Funzione per contare le modifiche
        def count_changes(self, before, after, source, prefix=""):
            # Conta aggiunte
            for key, value in after.items():
                path = f"{prefix}.{key}" if prefix else key
                if key not in before:
                    if isinstance(value, dict):
                        self.count_changes({}, value, source[key], path)
                    else:
                        self.added_count += 1
                        print(f"+ Aggiunta: {path}")
                elif isinstance(value, dict) and isinstance(before[key], dict):
                    self.count_changes(before[key], value, source[key], path)
            
            # Conta rimozioni
            for key in before:
                path = f"{prefix}.{key}" if prefix else key
                if key not in after:
                    if isinstance(before[key], dict):
                        # Conta ricorsivamente le chiavi nel dizionario rimosso
                        def count_dict_keys(d):
                            count = 0
                            for k, v in d.items():
                                if isinstance(v, dict):
                                    count += count_dict_keys(v)
                                else:
                                    count += 1
                            return count
                        self.removed_count += count_dict_keys(before[key])
                        print(f"- Rimossa struttura: {path}")
                    else:
                        self.removed_count += 1
                        print(f"- Rimossa: {path}")
    
    # Inizializza il contatore
    counter = ChangeCounter()
    
    counter.count_changes(lang_json_before, lang_json, base_json)
    
    # Salva il file aggiornato
    with open(lang_file_path, 'w', encoding='utf-8') as f:
        json.dump(lang_json, f, indent=2, ensure_ascii=False)
    
    print(f"\nFile {lang}.json aggiornato: {counter.added_count} chiavi aggiunte, {counter.removed_count} chiavi rimosse\n")

print("Tutti i file di localizzazione sono stati aggiornati con successo!")
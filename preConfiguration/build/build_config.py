import json
import yaml
from jinja2 import Template
import os

# Base dir (preConfiguration/build)
BASE_DIR = os.path.dirname(__file__)

# Carica le variabili base (site_name, author)
config_path = os.path.join(BASE_DIR, 'config.json')
with open(config_path, encoding='utf-8') as f:
    config = json.load(f)

# Carica il template
template_path = os.path.join(BASE_DIR, 'mkdocs-template.yml.j2')
with open(template_path, encoding='utf-8') as f:
    template = Template(f.read())

# Configurazioni per le lingue - ora caricate dal config.json
languages = config["languages"]

# Genera mkdocs.yml per ogni lingua
for lang_code, lang_config in languages.items():
    # Carica il file di navigazione specifico per la lingua
    nav_file = lang_config["nav_config_file"]
    nav_path = os.path.join(BASE_DIR, nav_file)
    with open(nav_path, encoding='utf-8') as f:
        nav_yaml = f.read()
    
    # Usa direttamente la configurazione della lingua dal JSON
    # che ora contiene tutto: titoli, autori, contatti, headerFooterPdf
    template_vars = lang_config.copy()
    template_vars.update({
        "nav_yaml": nav_yaml,
        "alternate_link_it": languages["it"]["alternate_link"],
        "alternate_link_en": languages["en"]["alternate_link"]
    })
    
    # Genera il contenuto dal template
    output = template.render(**template_vars)
    
    # Crea la directory se non esiste
    config_dir = os.path.dirname(lang_config["path"])
    if config_dir and not os.path.exists(config_dir):
        os.makedirs(config_dir, exist_ok=True)
    
    # Salva il file di configurazione
    with open(lang_config["path"], "w", encoding="utf-8") as f:
        f.write(output)
    
    print(f"✅ mkdocs.yml {lang_code.upper()} generato con successo in {lang_config['path']}")

print("🎉 Configurazioni per tutte le lingue generate con successo!")


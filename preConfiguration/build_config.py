import json
import yaml
from jinja2 import Template
import os

# Carica le variabili base (site_name, author)
with open("preConfiguration/config.json") as f:
    config = json.load(f)

# Carica nav da nav.yml e converti in stringa YAML
with open("preConfiguration/nav_config.yml") as f:
    nav_yaml = f.read()

# Carica il template
with open("preConfiguration/mkdocs-template.yml.j2") as f:
    template = Template(f.read())

# Configurazioni per le lingue
languages = {
    "it": {
        "path": "config/ita/mkdocs.yml",
        "site_name": config["site_name"],
        "language_code": "it",
        "docs_dir": "../../docs/ita",
        "site_dir": "../../generated/ita",
        "alternate_link": "/ita/",
        "search_lang": "it"
    },
    "en": {
        "path": "config/en/mkdocs.yml",
        "site_name": config["site_name"] + " (EN)",
        "language_code": "en", 
        "docs_dir": "../../docs/en",
        "site_dir": "../../generated/en",
        "alternate_link": "/en/",
        "search_lang": "en"
    }
}

# Genera mkdocs.yml per ogni lingua
for lang_code, lang_config in languages.items():
    # Prepara le variabili per il template
    template_vars = config.copy()
    template_vars.update({
        "nav_yaml": nav_yaml,
        "language_code": lang_config["language_code"],
        "docs_dir": lang_config["docs_dir"],
        "site_dir": lang_config["site_dir"],
        "site_name": lang_config["site_name"],
        "alternate_link_it": languages["it"]["alternate_link"],
        "alternate_link_en": languages["en"]["alternate_link"],
        "search_lang": lang_config["search_lang"]
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


import json
from jinja2 import Template
import os

# Base directory of this script (preConfiguration/pdf)
BASE_DIR = os.path.dirname(__file__)

# Carica config.json (moved under preConfiguration/build/config.json)
config_path = os.path.normpath(os.path.join(BASE_DIR, '..', 'build', 'config.json'))
with open(config_path, encoding='utf-8') as f:
    config = json.load(f)

# Percorso cartella template (this folder)
template_folder = BASE_DIR

def render_template(filename, context):
    path = os.path.join(template_folder, filename)
    with open(path, encoding='utf-8') as f:
        template = Template(f.read())
    return template.render(**context)


def save_rendered(content, filename):
    dir_path = os.path.dirname(filename)
    if dir_path and not os.path.exists(dir_path):
        os.makedirs(dir_path, exist_ok=True)
    with open(filename, "w") as f:
        f.write(content)

# Lista dei template da generare e nomi file output (senza .j2)
# Usa la configurazione italiana come default per i PDF
default_lang_config = config["languages"]["it"]

templates = [
    ("pdf-header.html.j2", "documentation/pdfGeneration/pdf-header.html"),
    ("pdf-footer.html.j2", "documentation/pdfGeneration/pdf-footer.html"),
    ("pdf-firstPage.html.j2", "documentation/pdfGeneration/pdf-firstPage.html"),
]

for tpl_file, out_file in templates:
    rendered = render_template(tpl_file, default_lang_config)
    save_rendered(rendered, out_file)
    print(f"Generato {out_file}")

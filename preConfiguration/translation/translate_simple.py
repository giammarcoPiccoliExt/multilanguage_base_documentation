#!/usr/bin/env python3
"""
Script semplificato per traduzione markdown.
Funziona correttamente su Windows con percorsi assoluti.
"""

import os
import sys
import subprocess
from pathlib import Path

def translate_single_file(input_file, output_file, language="English"):
    """Traduce un singolo file markdown."""
    # Percorso assoluto al CLI
    cli_path = Path(__file__).parent / "markdown-translator" / "bin" / "cli.js"
    
    if not cli_path.exists():
        print(f"❌ CLI non trovato: {cli_path}")
        return False
    
    # Converti in percorsi assoluti
    input_path = Path(input_file).resolve()
    output_path = Path(output_file).resolve()
    
    # Crea directory output se non esiste
    output_path.parent.mkdir(parents=True, exist_ok=True)
    
    cmd = [
        "node",
        str(cli_path),
        "translate",
        "-i", str(input_path),
        "-l", language,
        "-o", str(output_path)
    ]
    
    print(f"🔄 Traduzione: {input_path.name} -> {language}")
    
    try:
        # Cambia directory alla root del progetto
        project_root = Path(__file__).parent.parent.parent
        
        result = subprocess.run(
            cmd,
            cwd=project_root,
            capture_output=False,  # Mostra output in tempo reale
            text=True,
            check=True
        )
        
        print(f"✅ Completato: {output_path.name}")
        return True
        
    except subprocess.CalledProcessError as e:
        print(f"❌ Errore: {e}")
        return False
    except Exception as e:
        print(f"❌ Errore inaspettato: {e}")
        return False

def translate_all_files():
    """Traduce tutti i file .md da docs/it a docs/en."""
    project_root = Path(__file__).parent.parent.parent
    
    # Directory di input e output
    input_dir = project_root / "docs" / "it"
    output_dir = project_root / "docs" / "en"
    
    if not input_dir.exists():
        print(f"❌ Directory non trovata: {input_dir}")
        return False
    
    # Trova tutti i file .md
    md_files = list(input_dir.glob("*.md"))
    
    if not md_files:
        print(f"❌ Nessun file .md trovato in: {input_dir}")
        return False
    
    print(f"📁 Trovati {len(md_files)} file .md")
    print(f"📂 Input:  {input_dir}")
    print(f"📂 Output: {output_dir}")
    print()
    
    success_count = 0
    total_count = len(md_files)
    
    for i, input_file in enumerate(md_files, 1):
        print(f"[{i}/{total_count}] ", end="")
        
        output_file = output_dir / input_file.name
        
        if translate_single_file(input_file, output_file):
            success_count += 1
        
        print()  # Riga vuota tra file
    
    print("=" * 50)
    print(f"📊 Risultati:")
    print(f"   Totale: {total_count}")
    print(f"   Successo: {success_count}")
    print(f"   Falliti: {total_count - success_count}")
    
    return success_count == total_count

def check_prerequisites():
    """Verifica prerequisiti."""
    # Controlla API key
    api_key = os.getenv('GEMINI_API_KEY')
    if not api_key:
        print("❌ GEMINI_API_KEY non impostata!")
        print("💡 Imposta con: $env:GEMINI_API_KEY = 'your-api-key'")
        return False
    
    print(f"✅ API key OK (termina con: ...{api_key[-8:]})")
    
    # Controlla CLI
    cli_path = Path(__file__).parent / "markdown-translator" / "bin" / "cli.js"
    if not cli_path.exists():
        print(f"❌ CLI non trovato: {cli_path}")
        print("💡 Esegui: python setup_markdown_translator.py")
        return False
    
    print("✅ CLI markdown-translator OK")
    return True

def main():
    """Funzione principale."""
    print("🌍 Traduttore Markdown Semplificato")
    print("=" * 50)
    
    if not check_prerequisites():
        sys.exit(1)
    
    print()
    
    if len(sys.argv) > 1 and sys.argv[1] == "--single":
        # Modalità singolo file per test
        project_root = Path(__file__).parent.parent.parent
        input_file = project_root / "docs" / "it" / "index.md"
        output_file = project_root / "docs" / "en" / "index.md"
        
        success = translate_single_file(input_file, output_file)
        sys.exit(0 if success else 1)
    else:
        # Modalità batch
        success = translate_all_files()
        
        if success:
            print("\n🎉 Traduzione completata con successo!")
        else:
            print("\n❌ Traduzione completata con errori")
        
        sys.exit(0 if success else 1)

if __name__ == "__main__":
    main()
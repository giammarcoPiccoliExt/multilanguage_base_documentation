

import os
import subprocess

def translate_markdown_dir(src_dir, dst_dir):
    # Requires translate-shell (https://github.com/soimort/translate-shell)
    # Install on Windows via WSL or on Linux/macOS: sudo apt install translate-shell
    if not os.path.exists(dst_dir):
        os.makedirs(dst_dir)
    for filename in os.listdir(src_dir):
        if filename.endswith(".md"):
            src_path = os.path.join(src_dir, filename)
            dst_path = os.path.join(dst_dir, filename)
            with open(src_path, encoding="utf-8") as f:
                text = f.read()
            print(f"Translating {src_path} -> {dst_path}")
            # Use translate-shell CLI (trans) for local translation
            # -b: brief mode (no extra info), -no-ansi: plain text, :en for target language
            try:
                result = subprocess.run([
                    "trans", "-b", "-no-ansi", "-s", "it", "-t", "en"],
                    input=text, text=True, capture_output=True, check=True
                )
                translated = result.stdout
            except Exception as e:
                print(f"Translation failed for {src_path}: {e}")
                translated = text
            with open(dst_path, "w", encoding="utf-8") as f:
                f.write(translated)

def main():
    src_dir = os.path.join("docs", "it")
    dst_dir = os.path.join("docs", "en")
    translate_markdown_dir(src_dir, dst_dir)

if __name__ == "__main__":
    main()

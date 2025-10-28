import os
import requests

def translate_with_ollama(text, target_lang, model="gemma3:1b"):
	url = f"http://localhost:11434/api/generate"
	prompt = f"Traduci in {target_lang} mantenendo la formattazione markdown.\n\n{text}"
	payload = {
		"model": model,
		"prompt": prompt,
		"stream": False
	}
	response = requests.post(url, json=payload)
	response.raise_for_status()
	return response.json()["response"]

def batch_translate(src_dir, dst_dir, target_lang):
	if not os.path.exists(dst_dir):
		os.makedirs(dst_dir)
	for filename in os.listdir(src_dir):
		if filename.endswith(".md"):
			src_path = os.path.join(src_dir, filename)
			dst_path = os.path.join(dst_dir, filename)
			with open(src_path, encoding="utf-8") as f:
				text = f.read()
			print(f"Translating {src_path} -> {dst_path}")
			translated = translate_with_ollama(text, target_lang)
			with open(dst_path, "w", encoding="utf-8") as f:
				f.write(translated)

def main():
	# Translate all .md files from docs/it to docs/en
	src_dir = os.path.join("docs", "it")
	dst_dir = os.path.join("docs", "en")
	target_lang = "english"
	batch_translate(src_dir, dst_dir, target_lang)

if __name__ == "__main__":
	main()

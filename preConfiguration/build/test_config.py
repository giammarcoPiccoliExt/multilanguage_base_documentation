#!/usr/bin/env python3
import json
import os

# Test loading config.json
BASE_DIR = os.path.dirname(__file__)
config_path = os.path.join(BASE_DIR, 'config.json')

print(f"Loading config from: {config_path}")

try:
    with open(config_path, encoding='utf-8') as f:
        config = json.load(f)
    
    print("✅ Config.json loaded successfully")
    print(f"Languages found: {list(config['languages'].keys())}")
    
    for lang_code, lang_config in config["languages"].items():
        nav_file = lang_config.get("nav_config_file", "NOT_FOUND")
        nav_path = os.path.join(BASE_DIR, nav_file)
        print(f"  {lang_code}: nav file = {nav_file}, exists = {os.path.exists(nav_path)}")
        
        if os.path.exists(nav_path):
            with open(nav_path, encoding='utf-8') as f:
                nav_content = f.read()
            print(f"    Content length: {len(nav_content)} chars")
        
except Exception as e:
    print(f"❌ Error: {e}")
    import traceback
    traceback.print_exc()
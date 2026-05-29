import sys
import json
import os

# Set the path to the src directory where the package lives
sys.path.append(os.path.join(os.path.dirname(__file__), 'mwparserfromhell', 'src'))

import mwparserfromhell

def parse_wikicode():
    try:
        # Read raw text from stdin
        text = sys.stdin.read()
        wikicode = mwparserfromhell.parse(text)
        
        # Extract structured data
        templates = []
        for t in wikicode.filter_templates():
            params = {}
            for p in t.params:
                params[p.name.strip()] = p.value.strip()
            templates.append({
                "name": t.name.strip(),
                "params": params
            })
            
        output = {
            "templates": templates,
            "wikilinks": [l.title.strip() for l in wikicode.filter_wikilinks()],
            "text": str(wikicode)
        }
        
        print(json.dumps(output))
    except Exception as e:
        print(json.dumps({"error": str(e)}), file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    parse_wikicode()

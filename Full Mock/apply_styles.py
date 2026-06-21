import os
import re

def process_file(file_path):
    print(f"Processing: {file_path}")
    with open(file_path, "r", encoding="utf-8") as f:
        content = f.read()

    # Regex to find <style>...</style> block
    style_pattern = re.compile(r'<style>.*?</style>', re.DOTALL)
    
    # Check if there is a style block
    if style_pattern.search(content):
        # Replace the style block with the stylesheet link
        new_link = '<link rel="stylesheet" href="style.css">'
        updated_content = style_pattern.sub(new_link, content)
        
        with open(file_path, "w", encoding="utf-8") as f:
            f.write(updated_content)
        print(f"Successfully updated: {file_path}")
    else:
        print(f"No style block found or already updated in: {file_path}")

def main():
    directory = "."
    for filename in os.listdir(directory):
        if filename.endswith(".html"):
            file_path = os.path.join(directory, filename)
            process_file(file_path)

if __name__ == "__main__":
    main()

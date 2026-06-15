import re
from pathlib import Path

root = Path('frontend/src/mia_studio/components')

for f in sorted(root.glob('*.tsx')):
    text = f.read_text(encoding='utf-8')
    changed = False
    
    # Fix: <button\s+type=button (malformed)
    if re.search(r'<button\s+type=button', text):
        text = re.sub(r'<button\s+type=button(\s+type=button)*', r'<button type="button"', text)
        changed = True
    
    # Fix: <button followed directly by className (missing type)
    if re.search(r'<button\s+\w+=', text):
        text = re.sub(r'<button(\s+)(?!type=)(\w+=)', lambda m: f'<button{m.group(1)}type="button" {m.group(2)}', text)
        changed = True
    
    if changed:
        f.write_text(text, encoding='utf-8')
        print(f'✓ Fixed: {f.name}')
    else:
        print(f'- Skipped: {f.name}')

print('\nDone!')

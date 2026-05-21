import sys

with open('frontend/src/Home.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

modal_start_idx = content.find('{/* COMPANION SETTINGS MODAL */}')
if modal_start_idx == -1:
    print("Modal not found")
    sys.exit(1)

# The modal starts at modal_start_idx. It goes until the `    </div>\n  );\n});` at the end, but the `    </div>\n  );\n});` belongs to `ChatBubble`!
# Actually, the modal itself ends with `      )}\n`
modal_end_idx = content.find('      )}\n', modal_start_idx)
if modal_end_idx == -1:
    print("Modal end not found")
    sys.exit(1)

modal_text = content[modal_start_idx:modal_end_idx + 9]

# Remove the modal from the end
content = content.replace(modal_text, '')

# Find `interface ChatBubbleProps`
props_idx = content.find('interface ChatBubbleProps {')

# The `  }\n` before `interface ChatBubbleProps` belongs to `Home()`
insert_idx = content.rfind('  }\n', 0, props_idx)
if insert_idx == -1:
    print("Insert index not found")
    sys.exit(1)

# Insert the modal just before the `  }\n`
new_content = content[:insert_idx] + '    ' + modal_text.strip() + '\n' + content[insert_idx:]

with open('frontend/src/Home.tsx', 'w', encoding='utf-8') as f:
    f.write(new_content)

print("Moved modal successfully!")

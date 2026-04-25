import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from config import load_config
c = load_config()
print("Config OK")
print("  bot_name:", c.bot_name)
print("  providers:", list(c.providers.keys()))
print("  appearance type:", c.appearance.background_type)
print("  ui_opacity:", c.appearance.ui_opacity)
for name, p in c.providers.items():
    print(f"  [{name}] active={p.is_active} default={p.is_default} model={p.model_id} protocol={p.protocol} key_set={'YES' if p.api_key else 'NO'}")

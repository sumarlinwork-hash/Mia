import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from config import get_default_config, save_config, load_config

# Regenerate config with defaults (preserves any existing valid data)
c = get_default_config()
save_config(c)
print("config.json regenerated with defaults.")

# Verify
c2 = load_config()
print("Verification:")
print("  bot_name:", c2.bot_name)
print("  bot_persona:", c2.bot_persona[:60], "...")
for name, p in c2.providers.items():
    key_status = "KEY SET ✓" if p.api_key else "NO KEY ⚠ (set in Settings)"
    print(f"  [{name}] active={p.is_active} default={p.is_default} protocol={p.protocol} | {key_status}")

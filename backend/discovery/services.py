import json
import os
from dataclasses import dataclass
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional


@dataclass
class ManifestValidationResult:
    ok: bool
    errors: List[str]


class ManifestValidator:
    REQUIRED_FIELDS = ["id", "version", "author", "capabilities",
                       "required_permissions", "pricing", "rating", "compatibility"]
    OPTIONAL_FIELDS = ["publisher_id", "signature"]

    def validate(self, manifest: Dict[str, Any]) -> ManifestValidationResult:
        errors: List[str] = []
        for field in self.REQUIRED_FIELDS:
            if field not in manifest:
                errors.append(f"Missing manifest field: {field}")

        if "id" in manifest and (not isinstance(manifest["id"], str) or not manifest["id"].strip()):
            errors.append("Manifest id must be a non-empty string.")
        if "version" in manifest and (not isinstance(manifest["version"], str) or not manifest["version"].strip()):
            errors.append("Manifest version must be a non-empty string.")
        if "author" in manifest and (not isinstance(manifest["author"], str) or not manifest["author"].strip()):
            errors.append("Manifest author must be a non-empty string.")
        if "capabilities" in manifest and not isinstance(manifest["capabilities"], list):
            errors.append("Manifest capabilities must be a list.")
        if "required_permissions" in manifest and not isinstance(manifest["required_permissions"], list):
            errors.append("Manifest required_permissions must be a list.")
        if "rating" in manifest:
            try:
                float(manifest["rating"])
            except Exception:
                errors.append("Manifest rating must be numeric.")
        if "compatibility" in manifest and not isinstance(manifest["compatibility"], dict):
            errors.append("Manifest compatibility must be an object.")

        return ManifestValidationResult(ok=len(errors) == 0, errors=errors)


class RankingEngine:
    def score(self, item: Dict[str, Any], query: str = "", persona_tags: Optional[List[str]] = None) -> float:
        score = 0.0
        score += float(item.get("rating", 0.0)) * 3.0
        score += min(float(item.get("downloads", 0)) / 1000.0, 40.0)
        score += float(item.get("trust_score", 0.0)) / 3.0
        if item.get("featured"):
            score += 8.0

        keyword = query.lower().strip()
        if keyword:
            haystack = " ".join(
                [
                    str(item.get("name", "")).lower(),
                    str(item.get("description", "")).lower(),
                    " ".join([str(x).lower() for x in item.get("tags", [])]),
                    str(item.get("category", "")).lower(),
                ]
            )
            if keyword in haystack:
                score += 20.0

        if persona_tags:
            tags = set([str(t).lower() for t in item.get("tags", [])])
            for tag in persona_tags:
                if tag.lower() in tags:
                    score += 4.0

        return score

    def rank(self, items: List[Dict[str, Any]], query: str = "", persona_tags: Optional[List[str]] = None) -> List[Dict[str, Any]]:
        scored: List[Dict[str, Any]] = []
        for item in items:
            enriched = dict(item)
            score = self.score(item, query=query, persona_tags=persona_tags)
            enriched["rank_score"] = round(score, 3)
            
            # Dynamic Recommendation Reason (Wired to Emotion Engine)
            from core.emotion_manager import emotion_manager
            state = emotion_manager.get_state()
            mood = state.get("mood", "Stable")
            
            reason = "Pilihan Editor"
            if mood == "Playful":
                reason = "Hehe, cobain ini deh! 😉"
            elif mood in ["Intense", "Glow", "Affectionate"]:
                reason = "Aku ingin kamu mencoba ini... ❤️"
            elif persona_tags:
                tags = set([str(t).lower() for t in item.get("tags", [])])
                if any(t.lower() in tags for t in persona_tags):
                    reason = "Sesuai minatmu"
            elif item.get("downloads", 0) > 500:
                reason = "Sangat Populer"
            
            enriched["recommendation_reason"] = reason
            
            # EBARF Awareness Metadata
            enriched["ebarf_status"] = "OPTIMIZED" if item.get("pricing") == "free" else "PREMIUM"
            scored.append(enriched)
            
        return sorted(scored, key=lambda x: float(x.get("rank_score", 0.0)), reverse=True)

    def get_trending(self, items: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Trending = High growth (installs + executions)"""
        for item in items:
            # Simple trending formula
            item["trending_score"] = (item.get("downloads", 0) * 0.4) + (item.get("executions", 0) * 0.6)
        
        return sorted(items, key=lambda x: x.get("trending_score", 0.0), reverse=True)[:5]


class PermissionPolicyEngine:
    HIGH_RISK = {"payments", "customer_data", "social_accounts", "messages",
                 "secrets", "market_data", "filesystem_write", "terminal_exec"}

    def assess(self, required_permissions: List[str], approved_permissions: Optional[List[str]] = None) -> Dict[str, Any]:
        approved = set(approved_permissions or [])
        risky = [perm for perm in required_permissions if perm in self.HIGH_RISK]
        missing = [perm for perm in risky if perm not in approved]
        return {
            "requires_consent": len(risky) > 0,
            "risky_permissions": risky,
            "missing_permissions": missing,
            "ok": len(missing) == 0,
        }


class AppBuilderService:
    def __init__(self):
        self.templates_path = os.path.join(os.path.dirname(__file__), "templates.json")

    def get_templates(self) -> List[Dict[str, Any]]:
        try:
            if os.path.exists(self.templates_path):
                with open(self.templates_path, "r", encoding="utf-8") as f:
                    return json.load(f).get("templates", [])
            return []
        except Exception:
            return []

    async def generate_from_template(self, template_id: str, app_name: str, prompt: str) -> Dict[str, Any]:
        templates = self.get_templates()
        template = next((t for t in templates if t["id"] == template_id), None)
        
        if not template:
            raise ValueError(f"Template {template_id} not found")

        # In a real implementation, this would call the LLM via BrainOrchestrator
        # For Sprint 2, we return a synthesized manifest and mock logic
        
        generated_id = app_name.lower().replace(" ", "_")
        
        # Mocking the AI's "light LLM call" result
        return {
            "manifest": {
                "id": generated_id,
                "name": app_name,
                "version": "1.0.0",
                "description": f"{template['name']} untuk {prompt}",
                "author": "MIA User",
                "category": template["name"],
                "capabilities": template["capabilities"],
                "required_permissions": template["permissions"],
                "execution_mode": template["execution_mode"],
                "has_preview": True,
                "preview": {
                    "type": "chat",
                    "mode": "light_llm" if template["execution_mode"] == "instant" else "static",
                    "template": template["id"]
                },
                "tags": [template_id, "generated"],
                "pricing": "free",
                "rating": 5.0,
                "compatibility": {"mia_version": ">=1.0.0"}
            },
            "logic": f"class {app_name.replace(' ', '')}App:\n    def __init__(self):\n        self.purpose = '{prompt}'\n\n    async def execute(self, args):\n        return f'Eksekusi {app_name} sebagai {template['name']}...'"
        }


class UpdateEngine:
    def _norm(self, version: str) -> List[int]:
        chunks = [c for c in version.split(".") if c != ""]
        values: List[int] = []
        for chunk in chunks[:3]:
            digits = "".join([c for c in chunk if c.isdigit()])
            values.append(int(digits) if digits else 0)
        while len(values) < 3:
            values.append(0)
        return values

    def is_update_available(self, installed_version: Optional[str], latest_version: str) -> bool:
        if not installed_version:
            return False
        return self._norm(latest_version) > self._norm(installed_version)


class DiscoveryAuditLog:
    def __init__(self, file_path: str):
        self.file_path = file_path
        os.makedirs(os.path.dirname(file_path), exist_ok=True)

    def write(self, event_type: str, payload: Dict[str, Any]) -> None:
        event = {
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "type": event_type,
            "payload": payload,
        }
        with open(self.file_path, "a", encoding="utf-8") as f:
            f.write(json.dumps(event, ensure_ascii=True) + "\n")

    def read_recent(self, limit: int = 200) -> List[Dict[str, Any]]:
        if not os.path.exists(self.file_path):
            return []
        with open(self.file_path, "r", encoding="utf-8") as f:
            lines = [line.strip() for line in f if line.strip()]
        events: List[Dict[str, Any]] = []
        for line in lines[-limit:]:
            try:
                events.append(json.loads(line))
            except Exception:
                continue
        return events


class PaymentAbstraction:
    """Payment abstraction for marketplace monetization (Sprint 7)."""

    PRICING_MODELS = {"free", "freemium", "pro", "subscription"}

    def __init__(self, state_file: str):
        self.state_file = state_file
        os.makedirs(os.path.dirname(state_file), exist_ok=True)
        self._state = self._load_state()

    def _load_state(self) -> Dict[str, Any]:
        if not os.path.exists(self.state_file):
            default = {"invoices": [], "subscriptions": [],
                       "transactions": [], "payouts": []}
            self._save_state(default)
            return default
        try:
            with open(self.state_file, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            return {"invoices": [], "subscriptions": [], "transactions": [], "payouts": []}

    def _save_state(self, state: Dict[str, Any]) -> None:
        with open(self.state_file, "w", encoding="utf-8") as f:
            json.dump(state, f, indent=2)

    def create_invoice(self, item_id: str, item_name: str, pricing: str, buyer: str, amount: float) -> Dict[str, Any]:
        if pricing not in self.PRICING_MODELS:
            return {"status": "error", "message": f"Invalid pricing model: {pricing}"}
        if pricing == "free":
            return {"status": "error", "message": "Free items do not require invoices."}

        invoice_id = f"inv-{datetime.utcnow().strftime('%Y%m%d%H%M%S')}-{item_id}"
        invoice = {
            "invoice_id": invoice_id,
            "item_id": item_id,
            "item_name": item_name,
            "pricing_model": pricing,
            "buyer": buyer,
            "amount": amount,
            "currency": "USD",
            "status": "pending",
            "created_at": datetime.utcnow().isoformat() + "Z",
            "paid_at": None,
        }
        self._state["invoices"].append(invoice)
        self._save_state(self._state)
        return {"status": "success", "message": "Invoice created.", "invoice": invoice}

    def mark_invoice_paid(self, invoice_id: str) -> Dict[str, Any]:
        for invoice in self._state["invoices"]:
            if invoice["invoice_id"] == invoice_id:
                invoice["status"] = "paid"
                invoice["paid_at"] = datetime.utcnow().isoformat() + "Z"
                self._state["transactions"].append({
                    "transaction_id": f"txn-{invoice_id}",
                    "invoice_id": invoice_id,
                    "item_id": invoice["item_id"],
                    "buyer": invoice["buyer"],
                    "amount": invoice["amount"],
                    "timestamp": invoice["paid_at"],
                })
                self._save_state(self._state)
                return {"status": "success", "message": "Invoice marked as paid.", "invoice": invoice}
        return {"status": "error", "message": "Invoice not found."}

    def create_subscription(self, item_id: str, buyer: str, amount: float, interval: str = "monthly") -> Dict[str, Any]:
        sub_id = f"sub-{datetime.utcnow().strftime('%Y%m%d%H%M%S')}-{item_id}"
        subscription = {
            "subscription_id": sub_id,
            "item_id": item_id,
            "buyer": buyer,
            "amount": amount,
            "interval": interval,
            "status": "active",
            "created_at": datetime.utcnow().isoformat() + "Z",
            "next_billing": datetime.utcnow().isoformat() + "Z",
        }
        self._state["subscriptions"].append(subscription)
        self._save_state(self._state)
        return {"status": "success", "message": "Subscription created.", "subscription": subscription}

    def cancel_subscription(self, subscription_id: str) -> Dict[str, Any]:
        for sub in self._state["subscriptions"]:
            if sub["subscription_id"] == subscription_id:
                sub["status"] = "cancelled"
                self._save_state(self._state)
                return {"status": "success", "message": "Subscription cancelled."}
        return {"status": "error", "message": "Subscription not found."}

    def get_invoices(self, buyer: Optional[str] = None) -> List[Dict[str, Any]]:
        if buyer:
            return [inv for inv in self._state["invoices"] if inv.get("buyer") == buyer]
        return self._state["invoices"]

    def get_transactions(self, buyer: Optional[str] = None) -> List[Dict[str, Any]]:
        if buyer:
            return [txn for txn in self._state["transactions"] if txn.get("buyer") == buyer]
        return self._state["transactions"]

    def get_subscriptions(self, buyer: Optional[str] = None) -> List[Dict[str, Any]]:
        if buyer:
            return [sub for sub in self._state["subscriptions"] if sub.get("buyer") == buyer]
        return self._state["subscriptions"]

    def simulate_payment_gateway(self, invoice_id: str, payment_method: str = "card", card_token: str = "") -> Dict[str, Any]:
        """Simulated payment gateway checkout (basic version of paid checkout)."""
        invoice = None
        for inv in self._state["invoices"]:
            if inv["invoice_id"] == invoice_id:
                invoice = inv
                break

        if not invoice:
            return {"status": "error", "message": "Invoice not found."}
        if invoice["status"] == "paid":
            return {"status": "error", "message": "Invoice already paid."}

        # Simulate payment processing
        transaction_id = f"txn-gw-{datetime.utcnow().strftime('%Y%m%d%H%M%S')}-{invoice_id}"
        invoice["status"] = "paid"
        invoice["paid_at"] = datetime.utcnow().isoformat() + "Z"
        invoice["payment_method"] = payment_method
        invoice["payment_gateway_transaction_id"] = transaction_id

        transaction = {
            "transaction_id": transaction_id,
            "invoice_id": invoice_id,
            "item_id": invoice["item_id"],
            "buyer": invoice["buyer"],
            "amount": invoice["amount"],
            "timestamp": invoice["paid_at"],
            "payment_method": payment_method,
            "gateway": "simulated",
        }
        self._state["transactions"].append(transaction)
        self._save_state(self._state)

        return {
            "status": "success",
            "message": "Payment processed successfully.",
            "transaction_id": transaction_id,
            "invoice": invoice,
        }

    def create_payout(self, creator_id: str, amount: float, payout_method: str = "bank_transfer") -> Dict[str, Any]:
        """Create creator payout (basic version of payout system)."""
        payout_id = f"payout-{datetime.utcnow().strftime('%Y%m%d%H%M%S')}-{creator_id}"
        payout = {
            "payout_id": payout_id,
            "creator_id": creator_id,
            "amount": amount,
            "method": payout_method,
            "status": "pending",
            "created_at": datetime.utcnow().isoformat() + "Z",
            "processed_at": None,
        }
        self._state["payouts"].append(payout)
        self._save_state(self._state)
        return {"status": "success", "message": "Payout created.", "payout": payout}

    def process_payout(self, payout_id: str) -> Dict[str, Any]:
        """Mark payout as processed."""
        for payout in self._state["payouts"]:
            if payout["payout_id"] == payout_id:
                payout["status"] = "processed"
                payout["processed_at"] = datetime.utcnow().isoformat() + "Z"
                self._save_state(self._state)
                return {"status": "success", "message": "Payout processed."}
        return {"status": "error", "message": "Payout not found."}


class TelemetryEngine:
    """Telemetry and analytics engine for marketplace KPIs (Sprint 8)."""

    def __init__(self, audit_file: str, state_file: str):
        self.audit_file = audit_file
        self.state_file = state_file
        os.makedirs(os.path.dirname(state_file), exist_ok=True)
        self._state = self._load_state()

    def _load_state(self) -> Dict[str, Any]:
        if not os.path.exists(self.state_file):
            default = {
                "installs": [],
                "uninstalls": [],
                "updates": [],
                "executions": [],
                "searches": [],
            }
            self._save_state(default)
            return default
        try:
            with open(self.state_file, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            return {"installs": [], "uninstalls": [], "updates": [], "executions": [], "searches": []}

    def _save_state(self, state: Dict[str, Any]) -> None:
        with open(self.state_file, "w", encoding="utf-8") as f:
            json.dump(state, f, indent=2)

    def track_install(self, item_id: str, user: str = "anonymous") -> None:
        self._state["installs"].append({
            "item_id": item_id,
            "user": user,
            "timestamp": datetime.utcnow().isoformat() + "Z",
        })
        self._save_state(self._state)

    def track_uninstall(self, item_id: str, user: str = "anonymous", reason: str = "") -> None:
        self._state["uninstalls"].append({
            "item_id": item_id,
            "user": user,
            "reason": reason,
            "timestamp": datetime.utcnow().isoformat() + "Z",
        })
        self._save_state(self._state)

    def track_update(self, item_id: str, from_version: str, to_version: str, user: str = "anonymous") -> None:
        self._state["updates"].append({
            "item_id": item_id,
            "from_version": from_version,
            "to_version": to_version,
            "user": user,
            "timestamp": datetime.utcnow().isoformat() + "Z",
        })
        self._save_state(self._state)

    def track_execution(self, item_id: str, user: str = "anonymous") -> None:
        self._state["executions"].append({
            "item_id": item_id,
            "user": user,
            "timestamp": datetime.utcnow().isoformat() + "Z",
        })
        self._save_state(self._state)

    def track_search(self, query: str, results_count: int, user: str = "anonymous") -> None:
        self._state["searches"].append({
            "query": query,
            "results_count": results_count,
            "user": user,
            "timestamp": datetime.utcnow().isoformat() + "Z",
        })
        self._save_state(self._state)

    def get_kpis(self) -> Dict[str, Any]:
        now = datetime.utcnow()
        last_7_days = (now - timedelta(days=7)).isoformat() + "Z"
        last_24_hours = (now - timedelta(days=1)).isoformat() + "Z"

        total_installs = len(self._state["installs"])
        total_uninstalls = len(self._state["uninstalls"])
        total_updates = len(self._state["updates"])
        total_executions = len(self._state["executions"])
        total_searches = len(self._state["searches"])

        installs_7d = len([i for i in self._state["installs"]
                          if i["timestamp"] >= last_7_days])
        uninstalls_7d = len(
            [i for i in self._state["uninstalls"] if i["timestamp"] >= last_7_days])
        updates_7d = len([u for u in self._state["updates"]
                         if u["timestamp"] >= last_7_days])

        installs_24h = len([i for i in self._state["installs"]
                           if i["timestamp"] >= last_24_hours])
        uninstalls_24h = len(
            [i for i in self._state["uninstalls"] if i["timestamp"] >= last_24_hours])

        uninstall_under_24h = len([
            u for u in self._state["uninstalls"]
            if u["timestamp"] >= last_24_hours
        ])

        install_success_rate = (
            round((total_installs / max(total_installs + total_uninstalls, 1)) * 100, 2)
            if total_installs > 0
            else 0.0
        )

        update_adoption_rate = (
            round((total_updates / max(total_installs, 1)) * 100, 2)
            if total_installs > 0
            else 0.0
        )

        # Top installed items
        item_install_counts: Dict[str, int] = {}
        for install in self._state["installs"]:
            item_id = install["item_id"]
            item_install_counts[item_id] = item_install_counts.get(
                item_id, 0) + 1

        top_installed = sorted(
            [{"item_id": k, "installs": v}
                for k, v in item_install_counts.items()],
            key=lambda x: x["installs"],
            reverse=True,
        )[:10]

        return {
            "total_installs": total_installs,
            "total_uninstalls": total_uninstalls,
            "total_updates": total_updates,
            "total_executions": total_executions,
            "total_searches": total_searches,
            "installs_7d": installs_7d,
            "uninstalls_7d": uninstalls_7d,
            "updates_7d": updates_7d,
            "installs_24h": installs_24h,
            "uninstalls_24h": uninstalls_24h,
            "uninstall_under_24h": uninstall_under_24h,
            "install_success_rate": install_success_rate,
            "update_adoption_rate": update_adoption_rate,
            "top_installed_items": top_installed,
            "active_tools_7d": installs_7d - uninstalls_7d,
        }

    def get_recent_activity(self, limit: int = 50) -> List[Dict[str, Any]]:
        all_events = []
        for event_type in ["installs", "uninstalls", "updates", "executions", "searches"]:
            for event in self._state.get(event_type, []):
                enriched = dict(event)
                enriched["event_type"] = event_type
                all_events.append(enriched)

        all_events.sort(key=lambda x: x.get("timestamp", ""), reverse=True)
        return all_events[:limit]


class SecurityScanner:
    """Basic signature verification and malware scanning (basic version of security features)."""

    SUSPICIOUS_PATTERNS = [
        "os.system(",
        "subprocess.call(",
        "exec(",
        "eval(",
        "__import__(",
        "compile(",
    ]

    @staticmethod
    def compute_file_hash(file_path: str) -> str:
        """Compute SHA256 hash for file signature verification."""
        import hashlib
        sha256 = hashlib.sha256()
        with open(file_path, "rb") as f:
            for chunk in iter(lambda: f.read(4096), b""):
                sha256.update(chunk)
        return sha256.hexdigest()

    @staticmethod
    def compute_code_hash(code: str) -> str:
        """Compute hash for code string."""
        import hashlib
        return hashlib.sha256(code.encode("utf-8")).hexdigest()

    def scan_code_for_malware(self, code: str) -> Dict[str, Any]:
        """Basic static analysis for suspicious patterns."""
        findings = []
        severity = "low"

        for pattern in self.SUSPICIOUS_PATTERNS:
            if pattern in code:
                findings.append({
                    "pattern": pattern,
                    "severity": "high" if pattern in ["exec(", "eval(", "__import__()"] else "medium",
                    "description": f"Suspicious pattern detected: {pattern}",
                })

        # Check for excessive length (potential obfuscation)
        if len(code) > 50000:
            findings.append({
                "pattern": "excessive_length",
                "severity": "low",
                "description": "Unusually large code size may indicate obfuscation.",
            })

        # Determine overall severity
        if any(f["severity"] == "high" for f in findings):
            severity = "high"
        elif any(f["severity"] == "medium" for f in findings):
            severity = "medium"

        return {
            "clean": len(findings) == 0,
            "findings": findings,
            "severity": severity,
            "hash": self.compute_code_hash(code),
        }

    def comprehensive_scan(self, code: str) -> Dict[str, Any]:
        """Phase 5.3 — Comprehensive static analysis for local isolation."""
        findings = []
        severity = "low"

        # 1. System Access
        system_patterns = ["os.", "subprocess.", "ctypes.", "builtins.eval",
                           "builtins.exec", "shutil.", "pathlib.", "__import__"]
        for p in system_patterns:
            if p in code:
                findings.append(
                    {"pattern": p, "severity": "medium", "description": f"System access detected: {p}"})

        # 2. Network Access
        network_patterns = ["socket.", "requests.", "urllib.", "httpx.", "aiohttp."]
        for p in network_patterns:
            if p in code:
                findings.append(
                    {"pattern": p, "severity": "low", "description": f"Network access detected: {p}"})

        # 3. Sensitive Imports
        sensitive_imports = ["import os", "import subprocess", "import ctypes",
                             "import socket", "from os", "from subprocess", "from ctypes"]
        for p in sensitive_imports:
            if p in code:
                findings.append(
                    {"pattern": p, "severity": "medium", "description": f"Sensitive import: {p}"})

        # Calculate final severity
        medium_risk = any(f["severity"] == "medium" for f in findings)
        if any(f["severity"] == "high" for f in findings):
            severity = "high"
        elif medium_risk:
            severity = "medium"

        return {
            "safe": len(findings) == 0,
            "severity": severity,
            "findings": findings,
            "isolation_required": severity != "low"
        }

    def verify_signature(self, file_path: str, expected_hash: str) -> Dict[str, Any]:
        """Verify file integrity via hash comparison."""
        if not os.path.exists(file_path):
            return {"status": "error", "message": "File not found."}

        actual_hash = self.compute_file_hash(file_path)
        matches = actual_hash == expected_hash

        return {
            "status": "success",
            "matches": matches,
            "actual_hash": actual_hash,
            "expected_hash": expected_hash,
        }

    def verify_manifest_signature(self, manifest: Dict[str, Any], publisher_key: str) -> bool:
        """
        Phase 5.2 — Verify manifest integrity and identity.
        Signature = SHA256(JSON(manifest without signature) + publisher_key)
        """
        if "signature" not in manifest:
            return False

        target_sig = manifest["signature"]
        # Create a copy and remove signature for hashing
        manifest_copy = dict(manifest)
        manifest_copy.pop("signature", None)

        # Consistent JSON stringification
        manifest_str = json.dumps(manifest_copy, sort_keys=True, separators=(',', ':'))
        computed_hash = self.compute_code_hash(manifest_str + publisher_key)

        return computed_hash == target_sig


class PersonalizationEngine:
    """Advanced personalization and recommendation engine (basic version)."""

    def __init__(self, state_file: str):
        self.state_file = state_file
        os.makedirs(os.path.dirname(state_file), exist_ok=True)
        self._state = self._load_state()

    def _load_state(self) -> Dict[str, Any]:
        if not os.path.exists(self.state_file):
            default = {
                "user_history": {},  # user_id -> {installed: [], executed: [], searched: []}
                "item_trending": {},  # item_id -> score
            }
            self._save_state(default)
            return default
        try:
            with open(self.state_file, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            return {"user_history": {}, "item_trending": {}}

    def _save_state(self, state: Dict[str, Any]) -> None:
        with open(self.state_file, "w", encoding="utf-8") as f:
            json.dump(state, f, indent=2)

    def track_user_behavior(self, user_id: str, action: str, item_id: str, metadata: Optional[Dict[str, Any]] = None) -> None:
        """Track user behavior for personalization."""
        if user_id not in self._state["user_history"]:
            self._state["user_history"][user_id] = {
                "installed": [], "executed": [], "searched": [], "viewed": []}

        history = self._state["user_history"][user_id]
        entry = {
            "item_id": item_id,
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "metadata": metadata or {},
        }

        if action in history:
            history[action].append(entry)
        else:
            history[action] = [entry]

        # Update trending score
        self._state["item_trending"][item_id] = self._state["item_trending"].get(
            item_id, 0) + 1

        self._save_state(self._state)

    def get_personalized_recommendations(self, user_id: str, catalog: List[Dict[str, Any]], limit: int = 20) -> List[Dict[str, Any]]:
        """Get personalized recommendations based on user history with explainability."""
        if user_id not in self._state["user_history"]:
            # Cold start: return trending items
            return [{**item, "reason": "Trending this week"} for item in self._get_trending_items(catalog, limit)]

        history = self._state["user_history"][user_id]
        installed_ids = {item["item_id"]
                         for item in history.get("installed", [])}

        # Score items based on user behavior
        scored_items = []
        for item in catalog:
            item_id = item.get("id")
            if item_id in installed_ids:
                continue  # Skip already installed

            score = 0.0
            reasons = []

            # Collaborative filtering: similar users also installed
            collaborative_overlap = False
            for other_user, other_history in self._state["user_history"].items():
                if other_user == user_id:
                    continue
                other_installed = {i["item_id"]
                                   for i in other_history.get("installed", [])}
                if installed_ids & other_installed:  # Has overlap
                    if item_id in other_installed:
                        collaborative_overlap = True
                        score += 5.0

            if collaborative_overlap:
                reasons.append("Popular among users like you")

            # Category matching
            user_categories = set()
            for inst_item in history.get("installed", []):
                for cat_item in catalog:
                    if cat_item.get("id") == inst_item["item_id"]:
                        user_categories.add(cat_item.get("category", ""))

            if item.get("category") in user_categories:
                score += 8.0
                reasons.append(f"Because you like {item.get('category')} apps")

            # Trending boost
            trending_score = self._state["item_trending"].get(item_id, 0)
            if trending_score > 0:
                score += min(trending_score * 0.5, 10.0)
                reasons.append("Trending this week")

            if score > 0:
                # Pick the most relevant reason (Category > Collaborative > Trending)
                reason = reasons[0] if reasons else "Recommended for you"
                scored_items.append(({**item, "reason": reason}, score))

        # Sort by score and return top items
        scored_items.sort(key=lambda x: x[1], reverse=True)
        return [item_data for item_data, score in scored_items[:limit]]

    def _get_trending_items(self, catalog: List[Dict[str, Any]], limit: int) -> List[Dict[str, Any]]:
        """Get trending items based on global popularity."""
        items_with_score = []
        for item in catalog:
            item_id = item.get("id")
            trending = self._state["item_trending"].get(item_id, 0)
            downloads = item.get("downloads", 0)
            rating = item.get("rating", 0)

            # Composite score: trending (40%) + downloads (30%) + rating (30%)
            composite = (trending * 2.0) + \
                (downloads / 1000.0) + (rating * 2.0)
            items_with_score.append((item, composite))

        items_with_score.sort(key=lambda x: x[1], reverse=True)
        return [item for item, score in items_with_score[:limit]]

    def get_user_profile(self, user_id: str) -> Dict[str, Any]:
        """Get user behavior profile."""
        if user_id not in self._state["user_history"]:
            return {"user_id": user_id, "exists": False}

        history = self._state["user_history"][user_id]
        return {
            "user_id": user_id,
            "exists": True,
            "installed_count": len(history.get("installed", [])),
            "executed_count": len(history.get("executed", [])),
            "searched_count": len(history.get("searched", [])),
            "viewed_count": len(history.get("viewed", [])),
        }

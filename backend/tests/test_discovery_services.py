"""
Tests for Discovery Marketplace services (Sprint 8).
Tests ranking, permissions, updates, payment, and telemetry.
"""
import pytest
from discovery import (
    ManifestValidator,
    PermissionPolicyEngine,
    RankingEngine,
    UpdateEngine,
    PaymentAbstraction,
    TelemetryEngine,
)
import tempfile
import os


@pytest.fixture
def temp_dir():
    with tempfile.TemporaryDirectory() as tmpdir:
        yield tmpdir


class TestPermissionPolicyEngine:
    """Test permission policy and consent gates."""

    def test_no_high_risk_permissions(self):
        engine = PermissionPolicyEngine()
        result = engine.assess(["internet_access", "notifications"])
        assert result["ok"] is True
        assert result["requires_consent"] is False
        assert len(result["risky_permissions"]) == 0

    def test_high_risk_permissions_blocked(self):
        engine = PermissionPolicyEngine()
        result = engine.assess(["payments", "customer_data", "secrets"])
        assert result["ok"] is False
        assert result["requires_consent"] is True
        assert len(result["risky_permissions"]) == 3
        assert len(result["missing_permissions"]) == 3

    def test_partial_approval(self):
        engine = PermissionPolicyEngine()
        result = engine.assess(
            ["payments", "customer_data", "notifications"],
            approved_permissions=["payments"]
        )
        assert result["ok"] is False
        assert len(result["missing_permissions"]) == 1
        assert "customer_data" in result["missing_permissions"]

    def test_all_approved(self):
        engine = PermissionPolicyEngine()
        result = engine.assess(
            ["payments", "customer_data"],
            approved_permissions=["payments", "customer_data"]
        )
        assert result["ok"] is True
        assert len(result["missing_permissions"]) == 0


class TestRankingEngine:
    """Test item ranking and relevance."""

    def test_basic_ranking(self):
        engine = RankingEngine()
        items = [
            {"id": "a", "rating": 4.5, "downloads": 1000, "trust_score": 90},
            {"id": "b", "rating": 3.0, "downloads": 100, "trust_score": 70},
        ]
        ranked = engine.rank(items)
        assert ranked[0]["id"] == "a"
        assert ranked[1]["id"] == "b"

    def test_featured_boost(self):
        engine = RankingEngine()
        items = [
            {"id": "a", "rating": 4.0, "downloads": 0,
                "trust_score": 80, "featured": False},
            {"id": "b", "rating": 4.0, "downloads": 0,
                "trust_score": 80, "featured": True},
        ]
        ranked = engine.rank(items)
        assert ranked[0]["id"] == "b"

    def test_keyword_relevance(self):
        engine = RankingEngine()
        items = [
            {"id": "a", "name": "Video Editor", "description": "Edit videos", "tags": [
            ], "category": "Media", "rating": 4.0, "downloads": 0, "trust_score": 80},
            {"id": "b", "name": "Music Player", "description": "Play music", "tags": [
            ], "category": "Media", "rating": 4.0, "downloads": 0, "trust_score": 80},
        ]
        ranked = engine.rank(items, query="video")
        assert ranked[0]["id"] == "a"

    def test_persona_tags_match(self):
        engine = RankingEngine()
        items = [
            {"id": "a", "name": "Tool", "tags": [
                "developer", "coding"], "rating": 4.0, "downloads": 0, "trust_score": 80},
            {"id": "b", "name": "Tool", "tags": [
                "creative", "design"], "rating": 4.0, "downloads": 0, "trust_score": 80},
        ]
        ranked = engine.rank(items, persona_tags=["developer"])
        assert ranked[0]["id"] == "a"


class TestUpdateEngine:
    """Test version comparison logic."""

    def test_update_available(self):
        engine = UpdateEngine()
        assert engine.is_update_available("1.0.0", "1.1.0") is True
        assert engine.is_update_available("1.2.3", "2.0.0") is True
        assert engine.is_update_available("0.9.9", "1.0.0") is True

    def test_no_update(self):
        engine = UpdateEngine()
        assert engine.is_update_available("1.0.0", "1.0.0") is False
        assert engine.is_update_available("2.0.0", "1.5.0") is False

    def test_missing_version(self):
        engine = UpdateEngine()
        assert engine.is_update_available(None, "1.0.0") is False


class TestPaymentAbstraction:
    """Test payment and invoicing system (Sprint 7)."""

    def test_create_invoice(self, temp_dir):
        payment = PaymentAbstraction(os.path.join(temp_dir, "payment.json"))
        result = payment.create_invoice(
            "item-pro", "Pro Tool", "pro", "user123", 29.99)
        assert result["status"] == "success"
        assert result["invoice"]["item_id"] == "item-pro"
        assert result["invoice"]["amount"] == 29.99

    def test_free_item_no_invoice(self, temp_dir):
        payment = PaymentAbstraction(os.path.join(temp_dir, "payment.json"))
        result = payment.create_invoice(
            "item-free", "Free Tool", "free", "user123", 0.0)
        assert result["status"] == "error"

    def test_pay_invoice(self, temp_dir):
        payment = PaymentAbstraction(os.path.join(temp_dir, "payment.json"))
        create_result = payment.create_invoice(
            "item-pro", "Pro Tool", "pro", "user123", 29.99)
        invoice_id = create_result["invoice"]["invoice_id"]
        pay_result = payment.mark_invoice_paid(invoice_id)
        assert pay_result["status"] == "success"
        assert pay_result["invoice"]["status"] == "paid"

    def test_create_subscription(self, temp_dir):
        payment = PaymentAbstraction(os.path.join(temp_dir, "payment.json"))
        result = payment.create_subscription(
            "item-sub", "user123", 9.99, "monthly")
        assert result["status"] == "success"
        assert result["subscription"]["item_id"] == "item-sub"
        assert result["subscription"]["interval"] == "monthly"

    def test_cancel_subscription(self, temp_dir):
        payment = PaymentAbstraction(os.path.join(temp_dir, "payment.json"))
        create_result = payment.create_subscription(
            "item-sub", "user123", 9.99)
        sub_id = create_result["subscription"]["subscription_id"]
        cancel_result = payment.cancel_subscription(sub_id)
        assert cancel_result["status"] == "success"

    def test_get_invoices_by_buyer(self, temp_dir):
        payment = PaymentAbstraction(os.path.join(temp_dir, "payment.json"))
        payment.create_invoice("item1", "Tool 1", "pro", "user1", 19.99)
        payment.create_invoice("item2", "Tool 2", "pro", "user2", 29.99)
        invoices = payment.get_invoices("user1")
        assert len(invoices) == 1
        assert invoices[0]["buyer"] == "user1"


class TestTelemetryEngine:
    """Test telemetry and KPI tracking (Sprint 8)."""

    def test_track_install(self, temp_dir):
        telemetry = TelemetryEngine(
            os.path.join(temp_dir, "audit.log"),
            os.path.join(temp_dir, "telemetry.json")
        )
        telemetry.track_install("item-1")
        kpis = telemetry.get_kpis()
        assert kpis["total_installs"] == 1

    def test_track_uninstall(self, temp_dir):
        telemetry = TelemetryEngine(
            os.path.join(temp_dir, "audit.log"),
            os.path.join(temp_dir, "telemetry.json")
        )
        telemetry.track_install("item-1")
        telemetry.track_uninstall("item-1", reason="Not useful")
        kpis = telemetry.get_kpis()
        assert kpis["total_uninstalls"] == 1

    def test_track_update(self, temp_dir):
        telemetry = TelemetryEngine(
            os.path.join(temp_dir, "audit.log"),
            os.path.join(temp_dir, "telemetry.json")
        )
        telemetry.track_update("item-1", "1.0.0", "1.1.0")
        kpis = telemetry.get_kpis()
        assert kpis["total_updates"] == 1

    def test_track_execution(self, temp_dir):
        telemetry = TelemetryEngine(
            os.path.join(temp_dir, "audit.log"),
            os.path.join(temp_dir, "telemetry.json")
        )
        telemetry.track_execution("item-1")
        kpis = telemetry.get_kpis()
        assert kpis["total_executions"] == 1

    def test_track_search(self, temp_dir):
        telemetry = TelemetryEngine(
            os.path.join(temp_dir, "audit.log"),
            os.path.join(temp_dir, "telemetry.json")
        )
        telemetry.track_search("plugin", 10)
        kpis = telemetry.get_kpis()
        assert kpis["total_searches"] == 1

    def test_success_rate_calculation(self, temp_dir):
        telemetry = TelemetryEngine(
            os.path.join(temp_dir, "audit.log"),
            os.path.join(temp_dir, "telemetry.json")
        )
        telemetry.track_install("item-1")
        telemetry.track_install("item-2")
        telemetry.track_uninstall("item-1")
        kpis = telemetry.get_kpis()
        assert kpis["install_success_rate"] > 0
        assert kpis["total_installs"] == 2
        assert kpis["total_uninstalls"] == 1

    def test_recent_activity(self, temp_dir):
        telemetry = TelemetryEngine(
            os.path.join(temp_dir, "audit.log"),
            os.path.join(temp_dir, "telemetry.json")
        )
        telemetry.track_install("item-1")
        telemetry.track_search("test", 5)
        activity = telemetry.get_recent_activity(limit=10)
        assert len(activity) == 2
        assert activity[0]["event_type"] in ["installs", "searches"]

"""
Contract tests for Discovery Marketplace manifest validation (Sprint 8).
Ensures manifest schema compliance and validation rules.
"""
import pytest
from discovery import ManifestValidator


@pytest.fixture
def validator():
    return ManifestValidator()


class TestManifestRequiredFields:
    """Test that all required fields are present."""

    def test_valid_manifest_passes(self, validator):
        manifest = {
            "id": "test-plugin",
            "version": "1.0.0",
            "author": "Test Author",
            "capabilities": ["feature1", "feature2"],
            "required_permissions": ["internet_access"],
            "pricing": "free",
            "rating": 4.5,
            "compatibility": {"runtime": "mia-core", "min_version": "1.0.0"},
        }
        result = validator.validate(manifest)
        assert result.ok is True
        assert len(result.errors) == 0

    def test_missing_id_fails(self, validator):
        manifest = {
            "version": "1.0.0",
            "author": "Test Author",
            "capabilities": [],
            "required_permissions": [],
            "pricing": "free",
            "rating": 4.0,
            "compatibility": {},
        }
        result = validator.validate(manifest)
        assert result.ok is False
        assert any("id" in err for err in result.errors)

    def test_missing_version_fails(self, validator):
        manifest = {
            "id": "test-plugin",
            "author": "Test Author",
            "capabilities": [],
            "required_permissions": [],
            "pricing": "free",
            "rating": 4.0,
            "compatibility": {},
        }
        result = validator.validate(manifest)
        assert result.ok is False
        assert any("version" in err for err in result.errors)

    def test_missing_author_fails(self, validator):
        manifest = {
            "id": "test-plugin",
            "version": "1.0.0",
            "capabilities": [],
            "required_permissions": [],
            "pricing": "free",
            "rating": 4.0,
            "compatibility": {},
        }
        result = validator.validate(manifest)
        assert result.ok is False
        assert any("author" in err for err in result.errors)

    def test_missing_capabilities_fails(self, validator):
        manifest = {
            "id": "test-plugin",
            "version": "1.0.0",
            "author": "Test Author",
            "required_permissions": [],
            "pricing": "free",
            "rating": 4.0,
            "compatibility": {},
        }
        result = validator.validate(manifest)
        assert result.ok is False
        assert any("capabilities" in err for err in result.errors)

    def test_missing_permissions_fails(self, validator):
        manifest = {
            "id": "test-plugin",
            "version": "1.0.0",
            "author": "Test Author",
            "capabilities": [],
            "pricing": "free",
            "rating": 4.0,
            "compatibility": {},
        }
        result = validator.validate(manifest)
        assert result.ok is False
        assert any("required_permissions" in err for err in result.errors)

    def test_missing_pricing_fails(self, validator):
        manifest = {
            "id": "test-plugin",
            "version": "1.0.0",
            "author": "Test Author",
            "capabilities": [],
            "required_permissions": [],
            "rating": 4.0,
            "compatibility": {},
        }
        result = validator.validate(manifest)
        assert result.ok is False
        assert any("pricing" in err for err in result.errors)

    def test_missing_rating_fails(self, validator):
        manifest = {
            "id": "test-plugin",
            "version": "1.0.0",
            "author": "Test Author",
            "capabilities": [],
            "required_permissions": [],
            "pricing": "free",
            "compatibility": {},
        }
        result = validator.validate(manifest)
        assert result.ok is False
        assert any("rating" in err for err in result.errors)

    def test_missing_compatibility_fails(self, validator):
        manifest = {
            "id": "test-plugin",
            "version": "1.0.0",
            "author": "Test Author",
            "capabilities": [],
            "required_permissions": [],
            "pricing": "free",
            "rating": 4.0,
        }
        result = validator.validate(manifest)
        assert result.ok is False
        assert any("compatibility" in err for err in result.errors)


class TestManifestFieldTypes:
    """Test that fields have correct types."""

    def test_empty_id_fails(self, validator):
        manifest = {
            "id": "",
            "version": "1.0.0",
            "author": "Test Author",
            "capabilities": [],
            "required_permissions": [],
            "pricing": "free",
            "rating": 4.0,
            "compatibility": {},
        }
        result = validator.validate(manifest)
        assert result.ok is False
        assert any(
            "id must be a non-empty string" in err for err in result.errors)

    def test_empty_version_fails(self, validator):
        manifest = {
            "id": "test-plugin",
            "version": "",
            "author": "Test Author",
            "capabilities": [],
            "required_permissions": [],
            "pricing": "free",
            "rating": 4.0,
            "compatibility": {},
        }
        result = validator.validate(manifest)
        assert result.ok is False
        assert any(
            "version must be a non-empty string" in err for err in result.errors)

    def test_empty_author_fails(self, validator):
        manifest = {
            "id": "test-plugin",
            "version": "1.0.0",
            "author": "",
            "capabilities": [],
            "required_permissions": [],
            "pricing": "free",
            "rating": 4.0,
            "compatibility": {},
        }
        result = validator.validate(manifest)
        assert result.ok is False
        assert any(
            "author must be a non-empty string" in err for err in result.errors)

    def test_capabilities_not_list_fails(self, validator):
        manifest = {
            "id": "test-plugin",
            "version": "1.0.0",
            "author": "Test Author",
            "capabilities": "feature1",
            "required_permissions": [],
            "pricing": "free",
            "rating": 4.0,
            "compatibility": {},
        }
        result = validator.validate(manifest)
        assert result.ok is False
        assert any("capabilities must be a list" in err for err in result.errors)

    def test_permissions_not_list_fails(self, validator):
        manifest = {
            "id": "test-plugin",
            "version": "1.0.0",
            "author": "Test Author",
            "capabilities": [],
            "required_permissions": "permission1",
            "pricing": "free",
            "rating": 4.0,
            "compatibility": {},
        }
        result = validator.validate(manifest)
        assert result.ok is False
        assert any(
            "required_permissions must be a list" in err for err in result.errors)

    def test_invalid_rating_type_fails(self, validator):
        manifest = {
            "id": "test-plugin",
            "version": "1.0.0",
            "author": "Test Author",
            "capabilities": [],
            "required_permissions": [],
            "pricing": "free",
            "rating": "excellent",
            "compatibility": {},
        }
        result = validator.validate(manifest)
        assert result.ok is False
        assert any("rating must be numeric" in err for err in result.errors)

    def test_valid_numeric_rating_passes(self, validator):
        manifest = {
            "id": "test-plugin",
            "version": "1.0.0",
            "author": "Test Author",
            "capabilities": [],
            "required_permissions": [],
            "pricing": "free",
            "rating": 4.7,
            "compatibility": {},
        }
        result = validator.validate(manifest)
        assert result.ok is True

    def test_compatibility_not_dict_fails(self, validator):
        manifest = {
            "id": "test-plugin",
            "version": "1.0.0",
            "author": "Test Author",
            "capabilities": [],
            "required_permissions": [],
            "pricing": "free",
            "rating": 4.0,
            "compatibility": ["mia-core"],
        }
        result = validator.validate(manifest)
        assert result.ok is False
        assert any(
            "compatibility must be an object" in err for err in result.errors)


class TestPricingModels:
    """Test pricing model validation."""

    def test_free_pricing_passes(self, validator):
        manifest = {
            "id": "test-free",
            "version": "1.0.0",
            "author": "Test",
            "capabilities": [],
            "required_permissions": [],
            "pricing": "free",
            "rating": 4.0,
            "compatibility": {},
        }
        assert validator.validate(manifest).ok is True

    def test_freemium_pricing_passes(self, validator):
        manifest = {
            "id": "test-freemium",
            "version": "1.0.0",
            "author": "Test",
            "capabilities": [],
            "required_permissions": [],
            "pricing": "freemium",
            "rating": 4.0,
            "compatibility": {},
        }
        assert validator.validate(manifest).ok is True

    def test_pro_pricing_passes(self, validator):
        manifest = {
            "id": "test-pro",
            "version": "1.0.0",
            "author": "Test",
            "capabilities": [],
            "required_permissions": [],
            "pricing": "pro",
            "rating": 4.0,
            "compatibility": {},
        }
        assert validator.validate(manifest).ok is True

    def test_subscription_pricing_passes(self, validator):
        manifest = {
            "id": "test-sub",
            "version": "1.0.0",
            "author": "Test",
            "capabilities": [],
            "required_permissions": [],
            "pricing": "subscription",
            "rating": 4.0,
            "compatibility": {},
        }
        assert validator.validate(manifest).ok is True

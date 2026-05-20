from pathlib import Path


def test_security_hardening_migration_restricts_point_rpc_and_storage_uploads():
    repo_root = Path(__file__).resolve().parents[2]
    sql = (repo_root / "supabase/migrations/010_security_hardening.sql").read_text()

    assert "auth.uid()" in sql
    assert "child_id_param" in sql
    assert "parent_id" in sql
    assert "SET search_path = public, pg_temp" in sql
    assert "REVOKE EXECUTE ON FUNCTION increment_child_points" in sql
    assert "TO authenticated" in sql
    assert "storage.objects" in sql

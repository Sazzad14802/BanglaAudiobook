"""One account per person: listener/publisher namespaces become a single "user" type.

Publishing becomes a verification status on the user (publisher_status), and
email/username are unique platform-wide. Databases where the same email or
username exists in both namespaces must be reset first (no automatic merge).
"""
from alembic import op
import sqlalchemy as sa

revision = "g20261018_unified_accounts"
down_revision = "f20261017_payment_gateway"
branch_labels = None
depends_on = None


def upgrade():
    conn = op.get_bind()
    for column in ("email", "username"):
        duplicates = conn.execute(sa.text(
            f"SELECT {column} FROM users GROUP BY {column} HAVING COUNT(*) > 1")).scalars().all()
        if duplicates:
            raise RuntimeError(
                f"Cannot unify accounts: duplicate {column}s {duplicates[:5]}. "
                "Reset the database (or remove the duplicates) and run the migration again.")

    op.execute("UPDATE users SET account_type = 'user' WHERE account_type IN ('listener', 'publisher')")
    # Users who never applied are no longer "pending"; pending means an application awaits review.
    op.execute("""UPDATE users SET publisher_status = 'none' WHERE publisher_status = 'pending_approval'
                  AND id NOT IN (SELECT user_id FROM publisher_applications WHERE status = 'pending')""")
    # Public content now lives only in channels.
    op.execute("""UPDATE audiobooks SET visibility = 'PRIVATE', publication_status = 'draft'
                  WHERE channel_id IS NULL AND publication_status = 'published'""")

    with op.batch_alter_table("users") as batch_op:
        batch_op.drop_constraint("uq_users_email_namespace", type_="unique")
        batch_op.drop_constraint("uq_users_username_namespace", type_="unique")
        batch_op.create_unique_constraint("uq_users_email", ["email"])
        batch_op.create_unique_constraint("uq_users_username", ["username"])
        batch_op.alter_column("account_type", server_default="user")
        batch_op.alter_column("publisher_status", server_default="none")


def downgrade():
    with op.batch_alter_table("users") as batch_op:
        batch_op.drop_constraint("uq_users_email", type_="unique")
        batch_op.drop_constraint("uq_users_username", type_="unique")
        batch_op.create_unique_constraint("uq_users_email_namespace", ["email", "account_type"])
        batch_op.create_unique_constraint("uq_users_username_namespace", ["username", "account_type"])
        batch_op.alter_column("account_type", server_default="listener")
        batch_op.alter_column("publisher_status", server_default="pending_approval")
    op.execute("UPDATE users SET account_type = CASE WHEN publisher_status = 'none' THEN 'listener' ELSE 'publisher' END "
               "WHERE account_type = 'user'")
    op.execute("UPDATE users SET publisher_status = 'pending_approval' WHERE publisher_status = 'none'")

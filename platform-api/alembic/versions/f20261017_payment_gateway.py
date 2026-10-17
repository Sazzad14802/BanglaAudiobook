"""Hosted payment gateway session and app return URL on orders."""
from alembic import op
import sqlalchemy as sa

revision = "f20261017_payment_gateway"
down_revision = "e20261017_notifications"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column("payment_orders", sa.Column("gateway_session", sa.String(255), nullable=True))
    op.add_column("payment_orders", sa.Column("return_url", sa.String(1024), nullable=True))


def downgrade():
    op.drop_column("payment_orders", "return_url")
    op.drop_column("payment_orders", "gateway_session")

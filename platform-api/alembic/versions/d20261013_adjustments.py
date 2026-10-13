"""Append-only development refund and receipt correction history."""
from alembic import op
import sqlalchemy as sa
revision = 'd20261013_adjustments'
down_revision = 'c20261013_platform'
branch_labels = None
depends_on = None

def upgrade():
    op.create_table('financial_adjustments',
        sa.Column('id',sa.Uuid(),primary_key=True),
        sa.Column('order_id',sa.Uuid(),sa.ForeignKey('payment_orders.id'),nullable=False),
        sa.Column('amount',sa.Numeric(14,2),nullable=False),
        sa.Column('kind',sa.String(20),nullable=False),
        sa.Column('reason',sa.Text(),nullable=False),
        sa.Column('month',sa.String(7),nullable=False),
        sa.Column('reference',sa.String(100),unique=True,nullable=False),
        sa.Column('created_at',sa.DateTime(timezone=True),nullable=False))
    op.create_index('ix_financial_adjustments_id','financial_adjustments',['id'])

def downgrade():
    raise RuntimeError('Financial history must be preserved; restore the pre-migration backup')

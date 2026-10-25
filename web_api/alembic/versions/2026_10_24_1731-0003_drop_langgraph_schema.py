"""drop langgraph schema

LangGraph is no longer used (QA generation will run on a Postgres task queue), so the
schema that held its checkpoint tables goes. It was created by the Postgres init script and
filled by the removed setup_checkpointer script; no app code ever wrote checkpoints to it.

Revision ID: 0003
Revises: 0002
Create Date: 2026-10-24 17:31:03.718905

"""
from typing import Sequence, Union

from alembic import op


# revision identifiers, used by Alembic.
revision: str = '0003'
down_revision: Union[str, Sequence[str], None] = '0002'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.execute("DROP SCHEMA IF EXISTS langgraph CASCADE")


def downgrade() -> None:
    """Downgrade schema: recreates the empty schema only (the checkpoint tables are gone)."""
    op.execute("CREATE SCHEMA IF NOT EXISTS langgraph")
    op.execute("GRANT USAGE ON SCHEMA langgraph TO synth_app")

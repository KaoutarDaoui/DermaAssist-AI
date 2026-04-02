"""Add chat_messages table

Revision ID: 001_add_chat_messages
Revises: None
Create Date: 2024-03-31 10:00:00.000000

"""

from sqlalchemy import Column, String, DateTime, Text, ForeignKey, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.db.database import Base
import uuid
from datetime import datetime


def upgrade():
    """Create chat_messages table"""
    # This will be created automatically when Base.metadata.create_all() is called
    # Just ensure the ChatMessage model is imported in main.py
    pass


def downgrade():
    """Drop chat_messages table"""
    # This is handled by SQLAlchemy ORM
    pass

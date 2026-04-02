from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class ChatMessageCreate(BaseModel):
    """Schema for creating a new chat message"""
    user_message: str
    consultation_id: Optional[str] = None
    
    class Config:
        json_schema_extra = {
            "example": {
                "user_message": "What are the symptoms of eczema?",
                "consultation_id": None
            }
        }


class ChatMessageResponse(BaseModel):
    """Schema for chat message response"""
    id: str
    user_message: str
    ai_response: str
    message_type: str
    created_at: str
    consultation_id: Optional[str] = None
    
    class Config:
        from_attributes = True


class ChatHistoryResponse(BaseModel):
    """Schema for full chat history"""
    messages: list[ChatMessageResponse]
    total_count: int
    
    class Config:
        from_attributes = True


class ChatSendMessageResponse(BaseModel):
    """Schema for send message response"""
    success: bool
    message_id: str
    response: str
    message_type: str
    created_at: str
    error: Optional[str] = None
    
    class Config:
        json_schema_extra = {
            "example": {
                "success": True,
                "message_id": "550e8400-e29b-41d4-a716-446655440000",
                "response": "Eczema is a common skin condition...",
                "message_type": "faq",
                "created_at": "2024-03-31T10:30:00",
                "error": None
            }
        }

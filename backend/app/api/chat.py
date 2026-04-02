from fastapi import APIRouter, Depends, Header, HTTPException, Query
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.services.chat_service import ChatService
from app.schemas.chat import (
    ChatMessageCreate,
    ChatMessageResponse,
    ChatSendMessageResponse,
    ChatHistoryResponse
)
from app.core.security import verify_token
import uuid

router = APIRouter(prefix="/chat", tags=["chat"])

# Initialize chat service
chat_service = ChatService()


@router.post("/send-message", response_model=ChatSendMessageResponse)
async def send_message(
    message: ChatMessageCreate,
    authorization: str = Header(...),
    db: Session = Depends(get_db)
):
    """
    Send a message to the chatbot and get a response
    
    The patient_id is extracted from the JWT token in the Authorization header.
    """
    try:
        # Verify token and get patient_id
        token = authorization.replace("Bearer ", "")
        payload = verify_token(token)
        patient_id = payload.get("sub")
        
        if not patient_id:
            raise HTTPException(status_code=401, detail="Invalid token")
        
        # Send message to chat service
        result = chat_service.send_message(
            db=db,
            patient_id=patient_id,
            user_message=message.user_message,
            consultation_id=message.consultation_id
        )
        
        if not result["success"]:
            return ChatSendMessageResponse(
                success=False,
                message_id="",
                response="Erreur lors du traitement de votre message",
                message_type="error",
                created_at="",
                error=result.get("error")
            )
        
        return ChatSendMessageResponse(**result)
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}")


@router.get("/history", response_model=ChatHistoryResponse)
async def get_chat_history(
    limit: int = Query(50, ge=1, le=500),
    authorization: str = Header(...),
    db: Session = Depends(get_db)
):
    """
    Get chat history for the authenticated patient
    
    The patient_id is extracted from the JWT token in the Authorization header.
    """
    try:
        # Verify token and get patient_id
        token = authorization.replace("Bearer ", "")
        payload = verify_token(token)
        patient_id = payload.get("sub")
        
        if not patient_id:
            raise HTTPException(status_code=401, detail="Invalid token")
        
        # Get chat history
        messages = chat_service.get_chat_history(db, patient_id, limit)
        
        return ChatHistoryResponse(
            messages=messages,
            total_count=len(messages)
        )
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}")


@router.delete("/history")
async def delete_chat_history(
    authorization: str = Header(...),
    db: Session = Depends(get_db)
):
    """
    Delete all chat history for the authenticated patient
    
    The patient_id is extracted from the JWT token in the Authorization header.
    """
    try:
        # Verify token and get patient_id
        token = authorization.replace("Bearer ", "")
        payload = verify_token(token)
        patient_id = payload.get("sub")
        
        if not patient_id:
            raise HTTPException(status_code=401, detail="Invalid token")
        
        # Delete chat history
        success = chat_service.delete_chat_history(db, patient_id)
        
        return {
            "success": success,
            "message": "Chat history deleted" if success else "Error deleting chat history"
        }
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}")

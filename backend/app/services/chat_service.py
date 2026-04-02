import google.generativeai as genai
from sqlalchemy.orm import Session
from app.models.chat_message import ChatMessage
from app.models.patient import Patient
from app.models.ai_result import AIResult
import json
import os
from datetime import datetime


class ChatService:
    """Service for managing chatbot interactions with Gemini API"""
    
    def __init__(self):
        # Initialize Gemini API
        api_key = os.getenv("GEMINI_API_KEY")
        if not api_key:
            raise ValueError("GEMINI_API_KEY not found in environment variables")
        genai.configure(api_key=api_key)
        self.model = genai.GenerativeModel("gemini-pro")
    
    def get_patient_context(self, db: Session, patient_id: str) -> dict:
        """Get patient context for better AI responses"""
        try:
            patient = db.query(Patient).filter(Patient.id == patient_id).first()
            if not patient:
                return {}
            
            # Get latest AI results
            latest_results = db.query(AIResult)\
                .filter(AIResult.patient_id == patient_id)\
                .order_by(AIResult.generated_at.desc())\
                .limit(5)\
                .all()
            
            context = {
                "patient_name": f"{patient.first_name} {patient.last_name}",
                "age": patient.age,
                "health_conditions": patient.health_conditions if hasattr(patient, 'health_conditions') else [],
                "recent_diagnoses": [
                    {
                        "diagnosis": result.diagnosis,
                        "confidence": result.confidence.get("percentage") if isinstance(result.confidence, dict) else 0,
                        "date": result.generated_at.isoformat() if result.generated_at else None
                    }
                    for result in latest_results
                ] if latest_results else []
            }
            return context
        except Exception as e:
            print(f"Error fetching patient context: {e}")
            return {}
    
    def build_system_prompt(self, patient_context: dict) -> str:
        """Build system prompt with patient context"""
        base_prompt = """You are DermaAssist, an intelligent healthcare assistant specialized in dermatology. 
Your role is to:
1. Answer frequently asked questions about skin conditions and dermatology
2. Help patients understand their consultation results
3. Provide general health information and educational content
4. Support doctors by answering diagnostic-related questions

IMPORTANT GUIDELINES:
- Always be empathetic and professional
- Never provide definitive medical diagnoses (suggest consulting a dermatologist)
- Focus on symptom education and general information
- If the question is urgent or critical, recommend seeing a doctor immediately
- Respond in the same language as the question (French or English)
- Keep responses concise and clear"""

        if patient_context and patient_context.get("recent_diagnoses"):
            base_prompt += f"\n\nPATIENT CONTEXT:\nThis patient has recently been diagnosed with:\n"
            for diagnosis in patient_context["recent_diagnoses"][:3]:
                base_prompt += f"- {diagnosis['diagnosis']} (Confidence: {diagnosis.get('confidence', 'N/A')}%)\n"
        
        if patient_context and patient_context.get("health_conditions"):
            base_prompt += f"\nKnown health conditions: {', '.join(patient_context['health_conditions'])}\n"
        
        base_prompt += "\nRespond helpfully while maintaining medical ethics and safety."
        return base_prompt
    
    def send_message(self, db: Session, patient_id: str, user_message: str, consultation_id: str = None) -> dict:
        """Send message to Gemini and save to database"""
        try:
            # Get patient context
            patient_context = self.get_patient_context(db, patient_id)
            
            # Build system prompt
            system_prompt = self.build_system_prompt(patient_context)
            
            # Prepare message for Gemini
            full_prompt = f"{system_prompt}\n\nPATIENT REQUEST: {user_message}"
            
            # Get response from Gemini
            response = self.model.generate_content(full_prompt)
            ai_response = response.text
            
            # Determine message type
            message_type = "diagnostic" if any(kw in user_message.lower() for kw in ["diagnose", "symptom", "condition", "disease"]) else "faq"
            
            # Save to database
            chat_message = ChatMessage(
                patient_id=patient_id,
                consultation_id=consultation_id,
                user_message=user_message,
                ai_response=ai_response,
                message_type=message_type,
                context_data=json.dumps(patient_context) if patient_context else None
            )
            
            db.add(chat_message)
            db.commit()
            db.refresh(chat_message)
            
            return {
                "success": True,
                "message_id": str(chat_message.id),
                "response": ai_response,
                "message_type": message_type,
                "created_at": chat_message.created_at.isoformat()
            }
        
        except Exception as e:
            print(f"Error in send_message: {e}")
            return {
                "success": False,
                "error": str(e),
                "response": "Désolé, une erreur s'est produite. Veuillez réessayer."
            }
    
    def get_chat_history(self, db: Session, patient_id: str, limit: int = 50) -> list:
        """Get chat history for a patient"""
        try:
            messages = db.query(ChatMessage)\
                .filter(ChatMessage.patient_id == patient_id)\
                .order_by(ChatMessage.created_at.desc())\
                .limit(limit)\
                .all()
            
            return [
                {
                    "id": str(msg.id),
                    "user_message": msg.user_message,
                    "ai_response": msg.ai_response,
                    "message_type": msg.message_type,
                    "created_at": msg.created_at.isoformat(),
                    "consultation_id": msg.consultation_id
                }
                for msg in reversed(messages)  # Return in chronological order
            ]
        except Exception as e:
            print(f"Error fetching chat history: {e}")
            return []
    
    def delete_chat_history(self, db: Session, patient_id: str) -> bool:
        """Delete all chat messages for a patient"""
        try:
            db.query(ChatMessage).filter(ChatMessage.patient_id == patient_id).delete()
            db.commit()
            return True
        except Exception as e:
            print(f"Error deleting chat history: {e}")
            return False

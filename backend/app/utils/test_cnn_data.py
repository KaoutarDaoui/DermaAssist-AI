"""
Test utility to generate realistic CNN predictions from knowledge base.
Used for testing the RAG pipeline without Module 1.
"""

import json
from pathlib import Path
from typing import Dict, List, Tuple
import random


class CNNTestDataGenerator:
    """Generate realistic CNN predictions based on knowledge base conditions."""
    
    def __init__(self):
        """Load knowledge base on initialization."""
        kb_path = Path(__file__).parent.parent.parent / "ai" / "modele2_RAG" / "knowledge_base.json"
        with open(kb_path, "r", encoding="utf-8") as f:
            self.kb = json.load(f)
        self.conditions = self.kb.get("maladies", [])
    
    def get_all_conditions(self) -> List[Dict]:
        """Get list of all available conditions."""
        return [(c["id"], c["nom"]) for c in self.conditions]
    
    def generate_for_condition(self, condition_id: str) -> Dict:
        """
        Generate realistic CNN prediction for a specific condition.
        
        Args:
            condition_id: The condition ID from knowledge base (e.g., "acne_vulgaire")
        
        Returns:
            Dictionary with CNN predictions including condition_id, condition_name, 
            confidence, and top_alternatives
        """
        # Find the condition
        condition = next((c for c in self.conditions if c["id"] == condition_id), None)
        if not condition:
            raise ValueError(f"Condition '{condition_id}' not found in knowledge base")
        
        # Generate main confidence (can be set or random)
        main_confidence = random.uniform(0.75, 0.95)
        
        # Get other conditions as alternatives
        other_conditions = [c for c in self.conditions if c["id"] != condition_id]
        alternatives = []
        
        remaining_confidence = 1.0 - main_confidence
        for alt_condition in random.sample(other_conditions, min(3, len(other_conditions))):
            alt_confidence = random.uniform(0.01, min(0.15, remaining_confidence * 0.5))
            remaining_confidence -= alt_confidence
            alternatives.append({
                "name": alt_condition["nom"],
                "confidence": round(alt_confidence, 2)
            })
        
        # Sort alternatives by confidence
        alternatives.sort(key=lambda x: x["confidence"], reverse=True)
        
        return {
            "condition_id": condition_id,
            "condition_name": condition["nom"],
            "confidence": round(main_confidence, 2),
            "top_alternatives": alternatives[:3]
        }
    
    def generate_random(self) -> Dict:
        """
        Generate CNN prediction for a random condition.
        
        Returns:
            Dictionary with CNN predictions
        """
        condition = random.choice(self.conditions)
        return self.generate_for_condition(condition["id"])
    
    def generate_specific(self, condition_name: str, confidence: float = None) -> Dict:
        """
        Generate CNN prediction for a condition matching the name (case-insensitive).
        
        Args:
            condition_name: Name or ID of the condition (e.g., "acne vulgaire")
            confidence: Optional specific confidence level (0-1)
        
        Returns:
            Dictionary with CNN predictions
        """
        # Try to find by ID first
        condition = next((c for c in self.conditions if c["id"] == condition_name.lower().replace(" ", "_")), None)
        
        # If not found, try to find by name (case-insensitive)
        if not condition:
            condition = next((c for c in self.conditions if condition_name.lower() in c["nom"].lower()), None)
        
        if not condition:
            raise ValueError(f"Condition '{condition_name}' not found. Available conditions:\n" + 
                           "\n".join([f"  - {c['nom']} ({c['id']})" for c in self.conditions]))
        
        # Generate prediction
        pred = self.generate_for_condition(condition["id"])
        
        # Override confidence if provided
        if confidence is not None:
            confidence = max(0.0, min(1.0, confidence))  # Clamp to 0-1
            pred["confidence"] = round(confidence, 2)
        
        return pred


# Global generator instance
_generator = None


def get_generator() -> CNNTestDataGenerator:
    """Get singleton instance of CNN test data generator."""
    global _generator
    if _generator is None:
        _generator = CNNTestDataGenerator()
    return _generator


def generate_test_cnn_data(condition_name: str = None, confidence: float = None) -> Dict:
    """
    Convenience function to generate test CNN data.
    
    Args:
        condition_name: Optional condition name (e.g., "acne vulgaire"). If None, random.
        confidence: Optional confidence level (0-1). If None, random.
    
    Returns:
        Dictionary with CNN predictions
    
    Examples:
        # Random condition
        data = generate_test_cnn_data()
        
        # Specific condition with random confidence
        data = generate_test_cnn_data("acne vulgaire")
        
        # Specific condition and confidence
        data = generate_test_cnn_data("acne vulgaire", 0.88)
    """
    generator = get_generator()
    
    if condition_name is None:
        return generator.generate_random()
    else:
        return generator.generate_specific(condition_name, confidence)

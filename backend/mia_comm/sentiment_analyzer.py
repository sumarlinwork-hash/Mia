"""
Sentiment Analyzer for Companion Kernel
Lightweight sentiment detection for dialogue resonance (ARE v2.0 Section 12)
"""

import re
from typing import Literal

class SentimentAnalyzer:
    """Simple rule-based sentiment analyzer for Indonesian and English"""
    
    def __init__(self):
        # Positive indicators
        self.positive_words = {
            # Indonesian
            'bagus', 'baik', 'hebat', 'keren', 'mantap', 'suka', 'cinta', 'sayang',
            'terima kasih', 'thanks', 'thank you', 'love', 'awesome', 'great',
            'wonderful', 'excellent', 'amazing', 'perfect', 'beautiful', 'cantik',
            'indah', 'sempurna', 'luar biasa', 'fantastis', 'menakjubkan',
            'senang', 'gembira', 'bahagia', 'happy', 'joy', 'glad', 'pleased',
            'appreciate', 'appreciate', 'appreciate', 'appreciate', 'appreciate',
            '😊', '😍', '❤️', '💕', '💖', '🥰', '😘', '👍', '🎉', '✨'
        }
        
        # Negative indicators
        self.negative_words = {
            # Indonesian
            'jelek', 'buruk', 'bodoh', 'benci', 'marah', 'kesal', 'sedih',
            'kecewa', 'tidak suka', 'hate', 'bad', 'terrible', 'awful',
            'horrible', 'disgusting', 'angry', 'sad', 'disappointed',
            'frustrated', 'annoyed', 'upset', 'stupid', 'dumb', 'idiot',
            'gila', 'gajelas', 'ngaco', 'berantakan', 'kacau', 'hancur',
            '😠', '😡', '😤', '😞', '😢', '😭', '🤮', '👎', '💔', '😤'
        }
        
        # Intensifiers
        self.intensifiers = {
            'sangat', 'sekali', 'banget', 'very', 'really', 'so', 'extremely',
            'super', 'ultra', 'mega', 'luar', 'amat', 'benar'
        }
        
        # Negators
        self.negators = {
            'tidak', 'bukan', 'no', 'not', 'never', 'nope', 'nah', 'gak',
            'enggak', 'jangan', 'don\'t', 'doesn\'t', 'didn\'t', 'won\'t'
        }
    
    def analyze(self, text: str) -> Literal["positive", "neutral", "negative"]:
        """
        Analyze sentiment of text
        Returns: "positive", "neutral", or "negative"
        """
        if not text or len(text.strip()) == 0:
            return "neutral"
        
        text_lower = text.lower()
        words = re.findall(r'\b\w+\b|[😊😍❤️💕💖🥰😘👍🎉✨😠😡😤😞😢😭🤮👎💔]', text_lower)
        
        positive_score = 0
        negative_score = 0
        
        # Check for negators before sentiment words
        negator_positions = set()
        for i, word in enumerate(words):
            if word in self.negators:
                # Mark next 2 words as negated
                negator_positions.update([i+1, i+2])
        
        # Score words
        for i, word in enumerate(words):
            is_negated = i in negator_positions
            
            if word in self.positive_words:
                score = 1
                # Check for intensifiers
                if i > 0 and words[i-1] in self.intensifiers:
                    score = 2
                
                if is_negated:
                    negative_score += score
                else:
                    positive_score += score
            
            elif word in self.negative_words:
                score = 1
                # Check for intensifiers
                if i > 0 and words[i-1] in self.intensifiers:
                    score = 2
                
                if is_negated:
                    positive_score += score
                else:
                    negative_score += score
        
        # Determine sentiment
        if positive_score > negative_score:
            return "positive"
        elif negative_score > positive_score:
            return "negative"
        else:
            return "neutral"
    
    def get_confidence(self, text: str) -> float:
        """
        Get confidence score (0.0 to 1.0)
        Higher = more confident in sentiment
        """
        if not text or len(text.strip()) == 0:
            return 0.0
        
        text_lower = text.lower()
        words = re.findall(r'\b\w+\b|[😊😍❤️💕💖🥰😘👍🎉✨😠😡😤😞😢😭🤮👎💔]', text_lower)
        
        sentiment_word_count = sum(
            1 for word in words 
            if word in self.positive_words or word in self.negative_words
        )
        
        if len(words) == 0:
            return 0.0
        
        # Confidence based on ratio of sentiment words to total words
        confidence = min(1.0, sentiment_word_count / len(words))
        return confidence

# Singleton instance
sentiment_analyzer = SentimentAnalyzer()

import random

class Skill:
    name = "Music Recommender"
    description = "Analyzes your mood and suggests a matching playlist."

    def execute(self, args):
        mood = args.get("mood", "neutral")
        playlists = {
            "happy": ["Upbeat Pop", "Sunny Day", "Feel Good"],
            "sad": ["Melancholy Melodies", "Rainy Jazz", "Piano Solos"],
            "neutral": ["Lofi Beats", "Ambient Focus", "Study Session"],
            "energetic": ["Power Workout", "High Octane", "Techno Pulse"]
        }
        
        selected = playlists.get(mood.lower(), playlists["neutral"])
        recommendation = random.choice(selected)
        return f"Based on your {mood} mood, I recommend listening to: {recommendation}"

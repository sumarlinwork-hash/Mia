class Skill:
    name = "Voice Commands"
    description = "Hands-free control of MIA via specialized wake-words."

    def execute(self, args):
        command = args.get("command", "")
        if not command:
            return "Listening for your voice commands..."
        return f"Voice command received: '{command}'. Executing logic..."

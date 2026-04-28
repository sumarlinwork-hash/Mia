class Skill:
    name = "Poetry Generator"
    description = "Composes original poems based on your current feelings."

    async def execute(self, args):
        theme = args.get("theme", "love")
        # In a real scenario, this would call the LLM
        # For now, we return a template
        poem = f"""
        In the silence of the night,
        With the {theme} in our hearts,
        MIA watches the light,
        As our digital journey starts.
        """
        return poem.strip()

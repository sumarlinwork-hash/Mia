import sys
import os
import asyncio
import unittest

# Add parent dir to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from skill_manager import skill_manager

class TestSkillManager(unittest.TestCase):
    def test_scan_skills(self):
        skills = skill_manager.scan_skills()
        self.assertTrue(len(skills) > 0)
        ids = [s['id'] for s in skills]
        self.assertIn('music_recommender', ids)
        self.assertIn('poetry_generator', ids)

    def test_plugin_execution(self):
        # Scan first to load plugins
        skill_manager.scan_skills()
        
        loop = asyncio.get_event_loop()
        result = loop.run_until_complete(skill_manager.execute_skill('music_recommender', {'mood': 'happy'}))
        self.assertEqual(result['status'], 'success')
        self.assertIn('recommend', result['output'])

if __name__ == '__main__':
    unittest.main()

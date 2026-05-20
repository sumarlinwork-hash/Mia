import sys
import os
import asyncio
import unittest

# Add parent dir to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from agent_tools import agent_tools
from core.graph_compiler import GraphCompiler
from skill_manager import skill_manager

class TestSkillManager(unittest.TestCase):
    def test_scan_skills(self):
        skills = skill_manager.scan_skills()
        self.assertTrue(len(skills) > 0)
        ids = [s['id'] for s in skills]
        self.assertIn('media_curator', ids)
        self.assertIn('system_pulse_checker', ids)

    def test_skill_metadata_normalization(self):
        metadata = skill_manager.get_skill('productivity_booster', directory=skill_manager.MARKETPLACE_DIR)
        self.assertIsNotNone(metadata)
        self.assertEqual(metadata['category'], 'studio')
        self.assertFalse(metadata['mcp_enabled'])
        self.assertEqual(metadata['name'], 'Productivity Booster')

        studio_tool = skill_manager.get_skill('system_pulse_checker', directory=skill_manager.MARKETPLACE_DIR)
        self.assertIsNotNone(studio_tool)
        self.assertEqual(studio_tool['category'], 'studio')

    def test_plugin_execution(self):
        # Scan first to load plugins
        skill_manager.scan_skills()
        
        loop = asyncio.get_event_loop()
        result = loop.run_until_complete(skill_manager.execute_skill('system_pulse_checker', {}))
        self.assertEqual(result['status'], 'success')
        self.assertIn('SYSTEM PULSE REPORT', result['output'])

    def test_studio_skill_restricted_in_companion(self):
        loop = asyncio.get_event_loop()
        result = loop.run_until_complete(skill_manager.execute_skill('system_pulse_checker', {}, kernel='companion'))
        self.assertEqual(result['status'], 'error')
        self.assertEqual(result['code'], 'SKILL_PERMISSION_DENIED')

    def test_agent_tools_kernel_exposure(self):
        studio_tools = agent_tools.get_tool_names(kernel='studio')
        self.assertIn('execute_skill', studio_tools)
        self.assertNotIn('save_skill', studio_tools)

        companion_tools = agent_tools.get_tool_names(kernel='companion')
        self.assertIn('save_skill', companion_tools)

    def test_graph_compiler_tool_registry_respects_kernel(self):
        compiler = GraphCompiler(tool_registry=['click', 'type'])
        with self.assertRaises(ValueError):
            compiler.compile('[{"id": "n1", "tool": "save_skill", "args": {}, "dependencies": []}]')

if __name__ == '__main__':
    unittest.main()

#!/usr/bin/env python3
"""
Test script for Playwright console reading functionality.
Tests the read_console() method with a simple test HTML page.
"""

import os
import sys
import asyncio
from pathlib import Path

# Add backend to path
backend_path = Path(__file__).parent / "backend"
sys.path.insert(0, str(backend_path))

from agent_tools import agent_tools


async def test_with_html_file():
    """Test read_console with a local HTML file that has console messages."""
    
    # Create a temporary HTML file with console logs
    test_html = """
    <!DOCTYPE html>
    <html>
    <head>
        <title>Test Console Page</title>
    </head>
    <body>
        <h1>Test Console Page</h1>
        <p>Check the console for messages.</p>
        <script>
            console.log('This is a log message');
            console.warn('This is a warning');
            console.info('This is info');
            console.error('This is an error');
            console.debug('This is debug info');
            
            // Test multiple arguments
            console.log('Multiple args:', 123, true, { key: 'value' });
            
            // Simulate an error
            setTimeout(() => {
                console.log('Deferred log after 100ms');
            }, 100);
        </script>
    </body>
    </html>
    """
    
    # Write to temp file
    test_file = Path(__file__).parent / "test_console.html"
    test_file.write_text(test_html)
    file_url = f"file:///{test_file.resolve()}".replace("\\", "/")
    
    print(f"Testing with file: {file_url}")
    print("-" * 60)
    
    try:
        # Call the read_console method
        result = agent_tools.read_console(file_url)
        
        print(f"✅ Result Status: {'OK' if result.get('ok') else 'FAILED'}")
        print(f"URL: {result.get('url')}")
        print(f"HTTP Status: {result.get('status')}")
        print(f"Message Count: {result.get('count')}")
        print(f"Has Errors: {result.get('has_errors')}")
        
        if result.get('ok'):
            print(f"\nCaptured Console Messages ({len(result.get('messages', []))} total):")
            for i, msg in enumerate(result.get('messages', []), 1):
                msg_type = msg.get('type', 'unknown')
                msg_text = msg.get('text', '')
                print(f"  {i}. [{msg_type}] {msg_text}")
        else:
            print(f"\n❌ Error: {result.get('error')}")
        
        print("-" * 60)
        return result.get('ok', False)
    
    finally:
        # Cleanup
        if test_file.exists():
            test_file.unlink()


async def test_error_handling():
    """Test read_console error handling."""
    
    print("\nTesting error handling...")
    print("-" * 60)
    
    # Test with no URL
    result = agent_tools.read_console(None)
    print(f"No URL test: {result}")
    
    # Test with invalid URL
    result = agent_tools.read_console("http://invalid-domain-that-does-not-exist-12345.com")
    print(f"Invalid URL test: {result.get('ok')} - {result.get('error', 'N/A')[:50]}...")
    
    print("-" * 60)


def main():
    print("=" * 60)
    print("Playwright Console Reading Test Suite")
    print("=" * 60)
    
    try:
        # Run HTML file test
        print("\n[Test 1] HTML File Console Reading")
        success = asyncio.run(test_with_html_file())
        
        # Run error handling test
        print("\n[Test 2] Error Handling")
        asyncio.run(test_error_handling())
        
        if success:
            print("\n✅ All tests completed successfully!")
            sys.exit(0)
        else:
            print("\n❌ Some tests failed")
            sys.exit(1)
    
    except Exception as e:
        print(f"\n❌ Test error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == "__main__":
    main()

from fastmcp import FastMCP
import subprocess

mcp = FastMCP("SpriteSRE-Free")

@mcp.tool()
def diagnose_and_fix(error_log: str) -> str:
    """
    Sends the error log to Gemini 2.5 Flash and 
    returns a suggested command to fix it.
    """
    # Here we will call the Gemini API using the free 'google-generativeai' library
    return "Suggestion: Update Dockerfile line 4 to use node:20-alpine"

@mcp.tool()
def apply_fix(command: str) -> str:
    """Executes the fix suggested by the AI."""
    # Logic to run the command locally
    return f"Executed: {command}"
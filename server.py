from fastapi import FastAPI, Request
import uvicorn
from fastmcp import FastMCP

# 1. Initialize FastAPI (for Webhooks) and FastMCP (for the Agent)
app = FastAPI()
mcp = FastMCP("SpriteSRE")

@app.post("/webhook")
async def handle_webhook(request: Request):
    payload = await request.json()
    
    # Check if the build failed
    if payload.get("action") == "completed" and payload.get("workflow_run", {}).get("conclusion") == "failure":
        repo_name = payload["repository"]["full_name"]
        print(f"🚨 BUILD FAILED in {repo_name}!")
        # This is where we will eventually call your 'agent.py' logic
        return {"status": "analyzing failure"}
    
    return {"status": "ignored"}

# 2. Run the server on port 8000
if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
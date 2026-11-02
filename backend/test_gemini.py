from google import genai
import os

# Get API key from environment
api_key = os.getenv("GEMINI_API_KEY")

if not api_key:
    print("Gemini API key not found!")
else:
    try:
        client = genai.Client(api_key=api_key)

        response = client.models.generate_content(
            model="gemini-3.8-flash",
            contents="Hello! Introduce yourself as the TalentHire customer support assistant."
        )

        print("Gemini Response:")
        print(response.text)

    except Exception as e:
        print("Error:", e)

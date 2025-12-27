import os
import google.generativeai as genai
from PIL import Image
import sys

# Configure Gemini API
# In production, this would be an environment variable
# genai.configure(api_key="YOUR_GEMINI_API_KEY")

def extract_ingredients_from_image(image_path: str) -> str:
    """
    Uses Gemini 1.5 Flash to extract ingredient text from an image.
    """
    try:
        # Initialize the model
        model = genai.GenerativeModel('gemini-1.5-flash')
        
        # Load the image
        img = Image.open(image_path)
        
        # Define the prompt
        prompt = (
            "Look at this product label image. Identify the 'Ingredients' list. "
            "Extract only the list of ingredients and return them as a clean, "
            "comma-separated string. Normalize the text (remove line breaks inside names, "
            "correct minor spelling if obvious). Do not include the word 'Ingredients:' "
            "or any other headers. If no ingredients are found, return 'NO_INGREDIENTS_FOUND'."
        )
        
        # Generate response
        response = model.generate_content([prompt, img])
        
        return response.text.strip()
    except Exception as e:
        return f"Error: {str(e)}"

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python ocr_processor.py <image_path>")
        sys.exit(1)
        
    path = sys.argv[1]
    if not os.path.exists(path):
        print(f"File not found: {path}")
        sys.exit(1)
        
    print(f"Processing image: {path}...")
    ingredients = extract_ingredients_from_image(path)
    print("\nExtracted Ingredients:")
    print("-" * 20)
    print(ingredients)
    print("-" * 20)

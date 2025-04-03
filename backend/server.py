
from flask import Flask, request, jsonify
from flask_cors import CORS
from transformers import AutoTokenizer, AutoModelForCausalLM
import torch

# Initialize Flask app
app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

# Load the DeepSeek Coder model and tokenizer
MODEL_PATH = "./Deepseek-Instruct"


print("Loading tokenizer and model...")  
tokenizer = AutoTokenizer.from_pretrained(MODEL_PATH, trust_remote_code=True)
model = AutoModelForCausalLM.from_pretrained(MODEL_PATH, trust_remote_code=True)

# Move model to GPU if available, otherwise use CPU
device = "cuda" if torch.cuda.is_available() else "cpu"
model.to(device)
print(f"Model loaded on {device}")  

@app.route('/generate', methods=['POST'])
def generate():
    try:
        print("\nReceived request at /generate") 

        # Parse JSON request
        data = request.get_json()
        print("Request Data:", data) 

        # Extract prompt
        prompt = data.get("prompt", "")
        if not prompt:
            print("Error: No prompt provided")  
            return jsonify({"error": "No prompt provided"}), 400

        print(f"Processing prompt: {prompt}")  

        # Tokenize input and move tensors to device
        inputs = tokenizer(prompt, return_tensors="pt").to(device)

        # Generate output
        output_tokens = model.generate(
            **inputs, 
            max_length=512,  # Reduce output length
            do_sample=True,  
            temperature=0.5,  # Lower randomness for focused results
            top_p=0.9,  # Reduce unwanted completions
            num_return_sequences=1  # Ensure only one output
        )

        response_text = tokenizer.decode(output_tokens[0], skip_special_tokens=True).strip()

# Remove input prompt from response if model repeats it
        if response_text.startswith(prompt):
            response_text = response_text[len(prompt):].strip()
        print(f"Generated Response: {response_text}")

        return jsonify({"response": response_text})

    except Exception as e:
        print(f"Error occurred: {e}")  
        return jsonify({"error": "An internal error occurred"}), 500

if __name__ == '__main__':
    print("Starting Flask server on http://127.0.0.1:5000")  
    app.run(host='0.0.0.0', port=5000, debug=True)

print("Flask server stopped")
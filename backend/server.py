from flask import Flask, request, jsonify
from flask_cors import CORS
from transformers import AutoTokenizer, AutoModelForCausalLM
import torch
import logging
import os

# Setup Flask and CORS
app = Flask(__name__)
CORS(app)

# Setup Logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Model configuration
MODEL_PATH = os.environ.get("MODEL_PATH", "./Deepseek-Instruct")
device = "cuda" if torch.cuda.is_available() else "cpu"

# Initialize model and tokenizer with proper error handling
try:
    logger.info(f"Loading tokenizer and model from {MODEL_PATH}...")
    tokenizer = AutoTokenizer.from_pretrained(MODEL_PATH, trust_remote_code=True)
    model = AutoModelForCausalLM.from_pretrained(MODEL_PATH, trust_remote_code=True)
    model.to(device)
    model.eval()
    logger.info(f"Model loaded successfully on {device}")
except Exception as e:
    logger.error(f"Failed to load model: {str(e)}")
    # We'll handle this in a more graceful way instead of raising
    model = None
    tokenizer = None

# Helper function to ensure model is loaded
def ensure_model():
    if model is None or tokenizer is None:
        return False, {"error": "Model not properly initialized"}, 503
    return True, None, None

# Standardized error response function
def error_response(message, status_code=400):
    logger.error(message)
    return jsonify({"error": message}), status_code

# Endpoint 1: /generate (uses 'prompt')
@app.route('/generate', methods=['POST'])
def generate():
    try:
        # Check model availability
        model_ready, error_msg, status_code = ensure_model()
        if not model_ready:
            return error_msg, status_code
            
        logger.info("Received request at /generate")
        
        # Validate request format
        if not request.is_json:
            return error_response("Invalid content type. Expected application/json")
            
        data = request.get_json()
        prompt = data.get("prompt", "")

        if not prompt:
            return error_response("No prompt provided")

        logger.info(f"Processing prompt of length: {len(prompt)}")
        
        # Generate response
        with torch.no_grad():
            inputs = tokenizer(prompt, return_tensors="pt").to(device)
            output_tokens = model.generate(
                **inputs,
                max_length=512,
                do_sample=True,
                temperature=0.5,
                top_p=0.9,
                num_return_sequences=1
            )

            response_text = tokenizer.decode(output_tokens[0], skip_special_tokens=True).strip()
            # Remove prompt from response if it appears at the beginning
            if response_text.startswith(prompt):
                response_text = response_text[len(prompt):].strip()

        logger.info(f"Generated response of length: {len(response_text)}")
        return jsonify({"response": response_text})

    except Exception as e:
        return error_response(f"An internal error occurred: {str(e)}", 500)

# Endpoint 2: /complete (uses 'text')
@app.route('/complete', methods=['POST'])
def complete():
    try:
        # Check model availability
        model_ready, error_msg, status_code = ensure_model()
        if not model_ready:
            return error_msg, status_code
            
        # Validate request format
        if not request.is_json:
            return error_response("Invalid content type. Expected application/json")

        data = request.get_json()
        if not isinstance(data, dict) or 'text' not in data:
            return error_response('Missing or invalid "text" field in request')

        input_text = data['text'].strip()
        if not input_text:
            return error_response('Empty input text')

        logger.info(f"Processing /complete request for input length: {len(input_text)}")

        # Generate completion
        with torch.no_grad():
            inputs = tokenizer(input_text, return_tensors="pt").to(device)
            outputs = model.generate(
                **inputs,
                max_new_tokens=500,
                temperature=0.7,
                top_p=0.95,
                do_sample=True,
                pad_token_id=tokenizer.eos_token_id
            )
            completion = tokenizer.decode(outputs[0][inputs['input_ids'].shape[1]:], skip_special_tokens=True)

        logger.info(f"Generated completion of length: {len(completion)}")
        return jsonify({'completion': completion})

    except Exception as e:
        return error_response(f"Error in /complete: {str(e)}", 500)
    
# Endpoint 3: /hf-complete (uses 'code')
@app.route('/hf-complete', methods=['POST'])
def hf_complete():
    try:
        # Check model availability
        model_ready, error_msg, status_code = ensure_model()
        if not model_ready:
            return error_msg, status_code
            
        # Validate request format
        if not request.is_json:
            return error_response("Invalid content type. Expected application/json")
            
        data = request.get_json()
        input_text = data.get("code", "").strip()

        if not input_text:
            return error_response("No code provided")

        logger.info(f"Received /hf-complete request for input length {len(input_text)}")

        # Generate suggestion
        with torch.no_grad():
            inputs = tokenizer(input_text, return_tensors="pt").to(device)
            outputs = model.generate(
                **inputs, 
                max_new_tokens=32,
                temperature=0.6,
                top_p=0.95,
                do_sample=True
            )
            full_output = tokenizer.decode(outputs[0], skip_special_tokens=True)

            # Remove echoed input
            if full_output.startswith(input_text):
                suggestion = full_output[len(input_text):]
            else:
                suggestion = full_output

            # Stop suggestion at the start of any new function
            lines = suggestion.split('\n')
            filtered = []
            for line in lines:
                if line.strip().startswith("def ") and filtered:
                    break  # Stop if another function is generated
                filtered.append(line)
    
            suggestion = "\n".join(filtered).strip()

        logger.info(f"HF-complete suggestion of length: {len(suggestion)}")
        return jsonify({"completion": suggestion})

    except Exception as e:
        return error_response(f"Error in /hf-complete: {str(e)}", 500)

# Endpoint 4: /fill_in_the_middle (uses 'text')
@app.route("/fill_in_the_middle", methods=["POST"])
def fill_in_the_middle():
    try:
        # Check model availability
        model_ready, error_msg, status_code = ensure_model()
        if not model_ready:
            return error_msg, status_code
            
        # Validate request format
        if not request.is_json:
            return error_response("Invalid content type. Expected application/json")
            
        data = request.get_json()
        if not isinstance(data, dict) or 'text' not in data:
            return error_response('Missing or invalid "text" field in request')
            
        input_text = data['text'].strip()
        if not input_text:
            return error_response('Empty input text')
            
        # Create a better prompt for the fill-in-the-middle task
        prompt = (
            f"{input_text}\n\n"
            "----Complete the code by filling in any gaps or implementing missing functionality.\n"
            "Focus only on providing the missing parts that would make this code more complete.\n"
            "Do not give any other extra block of code, just the the present code which contains the filled missing code "
        )
        
        logger.info(f"Processing /fill_in_the_middle request for input length: {len(input_text)}")

        # Generate completion
        with torch.no_grad():
            inputs = tokenizer(prompt, return_tensors="pt").to(device)
            outputs = model.generate(
                **inputs,
                max_new_tokens=500,
                temperature=0.7,
                top_p=0.95,
                do_sample=True,
                pad_token_id=tokenizer.eos_token_id
            )
            completion = tokenizer.decode(outputs[0][inputs['input_ids'].shape[1]:], skip_special_tokens=True)
            
            # Check if we just got back something too similar to the input
            if completion.strip() == input_text.strip():
                completion = "// No additional code needed"

        logger.info(f"Generated fill-in-the-middle completion of length: {len(completion)}")
        return jsonify({'completion': completion})

    except Exception as e:
        return error_response(f"Error in /fill_in_the_middle: {str(e)}", 500)

# Add health check endpoint
@app.route("/health", methods=["GET"])
def health_check():
    model_status = "ready" if model is not None and tokenizer is not None else "not_ready"
    return jsonify({
        "status": "ok",
        "model": model_status,
        "device": device
    })

if __name__ == '__main__':
    logger.info("Starting Flask server at http://127.0.0.1:5000")
    app.run(debug=True, port=5000, host='127.0.0.1')
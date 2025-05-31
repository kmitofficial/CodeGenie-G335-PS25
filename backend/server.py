from flask import Flask, request, jsonify
from flask_cors import CORS
from transformers import AutoTokenizer, AutoModelForCausalLM
import torch
import logging
import os
import re
import json
import pyngrok.ngrok as ngrok

# Setup Flask and CORS
app = Flask(__name__)
CORS(app)

# Setup Logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Configuration from environment variables
NGROK_AUTH_TOKEN = os.environ.get("NGROK_AUTH_TOKEN", "2vDDsjBFnwE7d6orXuyZHEN3toS_2fo2ae8eR5qNJsPAJtgfi")
PORT = int(os.environ.get("PORT", 5000))
MODEL_PATH = os.environ.get("MODEL_PATH", "./Deepseek-Instruct")

# Global variable for public URL
public_url = None

# Model configuration
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

# Helper function to get language context for prompts
def get_language_context(language_name, file_name=None):
    """Generate language-specific context for prompts"""
    if not language_name:
        return ""
    
    context = f"Programming Language: {language_name}"
    if file_name:
        context += f"\nFile: {file_name}"
    return context + "\n\n"

@app.route("/connection_info", methods=['GET'])
def connection_info():
    return jsonify({
        "status": "connected",
        "server_url": public_url,
        "model_status": "ready" if model is not None and tokenizer is not None else "not_ready",
        "device": device
    })

# Endpoint 1: /generate (uses 'prompt') - NO LANGUAGE CONTEXT ADDED
chat_history = []

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
        
        if not request.is_json:
            return error_response("Invalid content type. Expected application/json")
        
        data = request.get_json()
        prompt = data.get("prompt", "").strip()

        if not prompt:
            return error_response("No prompt provided")

        logger.info(f"Processing new prompt: {prompt[:100]}...")

        # Build conversation context
        conversation = []
        for i, (prev_prompt, prev_response) in enumerate(chat_history[-5:]):  # Limit to last 5 exchanges
            conversation.append(f"Human: {prev_prompt}")
            conversation.append(f"Assistant: {prev_response}")
        
        # Add current prompt
        conversation.append(f"Human: {prompt}")
        conversation.append("Assistant:")
        
        full_prompt = "\n\n".join(conversation)
        
        logger.info(f"Full conversation context length: {len(full_prompt)}")

        # Tokenize and generate
        with torch.no_grad():
            inputs = tokenizer(full_prompt, return_tensors="pt").to(device)
            
            # Get the length of input tokens to extract only the generated part
            input_length = inputs['input_ids'].shape[1]
            
            output_tokens = model.generate(
                **inputs,
                max_length=input_length + 512,  # Generate up to 512 new tokens
                do_sample=True,
                temperature=0.7,
                top_p=0.9,
                num_return_sequences=1,
                pad_token_id=tokenizer.eos_token_id,
                eos_token_id=tokenizer.eos_token_id
            )

            # Extract only the newly generated tokens (response)
            generated_tokens = output_tokens[0][input_length:]
            response_text = tokenizer.decode(generated_tokens, skip_special_tokens=True).strip()
            
            # Clean up response - remove any trailing conversation markers
            response_text = response_text.split("Human:")[0].strip()
            response_text = response_text.split("Assistant:")[0].strip()
            
            # If response is empty or too short, provide a fallback
            if not response_text or len(response_text) < 5:
                response_text = "I understand your question. Could you please provide more details or rephrase it?"

        logger.info(f"Generated clean response: {response_text[:100]}...")

        # Save this pair to history (limit history size)
        chat_history.append((prompt, response_text))
        if len(chat_history) > 10:  # Keep only last 10 exchanges
            chat_history.pop(0)

        logger.info(f"Generated response of length: {len(response_text)}")
        return jsonify({"response": response_text})

    except Exception as e:
        logger.exception(f"Error in /generate: {str(e)}")
        return error_response(f"An internal error occurred: {str(e)}", 500)

# Clear chat history endpoint
@app.route('/clear_history', methods=['POST'])
def clear_history():
    global chat_history
    chat_history = []
    logger.info("Chat history cleared")
    return jsonify({"message": "Chat history cleared successfully"})

# Endpoint 2: /complete (uses 'text') - WITH LANGUAGE CONTEXT
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

        # Get language context
        language_name = data.get('languageName', '')
        file_name = data.get('fileName', '')
        language_context = get_language_context(language_name, file_name)

        logger.info(f"Processing /complete request for input length: {len(input_text)} with language: {language_name}")

        # Add language context to the input
        enhanced_input = language_context + input_text

        # Generate completion
        with torch.no_grad():
            inputs = tokenizer(enhanced_input, return_tensors="pt").to(device)
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
    
# Endpoint 3: /hf-complete (uses 'code') - WITH LANGUAGE CONTEXT
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

        # Get language context
        language_name = data.get('languageName', '')
        file_name = data.get('fileName', '')
        language_context = get_language_context(language_name, file_name)

        logger.info(f"Received /hf-complete request for input length {len(input_text)} with language: {language_name}")

        # Add language context to the input
        enhanced_input = language_context + input_text

        # Generate suggestion
        with torch.no_grad():
            inputs = tokenizer(enhanced_input, return_tensors="pt").to(device)
            outputs = model.generate(
                **inputs, 
                max_new_tokens=32,
                temperature=0.6,
                top_p=0.95,
                do_sample=True
            )
            full_output = tokenizer.decode(outputs[0], skip_special_tokens=True)

            # Remove echoed input (including language context)
            if full_output.startswith(enhanced_input):
                suggestion = full_output[len(enhanced_input):]
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

# Endpoint 4: /fill_in_the_middle (uses 'text') - WITH LANGUAGE CONTEXT
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

        # Get language context
        language_name = data.get('languageName', '')
        file_name = data.get('fileName', '')
        language_context = get_language_context(language_name, file_name)
            
        # Create a better prompt for the fill-in-the-middle task with language context
        prompt = (
            f"{language_context}"
            f"{input_text}\n\n"
            "----Complete the code by filling in any gaps or implementing missing functionality.\n"
            f"Focus only on providing the missing parts that would make this {language_name or 'code'} more complete.\n"
            "Do not give any other extra block of code, just the present code which contains the filled missing code.\n"
        )
        
        logger.info(f"Processing /fill_in_the_middle request for input length: {len(input_text)} with language: {language_name}")

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
                completion = f"// No additional {language_name or 'code'} needed"

        logger.info(f"Generated fill-in-the-middle completion of length: {len(completion)}")
        return jsonify({'completion': completion})

    except Exception as e:
        return error_response(f"Error in /fill_in_the_middle: {str(e)}", 500)

# Endpoint 5: /debug (code debugging and analysis) - WITH LANGUAGE CONTEXT
@app.route('/debug', methods=['POST'])
def debug_code():
    def analyze_code_issues(code):
        # Basic dummy issue detection for placeholder
        issues = []
        if "==" in code and "if" in code:
            issues.append("Potential logical comparison in condition")
        if "print" not in code:
            issues.append("Missing print statement (for debugging output)")
        return issues
    
    try:
        logger.info("Received request at /debug")
        
        if not request.is_json:
            return error_response("Invalid content type. Expected application/json")
            
        data = request.get_json()
        prompt = data.get("prompt", "")

        if not prompt:
            return error_response("No prompt provided")

        # Get language context
        language_name = data.get('languageName', '')
        file_name = data.get('fileName', '')
        language_context = get_language_context(language_name, file_name)

        is_debug_request = "debug" in prompt.lower() or "fix" in prompt.lower() or "issue" in prompt.lower()
        code_to_debug = ""

        if is_debug_request:
            code_match = re.search(r'(?:```[\w]*\n)?(.*?)(?:```)?$', prompt, re.DOTALL)
            if code_match:
                code_to_debug = code_match.group(1).strip()
                logger.info(f"Extracted code for debugging: {code_to_debug[:100]}...")

        if is_debug_request and code_to_debug:
            detected_issues = analyze_code_issues(code_to_debug)
            enhanced_prompt = (
                f"{language_context}"
                f"Analyze and debug the following {language_name or 'code'}. "
                f"Potential issues detected: {', '.join(detected_issues) if detected_issues else 'None detected'}. "
                "Provide:\n"
                "1. Detailed analysis of problems\n"
                "2. Specific fixes\n"
                "3. Improved version\n"
                "4. Explanation of changes\n"
                f"Code:\n```{language_name.lower() if language_name else ''}\n{code_to_debug}\n```"
            )
            prompt = enhanced_prompt
            logger.info(f"Enhanced debug prompt with language context for: {language_name}")
        else:
            # Add language context to regular prompts too
            prompt = language_context + prompt

        # Check model availability
        model_ready, error_msg, status_code = ensure_model()
        if not model_ready:
            return error_msg, status_code

        with torch.no_grad():
            inputs = tokenizer(prompt, return_tensors="pt").to(device)
            output_tokens = model.generate(
                **inputs,
                max_length=inputs['input_ids'].shape[1] + 512,
                do_sample=True,
                temperature=0.7,
                top_p=0.9,
                num_return_sequences=1,
                pad_token_id=tokenizer.eos_token_id
            )

            response_text = tokenizer.decode(output_tokens[0][inputs['input_ids'].shape[1]:], skip_special_tokens=True).strip()

        if is_debug_request:
            if "1." not in response_text and "2." not in response_text:
                response_text = (
                    f"## {language_name or 'Code'} Analysis\n\n" +
                    response_text +
                    "\n\n## Suggested Fixes\n\n" +
                    f"Here are the recommended changes to improve the {language_name or 'code'}..."
                )

        logger.info(f"Generated response for /debug (length: {len(response_text)}) with language: {language_name}")
        return jsonify({"response": response_text})

    except Exception as e:
        logger.error(f"Error in /debug: {str(e)}")
        return error_response(f"An internal error occurred: {str(e)}", 500)

# Endpoint 6: /optimize - WITH LANGUAGE CONTEXT
@app.route('/optimize', methods=['POST'])
def optimize():
    try:
        # Check model availability
        model_ready, error_msg, status_code = ensure_model()
        if not model_ready:
            return error_msg, status_code
            
        if not request.is_json:
            return error_response('Invalid content type. Expected application/json')

        data = request.get_json()
        input_text = data.get("text", "").strip()
        if not input_text:
            return error_response('Empty input text')

        # Get language context
        language_name = data.get('languageName', '')
        file_name = data.get('fileName', '')
        language_context = get_language_context(language_name, file_name)

        logger.info(f"Processing optimization request with input length: {len(input_text)} for language: {language_name}")

        # Prepare prompt for the model to generate optimized code with language context
        prompt = (
            f"{language_context}"
            f"Optimize the following {language_name or 'code'} to improve its time and space complexity. "
            "Use appropriate data structures and algorithms while ensuring the functionality remains the same.\n"
            "Do not include any test cases, only provide the optimized code.\n\n"
            f"{input_text}\n\n# Optimized {language_name or 'Code'}:\n"
        )
        
        with torch.no_grad():
            inputs = tokenizer(prompt, return_tensors="pt").to(device)
            outputs = model.generate(
                **inputs,
                max_new_tokens=600,
                temperature=0.7,
                top_p=0.9,
                do_sample=False,
                pad_token_id=tokenizer.eos_token_id
            )
            completion = tokenizer.decode(outputs[0][inputs['input_ids'].shape[1]:], skip_special_tokens=True).strip()
            
            # Clean up the response
            if f"# Optimized {language_name or 'Code'}:" in completion:
                code_block = completion.split(f"# Optimized {language_name or 'Code'}:")[1].strip()
                code_lines = code_block.splitlines()
                func_lines = []
                for line in code_lines:
                    if line.strip().startswith("print(") or line.strip().startswith("# Test Cases"):
                        break
                    func_lines.append(line)
                completion = "\n".join(func_lines).strip()

        logger.info(f"Generated optimized {language_name or 'code'} of length: {len(completion)}")
        return jsonify({'completion': completion})

    except Exception as e:
        logger.exception("Error during optimization")
        return error_response(f"An internal error occurred: {str(e)}", 500)

# Add health check endpoint
@app.route("/health", methods=["GET"])
def health_check():
    model_status = "ready" if model is not None and tokenizer is not None else "not_ready"
    return jsonify({
        "status": "ok",
        "server_url": public_url,
        "model": model_status,
        "device": device
    })

def start_ngrok():
    """
    Start an ngrok tunnel and return the public URL
    """
    global public_url
    
    if not NGROK_AUTH_TOKEN:
        logger.warning("No ngrok auth token provided. Tunnel may have connection limits.")
    else:
        ngrok.set_auth_token(NGROK_AUTH_TOKEN)
        
    try:
        # Start ngrok tunnel
        public_url = ngrok.connect(PORT).public_url
        logger.info(f"ngrok tunnel established at: {public_url}")
        
        # Save configuration to a file for clients to access
        with open("server_config.json", "w") as f:
            json.dump({"server_url": public_url}, f)

        logger.info(f"Server URL saved to server_config.json")
        return public_url
    except Exception as e:
        logger.error(f"Error starting ngrok: {str(e)}")
        return None

# Run the flask app
if __name__ == '__main__':
    # Start ngrok tunnel
    public_url = start_ngrok()
    
    if not public_url:
        logger.warning("Failed to established ngrok tunnel. Running with local access only.")
        public_url = f"http://127.0.0.1:{PORT}"

    logger.info(f"Starting Flask server with ngrok tunnel at {public_url}")
    app.run(debug=False, port=PORT, host='0.0.0.0')  # Set debug=False for production

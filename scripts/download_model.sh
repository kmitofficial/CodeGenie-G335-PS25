#!/bin/bash

# Script to download a Hugging Face model using CLI

# Check if huggingface-cli is installed
if ! command -v huggingface-cli &> /dev/null
then
    echo "huggingface-cli not found. Installing..."
    pip install --upgrade huggingface_hub
fi

# Login to Hugging Face if needed
# Uncomment the next line if authentication is required
# huggingface-cli login

# Model name (Replace with the desired model name)
MODEL_NAME="deepseek-ai/deepseek-coder-1.3b-instruct"

# Download the model
huggingface-cli download $MODEL_NAME --local-dir ./backend/Deepseek-Instruct 


echo "Model downloaded successfully to ./backend/Deepseek-Instruct"



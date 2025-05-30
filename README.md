# 🚀 CodeGenie – Your AI-Powered Coding Assistant  

# 📌 Introduction  
Welcome to **CodeGenie**, an intelligent **VS Code extension** that brings the power of AI-driven **code generation** right into your workflow! Powered by **DeepSeek Coder** and accelerated by an **RTX 4090 GPU**, this extension provides **real-time** code suggestions, **autocompletions**, and **context-aware snippets**, making development faster, smarter, and more efficient.  

---

# 🎯 Purpose of the Project  

- 🧠 **AI-Powered Code Assistance** – Integrate a cutting-edge **large language model (LLM)** to generate **intelligent** and **contextually relevant** code snippets.  
- 🔌 **Seamless VS Code Integration** – Develop a fully functional **VS Code extension** that enhances coding productivity.  
- ⚡ **Optimized Performance with GPU Acceleration** – Utilize a **high-performance RTX 4090 GPU** to ensure **fast** and **efficient** AI inference.  
- 🚀 **Enhancing Developer Experience** – Automate repetitive tasks, reduce errors, and speed up the coding process with AI-driven suggestions.  

---

# 🌍 Applications of the Project  

✅ **Real-Time Code Autocompletion** – Get instant code suggestions while typing, reducing keystrokes and enhancing efficiency.  
✅ **AI-Generated Code Snippets** – Automatically generate boilerplate code and reusable functions based on **contextual prompts**.  
✅ **Multi-Language Support** – Assist developers across various programming languages, improving cross-language compatibility.  
✅ **Error Detection & Fix Suggestions** – Help identify common coding mistakes and offer AI-powered solutions.  
✅ **Increased Productivity** – Reduce development time, improve code quality, and streamline workflows with **AI automation**.  

---


# 🚀 Architecture Diagram
![Architecture Diagram](images/ArchitectureDiagram.png)

# 🧠 WorkFlow
![Workflow](images/Workflow.png)
# 📖 Brief Explanation of the Reference Research Papers  

### 🔬 DeepSeek-Coder: Open-Source Large Language Models for Code Intelligence  

**DeepSeek-Coder** is a series of open-source **large language models (LLMs)** designed for **code understanding, generation, and completion**. These models, ranging from **1.3B to 33B parameters**, are pre-trained on a **high-quality, project-level code corpus** and employ advanced learning strategies to achieve **state-of-the-art performance** in open-source code intelligence.  

### 🏆 Key Contributions and Features  

- **Scalable Model Variants** – Supports models in sizes of **1.3B, 6.7B, and 33B parameters**, catering to various computational and application needs.  
- **Extensive Pretraining** – Trained on **2 trillion tokens** from **87 programming languages**, ensuring robust cross-language code comprehension.  
- **Repository-Level Data Organization** – Unlike conventional file-based training, DeepSeek-Coder incorporates **repository-level data structuring**, significantly enhancing cross-file code generation.  
- **Advanced Code Completion & Infilling** – Implements a **fill-in-the-middle (FIM) task** with a **16K context window**, improving in-line completions and cross-file dependency resolution.  
- **Superior Open-Source Performance** – Outperforms other open-source models (e.g., **CodeLlama, StarCoder, CodeGeeX2**) and even surpasses **GPT-3.5-Turbo** in multiple code-related benchmarks.  
- **Instruction-Tuned Model** – **DeepSeek-Coder-Instruct** further fine-tuned with **high-quality instructional data**, improving performance in multi-turn coding tasks and real-world programming challenges.  
- **Long-Context Adaptation** – Utilizes an **optimized RoPE-based positional encoding**, enabling effective processing of up to **16K tokens**, with the potential to scale beyond **64K tokens**.  
- **Cross-File Code Completion** – Evaluated on the **CrossCodeEval** benchmark, demonstrating superior performance in handling multi-file codebases.  
- **Mathematical & Reasoning Capabilities** – Fine-tuned versions (**DeepSeek-Coder-v1.5**) incorporate additional pretraining for **mathematical reasoning** and **natural language understanding** tasks.  

### 📊 Performance Benchmarks  

- **HumanEval & MBPP** – Achieves **66.0% accuracy**, outperforming **CodeLlama-33B**.  
- **LeetCode Contest Benchmark** – Surpasses **GPT-3.5-Turbo** and is the first open-source model to outperform it.  
- **DS-1000 (Data Science Benchmark)** – Excels in applying libraries like **NumPy, Pandas, and PyTorch** to real-world data science problems.  
- **CrossCodeEval** – Demonstrates **state-of-the-art performance** in **cross-file code understanding**, a key factor for repository-level code comprehension.  

### 📜 License & Availability  

DeepSeek-Coder is released under a **permissive open-source license**, allowing unrestricted use for research and commercial applications.  

🔗 **GitHub Repository:** [DeepSeek-Coder](https://github.com/deepseek-ai/DeepSeek-Coder)  


### Requirements and Instructions

- **requirements.txt** -Initially install all the requirements from requirements.txt using the command pip install requirements.txt
- **download_model.sh** -Refer to the scripts/download_model.sh file to ensure the download of Deepseek Instruct 1.3b instruct model.

## 👥 Contributors Overview

| Name                   | GitHub Profile                                    | Milestone 1 Video                                           | Milestone 2 Video                                           | PPT Link                                              |
|------------------------|---------------------------------------------------|-------------------------------------------------------------|-------------------------------------------------------------|-------------------------------------------------------|
| Kallem Preetham Reddy | [K-Preetham-Reddy](https://github.com/K-Preetham-Reddy) | [Watch](https://www.youtube.com/watch?v=-OCLX3o41y0)        | [Watch](https://www.youtube.com/watch?v=hVD1DLjhYbA)        | [Download from ZIP](<./docs.zip>)                     |
| Vishesh Gupta         | [gupvishesh](https://github.com/gupvishesh)       | [Watch](https://youtu.be/oYhpkxAc-kk?si=VOfd-vNPcvayipcp)   | [Watch](https://youtu.be/qfQvlAPucFQ?si=TxjmFHuLfITIvqRA)   | [Download from ZIP](<./docs.zip>)                     |
| G Shruthi             | [Shruthi280](https://github.com/Shruthi280)       | [Watch](https://youtu.be/TrgejCfHIYM)                       | [Watch](https://youtu.be/oybMNiyJBPY?si=bOqJ0DYzOvPlLwCf)   | [Download from ZIP](<./docs.zip>)                     |
| MKN Sai Varun         | [MKN-Sai-Varun](https://github.com/MKN-Sai-Varun) | [Watch](https://youtu.be/5o33Pr5BzqI?si=QGFA3ZaWLsBPTrDi)   | [Watch](https://youtu.be/Q3nBlNJ5UE8?si=W3ZahXXI0P42kn1l)                       | [Download from ZIP](<./docs.zip>)                     |
| Palak Jain            | [Palakjain1234](https://github.com/Palakjain1234) | [Watch](https://youtu.be/kSF9GxOHq9w?si=ig1mN9SizxQTVeCt)   | [Watch](https://youtu.be/rQvynFVxXBo?si=ba3N-jQ-v2J-Ucy4)   | [Download from ZIP](<./docs.zip>)                     |
| Patel Sharanya        | [PatelSharanya](https://github.com/PatelSharanya) | [Watch](https://www.youtube.com/watch?v=MSq8f-T1dxw)        | [Watch](https://youtu.be/W9APGHYzkiA?si=QpCym8lWXqeqyGLB)   | [Download from ZIP](<./docs.zip>)                     |
| Pranav Kasanagottu    | [PranavKasanagottu](https://github.com/PranavKasanagottu) | [Watch](https://www.youtube.com/watch?v=bbtxZsi9YKw)        | [Watch](https://youtu.be/fv_47feubUM)                       | [Download from ZIP](<./docs.zip>)                     |


---
🔥 Get ready to build the future of **AI-powered development** with **CodeGenie**! 🚀  

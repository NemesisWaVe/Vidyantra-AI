# Vidyantra AI | Your Personal AI Learning Companion

**Vidyantra AI** makes understanding K-12 science topics (CBSE/ICSE) easier and more engaging. Using cutting-edge AI on AWS, it generates clear explanations, helpful visuals, audio summaries, and short video summaries tailored to the student's learning profile.

---

**(Optional: Add a GIF or Screenshot here showing the main UI in action)**


---

**See it in action in demo video:** https://www.youtube.com/watch?v=GjCJq2_ZU5w

**Try the live app:** https://main.d38o8u36qtnpp8.amplifyapp.com

---

## Features

Vidyantra AI offers a personalized learning experience:

* **Tailored Explanations:** Ask about any science topic (e.g., "Photosynthesis", "Newton's Laws"). Get simple, easy-to-understand explanations adjusted for the student's grade level and board (CBSE/ICSE).
* **Visual Learning:** AI-generated images accompany text to illustrate key concepts visually.
* **Audio Summaries:** Listen to a quick audio voiceover of the explanation generated using natural-sounding text-to-speech.
* **Dynamic Video Reels:** Watch short, engaging video summaries combining the explanation, visuals, and audio with subtle motion effects.
* **Chapter-Specific Help (RAG):** Upload a chapter PDF! Vidyantra AI uses **Retrieval-Augmented Generation (RAG)** to answer questions based *specifically* on the content within that chapter, ensuring high relevance and accuracy.
* **Personalized Experience:** Remembers basic user details (board, grade) via DynamoDB to tailor future content.

---

## Tech Stack

Vidyantra AI leverages a powerful and scalable serverless architecture on **Amazon Web Services (AWS)**:

* **Frontend:** Built with **React** and hosted globally via **AWS Amplify Hosting** for fast, reliable access.
* **Backend API:** User requests are handled securely through **Amazon API Gateway** (using Lambda URL for direct invocation in this version).
* **Compute Engine (AWS Lambda):**
    * **Orchestration:** Manages the workflow for content generation.
    * **AI Tasks:** Separate functions handle text generation, image generation, audio generation, and RAG retrieval.
    * **Video Processing:** A dedicated Lambda function using a custom **Container Image** (built via **AWS CodeBuild** and stored in **Amazon ECR**) synthesizes videos using MoviePy.
* **AI Models (Amazon Bedrock):**
    * **Text Generation:** Claude 3 Haiku for clear and concise explanations.
    * **Image Generation:** Titan Image Generator G1 for relevant visuals.
    * **RAG:** **Bedrock Knowledge Bases** indexes uploaded PDFs (stored in **S3**) for contextual question answering.
* **Voice Generation (Amazon Polly):** Creates natural-sounding audio summaries.
* **Storage (Amazon S3):** Securely stores uploaded chapter PDFs, generated images, audio files, and final videos.
* **Database (Amazon DynamoDB):** Stores user profile information (board, grade) for personalization in a fast, scalable NoSQL database.

---

## Architecture

This diagram illustrates the flow of information and services:

```mermaid
graph TD
    subgraph User_Interface
        UI[React Frontend App]
    end

    subgraph API
        API_GW[API Gateway Endpoint]
    end

    subgraph AI_Engine_AWS
        O[Orchestrator Lambda]
        DB[(DynamoDB User Profiles)]
        KB[Bedrock Knowledge Base] -- Reads --> S3_Chapters[S3 Chapter Uploads]
        RAG[RAG Retriever Lambda] -- Queries --> KB
        Script[Scriptwriter Lambda] -- Uses --> Bedrock_Text[Bedrock Text Model]
        Img[Image Generator Lambda] -- Uses --> Bedrock_Image[Bedrock Image Model]
        Aud[Audio Generator Lambda] -- Uses --> Polly[Amazon Polly]
        Vid[Video Synthesizer Lambda Container] -- Uses MoviePy --> S3_Assets[S3 Generated Assets]

        O -- Reads --> DB
        O -- Invokes --> RAG
        O -- Invokes --> Script
        O -- Invokes --> Img
        O -- Invokes --> Aud
        O -- Invokes --> Vid

        Script -- Text/Images --> O
        Img -- Image URLs --> S3_Assets
        Aud -- Audio URL --> S3_Assets
        Vid -- Video URL --> S3_Assets
    end

    UI -- Asks Question --> API_GW -- Triggers --> O
    API_GW -- Returns Content URLs --> UI
    UI -- Displays Content From --> S3_Assets

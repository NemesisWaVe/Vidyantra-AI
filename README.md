# Vidyantra AI

**Vidyantra AI** is an AI-powered, personalized learning companion designed for the Indian K-12 market (CBSE, ICSE, etc.). This project serves as a Proof of Concept developed for the **AWS AI Agent Global Hackathon**, showcasing an autonomous agent capable of generating multi-modal educational content tailored to individual student needs.

**(Optional: Add a GIF or Screenshot here showing the main UI in action)**
**Watch the Demo Video:** [Link to your 3-minute Demo Video]

## The Vision

Vidyantra AI aims to revolutionize EdTech by making learning as addictive and engaging as social media. The vision includes:
* **Personalized Learning Paths:** AI adapts to each student's board, grade, and learning pace.
* **Gamification:** Daily quizzes, weekly tests, and achievement badges (Bronze, Silver, Gold) to motivate students.
* **Social Learning:** A feed featuring AI-generated "reels" (short educational videos) created by the platform and premium users, fostering a collaborative environment.
* **"Epic Flashcards":** AI-generated flashcards based on performance to aid revision.

## Hackathon POC Features 🛠️

This repository contains the functional Proof of Concept demonstrating the core engine:

* **Autonomous Content Generation:** An AI agent built on AWS Lambda and Bedrock that takes a topic, user profile (Board, Grade), and generates:
    * Age-appropriate text explanations.
    * Relevant visual aids (AI-generated images).
    * Natural-sounding voiceovers (MP3).
    * Dynamic video reels (MP4) combining visuals and audio with motion effects.
* **Personalization:** Utilizes Amazon DynamoDB to store user profiles and retrieve board/grade information, tailoring the AI's output.
* **Chapter Upload (RAG):** Implements Retrieval-Augmented Generation using Amazon Bedrock Knowledge Bases. Students can upload PDF chapters, and the AI uses that specific context to generate explanations and content.
* **Serverless Architecture:** Fully built on scalable, cost-effective AWS serverless services.

## Tech Stack 💻

**Backend (AWS):**
* **Compute:** AWS Lambda (Python 3.12 Runtime & Container Images)
* **AI/ML:**
    * Amazon Bedrock (Claude 3 Haiku for text, Titan Image Generator G1 for images)
    * Amazon Bedrock Knowledge Bases (for RAG)
    * Amazon Polly (for Text-to-Speech)
* **Storage:** Amazon S3 (for generated assets & chapter uploads), Amazon ECR (for container image)
* **Database:** Amazon DynamoDB (for user profiles)
* **Orchestration/Build:** AWS CodeBuild (for container image CI/CD), AWS IAM (for permissions)
* **Video Processing:** MoviePy (via FFMPEG in Lambda Container)

**Frontend:**
* **Framework:** React (with Vite)
* **Styling:** Tailwind CSS
* **UI Components:** Shadcn/UI (Default style)
* **Animation:** Framer Motion
* **Icons:** Lucide React

**Infrastructure:**
* **API:** Amazon API Gateway (HTTP API) - *Planned for frontend connection*
* **Hosting:** AWS Amplify Hosting - *Planned for frontend deployment*

## Architecture 🏗️

```mermaid
graph TD
    subgraph Frontend_Amplify
        UI[React App]
    end

    subgraph API_Gateway
        API[HTTP API Endpoint]
    end

    subgraph Backend_AWS
        O[Orchestrator Lambda]
        DB[(DynamoDB Users Table)]
        KB[Bedrock Knowledge Base] -- Reads_PDF --> S3Chapters[S3 Chapter Uploads Bucket]
        RAG[RAG Retriever Lambda] -- Queries --> KB
        S[Scriptwriter Lambda] -- Uses --> BedrockText[Bedrock - Claude Haiku]
        I[Image Generator Lambda] -- Uses --> BedrockImage[Bedrock - Titan Image]
        A[Audio Generator Lambda] -- Uses --> Polly[Amazon Polly]
        V[Video Synthesizer Lambda Container] -- Uses_MoviePy_FFmpeg --> S3Assets[S3 Generated Assets Bucket]

        O -- Reads --> DB
        O -- Invokes --> RAG
        O -- Invokes --> S
        O -- Invokes --> I
        O -- Invokes --> A
        O -- Invokes --> V

        RAG -- Gets_Chunks --> O
        S -- Script_Storyboard --> O
        I -- Image_URLs --> S3Assets
        A -- Audio_URL --> S3Assets
        V -- Video_URL --> S3Assets
    end

    UI -- User_Input --> API -- Triggers --> O
    API -- Returns_Asset_URLs --> UI
    UI -- Fetches_Assets --> S3Assets

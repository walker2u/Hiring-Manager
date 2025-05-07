# AI-Powered Hiring Manager Assistant 🤖📄🗓️

**By Mayank Kumar Prasad**

**Automating the initial grind of recruitment: This project uses AI to screen candidates from Gmail and schedules interviews for qualified individuals.**

## The Challenge

Startups and busy hiring teams often face an overwhelming volume of job applications. Manually sifting through resumes, evaluating them against criteria, and then initiating contact can be a significant time sink. This project was built to tackle this initial bottleneck by intelligently automating the first-pass screening and scheduling process.

## How It Works: The Technical Flow

This full-stack application orchestrates several Google services and AI to streamline hiring:

1.  **Real-time Email Ingestion (Gmail API & Pub/Sub):**
    *   The system authenticates with a designated Gmail account using OAuth 2.0.
    *   A "watch" is set on the inbox via the Gmail API, instructing Gmail to send notifications to a Google Cloud Pub/Sub topic upon arrival of new emails.
2.  **Webhook & Backend Processing (Node.js & Express.js):**
    *   A Pub/Sub "push" subscription delivers these notifications to a secure webhook endpoint on the Node.js backend.
    *   The backend fetches new email details (using history IDs) and extracts attachments (resumes, typically PDFs).
3.  **AI Resume Analysis (Google Gemini AI):**
    *   The extracted resume content is sent to Google's Gemini AI API along with predefined, detailed hiring criteria (e.g., for a "Senior Software Engineer").
    *   The AI analyzes the resume against these criteria and returns a qualification decision (`true`/`false`) and a concise reasoning.
4.  **Automated Interview Scheduling (Google Calendar API):**
    *   If the AI deems the candidate qualified based on their resume:
        *   The Google Calendar API creates a new event with a Google Meet link.
        *   Attendees include the candidate (original email sender) and the hiring manager (authenticated user).
5.  **Interactive Dashboard (React & shadcn/ui):**
    *   A React frontend (built with Vite and TypeScript) provides a user interface to:
        *   Monitor the authentication and Gmail watch status.
        *   View a list of candidates who have been AI-qualified.
        *   Inspect basic details and the AI's reasoning for qualified candidates.

## Core Technologies Used

*   **Backend:**
    *   Node.js, Express.js
    *   Google APIs Client Library (Gmail, Calendar, Pub/Sub)
    *   Google Generative AI SDK (for Gemini models)
    *   `google-auth-library` for OAuth 2.0
*   **Frontend:**
    *   React (with Vite)
    *   TypeScript
    *   Tailwind CSS
    *   shadcn/ui (UI Components)
*   **Cloud Services & APIs:**
    *   Google Cloud Platform (GCP)
        *   Gmail API
        *   Google Calendar API
        *   Google Cloud Pub/Sub
        *   Google AI (Gemini Pro/Flash)
*   **Authentication:** OAuth 2.0 (Google Identity Platform)

## Key Technical Achievements & Problem Solving

*   **End-to-End Automation:** Successfully integrated multiple disparate services to create a seamless automated workflow from email receipt to interview scheduling.
*   **Real-time Processing:** Leveraged Google Cloud Pub/Sub for an event-driven architecture, enabling near real-time responses to new applications.
*   **Practical AI Application:** Implemented Google's Gemini AI for a practical NLP task (resume screening), demonstrating prompt engineering for structured output.
*   **Secure API Integration:** Handled OAuth 2.0 for secure access to user data on Google services.
*   **Full-Stack Implementation:** Developed both the backend logic and a functional frontend dashboard.

*(Optional: Add a GIF or a couple of screenshots here if you have them)*
<!-- ![App Screenshot/GIF](link_to_your_screenshot_or_gif.gif) -->

## Project Goals & Vision

The primary goal is to significantly reduce manual effort in the early stages of recruitment, allowing hiring teams to focus their energy on engaging with the most promising candidates. This project serves as a robust demonstration of how AI and cloud services can be combined to solve real-world business inefficiencies.

Future enhancements could include more dynamic criteria management, deeper resume parsing, and integration with Applicant Tracking Systems (ATS).

## Source Code

The complete source code for this project is available on GitHub:
🔗 **[Link to your GitHub Repository]**

## License

This project is licensed under the MIT License. See the `LICENSE` file for more details.
*(Ensure you have a LICENSE file in your repo)*

---

Built by **Mayank Kumar Prasad**.
([Link to your LinkedIn Profile - Optional])
([Link to your Portfolio - Optional])

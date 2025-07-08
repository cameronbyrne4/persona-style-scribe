Product Requirements Document (PRD) - V1
1. Product Name (Placeholder)
PersonaPen
2. Objective & Goals
Objective: To create a web application that empowers humanities students to generate high-quality academic writing (essays, discussion posts) that authentically reflects their unique personal style.
Primary Goals:
Significantly reduce the time and effort students spend manually editing AI-generated text to sound like their own.
Increase student confidence in using AI tools for academic work by producing stylistically authentic and academically sound content.
Provide a simple, frictionless user experience from authentication to text generation.
3. User Persona
Name: Alex
Age: 20
Major: History / English Literature
Goals: Wants to get good grades and understands that well-written, stylistically consistent essays are key. Wants to use modern tools to be more efficient but is wary of plagiarism and sounding like a robot.
Frustrations: Spends hours tweaking generic ChatGPT output, trying to insert their own voice. Worries that professors can easily spot generic AI writing.
4. User Flows
Flow 1: First-Time Onboarding & Style Profile Creation
Landing Page: Alex sees the value proposition ("Essays in Your Voice"). Clicks "Get Started."
Authentication: Redirected to a Google Auth consent screen. Alex signs in with their student Google account.
First-Time Prompt: Alex is presented with a clean interface and prompted to upload writing samples to create their style profile.
My recommendation on word count: For a robust style analysis, Alex should be prompted to upload 3,000 to 5,000 words of their best writing (e.g., 2-3 previous essays). This is the sweet spot: large enough for our system to extract meaningful patterns but not so large that it's a major barrier to starting.
Upload: Alex uploads 2 PDFs and copy-pastes text into a box.
Confirmation: The system processes the files in the background. Alex sees a simple success indicator (e.g., a green checkmark). They are now ready to use the core features.
Flow 2: Core Task - "Style Transfer"
Navigate: Alex selects the "Rewrite" or "Style Transfer" mode.
Input: Alex pastes a block of text they've written quickly or gotten from another source into an input box.
Action: Alex clicks the "Generate" button.
Output: The system processes the request. In the output box, the same text appears, but rewritten to match Alex's unique style profile (cadence, vocabulary, sentence structure, etc.).
Flow 3: Core Task - "RAG Question Answering"
Navigate: Alex selects the "Research" or "Question Answering" mode.
Input Source: Alex uploads a source document (e.g., a PDF of a history chapter, a scholarly article).
Input Prompt: Alex types a specific question into a prompt box (e.g., "Based on the provided text, what were the three main socio-economic factors that led to the French Revolution?").
Action: Alex clicks the "Generate" button.
Output: The system generates a well-structured, academically powerful response that only uses information from the provided source text but is written in Alex's personal writing style.
5. Feature Prioritization (MoSCoW Method)
Here is our proposed feature breakdown for the MVP.
Must-Have (MVP Core):
M1: Google User Authentication.
M2: A mechanism for users to upload files (.pdf, .txt) and paste raw text.
M3: Backend "Style Profile" creation via advanced prompt engineering (analyzes uploaded text and creates a set of style instructions/examples for the LLM).
M4: "Style Transfer" feature (Text in -> Text out, rewritten in user's style).
M5: "RAG Question Answering" feature (Source doc + question in -> Answer out).
Should-Have (High-Priority, Post-MVP):
S1: Ability for users to manage their uploaded documents (view a list, delete old ones). This gives them control over their style profile.
S2: Direct integration with Google Docs for seamless sample importing.
S3: A basic history of the last 5-10 generations for easy access.
Could-Have (If Time & Resources Permit):
C1: A "copy to clipboard" button for generated text.
C2: An estimated word count for inputs and outputs.
C3: Support for more file types like .docx.
Won't-Have (For this Version):
W1: A conversational chat interface.
W2: An explicit dashboard visualizing the user's writing style.
W3: User-specific fine-tuning of LLM models.
W4: Team or collaboration features.
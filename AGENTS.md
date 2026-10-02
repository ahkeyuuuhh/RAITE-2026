# Echo Project Context

This file applies to the entire repository. It is the authoritative product-scope guide for AI agents working on this project.

## Source-of-truth rules

1. Echo is the only active product and product name.
2. The product scope in this file overrides older ClassAssist, Aider, professor, teacher, classroom, consultation, and calendar product assumptions.
3. Before editing, inspect the current `main` branch and the relevant implementation. Current code is the source of truth for what already works; this file is the source of truth for what the product should become.
4. Preserve working student features. Do not rewrite unrelated code or replace real API/data behavior with hardcoded demonstrations.
5. Keep changes hackathon-efficient: stable, polished, functional, and quick to demonstrate.
6. Legacy code may remain in the repository during migration. Its presence does not make it part of Echo's approved product scope.

## Product definition

**Echo is a student-focused AI learning companion.**

Echo turns a student's own study materials into interactive learning experiences through generated review content, guided tutoring, assessments, and voice-based study.

Echo is not a learning management system (LMS), classroom portal, teacher dashboard, or school administration platform.

### Core product story

`Study material -> AI understanding -> Review generation -> Tutor interaction -> Voice-based studying -> Better learning experience`

## Approved users and boundaries

The student is the only active user role in the product experience.

Do not build, restore, reference, or assume any of the following unless the user explicitly requests them:

- professor or teacher interfaces
- classroom creation, enrollment, rosters, or class streams
- teacher-assigned assessments or teacher approval flows
- consultation scheduling or booking
- professor availability
- assessment publication jobs
- a Calendar tab or calendar as a core product feature
- grading or school administration workflows
- ClassAssist or Aider product branding

Legacy database tables, API routes, types, tests, and screens for these concepts are migration residue. Do not connect new Echo features to them simply because they already exist. Do not delete or rename them broadly without checking dependencies and receiving a task that requires cleanup.

## Main navigation

The finalized primary navigation is:

1. **Home**
2. **Review**
3. **Agent**
4. **Profile**

Use these labels. Do not substitute Explore for Home or Calendar for Profile. Profile should be a first-class navigation destination rather than only a modal shortcut.

## Home

Home is the student's landing and learning overview.

It may show:

- recent study activity
- useful next actions or recommendations
- learning progress supported by real data
- recent uploads
- saved or recently generated study content
- quick shortcuts into Review and Agent

Home must remain student-focused. Do not turn it into a professor, classroom, course-management, or assignment dashboard.

Avoid presenting invented progress, mastery, streak, or activity values as real. If data is not persisted yet, label examples clearly or favor useful shortcuts over fake metrics.

## Review

Review is the main study-material and content-generation area.

Students should be able to:

- upload or capture study material
- reuse a previous upload or generated item
- generate a reviewer or study guide
- generate summarized notes
- generate an interactive quiz or self-assessment
- generate flashcard-style study content
- choose a question type when relevant
- choose the number of questions when relevant
- study generated content interactively
- save and revisit useful generated content when persistence is available

### Supported source formats

The intended formats are:

- PDF
- DOC and DOCX
- PPT and PPTX
- images through OCR or multimodal understanding

Plain text formats may also be supported when useful.

Do not claim that a format works merely because the file picker accepts its extension. Verify that the selected platform can pick the file and that the AI/backend can extract or understand its actual contents.

### Question formats

The intended question formats include:

- multiple choice
- identification or fill in the blank
- true or false
- essay or open response

The interface may expose only formats that are genuinely implemented and testable. Generated questions should stay grounded in the student's supplied material.

### Review experience

Review content should support active study rather than only display generated text. Depending on the content type, useful interactions include revealing answers, flipping flashcards, moving through questions, checking responses, viewing explanations, retrying, and sending a topic to Agent for further help.

## Agent

Agent is Echo's AI tutor and study assistant, not a generic chatbot.

Agent should:

- answer student questions
- explain lessons clearly
- break down difficult topics
- help the student review and practise
- guide the student with questions or progressive hints when appropriate
- use uploaded and generated study material as context when available
- support interactive study sessions
- maintain a supportive, academically careful tone
- distinguish live AI output from samples or offline fallbacks

The tutor may use Socratic guidance, but it does not need to refuse every direct answer. Choose the teaching approach that best supports learning, safety, and the student's request. Never fabricate citations or claim to have read material that was not successfully processed.

## Voice and speech

Voice is a core Echo differentiator across Review and Agent.

The intended capabilities are:

- speech to text: the student asks or answers by speaking
- text to speech: Echo reads explanations and review material aloud
- speech to speech: a spoken question receives a spoken response
- spoken tutoring or review sessions

Voice controls must communicate real capability and state: listening, processing, speaking, stopped, unsupported, or failed. Do not present simulated transcription or animation as real microphone recognition. Provide a text fallback when voice is unavailable.

Because the primary test environment is Expo Go, verify speech support on the actual mobile platform. Browser Web Speech APIs alone do not establish native Android or iOS support.

## Profile

Profile is the student account and settings area.

It may include:

- student identity and profile information
- profile photo
- account settings
- study, accessibility, and voice preferences
- saved settings
- logout

Keep all language and fields student-focused. Do not expose professor-only fields such as faculty ID, department management, or teacher availability.

## Product and interface design

Echo should feel like a modern student productivity and learning application.

Design qualities:

- modern
- clean
- minimal
- polished
- professional
- mostly monochrome
- restrained use of `#811212` as the accent color
- clear hierarchy and readable typography
- direct, calm interface copy

Avoid:

- childish visuals
- excessive gamification
- old school-portal or LMS styling
- unnecessary cards
- crowded dashboards
- decorative metrics without real meaning
- inconsistent purple, blue, rainbow, or multicolor branding that competes with the Echo accent

Favor a small number of useful actions and strong content hierarchy over dense grids of widgets.

## Technical baseline

- Repository: `RAITE-2026`
- Mobile client: React Native with Expo
- Primary mobile testing: Expo Go
- API: Node.js with Express
- Database and authentication: Supabase PostgreSQL and Supabase services
- AI: Gemini-compatible study features currently exist in the client and API
- Active branch: inspect `main` before every change

Use server-side AI routes when practical so provider keys and model logic do not ship in the mobile bundle. Do not introduce new client-side secrets. Keep uploads size-limited, validate MIME types and content, and avoid persisting sensitive student material unless the feature requires it and the storage behavior is clear.

## Current implementation audit

This audit records the repository state at commit `34da39e` on 2026-10-02. Recheck the code before relying on it because `main` may have changed.

### Working or partially working student foundations

- Authentication includes a student sign-up flow and student profile fields.
- Home exposes shortcuts for quiz generation, document summarization, Audio Bites, and Agent.
- Quiz Generator supports multiple choice, identification, and essay flows with selectable item counts.
- Document Summarizer can request structured study notes from `/api/ai/summarize`.
- Audio Bites can generate a short educational dialogue or podcast-style review.
- Agent provides contextual AI chat and can send attachments to `/api/ai/chat`.
- The API exposes `/api/ai/chat`, `/api/ai/summarize`, `/api/ai/podcast`, authentication, and basic profile endpoints.
- Some PDF, image, DOCX, PPTX, text extraction, and multimodal handling exists in the API.

These foundations must be verified on Expo Go before they are described as complete mobile features.

### Known mismatches with the finalized Echo scope

- App branding still contains `ClassAssist` and `Aider` in packages, configuration, prompts, fallback messages, and interface copy.
- Primary navigation currently shows Explore, Review, Agent, and Calendar instead of Home, Review, Agent, and Profile.
- Profile currently appears mainly as a modal and includes consultation-era content.
- Review still loads teacher-assigned assessments, classes, deadlines, and course materials.
- Calendar, classroom, consultation, teacher, publication, and roster code remains in the mobile app and API.
- Home contains hardcoded streak, mastery, focus, concepts, and recent activity values.
- Quiz Generator does not currently implement true or false questions or flashcards.
- Quiz Generator file selection is web-oriented; the native camera/upload buttons do not complete a real native selection flow.
- Document Summarizer file selection is also web-oriented and needs native Expo verification or implementation.
- Agent attachment selection is web-oriented.
- Agent speech recognition and speech synthesis rely on browser APIs. On unsupported platforms, speech-to-text currently simulates a transcript, which must not be presented as real Echo voice capability.
- Audio Bites playback uses browser speech synthesis and is not established as native Expo speech.
- Generated materials and study history are mostly local screen state or hardcoded examples; no Echo-focused persistence model was found.
- Student avatar upload is blocked by a teacher-only backend role check.
- Registration and backend types still permit teacher accounts even though Echo is student-only.
- Multiple client components call Gemini directly and reference public/client keys. Prefer the existing server API and remove exposed client-secret assumptions when editing those flows.
- The Supabase schema is named `classassist` and is dominated by legacy classroom data. The internal schema name may remain temporarily to avoid risky migration work, but new Echo behavior must not depend on professor/classroom workflows.

### Interpretation of the audit

The items above are implementation facts, not product permissions. Preserve genuinely useful student functionality, rename and reconnect it to Echo, and retire legacy dependencies incrementally when the requested work touches them.

## Recommended implementation order

When a task is broad and the user has not specified a different order, prioritize:

1. Make the visible product consistently Echo and student-only.
2. Correct primary navigation to Home, Review, Agent, and Profile.
3. Rebuild Review around student uploads and generated study content, removing classroom dependencies from the active path.
4. Preserve and stabilize quiz, summary, and Audio Bites generation behind server APIs.
5. Connect Review outputs and uploads to Agent context.
6. Implement honest native Expo file selection and image capture.
7. Implement and verify native speech-to-text and text-to-speech, with clear fallback states.
8. Add lightweight persistence for recent uploads, generated materials, and preferences only if time allows.
9. Remove or isolate dead professor/classroom UI after active student flows are stable.

## Definition of done for Echo-facing changes

An Echo feature is ready when:

- it works from the student interface on the intended Expo Go target
- visible copy uses Echo and contains no accidental ClassAssist or Aider references
- it does not require a professor, classroom, consultation, or calendar workflow
- loading, empty, error, offline, and unsupported states are honest
- AI output is grounded in the provided material when material is supplied
- samples and fallbacks are clearly labeled
- secrets remain server-side
- the interface follows the clean, minimal Echo design direction
- existing unrelated student flows still work

## Instructions for future AI agents

Before changing code:

1. Run `git status` and inspect the current branch.
2. Read this file fully.
3. Inspect the exact screens, routes, and data paths affected by the task.
4. Search for legacy names and workflows in the affected files.
5. Make the smallest coherent change that advances the finalized Echo scope.
6. Verify with type checks, targeted tests, and an Expo/mobile walkthrough when possible.

If current code conflicts with this scope, do not silently preserve the old product behavior. Explain the conflict and move the active student experience toward Echo without broad, risky rewrites.

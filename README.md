WIP / Functional prototype only


# Rehearse

Rehearse is a voice AI that helps people prepare for difficult conversations before they happen.

Describe a conversation, practice it with an AI simulation, review what happened, and try again.

The idea came from a simple observation: Many of the outcomes that shape our lives come down to our ability to have difficult conversations. The conversation where you set a boundary with someone you love. The conversation where you tell your team the company is in trouble. 

This is arguably the most important skill in the world, yet most people have no way to practice them with gentle and honest feedback. So we fumble reputations, relationships, and opportunities, and struggle to understand why. 

Whether you're asking your manager for a promotion, setting a boundary with a loved one, or delivering difficult news to a teammate, the stakes often feel high because you only get one real attempt.

Rehearse gives people a chance to practice and get objective feedback so they can do better.

## What It Does

Users start by describing a conversation they need to have.

Rehearse asks a few questions to understand the situation, then generates a voice simulation of the other person. During the conversation, a live transcript is captured so users can review exactly what was said.

Once the conversation reaches a natural conclusion, Rehearse generates a feedback report that evaluates:

- Clarity
- Confidence
- Empathy
- Assertiveness
- Listening
- Emotional regulation

The report references specific moments from the conversation and highlights both strengths and opportunities for improvement.

Users can then run the conversation again and immediately apply the feedback.

## Current Features

- Real-time voice conversations powered by ElevenLabs
- AI-generated conversation partners
- Live conversation transcripts
- Debrief by emotionally intelligent voice AI covering strengths, opportunity areas, suggestions
- Communication feedback reports
- Session history with saved conversations
- Conversation titles generated from session context
- One-click "Run it again" practice loops
- Support for both professional and personal scenarios

## Example Scenarios

### Professional

- Asking for a raise or promotion
- Delivering difficult news to a cofounder
- Giving constructive feedback
- Handling conflict with a teammate
- Navigating a performance conversation or interview

### Personal

- Setting boundaries
- Addressing relationship concerns
- Having difficult family conversations
- Expressing needs more clearly
- Preparing for a breakup conversation

## Why Voice

Most communication advice focuses on what to say. In practice, how something is said often matters just as much.The same message can sound confident, hesitant, defensive, empathetic, dismissive, or reassuring depending on delivery.

Voice creates an opportunity to practice both content and communication style. Rehearse is designed to help users understand not only whether they made the right argument, but also how they may have come across to the other person.

One thing that surprised me while testing Rehearse was that I started getting defensive during a simulated argument, even though I knew I was talking to an AI and we were roleplaying a fake relationship. I could hear myself justifying and retreating into familiar patterns. The debrief called it out afterward. People can mask harmful relational patterns behind scripts, therapy sessions, and professional training, but these roleplay sessions can surface real habits.  


## Why This Is Interesting

Rehearse explores what becomes possible when advances in emotionally intelligent voice AI turn conversation itself into a medium for learning. Instead of helping users write a difficult message, it helps them prepare for the actual conversation.

The long-term vision is a system that helps people build communication skills through repeated practice, much like language-learning apps help people build fluency through repetition. As voice AI becomes more natural, emotionally aware, and conversationally capable, it can evolve from an assistant that gives advice into a practice environment where people develop confidence, empathy, leadership, and difficult interpersonal skills before the moments that matter most.

## Tech

Rehearse was built using:

* ElevenLabs Conversational AI for real-time voice conversations
* React and TypeScript for the web application
* Vite for frontend tooling
* Valence for emotional detection
* Local session persistence for conversation history and reports
* LLM-powered conversation simulation and feedback generation

## Built For

Rebuild X ElevenLabs Hackathon 2026

<img width="783" height="401" alt="Screenshot 2026-06-06 at 7 55 52 PM" src="https://github.com/user-attachments/assets/674b5fc2-4807-4ccb-82b8-e0129935f6c8" />


WIP / Functional prototype only


# Rehearse

Rehearse is a voice AI that helps people prepare for difficult conversations before they happen.

Describe a conversation you're avoiding, practice it with an AI simulation, review what happened, and try again.

The idea came from a simple observation: most difficult conversations are rehearsed in our heads, but very few are ever practiced out loud.

Whether you're telling a cofounder that runway is running out, asking your manager for a promotion, setting a boundary with a loved one, or delivering difficult feedback to a teammate, the stakes often feel high because you only get one real attempt.

Rehearse gives people a chance to practice first.

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
- Communication feedback reports
- Session history with saved conversations
- Conversation titles generated from session context
- One-click "Run it again" practice loops
- Support for both professional and personal scenarios

## Example Scenarios

### Professional

- Delivering difficult news to a cofounder
- Asking for a raise or promotion
- Giving constructive feedback
- Handling conflict with a teammate
- Navigating a performance conversation

### Personal

- Setting boundaries
- Addressing relationship concerns
- Having difficult family conversations
- Expressing needs more clearly
- Preparing for a breakup conversation

## Why Voice

Most communication advice focuses on what to say. In practice, how something is said often matters just as much.The same message can sound confident, hesitant, defensive, empathetic, dismissive, or reassuring depending on delivery.

Voice creates an opportunity to practice both content and communication style. Rehearse is designed to help users understand not only whether they made the right argument, but also how they may have come across to the other person.

## Why This Is Interesting

AI has become remarkably good at generating text, but many of the situations people care most about are spoken conversations. Rehearse explores what happens when voice AI is used as a practice environment rather than an assistant. Instead of helping users write a difficult message, it helps them prepare for the actual conversation itself.

The long-term vision is a system that helps people build communication skills through repeated practice, much like language-learning apps help people build fluency through repetition.

## Tech

Rehearse was built using:

* ElevenLabs Conversational AI for real-time voice conversations
* React and TypeScript for the web application
* Vite for frontend tooling
* Local session persistence for conversation history and reports
* LLM-powered conversation simulation and feedback generation

## Built For

Rebuild X ElevenLabs Hackathon 2026

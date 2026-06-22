# Rehearse

**A voice AI for practicing hard conversations before you have them.**

Solo project: design, product, and build. Won **Most Useful** at the Rebuild × ElevenLabs hackathon.

Design WIP. Polished mobile web/app coming soon.

<img width="805" height="244" alt="Screenshot 2026-06-22 at 9 49 50 AM" src="https://github.com/user-attachments/assets/19a1ca35-3b2f-43cb-a924-5a4d741615e8" />


---

High-stakes interpersonal skills, like conflict, boundaries, hard feedback, asking for what you want, have no flight simulator. You learn them by failing live, on the people who matter, and you may not get another chance. Rehearse is the flight simulator. Difficult conversations are the first domain; the underlying idea is creating reps where reps didn't exist.

Most communication advice tells you *what* to say. But the same words land completely differently depending on *how* you say them, because the same line can reveal confidence, hesitance, empathy, or dismissiveness. The hard part of a difficult conversation isn't usually the argument. It's the delivery, under pressure, in real time.

Rehearse lets you rehearse that. Describe a conversation you're dreading, practice it out loud against an AI playing the other person, get honest feedback on how you came across, and run it again.

While testing it, I started getting defensive in a simulated argument even though I knew it was an AI and the relationship was fake. I could hear myself justifying, retreating into old habits. The debrief named it afterward. That's the whole thesis of the project in one moment: people mask their real relational patterns behind scripts and prepared answers, but a live voice roleplay surfaces the habits underneath. Text can't do that.

## How it works

You describe the conversation. Rehearse asks a few questions to ground the scenario, then generates a voice partner and runs the conversation live, capturing a transcript as you go. When it reaches a natural end, you get a debrief — delivered by voice, then as a written report — covering clarity, confidence, empathy, assertiveness, listening, and emotional regulation, citing specific moments rather than generalities. Then you run it again and apply what you just heard.

## A few design decisions

**Practice loop over single verdict.** The product is built around "run it again," not a one-shot grade. The insight isn't knowing you came across badly; it's getting to immediately try the better version while it's fresh. The loop is the product.

**Feedback after, not coaching during.** I deliberately kept the AI from interrupting to coach mid-conversation. Real conversations don't pause to correct you, and the value is in staying in the pressure, then reviewing.

**Voice debrief before the written report.** Hearing the feedback spoken, in the same modality you just failed or succeeded in, lands differently than reading a scorecard. The written report is the reference; the voice debrief makes the feedback more real.

## What it's good for

A raise conversation you keep rehearsing in your head. Delivering bad news to a cofounder. Setting a boundary with someone you love. Anything where you get one real attempt and the stakes are high enough that you'd want a few practice ones first. 

## Built with

ElevenLabs Conversational AI for the real-time voice layer, with React/TypeScript on the front end. The voice quality is ElevenLabs'. My work is the experience around it: the scenario setup, the practice loop, the debrief structure, and how feedback gets surfaced.

* ElevenLabs Conversational AI for real-time voice conversations
* React and TypeScript for the web application
* Vite for frontend tooling
* Valence for emotional detection
* Local session persistence for conversation history and reports
* LLM-powered conversation simulation and feedback generation

## Built For

Rebuild X ElevenLabs Hackathon 2026

Prototype at hackathon:

<img width="783" height="401" alt="Screenshot 2026-06-06 at 7 55 52 PM" src="https://github.com/user-attachments/assets/674b5fc2-4807-4ccb-82b8-e0129935f6c8" />





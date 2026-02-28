interface Env {
  GEMINI_API_KEY: string;
}

type GenerateMode = 'drama' | 'kpop' | 'arc';

interface DramaInput {
  genre: string;
  mood: string;
  characters: string;
  conflict: string;
}

interface KpopInput {
  concept: string;
  emotion: string;
  season: string;
  members: string;
}

interface ArcInput {
  scene: string;
  title: string;
}

interface GenerateRequest {
  mode: GenerateMode;
  inputs: DramaInput | KpopInput | ArcInput;
}

function buildPrompt(mode: GenerateMode, inputs: DramaInput | KpopInput | ArcInput): string {
  if (mode === 'drama') {
    const d = inputs as DramaInput;
    return `You are an elite K-drama screenwriter with credits on top Netflix Korea originals.

Create a vivid, emotionally charged K-drama scene with the following parameters:
- Genre: ${d.genre}
- Mood/Atmosphere: ${d.mood}
- Number of characters: ${d.characters}
- Conflict type: ${d.conflict}

Write the scene in this exact format:

## 씬 설정 (Scene Setup)
[Location, time of day, atmosphere — 2-3 sentences in cinematic style]

## 등장인물 (Characters)
[Brief character introduction for each person in the scene]

## 씬 스크립트 (Scene Script)
[Full dialogue with stage directions. Include Korean names. Write at least 10-15 dialogue exchanges. Include emotional beats, pauses, and physical actions.]

## 연출 노트 (Director's Notes)
[Camera angles, music cues, visual metaphors — 3-5 specific cinematic suggestions]

## 다음 씬 예고 (Next Scene Teaser)
[One-line cliffhanger setup for what happens next]

Write with emotional depth. Make it feel like a real K-drama production script. Include Korean phrases naturally where appropriate (with English in parentheses).`;
  }

  if (mode === 'kpop') {
    const k = inputs as KpopInput;
    return `You are a top K-pop A&R director and creative consultant who has worked with SM, HYBE, and YG.

Create a comprehensive K-pop concept sheet with these parameters:
- Group concept/vibe: ${k.concept}
- Target emotion: ${k.emotion}
- Season/Era: ${k.season}
- Number of members: ${k.members}

Structure the concept sheet exactly as follows:

## 그룹 페르소나 (Group Persona)
[Group identity, philosophy, and what makes them unique — 3-4 sentences]

## 멤버 포지션 (Member Positions)
[For each member: position (vocal/rap/dance/visual), personality archetype, unique characteristic]

## 앨범 컨셉 (Album Concept)
**컨셉 키워드:** [5-7 keywords that define the visual and sonic world]
**컬러 팔레트:** [4-5 specific colors with hex codes and what emotion they represent]
**무드보드 방향:** [Visual references, aesthetics, fashion direction]

## 타이틀곡 테마 (Title Track Theme)
**곡 제목 후보:** [3 title suggestions in Korean with English translation]
**가사 테마:** [Core message and emotional arc of the song]
**사운드 방향:** [Genre blend, BPM range, key production elements]
**훅 컨셉:** [The hook concept — what will make fans replay it]

## 포인트 안무 (Point Choreography Concept)
[The signature dance move concept — visual description of what fans will imitate]

## 마케팅 앵글 (Marketing Angle)
[2-3 unique selling points for international market + fandom positioning]

Be specific, creative, and industry-authentic.`;
  }

  // arc mode
  const a = inputs as ArcInput;
  return `You are a head writer for a top K-drama production company, responsible for full-season story architecture.

Based on this K-drama scene/premise, construct a complete 16-episode story arc:

Title: ${a.title || 'Untitled K-Drama'}
Seed Scene/Premise: ${a.scene}

Create the full story arc in this structure:

## 시리즈 개요 (Series Overview)
**장르:** [Genre tags]
**핵심 주제:** [Central theme in one sentence]
**감정 여정:** [The emotional journey the audience goes through]

## 주요 캐릭터 아크 (Character Arcs)
[For each main character: starting point → transformation → ending point]

## 에피소드 구조 (Episode Structure)

**1-4화 (Act 1: 설정)**
- Ep 1: [Title + key plot point]
- Ep 2: [Title + key plot point]
- Ep 3: [Title + key plot point]
- Ep 4: [Title + key plot point + first major cliffhanger]

**5-8화 (Act 2A: 상승)**
- Ep 5-8: [Story escalation beats, romantic/conflict development]
- Midpoint twist: [What changes everything at episode 8]

**9-12화 (Act 2B: 위기)**
- Ep 9-12: [Dark phase, all-is-lost moments, revelations]
- Major revelation: [The big secret exposed]

**13-16화 (Act 3: 해결)**
- Ep 13-15: [Race to resolution]
- Ep 16 finale: [How it ends — emotional payoff]

## 핵심 명장면 (Signature Scenes)
[5 scenes that will become iconic — the moments fans will remember forever]

## OST 방향 (OST Direction)
[3 emotional themes with when they play and what they represent]

Make it commercially viable for Netflix/TVING with international appeal.`;
}

export async function onRequestPost({
  request,
  env,
}: {
  request: Request;
  env: Env;
}): Promise<Response> {
  // CORS preflight
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });
  }

  try {
    const { mode, inputs } = (await request.json()) as GenerateRequest;

    if (!mode || !inputs) {
      return new Response(JSON.stringify({ error: 'Missing mode or inputs' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const prompt = buildPrompt(mode, inputs);
    const apiKey = env.GEMINI_API_KEY;

    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'API key not configured' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Call Gemini 2.0 Flash with SSE streaming
    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:streamGenerateContent?alt=sse&key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              parts: [{ text: prompt }],
            },
          ],
          generationConfig: {
            temperature: 1.0,
            maxOutputTokens: 2048,
          },
        }),
      }
    );

    if (!geminiResponse.ok) {
      const errText = await geminiResponse.text();
      return new Response(JSON.stringify({ error: errText }), {
        status: geminiResponse.status,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Stream the SSE response directly to the client
    return new Response(geminiResponse.body, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Access-Control-Allow-Origin': '*',
        'X-Accel-Buffering': 'no',
      },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

export async function onRequestOptions(): Promise<Response> {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}

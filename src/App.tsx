import { useState, useRef, useCallback } from 'react'
import { Sparkles, Film, Music, BookOpen, Copy, RotateCcw, ChevronRight, Loader2 } from 'lucide-react'

// ─── Types ───────────────────────────────────────────────────────────────────

type Tab = 'drama' | 'kpop' | 'arc'

interface DramaInputs {
  genre: string
  mood: string
  characters: string
  conflict: string
}

interface KpopInputs {
  concept: string
  emotion: string
  season: string
  members: string
}

interface ArcInputs {
  scene: string
  title: string
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function parseSSEChunk(chunk: string): string {
  const lines = chunk.split('\n')
  let text = ''
  for (const line of lines) {
    if (!line.startsWith('data: ')) continue
    const data = line.slice(6).trim()
    if (data === '[DONE]' || !data) continue
    try {
      const json = JSON.parse(data)
      const part = json?.candidates?.[0]?.content?.parts?.[0]?.text
      if (part) text += part
    } catch {
      // skip malformed chunks
    }
  }
  return text
}

function formatOutput(raw: string): string {
  // Convert markdown-like ## headers and **bold** to HTML
  return raw
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\n{2,}/g, '</p><p>')
    .replace(/^(?!<[hp])/gm, '')
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function TabButton({
  id,
  active,
  icon: Icon,
  label,
  sublabel,
  onClick,
}: {
  id: Tab
  active: boolean
  icon: React.ElementType
  label: string
  sublabel: string
  onClick: (id: Tab) => void
}) {
  return (
    <button
      onClick={() => onClick(id)}
      className={`flex items-center gap-3 px-5 py-3 rounded-xl border transition-all duration-200 text-left ${
        active
          ? 'tab-active border-purple-600'
          : 'border-[#1e1e2e] hover:border-[#3b3b5c] text-gray-400 hover:text-gray-200'
      }`}
    >
      <Icon size={18} className={active ? 'text-purple-400' : 'text-gray-500'} />
      <div>
        <div className={`text-sm font-semibold ${active ? 'text-purple-300' : ''}`}>{label}</div>
        <div className="text-xs text-gray-500">{sublabel}</div>
      </div>
    </button>
  )
}

function SelectInput({
  label,
  value,
  onChange,
  options,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  options: { value: string; label: string }[]
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-gray-400 uppercase tracking-wider">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="input-dark appearance-none cursor-pointer"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value} className="bg-[#0d0d16]">
            {o.label}
          </option>
        ))}
      </select>
    </div>
  )
}

function TextInput({
  label,
  value,
  onChange,
  placeholder,
  multiline,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  multiline?: boolean
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-gray-400 uppercase tracking-wider">{label}</label>
      {multiline ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          rows={4}
          className="input-dark resize-none"
        />
      ) : (
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="input-dark"
        />
      )}
    </div>
  )
}

// ─── Drama Form ───────────────────────────────────────────────────────────────

function DramaForm({
  inputs,
  onChange,
}: {
  inputs: DramaInputs
  onChange: (inputs: DramaInputs) => void
}) {
  const set = (key: keyof DramaInputs) => (v: string) => onChange({ ...inputs, [key]: v })
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <SelectInput
        label="장르"
        value={inputs.genre}
        onChange={set('genre')}
        options={[
          { value: '로맨스', label: '💕 로맨스' },
          { value: '멜로드라마', label: '💔 멜로드라마' },
          { value: '스릴러', label: '🔪 스릴러' },
          { value: '판타지', label: '✨ 판타지' },
          { value: '시대극', label: '👘 사극' },
          { value: '범죄', label: '🚔 범죄' },
          { value: 'SF', label: '🚀 SF' },
          { value: '청춘 로맨스', label: '🌸 청춘 로맨스' },
        ]}
      />
      <SelectInput
        label="분위기 · 무드"
        value={inputs.mood}
        onChange={set('mood')}
        options={[
          { value: '긴장되고 강렬한', label: '⚡ 긴장·강렬' },
          { value: '달콤하고 설레는', label: '🍭 달콤·설렘' },
          { value: '어둡고 비극적인', label: '🌑 어둠·비극' },
          { value: '유머러스하고 발랄한', label: '😄 유쾌·발랄' },
          { value: '서정적이고 감성적인', label: '🌙 서정·감성' },
          { value: '긴박하고 절박한', label: '💥 긴박·절박' },
        ]}
      />
      <SelectInput
        label="등장인물 수"
        value={inputs.characters}
        onChange={set('characters')}
        options={[
          { value: '2명 (주인공 2인)', label: '2명 — 주인공 2인' },
          { value: '3명 (삼각관계)', label: '3명 — 삼각관계' },
          { value: '4명 (앙상블)', label: '4명 — 앙상블' },
          { value: '5명 이상', label: '5명+ — 그룹 씬' },
        ]}
      />
      <SelectInput
        label="갈등 유형"
        value={inputs.conflict}
        onChange={set('conflict')}
        options={[
          { value: '재회와 과거의 상처', label: '💔 재회·과거의 상처' },
          { value: '신분 차이와 사회적 장벽', label: '👑 신분 차이' },
          { value: '비밀 폭로와 배신', label: '🗡️ 비밀 폭로·배신' },
          { value: '선택과 희생', label: '⚖️ 선택·희생' },
          { value: '복수와 용서', label: '🔥 복수·용서' },
          { value: '금지된 사랑', label: '🚫 금지된 사랑' },
        ]}
      />
    </div>
  )
}

// ─── K-Pop Form ───────────────────────────────────────────────────────────────

function KpopForm({
  inputs,
  onChange,
}: {
  inputs: KpopInputs
  onChange: (inputs: KpopInputs) => void
}) {
  const set = (key: keyof KpopInputs) => (v: string) => onChange({ ...inputs, [key]: v })
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <SelectInput
        label="그룹 컨셉"
        value={inputs.concept}
        onChange={set('concept')}
        options={[
          { value: '다크 & 파워풀', label: '🖤 다크 & 파워풀' },
          { value: '청량 & 청순', label: '🌊 청량 & 청순' },
          { value: '걸크러시', label: '💪 걸크러시' },
          { value: '보이그룹 카리스마', label: '⚡ 보이그룹 카리스마' },
          { value: '로맨틱 & 감성', label: '🌹 로맨틱 & 감성' },
          { value: '레트로 & 복고', label: '🌈 레트로 & 복고' },
          { value: '몽환 & 판타지', label: '🌙 몽환 & 판타지' },
        ]}
      />
      <SelectInput
        label="타겟 감정"
        value={inputs.emotion}
        onChange={set('emotion')}
        options={[
          { value: '설렘과 두근거림', label: '💓 설렘·두근거림' },
          { value: '자신감과 당당함', label: '👑 자신감·당당함' },
          { value: '슬픔과 그리움', label: '🌧️ 슬픔·그리움' },
          { value: '열정과 에너지', label: '🔥 열정·에너지' },
          { value: '여유와 자유로움', label: '🌅 여유·자유' },
          { value: '미스터리와 긴장감', label: '🌑 미스터리·긴장' },
        ]}
      />
      <SelectInput
        label="시즌 · 에라"
        value={inputs.season}
        onChange={set('season')}
        options={[
          { value: '봄 (새 출발)', label: '🌸 봄 — 새 출발' },
          { value: '여름 (청춘·열정)', label: '☀️ 여름 — 청춘·열정' },
          { value: '가을 (감성·그리움)', label: '🍂 가을 — 감성·그리움' },
          { value: '겨울 (고독·순수)', label: '❄️ 겨울 — 고독·순수' },
        ]}
      />
      <SelectInput
        label="멤버 수"
        value={inputs.members}
        onChange={set('members')}
        options={[
          { value: '4명', label: '4명' },
          { value: '5명', label: '5명' },
          { value: '6명', label: '6명' },
          { value: '7명', label: '7명' },
          { value: '9명', label: '9명' },
        ]}
      />
    </div>
  )
}

// ─── Story Arc Form ───────────────────────────────────────────────────────────

function ArcForm({
  inputs,
  onChange,
}: {
  inputs: ArcInputs
  onChange: (inputs: ArcInputs) => void
}) {
  const set = (key: keyof ArcInputs) => (v: string) => onChange({ ...inputs, [key]: v })
  return (
    <div className="space-y-4">
      <TextInput
        label="드라마 제목"
        value={inputs.title}
        onChange={set('title')}
        placeholder="예: 별이 빛나는 밤에"
      />
      <TextInput
        label="씬 or 프리미스 (시드 내용)"
        value={inputs.scene}
        onChange={set('scene')}
        placeholder="예: 10년 만에 재회한 첫사랑이 자신의 회사 신입사원으로 입사한다. 그는 기억을 잃었고, 그녀는 그 사실을 모른다..."
        multiline
      />
    </div>
  )
}

// ─── Output Panel ─────────────────────────────────────────────────────────────

function OutputPanel({
  output,
  isStreaming,
  onCopy,
  onReset,
}: {
  output: string
  isStreaming: boolean
  onCopy: () => void
  onReset: () => void
}) {
  if (!output && !isStreaming) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center py-16">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-600/20 to-pink-500/20 flex items-center justify-center mb-4 border border-purple-600/20">
          <Sparkles className="text-purple-400" size={28} />
        </div>
        <p className="text-gray-500 text-sm max-w-xs">
          왼쪽에서 옵션을 선택하고<br /><strong className="text-gray-400">Generate</strong>를 눌러 AI 창작을 시작하세요
        </p>
      </div>
    )
  }

  const html = formatOutput(output)

  return (
    <div className="relative h-full flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          {isStreaming ? (
            <>
              <Loader2 size={14} className="text-pink-400 animate-spin" />
              <span className="text-xs text-pink-400 font-medium">AI 생성 중...</span>
            </>
          ) : (
            <>
              <div className="w-2 h-2 rounded-full bg-green-400" />
              <span className="text-xs text-green-400 font-medium">생성 완료</span>
            </>
          )}
        </div>
        {!isStreaming && output && (
          <div className="flex gap-2">
            <button
              onClick={onCopy}
              className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-purple-400 transition-colors px-3 py-1.5 rounded-lg border border-[#1e1e2e] hover:border-purple-600/50"
            >
              <Copy size={12} /> 복사
            </button>
            <button
              onClick={onReset}
              className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-pink-400 transition-colors px-3 py-1.5 rounded-lg border border-[#1e1e2e] hover:border-pink-600/50"
            >
              <RotateCcw size={12} /> 초기화
            </button>
          </div>
        )}
      </div>

      <div
        className={`output-content flex-1 overflow-y-auto text-sm leading-relaxed space-y-1 ${isStreaming ? 'streaming-cursor' : ''}`}
        dangerouslySetInnerHTML={{ __html: `<p>${html}</p>` }}
      />
    </div>
  )
}

// ─── Main App ─────────────────────────────────────────────────────────────────

const DEFAULT_DRAMA: DramaInputs = { genre: '로맨스', mood: '달콤하고 설레는', characters: '2명 (주인공 2인)', conflict: '재회와 과거의 상처' }
const DEFAULT_KPOP: KpopInputs = { concept: '다크 & 파워풀', emotion: '열정과 에너지', season: '여름 (청춘·열정)', members: '5명' }
const DEFAULT_ARC: ArcInputs = { scene: '', title: '' }

const TAB_CONFIG = [
  { id: 'drama' as Tab, icon: Film, label: 'K-드라마 씬', sublabel: '대사 + 연출 노트 실시간 생성' },
  { id: 'kpop' as Tab, icon: Music, label: 'K-팝 컨셉 시트', sublabel: '페르소나 + 앨범 컨셉 + OST 방향' },
  { id: 'arc' as Tab, icon: BookOpen, label: '스토리 아크', sublabel: '16화 전체 구조 자동 생성' },
]

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>('drama')
  const [dramaInputs, setDramaInputs] = useState<DramaInputs>(DEFAULT_DRAMA)
  const [kpopInputs, setKpopInputs] = useState<KpopInputs>(DEFAULT_KPOP)
  const [arcInputs, setArcInputs] = useState<ArcInputs>(DEFAULT_ARC)
  const [output, setOutput] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const [copied, setCopied] = useState(false)
  const abortRef = useRef<AbortController | null>(null)

  const currentInputs = activeTab === 'drama' ? dramaInputs : activeTab === 'kpop' ? kpopInputs : arcInputs

  const handleTabChange = (tab: Tab) => {
    if (isStreaming) {
      abortRef.current?.abort()
      setIsStreaming(false)
    }
    setActiveTab(tab)
    setOutput('')
  }

  const handleGenerate = useCallback(async () => {
    if (isStreaming) {
      abortRef.current?.abort()
      setIsStreaming(false)
      return
    }

    setOutput('')
    setIsStreaming(true)
    abortRef.current = new AbortController()

    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: activeTab, inputs: currentInputs }),
        signal: abortRef.current.signal,
      })

      if (!res.ok || !res.body) {
        const err = await res.text()
        setOutput(`오류가 발생했습니다: ${err}`)
        setIsStreaming(false)
        return
      }

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        // Process complete lines
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''
        const chunk = lines.join('\n')
        const text = parseSSEChunk(chunk)
        if (text) setOutput((prev) => prev + text)
      }

      // Process remaining buffer
      if (buffer) {
        const text = parseSSEChunk(buffer)
        if (text) setOutput((prev) => prev + text)
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.name !== 'AbortError') {
        setOutput(`연결 오류: ${err.message}`)
      }
    } finally {
      setIsStreaming(false)
    }
  }, [activeTab, currentInputs, isStreaming])

  const handleCopy = () => {
    navigator.clipboard.writeText(output)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleReset = () => {
    setOutput('')
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="border-b border-[#1e1e2e] px-6 py-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-purple-600 to-pink-500 flex items-center justify-center glow-purple">
            <Sparkles size={18} className="text-white" />
          </div>
          <div>
            <h1 className="font-bold text-lg gradient-text leading-none">K-WAVE AI STAGE</h1>
            <p className="text-xs text-gray-500 mt-0.5">Powered by Gemini 2.0 Flash</p>
          </div>
        </div>
        <div className="hidden sm:flex items-center gap-2 text-xs text-gray-500">
          <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          <span>Gemini API 연결됨</span>
        </div>
      </header>

      {/* Main Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel — Controls */}
        <div className="w-full sm:w-[420px] lg:w-[480px] border-r border-[#1e1e2e] flex flex-col shrink-0 overflow-y-auto">
          <div className="p-5 space-y-6">
            {/* Tab Navigation */}
            <div className="space-y-2">
              <p className="text-xs text-gray-500 uppercase tracking-wider font-medium px-1">모드 선택</p>
              <div className="space-y-2">
                {TAB_CONFIG.map((tab) => (
                  <TabButton
                    key={tab.id}
                    {...tab}
                    active={activeTab === tab.id}
                    onClick={handleTabChange}
                  />
                ))}
              </div>
            </div>

            {/* Divider */}
            <div className="border-t border-[#1e1e2e]" />

            {/* Form */}
            <div className="space-y-3">
              <p className="text-xs text-gray-500 uppercase tracking-wider font-medium px-1">창작 설정</p>
              {activeTab === 'drama' && (
                <DramaForm inputs={dramaInputs} onChange={setDramaInputs} />
              )}
              {activeTab === 'kpop' && (
                <KpopForm inputs={kpopInputs} onChange={setKpopInputs} />
              )}
              {activeTab === 'arc' && (
                <ArcForm inputs={arcInputs} onChange={setArcInputs} />
              )}
            </div>

            {/* Generate Button */}
            <button
              onClick={handleGenerate}
              className={`btn-primary w-full flex items-center justify-center gap-2 ${isStreaming ? 'bg-gradient-to-r from-red-600 to-red-500' : ''}`}
            >
              {isStreaming ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  생성 중지
                </>
              ) : (
                <>
                  <Sparkles size={16} />
                  AI로 생성하기
                  <ChevronRight size={14} />
                </>
              )}
            </button>

            {/* Footer hint */}
            <p className="text-xs text-gray-600 text-center pb-2">
              {activeTab === 'drama' && 'K-드라마 씬 · 대사 · 연출 노트를 실시간으로 생성합니다'}
              {activeTab === 'kpop' && 'K-팝 그룹 컨셉 · 멤버 포지션 · 타이틀곡 방향을 생성합니다'}
              {activeTab === 'arc' && '16화 전체 스토리 구조 · 캐릭터 아크 · 명장면을 생성합니다'}
            </p>
          </div>
        </div>

        {/* Right Panel — Output */}
        <div className="hidden sm:flex flex-1 flex-col overflow-hidden">
          <div className="p-6 flex-1 overflow-hidden">
            <div className="card-dark h-full p-6 overflow-hidden flex flex-col">
              <OutputPanel
                output={output}
                isStreaming={isStreaming}
                onCopy={handleCopy}
                onReset={handleReset}
              />
            </div>
          </div>
          {copied && (
            <div className="fixed bottom-6 right-6 bg-purple-600 text-white text-sm px-4 py-2 rounded-xl shadow-lg animate-fade-in">
              ✅ 클립보드에 복사됨
            </div>
          )}
        </div>

        {/* Mobile Output (below controls) */}
        {output && (
          <div className="sm:hidden fixed inset-0 bg-[#0a0a0f] z-50 flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-[#1e1e2e]">
              <span className="font-semibold text-sm gradient-text">AI 생성 결과</span>
              <button
                onClick={handleReset}
                className="text-xs text-gray-400 hover:text-white transition-colors"
              >
                닫기
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              <div className="card-dark p-4 h-full">
                <OutputPanel
                  output={output}
                  isStreaming={isStreaming}
                  onCopy={handleCopy}
                  onReset={handleReset}
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Bottom bar — branding */}
      <footer className="border-t border-[#1e1e2e] px-6 py-2.5 flex items-center justify-between shrink-0">
        <span className="text-xs text-gray-600">
          K-WAVE AI STAGE · Gemini 3 Seoul Hackathon 2026
        </span>
        <span className="text-xs text-gray-600">
          Built by <span className="text-purple-500">CroinDA</span>
        </span>
      </footer>
    </div>
  )
}

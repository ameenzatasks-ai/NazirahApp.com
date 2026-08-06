import { useState } from 'react';
import { ArrowLeft, Play, Pause } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { juzForPage } from '../../../shared/juz-map';

export default function ListenPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialPage = searchParams.get('page');

  const [pageInput, setPageInput] = useState(initialPage || '');
  const [playing, setPlaying] = useState(false);
  const [audio, setAudio] = useState<HTMLAudioElement | null>(null);

  const pageNum = parseInt(pageInput, 10);
  const pageValid = Number.isInteger(pageNum) && pageNum >= 1 && pageNum <= 604;
  const juz = pageValid ? juzForPage(pageNum) : undefined;
  const audioUrl = pageValid ? `/audio/${String(pageNum).padStart(3, '0')}.mp3` : null;

  function handlePlay() {
    if (!audioUrl) return;

    if (audio && !playing) {
      audio.play();
      setPlaying(true);
    } else if (!audio) {
      const newAudio = new Audio(audioUrl);
      newAudio.onplay = () => setPlaying(true);
      newAudio.onpause = () => setPlaying(false);
      newAudio.onended = () => setPlaying(false);
      newAudio.play();
      setAudio(newAudio);
      setPlaying(true);
    }
  }

  function handlePause() {
    if (audio) {
      audio.pause();
      setPlaying(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: 'var(--c-bg)' }}>
      {/* Header */}
      <div
        className="flex items-center gap-3 px-4 pt-safe pb-3 border-b flex-shrink-0"
        style={{ backgroundColor: 'var(--c-bg-nav)', borderColor: 'var(--c-border)' }}
      >
        <button
          onClick={() => navigate(-1)}
          className="p-1.5 -ml-1.5 rounded-lg transition-all active:scale-90"
          style={{ color: 'var(--c-text-muted)' }}
          aria-label="Back"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>

        <div className="flex-1 min-w-0">
          <h1 className="font-semibold text-base" style={{ color: 'var(--c-text)' }}>
            Listen to the Quran
          </h1>
          <p className="text-[10px] uppercase tracking-[0.2em]" style={{ color: 'var(--c-text-muted)' }}>
            Recitation by Ayman Suwayd
          </p>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 py-8">
        <div className="w-full max-w-md">
          {/* Page search */}
          <label
            htmlFor="page-search"
            className="block text-xs font-semibold uppercase tracking-wider mb-2"
            style={{ color: 'var(--c-text-muted)' }}
          >
            Which page do you want to listen to?
          </label>
          <input
            id="page-search"
            type="number"
            inputMode="numeric"
            min={1}
            max={604}
            value={pageInput}
            onChange={e => {
              setPageInput(e.target.value);
              setPlaying(false);
              setAudio(null);
            }}
            placeholder="1 – 604"
            className="w-full px-4 py-3 rounded-xl text-sm outline-none mb-2"
            style={{
              backgroundColor: 'var(--c-bg-card)',
              border: '1.5px solid var(--c-border-soft)',
              color: 'var(--c-text)',
            }}
          />
          <p className="text-[11px] mb-8" style={{ color: 'var(--c-text-muted)' }}>
            {pageInput === ''
              ? 'Enter a page number to listen'
              : pageValid
                ? `Page ${pageNum} is in Juz ${juz?.juz}`
                : 'Enter a page between 1 and 604'}
          </p>

          {/* Audio player */}
          {pageValid && (
            <div className="flex flex-col items-center gap-6">
              <div
                className="w-full p-8 rounded-3xl text-center"
                style={{ backgroundColor: 'var(--c-bg-card)' }}
              >
                <p className="text-sm mb-2" style={{ color: 'var(--c-text-muted)' }}>
                  Page {pageNum}
                </p>
                <p className="text-2xl font-bold mb-4" style={{ color: 'var(--c-text)' }}>
                  Juz {juz?.juz}
                </p>

                {/* Large play button */}
                <button
                  onClick={playing ? handlePause : handlePlay}
                  className="mx-auto w-32 h-32 rounded-full flex items-center justify-center transition-all active:scale-95"
                  style={{
                    backgroundColor: 'var(--c-gold)',
                    color: '#0d0d0d',
                  }}
                  aria-label={playing ? 'Pause' : 'Play'}
                >
                  {playing ? (
                    <Pause className="w-16 h-16" fill="currentColor" />
                  ) : (
                    <Play className="w-16 h-16 ml-2" fill="currentColor" />
                  )}
                </button>

                {/* Status */}
                <p className="text-xs mt-4" style={{ color: 'var(--c-text-muted)' }}>
                  {playing ? 'Now playing' : 'Ready to listen'}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

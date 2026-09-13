import { useEffect, useState } from "react";
import { type AdminStoryItem, type Lang } from "../lib/content";
import { mediaSrcSet } from "../lib/media-variants";

type StoryViewerProps = {
  stories: AdminStoryItem[];
  initialIndex: number;
  language: Lang;
  onClose: () => void;
};

const copy = {
  sr: {
    close: "Затвори приче",
    previous: "Претходна прича",
    next: "Сљедећа прича",
    progress: "Напредак прича",
  },
  en: {
    close: "Close stories",
    previous: "Previous story",
    next: "Next story",
    progress: "Story progress",
  },
  ru: {
    close: "Закрыть истории",
    previous: "Предыдущая история",
    next: "Следующая история",
    progress: "Просмотр историй",
  },
} as const;

export default function StoryViewer({
  stories,
  initialIndex,
  language,
  onClose,
}: StoryViewerProps) {
  const [index, setIndex] = useState(initialIndex);
  const [reducedMotion, setReducedMotion] = useState(false);
  const t = copy[language];
  const story = stories[index];

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReducedMotion(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  const next = () => {
    if (index >= stories.length - 1) onClose();
    else setIndex((current) => current + 1);
  };
  const previous = () => setIndex((current) => Math.max(0, current - 1));

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
      if (event.key === "ArrowRight") next();
      if (event.key === "ArrowLeft") previous();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [index, stories.length]);

  useEffect(() => {
    if (reducedMotion) return;
    const timer = window.setTimeout(next, 5_000);
    return () => window.clearTimeout(timer);
  }, [index, reducedMotion, stories.length]);

  if (!story) return null;
  const srcSet = mediaSrcSet(story.imageVariants);
  return (
    <div
      className="story-viewer"
      role="dialog"
      aria-modal="true"
      aria-label={t.progress}
    >
      <div className="story-viewer__progress" aria-hidden="true">
        {stories.map((item, itemIndex) => (
          <span
            className="story-viewer__progress-item"
            data-current={itemIndex === index}
            data-complete={itemIndex < index}
            key={item.id}
          />
        ))}
      </div>
      <button
        type="button"
        className="story-viewer__close"
        aria-label={t.close}
        onClick={onClose}
      >
        ×
      </button>
      <button
        type="button"
        className="story-viewer__zone story-viewer__zone--previous"
        aria-label={t.previous}
        onClick={previous}
        disabled={index === 0}
      />
      <figure className="story-viewer__figure">
        <img
          src={story.image}
          srcSet={srcSet || undefined}
          sizes="(max-width: 768px) 100vw, 80vw"
          alt=""
        />
      </figure>
      <button
        type="button"
        className="story-viewer__zone story-viewer__zone--next"
        aria-label={t.next}
        onClick={next}
      />
    </div>
  );
}

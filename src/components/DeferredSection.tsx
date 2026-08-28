import React, { useEffect, useRef, useState } from "react";

export default function DeferredSection({
  children,
  minHeight,
}: {
  children: React.ReactNode;
  minHeight: string;
}) {
  const boundary = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const element = boundary.current;
    if (!element) return;
    if (!("IntersectionObserver" in window)) {
      setVisible(true);
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        setVisible(true);
        observer.disconnect();
      },
      { rootMargin: "700px 0px" },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={boundary}
      className={visible ? undefined : "deferred-section-placeholder"}
      style={visible ? undefined : { minHeight }}
      aria-busy={!visible}
    >
      {visible ? children : null}
    </div>
  );
}

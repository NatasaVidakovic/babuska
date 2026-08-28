import brandLogo from "../assets/brand/logo-babuska.webp";

export default function HeroLoader({ label }: { label: string }) {
  return (
    <div
      className="hero-loader"
      role="status"
      aria-label={label}
    >
      <span className="hero-loader__steam hero-loader__steam--one" />
      <span className="hero-loader__steam hero-loader__steam--two" />
      <img src={brandLogo} alt="" className="hero-loader__mark" />
    </div>
  );
}

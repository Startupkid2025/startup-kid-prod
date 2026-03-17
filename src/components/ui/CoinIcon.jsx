export default function CoinIcon({ size = 20, className = "" }) {
  return (
    <img
      src="https://media.base44.com/images/public/68e295dfd1c97e3c8c54140e/d40266d45_generated_image.png"
      alt="סטארטקוין"
      style={{ 
        width: size, 
        height: size, 
        objectFit: "contain",
        mixBlendMode: "multiply",
        filter: "contrast(1.1)"
      }}
      className={`inline-block ${className}`}
    />
  );
}
export default function CoinIcon({ size = 20, className = "" }) {
  return (
    <img
      src="https://media.base44.com/images/public/68e295dfd1c97e3c8c54140e/779638779_grok-image-79aaf522-e56e-414d-a2c6-0a88aa23dde7.png"
      alt="סטארטקוין"
      style={{ 
        width: size, 
        height: size, 
        objectFit: "contain",
        mixBlendMode: "multiply",
        display: "inline-block",
        verticalAlign: "middle"
      }}
      className={className}
    />
  );
}
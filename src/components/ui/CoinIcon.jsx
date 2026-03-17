export default function CoinIcon({ size = 38, className = "" }) {
  return (
    <img
      src="https://media.base44.com/images/public/68e295dfd1c97e3c8c54140e/8620975d1_Untitleddesign1.png"
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
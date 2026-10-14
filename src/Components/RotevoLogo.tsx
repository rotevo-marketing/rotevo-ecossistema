import { Poppins } from "next/font/google";
import styles from "./RotevoLogo.module.css";

const poppins = Poppins({
  weight: "600",
  subsets: ["latin"],
  display: "swap",
  adjustFontFallback: false,
});

type RotevoLogoProps = {
  variant?: "black" | "white";
  size?: number | string;
  className?: string;
};

export function RotevoLogo({
  variant = "black",
  size,
  className = "",
}: RotevoLogoProps) {
  return (
    <span
      role="img"
      aria-label="Rotevo"
      className={`${poppins.className} ${styles.logo} ${styles[variant]} ${className}`}
      style={{ ...((size === undefined ? {} : { fontSize: size })), "--rotevo-logo-font": poppins.style.fontFamily } as React.CSSProperties}
    >
      <span aria-hidden="true">rotevo</span>
      <span className={styles.dot} aria-hidden="true" />
    </span>
  );
}

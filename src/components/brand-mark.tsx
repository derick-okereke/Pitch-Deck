import Image from "next/image";
import blueMark from "../../assets/logo_materials/horizontal Peekytoe BLUE.png";
import whiteMark from "../../assets/logo_materials/horizontal Peekytoe WHITE.png";

export function BrandMark({ color = "blue" }: { color?: "blue" | "white" }) {
  return <Image className="brand-mark" src={color === "white" ? whiteMark : blueMark} alt="Peekytoe" unoptimized priority />;
}

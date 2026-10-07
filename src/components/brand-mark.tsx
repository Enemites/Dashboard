import Image from "next/image";
import logo from "../../public/assets/enemites-logo.png";

export function BrandMark() {
  return <span className="brand-mark"><Image src={logo} alt="" width={34} height={25} unoptimized/></span>;
}

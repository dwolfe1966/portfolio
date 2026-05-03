import Image from "next/image";

export function SiteLogo() {
  return (
    <span className="siteLogo" aria-label="David Wolfe">
      <Image
        className="siteLogoImage"
        src="/logo/dwlogo.png"
        alt=""
        width={44}
        height={44}
        priority
      />
      <span className="siteLogoWord">
        David Wolfe
      </span>
    </span>
  );
}

import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          background: "#08251a",
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          borderRadius: "40px",
        }}
      >
        <span
          style={{
            color: "#abff44",
            fontSize: 108,
            fontWeight: 800,
            fontFamily: "sans-serif",
            letterSpacing: "-4px",
            marginTop: "4px",
          }}
        >
          M
        </span>
      </div>
    ),
    { ...size }
  );
}

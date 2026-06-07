import { ImageResponse } from "next/og";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          background: "#004be3",
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          borderRadius: "7px",
        }}
      >
        <span
          style={{
            color: "#f2f1ff",
            fontSize: 19,
            fontWeight: 800,
            fontFamily: "sans-serif",
            letterSpacing: "-1px",
            marginTop: "1px",
          }}
        >
          M
        </span>
      </div>
    ),
    { ...size }
  );
}
